# Centrix API

> Production-ready REST API for a SteamDB-style game catalog, built with **NestJS 10**, **Prisma ORM 7**, and **PostgreSQL**.

[![NestJS](https://img.shields.io/badge/Framework-NestJS%2010-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma%207-blue.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blue.svg)](https://www.postgresql.org/)
[![Yarn](https://img.shields.io/badge/Package%20Manager-Yarn-blue.svg)](https://yarnpkg.com/)

Centrix is a high-performance RESTful API designed to manage game catalog data modeled after SteamDB. It features multi-currency pricing, downloadable content (DLC) tracking, user library management, role-based access control, transaction-safe operations, and soft-delete capabilities.

---

## 🚀 Quick Start

Get the API up and running locally in under 5 minutes:

```bash
# 1. Clone the repository and install dependencies
# (postinstall automatically triggers `prisma generate`)
yarn install

# 2. Configure environment variables
cp .env.example .env

# 3. Generate the Prisma 7 client
yarn prisma generate

# 4. Apply database migrations (starts with an empty database)
yarn prisma migrate dev

# 5. Start the development server
yarn start:dev
```

- **API Base URL**: `http://localhost:3000/api`
- **Swagger Documentation**: `http://localhost:3000/docs`
- **Health Check Endpoint**: `http://localhost:3000/api/health`

---

## ✨ Features

- **🎮 SteamDB-style Product Catalog**: Full CRUD management, Steam AppID mapping, tagging, category classification, multi-platform tags, and DLC relationship mapping.
- **💱 Multi-Currency Support**: Native support for `VND`, `USD`, and `CNY` currencies with exact monetary precision (`Decimal(18, 4)`).
- **🔒 Authentication & Token Lifecycle**: JWT access token auth with refresh token rotation and token revocation (logout flow).
- **🛡️ Granular Authorization**: Declarative role-based protection (`ADMIN`, `CUSTOMER`, `STREAMER`) powered by NestJS custom guards and decorators.
- **🗑️ Soft Delete System**: Non-destructive deletion (`invisible = true`) for single and bulk operations, preventing accidental data loss while allowing admin overrides.
- **⚡ Transactional Operations**: Atomicity for bulk imports (`POST /api/products/bulk`), bulk soft-deletes, token rotation, and game purchasing.
- **📦 Shared Domain Library**: Isolated domain DTOs and entity models (`src/shared`) designed for clean architecture and shared across the application.
- **🏥 System Health Monitoring**: Built-in health check using `@nestjs/terminus` verifying PostgreSQL connectivity via `PrismaHealthIndicator`.

---

## 🛠️ Tech Stack & Prerequisites

### Tech Stack
- **Framework**: [NestJS 10](https://nestjs.com/)
- **ORM**: [Prisma 7](https://www.prisma.io/) (with `prisma-client` generator & `@prisma/adapter-pg` driver adapter)
- **Database**: PostgreSQL
- **Package Manager**: [Yarn](https://yarnpkg.com/) (exclusively — `package-lock.json` is not used)
- **Authentication**: Passport JWT with refresh token rotation
- **API Documentation**: Swagger / OpenAPI 3
- **Validation**: `class-validator` & `class-transformer`

### Prerequisites
- Node.js `^20.0.0` or `^22.0.0`
- PostgreSQL `^14.0`
- Yarn `^1.22.0`

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

| Variable | Description | Default / Example | Required |
|----------|-------------|-------------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/centrix?schema=public` | **Yes** |
| `PORT` | Server HTTP port | `3000` | No |
| `JWT_ACCESS_SECRET` | Secret key for signing JWT access tokens | `change-me-access-secret` | **Yes** |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` | No |
| `JWT_REFRESH_SECRET` | Secret key for signing refresh tokens | `change-me-refresh-secret` | **Yes** |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifespan | `7d` | No |

---

## 📂 Project Architecture

```
centrix/
├── prisma.config.ts            # Prisma 7 configuration file (schema path, CLI datasource)
├── src/
│   ├── main.ts                 # Bootstrap application, global pipes, CORS, Swagger setup
│   ├── app.module.ts           # Root module registering global guards, filters, interceptors
│   ├── app.controller.ts       # Base endpoints & health check (/api/health)
│   ├── prisma-health.indicator.ts # Custom Terminus health indicator for database connection
│   │
│   ├── generated/
│   │   └── prisma/             # Generated Prisma client (git-ignored, updated on build/install)
│   │
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema, models, enums & indexes
│   │   ├── prisma.service.ts   # PrismaService lifecycle gateway with @prisma/adapter-pg
│   │   └── prisma-client.ts    # Re-export entry point for generated Prisma Client types
│   │
│   ├── shared/                 # Framework-agnostic DTOs & Models
│   │   ├── dto/                # Validation DTOs (auth, user, token, product)
│   │   └── models/             # Response serialization models
│   │
│   ├── auth/                   # Registration, login, token rotation, JWT strategy
│   ├── product/                # Product CRUD, bulk transactions, soft delete, library purchase
│   ├── user/                   # User persistence & profile service
│   ├── token/                  # Refresh token storage, validation & revocation service
│   │
│   └── common/                 # Core utilities, global filters, guards & interceptors
│       ├── decorators/         # @Public(), @Roles(), @CurrentUser()
│       ├── filters/            # AllExceptionsFilter, PrismaExceptionFilter
│       ├── guards/             # JwtAuthGuard, RolesGuard
│       └── interceptors/       # TransformInterceptor (standard JSON response envelope)
```

---

## 🔐 Auth & Authorization Flow

### Authentication Lifecycle
1. **Register / Login**: `POST /api/auth/register` or `POST /api/auth/login` returns an `accessToken` and `refreshToken`.
2. **Authenticated Requests**: Pass header `Authorization: Bearer <accessToken>` on protected endpoints.
3. **Token Refresh**: When the access token expires, invoke `POST /api/auth/refresh-token` with `{ "refreshToken": "..." }`. The used refresh token is invalidated and replaced with a new token pair.
4. **Revocation / Logout**: Call `POST /api/auth/revoke-token` to explicitly delete the refresh token.

### API Endpoint Permissions

| Route | HTTP Method | Access Level | Description |
|-------|-------------|--------------|-------------|
| `/api/auth/register` | `POST` | Public | Account registration |
| `/api/auth/login` | `POST` | Public | Authenticate user |
| `/api/auth/refresh-token` | `POST` | Public | Rotate refresh token |
| `/api/auth/revoke-token` | `POST` | Public | Revoke refresh token (Logout) |
| `/api/health` | `GET` | Public | System and database health status |
| `/api/products` | `GET` | Public | List non-hidden products (paginated) |
| `/api/products/:id` | `GET` | Public | Get game details by ID |
| `/api/products` | `POST` | Public *(Temp)* | Create a single product |
| `/api/products/bulk` | `POST` | Public *(Temp)* | Bulk import products transactionally |
| `/api/products/:id/purchase` | `POST` | Authenticated | Add product to user's personal library |
| `/api/products/:id` | `PATCH` | Admin | Update product details / toggle visibility |
| `/api/products/:id` | `DELETE` | Admin | Soft-delete a single product |
| `/api/products/bulk` | `DELETE` | Admin | Soft-delete multiple products in bulk |

> ℹ️ *Note: `POST /api/products` and `POST /api/products/bulk` are temporarily set to `@Public()` for dev testing. To enforce Admin protection, restore `@Roles(Role.ADMIN)` on `product.controller.ts`.*

---

## 🗄️ Database & Prisma 7 Notes

This project leverages **Prisma ORM 7**, which introduces structural improvements over Prisma 5/6:

- **Custom Output Directory**: The generated client lives at `src/generated/prisma` rather than inside `node_modules`.
- **Driver Adapter**: Uses `@prisma/adapter-pg` alongside `pg` pool in `PrismaService` for performance and web-standard compatibility.
- **Config Separation**: The database connection string is read via `prisma.config.ts` for migrations and supplied to `PrismaService` at runtime.
- **Import Rule**: Always import Prisma types from `src/prisma/prisma-client.ts` rather than directly from `@prisma/client`.

---

## 📜 Available NPM / Yarn Scripts

| Command | Description |
|---------|-------------|
| `yarn start:dev` | Start application in watch mode |
| `yarn build` | Compile the TypeScript application to `dist/` |
| `yarn start:prod` | Run compiled production bundle (`node dist/main`) |
| `yarn prisma:generate` | Regenerate Prisma 7 client |
| `yarn prisma:migrate` | Execute database migrations in dev environment |
| `yarn prisma:deploy` | Execute database migrations in production environment |
| `yarn prisma:studio` | Open Prisma Studio database GUI |
| `yarn lint` | Lint and auto-fix code using ESLint |
| `yarn format` | Format source code with Prettier |

---

## 📄 License

This project is proprietary and unlicensed.
