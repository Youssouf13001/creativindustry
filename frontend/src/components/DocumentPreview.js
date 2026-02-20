import { Download, FileDown } from "lucide-react";

/**
 * DevisPreview - Displays a devis exactly like the devis site preview
 */
export const DevisPreview = ({ devis, onDownload }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value || 0) + ' €';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Parse data
  const data = devis.devis_data || {};
  const items = data.items || [];
  const quoteNumber = data.quote_number || devis.devis_id?.slice(-8) || 'N/A';
  
  // Calculate totals
  const totalHT = data.total_ht || devis.total_amount / 1.20 || 0;
  const totalTVA = data.total_tva || totalHT * 0.20 || 0;
  const totalTTC = data.total_ttc || devis.total_amount || 0;

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Document Content */}
        <div className="p-8 text-gray-800" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            {/* Logo */}
            <div>
              <h1 className="text-2xl font-light tracking-wider">
                <span className="text-amber-600">CREATIVINDUSTRY</span>
                <span className="text-gray-600 italic ml-2">France</span>
              </h1>
            </div>
            
            {/* Company Info */}
            <div className="text-right text-sm border-l-4 border-gray-300 pl-4">
              <p className="text-gray-400 text-xs mb-1">Émetteur ou Émettrice</p>
              <p className="font-semibold">CREATIVINDUSTRY France</p>
              <p>SASU au capital de 101 €</p>
              <p>RCS Paris 100 871 425</p>
              <p>SIRET : 100 871 425</p>
              <p>TVA intracommunautaire : FR7501100871425</p>
              <p>Siège social : 60 rue François 1er, 75008</p>
              <p>Paris</p>
              <p>CONTACT@CREATIVINDUSTRY.COM</p>
              <p>0749208922</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Devis</h2>
            <div className="grid grid-cols-2 gap-4 text-sm max-w-md">
              <div>
                <span className="font-semibold">Numéro</span>
              </div>
              <div>{quoteNumber}</div>
              <div>
                <span className="font-semibold">Date d'émission</span>
              </div>
              <div>{formatDate(data.emission_date || devis.created_at)}</div>
              <div>
                <span className="font-semibold">Date d'expiration</span>
              </div>
              <div>{formatDate(data.validity_date)}</div>
              <div>
                <span className="font-semibold">Type de vente</span>
              </div>
              <div>Prestations de services</div>
            </div>
          </div>

          {/* Items Table */}
          {items.length > 0 && (
            <div className="mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-300 font-semibold">Désignation</th>
                    <th className="text-center p-2 border border-gray-300 font-semibold w-16">Qté</th>
                    <th className="text-right p-2 border border-gray-300 font-semibold w-24">Prix u. HT</th>
                    <th className="text-center p-2 border border-gray-300 font-semibold w-16">TVA</th>
                    <th className="text-right p-2 border border-gray-300 font-semibold w-24">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-gray-300">{item.service_name || item.designation}</td>
                      <td className="p-2 border border-gray-300 text-center">{item.quantity || 1}</td>
                      <td className="p-2 border border-gray-300 text-right">{formatCurrency(item.price_ht || item.unit_price)}</td>
                      <td className="p-2 border border-gray-300 text-center">{item.tva_rate || 20}%</td>
                      <td className="p-2 border border-gray-300 text-right">
                        {formatCurrency((item.quantity || 1) * (item.price_ht || item.unit_price || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TVA Details & Summary Grid */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* TVA Details */}
            <div>
              <h3 className="font-semibold mb-2">Détails TVA</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-300">Taux</th>
                    <th className="text-right p-2 border border-gray-300">Montant TVA</th>
                    <th className="text-right p-2 border border-gray-300">Base HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-300">20%</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(totalTVA)}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(totalHT)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Récapitulatif */}
            <div>
              <h3 className="font-semibold mb-2">Récapitulatif</h3>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-300">Total HT avant remise</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(totalHT)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300">Remise</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">0,00 €</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300">Total HT</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(totalHT)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300">Total TVA</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(totalTVA)}</td>
                  </tr>
                  <tr className="bg-gray-800 text-white">
                    <td className="p-2 border border-gray-300 font-semibold">Total TTC</td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-bold text-amber-400">{formatCurrency(totalTTC)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Info */}
          <div className="border border-gray-300 p-4 mb-6">
            <h3 className="font-semibold mb-3">Paiement</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-semibold">Établissement</div>
              <div>QONTO</div>
              <div className="font-semibold">IBAN</div>
              <div className="font-mono">FR76 1695 8000 0197 5903 5666 489</div>
              <div className="font-semibold">BIC</div>
              <div className="font-mono">QNTOFRP1XXX</div>
            </div>
          </div>

          {/* Legal Footer */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Pénalités de retard : trois fois le taux annuel d'intérêt légal en vigueur calculé depuis la date d'exigibilité du prix jusqu'à complet paiement du prix.</p>
            <p>Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 €</p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={() => onDownload(devis)}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Download size={18} />
        Télécharger le PDF
      </button>
    </div>
  );
};

/**
 * InvoicePreview - Displays an invoice exactly like the devis site preview
 */
export const InvoicePreview = ({ invoice, payments = [], onDownload }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value || 0) + ' €';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Calculate amounts
  const amount = invoice.amount || 0;
  const amountHT = amount / 1.20;
  const tva = amount - amountHT;
  
  // Payments for this invoice
  const invoicePayments = payments.filter(p => p.invoice_id === invoice.invoice_id || p.devis_id === invoice.devis_id);
  const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = amount - totalPaid;

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Document Content */}
        <div className="p-8 text-gray-800" style={{ fontFamily: 'Arial, sans-serif' }}>
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            {/* Logo */}
            <div>
              <h1 className="text-2xl font-light tracking-wider">
                <span className="text-amber-600">CREATIVINDUSTRY</span>
                <span className="text-gray-600 italic ml-2">France</span>
              </h1>
            </div>
            
            {/* Company Info */}
            <div className="text-right text-sm border-l-4 border-gray-300 pl-4">
              <p className="text-gray-400 text-xs mb-1">Émetteur ou Émettrice</p>
              <p className="font-semibold">CREATIVINDUSTRY France</p>
              <p>SASU au capital de 101 €</p>
              <p>RCS Paris 100 871 425</p>
              <p>SIRET : 100 871 425</p>
              <p>TVA intracommunautaire : FR7501100871425</p>
              <p>Siège social : 60 rue François 1er, 75008</p>
              <p>Paris</p>
              <p>CONTACT@CREATIVINDUSTRY.COM</p>
              <p>0749208922</p>
            </div>
          </div>

          {/* Document Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Facture</h2>
            <div className="grid grid-cols-2 gap-4 text-sm max-w-md">
              <div>
                <span className="font-semibold">Numéro</span>
              </div>
              <div>{invoice.invoice_number || 'N/A'}</div>
              <div>
                <span className="font-semibold">Date d'émission</span>
              </div>
              <div>{formatDate(invoice.invoice_date)}</div>
              <div>
                <span className="font-semibold">Date d'échéance</span>
              </div>
              <div>{formatDate(invoice.due_date)}</div>
              <div>
                <span className="font-semibold">Devis d'origine</span>
              </div>
              <div>{invoice.devis_id?.slice(-8) || 'N/A'}</div>
            </div>
          </div>

          {/* TVA Details & Summary Grid */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* TVA Details */}
            <div>
              <h3 className="font-semibold mb-2">Détails TVA</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-300">Taux</th>
                    <th className="text-right p-2 border border-gray-300">Montant TVA</th>
                    <th className="text-right p-2 border border-gray-300">Base HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-300">20%</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(tva)}</td>
                    <td className="p-2 border border-gray-300 text-right">{formatCurrency(amountHT)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Récapitulatif */}
            <div>
              <h3 className="font-semibold mb-2">Récapitulatif</h3>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-300">Total HT</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(amountHT)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-300">Total TVA</td>
                    <td className="p-2 border border-gray-300 text-right font-mono">{formatCurrency(tva)}</td>
                  </tr>
                  <tr className="bg-gray-800 text-white">
                    <td className="p-2 border border-gray-300 font-semibold">Total TTC</td>
                    <td className="p-2 border border-gray-300 text-right font-mono font-bold text-amber-400">{formatCurrency(amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments Section */}
          {invoicePayments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2 text-green-700">Règlements</h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="text-left p-2 border border-gray-300">Date</th>
                    <th className="text-left p-2 border border-gray-300">Mode</th>
                    <th className="text-right p-2 border border-gray-300">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {invoicePayments.map((payment, idx) => (
                    <tr key={idx} className="bg-green-50">
                      <td className="p-2 border border-gray-300">{formatDate(payment.payment_date)}</td>
                      <td className="p-2 border border-gray-300">{payment.payment_method || 'Virement'}</td>
                      <td className="p-2 border border-gray-300 text-right text-green-700 font-semibold">{formatCurrency(payment.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Remaining Amount */}
          <div className={`p-4 rounded mb-6 ${remaining > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Acompte(s) reçu(s)</p>
                <p className="text-lg font-mono">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">RESTE À PAYER</p>
                <p className={`text-2xl font-bold font-mono ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {formatCurrency(remaining)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {remaining > 0 && (
            <div className="border border-gray-300 p-4 mb-6">
              <h3 className="font-semibold mb-3">Paiement</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-semibold">Établissement</div>
                <div>QONTO</div>
                <div className="font-semibold">IBAN</div>
                <div className="font-mono">FR76 1695 8000 0197 5903 5666 489</div>
                <div className="font-semibold">BIC</div>
                <div className="font-mono">QNTOFRP1XXX</div>
              </div>
            </div>
          )}

          {/* Legal Footer */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Pénalités de retard : trois fois le taux annuel d'intérêt légal en vigueur calculé depuis la date d'exigibilité du prix jusqu'à complet paiement du prix.</p>
            <p>Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 €</p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <button
        onClick={() => onDownload(invoice)}
        className="w-full btn-primary py-3 flex items-center justify-center gap-2"
      >
        <Download size={18} />
        Télécharger le PDF
      </button>
    </div>
  );
};

export default { DevisPreview, InvoicePreview };
