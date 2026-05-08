import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { processPayment } from "../src/controllers/paymentController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("paymentController.processPayment", () => {
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when the request is unauthenticated", async () => {
    let connectCalled = false;
    pool.connect = async () => {
      connectCalled = true;
      throw new Error("connect should not be called");
    };

    const req = createMockReq({
      body: {
        cardNumber: "4111111111111111",
        cvv: "123",
        expiryMonth: "12",
        expiryYear: "99",
        amount: 120,
      },
    });
    const res = createMockRes();

    await processPayment(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      success: false,
      message: "Unauthorized.",
    });
    assert.equal(connectCalled, false);
  });

  test("uses the authenticated customer when saving the order", async () => {
    const queries = [];
    const client = {
      async query(sql, params = []) {
        queries.push({ sql, params });

        if (/INSERT INTO orders/i.test(sql)) {
          return { rows: [{ order_id: "order-1" }] };
        }

        if (/UPDATE products SET stock_quantity/i.test(sql)) {
          return { rowCount: 1, rows: [{ stock_quantity: 4 }] };
        }

        return { rowCount: 1, rows: [] };
      },
      release() {},
    };

    pool.connect = async () => client;
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      body: {
        cardNumber: "4111111111111111",
        cvv: "123",
        expiryMonth: "12",
        expiryYear: "99",
        amount: 120,
        customer_id: "spoofed-customer",
        cart_items: [
          {
            product_id: "product-1",
            quantity: 2,
            price: 60,
          },
        ],
        delivery_address: {
          street: "123 Main St",
          city: "Istanbul",
          country: "Turkey",
        },
      },
    });
    req.customer = { customerId: "authenticated-customer" };

    const res = createMockRes();

    await processPayment(req, res);

    const orderInsert = queries.find(({ sql }) => /INSERT INTO orders/i.test(sql));
    const deliveryInsert = queries.find(({ sql }) => /INSERT INTO deliveries/i.test(sql));
    const cartDelete = queries.find(({ sql }) => /DELETE FROM cart_items/i.test(sql));

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.order_id, "order-1");
    assert.equal(res.body.invoiceEmailSent, false);
    assert.deepEqual(orderInsert.params, ["authenticated-customer", 120]);
    assert.deepEqual(deliveryInsert.params, [
      "order-1",
      "authenticated-customer",
      "123 Main St, Istanbul, Turkey",
      null,
      null,
    ]);
    assert.deepEqual(cartDelete.params, ["authenticated-customer"]);
  });
});
