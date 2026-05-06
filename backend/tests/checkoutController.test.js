import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { checkout } from "../src/controllers/checkoutController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("checkoutController.checkout", () => {
  const originalConnect = pool.connect;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.connect = originalConnect;
    console.error = originalConsoleError;
  });

  test("returns 400 when the cart is empty", async () => {
    const req = createMockReq({
      body: {
        cart: [],
        shippingAddress: "123 Main St",
      },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await checkout(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Cart cannot be empty for checkout.");
  });

  test("returns 400 when shipping address is missing", async () => {
    const req = createMockReq({
      body: {
        cart: [{ product_id: "product-1", quantity: 1, unit_price: 20 }],
      },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await checkout(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Shipping address is required.");
  });

  test("returns 401 when customer identity is missing", async () => {
    const req = createMockReq({
      body: {
        cart: [{ product_id: "product-1", quantity: 1, unit_price: 20 }],
        shippingAddress: "123 Main St",
      },
    });
    const res = createMockRes();

    await checkout(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Unauthorized.");
  });

  test("creates an order, order items, and processing delivery", async () => {
    const queries = [];
    const client = {
      async query(sql, params = []) {
        queries.push({ sql, params });

        if (/INSERT INTO orders/i.test(sql)) {
          return {
            rows: [
              {
                order_id: "order-1",
                customer_id: "customer-1",
                total_price: 70,
                status: "pending",
                created_at: "2026-05-06T12:00:00.000Z",
              },
            ],
          };
        }

        return { rows: [] };
      },
      releaseCalled: false,
      release() {
        this.releaseCalled = true;
      },
    };

    pool.connect = async () => client;

    const req = createMockReq({
      body: {
        cart: [
          { product_id: "product-1", quantity: 2, unit_price: 25 },
          { product_id: "product-2", quantity: 1, unit_price: 20 },
        ],
        shippingAddress: {
          street: "123 Main St",
          city: "Istanbul",
          country: "Turkey",
        },
        paymentInfo: { cardNumber: "4111111111111111" },
      },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await checkout(req, res);

    const orderInsert = queries.find(({ sql }) => /INSERT INTO orders/i.test(sql));
    const itemInserts = queries.filter(({ sql }) => /INSERT INTO order_items/i.test(sql));
    const deliveryInsert = queries.find(({ sql }) => /INSERT INTO deliveries/i.test(sql));

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.order.id, "order-1");
    assert.equal(res.body.order.totalItems, 2);
    assert.equal(res.body.order.totalPrice, 70);
    assert.deepEqual(res.body.order.paymentInfo, { cardEnding: "1111" });
    assert.deepEqual(orderInsert.params, ["customer-1", 70, "pending"]);
    assert.deepEqual(itemInserts[0].params, ["order-1", "product-1", 2, 25]);
    assert.deepEqual(itemInserts[1].params, ["order-1", "product-2", 1, 20]);
    assert.deepEqual(deliveryInsert.params, [
      "order-1",
      "customer-1",
      "123 Main St, Istanbul, Turkey",
    ]);
    assert.equal(client.releaseCalled, true);
  });

  test("rolls back and returns 500 when a cart item is invalid", async () => {
    const queries = [];
    const client = {
      async query(sql, params = []) {
        queries.push({ sql, params });
        return { rows: [] };
      },
      releaseCalled: false,
      release() {
        this.releaseCalled = true;
      },
    };

    pool.connect = async () => client;

    const req = createMockReq({
      body: {
        cart: [{ product_id: "product-1", quantity: 0, unit_price: 20 }],
        shippingAddress: "123 Main St",
      },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await checkout(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Checkout failed.");
    assert.equal(res.body.error, "Invalid cart item.");
    assert.equal(queries.some(({ sql }) => sql === "BEGIN"), true);
    assert.equal(queries.some(({ sql }) => sql === "ROLLBACK"), true);
    assert.equal(client.releaseCalled, true);
  });
});
