import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { getMyOrders } from "../src/controllers/myOrdersController.js";
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
