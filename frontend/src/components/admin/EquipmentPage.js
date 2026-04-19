/**
 * Equipment/Inventory Management Page
 * Gestion du matériel et des déplacements
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Search, Filter, Package, Truck, AlertTriangle,
  Edit, Trash2, Download, Eye, CheckCircle, XCircle,
  Calendar, FileText, ChevronRight, RefreshCw, Upload,
  Camera, Mic, Lightbulb, Monitor, Briefcase, Box, ArrowLeft, PenTool,
  ArchiveRestore, Trash
} from "lucide-react";
import { API, BACKEND_URL } from "../../config/api";
import SignaturePad from "../SignaturePad";
import { OfflineIndicator } from "../../hooks/useOfflineEquipment";

// Category icons map
const CATEGORY_ICONS = {
  "Caméras": Camera,
  "Objectifs": Eye,
  "Éclairage": Lightbulb,
  "Audio": Mic,
  "Trépieds/Supports": Package,
  "Accessoires": Briefcase,
  "Informatique": Monitor,
  "Autre": Box
};

// Condition colors
const CONDITION_COLORS = {
  "neuf": "bg-green-500",
  "bon": "bg-blue-500",
  "usé": "bg-yellow-500",
  "à_réparer": "bg-orange-500",
  "hors_service": "bg-red-500"
};

const CONDITION_LABELS = {
  "neuf": "Neuf",
  "bon": "Bon état",
  "usé": "Usé",
  "à_réparer": "À réparer",
  "hors_service": "Hors service"
};

export default function EquipmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [reminders, setReminders] = useState([]);
  
  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  
  // Tab state - read from URL param if present
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl === "alertes" ? "reminders" : tabFromUrl === "corbeille" ? "trash" : "inventory"
  );
  const [ticketCount, setTicketCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [eqRes, catRes, statsRes, remindersRes, ticketsRes, trashRes] = await Promise.all([
        axios.get(`${API}/equipment`, { headers, params: { search, category_id: selectedCategory, condition: selectedCondition } }),
        axios.get(`${API}/equipment/categories`, { headers }),
        axios.get(`${API}/equipment/stats`, { headers }),
        axios.get(`${API}/equipment/reminders`, { headers }),
        axios.get(`${API}/loss-tickets`, { headers }),
        axios.get(`${API}/equipment-trash`, { headers })
      ]);
      
      setEquipment(eqRes.data);
      setCategories(catRes.data);
      setStats(statsRes.data);
      setReminders(remindersRes.data);
      const openTickets = (ticketsRes.data || []).filter(t => t.status !== "resolved" && t.status !== "replaced" && t.status !== "reimbursed" && t.status !== "obsolete");
      setTicketCount(openTickets.length);
      setTrashCount((trashRes.data || []).length);
    } catch (e) {
      console.error("Error fetching equipment:", e);
      if (e.response?.status === 401) {
        navigate("/admin");
      }
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedCondition, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id) => {
    if (!window.confirm("Déplacer cet équipement dans la corbeille ?")) return;
    
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/equipment/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Équipement déplacé dans la corbeille");
      fetchData();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || "Erreur inconnue";
      toast.error(`Erreur: ${detail}`);
      console.error("Delete error:", e.response?.status, detail);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/dashboard")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft size={24} className="text-white/70" />
          </button>
          <div>
            <h1 className="text-3xl font-primary text-white mb-2">Gestion du Matériel</h1>
            <p className="text-white/60">Inventaire, déplacements et suivi</p>
          </div>
        </div>
        <div className="flex gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setShowDeploymentModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
            data-testid="new-deployment-btn"
          >
            <Truck size={20} /> Nouveau déplacement
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold rounded-lg"
            data-testid="add-equipment-btn"
          >
            <Plus size={20} /> Ajouter matériel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-white/10 rounded-xl p-4">
            <div className="text-white/60 text-sm">Total équipements</div>
            <div className="text-3xl font-bold text-white">{stats.total_equipment}</div>
          </div>
          <div className="bg-card border border-white/10 rounded-xl p-4">
            <div className="text-white/60 text-sm">Disponibles</div>
            <div className="text-3xl font-bold text-green-400">{stats.available}</div>
          </div>
          <div className="bg-card border border-white/10 rounded-xl p-4">
            <div className="text-white/60 text-sm">En déplacement</div>
            <div className="text-3xl font-bold text-blue-400">{stats.in_deployment}</div>
          </div>
          <div className="bg-card border border-white/10 rounded-xl p-4">
            <div className="text-white/60 text-sm">Alertes</div>
            <div className="text-3xl font-bold text-red-400">{stats.unresolved_reminders}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-4">
        {[
          { id: "inventory", label: "Inventaire", icon: Package },
          { id: "deployments", label: "Déplacements", icon: Truck },
          { id: "reminders", label: "Alertes", icon: AlertTriangle, badge: reminders.length + ticketCount },
          { id: "trash", label: "Corbeille", icon: Trash, badge: trashCount }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-black font-bold"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Inventory Tab */}
      {activeTab === "inventory" && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={20} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="">Toutes catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white appearance-none cursor-pointer [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="">Tous états</option>
              {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Equipment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipment.map(item => {
              const CategoryIcon = CATEGORY_ICONS[item.category?.name] || Box;
              return (
                <div
                  key={item.id}
                  className={`bg-card border rounded-xl p-4 ${
                    item.is_available ? "border-white/10" : "border-blue-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: item.category?.color || "#6B7280" }}
                      >
                        <CategoryIcon size={20} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{item.name}</h3>
                        <p className="text-white/60 text-sm">
                          {item.brand} {item.model}
                        </p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${CONDITION_COLORS[item.condition]}`} title={CONDITION_LABELS[item.condition]} />
                  </div>
                  
                  {item.serial_number && (
                    <p className="text-white/50 text-xs mb-2">S/N: {item.serial_number}</p>
                  )}
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      {item.is_available ? (
                        <span className="text-green-400 text-xs flex items-center gap-1">
                          <CheckCircle size={14} /> Disponible
                        </span>
                      ) : (
                        <span className="text-blue-400 text-xs flex items-center gap-1">
                          <Truck size={14} /> En déplacement
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingEquipment(item)}
                        className="p-2 hover:bg-white/10 rounded-lg"
                      >
                        <Edit size={16} className="text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg"
                      >
                        <Trash2 size={16} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {equipment.length === 0 && (
            <div className="text-center py-12 text-white/50">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucun équipement trouvé</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-primary hover:underline"
              >
                Ajouter votre premier équipement
              </button>
            </div>
          )}
        </>
      )}

      {/* Deployments Tab */}
      {activeTab === "deployments" && (
        <DeploymentsTab onRefresh={fetchData} equipment={equipment} categories={categories} />
      )}

      {/* Reminders Tab */}
      {activeTab === "reminders" && (
        <RemindersTab reminders={reminders} onRefresh={fetchData} />
      )}

      {/* Trash Tab */}
      {activeTab === "trash" && (
        <TrashTab onRefresh={fetchData} categories={categories} />
      )}

      {/* Add/Edit Equipment Modal */}
      {(showAddModal || editingEquipment) && (
        <EquipmentModal
          equipment={editingEquipment}
          categories={categories}
          onClose={() => {
            setShowAddModal(false);
            setEditingEquipment(null);
          }}
          onSave={() => {
            setShowAddModal(false);
            setEditingEquipment(null);
            fetchData();
          }}
        />
      )}

      {/* New Deployment Modal */}
      {showDeploymentModal && (
        <DeploymentModal
          equipment={equipment}
          categories={categories}
          onClose={() => setShowDeploymentModal(false)}
          onSave={() => {
            setShowDeploymentModal(false);
            fetchData();
            setActiveTab("deployments");
          }}
        />
      )}
      
      {/* Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
}

// Equipment Add/Edit Modal
function EquipmentModal({ equipment, categories, onClose, onSave }) {
  const [form, setForm] = useState({
    name: equipment?.name || "",
    brand: equipment?.brand || "",
    model: equipment?.model || "",
    serial_number: equipment?.serial_number || "",
    category_id: equipment?.category_id || "",
    purchase_date: equipment?.purchase_date || "",
    purchase_price: equipment?.purchase_price || "",
    warranty_end_date: equipment?.warranty_end_date || "",
    condition: equipment?.condition || "bon",
    notes: equipment?.notes || "",
    quantity: equipment?.quantity || 1
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Le nom est requis");
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      if (equipment) {
        await axios.put(`${API}/equipment/${equipment.id}`, form, { headers });
        toast.success("Équipement mis à jour");
      } else {
        await axios.post(`${API}/equipment`, form, { headers });
        toast.success("Équipement ajouté");
      }
      onSave();
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {equipment ? "Modifier l'équipement" : "Nouvel équipement"}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-white/60 text-sm mb-1">Nom *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Marque</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => setForm({...form, brand: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Modèle</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => setForm({...form, model: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">N° de série</label>
              <input
                type="text"
                value={form.serial_number}
                onChange={(e) => setForm({...form, serial_number: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Catégorie</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({...form, category_id: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                <option value="">Sélectionner...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Date d'achat</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => setForm({...form, purchase_date: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Prix d'achat (€)</label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={(e) => setForm({...form, purchase_price: parseFloat(e.target.value) || ""})}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Fin de garantie</label>
              <input
                type="date"
                value={form.warranty_end_date}
                onChange={(e) => setForm({...form, warranty_end_date: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">État</label>
              <select
                value={form.condition}
                onChange={(e) => setForm({...form, condition: e.target.value})}
                className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
              >
                {Object.entries(CONDITION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-white/60 text-sm mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Deployment Modal
function DeploymentModal({ equipment = [], onClose, onSave, categories = [] }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    notes: "",
    equipment_items: {} // { equipment_id: quantity }
  });
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter equipment by category and search
  const filteredEquipment = (equipment || []).filter(item => {
    const matchesCategory = !filterCategory || item.category_id === filterCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Group by category for display
  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const catId = item.category_id || "other";
    const catName = item.category?.name || "Autre";
    if (!acc[catId]) {
      acc[catId] = { name: catName, icon: item.category?.icon || "📦", items: [] };
    }
    acc[catId].items.push(item);
    return acc;
  }, {});

  const toggleEquipment = (id) => {
    setForm(prev => {
      const newItems = { ...prev.equipment_items };
      if (newItems[id]) {
        delete newItems[id];
      } else {
        newItems[id] = 1; // Default quantity
      }
      return { ...prev, equipment_items: newItems };
    });
  };

  const updateQuantity = (id, qty) => {
    const quantity = Math.max(1, parseInt(qty) || 1);
    setForm(prev => ({
      ...prev,
      equipment_items: { ...prev.equipment_items, [id]: quantity }
    }));
  };

  const selectedCount = Object.keys(form.equipment_items).length;
  const totalItems = Object.values(form.equipment_items).reduce((sum, qty) => sum + qty, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || selectedCount === 0) {
      toast.error("Nom et au moins un équipement requis");
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      // Convert equipment_items to array format for backend
      const payload = {
        name: form.name,
        location: form.location,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes,
        equipment_items: Object.entries(form.equipment_items).map(([id, qty]) => ({
          equipment_id: id,
          quantity: qty
        }))
      };
      await axios.post(`${API}/deployments`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Déplacement créé");
      onSave();
    } catch (e) {
      toast.error("Erreur lors de la création");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Nouveau déplacement</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-white/60 text-sm mb-1">Nom du déplacement *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Ex: Mariage Martin - Château de..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-white/60 text-sm mb-1">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                placeholder="Adresse ou lieu"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Date de départ *</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({...form, start_date: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-white/60 text-sm mb-1">Date de retour</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({...form, end_date: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/60 text-sm mb-2">
              Équipements à emporter ({selectedCount} types, {totalItems} articles)
            </label>
            
            {/* Filtres */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-zinc-900"
              >
                <option value="">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="max-h-72 overflow-y-auto border border-white/10 rounded-lg">
              {Object.keys(groupedEquipment).length === 0 ? (
                <p className="p-4 text-white/50 text-center">Aucun équipement trouvé</p>
              ) : (
                Object.entries(groupedEquipment).map(([catId, category]) => (
                  <div key={catId}>
                    <div className="sticky top-0 bg-zinc-800 px-3 py-2 text-white/70 text-sm font-medium border-b border-white/10">
                      {category.icon} {category.name} ({category.items.length})
                    </div>
                    {category.items.map(item => {
                      const isSelected = form.equipment_items[item.id] !== undefined;
                      const quantity = form.equipment_items[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 border-b border-white/5 ${
                            isSelected ? "bg-primary/10" : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEquipment(item.id)}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{item.name}</div>
                            <div className="text-white/50 text-sm">
                              {item.brand} {item.model}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm">Qté:</span>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateQuantity(item.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-16 bg-zinc-800 border border-white/20 rounded px-2 py-1 text-white text-center"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || selectedCount === 0}
              className="flex-1 px-4 py-2 bg-primary text-black font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? "Création..." : "Créer le déplacement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Deployment Modal
function EditDeploymentModal({ deployment, equipment = [], categories = [], onClose, onSave }) {
  const [form, setForm] = useState({
    name: deployment.name || "",
    location: deployment.location || "",
    start_date: deployment.start_date || "",
    end_date: deployment.end_date || "",
    notes: deployment.notes || "",
    equipment_items: {}
  });
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Initialize equipment_items from deployment
  useEffect(() => {
    const items = {};
    (deployment.items || []).forEach(item => {
      items[item.equipment_id] = item.quantity || 1;
    });
    setForm(prev => ({ ...prev, equipment_items: items }));
  }, [deployment]);

  // Filter equipment
  const filteredEquipment = (equipment || []).filter(item => {
    const matchesCategory = !filterCategory || item.category_id === filterCategory;
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Group by category
  const groupedEquipment = filteredEquipment.reduce((acc, item) => {
    const catId = item.category_id || "other";
    const catName = item.category?.name || "Autre";
    if (!acc[catId]) {
      acc[catId] = { name: catName, icon: item.category?.icon || "📦", items: [] };
    }
    acc[catId].items.push(item);
    return acc;
  }, {});

  const toggleEquipment = (id) => {
    setForm(prev => {
      const newItems = { ...prev.equipment_items };
      if (newItems[id]) {
        delete newItems[id];
      } else {
        newItems[id] = 1;
      }
      return { ...prev, equipment_items: newItems };
    });
  };

  const updateQuantity = (id, qty) => {
    const quantity = Math.max(1, parseInt(qty) || 1);
    setForm(prev => ({
      ...prev,
      equipment_items: { ...prev.equipment_items, [id]: quantity }
    }));
  };

  const selectedCount = Object.keys(form.equipment_items).length;
  const totalItems = Object.values(form.equipment_items).reduce((sum, qty) => sum + qty, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || selectedCount === 0) {
      toast.error("Nom et au moins un équipement requis");
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const payload = {
        name: form.name,
        location: form.location,
        start_date: form.start_date,
        end_date: form.end_date,
        notes: form.notes,
        equipment_items: Object.entries(form.equipment_items).map(([id, qty]) => ({
          equipment_id: id,
          quantity: qty
        }))
      };
      await axios.put(`${API}/deployments/${deployment.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Déplacement modifié");
      onSave();
    } catch (e) {
      toast.error("Erreur lors de la modification");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Modifier le déplacement</h2>
          <p className="text-white/60 text-sm mt-1">Modifiez les informations et les équipements</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-1">Nom du déplacement *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ex: Mariage Dupont"
                required
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-1">Lieu</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({...form, location: e.target.value})}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Ex: Château de Versailles"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-1">Date de départ</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({...form, start_date: e.target.value})}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-white/60 text-sm mb-1">Date de retour</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({...form, end_date: e.target.value})}
                className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-white/60 text-sm mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({...form, notes: e.target.value})}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2 text-white h-20 resize-none"
              placeholder="Notes supplémentaires..."
            />
          </div>
          
          <div>
            <label className="block text-white/60 text-sm mb-2">
              Équipements ({selectedCount} types, {totalItems} articles)
            </label>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm [&>option]:bg-zinc-900"
              >
                <option value="">Toutes catégories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            
            <div className="max-h-64 overflow-y-auto border border-white/10 rounded-lg">
              {Object.keys(groupedEquipment).length === 0 ? (
                <p className="p-4 text-white/50 text-center">Aucun équipement trouvé</p>
              ) : (
                Object.entries(groupedEquipment).map(([catId, category]) => (
                  <div key={catId}>
                    <div className="sticky top-0 bg-zinc-800 px-3 py-2 text-white/70 text-sm font-medium border-b border-white/10">
                      {category.icon} {category.name} ({category.items.length})
                    </div>
                    {category.items.map(item => {
                      const isSelected = form.equipment_items[item.id] !== undefined;
                      const quantity = form.equipment_items[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 border-b border-white/5 ${
                            isSelected ? "bg-primary/10" : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEquipment(item.id)}
                            className="w-5 h-5 rounded cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-white font-medium">{item.name}</div>
                            <div className="text-white/50 text-sm">{item.brand} {item.model}</div>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm">Qté:</span>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateQuantity(item.id, e.target.value)}
                                className="w-16 bg-zinc-800 border border-white/20 rounded px-2 py-1 text-white text-center"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || selectedCount === 0}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Deployments Tab Component
function DeploymentsTab({ onRefresh, equipment = [], categories = [] }) {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState(null);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get(`${API}/deployments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeployments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (id) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get(`${API}/deployments/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `deplacement_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("PDF téléchargé");
    } catch (e) {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const startDeployment = async (id) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/deployments/${id}/start`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Déplacement démarré");
      fetchDeployments();
      onRefresh();
    } catch (e) {
      toast.error("Erreur lors du démarrage");
    }
  };

  const deleteDeployment = async (id, name) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le déplacement "${name}" ?\n\nCette action est irréversible.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/deployments/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Déplacement supprimé");
      fetchDeployments();
      onRefresh();
    } catch (e) {
      const detail = e.response?.data?.detail || e.message || "Erreur inconnue";
      toast.error(`Erreur: ${detail}`);
    }
  };

  const STATUS_COLORS = {
    planned: "bg-blue-500",
    in_progress: "bg-yellow-500",
    completed: "bg-green-500",
    cancelled: "bg-gray-500"
  };

  const STATUS_LABELS = {
    planned: "Planifié",
    in_progress: "En cours",
    completed: "Terminé",
    cancelled: "Annulé"
  };

  if (loading) {
    return <div className="text-center py-12"><RefreshCw className="animate-spin mx-auto" /></div>;
  }

  return (
    <div className="space-y-4">
      {deployments.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Truck size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aucun déplacement</p>
        </div>
      ) : (
        deployments.map(dep => (
          <div
            key={dep.id}
            className="bg-card border border-white/10 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-white text-lg">{dep.name}</h3>
                <p className="text-white/60 text-sm">{dep.location || "Lieu non spécifié"}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs text-white ${STATUS_COLORS[dep.status]}`}>
                {STATUS_LABELS[dep.status]}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-white/60 text-sm mb-4">
              <span className="flex items-center gap-1">
                <Calendar size={14} /> {dep.start_date}
                {dep.end_date && ` → ${dep.end_date}`}
              </span>
              <span className="flex items-center gap-1">
                <Package size={14} /> {dep.items?.length || 0} équipements
              </span>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => downloadPDF(dep.id)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm"
              >
                <Download size={16} /> PDF
              </button>
              <button
                onClick={() => setSelectedDeployment(dep)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm"
              >
                <Eye size={16} /> Détails
              </button>
              {(dep.status === "planned" || dep.status === "in_progress") && (
                <button
                  onClick={() => setSelectedDeployment({...dep, showEdit: true})}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm"
                >
                  <Edit size={16} /> Modifier
                </button>
              )}
              {dep.status === "planned" && !dep.signature_departure && (
                <button
                  onClick={() => setSelectedDeployment({...dep, showSignature: true, signatureType: "departure"})}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                >
                  <PenTool size={16} /> Signer départ
                </button>
              )}
              {dep.status === "planned" && dep.signature_departure && (
                <button
                  onClick={() => startDeployment(dep.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                >
                  <Truck size={16} /> Démarrer
                </button>
              )}
              {dep.status === "in_progress" && !dep.signature_return && (
                <button
                  onClick={() => setSelectedDeployment({...dep, showSignature: true, signatureType: "return"})}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm"
                >
                  <PenTool size={16} /> Signer retour
                </button>
              )}
              {(dep.status === "planned" || dep.status === "in_progress") && (
                <button
                  onClick={() => setSelectedDeployment({...dep, showReturn: true})}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                >
                  <CheckCircle size={16} /> Valider retour
                </button>
              )}
              <button
                onClick={() => deleteDeployment(dep.id, dep.name)}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-colors"
                title="Supprimer ce déplacement"
              >
                <Trash2 size={16} />
              </button>
              {dep.signature_departure && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ Signé (départ)
                </span>
              )}
              {dep.signature_return && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ Signé (retour)
                </span>
              )}
            </div>
          </div>
        ))
      )}

      {/* Edit Deployment Modal */}
      {selectedDeployment && selectedDeployment.showEdit && (
        <EditDeploymentModal
          deployment={selectedDeployment}
          equipment={equipment}
          categories={categories}
          onClose={() => setSelectedDeployment(null)}
          onSave={() => {
            setSelectedDeployment(null);
            fetchDeployments();
            onRefresh();
          }}
        />
      )}

      {/* Deployment Details Modal */}
      {selectedDeployment && !selectedDeployment.showSignature && !selectedDeployment.showEdit && (
        <DeploymentDetailsModal
          deployment={selectedDeployment}
          showReturn={selectedDeployment.showReturn}
          onClose={() => setSelectedDeployment(null)}
          onSave={() => {
            setSelectedDeployment(null);
            fetchDeployments();
            onRefresh();
          }}
        />
      )}
      
      {/* Signature Modal */}
      {selectedDeployment && selectedDeployment.showSignature && (
        <SignaturePad
          signerName=""
          onCancel={() => setSelectedDeployment(null)}
          onSave={async (signatureData, signerName) => {
            try {
              const token = localStorage.getItem("admin_token");
              await axios.post(
                `${API}/deployments/${selectedDeployment.id}/signature`,
                {
                  signature_data: signatureData,
                  signer_name: signerName,
                  signature_type: selectedDeployment.signatureType || "departure"
                },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              toast.success("Signature enregistrée");
              setSelectedDeployment(null);
              fetchDeployments();
              onRefresh();
            } catch (e) {
              toast.error("Erreur lors de l'enregistrement");
            }
          }}
        />
      )}
    </div>
  );
}

// Deployment Details/Return Modal
function DeploymentDetailsModal({ deployment, showReturn, onClose, onSave }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [returnStatuses, setReturnStatuses] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [deployment.id]);

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get(`${API}/deployments/${deployment.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items || []);
      
      // Initialize return statuses
      const statuses = {};
      res.data.items?.forEach(item => {
        statuses[item.equipment_id] = item.return_status || "returned";
      });
      setReturnStatuses(statuses);
    } catch (e) {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleValidateReturn = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      const itemsData = Object.entries(returnStatuses).map(([equipment_id, status]) => ({
        equipment_id,
        status,
        notes: null
      }));
      
      await axios.post(`${API}/deployments/${deployment.id}/return`, itemsData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Create loss tickets for lost, stolen or damaged items
      const issueItems = itemsData.filter(item => 
        ["lost", "stolen", "damaged"].includes(item.status)
      );
      
      for (const item of issueItems) {
        const equipmentInfo = items.find(i => i.equipment_id === item.equipment_id);
        try {
          await axios.post(`${API}/loss-tickets`, {
            equipment_id: item.equipment_id,
            equipment_name: equipmentInfo?.equipment?.name || "Équipement inconnu",
            issue_type: item.status,
            deployment_id: deployment.id,
            deployment_name: deployment.name,
            notes: `Signalé lors du retour du déplacement "${deployment.name}"`
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (e) {
          console.error("Erreur création ticket:", e);
        }
      }
      
      if (issueItems.length > 0) {
        toast.success(`Retour validé - ${issueItems.length} ticket(s) créé(s) et notification envoyée`);
      } else {
        toast.success("Retour validé");
      }
      onSave();
    } catch (e) {
      toast.error("Erreur lors de la validation");
    } finally {
      setSaving(false);
    }
  };

  const RETURN_OPTIONS = [
    { value: "returned", label: "Retourné", color: "text-green-400" },
    { value: "damaged", label: "Endommagé", color: "text-orange-400" },
    { value: "forgotten", label: "Oublié", color: "text-yellow-400" },
    { value: "lost", label: "Perdu", color: "text-red-400" },
    { value: "stolen", label: "Volé", color: "text-red-600" }
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">
            {showReturn ? "Validation du retour" : "Détails du déplacement"}
          </h2>
          <p className="text-white/60">{deployment.name}</p>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8"><RefreshCw className="animate-spin mx-auto" /></div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div
                  key={item.equipment_id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="text-white font-medium">{item.equipment?.name}</div>
                    <div className="text-white/50 text-sm">
                      {item.equipment?.brand} {item.equipment?.model}
                    </div>
                  </div>
                  
                  {showReturn ? (
                    <select
                      value={returnStatuses[item.equipment_id] || "returned"}
                      onChange={(e) => setReturnStatuses(prev => ({
                        ...prev,
                        [item.equipment_id]: e.target.value
                      }))}
                      className="bg-zinc-900 border border-white/20 rounded-lg px-3 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
                    >
                      {RETURN_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`text-sm ${
                      item.return_status === "returned" ? "text-green-400" :
                      item.return_status ? "text-orange-400" : "text-blue-400"
                    }`}>
                      {item.return_status ? RETURN_OPTIONS.find(o => o.value === item.return_status)?.label : "En déplacement"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg"
          >
            Fermer
          </button>
          {showReturn && (
            <button
              onClick={handleValidateReturn}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
            >
              {saving ? "Validation..." : "Valider le retour"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Reminders Tab with Loss Tickets
function RemindersTab({ reminders, onRefresh }) {
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [updatingTicket, setUpdatingTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({ status: "", response_message: "", estimated_date: "" });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get(`${API}/loss-tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (e) {
      console.error("Error fetching tickets:", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  const resolveReminder = async (id) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/equipment/reminders/${id}/resolve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rappel marqué comme résolu");
      onRefresh();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const openUpdateTicket = (ticket) => {
    setUpdatingTicket(ticket);
    setTicketForm({ status: ticket.status, response_message: "", estimated_date: "" });
  };

  const handleUpdateTicket = async (overrideData) => {
    const data = overrideData || ticketForm;
    if (!data.response_message.trim()) {
      toast.error("Veuillez ajouter un message");
      return;
    }
    try {
      const token = localStorage.getItem("admin_token");
      await axios.put(`${API}/loss-tickets/${updatingTicket.id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ticket mis à jour");
      setUpdatingTicket(null);
      fetchTickets();
      onRefresh();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const sendReminder = async (ticketId) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/loss-tickets/${ticketId}/remind`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rappel envoyé à communication@creativindustry.com");
    } catch (e) {
      toast.error("Erreur lors de l'envoi du rappel");
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm("Supprimer ce ticket ?")) return;
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/loss-tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ticket supprimé");
      fetchTickets();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const ISSUE_LABELS = {
    lost: "Perdu",
    forgotten: "Oublié",
    stolen: "Volé",
    damaged: "Endommagé",
    warranty_expiring: "Garantie expire bientôt"
  };

  const ISSUE_COLORS = {
    lost: "border-red-500 bg-red-500/10",
    forgotten: "border-yellow-500 bg-yellow-500/10",
    stolen: "border-red-600 bg-red-600/10",
    damaged: "border-orange-500 bg-orange-500/10",
    warranty_expiring: "border-blue-500 bg-blue-500/10"
  };

  const TICKET_STATUS_LABELS = {
    pending: "En attente",
    ordering: "Commande lancée",
    delivering: "En cours de livraison",
    insurance: "Assurance en cours",
    replaced: "Matériel remplacé et inventorié",
    reimbursed: "Remboursement assurance",
    obsolete: "Obsolète",
    resolved: "Résolu"
  };

  const TICKET_STATUS_COLORS = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    ordering: "bg-blue-500/20 text-blue-400 border-blue-500/50",
    delivering: "bg-cyan-500/20 text-cyan-400 border-cyan-500/50",
    insurance: "bg-purple-500/20 text-purple-400 border-purple-500/50",
    replaced: "bg-green-500/20 text-green-400 border-green-500/50",
    reimbursed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
    obsolete: "bg-gray-500/20 text-gray-400 border-gray-500/50",
    resolved: "bg-green-500/20 text-green-400 border-green-500/50"
  };

  const TICKET_TYPE_LABELS = {
    lost: "PERDU",
    stolen: "VOLÉ",
    damaged: "ENDOMMAGÉ"
  };

  const TICKET_TYPE_COLORS = {
    lost: "bg-red-500",
    stolen: "bg-red-700",
    damaged: "bg-orange-500"
  };

  const hasContent = reminders.length > 0 || tickets.length > 0;

  if (!hasContent && !loadingTickets) {
    return (
      <div className="text-center py-12 text-white/50">
        <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-400" />
        <p>Aucune alerte ni ticket en cours</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Loss/Theft/Damage Tickets */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2" data-testid="tickets-section-title">
          <FileText size={20} className="text-red-400" />
          Tickets Pertes / Vols / Casses
          {tickets.filter(t => !["replaced", "reimbursed", "obsolete", "resolved"].includes(t.status)).length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {tickets.filter(t => !["replaced", "reimbursed", "obsolete", "resolved"].includes(t.status)).length}
            </span>
          )}
        </h3>

        {loadingTickets ? (
          <div className="text-center py-6"><RefreshCw className="animate-spin mx-auto text-white/40" size={24} /></div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-6 text-white/40 bg-white/5 rounded-lg">
            <p>Aucun ticket de perte/vol/casse</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                className="bg-card border border-white/10 rounded-xl overflow-hidden"
                data-testid={`ticket-${ticket.id}`}
              >
                {/* Ticket Header */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-white shrink-0 ${TICKET_TYPE_COLORS[ticket.issue_type]}`}>
                      {TICKET_TYPE_LABELS[ticket.issue_type]}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-white">{ticket.equipment_name}</h4>
                      {ticket.equipment_details && (
                        <p className="text-white/50 text-sm">
                          {ticket.equipment_details.brand} {ticket.equipment_details.model}
                          {ticket.equipment_details.serial_number && ` — S/N: ${ticket.equipment_details.serial_number}`}
                        </p>
                      )}
                      {ticket.deployment_name && (
                        <p className="text-white/40 text-xs mt-1">
                          Déplacement : {ticket.deployment_name}
                        </p>
                      )}
                      <p className="text-white/40 text-xs mt-1">
                        Ouvert le {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                        {ticket.equipment_details?.purchase_price && (
                          <> — Valeur : {ticket.equipment_details.purchase_price}€</>
                        )}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border shrink-0 ${TICKET_STATUS_COLORS[ticket.status]}`}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </span>
                </div>

                {/* Message History */}
                {ticket.messages && ticket.messages.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="border-t border-white/5 pt-3 space-y-2 max-h-40 overflow-y-auto">
                      {ticket.messages.map((msg, idx) => (
                        <div key={msg.id || idx} className="flex gap-2 text-sm">
                          <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${TICKET_STATUS_COLORS[msg.status]}`}>
                            {TICKET_STATUS_LABELS[msg.status]}
                          </span>
                          <span className="text-white/70">{msg.message}</span>
                          <span className="text-white/30 text-xs shrink-0 ml-auto">
                            {new Date(msg.created_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions - tickets actifs */}
                {!["replaced", "reimbursed", "obsolete", "resolved"].includes(ticket.status) && (
                  <div className="px-4 pb-4 flex gap-2 flex-wrap">
                    <button
                      onClick={() => openUpdateTicket(ticket)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-sm text-white"
                      data-testid={`update-ticket-${ticket.id}`}
                    >
                      <Edit size={14} /> Mettre à jour
                    </button>
                    <button
                      onClick={() => sendReminder(ticket.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white/70"
                      data-testid={`remind-ticket-${ticket.id}`}
                    >
                      <RefreshCw size={14} /> Relancer
                    </button>
                    <button
                      onClick={() => deleteTicket(ticket.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-colors ml-auto"
                      data-testid={`delete-ticket-${ticket.id}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {/* Ticket résolu/clôturé */}
                {["replaced", "reimbursed", "obsolete", "resolved"].includes(ticket.status) && (
                  <div className="px-4 pb-4 flex items-center gap-2 flex-wrap">
                    <span className={`text-sm flex items-center gap-1 ${ticket.status === "obsolete" ? "text-gray-400" : "text-green-400"}`}>
                      <CheckCircle size={14} />
                      {TICKET_STATUS_LABELS[ticket.status]}
                      {ticket.resolved_at && ` — ${new Date(ticket.resolved_at).toLocaleDateString("fr-FR")}`}
                    </span>
                    <button
                      onClick={() => deleteTicket(ticket.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equipment Reminders */}
      {reminders.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-400" />
            Alertes équipement
          </h3>
          <div className="space-y-3">
            {reminders.map(reminder => (
              <div
                key={reminder.id}
                className={`border-l-4 rounded-lg p-4 ${ISSUE_COLORS[reminder.issue || reminder.type]}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      <span className="font-bold text-white">
                        {ISSUE_LABELS[reminder.issue || reminder.type]}
                      </span>
                    </div>
                    <p className="text-white">{reminder.equipment_name}</p>
                    {reminder.notes && (
                      <p className="text-white/60 text-sm mt-1">{reminder.notes}</p>
                    )}
                    {reminder.warranty_end_date && (
                      <p className="text-white/60 text-sm mt-1">
                        Expire le: {reminder.warranty_end_date}
                      </p>
                    )}
                  </div>
                  {!reminder.id.startsWith("warranty_") && (
                    <button
                      onClick={() => resolveReminder(reminder.id)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm"
                    >
                      Résolu
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Update Ticket Modal */}
      {updatingTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-white/10 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Mettre à jour le ticket</h2>
              <p className="text-white/60 text-sm mt-1">
                {TICKET_TYPE_LABELS[updatingTicket.issue_type]} — {updatingTicket.equipment_name}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Statut en cours */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Avancement</label>
                <select
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-zinc-900 [&>option]:text-white"
                  data-testid="ticket-status-select"
                >
                  <option value="pending">En attente</option>
                  <option value="ordering">Commande lancée</option>
                  <option value="delivering">En cours de livraison</option>
                  <option value="insurance">Assurance prend le relais</option>
                </select>
              </div>

              <div>
                <label className="block text-white/60 text-sm mb-1">Message / Commentaire *</label>
                <textarea
                  value={ticketForm.response_message}
                  onChange={(e) => setTicketForm({ ...ticketForm, response_message: e.target.value })}
                  rows={3}
                  placeholder="Ex: Commande passée chez Amazon, livraison prévue le..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  data-testid="ticket-message-input"
                />
              </div>

              {(ticketForm.status === "ordering" || ticketForm.status === "delivering" || ticketForm.status === "insurance") && (
                <div>
                  <label className="block text-white/60 text-sm mb-1">Date estimée</label>
                  <input
                    type="date"
                    value={ticketForm.estimated_date}
                    onChange={(e) => setTicketForm({ ...ticketForm, estimated_date: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white [color-scheme:dark]"
                    data-testid="ticket-date-input"
                  />
                </div>
              )}

              {/* Boutons de clôture rapide */}
              <div className="border-t border-white/10 pt-4">
                <label className="block text-white/60 text-sm mb-2">Clôturer le ticket</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleUpdateTicket({ status: "replaced", response_message: ticketForm.response_message || "Matériel remplacé et ajouté à l'inventaire", estimated_date: "" })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white rounded-lg text-sm transition-colors border border-green-600/30"
                    data-testid="ticket-resolve-replaced"
                  >
                    <CheckCircle size={16} /> Matériel remplacé et inventorié
                  </button>
                  <button
                    onClick={() => handleUpdateTicket({ status: "reimbursed", response_message: ticketForm.response_message || "Remboursement reçu de l'assurance", estimated_date: "" })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg text-sm transition-colors border border-emerald-600/30"
                    data-testid="ticket-resolve-reimbursed"
                  >
                    <CheckCircle size={16} /> Remboursement de l'assurance
                  </button>
                  <button
                    onClick={() => handleUpdateTicket({ status: "obsolete", response_message: ticketForm.response_message || "Matériel obsolète, pas de remplacement", estimated_date: "" })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-600/20 hover:bg-gray-600 text-gray-400 hover:text-white rounded-lg text-sm transition-colors border border-gray-600/30"
                    data-testid="ticket-resolve-obsolete"
                  >
                    <XCircle size={16} /> Obsolète (ne pas remplacer)
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setUpdatingTicket(null)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdateTicket}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg"
                data-testid="ticket-update-submit"
              >
                Mettre à jour le statut
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Trash Tab Component
function TrashTab({ onRefresh, categories = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrash();
  }, []);

  const fetchTrash = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await axios.get(`${API}/equipment-trash`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (id, name) => {
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/equipment-trash/${id}/restore`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`${name} restauré dans l'inventaire`);
      fetchTrash();
      onRefresh();
    } catch (e) {
      toast.error("Erreur lors de la restauration");
    }
  };

  const permanentDelete = async (id, name) => {
    if (!window.confirm(`Supprimer définitivement "${name}" ?\n\nCette action est irréversible.`)) return;
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/equipment-trash/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Supprimé définitivement");
      fetchTrash();
      onRefresh();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  if (loading) {
    return <div className="text-center py-12"><RefreshCw className="animate-spin mx-auto text-white/40" size={24} /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-white/50">
        <Trash size={48} className="mx-auto mb-4 opacity-50" />
        <p>La corbeille est vide</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white/50 text-sm">{items.length} équipement(s) dans la corbeille</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-card border border-white/10 rounded-xl p-4 opacity-70 hover:opacity-100 transition-opacity"
            data-testid={`trash-item-${item.id}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-white">{item.name}</h3>
                <p className="text-white/50 text-sm">
                  {item.brand} {item.model}
                </p>
                {item.serial_number && (
                  <p className="text-white/40 text-xs">S/N: {item.serial_number}</p>
                )}
              </div>
              <span className={`w-3 h-3 rounded-full ${CONDITION_COLORS[item.condition]}`} title={CONDITION_LABELS[item.condition]} />
            </div>

            <p className="text-white/40 text-xs mb-3">
              Supprimé le {new Date(item.deleted_at).toLocaleDateString("fr-FR")}
              {item.deleted_by_name && ` par ${item.deleted_by_name}`}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => restoreItem(item.id, item.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm text-white flex-1 justify-center"
                data-testid={`restore-${item.id}`}
              >
                <ArchiveRestore size={14} /> Restaurer
              </button>
              <button
                onClick={() => permanentDelete(item.id, item.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg text-sm transition-colors"
                data-testid={`perm-delete-${item.id}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
