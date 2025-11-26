# LoopTable
LoopTable is a "Set and Forget" automation tool for Airtable. It solves a critical platform limitation: the inability to schedule recurring record creation (daily, weekly, monthly) without writing code or using external automation platforms like Zapier.

## Development

### Frontend (Airtable Extension)

```bash
cd frontend
npm install
# Run a local development server; open the Airtable Blocks Playground to load the extension
npx block run
```

### Backend (Engine)

```bash
cd backend
npm install
# Copy .env.example to .env and fill in your Airtable client credentials, encryption key, and DB URL
npm run migrate   # run DB schema migrations (creates tables)
npm run dev       # start dev server with nodemon
```

### Dockerized Backend & Database

You can also run the backend and PostgreSQL database as Docker services.

```bash
docker-compose up --build
```

This will start:
- **db**: Postgres (port 5432)
- **backend**: Express API (port 3000)

Configuration is read from `backend/.env` and `docker-compose.yml`.
