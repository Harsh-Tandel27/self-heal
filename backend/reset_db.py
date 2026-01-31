from pymongo import MongoClient
import os

def reset_db():
    print("Resetting database...")
    # MongoDB Atlas URI from .env
    uri = "mongodb+srv://masterharsh179_db_user:KftxBVrVFUyDZ4ut@cluster0.j046jbf.mongodb.net/self_healing_agent?retryWrites=true&w=majority&appName=Cluster0"
    
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
