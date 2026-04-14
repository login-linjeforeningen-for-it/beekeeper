# Latest Bun Alpine Image
FROM oven/bun:alpine AS builder

# Sets working directory
WORKDIR /api

# Installs dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copies the rest of the API source code
COPY . .

# Exposes port 8080
EXPOSE 8080

CMD bun src/index.ts
