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
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "";
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    bcrypt.hash = originalHash;
    console.error = originalConsoleError;
    process.env.ADMIN_EMAILS = originalAdminEmails;
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
      isAdmin: false,
      is_admin: false,
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
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    process.env.ADMIN_EMAILS = "";
    console.error = () => {};
  });

  afterEach(() => {
    pool.query = originalQuery;
    bcrypt.compare = originalCompare;
    jwt.sign = originalSign;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.ADMIN_EMAILS = originalAdminEmails;
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
      isAdmin: false,
      is_admin: false,
    });
  });

  test("falls back to plain-text password comparison when hash is not bcrypt", async () => {
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
    jwt.sign = () => "signed-token";

    const req = createMockReq({
      body: { email: "a@b.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.token, "signed-token");
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
          password_hash: "secret",
        },
      ],
    });
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
      isAdmin: false,
    });
    assert.equal(signArgs[1], "test-secret");
    assert.deepEqual(signArgs[2], { expiresIn: "24h" });
  });

  test("marks admin users in the response payload", async () => {
    process.env.ADMIN_EMAILS = "admin@dare.com";
    pool.query = async () => ({
      rows: [
        {
          customer_id: "c1",
          name: "Ada",
          username: "ada",
          email: "admin@dare.com",
          password_hash: "secret",
        },
      ],
    });
    jwt.sign = () => "signed-token";

    const req = createMockReq({
      body: { email: "admin@dare.com", password: "secret" },
    });
    const res = createMockRes();

    await login(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.customer.isAdmin, true);
    assert.equal(res.body.customer.is_admin, true);
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
