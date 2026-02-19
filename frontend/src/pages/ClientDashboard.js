import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Video, Image, FileText, Download, LogOut, FolderOpen, Check, X, Camera, ZoomIn, ChevronLeft, ChevronRight, FileArchive, User, Settings, Lock, Upload, Loader, Bell, Music, File, CreditCard, Receipt, Euro, Trash2, UploadCloud, FileDown } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import ClientChat from "../components/ClientChat";

const ClientDashboard = () => {
  const [files, setFiles] = useState([]);
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("galleries");
  const [clientUser, setClientUser] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Profile states
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ name: "", phone: "" });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: "", new: "", confirm: "" });
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(true);
  const [updatingNewsletter, setUpdatingNewsletter] = useState(false);
  const profilePhotoRef = useRef(null);
  
  // New states for devis/invoices/payments/transfers
  const [myDevis, setMyDevis] = useState([]);
  const [myInvoices, setMyInvoices] = useState([]);
  const [myPayments, setMyPayments] = useState({ total_amount: 0, total_paid: 0, remaining: 0, payments: [] });
  const [myTransfers, setMyTransfers] = useState({ music: [], documents: [], photos: [] });
  const [uploadingTransfer, setUploadingTransfer] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMustChangePassword, setShowMustChangePassword] = useState(false);
  const [forcePasswordData, setForcePasswordData] = useState({ current: "", new: "", confirm: "" });
  
  const navigate = useNavigate();
  const token = localStorage.getItem("client_token");
  const headers = { Authorization: `Bearer ${token}` };

  // Heartbeat to track online status
  const sendHeartbeat = useCallback(async () => {
    if (!token) return;
    try {
      await axios.post(`${API}/client/activity/heartbeat`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (e) {
      // Silently fail
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/client");
      return;
    }
    const user = JSON.parse(localStorage.getItem("client_user") || "{}");
    setClientUser(user);
    setProfileData({ name: user.name || "", phone: user.phone || "" });
    
    // Check if must change password
    if (user.must_change_password) {
      setShowMustChangePassword(true);
    }
    
    fetchData();
    
    // Send heartbeat immediately and then every 2 minutes
    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 120000);
    
    return () => clearInterval(heartbeatInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, navigate]);

  const fetchData = async () => {
    try {
      const [filesRes, galleriesRes, meRes] = await Promise.all([
        axios.get(`${API}/client/files`, { headers }),
        axios.get(`${API}/client/galleries`, { headers }),
        axios.get(`${API}/client/me`, { headers }).catch(() => ({ data: null }))
      ]);
      setFiles(filesRes.data);
      setGalleries(galleriesRes.data);
      if (meRes.data) {
        // Update client user with latest data from server
        setClientUser(prev => ({ ...prev, ...meRes.data }));
        setNewsletterSubscribed(meRes.data.newsletter_subscribed !== false);
        // Check if must change password
        if (meRes.data.must_change_password) {
          setShowMustChangePassword(true);
        }
        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem("client_user") || "{}");
        localStorage.setItem("client_user", JSON.stringify({ ...storedUser, ...meRes.data }));
      }
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("client_token");
        navigate("/client");
      }
    } finally {
      setLoading(false);
    }
  };

  // Track file download
  const trackDownload = async (fileId) => {
    try {
      await axios.post(`${API}/client/files/${fileId}/download`, {}, { headers });
    } catch (e) {
      // Silently fail
    }
  };

  const handleDownload = (file) => {
    trackDownload(file.id);
    const url = file.file_url.startsWith('http') ? file.file_url : `${BACKEND_URL}${file.file_url}`;
    window.open(url, '_blank');
  };

  const openGallery = async (gallery) => {
    try {
      const res = await axios.get(`${API}/client/galleries/${gallery.id}`, { headers });
      setSelectedGallery(res.data);
      setSelectedPhotos(res.data.selected_photo_ids || []);
      setIsValidated(res.data.is_validated || false);
    } catch (e) {
      toast.error("Erreur lors du chargement de la galerie");
    }
  };

  const togglePhotoSelection = (photoId, e) => {
    e.stopPropagation();
    if (isValidated) return;
    
    setSelectedPhotos((prev) => 
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const saveSelection = async () => {
    try {
      await axios.put(`${API}/client/galleries/${selectedGallery.id}/selection`, {
        selected_photo_ids: selectedPhotos
      }, { headers });
      toast.success("Sélection enregistrée !");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const validateSelection = async () => {
    if (selectedPhotos.length === 0) {
      toast.error("Veuillez sélectionner au moins une photo");
      return;
    }
    try {
      await axios.put(`${API}/client/galleries/${selectedGallery.id}/validate`, {
        selected_photo_ids: selectedPhotos
      }, { headers });
      setIsValidated(true);
      toast.success("Sélection validée ! Nous allons préparer vos photos.");
    } catch (e) {
      toast.error("Erreur lors de la validation");
    }
  };

  const logout = () => {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_user");
    navigate("/client");
  };

  // Profile functions
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/client/profile/photo`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const updatedUser = { ...clientUser, profile_photo: res.data.photo_url };
      setClientUser(updatedUser);
      localStorage.setItem("client_user", JSON.stringify(updatedUser));
      toast.success("Photo de profil mise à jour !");
    } catch (e) {
      toast.error("Erreur lors de l'upload de la photo");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const res = await axios.put(`${API}/client/profile`, profileData, { headers });
      setClientUser(prev => ({ ...prev, ...res.data.client }));
      localStorage.setItem("client_user", JSON.stringify({ ...clientUser, ...res.data.client }));
      setEditingProfile(false);
      toast.success("Profil mis à jour !");
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    try {
      await axios.put(`${API}/client/password`, {
        current_password: passwordData.current,
        new_password: passwordData.new
      }, { headers });
      setChangingPassword(false);
      setPasswordData({ current: "", new: "", confirm: "" });
      toast.success("Mot de passe modifié !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du changement de mot de passe");
    }
  };

  const handleToggleNewsletter = async () => {
    setUpdatingNewsletter(true);
    try {
      const newValue = !newsletterSubscribed;
      await axios.put(`${API}/client/newsletter`, { subscribed: newValue }, { headers });
      setNewsletterSubscribed(newValue);
      toast.success(newValue ? "Vous êtes abonné à la newsletter" : "Vous êtes désabonné de la newsletter");
    } catch (e) {
      toast.error("Erreur lors de la mise à jour des préférences");
    } finally {
      setUpdatingNewsletter(false);
    }
  };

  // Fetch devis, invoices, payments, transfers
  const fetchDevisData = async () => {
    try {
      const [devisRes, invoicesRes, paymentsRes, transfersRes] = await Promise.all([
        axios.get(`${API}/client/my-devis`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/client/my-invoices`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/client/my-payments`, { headers }).catch(() => ({ data: { total_amount: 0, total_paid: 0, remaining: 0, payments: [] } })),
        axios.get(`${API}/client/transfers`, { headers }).catch(() => ({ data: { music: [], documents: [], photos: [] } }))
      ]);
      setMyDevis(devisRes.data);
      setMyInvoices(invoicesRes.data);
      setMyPayments(paymentsRes.data);
      setMyTransfers(transfersRes.data);
    } catch (e) {
      console.error("Error fetching devis data:", e);
    }
  };

  // Load devis data when switching to relevant tabs
  useEffect(() => {
    if (["devis", "invoices", "payments", "transfers"].includes(activeTab)) {
      fetchDevisData();
    }
  }, [activeTab]);

  // Upload file transfer (supports multiple files)
  const handleFileTransfer = async (fileType, files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
    
    // Check file sizes
    for (const file of fileArray) {
      if (file.size > MAX_SIZE) {
        toast.error(`Fichier "${file.name}" trop volumineux. Maximum 5 Go.`);
        return;
      }
    }
    
    setUploadingTransfer(true);
    setUploadProgress(0);
    
    let uploaded = 0;
    const total = fileArray.length;
    
    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append("file", file);
        
        await axios.post(`${API}/client/transfer/${fileType}`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const fileProgress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const overallProgress = Math.round(((uploaded * 100) + fileProgress) / total);
            setUploadProgress(overallProgress);
          }
        });
        uploaded++;
        setUploadProgress(Math.round((uploaded * 100) / total));
      }
      toast.success(`${total} fichier(s) uploadé(s) avec succès !`);
      fetchDevisData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploadingTransfer(false);
      setUploadProgress(0);
    }
  };

  // Delete file transfer
  const handleDeleteTransfer = async (fileId) => {
    if (!window.confirm("Supprimer ce fichier ?")) return;
    try {
      await axios.delete(`${API}/client/transfer/${fileId}`, { headers });
      toast.success("Fichier supprimé");
      fetchDevisData();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Force password change handler
  const handleForcePasswordChange = async () => {
    if (forcePasswordData.new !== forcePasswordData.confirm) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    if (forcePasswordData.new.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    try {
      await axios.put(`${API}/client/password`, {
        current_password: forcePasswordData.current,
        new_password: forcePasswordData.new
      }, { headers });
      setShowMustChangePassword(false);
      // Update localStorage
      const user = JSON.parse(localStorage.getItem("client_user") || "{}");
      user.must_change_password = false;
      localStorage.setItem("client_user", JSON.stringify(user));
      toast.success("Mot de passe modifié avec succès !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du changement de mot de passe");
    }
  };

  // Lightbox navigation
  const openLightbox = (photo, index) => {
    setLightboxPhoto(photo);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPhoto(null);
  };

  const navigateLightbox = (direction) => {
    if (!selectedGallery) return;
    const photos = selectedGallery.photos || [];
    let newIndex = lightboxIndex + direction;
    if (newIndex < 0) newIndex = photos.length - 1;
    if (newIndex >= photos.length) newIndex = 0;
    setLightboxIndex(newIndex);
    setLightboxPhoto(photos[newIndex]);
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Chargement...</p>
        </div>
      </div>
    );
  }

  const videos = files.filter((f) => f.file_type === "video");
  const photos = files.filter((f) => f.file_type === "photo");
  const documents = files.filter((f) => f.file_type === "document");

  const profilePhotoUrl = clientUser?.profile_photo 
    ? (clientUser.profile_photo.startsWith('http') ? clientUser.profile_photo : `${BACKEND_URL}${clientUser.profile_photo}`)
    : null;

  return (
    <div className="pt-20 min-h-screen" data-testid="client-dashboard">
      {/* Header with profile */}
      <div className="bg-card border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Profile Section */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} className="text-primary" />
                  )}
                </div>
                <input
                  type="file"
                  ref={profilePhotoRef}
                  onChange={handleProfilePhotoUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <button
                  onClick={() => profilePhotoRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center hover:bg-primary/80 transition-colors"
                >
                  {uploadingPhoto ? (
                    <Loader size={14} className="animate-spin text-black" />
                  ) : (
                    <Camera size={14} className="text-black" />
                  )}
                </button>
              </div>
              <div>
                <h1 className="font-primary font-bold text-xl">{clientUser?.name || "Client"}</h1>
                <p className="text-white/60 text-sm">{clientUser?.email}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[
                { id: "galleries", label: "Galeries", icon: FolderOpen },
                { id: "files", label: "Fichiers", icon: FileText },
                { id: "transfers", label: "Transferts", icon: UploadCloud },
                { id: "devis", label: "Devis", icon: Receipt },
                { id: "invoices", label: "Factures", icon: File },
                { id: "payments", label: "Paiements", icon: Euro },
                { id: "settings", label: "Paramètres", icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  data-testid={`tab-${id}`}
                  className={`flex items-center gap-2 px-4 py-2 transition-colors ${
                    activeTab === id 
                      ? "bg-primary text-black font-bold" 
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
              <button onClick={logout} className="btn-outline px-4 py-2 flex items-center gap-2 text-red-400 border-red-400 hover:bg-red-400/10">
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Profile Edit */}
            <div className="bg-card border border-white/10 p-6">
              <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-2">
                <User size={20} className="text-primary" /> Mon Profil
              </h2>
              
              {editingProfile ? (
                <div className="space-y-4">
                  <div>
                    <label className="block font-primary text-sm mb-2">Nom complet</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-primary text-sm mb-2">Téléphone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingProfile(false)} className="btn-outline flex-1 py-3">
                      Annuler
                    </button>
                    <button onClick={handleSaveProfile} className="btn-primary flex-1 py-3">
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/60">Nom</span>
                    <span className="font-semibold">{clientUser?.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/60">Email</span>
                    <span className="font-semibold">{clientUser?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/60">Téléphone</span>
                    <span className="font-semibold">{clientUser?.phone || "Non renseigné"}</span>
                  </div>
                  <button
                    onClick={() => {
                      setProfileData({ name: clientUser?.name || "", phone: clientUser?.phone || "" });
                      setEditingProfile(true);
                    }}
                    className="btn-outline w-full py-3"
                  >
                    Modifier mon profil
                  </button>
                </div>
              )}
            </div>

            {/* Password Change */}
            <div className="bg-card border border-white/10 p-6">
              <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-2">
                <Lock size={20} className="text-primary" /> Sécurité
              </h2>
              
              {changingPassword ? (
                <div className="space-y-4">
                  <div>
                    <label className="block font-primary text-sm mb-2">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-primary text-sm mb-2">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-primary text-sm mb-2">Confirmer le nouveau mot de passe</label>
                    <input
                      type="password"
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setChangingPassword(false); setPasswordData({ current: "", new: "", confirm: "" }); }} className="btn-outline flex-1 py-3">
                      Annuler
                    </button>
                    <button onClick={handleChangePassword} className="btn-primary flex-1 py-3">
                      Changer le mot de passe
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChangingPassword(true)} className="btn-outline w-full py-3 flex items-center justify-center gap-2">
                  <Lock size={16} /> Changer mon mot de passe
                </button>
              )}
            </div>

            {/* Newsletter Preferences */}
            <div className="bg-card border border-white/10 p-6">
              <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-2">
                <Bell size={20} className="text-primary" /> Notifications
              </h2>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold">Newsletter</p>
                  <p className="text-sm text-white/60">Recevez un email lors de nouvelles vidéos ou stories</p>
                </div>
                <button
                  onClick={handleToggleNewsletter}
                  disabled={updatingNewsletter}
                  data-testid="newsletter-toggle"
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                    newsletterSubscribed ? 'bg-primary' : 'bg-white/20'
                  } ${updatingNewsletter ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span 
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                      newsletterSubscribed ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <p className="text-xs text-white/40 mt-4">
                {newsletterSubscribed 
                  ? "✓ Vous êtes abonné aux notifications par email"
                  : "Vous ne recevrez pas de notifications par email"}
              </p>
            </div>
          </div>
        )}

        {/* Transfers Tab */}
        {activeTab === "transfers" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">📤 Transférer des fichiers</h2>
            <p className="text-white/60 text-sm mb-6">
              Envoyez-nous vos fichiers (musiques, documents, photos, vidéos). Maximum 5 Go par fichier.
            </p>

            {/* Upload Progress */}
            {uploadingTransfer && (
              <div className="bg-primary/20 border border-primary p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Loader className="animate-spin text-primary" size={20} />
                  <span>Upload en cours... {uploadProgress}%</span>
                </div>
                <div className="w-full bg-white/20 h-2 mt-2 rounded">
                  <div className="bg-primary h-2 rounded transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Music */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Music size={20} className="text-primary" /> Musiques
                </h3>
                <p className="text-white/40 text-xs mb-4">MP3, WAV, M4A, FLAC, AAC, OGG</p>
                <label className="btn-outline w-full py-3 cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={16} /> Ajouter des musiques
                  <input
                    type="file"
                    accept=".mp3,.wav,.m4a,.flac,.aac,.ogg"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileTransfer("music", e.target.files)}
                    disabled={uploadingTransfer}
                  />
                </label>
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {myTransfers.music.map((file) => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                      <span className="text-sm truncate flex-1">{file.original_name}</span>
                      <button onClick={() => handleDeleteTransfer(file.id)} className="text-red-400 hover:text-red-300 ml-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {myTransfers.music.length === 0 && <p className="text-white/30 text-xs text-center py-2">Aucune musique</p>}
                </div>
              </div>

              {/* Documents */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-primary" /> Documents
                </h3>
                <p className="text-white/40 text-xs mb-4">PDF, DOC, DOCX, TXT, ZIP, RAR</p>
                <label className="btn-outline w-full py-3 cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={16} /> Ajouter des documents
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileTransfer("documents", e.target.files)}
                    disabled={uploadingTransfer}
                  />
                </label>
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {myTransfers.documents.map((file) => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                      <span className="text-sm truncate flex-1">{file.original_name}</span>
                      <button onClick={() => handleDeleteTransfer(file.id)} className="text-red-400 hover:text-red-300 ml-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {myTransfers.documents.length === 0 && <p className="text-white/30 text-xs text-center py-2">Aucun document</p>}
                </div>
              </div>

              {/* Photos */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Image size={20} className="text-primary" /> Photos
                </h3>
                <p className="text-white/40 text-xs mb-4">JPG, PNG, GIF, WEBP, HEIC</p>
                <label className="btn-outline w-full py-3 cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={16} /> Ajouter une photo
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.heic"
                    className="hidden"
                    onChange={(e) => handleFileTransfer("photos", e.target.files[0])}
                    disabled={uploadingTransfer}
                  />
                </label>
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {myTransfers.photos.map((file) => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                      <span className="text-sm truncate flex-1">{file.original_name}</span>
                      <button onClick={() => handleDeleteTransfer(file.id)} className="text-red-400 hover:text-red-300 ml-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {myTransfers.photos.length === 0 && <p className="text-white/30 text-xs text-center py-2">Aucune photo</p>}
                </div>
              </div>

              {/* Videos */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Video size={20} className="text-primary" /> Vidéos
                </h3>
                <p className="text-white/40 text-xs mb-4">MP4, MOV, AVI, MKV, WEBM</p>
                <label className="btn-outline w-full py-3 cursor-pointer flex items-center justify-center gap-2">
                  <Upload size={16} /> Ajouter une vidéo
                  <input
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    className="hidden"
                    onChange={(e) => handleFileTransfer("videos", e.target.files[0])}
                    disabled={uploadingTransfer}
                  />
                </label>
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {(myTransfers.videos || []).map((file) => (
                    <div key={file.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                      <span className="text-sm truncate flex-1">{file.original_name}</span>
                      <button onClick={() => handleDeleteTransfer(file.id)} className="text-red-400 hover:text-red-300 ml-2">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(!myTransfers.videos || myTransfers.videos.length === 0) && <p className="text-white/30 text-xs text-center py-2">Aucune vidéo</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Devis Tab */}
        {activeTab === "devis" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">📋 Mes Devis</h2>
            {myDevis.length === 0 ? (
              <div className="bg-card border border-white/10 p-8 text-center">
                <Receipt size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/60">Aucun devis pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myDevis.map((devis) => (
                  <div key={devis.devis_id} className="bg-card border border-white/10 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h3 className="font-bold text-lg">Devis #{devis.devis_id?.slice(-8)}</h3>
                        {devis.event_type && <p className="text-white/60 text-sm">{devis.event_type}</p>}
                        {devis.event_date && <p className="text-white/40 text-sm">📅 {devis.event_date}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{devis.total_amount}€</p>
                          <span className={`text-xs px-2 py-1 rounded ${
                            devis.status === "accepted" ? "bg-green-500/20 text-green-400" :
                            devis.status === "rejected" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {devis.status === "accepted" ? "Accepté" : devis.status === "rejected" ? "Refusé" : "En attente"}
                          </span>
                        </div>
                        <a
                          href={`${API}/client/devis/${devis.devis_id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.preventDefault();
                            // Download with auth
                            fetch(`${API}/client/devis/${devis.devis_id}/pdf`, { headers })
                              .then(res => res.blob())
                              .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Devis_${devis.devis_id?.slice(-8)}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                a.remove();
                              })
                              .catch(() => toast.error("Erreur lors du téléchargement"));
                          }}
                          className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                          data-testid={`download-devis-${devis.devis_id}`}
                        >
                          <FileDown size={16} /> PDF
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">🧾 Mes Factures</h2>
            {myInvoices.length === 0 ? (
              <div className="bg-card border border-white/10 p-8 text-center">
                <File size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-white/60">Aucune facture pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myInvoices.map((invoice) => (
                  <div key={invoice.invoice_id} className="bg-card border border-white/10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-bold">Facture N° {invoice.invoice_number}</h3>
                      <p className="text-white/40 text-sm">📅 {invoice.invoice_date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-primary">{invoice.amount}€</p>
                      <a
                        href={`${API}/client/invoice/${invoice.invoice_id}/pdf`}
                        onClick={(e) => {
                          e.preventDefault();
                          // Download with auth
                          fetch(`${API}/client/invoice/${invoice.invoice_id}/pdf`, { headers })
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Facture_${invoice.invoice_number || invoice.invoice_id?.slice(-8)}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              a.remove();
                            })
                            .catch(() => toast.error("Erreur lors du téléchargement"));
                        }}
                        className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                        data-testid={`download-invoice-${invoice.invoice_id}`}
                      >
                        <Download size={16} /> Télécharger PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">💰 Mes Paiements</h2>
            
            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-white/10 p-6 text-center">
                <p className="text-white/60 text-sm mb-1">Total Devis</p>
                <p className="text-3xl font-bold text-white">{myPayments.total_amount}€</p>
              </div>
              <div className="bg-card border border-white/10 p-6 text-center">
                <p className="text-white/60 text-sm mb-1">Déjà Payé</p>
                <p className="text-3xl font-bold text-green-500">{myPayments.total_paid}€</p>
              </div>
              <div className="bg-card border border-white/10 p-6 text-center">
                <p className="text-white/60 text-sm mb-1">Reste à Payer</p>
                <p className="text-3xl font-bold text-primary">{myPayments.remaining}€</p>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-4">Historique des paiements</h3>
              {myPayments.payments.length === 0 ? (
                <p className="text-white/40 text-center py-4">Aucun paiement enregistré</p>
              ) : (
                <div className="space-y-3">
                  {myPayments.payments.map((payment) => (
                    <div key={payment.payment_id} className="flex justify-between items-center py-3 px-4 bg-background border border-white/10">
                      <div>
                        <p className="font-semibold">{payment.amount}€</p>
                        <p className="text-white/40 text-sm">{payment.payment_date}</p>
                      </div>
                      <div className="text-right">
                        {payment.payment_method && <p className="text-white/60 text-sm">{payment.payment_method}</p>}
                        <span className="text-green-400 text-xs">✓ Payé</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Galleries Tab */}
        {activeTab === "galleries" && (
          <>
            {selectedGallery ? (
              <div>
                <button
                  onClick={() => setSelectedGallery(null)}
                  className="flex items-center gap-2 text-white/60 hover:text-primary mb-6"
                >
                  <ChevronLeft size={20} /> Retour aux galeries
                </button>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="font-primary font-bold text-2xl">{selectedGallery.name}</h2>
                    {selectedGallery.description && (
                      <p className="text-white/60 mt-1">{selectedGallery.description}</p>
                    )}
                  </div>
                  {!isValidated && (
                    <div className="flex gap-2">
                      <button
                        onClick={saveSelection}
                        className="btn-outline px-4 py-2 text-sm"
                      >
                        Sauvegarder ({selectedPhotos.length})
                      </button>
                      <button
                        onClick={validateSelection}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Valider ma sélection
                      </button>
                    </div>
                  )}
                  {isValidated && (
                    <span className="bg-green-500/20 text-green-400 px-4 py-2 text-sm flex items-center gap-2">
                      <Check size={16} /> Sélection validée
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(selectedGallery.photos || []).map((photo, index) => (
                    <div
                      key={photo.id}
                      className={`relative group cursor-pointer border-2 transition-colors ${
                        selectedPhotos.includes(photo.id) ? "border-primary" : "border-transparent"
                      }`}
                      onClick={(e) => togglePhotoSelection(photo.id, e)}
                    >
                      <div className="aspect-square bg-black/50 overflow-hidden">
                        <img
                          src={`${BACKEND_URL}${photo.url}`}
                          alt={photo.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {!isValidated && (
                        <div className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          selectedPhotos.includes(photo.id) ? "bg-primary text-black" : "bg-black/50 text-white"
                        }`}>
                          {selectedPhotos.includes(photo.id) ? <Check size={16} /> : <span className="text-xs">+</span>}
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openLightbox(photo, index); }}
                        className="absolute bottom-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ZoomIn size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="font-primary font-bold text-xl mb-6">Mes Galeries</h2>
                {galleries.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {galleries.map((gallery) => (
                      <button
                        key={gallery.id}
                        onClick={() => openGallery(gallery)}
                        className="bg-card border border-white/10 p-6 text-left card-hover"
                      >
                        <div className="flex items-center gap-4">
                          <FolderOpen className="text-primary" size={32} />
                          <div>
                            <h3 className="font-primary font-semibold">{gallery.name}</h3>
                            <p className="text-white/60 text-sm">
                              {gallery.photo_count || 0} photos
                              {gallery.is_validated && " • Validée"}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-white/60 py-12">Aucune galerie disponible</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Files Tab */}
        {activeTab === "files" && (
          <div>
            {files.length === 0 ? (
              <p className="text-center text-white/60 py-12">Aucun fichier disponible</p>
            ) : (
              <>
                {/* Videos Section */}
                {videos.length > 0 && (
                  <section className="mb-12">
                    <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                      <Video className="text-primary" size={24} /> Mes Vidéos
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.map((file) => (
                        <div key={file.id} className="bg-card border border-white/10 overflow-hidden card-hover">
                          <div className="relative aspect-video bg-black/50 flex items-center justify-center">
                            {file.thumbnail_url ? (
                              <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                            ) : (
                              <Video size={48} className="text-white/30" />
                            )}
                          </div>
                          <div className="p-4">
                            <h3 className="font-primary font-semibold mb-1">{file.title}</h3>
                            {file.description && <p className="text-white/60 text-sm mb-3">{file.description}</p>}
                            <button
                              onClick={() => handleDownload(file)}
                              className="btn-primary w-full py-2 text-xs inline-flex items-center justify-center gap-2"
                            >
                              <Download size={14} /> Télécharger / Voir
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Photos Section */}
                {photos.length > 0 && (
                  <section className="mb-12">
                    <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                      <Image className="text-primary" size={24} /> Mes Photos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {photos.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleDownload(file)}
                          className="block bg-card border border-white/10 overflow-hidden card-hover group text-left"
                        >
                          <div className="relative aspect-square bg-black/50">
                            {file.thumbnail_url ? (
                              <img src={file.thumbnail_url} alt={file.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image size={32} className="text-white/30" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Download size={24} className="text-primary" />
                            </div>
                          </div>
                          <div className="p-3">
                            <h3 className="font-primary font-semibold text-sm truncate">{file.title}</h3>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Documents Section */}
                {documents.length > 0 && (
                  <section>
                    <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-3">
                      <FileText className="text-primary" size={24} /> Documents
                    </h2>
                    <div className="space-y-4">
                      {documents.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleDownload(file)}
                          className="w-full text-left bg-card border border-white/10 p-4 card-hover flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            {file.file_url.endsWith('.zip') || file.file_url.endsWith('.rar') ? (
                              <FileArchive className="text-primary" size={24} />
                            ) : (
                              <FileText className="text-primary" size={24} />
                            )}
                            <div>
                              <h3 className="font-primary font-semibold">{file.title}</h3>
                              {file.description && <p className="text-white/60 text-sm">{file.description}</p>}
                            </div>
                          </div>
                          <Download size={20} className="text-white/60" />
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/60 hover:text-white">
            <X size={32} />
          </button>
          <button onClick={() => navigateLightbox(-1)} className="absolute left-4 text-white/60 hover:text-white">
            <ChevronLeft size={48} />
          </button>
          <button onClick={() => navigateLightbox(1)} className="absolute right-4 text-white/60 hover:text-white">
            <ChevronRight size={48} />
          </button>
          <img
            src={`${BACKEND_URL}${lightboxPhoto.url}`}
            alt={lightboxPhoto.filename}
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}

      {/* Force Password Change Modal */}
      {showMustChangePassword && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <Lock size={48} className="mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold">Changement de mot de passe requis</h2>
              <p className="text-white/60 text-sm mt-2">
                Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/60 mb-1">Mot de passe actuel (temporaire)</label>
                <input
                  type="password"
                  value={forcePasswordData.current}
                  onChange={(e) => setForcePasswordData(prev => ({ ...prev, current: e.target.value }))}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="Mot de passe reçu par email"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={forcePasswordData.new}
                  onChange={(e) => setForcePasswordData(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="Minimum 6 caractères"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={forcePasswordData.confirm}
                  onChange={(e) => setForcePasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                  placeholder="Confirmer votre nouveau mot de passe"
                />
              </div>
              <button
                onClick={handleForcePasswordChange}
                disabled={!forcePasswordData.current || !forcePasswordData.new || !forcePasswordData.confirm}
                className="btn-primary w-full py-3 mt-4 disabled:opacity-50"
              >
                Changer mon mot de passe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
