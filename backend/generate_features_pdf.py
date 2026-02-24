from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime

# Create PDF
doc = SimpleDocTemplate(
    "/app/backend/uploads/CREATIVINDUSTRY_Fonctionnalites.pdf",
    pagesize=A4,
    rightMargin=2*cm,
    leftMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2*cm
)

# Styles
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=24,
    textColor=colors.HexColor('#D4AF37'),
    spaceAfter=20,
    alignment=TA_CENTER
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Heading2'],
    fontSize=14,
    textColor=colors.HexColor('#666666'),
    spaceAfter=30,
    alignment=TA_CENTER
)

section_style = ParagraphStyle(
    'SectionTitle',
    parent=styles['Heading2'],
    fontSize=16,
    textColor=colors.HexColor('#1a1a1a'),
    spaceBefore=20,
    spaceAfter=10,
    borderColor=colors.HexColor('#D4AF37'),
    borderWidth=2,
    borderPadding=5
)

subsection_style = ParagraphStyle(
    'SubsectionTitle',
    parent=styles['Heading3'],
    fontSize=12,
    textColor=colors.HexColor('#333333'),
    spaceBefore=15,
    spaceAfter=8
)

item_style = ParagraphStyle(
    'ItemStyle',
    parent=styles['Normal'],
    fontSize=10,
    textColor=colors.HexColor('#444444'),
    leftIndent=20,
    spaceBefore=3,
    spaceAfter=3
)

# Build content
content = []

# Title
content.append(Paragraph("CREATIVINDUSTRY", title_style))
content.append(Paragraph("Récapitulatif Complet des Fonctionnalités", subtitle_style))
content.append(Paragraph(f"Document généré le {datetime.now().strftime('%d/%m/%Y')}", styles['Normal']))
content.append(Spacer(1, 30))

# ========== SITE CREATIVINDUSTRY ==========
content.append(Paragraph("🎬 SITE CREATIVINDUSTRY.COM", section_style))
content.append(Spacer(1, 10))

# Authentification & Sécurité
content.append(Paragraph("🔐 Authentification & Sécurité", subsection_style))
auth_items = [
    "✅ Connexion Admin avec email/mot de passe",
    "✅ Authentification MFA (2FA) pour admin",
    "✅ Connexion Client avec email/mot de passe",
    "✅ Réinitialisation de mot de passe par email",
    "✅ Forcer changement de mot de passe à la première connexion",
    "✅ Gestion des sessions et tokens JWT"
]
for item in auth_items:
    content.append(Paragraph(item, item_style))

# Gestion des Clients
content.append(Paragraph("👥 Gestion des Clients", subsection_style))
client_items = [
    "✅ Création de comptes clients par l'admin",
    "✅ Envoi automatique des identifiants par email",
    "✅ Liste des clients avec statut (en ligne/hors ligne)",
    "✅ Archivage des clients",
    "✅ Suppression des clients (avec tous leurs fichiers)",
    "✅ Expiration de compte personnalisée (délai configurable par client)",
    "✅ Blocage automatique des comptes expirés",
    "✅ Nettoyage automatique des comptes expirés"
]
for item in client_items:
    content.append(Paragraph(item, item_style))

# Système de Paiement PayPal
content.append(Paragraph("💳 Système de Paiement PayPal", subsection_style))
paypal_items = [
    "✅ Intégration API PayPal complète",
    "✅ Activation automatique après paiement (sans validation admin)",
    "✅ TVA 20% sur tous les paiements",
    "✅ Renouvellement 1 semaine : 24€ TTC (20€ HT + 4€ TVA)",
    "✅ Renouvellement 6 mois : 108€ TTC (90€ HT + 18€ TVA)",
    "✅ Extension de compte : 24€ TTC pour 2 mois",
    "✅ Paiement des devis/factures via PayPal",
    "✅ Génération automatique de factures après paiement",
    "✅ Email de confirmation client + notification admin"
]
for item in paypal_items:
    content.append(Paragraph(item, item_style))

