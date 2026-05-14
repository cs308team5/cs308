import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { requestRefund, reviewRefund } from "../src/controllers/refundController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

const RECENT_DATE = new Date().toISOString();
const OLD_DATE = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();

describe("refundController", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  // ── requestRefund ─────────────────────────────────────────────────────────

  describe("requestRefund", () => {
    test("returns 400 when order_id is missing", async () => {
      const req = createMockReq({
        body: { product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });

    test("returns 400 when product_id is missing", async () => {
      const req = createMockReq({
        body: { order_id: 1 },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 400);
      assert.equal(res.body.success, false);
    });

    test("returns 404 when order does not belong to the customer", async () => {
      pool.query = async () => ({ rows: [] });

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /Order not found/i);
    });

    test("returns 400 when order is older than 30 days (30-day rule)", async () => {
      pool.query = async () => ({ rows: [{ order_id: 1, created_at: OLD_DATE }] });

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /30 days/i);
    });

    test("returns 404 when product is not in the order", async () => {
      let call = 0;
      pool.query = async () => {
        call++;
        if (call === 1) return { rows: [{ order_id: 1, created_at: RECENT_DATE }] };
        return { rows: [] }; // product not in order
      };

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /Product not found/i);
    });

    test("returns 409 when a pending refund already exists for the same item", async () => {
      let call = 0;
      pool.query = async () => {
        call++;
        if (call === 1) return { rows: [{ order_id: 1, created_at: RECENT_DATE }] };
        if (call === 2) return { rows: [{ quantity: 1, unit_price: "50.00" }] };
        return { rows: [{ refund_id: 99 }] }; // duplicate found
      };

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /already exists/i);
    });

    test("creates a refund request and returns 201 with the new refund", async () => {
      const newRefund = {
        refund_id: 1,
        order_id: 1,
        product_id: "prod-1",
        quantity: 2,
        unit_price: "49.99",
        reason: "Defective item",
        status: "pending",
      };
      let call = 0;
      pool.query = async () => {
        call++;
        if (call === 1) return { rows: [{ order_id: 1, created_at: RECENT_DATE }] };
        if (call === 2) return { rows: [{ quantity: 2, unit_price: "49.99" }] };
        if (call === 3) return { rows: [] }; // no existing refund
        return { rows: [newRefund] };        // insert result
      };

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1", reason: "Defective item" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.deepEqual(res.body.refund, newRefund);
    });

    test("stores unit_price from order_items (preserves discounted purchase price)", async () => {
      const queries = [];
      let call = 0;
      pool.query = async (sql, params) => {
        queries.push({ sql, params });
        call++;
        if (call === 1) return { rows: [{ order_id: 1, created_at: RECENT_DATE }] };
        if (call === 2) return { rows: [{ quantity: 1, unit_price: "29.99" }] }; // discounted price
        if (call === 3) return { rows: [] };
        return { rows: [{ refund_id: 5, unit_price: "29.99" }] };
      };

      const req = createMockReq({
        body: { order_id: 1, product_id: "prod-1" },
        customer: { customerId: "cust-1" },
      });
      const res = createMockRes();

      await requestRefund(req, res);

      const insertQuery = queries.find(({ sql }) => /INSERT INTO refund_requests/i.test(sql));
      assert.ok(insertQuery, "INSERT INTO refund_requests should have been called");
      // unit_price param should be "29.99" (the discounted purchase price from order_items)
      assert.equal(insertQuery.params[4], "29.99");
    });
  });

  // ── reviewRefund ──────────────────────────────────────────────────────────

  describe("reviewRefund", () => {
    test("returns 400 for an invalid status value", async () => {
      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "cancelled" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /received.*approved.*rejected/i);
    });

    test("returns 404 when the refund request does not exist", async () => {
      pool.query = async () => ({ rows: [] });

      const req = createMockReq({
        params: { refundId: "999" },
        body: { status: "received" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /not found/i);
    });

    test("returns 409 when skipping received — pending cannot go directly to approved", async () => {
      pool.query = async () => ({
        rows: [{ refund_id: 1, status: "pending", quantity: 1, product_id: "prod-1" }],
      });

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "approved" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /Cannot transition/i);
    });

    test("returns 409 when skipping received — pending cannot go directly to rejected", async () => {
      pool.query = async () => ({
        rows: [{ refund_id: 1, status: "pending", quantity: 1, product_id: "prod-1" }],
      });

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "rejected" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /Cannot transition/i);
    });

    test("transitions pending → received and does NOT restore stock", async () => {
      const queries = [];
      pool.query = async (sql, params) => {
        queries.push({ sql, params });
        if (/SELECT/i.test(sql)) {
          return { rows: [{ refund_id: 1, status: "pending", quantity: 3, product_id: "prod-1" }] };
        }
        return { rows: [] };
      };

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "received" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const stockUpdate = queries.find(({ sql }) => /UPDATE products SET stock_quantity/i.test(sql));
      assert.equal(stockUpdate, undefined, "stock should NOT be restored when marking as received");
    });

    test("transitions received → approved and restores product stock", async () => {
      const queries = [];
      pool.query = async (sql, params) => {
        queries.push({ sql, params });
        if (/SELECT/i.test(sql)) {
          return { rows: [{ refund_id: 1, status: "received", quantity: 3, product_id: "prod-1" }] };
        }
        return { rows: [] };
      };

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "approved" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const stockUpdate = queries.find(({ sql }) => /UPDATE products SET stock_quantity/i.test(sql));
      assert.ok(stockUpdate, "stock should be restored on approval");
      assert.deepEqual(stockUpdate.params, [3, "prod-1"]);
    });

    test("transitions received → rejected and does NOT restore stock", async () => {
      const queries = [];
      pool.query = async (sql, params) => {
        queries.push({ sql, params });
        if (/SELECT/i.test(sql)) {
          return { rows: [{ refund_id: 1, status: "received", quantity: 3, product_id: "prod-1" }] };
        }
        return { rows: [] };
      };

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "rejected" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);

      const stockUpdate = queries.find(({ sql }) => /UPDATE products SET stock_quantity/i.test(sql));
      assert.equal(stockUpdate, undefined, "stock should NOT be restored on rejection");
    });

    test("returns 409 when trying to re-review an already approved refund", async () => {
      pool.query = async () => ({
        rows: [{ refund_id: 1, status: "approved", quantity: 1, product_id: "prod-1" }],
      });

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "rejected" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /Cannot transition/i);
    });

    test("returns 409 when trying to re-review an already rejected refund", async () => {
      pool.query = async () => ({
        rows: [{ refund_id: 1, status: "rejected", quantity: 1, product_id: "prod-1" }],
      });

      const req = createMockReq({
        params: { refundId: "1" },
        body: { status: "approved" },
        customer: { customerId: "admin-1" },
      });
      const res = createMockRes();

      await reviewRefund(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /Cannot transition/i);
    });
  });
});
