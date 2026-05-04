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
- `productController`

These tests target progress-demo-relevant behavior such as:

- product browsing and stock information
- add-to-cart constraints
- ratings and comments prerequisites
- login and signup validation
- product detail lookup and search filtering

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

## Current test count

- `productController.test.js`: 18 test cases
- `cartController.test.js`: 7 test cases
- `authController.test.js`: 14 test cases

Total: 39 unit test cases
