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

BeeKeeper is a monitoring and infrastructure API for Login, used by QueenBee for internal dashboards. It exposes endpoints for service monitoring, traffic analysis, load balancing, system stats, and user management.

## Features

- **Service monitoring** with real-time status via SSE and WebSocket
- **Traffic analysis** and load balancing insights
- **System statistics** and infrastructure health
- **Authentik integration** for user and group management
- **Discord alerts** for critical service events
- **Scheduled cron jobs** for data collection and maintenance

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
| `DB`               | `beekeeper`  | Postgres database name                             |
| `DB_HOST`          |              | Postgres host                                      |
| `DB_USER`          | `beekeeper`  | Postgres username                                  |
| `DB_PASSWORD`      |              | Postgres password                                  |
| `BASE_URL`         |              | Base URL for your Authentik instance               |
| `CLIENT_ID`        |              | OAuth2 client ID from Authentik                    |
| `CLIENT_SECRET`    |              | OAuth2 client secret from Authentik                |
| `REDIRECT_URI`     |              | OAuth2 redirect URI                                |
| `BEEKEEPER_URL`    |              | Public URL of this BeeKeeper instance              |
| `AUTHENTIK_TOKEN`  |              | Authentik API token for user management            |
| `BTG_TOKEN`        |              | BTG integration token                              |
| `INTERNAL_TOKEN`   |              | Token for Internal API calls                       |
| `WEBHOOK_URL`      |              | Discord webhook URL for alerts                     |
| `CRITICAL_ROLE`    |              | Discord role ID to ping on critical alerts         |
| `TRAFFIC_SECRET`   |              | Secret for traffic data ingestion                  |

## Project Structure

- `api/src/handlers/` - HTTP handlers (monitoring, traffic, load balancing, system, users, AI)
- `api/src/routes.ts` - Route registration
- `api/src/constants.ts` - Configuration and environment variable loading
- `api/src/db.ts` - Database client
- `cron/` - Scheduled data collection jobs
- `db/` - Database schema
