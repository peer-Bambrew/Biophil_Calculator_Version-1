from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class Blend(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    blend_number: int
    blend_name: str
    cost_per_kg: float
    density: float = 1.27  # Default density
    description: Optional[str] = ""
    application: Optional[str] = ""

class BlendCreate(BaseModel):
    blend_number: int
    blend_name: str
    cost_per_kg: float
    density: float = 1.27
    description: Optional[str] = ""
    application: Optional[str] = ""

class CostCalculationInput(BaseModel):
    # Product Type
    product_type: str  # "Side Seal Pouch", "Bottom Seal Pouch", "Garment Bag", "Mailer Bag"
    
    # Dimensions (in cm)
    height: float
    width: float
    flap: float = 0
    gusset: float = 0
    
    # Material
    thickness_microns: float
    blend_number: int
    
    # Printing
    printing_type: str  # "None", "Statutory Inline", "Statutory Registered", "Customized"
    num_colors: int = 0
    printing_coverage_percent: float = 0
    
    # Additional parameters
    quantity: int = 1000
    wastage_percent: float = 5.5

class CostBreakdown(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    # Bag Specifications
    open_height_m: float
    open_width_m: float
    area_sq_m: float
    gsm: float
    weight_per_bag_kg: float
    pieces_per_kg: float
    
    # Material Costs
    blend_cost_per_kg: float
    material_cost_per_bag: float
    
    # Conversion Costs
    blown_film_cost_per_kg: float = 13.92
    blown_film_cost_per_bag: float
    bag_making_cost_per_bag: float
    total_conversion_cost: float
    
    # Printing Costs
    printing_cost_per_bag: float = 0
    
    # Packaging & Logistics (approximate)
    packaging_cost_per_bag: float = 0.15
    logistics_cost_per_bag: float = 0.02
    
    # Total Costs
    total_material_cost: float
    total_direct_cost: float
    cost_per_kg: float
    
    # Margin and Final Price
    margin_percent: float = 30
    landed_cost_per_bag: float

class CalculationRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    calculation_input: CostCalculationInput
    cost_breakdown: CostBreakdown
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Blend Management APIs
@api_router.post("/blends", response_model=Blend)
async def create_blend(blend: BlendCreate):
    # Check if blend number already exists
    existing = await db.blends.find_one({"blend_number": blend.blend_number}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Blend number already exists")
    
    blend_dict = blend.model_dump()
    await db.blends.insert_one(blend_dict)
    return blend

@api_router.get("/blends", response_model=List[Blend])
async def get_all_blends():
    blends = await db.blends.find({}, {"_id": 0}).sort("blend_number", 1).to_list(100)
    return blends

@api_router.get("/blends/{blend_number}", response_model=Blend)
async def get_blend(blend_number: int):
    blend = await db.blends.find_one({"blend_number": blend_number}, {"_id": 0})
    if not blend:
        raise HTTPException(status_code=404, detail="Blend not found")
    return blend

@api_router.put("/blends/{blend_number}", response_model=Blend)
async def update_blend(blend_number: int, blend: BlendCreate):
    existing = await db.blends.find_one({"blend_number": blend_number})
    if not existing:
        raise HTTPException(status_code=404, detail="Blend not found")
    
    blend_dict = blend.model_dump()
    await db.blends.update_one(
        {"blend_number": blend_number},
        {"$set": blend_dict}
    )
    return blend

@api_router.delete("/blends/{blend_number}")
async def delete_blend(blend_number: int):
    result = await db.blends.delete_one({"blend_number": blend_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blend not found")
    return {"message": "Blend deleted successfully"}


# Cost Calculation API
@api_router.post("/calculate", response_model=CostBreakdown)
async def calculate_cost(input_data: CostCalculationInput):
    # Get blend information
    blend = await db.blends.find_one({"blend_number": input_data.blend_number}, {"_id": 0})
    if not blend:
        raise HTTPException(status_code=404, detail=f"Blend {input_data.blend_number} not found")
    
    # Convert dimensions from cm to meters
    height_m = input_data.height / 100
    width_m = input_data.width / 100
    flap_m = input_data.flap / 100
    gusset_m = input_data.gusset / 100
    
    # Calculate open dimensions based on product type
    if input_data.product_type in ["Side Seal Pouch", "Garment Bag", "Mailer Bag"]:
        # Side sealed bags
        open_height = height_m + flap_m
        open_width = width_m + (gusset_m if gusset_m > 0 else 0)  # Add bottom gusset to width
    else:  # Bottom Seal Pouch
        # Bottom sealed bags have side gussets
        open_height = height_m + flap_m
        open_width = width_m + (2 * gusset_m)  # Side gusset on both sides
    
    # Calculate area (in square meters)
    area_sq_m = open_height * open_width * 2  # *2 for both sides of the bag
    
    # Calculate GSM from thickness and density
    # GSM = (thickness in microns × density) / 1000
    density = blend.get('density', 1.27)
    gsm = (input_data.thickness_microns * density)
    
    # Calculate weight per bag (in kg)
    weight_per_bag_kg = (area_sq_m * gsm) / 1000
    
    # Account for wastage
    weight_with_wastage = weight_per_bag_kg * (1 + input_data.wastage_percent / 100)
    
    # Pieces per kg
    pieces_per_kg = 1 / weight_with_wastage if weight_with_wastage > 0 else 0
    
    # Material cost
    blend_cost_per_kg = blend['cost_per_kg']
    material_cost_per_bag = weight_with_wastage * blend_cost_per_kg
    
    # Conversion costs
    blown_film_cost_per_kg = 13.92
    blown_film_cost_per_bag = weight_with_wastage * blown_film_cost_per_kg
    
    # Bag making cost calculation (simplified based on reference data)
    # Using approximate conversion cost per meter and calculating based on area
    bag_making_cost_per_meter = 0.46  # From reference data
    # Estimate meters per bag based on width
    meters_per_bag = open_width
    bag_making_cost_per_bag = meters_per_bag * bag_making_cost_per_meter
    
    total_conversion_cost = blown_film_cost_per_bag + bag_making_cost_per_bag
    
    # Printing costs
    printing_cost_per_bag = 0
    if input_data.printing_type == "Statutory Inline":
        printing_cost_per_bag = 0.03  # Base statutory cost
    elif input_data.printing_type == "Statutory Registered":
        printing_cost_per_bag = 0.05  # Higher cost for registered printing
    elif input_data.printing_type == "Customized":
        # Calculate based on colors and coverage
        base_ink_cost = 0.02
        color_multiplier = input_data.num_colors if input_data.num_colors > 0 else 1
        coverage_multiplier = input_data.printing_coverage_percent / 100
        printing_cost_per_bag = base_ink_cost * color_multiplier * coverage_multiplier * area_sq_m
    
    # Additional costs for special bag types
    additional_cost = 0
    if input_data.product_type == "Garment Bag":
        additional_cost = 0.05  # Seal king tape cost
    elif input_data.product_type == "Mailer Bag":
        additional_cost = 0.04  # Permanent tape cost
    
    # Packaging and logistics (approximate)
    packaging_cost_per_bag = 0.15
    logistics_cost_per_bag = 0.02
    
    # Total costs
    total_material_cost = material_cost_per_bag + additional_cost
    total_direct_cost = total_material_cost + total_conversion_cost + printing_cost_per_bag + packaging_cost_per_bag + logistics_cost_per_bag
    
    # Cost per kg
    cost_per_kg = total_direct_cost / weight_with_wastage if weight_with_wastage > 0 else 0
    
    # Add margin
    margin_percent = 30
    landed_cost_per_bag = total_direct_cost * (1 + margin_percent / 100)
    
    breakdown = CostBreakdown(
        open_height_m=open_height,
        open_width_m=open_width,
        area_sq_m=area_sq_m,
        gsm=gsm,
        weight_per_bag_kg=weight_with_wastage,
        pieces_per_kg=pieces_per_kg,
        blend_cost_per_kg=blend_cost_per_kg,
        material_cost_per_bag=material_cost_per_bag,
        blown_film_cost_per_kg=blown_film_cost_per_kg,
        blown_film_cost_per_bag=blown_film_cost_per_bag,
        bag_making_cost_per_bag=bag_making_cost_per_bag,
        total_conversion_cost=total_conversion_cost,
        printing_cost_per_bag=printing_cost_per_bag,
        packaging_cost_per_bag=packaging_cost_per_bag,
        logistics_cost_per_bag=logistics_cost_per_bag,
        total_material_cost=total_material_cost,
        total_direct_cost=total_direct_cost,
        cost_per_kg=cost_per_kg,
        margin_percent=margin_percent,
        landed_cost_per_bag=landed_cost_per_bag
    )
    
    # Save calculation record
    record = CalculationRecord(
        calculation_input=input_data,
        cost_breakdown=breakdown
    )
    record_dict = record.model_dump()
    record_dict['timestamp'] = record_dict['timestamp'].isoformat()
    await db.calculations.insert_one(record_dict)
    
    return breakdown


@api_router.get("/calculations", response_model=List[CalculationRecord])
async def get_calculations(limit: int = 50):
    calculations = await db.calculations.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    # Convert ISO string timestamps back to datetime objects
    for calc in calculations:
        if isinstance(calc['timestamp'], str):
            calc['timestamp'] = datetime.fromisoformat(calc['timestamp'])
    
    return calculations


# Initialize default blends on startup
@app.on_event("startup")
async def startup_event():
    # Check if blends exist, if not create some default ones
    count = await db.blends.count_documents({})
    if count == 0:
        default_blends = [
            {"blend_number": 21, "blend_name": "Blend 21", "cost_per_kg": 130.0, "density": 1.27, "description": "For garment bags", "application": "Garment Bag"},
            {"blend_number": 133, "blend_name": "Blend 133", "cost_per_kg": 135.0, "density": 1.28, "description": "For mailer bags", "application": "Mailer Bag"},
            {"blend_number": 1, "blend_name": "Blend 1", "cost_per_kg": 125.0, "density": 1.27, "description": "General purpose", "application": "General"},
            {"blend_number": 50, "blend_name": "Blend 50", "cost_per_kg": 140.0, "density": 1.29, "description": "Premium grade", "application": "Premium Pouches"},
        ]
        await db.blends.insert_many(default_blends)
        logger.info("Initialized default blends")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