# Facturation
content.append(Paragraph("🧾 Facturation", subsection_style))
billing_items = [
    "✅ Onglet Admin 'Facturation' avec tableau de bord",
    "✅ Chiffre d'affaires total, nombre de factures, panier moyen",
    "✅ Historique des factures (N° facture, client, forfait, HT, TVA, TTC)",
    "✅ Factures de renouvellement dans l'espace client"
]
for item in billing_items:
    content.append(Paragraph(item, item_style))

# Galeries Photo
content.append(Paragraph("📸 Galeries Photo", subsection_style))
gallery_items = [
    "✅ Création de galeries pour chaque client",
    "✅ Upload de photos (glisser-déposer)",
    "✅ Organisation par dossiers",
    "✅ Sélection de photos par le client (favoris)",
    "✅ Téléchargement des photos (individuellement ou ZIP)",
    "✅ Visualisation plein écran"
]
for item in gallery_items:
    content.append(Paragraph(item, item_style))

# Page Break
content.append(PageBreak())

# Gestion de Fichiers
content.append(Paragraph("📁 Gestion de Fichiers", subsection_style))
files_items = [
    "✅ Documents admin uploadés pour chaque client",
    "✅ Devis PDF",
    "✅ Factures PDF",
    "✅ Contrats",
    "✅ Autres documents"
]
for item in files_items:
    content.append(Paragraph(item, item_style))

# Suivi de Projet
content.append(Paragraph("📦 Suivi de Projet", subsection_style))
project_items = [
    "✅ Création d'étapes de projet personnalisées",
    "✅ Statuts : À venir, En cours, Terminé",
    "✅ Notifications par email lors des changements de statut",
    "✅ Barre de progression visuelle (max 100%)",
    "✅ Visible côté client"
]
for item in project_items:
    content.append(Paragraph(item, item_style))

# Gestion des Tâches
content.append(Paragraph("📋 Gestion des Tâches", subsection_style))
tasks_items = [
    "✅ Création de tâches par projet/client",
    "✅ Assignation de tâches",
    "✅ Priorités",
    "✅ Dates d'échéance",
    "✅ Commentaires sur les tâches",
    "✅ Statuts personnalisables"
]
for item in tasks_items:
    content.append(Paragraph(item, item_style))

# Calendrier
content.append(Paragraph("📅 Calendrier", subsection_style))
calendar_items = [
    "✅ Vue calendrier des événements",
    "✅ Rendez-vous avec clients",
    "✅ Rappels"
]
for item in calendar_items:
    content.append(Paragraph(item, item_style))

# Système d'Email
content.append(Paragraph("📧 Système d'Email", subsection_style))
email_items = [
    "✅ Emails automatiques (création compte, changement statut, paiement...)",
    "✅ Templates HTML personnalisés",
    "✅ Configuration SMTP IONOS"
]
for item in email_items:
    content.append(Paragraph(item, item_style))

# Page Actualités
content.append(Paragraph("📰 Page Actualités (style Instagram)", subsection_style))
news_items = [
    "✅ Publications avec images/vidéos",
    "✅ Légendes et localisation",
    "✅ Système de likes",
    "✅ Commentaires (clients = instant, visiteurs = modération)",
    "✅ Gestion depuis l'admin"
]
for item in news_items:
    content.append(Paragraph(item, item_style))

# Système de Témoignages
content.append(Paragraph("⭐ Système de Témoignages", subsection_style))
testimonials_items = [
    "✅ Page publique des témoignages",
    "✅ Soumission réservée aux clients connectés",
    "✅ Note (étoiles)",
    "✅ Modération par admin (approuver/rejeter)",
    "✅ Affichage public après validation"
]
for item in testimonials_items:
    content.append(Paragraph(item, item_style))

