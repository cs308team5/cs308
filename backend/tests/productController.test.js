import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import {
  createProduct,
  getProductById,
  getReviewEligibility,
  getProducts,
  submitRating,
  updateProduct,
  updateProductStock,
} from "../src/controllers/productController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("productController.getProducts", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 400 for a one-character search query", async () => {
    const req = createMockReq({ query: { q: "a" } });
    const res = createMockRes();

    await getProducts(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  test("fetches products with the base query when no filters are provided", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [] };
    };

    const req = createMockReq();
    const res = createMockRes();

    await getProducts(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(captured.sql, /SELECT \* FROM products WHERE 1=1/);
    assert.deepEqual(captured.params, []);
  });

  test("adds a name search clause when q is provided", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [] };
    };

    const req = createMockReq({ query: { q: "dress" } });
    const res = createMockRes();

    await getProducts(req, res);

    assert.match(captured.sql, /name ILIKE \$1/);
    assert.deepEqual(captured.params, ["%dress%"]);
  });

  test("adds a category filter when category is provided", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [] };
    };

    const req = createMockReq({ query: { category: "clothing" } });
    const res = createMockRes();

    await getProducts(req, res);

    assert.match(captured.sql, /category = \$1/);
    assert.deepEqual(captured.params, ["clothing"]);
  });

  test("adds attribute filters for valid key:value pairs", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [] };
    };

    const req = createMockReq({
      query: { attributes: "color:red,size:m" },
    });
    const res = createMockRes();

    await getProducts(req, res);

    assert.match(captured.sql, /additional_attributes->>'color' ILIKE \$1/);
    assert.match(captured.sql, /additional_attributes->>'size' ILIKE \$2/);
    assert.deepEqual(captured.params, ["%red%", "%m%"]);
  });

  test("ignores malformed attribute filters", async () => {
    let captured;
    pool.query = async (sql, params) => {
      captured = { sql, params };
      return { rows: [] };
    };

    const req = createMockReq({
      query: { attributes: "broken,color:red" },
    });
    const res = createMockRes();

    await getProducts(req, res);

    assert.doesNotMatch(captured.sql, /additional_attributes->>'broken'/);
    assert.deepEqual(captured.params, ["%red%"]);
  });

  test("maps stock_quantity into stock and inStock fields", async () => {
    pool.query = async () => ({
      rows: [
        {
          id: "p1",
          name: "Dress",
          description: "Desc",
          price: 150,
          category: "clothing",
          stock_quantity: 2,
          image_url: "img.png",
          model: "Evening",
          serial_number: "DR-001",
          warranty_status: "2 years",
          distributor_information: "Dare Distribution",
          additional_attributes: { color: "red" },
        },
      ],
    });

    const req = createMockReq();
    const res = createMockRes();

    await getProducts(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.count, 1);
    assert.deepEqual(res.body.data[0], {
      id: "p1",
      name: "Dress",
      description: "Desc",
      price: 150,
      category: "clothing",
      stock: 2,
      image_url: "img.png",
      model: "Evening",
      serial_number: "DR-001",
      warranty_status: "2 years",
      distributor_information: "Dare Distribution",
      additional_attributes: { color: "red" },
      inStock: true,
    });
  });

  test("returns 500 when fetching products fails", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq();
    const res = createMockRes();

    await getProducts(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
  });
});

describe("productController.getProductById", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 404 when the product is missing", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({ params: { id: "p1" } });
    const res = createMockRes();

    await getProductById(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Product not found");
  });

  test("maps a found product into the response shape", async () => {
    pool.query = async () => ({
      rows: [
        {
          id: "p1",
          name: "Dress",
          description: "Desc",
          price: 150,
          category: "clothing",
          stock_quantity: 4,
          image_url: "img.png",
          model: "Evening",
          serial_number: "DR-001",
          warranty_status: "2 years",
          distributor_information: "Dare Distribution",
          additional_attributes: { color: "red" },
        },
      ],
    });

    const req = createMockReq({ params: { id: "p1" } });
    const res = createMockRes();

    await getProductById(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data, {
      id: "p1",
      name: "Dress",
      description: "Desc",
      price: 150,
      category: "clothing",
      stock: 4,
      image_url: "img.png",
      model: "Evening",
      serial_number: "DR-001",
      warranty_status: "2 years",
      distributor_information: "Dare Distribution",
      additional_attributes: { color: "red" },
      inStock: true,
    });
  });

  test("returns 500 when product lookup fails", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq({ params: { id: "p1" } });
    const res = createMockRes();

    await getProductById(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Server error");
  });
});

