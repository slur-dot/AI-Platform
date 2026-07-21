# AI Task Processing Platform

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/slur-dot/AI-Platform)

A production-ready, full-stack application for creating and executing asynchronous text-processing tasks. Built with the MERN stack, a Python background worker, and a complete Docker/Kubernetes/GitOps infrastructure.

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   React     │──────▶│  Express    │──────▶│   MongoDB   │
│  Frontend   │ REST  │  Backend    │       │  Database   │
└─────────────┘       └──────┬──────┘       └──────▲──────┘
                             │ enqueue              │ update
                      ┌──────▼──────┐              │
                      │    Redis    │       ┌──────┴──────┐
                      │    Queue    │──────▶│   Python    │
                      └─────────────┘       │   Worker    │
                                            └─────────────┘
```

**Workflow:** User creates a task → backend saves to MongoDB + enqueues to Redis → Python worker picks it up, processes it, and writes the result back to MongoDB → frontend polls for updates.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18, Axios, React Router |
| Backend | Node.js, Express 4, Mongoose |
| Worker | Python 3.12, redis-py, PyMongo |
| Database | MongoDB 7 |
| Queue | Redis 7 |
| Auth | JWT + bcrypt |
| Containers | Docker (multi-stage builds) |
| Orchestration | Kubernetes / k3s |
| GitOps | Argo CD |
| CI/CD | GitHub Actions |

## Quick Start (Local Development)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js 20+](https://nodejs.org/) (for running without Docker)
- [Python 3.12+](https://www.python.org/) (for running without Docker)

### Option 1: Docker Compose (Recommended)

The fastest way to get everything running:

```bash
# Clone the repository
git clone https://github.com/your-username/trial.git
cd trial

# Copy the env template
cp .env.example .env

# Build and start all services
docker-compose up --build
```

That's it. The app will be available at:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health

### Option 2: Manual Setup (Without Docker)

If you prefer running services individually:

**1. Start MongoDB and Redis**

You need MongoDB and Redis running locally. If you have Docker but want to run the app natively:

```bash
docker run -d --name mongo -p 27017:27017 mongo:7
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**2. Backend**

```bash
cd server
cp ../.env.example .env   # edit if needed
npm install
npm run dev
```

**3. Worker**

```bash
cd worker
pip install -r requirements.txt
python -m src.main
```

**4. Frontend**

```bash
cd client
npm install
npm start
```

## API Reference

All task endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ email, password }` | Register a new user |
| POST | `/api/auth/login` | `{ email, password }` | Login and receive JWT |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create a new task |
| GET | `/api/tasks?status=&page=&limit=` | List user's tasks (paginated) |
| GET | `/api/tasks/:id` | Get a single task |
| POST | `/api/tasks/:id/run` | Enqueue a task for execution |

### Supported Operations

| Operation | Description |
|-----------|-------------|
| `uppercase` | Convert all characters to uppercase |
| `lowercase` | Convert all characters to lowercase |
| `reverse` | Reverse the input string |
| `word_count` | Count the total number of words |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Returns `{ status: "ok", timestamp }` |

## Project Structure

```
trial/                         # Application Repository
├── client/                    # React Frontend
│   ├── src/
│   │   ├── api/               # Axios client with auth interceptor
│   │   ├── components/        # Navbar, TaskForm, StatusBadge, ProtectedRoute
│   │   ├── context/           # AuthContext (JWT state management)
│   │   └── pages/             # Login, Register, Dashboard, TaskDetail
│   ├── nginx.conf             # Production nginx config
│   └── Dockerfile             # Multi-stage build → nginx
├── server/                    # Express Backend
│   ├── src/
│   │   ├── config/            # Environment variable config
│   │   ├── middleware/        # JWT auth, rate limiting
│   │   ├── models/            # User, Task (Mongoose schemas)
│   │   ├── routes/            # Auth, Tasks (CRUD + run)
│   │   ├── services/          # Redis queue service
│   │   └── utils/             # Logger
│   └── Dockerfile             # Multi-stage build
├── worker/                    # Python Background Worker
│   ├── src/
│   │   ├── config.py          # Environment config
│   │   ├── operations.py      # Text processing functions
│   │   └── main.py            # Redis consumer + MongoDB updater
│   └── Dockerfile             # Multi-stage build
├── docs/
│   └── ARCHITECTURE.md        # Architecture document (2-4 pages)
├── .github/workflows/
│   └── ci.yml                 # CI/CD pipeline
├── docker-compose.yml         # Local dev environment
└── .env.example               # Environment variable template

