import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/ai_platform")
QUEUE_NAME = os.environ.get("QUEUE_NAME", "task_queue")
WORKER_TIMEOUT = int(os.environ.get("WORKER_TIMEOUT", "5"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
