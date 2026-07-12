# Centrix API

Production-ready REST API for a SteamDB-style game catalog, built with **NestJS + Prisma + PostgreSQL** and JWT authentication. Follows a modular, clean-architecture layout.

## Tech stack

- NestJS 10
- **Prisma ORM 7** (new `prisma-client` generator + `@prisma/adapter-pg` driver adapter) + PostgreSQL
- **Yarn** (exclusively — no npm / `package-lock.json`)
- JWT (Passport) authentication with refresh-token rotation
- Swagger / OpenAPI
- class-validator + class-transformer
- bcrypt

## Project structure

```
prisma.config.ts      Prisma 7 config (schema path, datasource URL)
src/
  generated/
    prisma/           Generated Prisma 7 client (via `prisma-client` generator)
  prisma/
    schema.prisma     Datasource + models (NO url — Prisma 7)
    prisma.service.ts Global PrismaService (driver-adapter client, repository gateway)
    prisma-client.ts  Single re-export point for the generated client
  shared/             Framework-agnostic DTOs + models (future Git submodule)
    dto/
      auth/           LoginDto, AuthTokensDto
      user/           RegisterDto
      token/          RefreshTokenDto, RevokeTokenDto
      product/        Create / Update / CreateMany / DeleteMany / Query DTOs
    models/
      product/        ProductModel, PaginatedProductsModel
      user/           UserModel
      token/          TokenModel
  auth/               Register / login / refresh / revoke + JWT strategy
  product/            Product CRUD, bulk ops (transactions), soft-delete, purchase
  user/               User persistence service
  token/              Refresh-token persistence (store / validate / rotate / revoke)
  common/             decorators, guards, filters, interceptors, generic dto, utils
```

### Shared library

All feature DTOs and entity models live under `src/shared`, organized by
domain, with per-folder `index.ts` barrels. Controllers and services import
from `src/shared/dto/<domain>` and `src/shared/models/<domain>` — features
never redefine these locally. The directory is self-contained (only
`class-validator`, `class-transformer` and Swagger decorators) so it can be
extracted into a standalone package / Git submodule later.

## Getting started

```bash
# 1. Install dependencies (postinstall runs `prisma generate` automatically)
yarn install

# 2. Configure environment
cp .env.example .env          # then edit DATABASE_URL + JWT secrets

# 3. Generate the Prisma 7 client (also runs on postinstall)
yarn prisma generate

# 4. Create/apply the database schema (starts empty — no seed data)
yarn prisma migrate dev       # creates tables in your Postgres DB

# 5. Start the API
yarn start:dev
```

> **Prisma 7 notes**
> - The generated client lives **outside `node_modules`**, at `src/generated/prisma`, and is git-ignored + regenerated on `yarn install`.
> - The connection URL is **not** in `schema.prisma`. Prisma Migrate/CLI reads it from `prisma.config.ts`; the runtime client uses the `@prisma/adapter-pg` driver adapter (see `PrismaService`).
> - Import Prisma types/enums/`PrismaClient` from `src/prisma/prisma-client.ts`, never from `@prisma/client`.

- API base: `http://localhost:3000`
- **Swagger UI: `http://localhost:3000/api`** (click **Authorize** and paste the access token from `/auth/login`)

The database starts **empty** after migrations — register the first account via `POST /auth/register` (role defaults to `USER`; promote to `ADMIN` directly in the DB if needed).

## Authentication flow

1. `POST /auth/register` or `POST /auth/login` → returns `accessToken` + `refreshToken`.
2. Send `Authorization: Bearer <accessToken>` on protected routes.
3. When the access token expires, `POST /auth/refresh-token` with the refresh token to get a new pair (the old refresh token is rotated out).
4. `POST /auth/revoke-token` deletes a refresh token (logout).

## Authorization

| Endpoint                          | Access            |
| --------------------------------- | ----------------- |
| `POST /auth/*`                    | Public            |
| `POST /products`                  | **Public (temporary — anonymous)** |
| `GET /products`, `GET /products/:id` | Any authenticated |
| `POST /products/:id/purchase`     | Any authenticated |
| `POST /products/bulk`, `PATCH /products/:id`, `DELETE /products*` | **ADMIN only** |

> ⚠️ **`POST /products` is temporarily public** (no JWT / role required). The
> service is unchanged; re-enable protection by swapping `@Public()` back to
> `@Roles(Role.ADMIN)` on the `create` handler in `product.controller.ts`.

## Soft delete

`DELETE /products/:id` and `DELETE /products/bulk` never remove rows — they set `invisible = true`. List/detail endpoints hide invisible products from customers; admins can pass `?includeHidden=true` to see them and `PATCH` to unhide.

## Transactions

Prisma `$transaction` is used for: bulk insert (`POST /products/bulk`), bulk soft-delete (`DELETE /products/bulk`), refresh-token rotation, and the purchase relationship.
