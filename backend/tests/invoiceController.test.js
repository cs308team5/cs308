import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { listInvoices } from "../src/controllers/invoiceController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("invoiceController.listInvoices", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns invoices filtered by date range", async () => {
    let capturedSql = "";
    let capturedParams = [];
    pool.query = async (sql, params = []) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [
          {
            invoice_id: "invoice-1",
            order_id: "order-1",
            customer_id: "customer-1",
            generated_at: "2026-05-10T12:00:00.000Z",
            total_price: 120,
            customer_name: "Jane Customer",
            customer_email: "jane@example.com",
            order_status: "pending",
            order_created_at: "2026-05-10T11:00:00.000Z",
          },
        ],
      };
    };

    const req = createMockReq({
      query: { startDate: "2026-05-01", endDate: "2026-05-31" },
    });
    const res = createMockRes();

    await listInvoices(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);
    assert.match(capturedSql, /i\.generated_at >= \$1/);
    assert.match(capturedSql, /i\.generated_at <= \$2/);
    assert.deepEqual(capturedParams, [
      "2026-05-01T00:00:00.000Z",
      "2026-05-31T23:59:59.999Z",
    ]);
  });

  test("returns 400 for an invalid date", async () => {
    const req = createMockReq({
      query: { startDate: "not-a-date" },
    });
    const res = createMockRes();

    await listInvoices(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "startDate must be a valid date.");
  });

  test("returns 400 when startDate is after endDate", async () => {
    const req = createMockReq({
      query: { startDate: "2026-06-01", endDate: "2026-05-01" },
    });
    const res = createMockRes();

    await listInvoices(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "startDate cannot be after endDate.");
  });
});