describe("productController.submitRating", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 400 when rating is missing", async () => {
    const req = createMockReq({
      params: { id: "p1" },
      body: {},
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Rating must be between 0.5 and 5 in 0.5 increments");
  });

  test("returns 400 when rating is above the allowed range", async () => {
    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 6 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Rating must be between 0.5 and 5 in 0.5 increments");
  });

  test("returns 400 when rating is not a half-star increment", async () => {
    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 3.25 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Rating must be between 0.5 and 5 in 0.5 increments");
  });

  test("returns 401 when user identity is missing", async () => {
    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 5 },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Authentication required");
  });

  test("returns 404 when the product does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 5 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Product not found");
  });

  test("returns 400 when the user already rated the product", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: "p1" }] };
      }
      if (call === 2) {
        return { rows: [{ purchased: true }] };
      }

      return { rows: [{ id: "existing-rating" }] };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 5 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "You have already rated this product");
  });

  test("creates a rating and returns 201 on success", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: "p1" }] };
      }

      if (call === 2) {
        return { rows: [{ purchased: true }] };
      }

      if (call === 3) {
        return { rows: [] };
      }

      return {
        rows: [{ id: "rating-1", user_id: "u1", product_id: "p1", rating: 3.5 }],
      };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 3.5 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, "Rating submitted successfully");
    assert.equal(res.body.data.rating, 3.5);
  });

  test("returns 403 when the customer has not purchased the product", async () => {
    let call = 0;
    pool.query = async () => {
      call += 1;
      if (call === 1) {
        return { rows: [{ id: "p1" }] };
      }

      return { rows: [] };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 4 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.message, "Only customers who purchased this product can rate it");
  });

  test("returns 500 when rating submission fails", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { rating: 4 },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await submitRating(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Server error");
  });
});

describe("productController.updateProductStock", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 400 when stock quantity is invalid", async () => {
    const req = createMockReq({
      params: { id: "p1" },
      body: { stock_quantity: -1 },
    });
    const res = createMockRes();

    await updateProductStock(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "stock_quantity must be a non-negative integer.");
  });

  test("updates product stock", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return {
        rows: [{ id: "p1", stock_quantity: 7 }],
      };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { stock_quantity: 7 },
    });
    const res = createMockRes();

    await updateProductStock(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, [7, "p1"]);
    assert.equal(res.body.data.stock_quantity, 7);
  });

  test("returns 404 when product stock target does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { id: "missing-product" },
      body: { stock_quantity: 3 },
    });
    const res = createMockRes();

    await updateProductStock(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, "Product not found.");
  });
});

describe("productController product numeric validation", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("rejects product creation with an invalid price", async () => {
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const req = createMockReq({
      body: { name: "Camera", price: -10, category: "electronics" },
    });
    const res = createMockRes();

    await createProduct(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "price must be a positive number.");
    assert.equal(queryCalled, false);
  });

  test("rejects product creation with a fractional stock quantity", async () => {
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const req = createMockReq({
      body: {
        name: "Camera",
        price: 120,
        category: "electronics",
        stock_quantity: 1.5,
      },
    });
    const res = createMockRes();

    await createProduct(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "stock_quantity must be a non-negative integer.");
    assert.equal(queryCalled, false);
  });

  test("coerces valid price and stock values before inserting a product", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [{ id: "p1", price: params[2], stock_quantity: params[5] }] };
    };

    const req = createMockReq({
      body: {
        name: "Camera",
        price: "120.50",
        category: "electronics",
        stock_quantity: "7",
      },
    });
    const res = createMockRes();

    await createProduct(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(capturedParams[2], 120.5);
    assert.equal(capturedParams[5], 7);
  });

  test("rejects product updates with an invalid discount value", async () => {
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { discount: 150 },
    });
    const res = createMockRes();

    await updateProduct(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "discount must be a number between 0 and 100.");
    assert.equal(queryCalled, false);
  });

  test("rejects product updates with an invalid refund amount", async () => {
    let queryCalled = false;
    pool.query = async () => {
      queryCalled = true;
      return { rows: [] };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { refund_amount: -1 },
    });
    const res = createMockRes();

    await updateProduct(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "refund_amount must be a non-negative number.");
    assert.equal(queryCalled, false);
  });

  test("uses validated numeric values when updating product price and stock", async () => {
    let capturedParams;
    pool.query = async (sql, params = []) => {
      capturedParams = params;
      return { rows: [{ id: "p1", price: params[0], stock_quantity: params[1] }] };
    };

    const req = createMockReq({
      params: { id: "p1" },
      body: { price: "99.99", stock_quantity: "3" },
    });
    const res = createMockRes();

    await updateProduct(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(capturedParams, [99.99, 3, "p1"]);
  });
});

describe("productController.getReviewEligibility", () => {
  const originalQuery = pool.query;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    console.error = originalConsoleError;
  });

  test("returns 401 when the customer is missing", async () => {
    const req = createMockReq({ params: { id: "p1" } });
    const res = createMockRes();

    await getReviewEligibility(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.eligible, false);
  });

  test("returns eligible true when the product was purchased", async () => {
    pool.query = async () => ({ rows: [{ purchased: true }] });

    const req = createMockReq({
      params: { id: "p1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await getReviewEligibility(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.eligible, true);
  });

  test("returns eligible false when the product was not purchased", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      params: { id: "p1" },
      customer: { customerId: "u1" },
    });
    const res = createMockRes();

    await getReviewEligibility(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.eligible, false);
  });
});
