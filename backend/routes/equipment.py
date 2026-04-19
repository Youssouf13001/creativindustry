"""
Equipment/Inventory Management Routes
Gestion du matériel et des déplacements
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import os
import logging
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
SITE_URL = os.environ.get("SITE_URL", "https://creativindustry.com")

# Database connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(tags=["Equipment"])

# Upload directory for invoices
ROOT_DIR = Path(__file__).parent.parent
EQUIPMENT_DIR = ROOT_DIR / "uploads" / "equipment"
EQUIPMENT_DIR.mkdir(parents=True, exist_ok=True)

# ==================== AUTH DEPENDENCY ====================

_get_current_admin = None

def set_admin_dependency(get_current_admin_func):
    """Set the admin authentication dependency"""
    global _get_current_admin
    _get_current_admin = get_current_admin_func

async def get_current_user(credentials = Depends(HTTPBearer(auto_error=False))):
    """Wrapper function for user authentication"""
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _get_current_admin(credentials)

async def require_admin(credentials = Depends(HTTPBearer(auto_error=False))):
    """Wrapper function for admin authentication"""
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Admin auth not configured")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    admin = await _get_current_admin(credentials)
    if admin.get("role") != "complet":
        raise HTTPException(status_code=403, detail="Admin access required")
    return admin

# ==================== MODELS ====================

class EquipmentCategory(BaseModel):
    name: str
    icon: Optional[str] = "📦"
    color: Optional[str] = "#3B82F6"

class Equipment(BaseModel):
    name: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    category_id: Optional[str] = None
    purchase_date: Optional[str] = None
    purchase_price: Optional[float] = None
    warranty_end_date: Optional[str] = None
    condition: Optional[str] = "bon"  # neuf, bon, usé, à_réparer, hors_service
    notes: Optional[str] = None
    quantity: Optional[int] = 1

class DeploymentItem(BaseModel):
    equipment_id: str
    quantity: int = 1

class Deployment(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    equipment_ids: List[str] = []  # Legacy support
    equipment_items: Optional[List[DeploymentItem]] = None  # New format with quantities

class DeploymentItemStatus(BaseModel):
    equipment_id: str
    status: str  # checked_out, returned, lost, forgotten, stolen, damaged
    notes: Optional[str] = None

# ==================== EQUIPMENT CATEGORIES ====================

@router.get("/equipment/categories")
async def get_equipment_categories(current_user: dict = Depends(get_current_user)):
    """Get all equipment categories"""
    categories = await db.equipment_categories.find({}, {"_id": 0}).to_list(100)
    
    # Add default categories if none exist
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Caméras", "icon": "📷", "color": "#EF4444"},
            {"id": str(uuid.uuid4()), "name": "Objectifs", "icon": "🔭", "color": "#F59E0B"},
            {"id": str(uuid.uuid4()), "name": "Éclairage", "icon": "💡", "color": "#FCD34D"},
            {"id": str(uuid.uuid4()), "name": "Audio", "icon": "🎤", "color": "#10B981"},
            {"id": str(uuid.uuid4()), "name": "Trépieds/Supports", "icon": "📐", "color": "#3B82F6"},
            {"id": str(uuid.uuid4()), "name": "Accessoires", "icon": "🎒", "color": "#8B5CF6"},
            {"id": str(uuid.uuid4()), "name": "Informatique", "icon": "💻", "color": "#EC4899"},
            {"id": str(uuid.uuid4()), "name": "Autre", "icon": "📦", "color": "#6B7280"},
        ]
        await db.equipment_categories.insert_many(default_categories)
        # Re-fetch to get clean documents without _id mutation
        categories = await db.equipment_categories.find({}, {"_id": 0}).to_list(100)
    
    return categories

@router.post("/equipment/categories")
async def create_equipment_category(data: EquipmentCategory, current_user: dict = Depends(require_admin)):
    """Create a new equipment category"""
    category = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "icon": data.icon,
        "color": data.color,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.equipment_categories.insert_one(category)
    return {"id": category["id"], "message": "Catégorie créée"}

@router.delete("/equipment/categories/{category_id}")
async def delete_equipment_category(category_id: str, current_user: dict = Depends(require_admin)):
    """Delete an equipment category"""
    result = await db.equipment_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return {"message": "Catégorie supprimée"}

# ==================== EQUIPMENT CRUD ====================

@router.get("/equipment/stats")
async def get_equipment_stats(current_user: dict = Depends(get_current_user)):
    """Get equipment statistics"""
    total = await db.equipment.count_documents({})
    available = await db.equipment.count_documents({"is_available": True})
    in_deployment = await db.equipment.count_documents({"is_available": False})
    
    # By condition
    conditions = {}
    for cond in ["neuf", "bon", "usé", "à_réparer", "hors_service"]:
        conditions[cond] = await db.equipment.count_documents({"condition": cond})
    
    # Active deployments
    active_deployments = await db.deployments.count_documents({"status": {"$in": ["planned", "in_progress"]}})
    
    # Unresolved reminders
    unresolved_reminders = await db.equipment_reminders.count_documents({"resolved": False})
    
    return {
        "total_equipment": total,
        "available": available,
        "in_deployment": in_deployment,
        "by_condition": conditions,
        "active_deployments": active_deployments,
        "unresolved_reminders": unresolved_reminders
    }

@router.get("/equipment/reminders")
async def get_equipment_reminders(current_user: dict = Depends(get_current_user)):
    """Get all equipment reminders (lost, forgotten, warranty expiring, etc.)"""
    reminders = []
    
    # Get unresolved issue reminders
    issue_reminders = await db.equipment_reminders.find(
        {"resolved": False},
        {"_id": 0}
    ).to_list(100)
    reminders.extend(issue_reminders)
    
    # Check for warranty expiring soon (within 30 days)
    today = datetime.now(timezone.utc)
    thirty_days = (today + timedelta(days=30)).isoformat()[:10]
    today_str = today.isoformat()[:10]
    
    expiring_equipment = await db.equipment.find({
        "warranty_end_date": {"$lte": thirty_days, "$gte": today_str}
    }, {"_id": 0}).to_list(100)
    
    for eq in expiring_equipment:
        reminders.append({
            "id": f"warranty_{eq['id']}",
            "type": "warranty_expiring",
            "equipment_id": eq["id"],
            "equipment_name": eq.get("name"),
            "warranty_end_date": eq.get("warranty_end_date"),
            "created_at": today.isoformat()
        })
    
    return reminders

@router.post("/equipment/reminders/{reminder_id}/resolve")
async def resolve_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a reminder as resolved"""
    if reminder_id.startswith("warranty_"):
        # Warranty reminders can't be "resolved" - they're auto-generated
        return {"message": "Les rappels de garantie sont automatiques"}
    
    result = await db.equipment_reminders.update_one(
        {"id": reminder_id},
        {"$set": {"resolved": True, "resolved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Rappel non trouvé")
    
    return {"message": "Rappel résolu"}

@router.get("/equipment")
async def get_equipment_list(
    category_id: Optional[str] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all equipment with optional filters"""
    query = {}
    
    if category_id:
        query["category_id"] = category_id
    if condition:
        query["condition"] = condition
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}},
            {"model": {"$regex": search, "$options": "i"}},
            {"serial_number": {"$regex": search, "$options": "i"}}
        ]
    
    equipment = await db.equipment.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    
    # Add category info
    categories = {c["id"]: c for c in await db.equipment_categories.find({}, {"_id": 0}).to_list(100)}
    for item in equipment:
        if item.get("category_id") and item["category_id"] in categories:
            item["category"] = categories[item["category_id"]]
    
    return equipment

@router.get("/equipment/{equipment_id}")
async def get_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single equipment item"""
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Add category info
    if equipment.get("category_id"):
        category = await db.equipment_categories.find_one({"id": equipment["category_id"]}, {"_id": 0})
        equipment["category"] = category
    
    return equipment

@router.post("/equipment")
async def create_equipment(data: Equipment, current_user: dict = Depends(get_current_user)):
    """Create a new equipment item"""
    equipment = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "brand": data.brand,
        "model": data.model,
        "serial_number": data.serial_number,
        "category_id": data.category_id,
        "purchase_date": data.purchase_date,
        "purchase_price": data.purchase_price,
        "warranty_end_date": data.warranty_end_date,
        "condition": data.condition,
        "notes": data.notes,
        "quantity": data.quantity,
        "invoice_url": None,
        "is_available": True,
        "current_deployment_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id")
    }
    await db.equipment.insert_one(equipment)
    return {"id": equipment["id"], "message": "Équipement ajouté"}

@router.put("/equipment/{equipment_id}")
async def update_equipment(equipment_id: str, data: Equipment, current_user: dict = Depends(get_current_user)):
    """Update an equipment item"""
    update_data = {
        "name": data.name,
        "brand": data.brand,
        "model": data.model,
        "serial_number": data.serial_number,
        "category_id": data.category_id,
        "purchase_date": data.purchase_date,
        "purchase_price": data.purchase_price,
        "warranty_end_date": data.warranty_end_date,
        "condition": data.condition,
        "notes": data.notes,
        "quantity": data.quantity,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.equipment.update_one({"id": equipment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    return {"message": "Équipement mis à jour"}

@router.delete("/equipment/{equipment_id}")
async def delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete - move equipment to trash"""
    equipment = await db.equipment.find_one({"id": equipment_id}, {"_id": 0})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Move to trash
    equipment["deleted_at"] = datetime.now(timezone.utc).isoformat()
    equipment["deleted_by"] = current_user.get("id")
    equipment["deleted_by_name"] = current_user.get("name", "Admin")
    await db.equipment_trash.insert_one(equipment)
    
    # Remove from active inventory
    await db.equipment.delete_one({"id": equipment_id})
    return {"message": "Équipement déplacé dans la corbeille"}

@router.get("/equipment-trash")
async def get_equipment_trash(current_user: dict = Depends(get_current_user)):
    """Get all trashed equipment"""
    items = await db.equipment_trash.find({}, {"_id": 0}).sort("deleted_at", -1).to_list(500)
    return items

@router.post("/equipment-trash/{equipment_id}/restore")
async def restore_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Restore equipment from trash"""
    item = await db.equipment_trash.find_one({"id": equipment_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Équipement non trouvé dans la corbeille")
    
    # Remove trash metadata
    item.pop("deleted_at", None)
    item.pop("deleted_by", None)
    item.pop("deleted_by_name", None)
    
    await db.equipment.insert_one(item)
    await db.equipment_trash.delete_one({"id": equipment_id})
    return {"message": "Équipement restauré"}

@router.delete("/equipment-trash/{equipment_id}")
async def permanently_delete_equipment(equipment_id: str, current_user: dict = Depends(get_current_user)):
    """Permanently delete equipment from trash"""
    result = await db.equipment_trash.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    return {"message": "Équipement supprimé définitivement"}

@router.post("/equipment/{equipment_id}/invoice")
async def upload_equipment_invoice(
    equipment_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload invoice for equipment"""
    equipment = await db.equipment.find_one({"id": equipment_id})
    if not equipment:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    
    # Save file
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'pdf'
    filename = f"invoice_{equipment_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    filepath = EQUIPMENT_DIR / filename
    
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    invoice_url = f"/uploads/equipment/{filename}"
    
    await db.equipment.update_one(
        {"id": equipment_id},
        {"$set": {"invoice_url": invoice_url}}
    )
    
    return {"invoice_url": invoice_url, "message": "Facture uploadée"}

# ==================== DEPLOYMENTS ====================

@router.get("/deployments")
async def get_deployments(
    status: Optional[str] = None,  # planned, in_progress, completed, cancelled
    current_user: dict = Depends(get_current_user)
):
    """Get all deployments"""
    query = {}
    if status:
        query["status"] = status
    
    deployments = await db.deployments.find(query, {"_id": 0}).sort("start_date", -1).to_list(500)
    return deployments

@router.get("/deployments/{deployment_id}")
async def get_deployment(deployment_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single deployment with equipment details"""
    deployment = await db.deployments.find_one({"id": deployment_id}, {"_id": 0})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Get equipment details
    equipment_ids = [item["equipment_id"] for item in deployment.get("items", [])]
    equipment_list = await db.equipment.find({"id": {"$in": equipment_ids}}, {"_id": 0}).to_list(100)
    equipment_map = {e["id"]: e for e in equipment_list}
    
    # Merge equipment info with status
    for item in deployment.get("items", []):
        if item["equipment_id"] in equipment_map:
            item["equipment"] = equipment_map[item["equipment_id"]]
    
    return deployment

@router.post("/deployments")
async def create_deployment(data: Deployment, current_user: dict = Depends(get_current_user)):
    """Create a new deployment"""
    deployment_id = str(uuid.uuid4())
    
    # Create items list with initial status and quantities
    items = []
    
    # New format with quantities
    if data.equipment_items:
        for item in data.equipment_items:
            items.append({
                "equipment_id": item.equipment_id,
                "quantity": item.quantity,
                "status": "checked_out",
                "checked_out_at": datetime.now(timezone.utc).isoformat(),
                "checked_out_by": current_user.get("id"),
                "returned_at": None,
                "return_status": None,
                "notes": None
            })
    # Legacy format (just IDs, quantity = 1)
    elif data.equipment_ids:
        for eq_id in data.equipment_ids:
            items.append({
                "equipment_id": eq_id,
                "quantity": 1,
                "status": "checked_out",
                "checked_out_at": datetime.now(timezone.utc).isoformat(),
                "checked_out_by": current_user.get("id"),
                "returned_at": None,
                "return_status": None,
                "notes": None
            })
    
    deployment = {
        "id": deployment_id,
        "name": data.name,
        "location": data.location,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "notes": data.notes,
        "items": items,
        "status": "planned",  # planned, in_progress, completed, cancelled
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id")
    }
    
    await db.deployments.insert_one(deployment)
    
    return {"id": deployment_id, "message": "Déplacement créé"}

class DeploymentUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    notes: Optional[str] = None
    equipment_items: Optional[List[DeploymentItem]] = None

@router.put("/deployments/{deployment_id}")
async def update_deployment(deployment_id: str, data: DeploymentUpdate, current_user: dict = Depends(get_current_user)):
    """Update deployment info and equipment list"""
    deployment = await db.deployments.find_one({"id": deployment_id})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Build update data
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.location is not None:
        update_data["location"] = data.location
    if data.start_date is not None:
        update_data["start_date"] = data.start_date
    if data.end_date is not None:
        update_data["end_date"] = data.end_date
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    # Handle equipment items update
    if data.equipment_items is not None:
        # Keep existing item data (return status, etc.) for items that are still in the list
        existing_items = {item["equipment_id"]: item for item in deployment.get("items", [])}
        
        new_items = []
        for eq_item in data.equipment_items:
            if eq_item.equipment_id in existing_items:
                # Keep existing item data but update quantity
                existing = existing_items[eq_item.equipment_id]
                existing["quantity"] = eq_item.quantity
                new_items.append(existing)
            else:
                # New item
                new_items.append({
                    "equipment_id": eq_item.equipment_id,
                    "quantity": eq_item.quantity,
                    "status": "checked_out",
                    "checked_out_at": datetime.now(timezone.utc).isoformat(),
                    "checked_out_by": current_user.get("id"),
                    "returned_at": None,
                    "return_status": None,
                    "notes": None
                })
        
        update_data["items"] = new_items
    
    await db.deployments.update_one({"id": deployment_id}, {"$set": update_data})
    
    return {"message": "Déplacement mis à jour"}

@router.post("/deployments/{deployment_id}/start")
async def start_deployment(deployment_id: str, current_user: dict = Depends(get_current_user)):
    """Mark deployment as in progress"""
    result = await db.deployments.update_one(
        {"id": deployment_id},
        {"$set": {
            "status": "in_progress",
            "started_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    return {"message": "Déplacement démarré"}

@router.post("/deployments/{deployment_id}/return")
async def validate_deployment_return(
    deployment_id: str,
    items: List[DeploymentItemStatus],
    current_user: dict = Depends(get_current_user)
):
    """Validate return of equipment from deployment"""
    deployment = await db.deployments.find_one({"id": deployment_id})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Update each item's return status
    items_to_remind = []
    for item_status in items:
        # Update in deployment
        await db.deployments.update_one(
            {"id": deployment_id, "items.equipment_id": item_status.equipment_id},
            {"$set": {
                "items.$.return_status": item_status.status,
                "items.$.returned_at": now if item_status.status == "returned" else None,
                "items.$.return_notes": item_status.notes
            }}
        )
        
        # Update equipment condition based on return status
        if item_status.status in ["lost", "stolen"]:
            await db.equipment.update_one(
                {"id": item_status.equipment_id},
                {"$set": {"condition": "hors_service"}}
            )
            items_to_remind.append(item_status)
        elif item_status.status == "damaged":
            await db.equipment.update_one(
                {"id": item_status.equipment_id},
                {"$set": {"condition": "à_réparer"}}
            )
            items_to_remind.append(item_status)
        elif item_status.status == "forgotten":
            items_to_remind.append(item_status)
    
    # Check if all items are returned
    updated_deployment = await db.deployments.find_one({"id": deployment_id})
    all_returned = all(
        item.get("return_status") in ["returned", "lost", "stolen", "damaged"]
        for item in updated_deployment.get("items", [])
    )
    
    if all_returned:
        await db.deployments.update_one(
            {"id": deployment_id},
            {"$set": {"status": "completed", "completed_at": now}}
        )
    
    # Create reminders for lost/forgotten/damaged items
    for item in items_to_remind:
        equipment = await db.equipment.find_one({"id": item.equipment_id}, {"_id": 0})
        reminder = {
            "id": str(uuid.uuid4()),
            "type": "equipment_issue",
            "equipment_id": item.equipment_id,
            "equipment_name": equipment.get("name") if equipment else "Unknown",
            "deployment_id": deployment_id,
            "issue": item.status,
            "notes": item.notes,
            "created_at": now,
            "resolved": False
        }
        await db.equipment_reminders.insert_one(reminder)
    
    return {"message": "Retour validé", "all_returned": all_returned, "issues": len(items_to_remind)}

@router.delete("/deployments/{deployment_id}")
async def delete_deployment(deployment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a deployment"""
    deployment = await db.deployments.find_one({"id": deployment_id})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    await db.deployments.delete_one({"id": deployment_id})
    return {"message": "Déplacement supprimé"}

# ==================== SIGNATURE ====================

class SignatureData(BaseModel):
    signature_data: str  # Base64 encoded image
    signer_name: str
    signature_type: str = "departure"  # departure or return

@router.post("/deployments/{deployment_id}/signature")
async def save_signature(deployment_id: str, data: SignatureData, current_user: dict = Depends(get_current_user)):
    """Save signature for deployment (departure or return)"""
    import base64
    
    deployment = await db.deployments.find_one({"id": deployment_id})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Save signature image
    signature_filename = f"{deployment_id}_{data.signature_type}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.png"
    signature_path = EQUIPMENT_DIR / "signatures"
    signature_path.mkdir(parents=True, exist_ok=True)
    
    # Decode and save base64 image
    try:
        # Remove data URL prefix if present
        img_data = data.signature_data
        if "base64," in img_data:
            img_data = img_data.split("base64,")[1]
        
        with open(signature_path / signature_filename, "wb") as f:
            f.write(base64.b64decode(img_data))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de signature: {str(e)}")
    
    # Update deployment with signature info
    signature_field = f"signature_{data.signature_type}"
    update_data = {
        signature_field: {
            "filename": signature_filename,
            "signer_name": data.signer_name,
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signed_by": current_user.get("id")
        }
    }
    
    await db.deployments.update_one(
        {"id": deployment_id},
        {"$set": update_data}
    )
    
    return {"message": "Signature enregistrée", "filename": signature_filename}

# ==================== NOTIFICATIONS ====================

@router.post("/deployments/check-reminders")
async def check_deployment_reminders(current_user: dict = Depends(require_admin)):
    """Check for deployments needing reminders and send notifications"""
    from services.email_service import send_email
    
    today = datetime.now(timezone.utc).date()
    tomorrow = today + timedelta(days=1)
    
    # Find deployments ending tomorrow (reminder)
    deployments_ending = await db.deployments.find({
        "status": {"$in": ["planned", "in_progress"]},
        "end_date": tomorrow.isoformat()
    }, {"_id": 0}).to_list(100)
    
    # Find overdue deployments (past end_date, not completed)
    deployments_overdue = await db.deployments.find({
        "status": {"$in": ["planned", "in_progress"]},
        "end_date": {"$lt": today.isoformat()}
    }, {"_id": 0}).to_list(100)
    
    reminders_sent = 0
    
    # Get admin emails
    admins = await db.admins.find({"role": "complet"}, {"_id": 0, "email": 1}).to_list(10)
    admin_emails = [a["email"] for a in admins if a.get("email")]
    
    # Send reminder for deployments ending tomorrow
    for dep in deployments_ending:
        for email in admin_emails:
            try:
                await send_email(
                    to_email=email,
                    subject=f"📦 Rappel: Retour matériel demain - {dep.get('name')}",
                    html_content=f"""
                    <h2>Rappel de retour matériel</h2>
                    <p>Le déplacement <strong>{dep.get('name')}</strong> se termine demain ({dep.get('end_date')}).</p>
                    <p>Lieu: {dep.get('location', 'Non spécifié')}</p>
                    <p>Pensez à valider le retour du matériel sur l'application.</p>
                    <p><a href="{SITE_URL}/admin/equipment">Accéder à la gestion du matériel</a></p>
                    """
                )
                reminders_sent += 1
            except Exception as e:
                logging.error(f"Erreur envoi email: {e}")
    
    # Send alert for overdue deployments
    for dep in deployments_overdue:
        # Check if already alerted today
        last_alert = dep.get("last_overdue_alert")
        if last_alert and last_alert[:10] == today.isoformat():
            continue
            
        for email in admin_emails:
            try:
                await send_email(
                    to_email=email,
                    subject=f"⚠️ ALERTE: Matériel non retourné - {dep.get('name')}",
                    html_content=f"""
                    <h2 style="color: red;">⚠️ Matériel non retourné</h2>
                    <p>Le déplacement <strong>{dep.get('name')}</strong> devait se terminer le {dep.get('end_date')}.</p>
                    <p>Le matériel n'a pas encore été retourné.</p>
                    <p>Lieu: {dep.get('location', 'Non spécifié')}</p>
                    <p><strong>Veuillez vérifier le statut du matériel immédiatement.</strong></p>
                    <p><a href="{SITE_URL}/admin/equipment">Accéder à la gestion du matériel</a></p>
                    """
                )
                reminders_sent += 1
            except Exception as e:
                logging.error(f"Erreur envoi email: {e}")
        
        # Mark as alerted today
        await db.deployments.update_one(
            {"id": dep["id"]},
            {"$set": {"last_overdue_alert": today.isoformat()}}
        )
    
    return {
        "message": "Vérification terminée",
        "reminders_sent": reminders_sent,
        "ending_tomorrow": len(deployments_ending),
        "overdue": len(deployments_overdue)
    }

# ==================== PDF GENERATION ====================

@router.get("/deployments/{deployment_id}/pdf")
async def generate_deployment_pdf(deployment_id: str, current_user: dict = Depends(get_current_user)):
    """Generate PDF for deployment checklist"""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.pdfgen import canvas
    from io import BytesIO
    from fastapi.responses import StreamingResponse
    
    deployment = await db.deployments.find_one({"id": deployment_id}, {"_id": 0})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Get equipment details
    equipment_ids = [item["equipment_id"] for item in deployment.get("items", [])]
    equipment_list = await db.equipment.find({"id": {"$in": equipment_ids}}, {"_id": 0}).to_list(100)
    equipment_map = {e["id"]: e for e in equipment_list}
    
    # Get categories
    categories = {c["id"]: c for c in await db.equipment_categories.find({}, {"_id": 0}).to_list(100)}
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, spaceAfter=10)
    
    elements = []
    
    # Title
    elements.append(Paragraph("Fiche de Déplacement", title_style))
    elements.append(Paragraph(f"<b>{deployment.get('name', 'Sans nom')}</b>", subtitle_style))
    
    # Info
    info_data = [
        ["Lieu:", deployment.get('location', '-')],
        ["Date de départ:", deployment.get('start_date', '-')],
        ["Date de retour:", deployment.get('end_date', '-')],
    ]
    if deployment.get('notes'):
        info_data.append(["Notes:", deployment.get('notes')])
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    # Equipment table
    elements.append(Paragraph("Liste du Matériel", subtitle_style))
    
    table_data = [["☐", "Qté", "Équipement", "Marque/Modèle", "Catégorie"]]
    
    for item in deployment.get("items", []):
        eq = equipment_map.get(item["equipment_id"], {})
        cat = categories.get(eq.get("category_id"), {})
        
        brand_model = f"{eq.get('brand', '')} {eq.get('model', '')}".strip() or "-"
        quantity = item.get("quantity", 1)
        
        table_data.append([
            "☐",
            str(quantity),
            eq.get("name", "Unknown"),
            brand_model,
            cat.get("name", "-")
        ])
    
    eq_table = Table(table_data, colWidths=[1*cm, 1.2*cm, 5*cm, 4*cm, 3.5*cm])
    eq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),  # Center quantity column
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.Color(0.95, 0.95, 0.95)),
        ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.7, 0.7, 0.7)),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    elements.append(eq_table)
    elements.append(Spacer(1, 30))
    
    # Signature section
    elements.append(Paragraph("Validation", subtitle_style))
    
    sig_data = [
        ["Départ", "Retour"],
        ["Date: _________________", "Date: _________________"],
        ["Signature:", "Signature:"],
        ["", ""],
        ["", ""],
    ]
    sig_table = Table(sig_data, colWidths=[8*cm, 8*cm])
    sig_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('BOX', (0, 0), (0, -1), 1, colors.black),
        ('BOX', (1, 0), (1, -1), 1, colors.black),
    ]))
    elements.append(sig_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"deplacement_{deployment.get('name', deployment_id)[:20]}_{deployment.get('start_date', '')}.pdf"
    filename = filename.replace(' ', '_').replace('/', '-')
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== SEND PDF BY EMAIL ====================

class SendPdfEmail(BaseModel):
    email: str
    message: Optional[str] = None

@router.post("/deployments/{deployment_id}/send-pdf")
async def send_deployment_pdf_email(deployment_id: str, data: SendPdfEmail, current_user: dict = Depends(get_current_user)):
    """Generate and send deployment PDF by email"""
    from services.email_service import send_email_with_attachment
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from io import BytesIO
    
    deployment = await db.deployments.find_one({"id": deployment_id}, {"_id": 0})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Get equipment details
    equipment_ids = [item["equipment_id"] for item in deployment.get("items", [])]
    equipment_list = await db.equipment.find({"id": {"$in": equipment_ids}}, {"_id": 0}).to_list(100)
    equipment_map = {e["id"]: e for e in equipment_list}
    categories = {c["id"]: c for c in await db.equipment_categories.find({}, {"_id": 0}).to_list(100)}
    
    # Build PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, spaceAfter=10)
    elements = []
    
    elements.append(Paragraph("Fiche de Déplacement", title_style))
    elements.append(Paragraph(f"<b>{deployment.get('name', 'Sans nom')}</b>", subtitle_style))
    
    info_data = [
        ["Lieu:", deployment.get('location', '-')],
        ["Date de départ:", deployment.get('start_date', '-')],
        ["Date de retour:", deployment.get('end_date', '-')],
    ]
    if deployment.get('notes'):
        info_data.append(["Notes:", deployment.get('notes')])
    
    info_table = Table(info_data, colWidths=[4*cm, 12*cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("Liste du Matériel", subtitle_style))
    table_data = [["Qté", "Équipement", "Marque/Modèle", "Catégorie"]]
    for item in deployment.get("items", []):
        eq = equipment_map.get(item["equipment_id"], {})
        cat = categories.get(eq.get("category_id"), {})
        brand_model = f"{eq.get('brand', '')} {eq.get('model', '')}".strip() or "-"
        table_data.append([str(item.get("quantity", 1)), eq.get("name", "?"), brand_model, cat.get("name", "-")])
    
    eq_table = Table(table_data, colWidths=[1.2*cm, 6*cm, 5*cm, 3.5*cm])
    eq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.7, 0.7, 0.7)),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    elements.append(eq_table)
    
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    
    filename = f"deplacement_{deployment.get('name', deployment_id)[:20]}_{deployment.get('start_date', '')}.pdf"
    filename = filename.replace(' ', '_').replace('/', '-')
    
    custom_msg = data.message or ""
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Fiche de déplacement : {deployment.get('name')}</h2>
        <p><strong>Lieu :</strong> {deployment.get('location', 'Non spécifié')}</p>
        <p><strong>Dates :</strong> {deployment.get('start_date', '-')} → {deployment.get('end_date', '-')}</p>
        <p><strong>Équipements :</strong> {len(deployment.get('items', []))} article(s)</p>
        {f'<p style="margin-top:15px;padding:10px;background:#f5f5f5;border-radius:6px;">{custom_msg}</p>' if custom_msg else ''}
        <p style="margin-top:20px;color:#666;">La checklist est en pièce jointe (PDF).</p>
        <hr style="margin:20px 0;border:none;border-top:1px solid #ddd;">
        <p style="color:#999;font-size:12px;">Envoyé depuis CREATIVINDUSTRY - Gestion du matériel</p>
    </div>
    """
    
    result = send_email_with_attachment(
        to_email=data.email,
        subject=f"Checklist matériel — {deployment.get('name')}",
        html_content=email_html,
        attachment_data=pdf_bytes,
        attachment_filename=filename
    )
    
    if result:
        return {"message": f"PDF envoyé à {data.email}"}
    else:
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi de l'email")

class LossTicketCreate(BaseModel):
    equipment_id: str
    equipment_name: str
    issue_type: str  # lost, stolen, damaged
    deployment_id: Optional[str] = None
    deployment_name: Optional[str] = None
    notes: Optional[str] = None

class LossTicketUpdate(BaseModel):
    status: str  # pending, ordering, delivering, insurance, replaced, reimbursed, obsolete, resolved
    response_message: str
    estimated_date: Optional[str] = None

NOTIFICATION_EMAIL = "communication@creativindustry.com"

@router.post("/loss-tickets")
async def create_loss_ticket(data: LossTicketCreate, current_user: dict = Depends(get_current_user)):
    """Create a loss/theft ticket and send notification email"""
    from services.email_service import send_email
    
    ticket_id = str(uuid.uuid4())
    
    # Get equipment details
    equipment = await db.equipment.find_one({"id": data.equipment_id}, {"_id": 0})
    
    ticket = {
        "id": ticket_id,
        "equipment_id": data.equipment_id,
        "equipment_name": data.equipment_name,
        "equipment_details": equipment,
        "issue_type": data.issue_type,
        "deployment_id": data.deployment_id,
        "deployment_name": data.deployment_name,
        "notes": data.notes,
        "status": "pending",  # pending, ordering, insurance, resolved, obsolete
        "messages": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name", "Admin"),
        "last_reminder_at": None,
        "resolved_at": None
    }
    
    await db.loss_tickets.insert_one(ticket)
    
    # Send notification email
    issue_labels = {
        "lost": "PERDU",
        "stolen": "VOLÉ",
        "damaged": "ENDOMMAGÉ"
    }
    
    issue_label = issue_labels.get(data.issue_type, data.issue_type.upper())
    
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: {'#ef4444' if data.issue_type == 'stolen' else '#f59e0b'};">
            ⚠️ ALERTE MATÉRIEL {issue_label}
        </h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Équipement concerné</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Nom:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">{data.equipment_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Marque:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">{equipment.get('brand', '-') if equipment else '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>Modèle:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">{equipment.get('model', '-') if equipment else '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;"><strong>N° Série:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">{equipment.get('serial_number', '-') if equipment else '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Prix d'achat:</strong></td>
                    <td style="padding: 8px 0;">{str(equipment.get('purchase_price', '')) + '€' if equipment and equipment.get('purchase_price') else 'Non renseigné'}</td>
                </tr>
            </table>
        </div>
        
        {f'<p><strong>Déplacement:</strong> {data.deployment_name}</p>' if data.deployment_name else ''}
        {f'<p><strong>Notes:</strong> {data.notes}</p>' if data.notes else ''}
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">Action requise</h4>
            {"<p>Veuillez contacter l'assurance pour déclarer le vol et obtenir un remplacement.</p>" if data.issue_type == 'stolen' else '<p>Veuillez commander un remplacement ou indiquer si le matériel est obsolète.</p>'}
        </div>
        
        <p style="margin-top: 30px;">
            <a href="{SITE_URL}/admin/equipment?tab=alertes" 
               style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Gérer ce ticket
            </a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
            Ticket #{ticket_id[:8]}<br>
            Signalé par: {current_user.get('name', 'Admin')}<br>
            Date: {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}
        </p>
    </div>
    """
    
    try:
        await send_email(
            to_email=NOTIFICATION_EMAIL,
            subject=f"⚠️ MATÉRIEL {issue_label}: {data.equipment_name}",
            html_content=email_html
        )
    except Exception as e:
        logging.error(f"Erreur envoi email ticket perte: {e}")
    
    return {"id": ticket_id, "message": "Ticket créé et notification envoyée"}

@router.get("/loss-tickets")
async def get_loss_tickets(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all loss/theft tickets"""
    query = {}
    if status:
        query["status"] = status
    
    tickets = await db.loss_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

@router.get("/loss-tickets/{ticket_id}")
async def get_loss_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific loss ticket"""
    ticket = await db.loss_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    return ticket

@router.put("/loss-tickets/{ticket_id}")
async def update_loss_ticket(ticket_id: str, data: LossTicketUpdate, current_user: dict = Depends(get_current_user)):
    """Update a loss ticket with response"""
    from services.email_service import send_email
    
    ticket = await db.loss_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    # Add message to history
    message = {
        "id": str(uuid.uuid4()),
        "status": data.status,
        "message": data.response_message,
        "estimated_date": data.estimated_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id"),
        "created_by_name": current_user.get("name", "Admin")
    }
    
    update_data = {
        "status": data.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Mark resolved_at for all closing statuses
    if data.status in ["resolved", "replaced", "reimbursed", "obsolete"]:
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.loss_tickets.update_one(
        {"id": ticket_id},
        {
            "$set": update_data,
            "$push": {"messages": message}
        }
    )
    
    return {"message": "Ticket mis à jour"}

@router.post("/loss-tickets/{ticket_id}/remind")
async def send_ticket_reminder(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Send a reminder email for an unresolved ticket"""
    from services.email_service import send_email
    
    ticket = await db.loss_tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    if ticket.get("status") == "resolved":
        return {"message": "Ticket déjà résolu"}
    
    status_labels = {
        "pending": "En attente de traitement",
        "ordering": "Commande en cours",
        "insurance": "En cours avec l'assurance",
        "obsolete": "Matériel obsolète"
    }
    
    issue_labels = {
        "lost": "PERDU",
        "stolen": "VOLÉ",
        "damaged": "ENDOMMAGÉ"
    }
    
    last_message = ticket.get("messages", [])[-1] if ticket.get("messages") else None
    
    email_html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🔔 RAPPEL - Ticket en attente de résolution</h2>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0;"><strong>Équipement:</strong> {ticket.get('equipment_name')}</p>
            <p style="margin: 5px 0 0 0;"><strong>Type:</strong> {issue_labels.get(ticket.get('issue_type'), ticket.get('issue_type'))}</p>
            <p style="margin: 5px 0 0 0;"><strong>Statut actuel:</strong> {status_labels.get(ticket.get('status'), ticket.get('status'))}</p>
        </div>
        
        {f'<p><strong>Dernière mise à jour:</strong> {last_message.get("message")}</p>' if last_message else '<p>Aucune mise à jour pour le moment.</p>'}
        
        <p><strong>Merci de mettre à jour ce ticket avec l'avancement :</strong></p>
        <ul>
            <li>Commande lancée ? Date d'arrivée estimée ?</li>
            <li>Dossier assurance en cours ?</li>
            <li>Matériel obsolète (ne pas remplacer) ?</li>
            <li>Problème résolu ?</li>
        </ul>
        
        <p style="margin-top: 30px;">
            <a href="{SITE_URL}/admin/equipment?tab=alertes" 
               style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Mettre à jour le ticket
            </a>
        </p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
            Ticket #{ticket_id[:8]} - Ouvert le {ticket.get('created_at', '')[:10]}
        </p>
    </div>
    """
    
    try:
        await send_email(
            to_email=NOTIFICATION_EMAIL,
            subject=f"🔔 RAPPEL - Matériel {issue_labels.get(ticket.get('issue_type'), '')}: {ticket.get('equipment_name')}",
            html_content=email_html
        )
        
        await db.loss_tickets.update_one(
            {"id": ticket_id},
            {"$set": {"last_reminder_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Rappel envoyé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur envoi email: {str(e)}")

@router.delete("/loss-tickets/{ticket_id}")
async def delete_loss_ticket(ticket_id: str, current_user: dict = Depends(require_admin)):
    """Delete a loss ticket"""
    result = await db.loss_tickets.delete_one({"id": ticket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    return {"message": "Ticket supprimé"}
