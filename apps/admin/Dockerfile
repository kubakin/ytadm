FROM node:20-alpine AS builder
WORKDIR /app

# Omit or leave empty so the SPA uses same host + :3000 in the browser (see getApiBaseUrl in App.tsx).
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
RUN npm install --workspaces --include-workspace-root

COPY apps/admin apps/admin
WORKDIR /app/apps/admin
RUN npm run build

FROM nginx:1.27-alpine
COPY deployment/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
