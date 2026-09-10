"""Products CRUD routes — /products."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from core.database import get_db
from core.dependencies import get_current_user
from models.product import ProductCreate, ProductOut

router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    product: ProductCreate, 
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new product passport entry."""
    product_dict = product.model_dump()
    product_dict["user_id"] = str(current_user["_id"])
    product_dict["created_at"] = datetime.utcnow()
    product_dict["classification"] = None
    
    result = await db.products.insert_one(product_dict)
    product_dict["_id"] = str(result.inserted_id)
    
    return product_dict


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: str, 
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Fetch a specific product by ID."""
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")
        
    product = await db.products.find_one({"_id": obj_id, "user_id": str(current_user["_id"])})
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product["_id"] = str(product["_id"])
    return product


@router.get("/", response_model=List[ProductOut])
async def list_products(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all products for the current user."""
    cursor = db.products.find({"user_id": str(current_user["_id"])})
    products = await cursor.to_list(length=100)
    
    # Auto-provision dummy products for the MVP demo if empty
    if not products:
        dummy_products = [
            {
                "user_id": str(current_user["_id"]),
                "name": "Ayush Kwath Extract",
                "ingredients": ["Tulsi", "Dalchini", "Sunthi", "Krishna Marich"],
                "intended_use": "Immunity booster",
                "dosage_form": "Extract",
                "source_region": "India",
                "created_at": datetime.utcnow(),
            },
            {
                "user_id": str(current_user["_id"]),
                "name": "Suvarna Bhasma Complex",
                "ingredients": ["Swarna Bhasma", "Ashwagandha", "Shatavari"],
                "intended_use": "Rejuvenation and vitality",
                "dosage_form": "Powder",
                "source_region": "India",
                "created_at": datetime.utcnow(),
            }
        ]
        result = await db.products.insert_many(dummy_products)
        for doc in dummy_products:
            doc["_id"] = str(doc["_id"])
        return dummy_products
    
    for product in products:
        product["_id"] = str(product["_id"])
        
    return products
