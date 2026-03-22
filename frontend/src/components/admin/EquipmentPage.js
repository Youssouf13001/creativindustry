/**
 * Equipment/Inventory Management Page
 * Gestion du matériel et des déplacements
 */

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Plus, Search, Filter, Package, Truck, AlertTriangle,
  Edit, Trash2, Download, Eye, CheckCircle, XCircle,
  Calendar, FileText, ChevronRight, RefreshCw, Upload,
  Camera, Mic, Lightbulb, Monitor, Briefcase, Box, ArrowLeft
} from "lucide-react";
import { API, BACKEND_URL } from "../../config/api";

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState("inventory"); // inventory, deployments, reminders

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [eqRes, catRes, statsRes, remindersRes] = await Promise.all([
        axios.get(`${API}/equipment`, { headers, params: { search, category_id: selectedCategory, condition: selectedCondition } }),
        axios.get(`${API}/equipment/categories`, { headers }),
        axios.get(`${API}/equipment/stats`, { headers }),
        axios.get(`${API}/equipment/reminders`, { headers })
      ]);
      
      setEquipment(eqRes.data);
      setCategories(catRes.data);
      setStats(statsRes.data);
      setReminders(remindersRes.data);
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
    if (!window.confirm("Supprimer cet équipement ?")) return;
    
    try {
      const token = localStorage.getItem("admin_token");
      await axios.delete(`${API}/equipment/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Équipement supprimé");
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
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
          { id: "reminders", label: "Alertes", icon: AlertTriangle, badge: reminders.length }
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
        <DeploymentsTab onRefresh={fetchData} />
      )}

      {/* Reminders Tab */}
      {activeTab === "reminders" && (
        <RemindersTab reminders={reminders} onRefresh={fetchData} />
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
function DeploymentModal({ equipment, onClose, onSave, categories = [] }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    notes: "",
    equipment_ids: []
  });
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Filter equipment by category and search
  const filteredEquipment = equipment.filter(item => {
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
    setForm(prev => ({
      ...prev,
      equipment_ids: prev.equipment_ids.includes(id)
        ? prev.equipment_ids.filter(e => e !== id)
        : [...prev.equipment_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.equipment_ids.length === 0) {
      toast.error("Nom et au moins un équipement requis");
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem("admin_token");
      await axios.post(`${API}/deployments`, form, {
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
              Équipements à emporter ({form.equipment_ids.length} sélectionnés)
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
                    {category.items.map(item => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 ${
                          form.equipment_ids.includes(item.id) ? "bg-primary/10" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={form.equipment_ids.includes(item.id)}
                          onChange={() => toggleEquipment(item.id)}
                          className="w-5 h-5 rounded"
                        />
                        <div className="flex-1">
                          <div className="text-white font-medium">{item.name}</div>
                          <div className="text-white/50 text-sm">
                            {item.brand} {item.model}
                          </div>
                        </div>
                      </label>
                    ))}
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
              disabled={saving || form.equipment_ids.length === 0}
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

// Deployments Tab Component
function DeploymentsTab({ onRefresh }) {
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
              {dep.status === "planned" && (
                <button
                  onClick={() => startDeployment(dep.id)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm"
                >
                  <Truck size={16} /> Démarrer
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
            </div>
          </div>
        ))
      )}

      {/* Deployment Details Modal */}
      {selectedDeployment && (
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
      
      toast.success("Retour validé");
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

// Reminders Tab
function RemindersTab({ reminders, onRefresh }) {
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

  if (reminders.length === 0) {
    return (
      <div className="text-center py-12 text-white/50">
        <CheckCircle size={48} className="mx-auto mb-4 opacity-50 text-green-400" />
        <p>Aucune alerte</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
  );
}
