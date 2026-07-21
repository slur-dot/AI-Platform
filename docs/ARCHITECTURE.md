# Architecture Document: AI Task Processing Platform

## 1. System Architecture Overview

The AI Task Processing Platform is a scalable, cloud-native application designed to handle asynchronous task execution with high reliability. The architecture is composed of five distinct services working together to provide a seamless experience for task submission, processing, and retrieval.

### Components

1. **Frontend (React)**: A single-page application that serves as the user interface. It communicates with the backend API to manage tasks and view their status in real-time.
2. **Backend API (Express/Node.js)**: A RESTful API that handles authentication, task submission, status polling, and database operations. It acts as the orchestrator, dropping incoming tasks into the Redis queue.
3. **Worker Pool (Python)**: A scalable set of Python processes that pull tasks from the Redis queue, execute the heavy AI workloads, and update the task status in MongoDB upon completion.
4. **Database (MongoDB)**: The primary persistent storage layer, maintaining user profiles, task metadata, and historical records.
5. **Message Queue (Redis)**: An in-memory data store used primarily as a fast, reliable message broker (queue) between the backend and the workers.

### Architecture Diagram

```text
                  +-------------------+
                  |   User Browser    |
                  |     (React)       |
                  +---------+---------+
                            | HTTP/REST
                            v
+-------------------------------------------------------------+
|                       Kubernetes Ingress                    |
+---------------------------+---------------------------------+
                            |
                  +---------v---------+
                  |   Backend API     |
                  | (Express/Node.js) |
                  +---------+---------+
                            |
           +----------------+----------------+
           |                                 |
           v                                 v
+-------------------+              +-------------------+
|     Database      |              |   Message Queue   |
|     (MongoDB)     |              |      (Redis)      |
+-------------------+              +-------------------+
           ^                                 ^
           |                                 |
           +----------------+----------------+
                            |
                  +---------+---------+
                  |    Worker Pool    |
                  |     (Python)      |
                  +-------------------+
```

## 2. Worker Scaling Strategy

The worker pool is designed to scale horizontally to meet the demands of a fluctuating workload.

### Redis as a Work Queue
The architecture employs a **Competing Consumers** pattern. Redis serves as the work queue, where the backend pushes task IDs onto a list (`LPUSH`). Workers continuously poll this list using blocking pop operations (`BRPOP`). This ensures that each task is handled by exactly one worker, preventing duplicate processing while allowing multiple workers to operate concurrently without coordination overhead.

### Kubernetes Horizontal Pod Autoscaler (HPA)
Scaling the worker pool is driven by the Kubernetes HPA. While CPU utilization is a baseline metric for scaling, relying solely on CPU is inefficient for I/O-bound tasks. We will integrate external metrics (e.g., using KEDA) to scale workers based on **queue depth**. When the Redis queue grows beyond a threshold (indicating tasks are arriving faster than they can be processed), the HPA spins up additional worker pods. Conversely, as the queue drains, the worker pool scales down to conserve resources.

## 3. Handling High Task Volume

The system is designed to support high throughput, capable of handling approximately 100,000 tasks per day.

### Capacity Planning
- **100,000 tasks / day** ≈ 1.15 tasks per second (average).
- Peak load might be 5-10x the average, so the system must handle 10-15 tasks per second seamlessly.

### Throughput Considerations
- **MongoDB Write Throughput**: MongoDB can comfortably handle thousands of writes per second on modern hardware. To optimize this, the backend will minimize update frequency. For example, status updates will be batched or restricted to significant state changes (e.g., `Queued` -> `Processing` -> `Completed`).
- **Redis Throughput**: Redis is extremely fast and can process tens of thousands of list operations per second. The `BRPOP` operation is non-blocking on the server side and efficiently handles idle connections, making it ideal for our scale.
- **Worker Pool Sizing**: If an average AI task takes 10 seconds, processing 10 tasks per second requires at least 100 concurrent workers. The deployment will configure appropriate requests/limits, allowing the cluster to pack multiple workers densely and scale out nodes as needed.
- **Connection Pooling**: Both the Node.js backend and Python workers will utilize robust connection pooling for MongoDB and Redis to prevent connection exhaustion under load.

## 4. MongoDB Indexing Strategy

To maintain low latency query performance under high data volumes, the MongoDB collections will use targeted indexing.

### Core Indexes
1. **Compound Index on `{ userId: 1, status: 1 }`**
   - **Why**: The most common access pattern for the frontend is querying a user's dashboard to see the status of their active tasks (e.g., "Show me all my 'Processing' tasks").
   - **Optimization**: This compound index allows the database engine to quickly filter by user and then by status, satisfying the query without a full collection scan.

2. **Index on `{ createdAt: -1 }`**
   - **Why**: Users frequently need to view their most recent tasks.
   - **Optimization**: This index supports efficient sorting and pagination of task histories, ensuring that dashboard load times remain instantaneous even as the task collection grows.

## 5. Redis Failure Handling

The message queue is a critical failure point. If a worker pulls a task from Redis and crashes before completing it, the task could be lost.

### Reliability Mechanisms
To mitigate this risk, we use a reliable queue pattern:
- **RPOPLPUSH / BRPOPLPUSH**: Instead of simply popping a task off the queue, workers atomicly move the task from the main `tasks` queue to a `processing` queue specific to that worker.
- **Worker Retry Logic**: A dedicated janitor process (or the backend itself) periodically scans the `processing` queues. If a task remains there beyond a timeout threshold, it is assumed the worker crashed, and the task is moved back to the main queue for retry.

### Redis Persistence and Clustering
While tasks are generally ephemeral, losing the entire queue during a Redis restart is unacceptable. Redis will be configured with **AOF (Append Only File)** persistence for durability. For high availability, a Redis Sentinel or Cluster setup should be considered for production to provide automatic failover.

## 6. Deployment Strategy

The deployment pipeline is fully automated, leveraging GitOps principles for reliability and traceability.

### Environments
The infrastructure utilizes distinct environments:
- **Staging**: Mirrors production for integration testing.
- **Production**: The live environment serving users.

### GitOps with Argo CD
Argo CD continuously monitors the `trial-infra` Git repository. When the CI pipeline completes successfully, it updates the image tags in the infrastructure repository. Argo CD detects this drift and automatically syncs the cluster state to match the repository.

- **Sync Waves**: Argo CD sync waves ensure dependencies are respected during deployment (e.g., applying ConfigMaps and Secrets before deploying the Backend).
- **Update Strategy**: Deployments are configured to use **Rolling Updates**. This ensures zero-downtime deployments by gradually replacing old pods with new ones, waiting for the readiness probes to pass before terminating the old instances.
- **Secrets Management**: While placeholders are used in the infrastructure repository, production secrets (like `JWT_SECRET`) will be managed using tools like External Secrets Operator or HashiCorp Vault, injecting them directly into the cluster without storing them in Git.
