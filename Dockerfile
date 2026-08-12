FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    AGENT_OS_DATABASE_PATH=/app/data/agent-os.db \
    AGENT_OS_BACKUP_PATH=/app/backups
WORKDIR /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/scripts/start-production.mjs ./scripts/start-production.mjs
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
EXPOSE 3000 8787
VOLUME ["/app/data", "/app/backups"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/config/status').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "scripts/start-production.mjs"]