# Popup d'Accueil
content.append(Paragraph("🎬 Popup d'Accueil", subsection_style))
popup_items = [
    "✅ Popup modal à l'ouverture du site",
    "✅ Titre personnalisable",
    "✅ Vidéo téléversée depuis l'admin",
    "✅ Activation/désactivation depuis l'admin"
]
for item in popup_items:
    content.append(Paragraph(item, item_style))

# Page Break
content.append(PageBreak())

# Contenu du Site
content.append(Paragraph("🌐 Contenu du Site", subsection_style))
content_items = [
    "✅ Gestion du contenu de la page d'accueil",
    "✅ Titre hero",
    "✅ Description",
    "✅ Sections personnalisables"
]
for item in content_items:
    content.append(Paragraph(item, item_style))

# Portfolio
content.append(Paragraph("📷 Portfolio", subsection_style))
portfolio_items = [
    "✅ Galerie de photos du portfolio",
    "✅ Galerie de vidéos",
    "✅ Stories Instagram-like",
    "✅ Gestion depuis l'admin"
]
for item in portfolio_items:
    content.append(Paragraph(item, item_style))

# Devis Mariage
content.append(Paragraph("💒 Devis Mariage", subsection_style))
wedding_items = [
    "✅ Formulaire de demande de devis",
    "✅ Options de mariage personnalisables",
    "✅ Services configurables",
    "✅ Génération PDF"
]
for item in wedding_items:
    content.append(Paragraph(item, item_style))

# Système de Réservation
content.append(Paragraph("📅 Système de Réservation", subsection_style))
booking_items = [
    "✅ Calendrier de disponibilité",
    "✅ Réservation en ligne",
    "✅ Confirmation par email"
]
for item in booking_items:
    content.append(Paragraph(item, item_style))

# Chat d'Équipe
content.append(Paragraph("💬 Chat d'Équipe", subsection_style))
chat_items = [
    "✅ Chat interne entre admins",
    "✅ Messages en temps réel",
    "✅ Historique des conversations"
]
for item in chat_items:
    content.append(Paragraph(item, item_style))

# Newsletter
content.append(Paragraph("📧 Newsletter", subsection_style))
newsletter_items = [
    "✅ Inscription à la newsletter",
    "✅ Envoi de newsletters aux abonnés",
    "✅ Gestion des abonnés",
    "✅ Désinscription"
]
for item in newsletter_items:
    content.append(Paragraph(item, item_style))

# Transferts de Fichiers
content.append(Paragraph("📤 Transferts de Fichiers (Client)", subsection_style))
transfer_items = [
    "✅ Upload de musique par le client",
    "✅ Upload de documents par le client",
    "✅ Upload de photos par le client",
    "✅ Barre de progression",
    "✅ Support gros fichiers (jusqu'à 5 Go)"
]
for item in transfer_items:
    content.append(Paragraph(item, item_style))

# Paramètres Admin
content.append(Paragraph("⚙️ Paramètres Admin", subsection_style))
settings_items = [
    "✅ Gestion des administrateurs secondaires",
    "✅ Permissions par onglet",
    "✅ Coordonnées bancaires (IBAN, BIC)",
    "✅ Configuration du site"
]
for item in settings_items:
    content.append(Paragraph(item, item_style))

# Sécurité Admin
content.append(Paragraph("🔐 Sécurité Admin", subsection_style))
security_items = [
    "✅ Onglet sécurité",
    "✅ Gestion MFA",
    "✅ Logs de connexion"
]
for item in security_items:
    content.append(Paragraph(item, item_style))

# Page Break
content.append(PageBreak())

# ========== SITE DEVIS ==========
content.append(Paragraph("📊 SITE DEVIS", section_style))
content.append(Spacer(1, 10))

