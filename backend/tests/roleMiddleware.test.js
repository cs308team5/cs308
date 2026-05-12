import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  requireProductManager,
  requireRole,
  requireSalesManager,
} from "../src/middleware/roleMiddleware.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("roleMiddleware.requireRole", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when the request has no authenticated customer", async () => {
    const middleware = requireRole("product_manager");
    const req = createMockReq();
    const res = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Authentication required.");
    assert.equal(nextCalled, false);
  });

  test("returns 403 when the customer role is not allowed", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", role: "sales_manager" }],
    });

    const middleware = requireRole("product_manager");
    const req = createMockReq({ customer: { customerId: "c1" } });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "Insufficient role permissions.");
    assert.equal(nextCalled, false);
  });

  test("forbids product managers from sales manager routes", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", role: "product_manager" }],
    });

    const req = createMockReq({ customer: { customerId: "c1" } });
    const res = createMockRes();
    let nextCalled = false;

    await requireSalesManager(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "Insufficient role permissions.");
    assert.equal(nextCalled, false);
  });

  test("forbids sales managers from product manager routes", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", role: "sales_manager" }],
    });

    const req = createMockReq({ customer: { customerId: "c1" } });
    const res = createMockRes();
    let nextCalled = false;

    await requireProductManager(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "Insufficient role permissions.");
    assert.equal(nextCalled, false);
  });

  test("forbids customers from manager routes", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", role: "customer" }],
    });

    const req = createMockReq({ customer: { customerId: "c1" } });
    const res = createMockRes();
    let nextCalled = false;

    await requireSalesManager(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "Insufficient role permissions.");
    assert.equal(nextCalled, false);
  });

  test("calls next when the customer role is allowed", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", role: "product_manager" }],
    });

    const middleware = requireRole("product_manager");
    const req = createMockReq({ customer: { customerId: "c1" } });
    const res = createMockRes();
    let nextCalled = false;

    await middleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(req.customerRole, "product_manager");
    assert.equal(nextCalled, true);
  });
});
