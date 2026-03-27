from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
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
    density: float = 1.27
    description: Optional[str] = ""
    application: Optional[str] = ""

class BlendCreate(BaseModel):
    blend_number: int
    blend_name: str
    cost_per_kg: float
    density: float = 1.27
    description: Optional[str] = ""
    application: Optional[str] = ""

class AdminSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    # Logistics Costs (per kg)
    ptl_cost_per_kg: float = 12.0
    ftl_north_cost_per_kg: float = 12.0
    ftl_south_cost_per_kg: float = 8.0
    ftl_west_cost_per_kg: float = 9.0
    ftl_east_cost_per_kg: float = 15.0
    ftl_threshold_kg: float = 5000.0
    
    # Wastage Percentages
    wastage_below_300kg: float = 15.0
    wastage_300kg_to_1ton: float = 10.0
    wastage_above_1ton: float = 6.0
    
    # Packaging
    box_cost_small: float = 40.0
    box_cost_medium: float = 65.0
    box_cost_large: float = 100.0
    box_weight_small_kg: float = 0.8
    box_weight_medium_kg: float = 1.5
    box_weight_large_kg: float = 2.5
    
    # Machine Speeds
    printing_machine_speed: float = 150.0
    bag_making_machine_speed: float = 33.0
    
    # Conversion Margins (internal)
    printing_conversion_margin: float = 30.0
    bag_making_conversion_margin: float = 30.0

class BOMMaterial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    material_id: str
    material_name: str
    cost_per_kg: float
    gsm: float
    width_m: float
    unit: str = "kg"
    description: Optional[str] = ""
    applicable_products: List[str] = []

class BOMMaterialCreate(BaseModel):
    material_id: str
    material_name: str
    cost_per_kg: float
    gsm: float
    width_m: float
    unit: str = "kg"
    description: Optional[str] = ""
    applicable_products: List[str] = []

class CostCalculationInput(BaseModel):
    product_type: str
    height: float
    width: float
    flap: float = 0
    gusset: float = 0
    has_perforation: bool = False
    thickness_microns: float
    blend_number: int
    printing_type: str = "None"
    num_colors: int = 0
    printing_coverage_percent: float = 0
    quantity: int = 1000
    sales_margin_percent: float = 0
    delivery_region: str = "South"
    barcodes_per_bag: int = 0  # Number of variable barcodes per bag
    
    @field_validator('thickness_microns')
    def validate_thickness(cls, v):
        if v < 15:
            raise ValueError('Thickness cannot be less than 15 microns')
        return v
    
    @field_validator('height')
    def validate_height(cls, v):
        if v > 24:
            raise ValueError('Height cannot be more than 24 inches')
        return v
    
    @field_validator('width')
    def validate_width(cls, v):
        if v > 25:
            raise ValueError('Width cannot be more than 25 inches')
        return v

