import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')

async def update_blends():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Clear existing blends
    result = await db.blends.delete_many({})
    print(f"Deleted {result.deleted_count} existing blends")
    
    # New blends data
    new_blends = [
        {"blend_number": 21, "blend_name": "Blend 21", "cost_per_kg": 178.0, "density": 1.27, "description": "", "application": "Garment Bags, Mailer bags"},
        {"blend_number": 29, "blend_name": "Blend 29", "cost_per_kg": 186.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 22, "blend_name": "Blend 22", "cost_per_kg": 108.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 39, "blend_name": "Blend 39", "cost_per_kg": 202.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 13, "blend_name": "Blend 13_5LA", "cost_per_kg": 145.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 14, "blend_name": "Blend 13_5_BS", "cost_per_kg": 158.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 133, "blend_name": "Blend 133", "cost_per_kg": 159.0, "density": 1.28, "description": "", "application": "Mailer Bags"},
        {"blend_number": 23, "blend_name": "Blend 22_Burgandy", "cost_per_kg": 126.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 16, "blend_name": "Blend 16", "cost_per_kg": 220.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 45, "blend_name": "Blend 45", "cost_per_kg": 186.1, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 11, "blend_name": "Blend 13_Black_LA", "cost_per_kg": 137.7, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 12, "blend_name": "Blend22_HS", "cost_per_kg": 125.8, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 24, "blend_name": "Blend 21_SF", "cost_per_kg": 189.0, "density": 1.27, "description": "", "application": ""},
        {"blend_number": 49, "blend_name": "Blend 49", "cost_per_kg": 195.1, "density": 1.27, "description": "", "application": ""},
    ]
    
    # Insert new blends
    result = await db.blends.insert_many(new_blends)
    print(f"Inserted {len(result.inserted_ids)} new blends")
    
    # Verify
    blends = await db.blends.find({}, {"_id": 0}).sort("blend_number", 1).to_list(100)
    print("\nUpdated Blends:")
    for blend in blends:
        print(f"Blend #{blend['blend_number']}: {blend['blend_name']} - ₹{blend['cost_per_kg']}/kg - {blend['application'] if blend['application'] else 'N/A'}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(update_blends())
