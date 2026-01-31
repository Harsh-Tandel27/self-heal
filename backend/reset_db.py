from pymongo import MongoClient
import os

def reset_db():
    print("Resetting database...")
    # Load URI from config
    from config import get_settings
    settings = get_settings()
    uri = settings.mongodb_uri
    
    try:
        client = MongoClient(uri)
        # Check connection
        client.admin.command('ping')
        print("Connected to MongoDB Atlas.")
        
        db_name = "self_healing_agent"
        db = client[db_name]
        
        cols = db.list_collection_names()
        print(f"Found collections: {cols}")
        
        for col_name in cols:
            db[col_name].drop()
            print(f"Dropped collection: {col_name}")
            
        print("✅ Database reset complete. All Atlas collections cleared.")
        client.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    reset_db()
