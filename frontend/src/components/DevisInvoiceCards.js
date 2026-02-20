import { Download, FileDown, Check, Clock, X, Euro, CreditCard } from "lucide-react";

/**
 * DevisCard - Displays a devis/quote in the same format as the devis site
 */
export const DevisCard = ({ devis, onDownload }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "accepted":
        return <span className="flex items-center gap-1 text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full"><Check size={12} /> Accepté</span>;
      case "rejected":
        return <span className="flex items-center gap-1 text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded-full"><X size={12} /> Refusé</span>;
      default:
        return <span className="flex items-center gap-1 text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full"><Clock size={12} /> En attente</span>;
    }
  };

  // Parse items from devis_data if available
  const items = devis.devis_data?.items || [];
  const totals = {
    total_ht: devis.devis_data?.total_ht || devis.total_amount || 0,
    total_tva: devis.devis_data?.total_tva || 0,
    total_ttc: devis.devis_data?.total_ttc || devis.total_amount || 0
  };

  return (
    <div className="bg-card border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent p-4 border-b border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Devis</p>
            <h3 className="font-primary font-bold text-xl text-white">N° {devis.devis_id?.slice(-8) || devis.quote_number}</h3>
          </div>
          {getStatusBadge(devis.status)}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b border-white/10 text-sm">
        <div>
          <p className="text-white/40 text-xs mb-1">Date d'émission</p>
          <p className="text-white">{formatDate(devis.created_at || devis.emission_date)}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs mb-1">Date d'échéance</p>
          <p className="text-white">{formatDate(devis.validity_date)}</p>
        </div>
        {devis.event_type && (
          <div>
            <p className="text-white/40 text-xs mb-1">Type d'événement</p>
            <p className="text-white">{devis.event_type}</p>
          </div>
        )}
        {devis.event_date && (
          <div>
            <p className="text-white/40 text-xs mb-1">Date d'événement</p>
            <p className="text-white">{formatDate(devis.event_date)}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      {items.length > 0 && (
        <div className="p-4 border-b border-white/10">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Prestations</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-white/60 font-medium">Désignation</th>
                  <th className="text-right py-2 text-white/60 font-medium">Qté</th>
                  <th className="text-right py-2 text-white/60 font-medium">Prix HT</th>
                  <th className="text-right py-2 text-white/60 font-medium">TVA</th>
                  <th className="text-right py-2 text-white/60 font-medium">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-2 text-white">{item.service_name || item.designation}</td>
                    <td className="py-2 text-white/70 text-right">{item.quantity || 1}</td>
                    <td className="py-2 text-white/70 text-right">{formatCurrency(item.price_ht || item.unit_price)}</td>
                    <td className="py-2 text-white/70 text-right">{item.tva_rate || 0}%</td>
                    <td className="py-2 text-white font-medium text-right">
                      {formatCurrency((item.quantity || 1) * (item.price_ht || item.unit_price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Total HT</span>
          <span className="text-white">{formatCurrency(totals.total_ht)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">TVA (20%)</span>
          <span className="text-white">{formatCurrency(totals.total_tva)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
          <span className="text-primary">Total TTC</span>
          <span className="text-primary">{formatCurrency(totals.total_ttc)}</span>
        </div>
      </div>

      {/* Download Button */}
      <div className="p-4 bg-white/5">
        <button
          onClick={() => onDownload(devis)}
          className="w-full btn-outline py-3 flex items-center justify-center gap-2"
        >
          <FileDown size={18} />
          Télécharger le PDF
        </button>
      </div>
    </div>
  );
};

/**
 * InvoiceCard - Displays an invoice in the same format as the devis site
 */
export const InvoiceCard = ({ invoice, payments = [], onDownload }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Calculate totals
  const amount = invoice.amount || 0;
  const amountHT = amount / 1.20;
  const tva = amount - amountHT;
  
  // Filter payments for this invoice
  const invoicePayments = payments.filter(p => p.invoice_id === invoice.invoice_id || p.devis_id === invoice.devis_id);
  const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = amount - totalPaid;

  return (
    <div className="bg-card border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/20 to-transparent p-4 border-b border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-wider">Facture</p>
            <h3 className="font-primary font-bold text-xl text-white">N° {invoice.invoice_number}</h3>
          </div>
          {remaining <= 0 ? (
            <span className="flex items-center gap-1 text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
              <Check size={12} /> Payée
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full">
              <Euro size={12} /> En attente
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4 p-4 border-b border-white/10 text-sm">
        <div>
          <p className="text-white/40 text-xs mb-1">Date d'émission</p>
          <p className="text-white">{formatDate(invoice.invoice_date)}</p>
        </div>
        <div>
          <p className="text-white/40 text-xs mb-1">Date d'échéance</p>
          <p className="text-white">{formatDate(invoice.due_date)}</p>
        </div>
        {invoice.devis_id && (
          <div className="col-span-2">
            <p className="text-white/40 text-xs mb-1">Devis d'origine</p>
            <p className="text-white">N° {invoice.devis_id?.slice(-8)}</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="p-4 space-y-2 border-b border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Total HT</span>
          <span className="text-white">{formatCurrency(amountHT)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/60">TVA (20%)</span>
          <span className="text-white">{formatCurrency(tva)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
          <span className="text-white">Total TTC</span>
          <span className="text-white">{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* Payments Section */}
      {invoicePayments.length > 0 && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 bg-green-500 rounded"></div>
            <p className="text-xs text-green-400 uppercase tracking-wider font-medium">Règlements</p>
          </div>
          <div className="space-y-2">
            {invoicePayments.map((payment, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 px-3 bg-green-500/10 rounded text-sm">
                <div>
                  <p className="text-white">{formatDate(payment.payment_date)}</p>
                  <p className="text-white/40 text-xs">{payment.payment_method || 'Virement'}</p>
                </div>
                <span className="text-green-400 font-medium">{formatCurrency(payment.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remaining Amount */}
      <div className={`p-4 ${remaining > 0 ? 'bg-orange-500/10' : 'bg-green-500/10'}`}>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-white/40 mb-1">Acompte(s) reçu(s)</p>
            <p className="text-white font-medium">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/40 mb-1">Reste à payer</p>
            <p className={`text-2xl font-bold ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Download Button */}
      <div className="p-4 bg-white/5">
        <button
          onClick={() => onDownload(invoice)}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2"
        >
          <Download size={18} />
          Télécharger le PDF
        </button>
      </div>
    </div>
  );
};

/**
 * PaymentSummaryCard - Shows payment summary like the devis site
 */
export const PaymentSummaryCard = ({ totalAmount, totalPaid, remaining, bankDetails }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
  };

  return (
    <div className="bg-card border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/20 to-transparent border-b border-white/10">
        <h3 className="font-primary font-bold text-lg text-white flex items-center gap-2">
          <CreditCard className="text-primary" size={20} />
          Résumé des paiements
        </h3>
      </div>

      {/* Summary */}
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center py-3 border-b border-white/10">
          <span className="text-white/60">Total facturé</span>
          <span className="text-xl font-bold text-white">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between items-center py-3 border-b border-white/10">
          <span className="text-white/60">Déjà payé</span>
          <span className="text-xl font-bold text-green-400">{formatCurrency(totalPaid)}</span>
        </div>
        <div className={`flex justify-between items-center py-4 px-4 -mx-4 ${remaining > 0 ? 'bg-orange-500/20' : 'bg-green-500/20'}`}>
          <span className={`font-bold ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            RESTE À PAYER
          </span>
          <span className={`text-2xl font-bold ${remaining > 0 ? 'text-orange-400' : 'text-green-400'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      {/* Bank Details */}
      {bankDetails && remaining > 0 && (
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Coordonnées bancaires</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Établissement</span>
              <span className="text-white font-mono">{bankDetails.bank_name || 'QONTO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">IBAN</span>
              <span className="text-white font-mono text-xs">{bankDetails.iban}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">BIC</span>
              <span className="text-white font-mono">{bankDetails.bic}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default { DevisCard, InvoiceCard, PaymentSummaryCard };
