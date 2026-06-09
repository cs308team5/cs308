import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { cancelMyOrder, getMyOrders } from "../src/controllers/myOrdersController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("myOrdersController.getMyOrders", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when the request is unauthenticated", async () => {
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const req = createMockReq();
    const res = createMockRes();

    await getMyOrders(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      success: false,
      message: "Authentication required.",
    });
    assert.equal(queryCalled, false);
  });

  test("queries orders for the authenticated customer only", async () => {
    let capturedParams;
    const orders = [{ order_id: "order-1", total_price: 120 }];
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: orders };
    };

    const req = createMockReq({
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await getMyOrders(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["customer-1"]);
    assert.deepEqual(res.body, { success: true, orders });
  });

  test("ignores spoofed customer identifiers outside the authenticated token", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [] };
    };

    const req = createMockReq({
      body: { customerId: "customer-2", customer_id: "customer-2" },
      params: { customerId: "customer-2" },
      query: { customerId: "customer-2" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await getMyOrders(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["customer-1"]);
  });

  test("uses customer_id from the token payload when customerId is absent", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [] };
    };

    const req = createMockReq({
      customer: { customer_id: "customer-1" },
    });
    const res = createMockRes();

    await getMyOrders(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["customer-1"]);
  });
});

describe("myOrdersController.cancelMyOrder", () => {
  const originalConnect = pool.connect;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.connect = originalConnect;
    console.error = originalConsoleError;
  });

  test("returns 401 when cancelling without authentication", async () => {
    const req = createMockReq({ params: { orderId: "order-1" } });
    const res = createMockRes();

    await cancelMyOrder(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Authentication required.");
  });

  test("cancels a processing order and restores stock", async () => {
    const queries = [];
    const client = {
      async query(sql, params = []) {
        queries.push({ sql, params });

        if (/FROM orders o/i.test(sql)) {
          return {
            rows: [{ order_id: "order-1", status: "pending", delivery_status: "processing" }],
          };
        }

        if (/FROM order_items/i.test(sql)) {
          return {
            rows: [
              { product_id: "product-1", quantity: 2 },
              { product_id: "product-2", quantity: 1 },
            ],
          };
        }

        if (/UPDATE orders/i.test(sql)) {
          return { rows: [{ order_id: "order-1", status: "cancelled" }] };
        }

        return { rows: [] };
      },
      release() {},
    };

    pool.connect = async () => client;

    const req = createMockReq({
      params: { orderId: "order-1" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await cancelMyOrder(req, res);

    const stockUpdates = queries.filter(({ sql }) => /UPDATE products SET stock_quantity/i.test(sql));

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.order.status, "cancelled");
    assert.deepEqual(stockUpdates[0].params, [2, "product-1"]);
    assert.deepEqual(stockUpdates[1].params, [1, "product-2"]);
    assert.equal(queries.some(({ sql }) => sql === "COMMIT"), true);
  });

  test("rejects cancelling in-transit orders", async () => {
    const client = {
      async query(sql) {
        if (/FROM orders o/i.test(sql)) {
          return {
            rows: [{ order_id: "order-1", status: "pending", delivery_status: "in-transit" }],
          };
        }

        return { rows: [] };
      },
      release() {},
    };

    pool.connect = async () => client;

    const req = createMockReq({
      params: { orderId: "order-1" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await cancelMyOrder(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, "Only processing orders can be cancelled.");
  });
});
