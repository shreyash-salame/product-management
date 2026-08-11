# Product Management System

A small backend system for managing products for a retail business, built with **Node.js, Express, MongoDB (Mongoose) and Joi**.

## Tech Stack

- Node.js + Express.js
- MongoDB with Mongoose ODM
- Joi for request validation
- JWT (jsonwebtoken) for authentication
- bcryptjs for password hashing

## 1. Setup & Execution

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: set MONGO_URI (local or Atlas) and JWT_SECRET

# 3. Seed the database with an admin + sample products
npm run seed

# 4. Start the server
npm run dev      # with nodemon
# or
npm start
```

Server runs at `http://localhost:5000`. Health check: `GET /health`.

Default seeded admin credentials (also usable via `/api/auth/register`):
```json
{ "email": "admin@test.com", "password": "Admin@123" }
```

## 2. Database Design

### Collections

**`admins`**
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | required, **unique index** |
| password | String | required, bcrypt-hashed, `select: false` |
| role | String | enum `admin`, default `admin` |
| timestamps | createdAt/updatedAt | auto |

**`products`**
| Field | Type | Notes |
|---|---|---|
| name | String | required |
| description | String | optional |
| price | Number | required, min 0.01 |
| category | String | required |
| stock | Number | required, min 0, default 0 |
| createdBy | ObjectId → Admin | relationship: which admin created the product |
| timestamps | createdAt/updatedAt | auto (satisfies "when product was created") |

`_id` (ObjectId) serves as the unique identifier required by the brief.

### Indexes (for search/filter/pagination requirements)

- `{ name: 'text' }` — supports name search
- `{ category: 1 }` — category filter
- `{ price: 1 }` — price range filter
- `{ category: 1, createdAt: -1 }` — compound index for combined filter + sort
- `admins.email` — unique index, prevents duplicate accounts

> Note: the list endpoint uses a case-insensitive regex on `name` (rather than the `$text` index) so **partial substring** matches work (e.g. "mou" matches "Mouse"), which a `$text` index alone does not support well. The text index is included for completeness/whole-word search and future extension.

### Seed data

`npm run seed` inserts one admin and 5 sample products (see `src/seed.js`), including one out-of-stock item, to exercise filters and the summary endpoint.

## 3. API Design

Base URL: `/api`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create an admin account (convenience, so the project is runnable standalone) |
| POST | `/auth/login` | Public | Verifies credentials and returns a JWT, also set as an httpOnly `accessToken` cookie |

Protected routes accept the token either way: the `accessToken` cookie set at login, or an `Authorization: Bearer <token>` header (handy for curl/Postman without cookie handling).

### Products
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | List products — search, filter, paginate (see query params below) |
| GET | `/products/summary` | Public | Aggregated stats (bonus endpoint) |
| GET | `/products/:id` | Public | Get one product |
| POST | `/products` | **Protected** | Create product |
| PUT/PATCH | `/products/:id` | **Protected** | Update product |
| PATCH | `/products/:id/stock` | **Protected** | Increase/decrease stock |
| DELETE | `/products/:id` | **Protected** | Remove product |

**Why only writes are protected:** the brief states "Only authenticated administrators should be allowed to **modify** product data" — browsing/searching the catalog is a read-only, non-sensitive operation, so `GET` routes are left public while every state-changing route (`POST`/`PUT`/`PATCH`/`DELETE`) requires `Authorization: Bearer <token>`.

### List products — query parameters
`GET /products?search=mouse&category=Electronics&minPrice=100&maxPrice=5000&page=1&limit=10&sortBy=price&sortOrder=asc`

| Param | Type | Default | Notes |
|---|---|---|---|
| search | string | — | partial/case-insensitive match on name |
| category | string | — | exact match, case-insensitive |
| minPrice / maxPrice | number | — | inclusive price range |
| page | number | 1 | |
| limit | number | 10 | max 100 |
| sortBy | string | createdAt | name / price / stock / createdAt |
| sortOrder | string | desc | asc / desc |

