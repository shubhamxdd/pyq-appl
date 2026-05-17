# Deployment Guide - PYQ Solver App

This guide covers the steps to deploy the functional version of the PYQ Solver App (Phase 4 complete).

## 🚀 1. Prerequisites

- A VPS or Cloud Server (e.g., DigitalOcean Droplet, AWS EC2).
- **Docker** and **Docker Compose** installed.
- A **DigitalOcean Spaces** bucket (or any S3-compatible storage).
- An **OpenRouter API Key**.
- A **Google Cloud Project** (for Google OAuth/Login).

---

## 🔑 2. Environment Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in the required secrets in `.env`:
   - `OPENROUTER_API_KEY`: Get from [openrouter.ai](https://openrouter.ai/).
   - `JWT_SECRET_KEY`: Generate a random secure string (`openssl rand -hex 32`).
   - `SPACES_KEY` & `SPACES_SECRET`: From DigitalOcean API settings.
   - `SPACES_BUCKET`: Your bucket name.
   - `SPACES_REGION`: e.g., `sfo3`.
   - `SPACES_PUBLIC_URL`: The CDN or direct URL of your bucket.
   - `VITE_API_URL`: The public IP or domain of your backend (e.g., `http://your-ip:8001/api`).

---

## 🐳 3. Docker Deployment

### Backend Services
The current `docker-compose.yml` runs the API, Worker, Postgres, and Redis.

1. **Start the services**:
   ```bash
   docker-compose up -d --build
   ```

2. **Run Database Migrations**:
   Once the containers are up, apply the schema to the database:
   ```bash
   docker-compose exec api alembic upgrade head
   ```

### Frontend Service
You have two options for the frontend:

#### Option A: Docker (Recommended for VPS)
I have created a `frontend/Dockerfile` and `frontend/nginx.conf`. To include the frontend in your deployment, add this block to your `docker-compose.yml`:

```yaml
  frontend:
    build: 
      context: ./frontend
      args:
        - VITE_API_URL=${VITE_API_URL}
    ports:
      - "80:80"
    depends_on:
      - api
```

*Note: Make sure `VITE_API_URL` is set in your `.env` before running `docker-compose up`.*

#### Option B: Static Hosting (Vercel/Netlify)
1. Build the frontend locally: `npm run build`
2. Upload the `dist/` folder to your provider.
3. Ensure `VITE_API_URL` points to your backend IP/Domain.

---

## 🛡 4. Production Security Checklist

1. **CORS Configuration**:
   In `backend/app/main.py`, replace `allow_origins=["*"]` with your actual domain/frontend URL.
   
2. **Reverse Proxy (Nginx)**:
   It is highly recommended to use Nginx in front of your Docker containers to handle SSL (HTTPS) via Let's Encrypt.

3. **Database Backups**:
   Ensure you have a strategy to back up the `postgres_data` volume.

---

## 🎨 5. Post-Deployment: UI Revamp
As requested, once the app is running and verified:
1. We will merge the `main` branch state.
2. We will start the **UI Revamp** using `shadcn/ui`.
3. We will transform the current basic Tailwind UI into a premium workspace design.

---

## 🛠 Troubleshooting

- **OCR not working?** Check if `MAX_OCR_PAGES` is set correctly and the Worker container logs: `docker-compose logs -f worker`.
- **Backend connection error?** Ensure `VITE_API_URL` in the `.env` (used during frontend build) matches the backend's public address.
- **Spaces Access Denied?** Ensure your bucket has "File Listing" disabled but "Public Read" enabled for the files uploaded.
