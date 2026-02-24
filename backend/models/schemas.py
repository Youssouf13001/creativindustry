"""
Pydantic models for CREATIVINDUSTRY API
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# ==================== ADMIN MODELS ====================

# Available tabs for admin access control
ADMIN_TABS = [
    "overview", "tasks", "calendar", "galleries", "content", "portfolio",
    "quotes", "bookings", "clients", "extensions", "newsletter", "deployment",
    "services", "options", "messages", "appointments", "settings", "security"
]

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "complet"  # complet, editeur, lecteur
    allowed_tabs: List[str] = []  # Empty = all tabs (for complet role)

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None

class AdminUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    allowed_tabs: Optional[List[str]] = None
    is_active: Optional[bool] = None

class AdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    mfa_enabled: bool = False
    role: str = "complet"
    allowed_tabs: List[str] = []
    is_active: bool = True


# ==================== MFA MODELS ====================

class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: List[str]

class MFAVerifyRequest(BaseModel):
    totp_code: str

class MFADisableRequest(BaseModel):
    password: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None
    email_code: Optional[str] = None

class MFAResetRequest(BaseModel):
    backup_code: str

class MFAEmailResetRequest(BaseModel):
    email: EmailStr

class MFAEmailResetVerify(BaseModel):
    email: EmailStr
    reset_code: str


# ==================== SERVICE PACKAGE MODELS ====================

class ServicePackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    features: List[str]
    category: str
    duration: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServicePackageCreate(BaseModel):
    name: str
    description: str
    price: float
    features: List[str]
    category: str
    duration: Optional[str] = None

class ServicePackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    duration: Optional[str] = None
    is_active: Optional[bool] = None


# ==================== BOOKING MODELS ====================

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    service_name: str
    service_category: str
    service_price: float = 0
    deposit_amount: float = 0
    deposit_percentage: int = 30
    event_date: str
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending_payment"
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    event_date: str
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    message: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_reference: Optional[str] = None

class BankDetails(BaseModel):
    iban: str = "FR7628233000011130178183593"
    bic: str = "REVOFRP2"
    account_holder: str = "CREATIVINDUSTRY FRANCE"
    bank_name: str = "Revolut"
    deposit_percentage: int = 30


# ==================== APPOINTMENT MODELS ====================

APPOINTMENT_TYPES = [
    {"id": "contract_sign", "label": "Signature de contrat"},
    {"id": "contract_discuss", "label": "Discussion de contrat"},
    {"id": "billing", "label": "Probleme de facturation"},
    {"id": "project", "label": "Discussion de projet"},
    {"id": "other", "label": "Autre"}
]

APPOINTMENT_DURATIONS = [
    {"id": "30", "label": "30 minutes"},
    {"id": "60", "label": "1 heure"},
    {"id": "90", "label": "1 heure 30"}
]

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    appointment_type: str
    appointment_type_label: str = ""
    duration: str
    proposed_date: str
    proposed_time: str
    message: Optional[str] = None
    status: str = "pending"
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None
    confirmation_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class AppointmentCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    appointment_type: str
    duration: str
    proposed_date: str
    proposed_time: str
    message: Optional[str] = None

class AppointmentAdminUpdate(BaseModel):
    status: str
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None


# ==================== CONTACT MODELS ====================

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str


# ==================== WEDDING QUOTE MODELS ====================

class WeddingOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    is_active: bool = True

class WeddingOptionCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str

class WeddingOptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class WeddingQuote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]
    options_details: List[dict] = []
    total_price: float = 0
    message: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeddingQuoteCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]
    message: Optional[str] = None


# ==================== PORTFOLIO MODELS ====================

class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    media_type: str
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str
    client_name: Optional[str] = None
    cover_photo: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True
    story_duration: Optional[int] = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str
    client_name: Optional[str] = None
    cover_photo: Optional[str] = None
    is_featured: bool = False
    story_duration: Optional[int] = 3

class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    client_name: Optional[str] = None
    cover_photo: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    story_duration: Optional[int] = None


# ==================== STORY VIEWS MODELS ====================

class StoryView(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    story_id: str
    viewer_type: str
    viewer_id: Optional[str] = None
    viewer_name: Optional[str] = None
    viewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_hash: Optional[str] = None

class StoryViewStats(BaseModel):
    total_views: int
    unique_views: int
    client_views: List[dict]
    anonymous_views: int


# ==================== SITE CONTENT MODELS ====================

class SiteContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "main"
    hero_title: str = "Creons vos moments d'exception"
    hero_subtitle: str = "Studio de production creative pour mariages, podcasts et productions televisees."
    hero_image: str = "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?w=1920"
    wedding_title: str = "Mariages"
    wedding_subtitle: str = "Immortalisez votre amour"
    wedding_description: str = "Photographie et videographie cinematique pour immortaliser votre jour le plus precieux."
    wedding_image: str = "https://images.unsplash.com/photo-1644951565774-1b0904943820?w=800"
    podcast_title: str = "Studio Podcast"
    podcast_subtitle: str = "Votre voix, notre expertise"
    podcast_description: str = "Studio d'enregistrement professionnel equipe pour vos podcasts et interviews."
    podcast_image: str = "https://images.unsplash.com/photo-1659083725992-9d88c12e719c?w=800"
    tv_title: str = "Plateau TV"
    tv_subtitle: str = "Production professionnelle"
    tv_description: str = "Plateaux de tournage equipes pour vos productions televisees et corporate."
    tv_image: str = "https://images.unsplash.com/photo-1643651342963-d4478284de5d?w=800"
    phone: str = "+33 1 23 45 67 89"
    email: str = "contact@creativindustry.fr"
    address: str = "123 Rue de la Creation, 75001 Paris, France"
    hours: str = "Lun - Ven: 9h - 19h, Sam: Sur rendez-vous"
    instagram: str = ""
    facebook: str = ""
    youtube: str = ""
    cta_title: str = "Pret a creer quelque chose d'extraordinaire ?"
    cta_subtitle: str = "Contactez-nous pour discuter de votre projet et obtenir un devis personnalise."

class SiteContentUpdate(BaseModel):
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    wedding_title: Optional[str] = None
    wedding_subtitle: Optional[str] = None
    wedding_description: Optional[str] = None
    wedding_image: Optional[str] = None
    podcast_title: Optional[str] = None
    podcast_subtitle: Optional[str] = None
    podcast_description: Optional[str] = None
    podcast_image: Optional[str] = None
    tv_title: Optional[str] = None
    tv_subtitle: Optional[str] = None
    tv_description: Optional[str] = None
    tv_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None


# ==================== CLIENT MODELS ====================

class ClientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    newsletter_subscribed: Optional[bool] = True
    must_change_password: Optional[bool] = False
    devis_id: Optional[str] = None
    expires_at: Optional[str] = None
    extension_requested: Optional[bool] = False
    extension_paid: Optional[bool] = False

class ExtensionRequest(BaseModel):
    payment_method: str

class ClientFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str
    file_url: str
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientFileCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str
    file_url: str
    thumbnail_url: Optional[str] = None


# ==================== INTEGRATION MODELS ====================

class IntegrationCreateClient(BaseModel):
    email: str
    name: str
    phone: Optional[str] = None
    devis_id: str
    devis_data: dict
    event_date: Optional[str] = None
    event_type: Optional[str] = None
    total_amount: float
    api_key: str

class IntegrationSyncDevis(BaseModel):
    client_email: str
    devis_id: str
    devis_data: dict
    status: str
    total_amount: float
    api_key: str

class IntegrationSyncInvoice(BaseModel):
    client_email: str
    devis_id: str
    invoice_id: str
    invoice_number: str
    invoice_date: str
    amount: float
    pdf_url: Optional[str] = None
    pdf_data: Optional[str] = None
    api_key: str

class IntegrationSyncPayment(BaseModel):
    client_email: str
    devis_id: str
    payment_id: str
    amount: float
    payment_date: str
    payment_method: Optional[str] = None
    api_key: str


# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatMessageCreate(BaseModel):
    client_id: str
    content: str
    file_url: Optional[str] = None
    file_type: Optional[str] = None


# ==================== GALLERY MODELS ====================

class GalleryPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    thumbnail_url: Optional[str] = None
    filename: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Gallery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    description: Optional[str] = None
    photos: List[dict] = []
    music_url: Optional[str] = None  # URL de musique pour le diaporama
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class GalleryCreate(BaseModel):
    client_id: str
    name: str
    description: Optional[str] = None
    music_url: Optional[str] = None

class PhotoSelection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    gallery_id: str
    selected_photo_ids: List[str] = []
    is_validated: bool = False
    validated_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SelectionUpdate(BaseModel):
    selected_photo_ids: List[str]


# ==================== NEWSLETTER MODELS ====================

class ManualNewsletterRequest(BaseModel):
    subject: str
    content: str
    send_to_all: bool = True


# ==================== DEPLOYMENT MODELS ====================

class RollbackRequest(BaseModel):
    commit_hash: str
    reason: Optional[str] = None



# ==================== TASK MANAGEMENT MODELS ====================

class TeamUser(BaseModel):
    """Team members who can access and manage tasks"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password: str
    name: str
    role: str = "reader"  # admin, editor, reader
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None

class TeamUserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "reader"

class TeamUserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class TeamUserLogin(BaseModel):
    email: EmailStr
    password: str

class TeamUserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    is_active: bool


class TaskReminder(BaseModel):
    """Reminder settings for a task"""
    enabled: bool = True
    days_before: int = 1  # -1 = day after, 0 = day of, 1 = day before
    email_sent: bool = False
    last_sent_at: Optional[datetime] = None

class Task(BaseModel):
    """Task model for internal team management"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    due_date: str  # ISO date string
    priority: str = "medium"  # high, medium, low
    status: str = "pending"  # pending, in_progress, completed
    client_id: Optional[str] = None  # Link to a client if relevant
    client_name: Optional[str] = None
    assigned_to: List[str] = []  # List of admin IDs
    assigned_names: List[str] = []  # List of assigned names for display
    created_by: str  # admin ID
    created_by_name: str = ""
    # Reminder settings
    reminders: List[dict] = []  # [{"days_before": 1, "enabled": True, "sent": False}]
    # Progress comment from assignee
    progress_comment: Optional[str] = None  # e.g., "80% done", "Blocked on X"
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str
    priority: str = "medium"
    client_id: Optional[str] = None
    assigned_to: List[str] = []
    reminders: List[dict] = []  # [{"days_before": 1, "enabled": True}]

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    client_id: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    reminders: Optional[List[dict]] = None
    progress_comment: Optional[str] = None
