"""
PDF generation services
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from io import BytesIO
from datetime import datetime


def generate_quote_pdf(quote_data: dict, options_details: list) -> bytes:
    """Generate a PDF quote document"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#1a1a2e'), alignment=TA_CENTER)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#333333'))
    
    elements = []
    
    # Header
    elements.append(Paragraph("CREATIVINDUSTRY", title_style))
    elements.append(Paragraph("Devis Personnalise", ParagraphStyle('Subtitle', parent=styles['Heading2'], alignment=TA_CENTER, textColor=colors.HexColor('#d4a574'))))
    elements.append(Spacer(1, 1*cm))
    
    # Client Info
    elements.append(Paragraph(f"<b>Client:</b> {quote_data.get('client_name', '')}", normal_style))
    elements.append(Paragraph(f"<b>Email:</b> {quote_data.get('client_email', '')}", normal_style))
    elements.append(Paragraph(f"<b>Telephone:</b> {quote_data.get('client_phone', '')}", normal_style))
    elements.append(Paragraph(f"<b>Date evenement:</b> {quote_data.get('event_date', '')}", normal_style))
    if quote_data.get('event_location'):
        elements.append(Paragraph(f"<b>Lieu:</b> {quote_data.get('event_location')}", normal_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Options table
    if options_details:
        table_data = [['Option', 'Prix']]
        for opt in options_details:
            table_data.append([opt.get('name', ''), f"{opt.get('price', 0):.2f} EUR"])
        
        table = Table(table_data, colWidths=[12*cm, 4*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dddddd')),
        ]))
        elements.append(table)
    
    elements.append(Spacer(1, 0.5*cm))
    
    # Total
    total_style = ParagraphStyle('Total', parent=styles['Heading2'], alignment=TA_RIGHT, textColor=colors.HexColor('#d4a574'))
    elements.append(Paragraph(f"<b>TOTAL: {quote_data.get('total_price', 0):.2f} EUR</b>", total_style))
    
    # Footer
    elements.append(Spacer(1, 2*cm))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray, alignment=TA_CENTER)
    elements.append(Paragraph("CREATIVINDUSTRY France - SASU au capital de 101 EUR", footer_style))
    elements.append(Paragraph("RCS Paris 100 871 425 - SIRET: 100 871 425", footer_style))
    elements.append(Paragraph("TVA intracommunautaire: FR7501100871425", footer_style))
    elements.append(Paragraph("Siege social: 60 rue Francois 1er, 75008 Paris", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_devis_pdf(devis_data: dict, company_info: dict = None) -> bytes:
    """Generate a PDF for a devis from the devis site integration"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1a1a2e'), alignment=TA_CENTER)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10)
    
    elements = []
    
    # Header
    elements.append(Paragraph("CREATIVINDUSTRY FRANCE", title_style))
    elements.append(Paragraph("DEVIS", ParagraphStyle('Subtitle', parent=styles['Heading2'], alignment=TA_CENTER, textColor=colors.HexColor('#d4a574'))))
    elements.append(Spacer(1, 0.5*cm))
    
    # Company info
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=8, textColor=colors.gray)
    elements.append(Paragraph("SASU au capital de 101 EUR - RCS Paris 100 871 425", company_style))
    elements.append(Paragraph("SIRET: 100 871 425 - TVA: FR7501100871425", company_style))
    elements.append(Paragraph("Siege social: 60 rue Francois 1er, 75008 Paris", company_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Devis info
    elements.append(Paragraph(f"<b>Devis N:</b> {devis_data.get('quote_number', 'N/A')}", normal_style))
    elements.append(Paragraph(f"<b>Date:</b> {devis_data.get('emission_date', datetime.now().strftime('%d/%m/%Y'))}", normal_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Client info
    elements.append(Paragraph(f"<b>Client:</b> {devis_data.get('client_name', '')}", normal_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Items table
    items = devis_data.get('items', [])
    if items:
        table_data = [['Description', 'Qte', 'Prix HT', 'TVA', 'Total HT']]
        for item in items:
            table_data.append([
                item.get('service_name', ''),
                str(item.get('quantity', 1)),
                f"{item.get('price_ht', 0):.2f} EUR",
                f"{item.get('tva_rate', 20)}%",
                f"{item.get('quantity', 1) * item.get('price_ht', 0):.2f} EUR"
            ])
        
        table = Table(table_data, colWidths=[8*cm, 2*cm, 3*cm, 2*cm, 3*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a1a2e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f9f9f9')),
        ]))
        elements.append(table)
    
    elements.append(Spacer(1, 0.5*cm))
    
    # Totals
    total_ht = devis_data.get('total_ht', 0)
    total_tva = devis_data.get('total_tva', 0)
    total_ttc = devis_data.get('total_ttc', 0)
    
    right_style = ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)
    elements.append(Paragraph(f"<b>Total HT:</b> {total_ht:.2f} EUR", right_style))
    elements.append(Paragraph(f"<b>TVA (20%):</b> {total_tva:.2f} EUR", right_style))
    elements.append(Paragraph(f"<b>Total TTC:</b> {total_ttc:.2f} EUR", ParagraphStyle('TotalTTC', parent=right_style, fontSize=14, textColor=colors.HexColor('#d4a574'))))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


def generate_invoice_pdf(invoice_data: dict, company_info: dict = None) -> bytes:
    """Generate a PDF for an invoice"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1a1a2e'), alignment=TA_CENTER)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=10)
    
    elements = []
    
    # Header
    elements.append(Paragraph("CREATIVINDUSTRY FRANCE", title_style))
    elements.append(Paragraph("FACTURE", ParagraphStyle('Subtitle', parent=styles['Heading2'], alignment=TA_CENTER, textColor=colors.HexColor('#d4a574'))))
    elements.append(Spacer(1, 0.5*cm))
    
    # Company info
    company_style = ParagraphStyle('Company', parent=styles['Normal'], fontSize=8, textColor=colors.gray)
    elements.append(Paragraph("SASU au capital de 101 EUR - RCS Paris 100 871 425", company_style))
    elements.append(Paragraph("SIRET: 100 871 425 - TVA: FR7501100871425", company_style))
    elements.append(Paragraph("Siege social: 60 rue Francois 1er, 75008 Paris", company_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Invoice info
    elements.append(Paragraph(f"<b>Facture N:</b> {invoice_data.get('invoice_number', 'N/A')}", normal_style))
    elements.append(Paragraph(f"<b>Date:</b> {invoice_data.get('invoice_date', datetime.now().strftime('%d/%m/%Y'))}", normal_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Amount
    amount = invoice_data.get('amount', 0)
    amount_ht = amount / 1.20
    tva = amount - amount_ht
    
    right_style = ParagraphStyle('Right', parent=normal_style, alignment=TA_RIGHT)
    elements.append(Paragraph(f"<b>Montant HT:</b> {amount_ht:.2f} EUR", right_style))
    elements.append(Paragraph(f"<b>TVA (20%):</b> {tva:.2f} EUR", right_style))
    elements.append(Paragraph(f"<b>Total TTC:</b> {amount:.2f} EUR", ParagraphStyle('TotalTTC', parent=right_style, fontSize=14, textColor=colors.HexColor('#d4a574'))))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
