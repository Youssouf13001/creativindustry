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

class Deployment(BaseModel):
    name: str
    location: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    notes: Optional[str] = None
    equipment_ids: List[str] = []

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
async def delete_equipment(equipment_id: str, current_user: dict = Depends(require_admin)):
    """Delete an equipment item"""
    result = await db.equipment.delete_one({"id": equipment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Équipement non trouvé")
    return {"message": "Équipement supprimé"}

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
    
    # Create items list with initial status
    items = []
    for eq_id in data.equipment_ids:
        items.append({
            "equipment_id": eq_id,
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
    
    # Mark equipment as unavailable
    await db.equipment.update_many(
        {"id": {"$in": data.equipment_ids}},
        {"$set": {"is_available": False, "current_deployment_id": deployment_id}}
    )
    
    return {"id": deployment_id, "message": "Déplacement créé"}

@router.put("/deployments/{deployment_id}")
async def update_deployment(deployment_id: str, data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Update deployment info"""
    allowed_fields = ["name", "location", "start_date", "end_date", "notes", "status"]
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.deployments.update_one({"id": deployment_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
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
        
        # Update equipment availability
        if item_status.status == "returned":
            await db.equipment.update_one(
                {"id": item_status.equipment_id},
                {"$set": {"is_available": True, "current_deployment_id": None}}
            )
        elif item_status.status in ["lost", "stolen"]:
            await db.equipment.update_one(
                {"id": item_status.equipment_id},
                {"$set": {"condition": "hors_service", "is_available": False}}
            )
            items_to_remind.append(item_status)
        elif item_status.status == "damaged":
            await db.equipment.update_one(
                {"id": item_status.equipment_id},
                {"$set": {"condition": "à_réparer", "is_available": True, "current_deployment_id": None}}
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
async def delete_deployment(deployment_id: str, current_user: dict = Depends(require_admin)):
    """Delete a deployment"""
    deployment = await db.deployments.find_one({"id": deployment_id})
    if not deployment:
        raise HTTPException(status_code=404, detail="Déplacement non trouvé")
    
    # Release equipment
    equipment_ids = [item["equipment_id"] for item in deployment.get("items", [])]
    await db.equipment.update_many(
        {"id": {"$in": equipment_ids}},
        {"$set": {"is_available": True, "current_deployment_id": None}}
    )
    
    await db.deployments.delete_one({"id": deployment_id})
    return {"message": "Déplacement supprimé"}

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
    
    table_data = [["☐", "Équipement", "Marque/Modèle", "N° Série", "Catégorie"]]
    
    for item in deployment.get("items", []):
        eq = equipment_map.get(item["equipment_id"], {})
        cat = categories.get(eq.get("category_id"), {})
        
        brand_model = f"{eq.get('brand', '')} {eq.get('model', '')}".strip() or "-"
        
        table_data.append([
            "☐",
            eq.get("name", "Unknown"),
            brand_model,
            eq.get("serial_number", "-"),
            cat.get("name", "-")
        ])
    
    eq_table = Table(table_data, colWidths=[1*cm, 5*cm, 4*cm, 3.5*cm, 3*cm])
    eq_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
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
