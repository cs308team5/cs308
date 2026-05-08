import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  getPendingComments,
  submitComment,
  updateCommentStatus,
} from "../src/controllers/commentController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("commentController.submitComment", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 400 when productId is missing", async () => {
    const req = createMockReq({
      body: { text: "Great product" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await submitComment(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "productId and text are required.");
  });

  test("returns 404 when the product does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      body: { productId: "product-1", text: "Great product" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await submitComment(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Product not found.");
  });

  test("returns 403 when the customer has not purchased the product", async () => {
    let callCount = 0;
    pool.query = async () => {
      callCount += 1;
      return callCount === 1 ? { rows: [{ id: "product-1" }] } : { rows: [] };
    };

    const req = createMockReq({
      body: { productId: "product-1", text: "Great product" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await submitComment(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(
      res.body.message,
      "Only customers who purchased this product can comment."
    );
  });

  test("creates a pending comment for a purchased product", async () => {
    const queries = [];
    pool.query = async (sql, params = []) => {
      queries.push({ sql, params });

      if (/SELECT id FROM products/i.test(sql)) {
        return { rows: [{ id: "product-1" }] };
      }

      if (/JOIN order_items/i.test(sql)) {
        return { rows: [{ "?column?": 1 }] };
      }

      if (/FROM comments/i.test(sql) && /LOWER\(TRIM\(status\)\)/i.test(sql)) {
        return { rows: [] };
      }

      return {
        rows: [
          {
            id: "comment-1",
            user_id: "customer-1",
            product_id: "product-1",
            text: "Great product",
            status: "pending",
          },
        ],
      };
    };

    const req = createMockReq({
      body: { productId: "product-1", text: "  Great product  " },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await submitComment(req, res);

    const insert = queries.find(({ sql }) => /INSERT INTO comments/i.test(sql));
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, "pending");
    assert.deepEqual(insert.params, ["customer-1", "product-1", "Great product"]);
  });

  test("returns 400 when the customer already has a pending or approved comment", async () => {
    pool.query = async (sql) => {
      if (/SELECT id FROM products/i.test(sql)) {
        return { rows: [{ id: "product-1" }] };
      }

      if (/JOIN order_items/i.test(sql)) {
        return { rows: [{ "?column?": 1 }] };
      }

      return { rows: [{ id: "comment-1", status: "approved" }] };
    };

    const req = createMockReq({
      body: { productId: "product-1", text: "Another comment" },
      customer: { customerId: "customer-1" },
    });
    const res = createMockRes();

    await submitComment(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "You already have a comment for this product.");
  });
});

describe("commentController approval flow", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("lists pending comments for manager approval", async () => {
    const pendingComment = {
      id: "comment-1",
      text: "Needs approval",
      status: "pending",
      product_id: "product-1",
      product_name: "Camera",
      user_id: "customer-1",
      author_name: "Ada",
    };
    pool.query = async () => ({ rows: [pendingComment] });

    const res = createMockRes();

    await getPendingComments(createMockReq(), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, data: [pendingComment] });
  });

  test("rejects invalid approval status values", async () => {
    const req = createMockReq({
      params: { id: "comment-1" },
      body: { status: "visible" },
    });
    const res = createMockRes();

    await updateCommentStatus(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Status must be 'approved' or 'rejected'.");
  });

  test("approves a pending comment", async () => {
    pool.query = async (sql, params = []) => ({
      rows: [{ id: params[1], status: params[0] }],
    });

    const req = createMockReq({
      params: { id: "comment-1" },
      body: { status: "approved" },
    });
    const res = createMockRes();

    await updateCommentStatus(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      success: true,
      data: { id: "comment-1", status: "approved" },
    });
  });

  test("returns 404 when the comment to approve is missing", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { id: "missing-comment" },
      body: { status: "rejected" },
    });
    const res = createMockRes();

    await updateCommentStatus(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Comment not found.");
  });
});
