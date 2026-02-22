import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Plus, CheckCircle, Circle, Clock, AlertTriangle, Calendar, 
  Users, User, Trash2, Edit2, X, ChevronDown, Bell, 
  Filter, Search, UserPlus, Mail, Shield, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { API } from "../../config/api";

const PRIORITY_COLORS = {
  high: "bg-red-500/20 text-red-400 border-red-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30"
};

const PRIORITY_LABELS = {
  high: "Haute",
  medium: "Moyenne",
  low: "Basse"
};

const STATUS_COLORS = {
  pending: "bg-gray-500/20 text-gray-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400"
};

const STATUS_LABELS = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminée"
};

const TaskManager = ({ token, clients = [] }) => {
  const [tasks, setTasks] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("tasks"); // tasks, team
  
  // Filters
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Form data
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    priority: "medium",
    assigned_to: [],
    reminders: [{ days_before: 1, enabled: true }]
  });
  
  const headers = { Authorization: `Bearer ${token}` };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, adminsRes, statsRes] = await Promise.all([
        axios.get(`${API}/tasks`, { headers }),
        axios.get(`${API}/admin/admins-list`, { headers }),
        axios.get(`${API}/tasks/stats/overview`, { headers })
      ]);
      setTasks(tasksRes.data);
      // Use admins as team users for task assignment
      setTeamUsers(adminsRes.data.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role || "complet"
      })));
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      toast.error("Erreur lors du chargement des données");
    }
    setLoading(false);
  };
  
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title || !newTask.due_date) {
      toast.error("Veuillez remplir le titre et la date d'échéance");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/tasks`, newTask, { headers });
      setTasks([res.data.task, ...tasks]);
      setShowAddTask(false);
      setNewTask({
        title: "",
        description: "",
        due_date: "",
        priority: "medium",
        assigned_to: [],
        reminders: [{ days_before: 1, enabled: true }]
      });
      toast.success("Tâche créée avec succès");
      loadData(); // Refresh stats
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erreur lors de la création");
    }
  };
  
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    
    setSaving(true);
    try {
      console.log("Updating task:", editingTask);
      const res = await axios.put(`${API}/tasks/${editingTask.id}`, editingTask, { headers });
      console.log("Update response:", res.data);
      setTasks(tasks.map(t => t.id === editingTask.id ? res.data.task : t));
      setEditingTask(null);
      toast.success("Tâche mise à jour");
      loadData();
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    
    try {
      await axios.delete(`${API}/tasks/${taskId}`, { headers });
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Tâche supprimée");
      loadData();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };
  
  const handleToggleStatus = async (task) => {
    try {
      const res = await axios.post(`${API}/tasks/${task.id}/toggle-status`, {}, { headers });
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: res.data.status } : t));
      loadData();
    } catch (error) {
      toast.error("Erreur lors du changement de statut");
    }
  };
  
  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filterStatus && task.status !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;
    if (filterClient && task.client_id !== filterClient) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  // Check if task is overdue
  const isOverdue = (task) => {
    if (task.status === "completed") return false;
    const today = new Date().toISOString().split("T")[0];
    return task.due_date < today;
  };
  
  // Check if task is due today
  const isDueToday = (task) => {
    const today = new Date().toISOString().split("T")[0];
    return task.due_date === today;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="task-manager">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-white/60">Total</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-gray-400">{stats.pending}</div>
            <div className="text-sm text-white/60">En attente</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-blue-400">{stats.in_progress}</div>
            <div className="text-sm text-white/60">En cours</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-sm text-white/60">Terminées</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-red-500/30">
            <div className="text-2xl font-bold text-red-400">{stats.overdue}</div>
            <div className="text-sm text-white/60">En retard</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{stats.due_today}</div>
            <div className="text-sm text-white/60">Aujourd'hui</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 border border-orange-500/30">
            <div className="text-2xl font-bold text-orange-400">{stats.high_priority}</div>
            <div className="text-sm text-white/60">Priorité haute</div>
          </div>
        </div>
      )}
      
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <Calendar className="w-5 h-5 text-primary" />
          <span className="text-white/60 text-sm">
            {teamUsers.length} administrateur(s) disponible(s) pour les tâches
          </span>
        </div>
        
        <button
          onClick={() => setShowAddTask(true)}
          className="bg-primary hover:bg-primary/80 text-black px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          data-testid="add-btn"
        >
          <Plus className="w-4 h-4" />
          Nouvelle tâche
        </button>
      </div>
      
      {/* Tasks List */}
      <>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center bg-white/5 p-4 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40"
                  data-testid="search-input"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              data-testid="filter-status"
            >
              <option value="">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="in_progress">En cours</option>
              <option value="completed">Terminées</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white"
              data-testid="filter-priority"
            >
              <option value="">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>
          </div>
          
          {/* Tasks List */}
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-white/40">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucune tâche trouvée</p>
              </div>
            ) : (
              filteredTasks.map(task => (
                <div
                  key={task.id}
                  className={`bg-white/5 rounded-lg p-4 border ${
                    isOverdue(task) ? "border-red-500/50" : 
                    isDueToday(task) ? "border-yellow-500/50" : 
                    "border-white/10"
                  } hover:bg-white/10 transition-colors`}
                  data-testid={`task-item-${task.id}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Toggle Status */}
                    <button
                      onClick={() => handleToggleStatus(task)}
                      className="mt-1 flex-shrink-0"
                      data-testid={`toggle-status-${task.id}`}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/40 hover:text-white/60" />
                      )}
                    </button>
                    
                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-medium ${task.status === "completed" ? "text-white/50 line-through" : "text-white"}`}>
                          {task.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-xs border ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-white/60 text-sm mt-1">{task.description}</p>
                      )}
                      
                      {/* Progress comment if any */}
                      {task.progress_comment && (
                        <p className="text-primary/80 text-sm mt-1 italic">
                          💬 {task.progress_comment}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-white/40 flex-wrap">
                        <span className={`flex items-center gap-1 ${isOverdue(task) ? "text-red-400" : isDueToday(task) ? "text-yellow-400" : ""}`}>
                          <Clock className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString("fr-FR")}
                          {isOverdue(task) && " (En retard)"}
                          {isDueToday(task) && " (Aujourd'hui)"}
                        </span>
                        
                        {task.assigned_names?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            Assigné à: {task.assigned_names.join(", ")}
                          </span>
                        )}
                        
                        {task.reminders?.some(r => r.enabled) && (
                          <span className="flex items-center gap-1 text-primary">
                            <Bell className="w-4 h-4" />
                            Rappel
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingTask(task)}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                        data-testid={`edit-task-${task.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400"
                        data-testid={`delete-task-${task.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      
      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-task-modal">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Nouvelle tâche</h2>
              <button onClick={() => setShowAddTask(false)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">Titre *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Ex: Faire le montage de Mohamed"
                  required
                  data-testid="task-title-input"
                />
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24 resize-none"
                  placeholder="Détails de la tâche..."
                  data-testid="task-description-input"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Date d'échéance *</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    required
                    data-testid="task-due-date-input"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Priorité</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                    data-testid="task-priority-select"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-1">Responsable de la tâche</label>
                <p className="text-white/40 text-xs mb-2">Administrateur(s) qui réaliseront cette tâche</p>
                <div className="space-y-2 max-h-32 overflow-y-auto bg-white/5 rounded-lg p-3">
                  {teamUsers.map(user => (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.assigned_to.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({ ...newTask, assigned_to: [...newTask.assigned_to, user.id] });
                          } else {
                            setNewTask({ ...newTask, assigned_to: newTask.assigned_to.filter(id => id !== user.id) });
                          }
                        }}
                        className="rounded border-white/20"
                      />
                      <span className="text-white">{user.name}</span>
                      <span className="text-white/40 text-sm">({user.role === "complet" ? "Admin complet" : user.role === "editeur" ? "Éditeur" : "Lecteur"})</span>
                    </label>
                  ))}
                  {teamUsers.length === 0 && (
                    <p className="text-white/40 text-sm">Aucun administrateur disponible. Créez des comptes admin dans l'onglet Sécurité.</p>
                  )}
                </div>
              </div>
              
              {/* Reminders */}
              <div>
                <label className="block text-white/60 text-sm mb-2">Rappels par e-mail</label>
                <div className="space-y-2">
                  {[
                    { days: 1, label: "1 jour avant" },
                    { days: 0, label: "Le jour même" },
                    { days: -1, label: "1 jour après (si non fait)" }
                  ].map(({ days, label }) => (
                    <label key={days} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newTask.reminders.some(r => r.days_before === days && r.enabled)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTask({
                              ...newTask,
                              reminders: [...newTask.reminders.filter(r => r.days_before !== days), { days_before: days, enabled: true }]
                            });
                          } else {
                            setNewTask({
                              ...newTask,
                              reminders: newTask.reminders.filter(r => r.days_before !== days)
                            });
                          }
                        }}
                        className="rounded border-white/20"
                      />
                      <Bell className="w-4 h-4 text-primary" />
                      <span className="text-white">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/80"
                  data-testid="create-task-btn"
                >
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="edit-task-modal">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-white/10 p-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Modifier la tâche</h2>
              <button onClick={() => setEditingTask(null)} className="text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-1">Titre *</label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-1">Description</label>
                <textarea
                  value={editingTask.description || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-24 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-white/60 text-sm mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={editingTask.due_date}
                    onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Priorité</label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-white/60 text-sm mb-1">Statut</label>
                  <select
                    value={editingTask.status}
                    onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-2 text-white [&>option]:bg-[#1a1a1a] [&>option]:text-white"
                  >
                    <option value="pending">En attente</option>
                    <option value="in_progress">En cours</option>
                    <option value="completed">Terminée</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-white/60 text-sm mb-1">Assigner à</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {teamUsers.map(user => (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingTask.assigned_to?.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditingTask({ ...editingTask, assigned_to: [...(editingTask.assigned_to || []), user.id] });
                          } else {
                            setEditingTask({ ...editingTask, assigned_to: (editingTask.assigned_to || []).filter(id => id !== user.id) });
                          }
                        }}
                        className="rounded border-white/20"
                      />
                      <span className="text-white">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Progress comment for assigned user */}
              <div className="border-t border-white/10 pt-4">
                <label className="block text-white/60 text-sm mb-1">Commentaire de progression</label>
                <textarea
                  value={editingTask.progress_comment || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, progress_comment: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-20 resize-none"
                  placeholder="Ex: En cours à 80%, bloqué sur le rendu vidéo..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg text-white hover:bg-white/5"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex-1 px-4 py-2 bg-primary text-black rounded-lg font-medium hover:bg-primary/80 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid="update-task-btn"
                >
                  {saving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
