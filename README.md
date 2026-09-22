<div align="center">

<img src="https://s3.login.no/beehive/img/logo/logo-white-small.svg" alt="Login logo" width="80" height="80" />

<h1>BeeKeeper</h1>

<p>
  <img src="https://img.shields.io/badge/TypeScript-fd8738?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Bun-fd8738?style=flat-square&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/Fastify-fd8738?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/PostgreSQL-fd8738?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-fd8738?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Authentik-fd8738?style=flat-square&logo=authentik&logoColor=white" alt="Authentik" />
</p>

</div>

---

BeeKeeper is a token-validation API for Login, used by QueenBee. It validates Authentik access tokens.

## Endpoints

| Method | Path            | Notes                                               |
|--------|-----------------|-----------------------------------------------------|
| `GET`  | `/api/`         | Lists the registered routes                         |
| `GET`  | `/api/health`   | Liveness/readiness probe                            |
| `GET`  | `/api/version`  | Version from `package.json`                         |
| `GET`  | `/api/token`    | Validates a bearer token against Authentik          |

Token validation requires the caller to be in the `TekKom` or `queenbee` group.

## Getting Started

1. **Configure environment**

   Create a `.env` file in the repo root. See [Configuration](#configuration) below or grab the values from 1Password.

2. **Start**

   ```bash
   docker compose up --build
   ```

   | Service  | URL                    |
   |----------|------------------------|
   | API      | http://localhost:8002  |

## Configuration

All variables go in the root `.env` file.

| Name               | Default      | Notes                                              |
|--------------------|--------------|----------------------------------------------------|
| `BASE_URL`         |              | Base URL for your Authentik instance               |

## Project Structure

- `api/src/handlers/` - HTTP handlers (login, system)
- `api/src/routes.ts` - Route registration
- `api/src/constants.ts` - Configuration and environment variable loading
- `api/src/utils/auth.ts` - Authentik token validation and caching
