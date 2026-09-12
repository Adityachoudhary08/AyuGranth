"""Products CRUD routes — /products."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List
from core.database import get_db
from core.dependencies import get_current_user
from models.product import ProductCreate, ProductOut
from rapidfuzz import fuzz

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/ingredients")
async def list_ingredient_references(
    query: str = "",
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return normalized ingredient references for passport intake autocomplete."""
    normalized_query = query.strip()
    criteria = {}
    if normalized_query:
        criteria = {"$or": [
            {"name": {"$regex": normalized_query, "$options": "i"}},
            {"botanical_name": {"$regex": normalized_query, "$options": "i"}},
        ]}
    records = await db.ingredients.find(criteria).sort("name", 1).to_list(length=30)
    if not records and not normalized_query:
        records = [
            {"name": "Ashwagandha", "botanical_name": "Withania somnifera", "is_mineral_metallic": False},
            {"name": "Shatavari", "botanical_name": "Asparagus racemosus", "is_mineral_metallic": False},
            {"name": "Tulsi", "botanical_name": "Ocimum tenuiflorum", "is_mineral_metallic": False},
            {"name": "Swarna Bhasma", "botanical_name": "", "is_mineral_metallic": True},
        ]
    for record in records:
        if "_id" in record:
            record["_id"] = str(record["_id"])
    return records


def _product_similarity(name: str, ingredients: list[str], existing: dict) -> float:
    incoming = f"{name} {' '.join(sorted(ingredients))}".strip().lower()
    stored = f"{existing.get('name', '')} {' '.join(sorted(existing.get('ingredients', [])))}".strip().lower()
    return round(fuzz.token_set_ratio(incoming, stored), 1)


async def _find_possible_duplicate(product: ProductCreate, user_id: str, db: AsyncIOMotorDatabase):
    products = await db.products.find({"user_id": user_id}).to_list(length=500)
    matches = [(product_item, _product_similarity(product.name, product.ingredients, product_item)) for product_item in products]
    matches = [(item, score) for item, score in matches if score >= 85]
    if not matches:
        return None
    match, score = max(matches, key=lambda entry: entry[1])
    match["_id"] = str(match["_id"])
    match["similarity"] = score
    return match


@router.post("/check-duplicate")
async def check_duplicate(
    product: ProductCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Find a likely existing passport without creating a new product."""
    match = await _find_possible_duplicate(product, str(current_user["_id"]), db)
    return {"possible_duplicate": match}


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
    product.setdefault("ingredients", [])
    product.setdefault("source_region", "")
    product.setdefault("manufacturing_process", "")
    product.setdefault("intended_use", "")
    product.setdefault("target_market", "")
    product.setdefault("dosage_form", "")
    product.setdefault("uses_only_classical_texts", False)
    product.setdefault("new_plant_variety_bred", False)
    product.setdefault("unique_packaging", False)
    product.setdefault("region_specific", False)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Permanently delete an owner's product passport and its audit records."""
    try:
        obj_id = ObjectId(product_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid product ID")

    result = await db.products.delete_one(
        {"_id": obj_id, "user_id": str(current_user["_id"])}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.audit_logs.delete_many({"product_id": product_id})


@router.get("/", response_model=List[ProductOut])
async def list_products(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all products belonging to the current authenticated user."""
    cursor = db.products.find(
        {"user_id": str(current_user["_id"])},
        {
            "_id": 1,
            "user_id": 1,
            "name": 1,
            "ingredients": 1,
            "dosage_form": 1,
            "created_at": 1,
        },
    ).sort("created_at", -1)
    products = await cursor.to_list(length=100)

    for product in products:
        product["_id"] = str(product["_id"])
        product.setdefault("ingredients", [])
        product.setdefault("source_region", "")
        product.setdefault("manufacturing_process", "")
        product.setdefault("intended_use", "")
        product.setdefault("target_market", "")
        product.setdefault("dosage_form", "")
        product.setdefault("uses_only_classical_texts", False)
        product.setdefault("new_plant_variety_bred", False)
        product.setdefault("unique_packaging", False)
        product.setdefault("region_specific", False)

    return products
