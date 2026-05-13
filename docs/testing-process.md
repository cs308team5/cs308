# Testing Process

## Why this is not JUnit

The current project is built with Node.js and React, not Java. Because of that, a Java-only framework like JUnit is not the right fit for the codebase. For this repository, the correct equivalent is the Node.js built-in unit test runner.

This still satisfies the course need for unit testing in the progress demo while matching the actual technology stack used by the team.

## What was added

- Backend unit test scripts in `backend/package.json`
- A backend unit test suite under `backend/tests`
- Reusable request/response test helpers for controller testing
- The test command is scoped to `tests/*.test.js`, so manual scripts like `test-email.js` are not treated as unit tests

## Current test coverage areas

- `authController`
- `cartController`
- `checkoutController`
- `commentController`
- `deliveryController`
- `invoiceController`
- `myOrdersController`
- `paymentController`
- `productController`
- `roleMiddleware`

These tests target progress-demo-relevant behavior such as:

- product browsing and stock information
- add-to-cart constraints
- ratings and comments prerequisites
- login and signup validation
- product detail lookup and search filtering
- checkout order creation and delivery creation
- payment authorization behavior and card masking
- delivery status validation and customer-only delivery access
- invoice listing, PDF generation, revenue calculation, and cross-user invoice blocking
- role separation between customers, product managers, and sales managers
- defensive validation for price, stock, discount, refund, and delivery status inputs

## Requirement coverage

The backend unit test suite now maps to the project requirements as follows:

| Requirement | Coverage in tests |
| --- | --- |
| `1` Product browsing, categories, cart | Product list/detail tests and cart add constraints in `productController.test.js` and `cartController.test.js` |
| `3` Stock and delivery processing | Stock validation, stock update, checkout delivery creation, and delivery status tests |
| `4` Login before order/payment, invoice email/PDF | Checkout authentication, payment authentication, order creation, payment masking, invoice PDF/email access tests |
| `5` Comments and ratings | Purchased-product checks, duplicate comment/rating prevention, pending comment flow, approve/reject tests |
| `7` Search, sort-related product browsing, out-of-stock behavior | Product search validation, product mapping, stock visibility, and cart stock-limit tests |
| `9` Required product properties | Product response mapping tests cover ID, name, description, price, stock, model, serial number, warranty, distributor information, and attributes |
| `10` Basic roles | Role normalization and role middleware tests |
| `11` Sales manager invoice/revenue responsibilities | Invoice date filtering, manager invoice PDF, and revenue summary tests |
| `12` Product manager stock/delivery/comment responsibilities | Product stock update, delivery status update, manager delivery listing, and comment approval tests |
| `13` Customer orders/comments/ratings | My-orders customer scoping, purchased-product comment/rating checks, and cross-user access prevention tests |
| `14` Credit card payment | Payment validation, card masking, and no raw card/CVV persistence checks |
| `16` Security and defensive programming | Password hashing, safe login responses, role separation, cross-user order/delivery/invoice blocking, and input validation tests |
| `17` Smooth behavior under normal parameters | Error handling tests for missing input, invalid state, missing resources, and database failures |

## Security-focused coverage

The latest test additions specifically support the security and defensive programming requirement:

- Customers cannot request another customer's deliveries by changing the `customerId` route parameter.
- Customers cannot spoof order ownership through body, query, or route parameters; order queries use the authenticated token identity.
- Customers cannot generate or email invoice PDFs for another customer's order.
- Invoice email failures for inaccessible orders return a controlled `404` instead of leaking stack traces.
- Price, stock, discount, refund amount, and delivery status inputs reject invalid values before database writes.
- Product managers and sales managers are checked as separate roles and cannot access each other's protected routes.

## How to run

From the backend folder:

```bash
npm test
```

or

```bash
npm run test:unit
```

## Demo talking points

For the progress demo, you can show:

1. The project includes an automated unit test process.
2. Tests run locally with a single command.
3. The suite currently includes more than 25 unit test cases.
4. Tests cover core progress-demo features from the project PDF, especially requirements `1`, `3`, `4`, `5`, `7`, and `9`.
5. The suite also includes security tests for role separation, cross-user access prevention, sensitive payment data handling, and defensive input validation.

## Current test count

- `authController.test.js`: 18 test cases
- `cartController.test.js`: 10 test cases
- `checkoutController.test.js`: 5 test cases
- `commentController.test.js`: 9 test cases
- `deliveryController.test.js`: 10 test cases
- `invoiceController.test.js`: 10 test cases
- `myOrdersController.test.js`: 4 test cases
- `paymentController.test.js`: 3 test cases
- `productController.test.js`: 32 test cases
- `roleMiddleware.test.js`: 6 test cases

Total: 107 unit test cases