Response includes a `meta` object: `{ page, limit, total, totalPages }`.

### Stock adjustment
`PATCH /products/:id/stock`
```json
{ "quantity": 5 }    // increases stock by 5
{ "quantity": -3 }   // decreases stock by 3
```
Implemented as an **atomic** `findOneAndUpdate` with a Mongo-side `$expr` guard (`stock + quantity >= 0`), so stock can never go negative even under concurrent requests — there is no read-then-write race condition.

### Response format
All responses share a consistent shape:
```json
// success
{ "success": true, "message": "...", "data": { ... }, "meta": { ... } }
// error
{ "success": false, "message": "...", "details": [ "..." ] }
```

### Status codes used
`200` OK · `201` Created · `400` Bad Request (validation) · `401` Unauthorized · `404` Not Found · `409` Conflict (duplicate email) · `500` Server error

## 4. Validation (Joi)

All request bodies, route params (`:id`) and list query params are validated with Joi (`src/validations/`) via a reusable `validate(schema, source)` middleware. Invalid requests return `400` with a `details` array of human-readable messages. MongoDB queries are always built from parsed/validated values (never raw string concatenation), which also avoids injection via operator objects (e.g. `{ "$gt": "" }` in a string field).

## 5. Authentication

Simple JWT auth. `POST /api/auth/login` verifies credentials with `bcrypt.compare`, signs a token (`generateAcessToken`, `JWT_EXPIRES_IN` default 1 day), sets it as an httpOnly `accessToken` cookie, and also returns it in the response body. Passwords are hashed with `bcrypt.hash` before saving and are never returned in responses (`select: false` on the schema, plus stripped explicitly after registration). Login failures return the same generic message whether the email or the password was wrong, so the error doesn't reveal which one was incorrect.

`src/validation/loginValidation.js` holds the Joi schemas as plain functions (`registrationValidation`, `loginUserValidation`) that return `{ error, value }` — called directly at the top of each controller rather than as Express middleware.

## 6. Error Handling

Every controller function uses a plain `try/catch` block and responds directly with `res.status(...).json(...)` — no wrapper classes or abstractions, so the request/response flow is easy to follow end-to-end in each function:
- Expected failures (not found, bad input, insufficient stock, wrong credentials) return their specific status code and message inline.
- Unexpected failures are logged with `console.error` and return a generic `500`.
- `src/middlewares/errorHandler.js` is a fallback safety net for anything that isn't caught inline (e.g. Mongoose `CastError`/`ValidationError`, duplicate key `11000`), plus a `notFound` handler for unmatched routes.

## 7. Bonus — Product Summary

`GET /api/products/summary` returns:
```json
{ "totalProducts": 5, "totalStock": 215, "outOfStockCount": 1, "averagePrice": 1039.0 }
```
Computed with a single MongoDB aggregation pipeline (`$group` + `$project`) — no records are loaded into Node.js for the calculation.

## 8. Testing

Import `postman_collection.json` into Postman (base URL variable `baseUrl` defaults to `http://localhost:5000/api`). It covers: register, login, create, list (search/filter/paginate), get by id, update, stock adjustment, delete, and summary. Suggested manual test cases:
- Invalid body on create (empty name / price ≤ 0) → 400
- Get/update/delete a non-existing id → 404
- Create/update/delete without a token → 401
- Stock decrease greater than current stock → 400
- Login with wrong password → 401
- Search + category + price range + pagination combined in one request

## Project Structure

```
src/
  config/db.js            MongoDB connection
  models/                 Mongoose schemas (Admin, Product)
  validation/             Joi schemas — loginValidation.js (function-based), productValidation.js (schema objects for middleware)
  middlewares/            validate (products only), auth (protect), errorHandler
  controllers/            authController (Joi called directly), productController (plain try/catch)
  routes/                 authRoutes, productRoutes
  utils/generateAcessToken.js
  seed.js                 sample data script
server.js                 app entry point
postman_collection.json
.env.example
```
