FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspaces --include-workspace-root

COPY apps/api apps/api
WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
RUN npm install --omit=dev --workspaces --include-workspace-root

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database/migrations ./apps/api/src/database/migrations
COPY --from=builder /app/apps/api/src/typeorm.datasource.ts ./apps/api/src/typeorm.datasource.ts

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "dist/main.js"]