# Gestion des Devis
content.append(Paragraph("📝 Gestion des Devis", subsection_style))
devis_items = [
    "✅ Création de devis personnalisés",
    "✅ Catégories : Mariage, Podcast, Plateau TV",
    "✅ Services avec prix",
    "✅ Options supplémentaires",
    "✅ Calcul automatique du total",
    "✅ TVA 20%",
    "✅ Génération PDF"
]
for item in devis_items:
    content.append(Paragraph(item, item_style))

# Gestion des Factures
content.append(Paragraph("🧾 Gestion des Factures", subsection_style))
invoices_items = [
    "✅ Conversion devis → facture",
    "✅ Numérotation automatique",
    "✅ Génération PDF avec détail TVA"
]
for item in invoices_items:
    content.append(Paragraph(item, item_style))

# Gestion des Paiements
content.append(Paragraph("💰 Gestion des Paiements", subsection_style))
payments_items = [
    "✅ Enregistrement des paiements (acompte, solde)",
    "✅ Suivi des paiements par client",
    "✅ Historique des paiements"
]
for item in payments_items:
    content.append(Paragraph(item, item_style))

# Tableau de Bord
content.append(Paragraph("📊 Tableau de Bord", subsection_style))
dashboard_items = [
    "✅ Statistiques de revenus",
    "✅ Nombre de devis",
    "✅ Nombre de factures",
    "✅ Graphiques"
]
for item in dashboard_items:
    content.append(Paragraph(item, item_style))

# Synchronisation
content.append(Paragraph("🔄 Synchronisation avec CreativIndustry", subsection_style))
sync_items = [
    "✅ Synchronisation des clients entre les deux sites",
    "✅ Synchronisation des devis"
]
for item in sync_items:
    content.append(Paragraph(item, item_style))

# Page Break
content.append(PageBreak())

# ========== ESPACE CLIENT ==========
content.append(Paragraph("📱 ESPACE CLIENT", section_style))
content.append(Spacer(1, 10))

client_space_items = [
    "✅ Connexion sécurisée",
    "✅ Vue 'Mon Projet' avec progression",
    "✅ Accès aux galeries photos",
    "✅ Téléchargement de photos (individuelles ou ZIP)",
    "✅ Sélection de favoris",
    "✅ Mes Devis",
    "✅ Mes Factures (projet + renouvellement)",
    "✅ Mes Paiements",
    "✅ Transfert de fichiers (musique, documents, photos)",
    "✅ Documents de l'admin",
    "✅ Paramètres du compte",
    "✅ Alerte d'expiration avec option de prolongation",
    "✅ Paiement PayPal direct pour factures"
]
for item in client_space_items:
    content.append(Paragraph(item, item_style))

# ========== INTÉGRATIONS ==========
content.append(Spacer(1, 20))
content.append(Paragraph("🔗 INTÉGRATIONS", section_style))
content.append(Spacer(1, 10))

# Table for integrations
integrations_data = [
    ['Service', 'Utilisation'],
    ['PayPal API', 'Paiements avec activation automatique'],
    ['IONOS SMTP', "Envoi d'emails"],
    ['MongoDB', 'Base de données'],
    ['openpyxl', 'Export Excel']
]

integrations_table = Table(integrations_data, colWidths=[5*cm, 10*cm])
integrations_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D4AF37')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 11),
    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
    ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
    ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#333333')),
    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 1), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dddddd')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 1), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
]))
content.append(integrations_table)

# Footer
content.append(Spacer(1, 40))
footer_style = ParagraphStyle(
    'Footer',
    parent=styles['Normal'],
    fontSize=9,
    textColor=colors.HexColor('#888888'),
    alignment=TA_CENTER
)
content.append(Paragraph("─" * 60, footer_style))
content.append(Paragraph("CREATIVINDUSTRY - L'Industrie Créative", footer_style))
content.append(Paragraph(f"Document généré automatiquement le {datetime.now().strftime('%d/%m/%Y à %H:%M')}", footer_style))

# Build PDF
doc.build(content)
print("PDF créé avec succès !")
