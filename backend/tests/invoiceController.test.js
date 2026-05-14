import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  calculateRevenue,
  generateInvoice,
  generateManagerInvoice,
  listInvoices,
  sendInvoiceEmail,
} from "../src/controllers/invoiceController.js";
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
    assert.equal(res.body.data[0].pdf_url, "/api/invoice/manager/order-1/pdf");
    assert.match(capturedSql, /LEFT JOIN deliveries d ON d\.order_id = i\.order_id/);
    assert.match(capturedSql, /COALESCE\(d\.status, o\.status\) AS order_status/);
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

describe("invoiceController.generateManagerInvoice", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns a PDF for an invoice order", async () => {
    const queries = [];
    pool.query = async (sql, params = []) => {
      queries.push({ sql, params });

      if (/FROM invoices i/i.test(sql)) {
        return {
          rows: [
            {
              order_id: "order-1",
              customer_id: "customer-1",
              total_price: 120,
              status: "pending",
              created_at: "2026-05-10T12:00:00.000Z",
              name: "Jane Customer",
              email: "jane@example.com",
              tax_id: null,
              address: "Billing St",
              delivery_address: "Delivery St",
              billing_address: "Billing St",
              phone: "555-1234",
            },
          ],
        };
      }

      return {
        rows: [
          {
            quantity: 2,
            unit_price: 60,
            product_name: "Wireless Headphones",
          },
        ],
      };
    };

    const req = createMockReq({ params: { orderId: "order-1" } });
    const res = createMockRes();

    await generateManagerInvoice(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["Content-Type"], "application/pdf");
    assert.equal(
      res.headers["Content-Disposition"],
      "attachment; filename=invoice-order-1.pdf"
    );
    assert.ok(Buffer.isBuffer(res.sent));
    assert.equal(queries[0].params[0], "order-1");
    assert.equal(queries[1].params[0], "order-1");
  });

  test("returns 404 when the invoice does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({ params: { orderId: "missing-order" } });
    const res = createMockRes();

    await generateManagerInvoice(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Invoice not found.");
  });
});

describe("invoiceController customer invoice access", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("does not generate a PDF for another customer's order", async () => {
    const queries = [];
    pool.query = async (sql, params = []) => {
      queries.push({ sql, params });
      return { rows: [] };
    };

    const req = createMockReq({
      params: { orderId: "order-owned-by-someone-else" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await generateInvoice(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Order not found.");
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /WHERE o\.order_id = \$1 AND o\.customer_id = \$2/);
    assert.deepEqual(queries[0].params, [
      "order-owned-by-someone-else",
      "customer-1",
    ]);
    assert.equal(res.sent, null);
  });

  test("does not email an invoice for another customer's order", async () => {
    const queries = [];
    pool.query = async (sql, params = []) => {
      queries.push({ sql, params });
      return { rows: [] };
    };

    const req = createMockReq({
      params: { orderId: "order-owned-by-someone-else" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await sendInvoiceEmail(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Failed to send the invoice email.");
    assert.equal(res.body.error, "Order not found.");
    assert.equal(Object.hasOwn(res.body, "stack"), false);
    assert.equal(queries.length, 1);
    assert.match(queries[0].sql, /WHERE o\.order_id = \$1 AND o\.customer_id = \$2/);
    assert.deepEqual(queries[0].params, [
      "order-owned-by-someone-else",
      "customer-1",
    ]);
  });
});

describe("invoiceController.calculateRevenue", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns revenue summary filtered by date range", async () => {
    let capturedSql = "";
    let capturedParams = [];
    let refundSql = "";
    let refundParams = [];
    pool.query = async (sql, params = []) => {
      if (/refund_requests/.test(sql)) {
        refundSql = sql;
        refundParams = params;
        return {
          rows: [{ refunded_amount: "0" }],
        };
      }
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [
          {
            invoice_count: 3,
            gross_revenue: "459.987",
          },
        ],
      };
    };

    const req = createMockReq({
      query: { startDate: "2026-05-01", endDate: "2026-05-31" },
    });
    const res = createMockRes();

    await calculateRevenue(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.data, {
      invoice_count: 3,
      revenue: 459.99,
      loss: 0,
      profit: 459.99,
      gross_revenue: 459.99,
      refunded_amount: 0,
      net_revenue: 459.99,
    });
    assert.match(capturedSql, /COUNT\(\*\)::int AS invoice_count/);
    assert.match(capturedSql, /SUM\(i\.total_price\)/);
    assert.match(capturedSql, /i\.generated_at >= \$1/);
    assert.match(capturedSql, /i\.generated_at <= \$2/);
    assert.deepEqual(capturedParams, [
      "2026-05-01T00:00:00.000Z",
      "2026-05-31T23:59:59.999Z",
    ]);
    assert.match(refundSql, /r\.status = 'approved'/);
    assert.match(refundSql, /r\.quantity \* r\.unit_price/);
    assert.match(refundSql, /r\.reviewed_at >= \$1/);
    assert.match(refundSql, /r\.reviewed_at <= \$2/);
    assert.deepEqual(refundParams, capturedParams);
  });

  test("subtracts approved refunds in range from profit", async () => {
    pool.query = async (sql) => {
      if (/refund_requests/.test(sql)) {
        return { rows: [{ refunded_amount: "125.51" }] };
      }
      return {
        rows: [
          {
            invoice_count: 2,
            gross_revenue: "500.00",
          },
        ],
      };
    };

    const req = createMockReq({
      query: { startDate: "2026-05-01", endDate: "2026-05-31" },
    });
    const res = createMockRes();

    await calculateRevenue(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, {
      invoice_count: 2,
      revenue: 500,
      loss: 125.51,
      profit: 374.49,
      gross_revenue: 500,
      refunded_amount: 125.51,
      net_revenue: 374.49,
    });
  });

  test("returns zero summary when there are no invoices", async () => {
    pool.query = async (sql) => {
      if (/refund_requests/.test(sql)) {
        return { rows: [{ refunded_amount: null }] };
      }
      return {
        rows: [
          {
            invoice_count: 0,
            gross_revenue: null,
          },
        ],
      };
    };

    const req = createMockReq();
    const res = createMockRes();

    await calculateRevenue(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, {
      invoice_count: 0,
      revenue: 0,
      loss: 0,
      profit: 0,
      gross_revenue: 0,
      refunded_amount: 0,
      net_revenue: 0,
    });
  });

  test("returns 400 for invalid revenue date filters", async () => {
    const req = createMockReq({
      query: { startDate: "2026-06-01", endDate: "2026-05-01" },
    });
    const res = createMockRes();

    await calculateRevenue(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "startDate cannot be after endDate.");
  });
});
