import { describe, test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import pool from "../src/config/db.js";
import { setDiscount, removeDiscount, getDiscountedProducts, setProductPrice } from "../src/controllers/discountController.js";
import { createMockReq, createMockRes } from "./helpers/httpTestUtils.js";

describe("discountController", () => {
    const originalQuery = pool.query;
    const originalConsoleError = console.error;

    beforeEach(() => {
        console.error = () => {};
    });

    afterEach(() => {
        pool.query = originalQuery;
        console.error = originalConsoleError;
    });

    describe("setDiscount — validation", () => {
        test("returns 400 when discount_rate is missing", async () => {
            const req = createMockReq({ params: { id: "1" }, body: {} });
            const res = createMockRes();
            await setDiscount(req, res);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
        });

        test("returns 400 when discount_rate is 0", async () => {
            const req = createMockReq({ params: { id: "1" }, body: { discount_rate: 0 } });
            const res = createMockRes();
            await setDiscount(req, res);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
        });

        test("returns 400 when discount_rate is 1 (100%)", async () => {
            const req = createMockReq({ params: { id: "1" }, body: { discount_rate: 1 } });
            const res = createMockRes();
            await setDiscount(req, res);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
        });

        test("returns 400 when discount_rate is not a number", async () => {
            const req = createMockReq({ params: { id: "1" }, body: { discount_rate: "abc" } });
            const res = createMockRes();
            await setDiscount(req, res);
            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
        });
    });

    describe("setDiscount — success", () => {
        test("returns the updated product with discounted_price on success", async () => {
            pool.query = async (sql) => {
                if (/UPDATE products/i.test(sql)) {
                    return {
                        rowCount: 1,
                        rows: [{ id: "1", name: "Art Print", price: 100, discount_rate: 0.20, discounted_price: 80 }],
                    };
                }
                return { rows: [] }; // wishlist_items query
            };

            const req = createMockReq({ params: { id: "1" }, body: { discount_rate: 0.20 } });
            const res = createMockRes();
            await setDiscount(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.product.discounted_price, 80);
            assert.equal(res.body.product.discount_rate, 0.20);
        });

        test("returns 404 when product is not found", async () => {
            pool.query = async () => ({ rowCount: 0, rows: [] });

            const req = createMockReq({ params: { id: "999" }, body: { discount_rate: 0.10 } });
            const res = createMockRes();
            await setDiscount(req, res);

            assert.equal(res.statusCode, 404);
            assert.equal(res.body.success, false);
        });

        test("returns 500 on database error", async () => {
            pool.query = async () => { throw new Error("db failure"); };

            const req = createMockReq({ params: { id: "1" }, body: { discount_rate: 0.10 } });
            const res = createMockRes();
            await setDiscount(req, res);

            assert.equal(res.statusCode, 500);
            assert.equal(res.body.success, false);
        });
    });

    describe("removeDiscount", () => {
        test("returns product with null discount fields", async () => {
            pool.query = async () => ({
                rowCount: 1,
                rows: [{ id: "1", name: "Art Print", price: 100, discount_rate: null, discounted_price: null }],
            });

            const req = createMockReq({ params: { id: "1" } });
            const res = createMockRes();
            await removeDiscount(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.product.discount_rate, null);
            assert.equal(res.body.product.discounted_price, null);
        });

        test("returns 404 when product is not found", async () => {
            pool.query = async () => ({ rowCount: 0, rows: [] });

            const req = createMockReq({ params: { id: "999" } });
            const res = createMockRes();
            await removeDiscount(req, res);

            assert.equal(res.statusCode, 404);
            assert.equal(res.body.success, false);
        });

        test("returns 500 on database error", async () => {
            pool.query = async () => { throw new Error("db failure"); };

            const req = createMockReq({ params: { id: "1" } });
            const res = createMockRes();
            await removeDiscount(req, res);

            assert.equal(res.statusCode, 500);
            assert.equal(res.body.success, false);
        });
    });

    describe("setProductPrice", () => {
        test("returns 400 when price is invalid", async () => {
            const req = createMockReq({ params: { id: "1" }, body: { price: -4 } });
            const res = createMockRes();

            await setProductPrice(req, res);

            assert.equal(res.statusCode, 400);
            assert.equal(res.body.success, false);
            assert.equal(res.body.message, "price must be a positive number.");
        });

        test("updates price and recalculates discounted_price when discount exists", async () => {
            let capturedParams;
            pool.query = async (sql, params) => {
                capturedParams = params;
                return {
                    rowCount: 1,
                    rows: [{ id: "1", name: "Art Print", price: 120, discount_rate: 0.25, discounted_price: 90 }],
                };
            };

            const req = createMockReq({ params: { id: "1" }, body: { price: "120" } });
            const res = createMockRes();

            await setProductPrice(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.product.price, 120);
            assert.equal(res.body.product.discounted_price, 90);
            assert.deepEqual(capturedParams, [120, "1"]);
        });

        test("returns 404 when price target is not found", async () => {
            pool.query = async () => ({ rowCount: 0, rows: [] });

            const req = createMockReq({ params: { id: "missing" }, body: { price: 120 } });
            const res = createMockRes();

            await setProductPrice(req, res);

            assert.equal(res.statusCode, 404);
            assert.equal(res.body.success, false);
        });
    });

    describe("getDiscountedProducts", () => {
        test("returns all products ordered by name", async () => {
            const mockProducts = [
                { id: "1", name: "A Print", price: 50, discount_rate: 0.10, discounted_price: 45, image_url: null, category: "art" },
                { id: "2", name: "B Sculpture", price: 200, discount_rate: null, discounted_price: null, image_url: null, category: "sculpture" },
            ];
            pool.query = async () => ({ rows: mockProducts });

            const req = createMockReq();
            const res = createMockRes();
            await getDiscountedProducts(req, res);

            assert.equal(res.statusCode, 200);
            assert.equal(res.body.success, true);
            assert.equal(res.body.products.length, 2);
            assert.equal(res.body.products[0].name, "A Print");
        });

        test("returns 500 on database error", async () => {
            pool.query = async () => { throw new Error("db failure"); };

            const req = createMockReq();
            const res = createMockRes();
            await getDiscountedProducts(req, res);

            assert.equal(res.statusCode, 500);
            assert.equal(res.body.success, false);
        });
    });
});
