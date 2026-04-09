# YT Admin Monorepo

Monorepo with:
- `apps/api` - NestJS + PostgreSQL + TypeORM
- `apps/admin` - React + Vite admin panel

## Run

1. Start PostgreSQL:
```bash
docker compose up -d
```

2. Install dependencies:
```bash
npm install
```

3. Run backend:
```bash
npm run dev:api
```

4. Run admin:
```bash
npm run dev:admin
```

## Default admin credentials

- Email: `admin@local.dev`
- Password: `admin123`

You can override with env vars in API:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `YOUTUBE_API_KEY`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Auto-import videos on project creation

When admin creates a project, backend automatically imports videos from the provided YouTube channel:
- only videos from last 12 months
- max 300 videos

Import strategy:
- if `YOUTUBE_API_KEY` is set, official YouTube Data API is used
- if key is missing or API request fails, backend tries public-page fallback parsing

For stable production behavior, set `YOUTUBE_API_KEY`.

## Team API flow

1. Register team key:
```http
POST /team/register
```

2. Request next video:
```http
GET /team/next-video?teamApiKey=...
```

3. Report watched:
```http
POST /team/report
{
  "teamApiKey": "...",
  "videoId": "..."
}
```

## Production Docker Compose

1. Prepare env:
```bash
cp .env.production.example .env.production
```

2. Build and start:
```bash
docker compose --env-file .env.production up -d --build
```

3. Services:
- Admin: `http://localhost:8080`
- API: `http://localhost:3000`