trial-infra/                   # Infrastructure Repository
├── argocd/
│   └── application.yaml       # Argo CD Application CR
├── backend/
│   ├── deployment.yaml
│   └── service.yaml
├── frontend/
│   ├── deployment.yaml
│   └── service.yaml
├── worker/
│   └── deployment.yaml
├── mongodb/
│   ├── deployment.yaml
│   └── service.yaml
├── redis/
│   ├── deployment.yaml
│   └── service.yaml
├── namespace.yaml
├── configmap.yaml
├── secrets.yaml
└── ingress.yaml
```

## Docker

All images use multi-stage builds and run as non-root users.

| Image | Base | Runs as |
|-------|------|---------|
| Frontend | `nginx:alpine` | `nginxuser` (UID 1001) |
| Backend | `node:20-alpine` | `appuser` |
| Worker | `python:3.12-slim` | `appuser` |

Build individual images:

```bash
docker build -t ai-platform-frontend ./client
docker build -t ai-platform-backend ./server
docker build -t ai-platform-worker ./worker
```

## Kubernetes Deployment

### Prerequisites

- A running Kubernetes cluster (k3s, minikube, or any other)
- `kubectl` configured to access your cluster
- Nginx Ingress Controller installed

### Deploy

```bash
# Clone the infra repo
git clone https://github.com/your-username/trial-infra.git
cd trial-infra

# Create namespace and apply all manifests
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f mongodb/
kubectl apply -f redis/
kubectl apply -f backend/
kubectl apply -f worker/
kubectl apply -f frontend/
kubectl apply -f ingress.yaml

# Verify everything is running
kubectl get pods -n ai-platform
```

### Important: Update Secrets

The `secrets.yaml` file contains placeholder values. Before deploying to production, update the JWT_SECRET:

```bash
# Generate a proper secret
echo -n "your-strong-secret-here" | base64
# Then update secrets.yaml with the output
```

## Argo CD Setup

1. Install Argo CD on your cluster:
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

2. Apply the application manifest:
```bash
kubectl apply -f argocd/application.yaml
```

3. Argo CD will automatically sync the infra repo and deploy all resources. Changes pushed to the infra repo trigger automatic re-deployment.

## CI/CD Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push to `main`:

1. **Lint** — ESLint (frontend + backend) + flake8 (worker)
2. **Build & Push** — Builds Docker images, pushes to Docker Hub with SHA tags
3. **Update Infra** — Updates image tags in the infra repo, triggering Argo CD sync

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_TOKEN` | Docker Hub access token |
| `INFRA_REPO` | Infra repo path (e.g., `username/trial-infra`) |
| `INFRA_REPO_TOKEN` | GitHub PAT with repo write access |

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT authentication with 24-hour token expiry
- Helmet middleware for HTTP security headers
- Rate limiting on auth (20 req/15 min) and API (100 req/15 min) endpoints
- No hardcoded secrets — everything via environment variables / K8s Secrets
- All containers run as non-root users
- Input validation on all API endpoints

## Architecture Documentation

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture document covering:
- System architecture overview
- Worker scaling strategy
- High volume handling (~100k tasks/day)
- MongoDB indexing strategy
- Redis failure handling and recovery
- Staging/production deployment strategy

## License

MIT
