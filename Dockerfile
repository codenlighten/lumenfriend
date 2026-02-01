# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install curl for terminal command testing
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base AS release
COPY --from=deps /app/node_modules ./node_modules
COPY . ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/health').then((res) => { if (!res.ok) process.exit(1); }).catch(() => process.exit(1));"
CMD ["node", "server.js"]
