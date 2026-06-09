import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  addToCart,
  getCart,
  removeFromCart,
  updateCartQuantity,
} from "../src/controllers/cartController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("cartController.getCart", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when customer identity is missing", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await getCart(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Authentication required");
  });

  test("fetches only the authenticated customer's cart", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return {
        rows: [{
          id: "cart-1",
          customer_id: "u1",
          product_id: "p1",
          quantity: 2,
          price: "20",
          discounted_price: null,
          stock_quantity: 4,
        }],
      };
    };

    const req = createMockReq({ customer: { customerId: "u1" } });
    const res = createMockRes();

    await getCart(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["u1"]);
    assert.equal(res.body.data[0].customer_id, "u1");
  });
});

describe("cartController.addToCart", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when customer identity is missing", async () => {
    const req = createMockReq({ body: { productId: "p1" } });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, {
      message: "Authentication required",
    });
  });

  test("returns 400 when productId is missing", async () => {
    const req = createMockReq({
      body: { userId: "spoofed-user" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "productId is required",
    });
  });

  test("returns 400 when quantity is invalid", async () => {
    const req = createMockReq({
      body: { userId: "u1", productId: "p1", quantity: 0 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "Quantity must be a positive whole number",
    });
  });

  test("returns 404 when the product does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      message: "Product not found",
    });
  });

  test("returns 400 when the product stock is zero", async () => {
    pool.query = async () => ({
      rows: [{ id: "p1", stock_quantity: 0 }],
    });

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "Product is out of stock",
    });
  });

  test("increments quantity when the item is already in the cart", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [{ id: "p1", stock_quantity: 3 }] };
      }

      if (queries.length === 2) {
        return { rows: [{ id: "cart-1", quantity: 1 }] };
      }

      return { rows: [] };
    };

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1", quantity: 2 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      message: "Product added to cart",
    });
    assert.equal(queries.length, 3);
    assert.match(queries[2].sql, /UPDATE cart_items/i);
    assert.deepEqual(queries[2].params, [2, "cart-1"]);
  });

  test("returns 400 when incrementing would exceed stock", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: "p1", stock_quantity: 3 }] };
      }

      return { rows: [{ id: "cart-1", quantity: 2 }] };
    };

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1", quantity: 2 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "No more stock available for this item",
    });
  });

  test("inserts a new cart row when the item is not already in the cart", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [{ id: "p1", stock_quantity: 3 }] };
      }

      if (queries.length === 2) {
        return { rows: [] };
      }

      return { rows: [] };
    };

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1", quantity: 3 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      message: "Product added to cart",
    });
    assert.equal(queries.length, 3);
    assert.match(queries[2].sql, /INSERT INTO cart_items/i);
    assert.deepEqual(queries[2].params, ["u1", "p1", 3]);
  });

  test("returns 400 when inserting more than available stock", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: "p1", stock_quantity: 2 }] };
      }

      return { rows: [] };
    };

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1", quantity: 3 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
      message: "No more stock available for this item",
    });
  });

  test("returns 500 when the database throws", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq({
      body: { userId: "spoofed-user", productId: "p1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await addToCart(req, res);

    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, {
      message: "Server error",
    });
  });
});

describe("cartController.updateCartQuantity", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("updates only a cart item owned by the authenticated customer", async () => {
    const queries = [];
    pool.query = async (sql, params = []) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [{ id: "cart-1", product_id: "p1", stock_quantity: 5 }] };
      }

      return { rows: [{ id: "cart-1", product_id: "p1", quantity: 3 }] };
    };

    const req = createMockReq({
      params: { cartItemId: "cart-1" },
      body: { quantity: 3 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await updateCartQuantity(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(queries[0].params, ["cart-1", "u1"]);
    assert.deepEqual(queries[1].params, [3, "cart-1", "u1"]);
  });

  test("returns 404 when the cart item does not belong to the customer", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { cartItemId: "cart-1" },
      body: { quantity: 2 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await updateCartQuantity(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Cart item not found");
  });
});

describe("cartController.removeFromCart", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("deletes only a cart item owned by the authenticated customer", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [{ id: "cart-1" }] };
    };

    const req = createMockReq({
      params: { cartItemId: "cart-1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await removeFromCart(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, ["cart-1", "u1"]);
  });

  test("returns 404 when the cart item does not belong to the customer", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { cartItemId: "cart-1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await removeFromCart(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Cart item not found");
  });
});
