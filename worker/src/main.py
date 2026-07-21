import os
import time
import logging
import signal
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

import redis
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError
from bson.objectid import ObjectId
from bson.errors import InvalidId

from src.config import REDIS_URL, MONGO_URI, QUEUE_NAME, WORKER_TIMEOUT, LOG_LEVEL
from src.operations import execute_operation

# Configure logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('worker')

# Global flag for graceful shutdown
running = True

def handle_sigterm(signum, frame):
    """Handle graceful shutdown signals."""
    global running
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    running = False

signal.signal(signal.SIGINT, handle_sigterm)
signal.signal(signal.SIGTERM, handle_sigterm)

def get_db_name(uri: str) -> str:
    """Parse the MongoDB URI to extract the database name."""
    parsed = urlparse(uri)
    path = parsed.path.strip("/")
    return path if path else "ai_platform"

def connect_redis() -> redis.Redis:
    """Connect to Redis with retry logic."""
    while running:
        try:
            s_timeout = (WORKER_TIMEOUT + 5) if WORKER_TIMEOUT > 0 else None
            r = redis.from_url(REDIS_URL, decode_responses=True, socket_timeout=s_timeout)
            r.ping()
            logger.info("Connected to Redis successfully.")
            return r
        except redis.RedisError as e:
            logger.error(f"Failed to connect to Redis: {e}. Retrying in 5 seconds...")
            time.sleep(5)
    return None

def connect_mongo() -> MongoClient:
    """Connect to MongoDB with retry logic."""
    while running:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            logger.info("Connected to MongoDB successfully.")
            return client
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {e}. Retrying in 5 seconds...")
            time.sleep(5)
    return None

def update_health(status: bool):
    """Update health file for k8s liveness probe."""
    health_file = "/tmp/healthy"
    try:
        if status:
            with open(health_file, "w") as f:
                f.write("OK")
        else:
            if os.path.exists(health_file):
                os.remove(health_file)
    except Exception as e:
        logger.warning(f"Could not update health file: {e}")

def create_log_entry(message: str) -> dict:
    """Helper to create a timestamped log entry."""
    return {
        "timestamp": datetime.now(timezone.utc),
        "message": message
    }

def main():
    logger.info("Starting background worker...")
    
    redis_client = connect_redis()
    mongo_client = connect_mongo()
    
    if not redis_client or not mongo_client:
        logger.info("Exiting due to shutdown signal during connection phase.")
        sys.exit(0)
        
    db_name = get_db_name(MONGO_URI)
    db = mongo_client[db_name]
    tasks_collection = db['tasks']
    
    logger.info(f"Worker initialized, listening on queue: {QUEUE_NAME}")
    update_health(True)
    
    while running:
        try:
            # Block until a task is available
            result = redis_client.brpop(QUEUE_NAME, timeout=WORKER_TIMEOUT)
            
            if not result:
                # Timeout occurred, loop again
                continue
                
            _, task_id_str = result
            logger.info(f"Received task ID: {task_id_str}")
            
            try:
                task_id = ObjectId(task_id_str)
            except InvalidId:
                logger.error(f"Invalid task ID format: {task_id_str}")
                continue
                
            # Find the task
            task = tasks_collection.find_one({"_id": task_id})
            if not task:
                logger.warning(f"Task not found in MongoDB: {task_id}")
                continue
                
            # Update to running
            logger.info(f"Processing task {task_id}")
            tasks_collection.update_one(
                {"_id": task_id},
                {
                    "$set": {
                        "status": "running",
                        "updatedAt": datetime.now(timezone.utc)
                    },
                    "$push": {
                        "executionLogs": create_log_entry("Task picked up by worker")
                    }
                }
            )
            
            # Simulate work
            time.sleep(1.5)
            
            operation_type = task.get("operationType")
            input_text = task.get("inputText", "")
            
            try:
                output = execute_operation(operation_type, input_text)
                
                tasks_collection.update_one(
                    {"_id": task_id},
                    {
                        "$set": {
                            "status": "success",
                            "result": output,
                            "updatedAt": datetime.now(timezone.utc)
                        },
                        "$push": {
                            "executionLogs": create_log_entry("Operation completed successfully")
                        }
                    }
                )
                logger.info(f"Task {task_id} completed successfully.")
                
            except Exception as e:
                logger.error(f"Error executing task {task_id}: {e}", exc_info=True)
                tasks_collection.update_one(
                    {"_id": task_id},
                    {
                        "$set": {
                            "status": "failed",
                            "updatedAt": datetime.now(timezone.utc)
                        },
                        "$push": {
                            "executionLogs": create_log_entry(f"Error: {str(e)}")
                        }
                    }
                )
                
        except redis.RedisError as e:
            logger.error(f"Redis connection error during processing: {e}")
            update_health(False)
            time.sleep(5)
            # Reconnect will happen if client is re-initialized or internal reconnect works
            redis_client = connect_redis()
            update_health(True)
        except PyMongoError as e:
            logger.error(f"MongoDB connection error during processing: {e}")
            update_health(False)
            time.sleep(5)
            mongo_client = connect_mongo()
            if mongo_client:
                db = mongo_client[get_db_name(MONGO_URI)]
                tasks_collection = db['tasks']
            update_health(True)
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}", exc_info=True)
            time.sleep(1)

    logger.info("Worker shut down gracefully.")
    update_health(False)

if __name__ == "__main__":
    main()
