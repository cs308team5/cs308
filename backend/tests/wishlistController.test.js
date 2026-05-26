import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  addToWishlist,
  listWishlist,
  removeFromWishlist,
} from "../src/controllers/wishlistController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("wishlistController", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("addToWishlist returns 400 when fields are missing", async () => {
    const req = createMockReq({ body: { userId: "u1" } });
    const res = createMockRes();

    await addToWishlist(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "userId and productId are required");
  });

  test("addToWishlist returns 404 when product does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({ body: { userId: "u1", productId: "p1" } });
    const res = createMockRes();

    await addToWishlist(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Product not found");
  });

  test("addToWishlist inserts when product exists", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [{ id: "p1" }] };
      }

      return {
        rows: [{ id: "w1", customer_id: "u1", product_id: "p1" }],
      };
    };

    const req = createMockReq({ body: { userId: "u1", productId: "p1" } });
    const res = createMockRes();

    await addToWishlist(req, res);

    assert.equal(res.statusCode, 201);
    assert.match(queries[1].sql, /ON CONFLICT \(customer_id, product_id\) DO NOTHING/i);
    assert.deepEqual(queries[1].params, ["u1", "p1"]);
  });

  test("addToWishlist treats duplicate insert as success", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      return call === 1 ? { rows: [{ id: "p1" }] } : { rows: [] };
    };

    const req = createMockReq({ body: { userId: "u1", productId: "p1" } });
    const res = createMockRes();

    await addToWishlist(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Product is already in wishlist");
  });

  test("removeFromWishlist deletes by user and product", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ id: "w1" }] };
    };

    const req = createMockReq({ body: { userId: "u1", productId: "p1" } });
    const res = createMockRes();

    await removeFromWishlist(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, "Product removed from wishlist");
    assert.match(captured.sql, /DELETE FROM wishlist_items/i);
    assert.deepEqual(captured.params, ["u1", "p1"]);
  });

  test("listWishlist returns product rows", async () => {
    pool.query = async () => ({
      rows: [{
        wishlist_id: "w1",
        customer_id: "u1",
        product_id: "p1",
        created_at: "2026-05-19",
        name: "Dress",
        description: "Desc",
        price: 10,
        category: "clothing",
        image_url: "img.png",
        stock_quantity: 3,
        additional_attributes: { creator: "Maker" },
      }],
    });

    const req = createMockReq({ params: { userId: "u1" } });
    const res = createMockRes();

    await listWishlist(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].product.name, "Dress");
  });
});