class CostBreakdown(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    open_height_m: float
    open_width_m: float
    area_sq_m: float
    gsm: float
    weight_per_bag_kg: float
    weight_per_bag_with_wastage_kg: float
    pieces_per_kg_after_wastage: float
    wastage_percent_applied: float
    
    blend_cost_per_kg: float
    material_cost_per_bag: float
    material_weight_kg: float
    
    seal_king_tape_cost_per_bag: float = 0
    seal_king_tape_length_m: float = 0
    
    hot_melt_cost_per_bag: float = 0
    hot_melt_weight_kg: float = 0
    
    release_liner_cost_per_bag: float = 0
    release_liner_weight_kg: float = 0
    
    # Barcode costs
    barcode_cost_per_bag: float = 0
    barcodes_per_bag: int = 0
    
    # Packaging (Corrugation Box)
    corrugation_box_cost_per_bag: float
    corrugation_boxes_needed: float
    
    blown_film_cost_per_kg: float = 13.92
    blown_film_cost_per_bag: float
    bag_making_cost_per_bag: float
    total_conversion_cost: float
    
    printing_cost_per_bag: float = 0
    
    packaging_cost_per_bag: float
    packaging_weight_kg: float
    logistics_cost_per_bag: float
    logistics_type: str
    delivery_region: str
    
    total_material_cost: float
    total_direct_cost: float
    cost_per_kg: float
    
    sales_margin_percent: float
    sales_margin_amount: float
    selling_price_per_bag: float
    
    total_order_weight_kg: float
    total_order_cost: float
    total_order_selling_price: float

class CalculationRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    calculation_input: CostCalculationInput
    cost_breakdown: CostBreakdown
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Helper function to get admin settings
async def get_admin_settings() -> AdminSettings:
    settings_doc = await db.settings.find_one({"_id": "admin_settings"}, {"_id": 0})
    if settings_doc:
        return AdminSettings(**settings_doc)
    return AdminSettings()

# Helper function to determine wastage percentage
def get_wastage_percent(total_weight_kg: float, settings: AdminSettings) -> float:
    if total_weight_kg < 300:
        return settings.wastage_below_300kg
    elif total_weight_kg < 1000:
        return settings.wastage_300kg_to_1ton
    else:
        return settings.wastage_above_1ton


# Admin Settings APIs
@api_router.get("/settings", response_model=AdminSettings)
async def get_settings():
    return await get_admin_settings()

@api_router.put("/settings", response_model=AdminSettings)
async def update_settings(settings: AdminSettings):
    settings_dict = settings.model_dump()
    await db.settings.update_one(
        {"_id": "admin_settings"},
        {"$set": settings_dict},
        upsert=True
    )
    return settings


# Blend Management APIs
@api_router.post("/blends", response_model=Blend)
async def create_blend(blend: BlendCreate):
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


# BOM Material Management APIs
@api_router.post("/bom-materials", response_model=BOMMaterial)
async def create_bom_material(material: BOMMaterialCreate):
    existing = await db.bom_materials.find_one({"material_id": material.material_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Material ID already exists")
    
    material_dict = material.model_dump()
    await db.bom_materials.insert_one(material_dict)
    return material

@api_router.get("/bom-materials", response_model=List[BOMMaterial])
async def get_all_bom_materials():
    materials = await db.bom_materials.find({}, {"_id": 0}).sort("material_name", 1).to_list(100)
    return materials

@api_router.get("/bom-materials/{material_id}", response_model=BOMMaterial)
async def get_bom_material(material_id: str):
    material = await db.bom_materials.find_one({"material_id": material_id}, {"_id": 0})
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
    return material

@api_router.put("/bom-materials/{material_id}", response_model=BOMMaterial)
async def update_bom_material(material_id: str, material: BOMMaterialCreate):
    existing = await db.bom_materials.find_one({"material_id": material_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    
    material_dict = material.model_dump()
    await db.bom_materials.update_one(
        {"material_id": material_id},
        {"$set": material_dict}
    )
    return material

@api_router.delete("/bom-materials/{material_id}")
async def delete_bom_material(material_id: str):
    result = await db.bom_materials.delete_one({"material_id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"message": "Material deleted successfully"}


# Cost Calculation API
@api_router.post("/calculate", response_model=CostBreakdown)
async def calculate_cost(input_data: CostCalculationInput):
    # Get settings and blend
    settings = await get_admin_settings()
    blend = await db.blends.find_one({"blend_number": input_data.blend_number}, {"_id": 0})
    if not blend:
        raise HTTPException(status_code=404, detail=f"Blend {input_data.blend_number} not found")
    
    # Convert dimensions from inches to meters
    height_m = input_data.height * 0.0254
    width_m = input_data.width * 0.0254
    flap_m = input_data.flap * 0.0254
    gusset_m = input_data.gusset * 0.0254
    
    # Calculate open dimensions
    if input_data.product_type == "Bottom Seal Pouch":
        open_height = height_m + flap_m
        open_width = width_m + (2 * gusset_m)
    else:
        open_height = height_m + flap_m
        open_width = width_m + (gusset_m if gusset_m > 0 else 0)
    
    # Calculate area and weight
    area_sq_m = open_height * open_width * 2
    density = blend.get('density', 1.27)
    gsm = input_data.thickness_microns * density
    weight_per_bag_kg = (area_sq_m * gsm) / 1000
    
    # Calculate total order weight (without wastage first)
    total_order_weight_initial = weight_per_bag_kg * input_data.quantity
    
    # Determine wastage percentage
    wastage_percent = get_wastage_percent(total_order_weight_initial, settings)
    
    # Apply wastage
    weight_with_wastage = weight_per_bag_kg * (1 + wastage_percent / 100)
    pieces_per_kg = 1 / weight_with_wastage if weight_with_wastage > 0 else 0
    
    # Material cost
    blend_cost_per_kg = blend['cost_per_kg']
    material_cost_per_bag = weight_with_wastage * blend_cost_per_kg
    material_weight_kg = weight_with_wastage
    
    # Seal King Tape (for Garment Bags)
    seal_king_tape_cost = 0
    seal_king_tape_length = 0
    if input_data.product_type == "Garment Bag":
        seal_king_material = await db.bom_materials.find_one({"material_id": "seal_king_tape"}, {"_id": 0})
        if seal_king_material:
            seal_king_tape_length = width_m
            # Calculate cost: length × cost per meter
            cost_per_meter = seal_king_material['cost_per_kg'] / 1000  # Assuming cost stored as per kg, convert to per meter
            seal_king_tape_cost = seal_king_tape_length * cost_per_meter
    
    # Hot Melt and Release Liner (for Mailer Bags)
    hot_melt_cost = 0
    hot_melt_weight = 0
    release_liner_cost = 0
    release_liner_weight = 0
    
    if input_data.product_type == "Mailer Bag":
        # Hot melt calculation
        hot_melt_material = await db.bom_materials.find_one({"material_id": "hot_melt"}, {"_id": 0})
        if hot_melt_material:
            hot_melt_area = hot_melt_material['width_m'] * width_m
            hot_melt_weight = (hot_melt_area * hot_melt_material['gsm']) / 1000
            hot_melt_cost = hot_melt_weight * hot_melt_material['cost_per_kg']
        
        # Release liner calculation
        release_liner_material = await db.bom_materials.find_one({"material_id": "release_liner"}, {"_id": 0})
        if release_liner_material:
            release_liner_area = release_liner_material['width_m'] * width_m
            release_liner_weight = (release_liner_area * release_liner_material['gsm']) / 1000
            release_liner_cost = release_liner_weight * release_liner_material['cost_per_kg']
    
    # Conversion costs
    blown_film_cost_per_kg = 13.92
    blown_film_cost_per_bag = weight_with_wastage * blown_film_cost_per_kg
    
    # Bag making cost
    bag_making_cost_per_meter = 0.46
    meters_per_bag = open_width
    bag_making_cost_per_bag = meters_per_bag * bag_making_cost_per_meter
    
    total_conversion_cost = blown_film_cost_per_bag + bag_making_cost_per_bag
    
    # Printing cost
    printing_cost_per_bag = 0
    if input_data.printing_type == "Statutory Inline":
        printing_cost_per_bag = 0.03
    elif input_data.printing_type == "Statutory Registered":
        printing_cost_per_bag = 0.05
    elif input_data.printing_type == "Customized":
        base_ink_cost = 0.02
        color_multiplier = input_data.num_colors if input_data.num_colors > 0 else 1
        coverage_multiplier = input_data.printing_coverage_percent / 100
        printing_cost_per_bag = base_ink_cost * color_multiplier * coverage_multiplier * area_sq_m
    
    # Barcode cost
    barcode_cost = 0
    if input_data.barcodes_per_bag > 0:
        barcode_material = await db.bom_materials.find_one({"material_id": "variable_barcode"}, {"_id": 0})
        if barcode_material:
            barcode_cost = input_data.barcodes_per_bag * barcode_material['cost_per_kg']  # cost_per_kg stores per piece cost for barcodes
    
    # Packaging cost - Using Corrugation Boxes (12 kg capacity per box)
    total_order_weight = weight_with_wastage * input_data.quantity
    corrugation_box_material = await db.bom_materials.find_one({"material_id": "corrugation_box"}, {"_id": 0})
    
    if corrugation_box_material:
        box_capacity_kg = 12.0  # Standard 12 kg per box
        corrugation_boxes_needed = total_order_weight / box_capacity_kg
        corrugation_box_cost_total = corrugation_boxes_needed * corrugation_box_material['cost_per_kg']  # cost_per_kg stores per piece cost for boxes
        packaging_cost_per_bag = corrugation_box_cost_total / input_data.quantity
    else:
        # Fallback to old logic if BOM not found
        corrugation_boxes_needed = 0
        if total_order_weight < 50:
            packaging_cost_per_bag = settings.box_cost_small / input_data.quantity
        elif total_order_weight < 200:
            packaging_cost_per_bag = settings.box_cost_medium / input_data.quantity
        else:
            packaging_cost_per_bag = settings.box_cost_large / input_data.quantity
    
    packaging_weight_per_bag = 0.5 / input_data.quantity  # Approximate box weight contribution
    
    # Logistics cost
    total_weight_with_packaging = total_order_weight + (packaging_weight_per_bag * input_data.quantity)
    
    if total_weight_with_packaging >= settings.ftl_threshold_kg:
        logistics_type = "FTL"
        if input_data.delivery_region == "North":
            logistics_rate = settings.ftl_north_cost_per_kg
        elif input_data.delivery_region == "South":
            logistics_rate = settings.ftl_south_cost_per_kg
        elif input_data.delivery_region == "West":
            logistics_rate = settings.ftl_west_cost_per_kg
        else:  # East
            logistics_rate = settings.ftl_east_cost_per_kg
    else:
        logistics_type = "PTL"
        logistics_rate = settings.ptl_cost_per_kg
    
    logistics_cost_per_bag = (weight_with_wastage + packaging_weight_per_bag) * logistics_rate
    
    # Total costs
    total_material_cost = (material_cost_per_bag + seal_king_tape_cost + 
                          hot_melt_cost + release_liner_cost + barcode_cost)
    total_direct_cost = (total_material_cost + total_conversion_cost + 
                        printing_cost_per_bag + packaging_cost_per_bag + logistics_cost_per_bag)
    
    cost_per_kg = total_direct_cost / weight_with_wastage if weight_with_wastage > 0 else 0
    
    # Sales margin
    sales_margin_amount = total_direct_cost * (input_data.sales_margin_percent / 100)
    selling_price_per_bag = total_direct_cost + sales_margin_amount
    
    # Order totals
    total_order_cost = total_direct_cost * input_data.quantity
    total_order_selling_price = selling_price_per_bag * input_data.quantity
    
    breakdown = CostBreakdown(
        open_height_m=open_height,
        open_width_m=open_width,
        area_sq_m=area_sq_m,
        gsm=gsm,
        weight_per_bag_kg=weight_per_bag_kg,
        weight_per_bag_with_wastage_kg=weight_with_wastage,
        pieces_per_kg_after_wastage=pieces_per_kg,
        wastage_percent_applied=wastage_percent,
        blend_cost_per_kg=blend_cost_per_kg,
        material_cost_per_bag=material_cost_per_bag,
        material_weight_kg=material_weight_kg,
        seal_king_tape_cost_per_bag=seal_king_tape_cost,
        seal_king_tape_length_m=seal_king_tape_length,
        hot_melt_cost_per_bag=hot_melt_cost,
        hot_melt_weight_kg=hot_melt_weight,
        release_liner_cost_per_bag=release_liner_cost,
        release_liner_weight_kg=release_liner_weight,
        barcode_cost_per_bag=barcode_cost,
        barcodes_per_bag=input_data.barcodes_per_bag,
        corrugation_box_cost_per_bag=packaging_cost_per_bag,
        corrugation_boxes_needed=corrugation_boxes_needed if corrugation_box_material else 0,
        blown_film_cost_per_kg=blown_film_cost_per_kg,
        blown_film_cost_per_bag=blown_film_cost_per_bag,
        bag_making_cost_per_bag=bag_making_cost_per_bag,
        total_conversion_cost=total_conversion_cost,
        printing_cost_per_bag=printing_cost_per_bag,
        packaging_cost_per_bag=packaging_cost_per_bag,
        packaging_weight_kg=packaging_weight_per_bag,
        logistics_cost_per_bag=logistics_cost_per_bag,
        logistics_type=logistics_type,
        delivery_region=input_data.delivery_region,
        total_material_cost=total_material_cost,
        total_direct_cost=total_direct_cost,
        cost_per_kg=cost_per_kg,
        sales_margin_percent=input_data.sales_margin_percent,
        sales_margin_amount=sales_margin_amount,
        selling_price_per_bag=selling_price_per_bag,
        total_order_weight_kg=total_weight_with_packaging,
        total_order_cost=total_order_cost,
        total_order_selling_price=total_order_selling_price
    )
    
    # Save calculation
    record = CalculationRecord(calculation_input=input_data, cost_breakdown=breakdown)
    record_dict = record.model_dump()
    record_dict['timestamp'] = record_dict['timestamp'].isoformat()
    await db.calculations.insert_one(record_dict)
    
    return breakdown


@api_router.get("/calculations", response_model=List[CalculationRecord])
async def get_calculations(limit: int = 50):
    calculations = await db.calculations.find({}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    for calc in calculations:
        if isinstance(calc['timestamp'], str):
            calc['timestamp'] = datetime.fromisoformat(calc['timestamp'])
    
    return calculations


# Initialize defaults
@app.on_event("startup")
async def startup_event():
    # Initialize default settings if not exists
    settings_doc = await db.settings.find_one({"_id": "admin_settings"})
    if not settings_doc:
        default_settings = AdminSettings()
        settings_dict = default_settings.model_dump()
        settings_dict["_id"] = "admin_settings"
        await db.settings.insert_one(settings_dict)
        logger.info("Initialized default admin settings")
    
    # Initialize default BOM materials if not exist
    bom_count = await db.bom_materials.count_documents({})
    if bom_count == 0:
        default_bom_materials = [
            {
                "material_id": "seal_king_tape",
                "material_name": "Seal King Tape",
                "cost_per_kg": 130.0,  # ₹0.13 per meter = ₹130 per kg (approx)
                "gsm": 0,
                "width_m": 0.012,
                "unit": "meter",
                "description": "For Garment Bags - sealing tape across width",
                "applicable_products": ["Garment Bag"]
            },
            {
                "material_id": "hot_melt",
                "material_name": "Hot Melt Adhesive",
                "cost_per_kg": 215.0,
                "gsm": 130.0,
                "width_m": 0.012,
                "unit": "kg",
                "description": "For Mailer Bags - adhesive layer",
                "applicable_products": ["Mailer Bag"]
            },
            {
                "material_id": "release_liner",
                "material_name": "Release Liner",
                "cost_per_kg": 265.0,
                "gsm": 60.0,
                "width_m": 0.03,
                "unit": "kg",
                "description": "For Mailer Bags - protective liner",
                "applicable_products": ["Mailer Bag"]
            },
            {
                "material_id": "corrugation_box",
                "material_name": "Corrugation Box",
                "cost_per_kg": 40.0,
                "gsm": 0,
                "width_m": 0,
                "unit": "piece",
                "description": "Standard packing box - 12 kg capacity per box",
                "applicable_products": ["All"]
            },
            {
                "material_id": "variable_barcode",
                "material_name": "Variable Barcode",
                "cost_per_kg": 0.08,
                "gsm": 0,
                "width_m": 0,
                "unit": "piece",
                "description": "Variable barcode printing cost per piece",
                "applicable_products": ["All"]
            }
        ]
        await db.bom_materials.insert_many(default_bom_materials)
        logger.info("Initialized default BOM materials")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
