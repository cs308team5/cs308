import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  getAllDeliveries,
  getMyDeliveries,
  updateDeliveryStatus,
} from "../src/controllers/deliveryController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("deliveryController.updateDeliveryStatus", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 400 for an invalid delivery status", async () => {
    const req = createMockReq({
      params: { deliveryId: "delivery-1" },
      body: { status: "packed" },
    });
    const res = createMockRes();

    await updateDeliveryStatus(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, "Invalid delivery status.");
  });

  test("sets is_completed false for in-transit deliveries", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return {
        rows: [
          {
            delivery_id: "delivery-1",
            status: "in-transit",
            is_completed: false,
          },
        ],
      };
    };

    const req = createMockReq({
      params: { deliveryId: "delivery-1" },
      body: { status: "in-transit" },
    });
    const res = createMockRes();

    await updateDeliveryStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["in-transit", false, "delivery-1"]);
    assert.equal(res.body.delivery.is_completed, false);
  });

  test("sets is_completed true when delivery is delivered", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return {
        rows: [
          {
            delivery_id: "delivery-1",
            status: "delivered",
            is_completed: true,
          },
        ],
      };
    };

    const req = createMockReq({
      params: { deliveryId: "delivery-1" },
      body: { status: "delivered" },
    });
    const res = createMockRes();

    await updateDeliveryStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["delivered", true, "delivery-1"]);
    assert.equal(res.body.delivery.is_completed, true);
  });

  test("returns 404 when the delivery does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { deliveryId: "missing-delivery" },
      body: { status: "processing" },
    });
    const res = createMockRes();

    await updateDeliveryStatus(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Delivery not found.");
  });
});

describe("deliveryController.getAllDeliveries", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns all deliveries for admin management", async () => {
    let capturedSql;
    const delivery = {
      delivery_id: "delivery-1",
      order_id: "order-1",
      customer_name: "Ada",
      customer_email: "ada@example.com",
      status: "processing",
      items: [{ name: "Camera", quantity: 1, unit_price: 120 }],
    };
    pool.query = async (sql) => {
      capturedSql = sql;
      return { rows: [delivery] };
    };

    const req = createMockReq();
    const res = createMockRes();

    await getAllDeliveries(req, res);

    assert.match(capturedSql, /JOIN customers/i);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, data: [delivery] });
  });
});

describe("deliveryController.getMyDeliveries", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns deliveries for the selected customer", async () => {
    let capturedParams;
    const delivery = {
      delivery_id: "delivery-1",
      order_id: "order-1",
      delivery_address: "123 Main St",
      status: "processing",
      is_completed: false,
      total_price: 120,
      items: [{ name: "Camera", quantity: 1, unit_price: 120 }],
    };
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [delivery] };
    };

    const req = createMockReq({ params: { customerId: "customer-1" } });
    const res = createMockRes();

    await getMyDeliveries(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["customer-1"]);
    assert.deepEqual(res.body, { success: true, data: [delivery] });
  });
});
