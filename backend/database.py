"""
MongoDB database connection and collections.
"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import get_settings

settings = get_settings()

# MongoDB client (initialized on startup)
client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_to_mongodb():
    """Initialize MongoDB connection."""
    global client, db
    client = AsyncIOMotorClient(settings.mongodb_uri)
    db = client[settings.database_name]
    
    # Create indexes for better query performance
    await db.signals.create_index([("timestamp", -1)])
    await db.signals.create_index([("processed", 1)])
    await db.signals.create_index([("type", 1)])
    await db.signals.create_index([("merchant_id", 1)])
    
    await db.issues.create_index([("status", 1)])
    await db.issues.create_index([("created_at", -1)])
    await db.issues.create_index([("category", 1)])
    
    await db.workflows.create_index([("status", 1)])
    await db.workflows.create_index([("issue_id", 1)])
    
    await db.audit_logs.create_index([("timestamp", -1)])
    
    print(f"✅ Connected to MongoDB: {settings.database_name}")


async def close_mongodb_connection():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


# Collection accessors
def get_signals_collection():
    return db.signals

def get_issues_collection():
    return db.issues

def get_workflows_collection():
    return db.workflows

def get_audit_logs_collection():
    return db.audit_logs

def get_merchants_collection():
    return db.merchants
