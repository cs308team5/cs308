import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../src/config/db.js";
import { login, signup } from "../src/controllers/authController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("authController.signup", () => {
  const originalQuery = pool.query;
  const originalHash = bcrypt.hash;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    bcrypt.hash = originalHash;
    console.error = originalConsoleError;
  });

  test("returns 400 when name is missing", async () => {
    const req = createMockReq({
      body: { username: "ada", email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      "Name, username, email and password are required",
    );
  });

  test("returns 400 when username is missing", async () => {
    const req = createMockReq({
      body: { name: "Ada", email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      "Name, username, email and password are required",
    );
  });

  test("returns 400 when email is missing", async () => {
    const req = createMockReq({
      body: { name: "Ada", username: "ada", password: "secret" },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      "Name, username, email and password are required",
    );
  });

  test("returns 400 when password is missing", async () => {
    const req = createMockReq({
      body: { name: "Ada", username: "ada", email: "a@b.com" },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(
      res.body.message,
      "Name, username, email and password are required",
    );
  });

  test("returns 409 when the email is already registered", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", email: "a@b.com", username: "other-user" }],
    });

    const req = createMockReq({
      body: {
        name: "Ada",
        username: "ada",
        email: "a@b.com",
        password: "secret",
      },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, "Email already registered");
  });

  test("returns 409 when the username is already taken", async () => {
    pool.query = async () => ({
      rows: [{ customer_id: "c1", email: "other@b.com", username: "ada" }],
    });

    const req = createMockReq({
      body: {
        name: "Ada",
        username: "ada",
        email: "a@b.com",
        password: "secret",
      },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, "Username already taken");
  });

  test("inserts the customer with hashed password and optional fields", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [] };
      }

      return {
        rows: [
          {
            customer_id: "c1",
            name: "Ada",
            username: "ada",
            email: "a@b.com",
          },
        ],
      };
    };
    bcrypt.hash = async () => "hashed-secret";

    const req = createMockReq({
      body: {
        name: "Ada",
        username: "ada",
        email: "a@b.com",
        password: "secret",
        tax_id: "123",
        address: "Sabanci",
      },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.message, "Signup successful");
    assert.deepEqual(queries[1].params, [
      "Ada",
      "ada",
      "a@b.com",
      "hashed-secret",
      "123",
      "Sabanci",
    ]);
    assert.deepEqual(res.body.customer, {
      customerId: "c1",
      customer_id: "c1",
      name: "Ada",
      username: "ada",
      email: "a@b.com",
      role: "customer",
      isProductManager: false,
      isSalesManager: false,
    });
  });

  test("stores null optional fields when tax_id and address are omitted", async () => {
    const queries = [];
    pool.query = async (sql, params) => {
      queries.push({ sql, params });

      if (queries.length === 1) {
        return { rows: [] };
      }

      return {
        rows: [
          {
            customer_id: "c1",
            name: "Ada",
            username: "ada",
            email: "a@b.com",
          },
        ],
      };
    };
    bcrypt.hash = async () => "hashed-secret";

    const req = createMockReq({
      body: {
        name: "Ada",
        username: "ada",
        email: "a@b.com",
        password: "secret",
      },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(queries[1].params, [
      "Ada",
      "ada",
      "a@b.com",
      "hashed-secret",
      null,
      null,
    ]);
  });

  test("returns 500 when hashing or insertion fails", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq({
      body: {
        name: "Ada",
        username: "ada",
        email: "a@b.com",
        password: "secret",
      },
    });
    const res = createMockRes();

    await signup(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Server error");
  });
});

describe("authController.login", () => {
  const originalQuery = pool.query;
  const originalCompare = bcrypt.compare;
  const originalSign = jwt.sign;
  const originalConsoleError = console.error;
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    bcrypt.compare = originalCompare;
    jwt.sign = originalSign;
    process.env.JWT_SECRET = originalJwtSecret;
    console.error = originalConsoleError;
  });

  test("returns 400 when email is missing", async () => {
    const req = createMockReq({ body: { password: "secret" } });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Email and password are required");
  });

  test("returns 400 when password is missing", async () => {
    const req = createMockReq({ body: { email: "a@b.com" } });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Email and password are required");
  });

  test("returns 401 when the customer does not exist", async () => {
    pool.query = async () => ({ rows: [] });

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid credentials");
  });

  test("returns 401 when the password does not match a bcrypt hash", async () => {
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "a@b.com",
          password_hash: "$2b$10$hashed",
        },
      ],
    });
    bcrypt.compare = async () => false;

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid credentials");
  });

  test("returns 200 with a token and safe customer payload on bcrypt success", async () => {
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "a@b.com",
          password_hash: "$2b$10$hashed",
        },
      ],
    });
    bcrypt.compare = async () => true;
    jwt.sign = () => "signed-token";

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, "signed-token");
    assert.deepEqual(res.body.customer, {
      customerId: "c1",
      customer_id: "c1",
      name: "Ada",
      username: "ada",
      email: "a@b.com",
      role: "customer",
      isProductManager: false,
      isSalesManager: false,
    });
  });

  test("returns 401 when the stored password is not a bcrypt hash", async () => {
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "a@b.com",
          password_hash: "secret",
        },
      ],
    });
    bcrypt.compare = async () => {
      throw new Error("should not be called");
    };

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Invalid credentials");
  });

  test("passes the expected JWT payload and options to jwt.sign", async () => {
    let signArgs;
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "a@b.com",
          password_hash: "$2b$10$hashed",
        },
      ],
    });
    bcrypt.compare = async () => true;
    jwt.sign = (...args) => {
      signArgs = args;
      return "signed-token";
    };

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.deepEqual(signArgs[0], {
      customerId: "c1",
      email: "a@b.com",
      name: "Ada",
      role: "customer",
    });
    assert.equal(signArgs[1], "test-secret");
    assert.deepEqual(signArgs[2], { expiresIn: "24h" });
  });

  test("marks product managers in the response payload", async () => {
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "product@dare.com",
          password_hash: "$2b$10$hashed",
          role: "product_manager",
        },
      ],
    });
    bcrypt.compare = async () => true;
    jwt.sign = () => "signed-token";

    const req = createMockReq({
      body: { email: "product@dare.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.customer.role, "product_manager");
    assert.equal(res.body.customer.isProductManager, true);
    assert.equal(res.body.customer.isSalesManager, false);
  });

  test("returns 500 when login fails unexpectedly", async () => {
    pool.query = async () => {
      throw new Error("db failed");
    };

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.message, "Server error");
  });
});
