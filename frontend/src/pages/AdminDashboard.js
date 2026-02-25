import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Check, Camera, Mic, Tv, X, Clock, Users, FileText, Image, Video, Plus, Minus, User, LogOut, Upload, Loader, Download, Eye, Printer, ArrowLeft, Shield, Trash2, MessageSquare, FileArchive, AlertTriangle, CreditCard, Phone, ClipboardList, Heart, MessageCircle, Music, BookOpen, QrCode, Copy, HardDrive } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import TaskManager from "../components/admin/TaskManager";
import ProjectTracker from "../components/admin/ProjectTracker";
import TeamChat from "../components/admin/TeamChat";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import AdminChat from "../components/AdminChat";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [storageStats, setStorageStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [services, setServices] = useState([]);
  const [weddingOptions, setWeddingOptions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientFiles, setClientFiles] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentModalClient, setDocumentModalClient] = useState(null);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({ type: "invoice", title: "", amount: "", description: "", due_date: "", file: null });
  const [newClient, setNewClient] = useState({ name: "", email: "", password: "", phone: "" });
  const [newFile, setNewFile] = useState({ title: "", description: "", file_type: "video", file_url: "", thumbnail_url: "" });
  const [newPortfolioItem, setNewPortfolioItem] = useState({ title: "", description: "", media_type: "photo", media_url: "", thumbnail_url: "", category: "wedding", client_name: "", is_featured: false, story_duration: 3 });
  const [siteContent, setSiteContent] = useState(null);
  const [editingContent, setEditingContent] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [editingService, setEditingService] = useState(null);
  const [editingOption, setEditingOption] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [appointmentResponse, setAppointmentResponse] = useState({ status: "", admin_response: "", new_proposed_date: "", new_proposed_time: "" });
  const [showAddOption, setShowAddOption] = useState(false);
  const [newOption, setNewOption] = useState({ name: "", description: "", price: 0, category: "coverage" });
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  // Client file transfer states
  const [showClientFileTransfer, setShowClientFileTransfer] = useState(null); // client object or null
  const [clientTransfers, setClientTransfers] = useState({ music: [], documents: [], photos: [], videos: [] });
  const [uploadingToClient, setUploadingToClient] = useState(false);
  const [uploadToClientProgress, setUploadToClientProgress] = useState(0);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingMultiplePhotos, setUploadingMultiplePhotos] = useState(false);
  const [multiplePhotosProgress, setMultiplePhotosProgress] = useState({ current: 0, total: 0 });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingClientFileThumbnail, setUploadingClientFileThumbnail] = useState(false);
  const [uploadingClientFile, setUploadingClientFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [recentDownloads, setRecentDownloads] = useState([]);
  const [clientDownloads, setClientDownloads] = useState([]);
  const portfolioFileRef = useRef(null);
  const multiplePhotosRef = useRef(null);
  const clientFileRef = useRef(null);
  const contentFileRef = useRef(null);
  const [uploadingContentImage, setUploadingContentImage] = useState(false);
  const [currentContentField, setCurrentContentField] = useState(null);
  const [bankDetails, setBankDetails] = useState({ iban: "", bic: "", account_holder: "", bank_name: "", deposit_percentage: 30 });
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loadingQuoteDetail, setLoadingQuoteDetail] = useState(false);
  const quoteDetailRef = useRef(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  // Portfolio view states
  const [portfolioViewMode, setPortfolioViewMode] = useState("clients"); // "clients" or "all"
  const [selectedPortfolioClient, setSelectedPortfolioClient] = useState(null);
  const [portfolioFilterCategory, setPortfolioFilterCategory] = useState("all");
  // Gallery states
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [newGallery, setNewGallery] = useState({ client_id: "", name: "", description: "" });
  const [uploadingGalleryPhoto, setUploadingGalleryPhoto] = useState(false);
  const [uploadingGalleryMusic, setUploadingGalleryMusic] = useState(false);
  const [gallerySelection, setGallerySelection] = useState(null);
  const galleryFileRef = useRef(null);
  const galleryMusicRef = useRef(null);
  // MFA states
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, backup_codes_remaining: 0 });
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableMfaData, setDisableMfaData] = useState({ password: "", code: "" });
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  // Story views state
  const [storyViews, setStoryViews] = useState({});
  const [selectedStoryViews, setSelectedStoryViews] = useState(null);
  // Newsletter states
  const [newsletterStats, setNewsletterStats] = useState(null);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState({ subscribers: [], unsubscribers: [] });
  const [newsletterForm, setNewsletterForm] = useState({ subject: "", message: "" });
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [loadingNewsletter, setLoadingNewsletter] = useState(false);
  // Deployment states
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [deploymentHistory, setDeploymentHistory] = useState([]);
  const [loadingDeployment, setLoadingDeployment] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState([]);
  // Backup reminder state
  const [backupStatus, setBackupStatus] = useState(null);
  const [backupProgress, setBackupProgress] = useState({ active: false, step: '', progress: 0 });
  // Guestbook states
  const [guestbooks, setGuestbooks] = useState([]);
  const [selectedGuestbook, setSelectedGuestbook] = useState(null);
  const [showAddGuestbook, setShowAddGuestbook] = useState(false);
  const [newGuestbook, setNewGuestbook] = useState({ client_id: "", name: "", event_date: "", welcome_message: "" });
  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Admin management state
  const [adminsList, setAdminsList] = useState([]);
  const [newAdminData, setNewAdminData] = useState({ name: "", email: "", password: "" });
  // Current logged in admin
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  // Extension orders state
  const [extensionOrders, setExtensionOrders] = useState([]);
  const [archivedClients, setArchivedClients] = useState([]);
  // Testimonials state
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(false);
  // Welcome popup state
  const [welcomePopup, setWelcomePopup] = useState(null);
  const [uploadingPopupVideo, setUploadingPopupVideo] = useState(false);
  const welcomeVideoRef = useRef(null);
  // News/Actualités state
  const [newsPosts, setNewsPosts] = useState([]);
  const [loadingNews, setLoadingNews] = useState(false);
  const [pendingComments, setPendingComments] = useState([]);
  const [newPostCaption, setNewPostCaption] = useState("");
  const [newPostLocation, setNewPostLocation] = useState("");
  const [uploadingNewsMedia, setUploadingNewsMedia] = useState(false);
  const newsMediaRef = useRef(null);
  // Billing/Facturation state
  const [renewalInvoices, setRenewalInvoices] = useState([]);
  const [billingStats, setBillingStats] = useState({ total_revenue: 0, total_invoices: 0 });
  const [loadingBilling, setLoadingBilling] = useState(false);
  // Client expiration modal state
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [expirationClient, setExpirationClient] = useState(null);
  const [expirationOption, setExpirationOption] = useState("6_months");
  const [customDays, setCustomDays] = useState(30);
  const [updatingExpiration, setUpdatingExpiration] = useState(false);
  // Renewal requests state
  const [renewalRequests, setRenewalRequests] = useState([]);
  const [loadingRenewals, setLoadingRenewals] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    fetchCurrentAdmin();
    fetchData();
    fetchBankDetails();
    fetchMfaStatus();
    fetchStoryViews();
    fetchBackupStatus();
    fetchUnreadMessages();
    fetchAdminsList();
    fetchExtensionOrders();
  }, [token]);

  // Fetch current admin info
  const fetchCurrentAdmin = async () => {
    try {
      const res = await axios.get(`${API}/admin/me`, { headers });
      setCurrentAdmin(res.data);
      // Set default tab based on allowed tabs
      if (res.data.role !== "complet" && res.data.allowed_tabs?.length > 0) {
        setActiveTab(res.data.allowed_tabs[0]);
      }
    } catch (e) {
      console.error("Error fetching current admin:", e);
    }
  };

  // Fetch unread messages count
  const fetchUnreadMessages = async () => {
    try {
      const res = await axios.get(`${API}/chat/unread-count`, { headers });
      setUnreadMessages(res.data.unread_count);
    } catch (e) {
      console.error("Error fetching unread count");
    }
  };

  // Fetch extension orders
  const fetchExtensionOrders = async () => {
    try {
      const res = await axios.get(`${API}/admin/extension-orders`, { headers });
      setExtensionOrders(res.data);
    } catch (e) {
      console.error("Error fetching extension orders");
    }
  };

  // Fetch archived clients
  const fetchArchivedClients = async () => {
    try {
      const res = await axios.get(`${API}/admin/archived-clients`, { headers });
      setArchivedClients(res.data);
    } catch (e) {
      console.error("Error fetching archived clients");
    }
  };

  // Validate extension payment
  const validateExtension = async (orderId) => {
    if (!window.confirm("Confirmer la validation du paiement ? Le compte client sera prolongé de 2 mois.")) return;
    try {
      await axios.post(`${API}/admin/extension-orders/${orderId}/validate`, {}, { headers });
      toast.success("Paiement validé et compte prolongé !");
      fetchExtensionOrders();
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Delete extension order
  const deleteExtensionOrder = async (orderId) => {
    if (!window.confirm("Supprimer cette commande d'extension ?")) return;
    try {
      await axios.delete(`${API}/admin/extension-orders/${orderId}`, { headers });
      toast.success("Commande supprimée");
      fetchExtensionOrders();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Cleanup expired accounts
  const cleanupExpiredAccounts = async () => {
    if (!window.confirm("⚠️ Cette action va archiver tous les comptes expirés. Continuer ?")) return;
    try {
      const res = await axios.post(`${API}/admin/cleanup-expired-accounts`, {}, { headers });
      toast.success(res.data.message);
      fetchData();
      fetchArchivedClients();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Fetch admins list
  const fetchAdminsList = async () => {
    try {
      const res = await axios.get(`${API}/admin/admins-list`, { headers });
      setAdminsList(res.data);
    } catch (e) {
      console.error("Error fetching admins list");
    }
  };

  // Create new admin
  const createNewAdmin = async () => {
    try {
      await axios.post(`${API}/admin/create-admin`, {
        name: newAdminData.name,
        email: newAdminData.email,
        password: newAdminData.password,
        role: newAdminData.role || "complet",
        allowed_tabs: newAdminData.allowed_tabs || []
      }, { headers });
      toast.success("Administrateur créé avec succès !");
      setNewAdminData({ name: "", email: "", password: "", role: "complet", allowed_tabs: [] });
      fetchAdminsList();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création");
    }
  };

  // Alias for loadAdminsList
  const loadAdminsList = fetchAdminsList;

  // Delete admin
  const deleteAdmin = async (adminId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet administrateur ?")) return;
    try {
      await axios.delete(`${API}/admin/delete-admin/${adminId}`, { headers });
      toast.success("Administrateur supprimé !");
      fetchAdminsList();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  // Refresh story views when switching to stories filter
  useEffect(() => {
    if (portfolioFilterCategory === "stories") {
      fetchStoryViews();
    }
  }, [portfolioFilterCategory]);

  // Load newsletter data when switching to newsletter tab
  useEffect(() => {
    if (activeTab === "newsletter") {
      fetchNewsletterData();
    }
  }, [activeTab]);

  // Load deployment data when switching to deployment tab
  useEffect(() => {
    if (activeTab === "deployment") {
      fetchDeploymentData();
    }
  }, [activeTab]);

  // Load testimonials when switching to testimonials tab
  useEffect(() => {
    if (activeTab === "testimonials") {
      fetchTestimonials();
    }
  }, [activeTab]);

  // Load welcome popup when switching to popup tab
  useEffect(() => {
    if (activeTab === "welcome-popup") {
      fetchWelcomePopup();
    }
  }, [activeTab]);

  // Fetch testimonials
  const fetchTestimonials = async () => {
    setLoadingTestimonials(true);
    try {
      const res = await axios.get(`${API}/admin/testimonials`, { headers });
      setTestimonials(res.data);
    } catch (e) {
      console.error("Error fetching testimonials:", e);
    } finally {
      setLoadingTestimonials(false);
    }
  };

  // Update testimonial
  const updateTestimonial = async (id, update) => {
    try {
      await axios.put(`${API}/admin/testimonials/${id}`, update, { headers });
      toast.success("Témoignage mis à jour");
      fetchTestimonials();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Delete testimonial
  const deleteTestimonial = async (id) => {
    if (!window.confirm("Supprimer ce témoignage ?")) return;
    try {
      await axios.delete(`${API}/admin/testimonials/${id}`, { headers });
      toast.success("Témoignage supprimé");
      fetchTestimonials();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Fetch welcome popup
  const fetchWelcomePopup = async () => {
    try {
      const res = await axios.get(`${API}/welcome-popup`);
      setWelcomePopup(res.data);
    } catch (e) {
      console.error("Error fetching welcome popup:", e);
    }
  };

  // Update welcome popup
  const updateWelcomePopup = async (update) => {
    try {
      await axios.put(`${API}/admin/welcome-popup`, update, { headers });
      toast.success("Popup d'accueil mis à jour");
      fetchWelcomePopup();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Upload welcome popup video
  const uploadWelcomeVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 500MB)
    if (file.size > 500 * 1024 * 1024) {
      toast.error("La vidéo est trop volumineuse (max 500MB)");
      return;
    }
    
    setUploadingPopupVideo(true);
    const formData = new FormData();
    formData.append("video", file);
    
    try {
      const res = await axios.post(`${API}/admin/welcome-popup/video`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Vidéo uploadée avec succès");
      fetchWelcomePopup();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploadingPopupVideo(false);
    }
  };

  // Delete welcome popup video
  const deleteWelcomeVideo = async () => {
    if (!window.confirm("Supprimer la vidéo ?")) return;
    try {
      await axios.delete(`${API}/admin/welcome-popup/video`, { headers });
      toast.success("Vidéo supprimée");
      fetchWelcomePopup();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Load news when switching to news tab
  useEffect(() => {
    if (activeTab === "news") {
      fetchNewsPosts();
      fetchPendingComments();
    }
  }, [activeTab]);

  // Fetch news posts
  const fetchNewsPosts = async () => {
    setLoadingNews(true);
    try {
      const res = await axios.get(`${API}/news`);
      setNewsPosts(res.data);
    } catch (e) {
      console.error("Error fetching news:", e);
    } finally {
      setLoadingNews(false);
    }
  };

  // Fetch pending comments
  const fetchPendingComments = async () => {
    try {
      const res = await axios.get(`${API}/admin/news/comments/pending`, { headers });
      setPendingComments(res.data);
    } catch (e) {
      console.error("Error fetching pending comments:", e);
    }
  };

  // Create news post
  const createNewsPost = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!newPostCaption.trim()) {
      toast.error("Veuillez ajouter une légende");
      return;
    }
    
    setUploadingNewsMedia(true);
    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", newPostCaption);
    if (newPostLocation) formData.append("location", newPostLocation);
    
    try {
      await axios.post(`${API}/admin/news`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Publication créée");
      setNewPostCaption("");
      setNewPostLocation("");
      fetchNewsPosts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setUploadingNewsMedia(false);
    }
  };

  // Delete news post
  const deleteNewsPost = async (postId) => {
    if (!window.confirm("Supprimer cette publication ?")) return;
    try {
      await axios.delete(`${API}/admin/news/${postId}`, { headers });
      toast.success("Publication supprimée");
      fetchNewsPosts();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Approve/Reject comment
  const updateCommentStatus = async (commentId, status) => {
    try {
      await axios.put(`${API}/admin/news/comments/${commentId}?status=${status}`, {}, { headers });
      toast.success(`Commentaire ${status === "approved" ? "approuvé" : "rejeté"}`);
      fetchPendingComments();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  // Delete comment
  const deleteComment = async (commentId) => {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    try {
      await axios.delete(`${API}/admin/news/comments/${commentId}`, { headers });
      toast.success("Commentaire supprimé");
      fetchPendingComments();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  // Open expiration modal for a client
  const openExpirationModal = (client) => {
    setExpirationClient(client);
    setExpirationOption(client.auto_delete_days ? "custom" : "6_months");
    setCustomDays(client.auto_delete_days || 180);
    setShowExpirationModal(true);
  };

  // Update client expiration
  const updateClientExpiration = async () => {
    if (!expirationClient) return;
    
    setUpdatingExpiration(true);
    try {
      const payload = {
        expiration_option: expirationOption,
        custom_days: expirationOption === "custom" ? customDays : null
      };
      
      const res = await axios.put(
        `${API}/admin/clients/${expirationClient.id}/expiration`,
        payload,
        { headers }
      );
      
      toast.success(res.data.message);
      setShowExpirationModal(false);
      // Refresh clients list
      try {
        const clientsRes = await axios.get(`${API}/admin/clients`, { headers });
        setClients(clientsRes.data);
      } catch (err) {
        console.error("Error refreshing clients");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setUpdatingExpiration(false);
    }
  };

  // Load renewal requests when switching to extensions tab
  useEffect(() => {
    if (activeTab === "extensions") {
      fetchRenewalRequests();
    }
  }, [activeTab]);

  // Load billing data when switching to billing tab
  useEffect(() => {
    if (activeTab === "billing") {
      fetchBillingData();
    }
  }, [activeTab]);

  // Fetch billing/invoices data
  const fetchBillingData = async () => {
    setLoadingBilling(true);
    try {
      const res = await axios.get(`${API}/admin/renewal-invoices`, { headers });
      setRenewalInvoices(res.data.invoices || []);
      setBillingStats({
        total_revenue: res.data.total_revenue || 0,
        total_invoices: res.data.total_invoices || 0
      });
    } catch (e) {
      console.error("Error fetching billing data:", e);
    } finally {
      setLoadingBilling(false);
    }
  };

  // Fetch renewal requests
  const fetchRenewalRequests = async () => {
    setLoadingRenewals(true);
    try {
      const res = await axios.get(`${API}/admin/renewal-requests`, { headers });
      setRenewalRequests(res.data);
    } catch (e) {
      console.error("Error fetching renewal requests:", e);
    } finally {
      setLoadingRenewals(false);
    }
  };

  // Approve renewal request
  const approveRenewal = async (requestId) => {
    try {
      const res = await axios.put(`${API}/admin/renewal-requests/${requestId}/approve`, {}, { headers });
      toast.success(res.data.message);
      fetchRenewalRequests();
      // Refresh clients list
      const clientsRes = await axios.get(`${API}/admin/clients`, { headers });
      setClients(clientsRes.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Reject renewal request
  const rejectRenewal = async (requestId) => {
    if (!window.confirm("Rejeter cette demande de renouvellement ?")) return;
    try {
      await axios.put(`${API}/admin/renewal-requests/${requestId}/reject`, {}, { headers });
      toast.success("Demande rejetée");
      fetchRenewalRequests();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  // Fetch backup status for reminder
  const fetchBackupStatus = async () => {
    try {
      const res = await axios.get(`${API}/admin/backup/status`, { headers });
      setBackupStatus(res.data);
    } catch (e) {
      console.error("Error fetching backup status:", e);
    }
  };

  // Confirm backup download
  const confirmBackupDownload = async () => {
    try {
      await axios.post(`${API}/admin/backup/confirm-download`, {}, { headers });
      fetchBackupStatus();
    } catch (e) {
      console.error("Error confirming backup:", e);
    }
  };

  const fetchMfaStatus = async () => {
    try {
      const res = await axios.get(`${API}/auth/mfa/status`, { headers });
      setMfaStatus(res.data);
    } catch (e) {
      console.error("Error fetching MFA status");
    }
  };

  const setupMfa = async () => {
    try {
      const res = await axios.post(`${API}/auth/mfa/setup`, {}, { headers });
      setMfaSetupData(res.data);
      setShowBackupCodes(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la configuration MFA");
    }
  };

  const verifyMfaSetup = async () => {
    try {
      await axios.post(`${API}/auth/mfa/verify`, { totp_code: mfaVerifyCode }, { headers });
      toast.success("MFA activé avec succès !");
      setMfaSetupData(null);
      setMfaVerifyCode("");
      setShowBackupCodes(false);
      fetchMfaStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Code invalide");
    }
  };

  const disableMfa = async () => {
    try {
      await axios.post(`${API}/auth/mfa/disable`, {
        password: disableMfaData.password,
        totp_code: disableMfaData.code.length === 6 ? disableMfaData.code : null,
        backup_code: disableMfaData.code.length === 8 ? disableMfaData.code : null
      }, { headers });
      toast.success("MFA désactivé");
      setShowDisableMfa(false);
      setDisableMfaData({ password: "", code: "" });
      fetchMfaStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  const regenerateBackupCodes = async () => {
    const code = prompt("Entrez votre code MFA actuel pour régénérer les codes de secours:");
    if (!code) return;
    try {
      const res = await axios.post(`${API}/auth/mfa/backup-codes`, { totp_code: code }, { headers });
      setMfaSetupData({ ...mfaSetupData, backup_codes: res.data.backup_codes });
      setShowBackupCodes(true);
      toast.success("Nouveaux codes de secours générés !");
      fetchMfaStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Code invalide");
    }
  };

  const fetchBankDetails = async () => {
    try {
      const res = await axios.get(`${API}/bank-details`);
      setBankDetails(res.data);
    } catch (e) {
      console.error("Error fetching bank details");
    }
  };

  const fetchStoryViews = async () => {
    try {
      const res = await axios.get(`${API}/admin/stories/all-views`, { headers });
      setStoryViews(res.data);
    } catch (e) {
      console.error("Error fetching story views");
    }
  };

  const fetchStoryViewDetails = async (storyId) => {
    try {
      const res = await axios.get(`${API}/stories/${storyId}/views`, { headers });
      setSelectedStoryViews({ storyId, ...res.data });
    } catch (e) {
      toast.error("Erreur lors du chargement des vues");
    }
  };

  const updateBankDetails = async () => {
    try {
      await axios.put(`${API}/bank-details`, bankDetails, { headers });
      toast.success("Coordonnées bancaires mises à jour !");
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, bookingsRes, quotesRes, servicesRes, optionsRes, messagesRes, portfolioRes, clientsRes, contentRes, appointmentsRes, galleriesRes, onlineRes, downloadsRes, guestbooksRes, storageRes] = await Promise.all([
        axios.get(`${API}/stats`, { headers }),
        axios.get(`${API}/bookings`, { headers }),
        axios.get(`${API}/wedding-quotes`, { headers }),
        axios.get(`${API}/services?active_only=false`),
        axios.get(`${API}/wedding-options`),
        axios.get(`${API}/contact`, { headers }),
        axios.get(`${API}/admin/portfolio`, { headers }),
        axios.get(`${API}/admin/clients`, { headers }),
        axios.get(`${API}/content`),
        axios.get(`${API}/appointments`, { headers }),
        axios.get(`${API}/admin/galleries`, { headers }),
        axios.get(`${API}/admin/users/online`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/downloads`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/guestbooks`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/storage-stats`, { headers }).catch(() => ({ data: null }))
      ]);
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setQuotes(quotesRes.data);
      setServices(servicesRes.data);
      setWeddingOptions(optionsRes.data);
      setMessages(messagesRes.data);
      setPortfolio(portfolioRes.data);
      setClients(clientsRes.data);
      setSiteContent(contentRes.data);
      setEditingContent(contentRes.data);
      setAppointments(appointmentsRes.data);
      setGalleries(galleriesRes.data);
      setOnlineUsers(onlineRes.data);
      setRecentDownloads(downloadsRes.data);
      setGuestbooks(guestbooksRes.data);
      setStorageStats(storageRes.data);
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      }
    }
  };

  // Fetch client downloads when selecting a client
  const fetchClientDownloads = async (clientId) => {
    try {
      const res = await axios.get(`${API}/admin/clients/${clientId}/downloads`, { headers });
      setClientDownloads(res.data);
    } catch (e) {
      setClientDownloads([]);
    }
  };

  // Fetch newsletter data
  const fetchNewsletterData = async () => {
    setLoadingNewsletter(true);
    try {
      const [statsRes, subscribersRes] = await Promise.all([
        axios.get(`${API}/admin/newsletter/stats`, { headers }),
        axios.get(`${API}/admin/newsletter/subscribers`, { headers })
      ]);
      setNewsletterStats(statsRes.data);
      setNewsletterSubscribers({
        subscribers: subscribersRes.data.subscribers || [],
        unsubscribers: subscribersRes.data.unsubscribers || []
      });
    } catch (e) {
      console.error("Error fetching newsletter data:", e);
    } finally {
      setLoadingNewsletter(false);
    }
  };

  // Send manual newsletter
  const handleSendNewsletter = async () => {
    if (!newsletterForm.subject.trim() || !newsletterForm.message.trim()) {
      toast.error("Veuillez remplir le sujet et le message");
      return;
    }
    setSendingNewsletter(true);
    try {
      const res = await axios.post(`${API}/admin/newsletter/send`, newsletterForm, { headers });
      toast.success(res.data.message);
      setNewsletterForm({ subject: "", message: "" });
      fetchNewsletterData(); // Refresh stats
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSendingNewsletter(false);
    }
  };

  // Fetch deployment data
  const fetchDeploymentData = async () => {
    setLoadingDeployment(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API}/admin/deployment/status`, { headers }),
        axios.get(`${API}/admin/deployment/history`, { headers })
      ]);
      setDeploymentStatus(statusRes.data);
      setDeploymentHistory(historyRes.data || []);
    } catch (e) {
      console.error("Error fetching deployment data:", e);
      toast.error("Erreur lors du chargement des infos de déploiement");
    } finally {
      setLoadingDeployment(false);
    }
  };

  // Trigger update
  const handleDeployUpdate = async () => {
    if (!window.confirm("⚠️ Voulez-vous vraiment mettre à jour le site ? Cela peut prendre quelques minutes.")) return;
    setDeploying(true);
    setDeployLogs(["🚀 Démarrage de la mise à jour..."]);
    try {
      const res = await axios.post(`${API}/admin/deployment/update`, {}, { headers });
      setDeployLogs(res.data.logs || []);
      toast.success(res.data.message);
      fetchDeploymentData();
    } catch (e) {
      setDeployLogs(prev => [...prev, `❌ Erreur: ${e.response?.data?.detail || e.message}`]);
      toast.error(e.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setDeploying(false);
    }
  };

  // Trigger rollback
  const handleDeployRollback = async (commitHash) => {
    if (!window.confirm(`⚠️ Voulez-vous revenir à la version ${commitHash} ? Le site sera temporairement indisponible.`)) return;
    setDeploying(true);
    setDeployLogs([`⏪ Rollback vers ${commitHash}...`]);
    try {
      const res = await axios.post(`${API}/admin/deployment/rollback`, { commit_hash: commitHash }, { headers });
      setDeployLogs(res.data.logs || []);
      toast.success(res.data.message);
      fetchDeploymentData();
    } catch (e) {
      setDeployLogs(prev => [...prev, `❌ Erreur: ${e.response?.data?.detail || e.message}`]);
      toast.error(e.response?.data?.detail || "Erreur lors du rollback");
    } finally {
      setDeploying(false);
    }
  };

  const updateBookingStatus = async (id, status) => {
    try {
      await axios.put(`${API}/bookings/${id}`, { status }, { headers });
      toast.success("Statut mis à jour");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updateQuoteStatus = async (id, status) => {
    try {
      await axios.put(`${API}/wedding-quotes/${id}/status?status=${status}`, {}, { headers });
      toast.success("Statut mis à jour");
      fetchData();
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote({ ...selectedQuote, status });
      }
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const openQuoteDetail = async (quoteId) => {
    setLoadingQuoteDetail(true);
    try {
      const res = await axios.get(`${API}/wedding-quotes/${quoteId}`, { headers });
      setSelectedQuote(res.data);
    } catch (e) {
      toast.error("Erreur lors du chargement du devis");
    } finally {
      setLoadingQuoteDetail(false);
    }
  };

  const printQuote = () => {
    if (!quoteDetailRef.current) return;
    
    const printContent = quoteDetailRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Devis - ${selectedQuote?.client_name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
          .header h1 { color: #d4af37; margin: 0; font-size: 32px; }
          .header p { color: #666; margin-top: 10px; }
          .section { margin-bottom: 30px; }
          .section h2 { color: #d4af37; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .info-item { padding: 10px 0; }
          .info-item .label { color: #888; font-size: 12px; text-transform: uppercase; }
          .info-item .value { font-weight: bold; font-size: 16px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f9f9f9; color: #666; font-size: 12px; text-transform: uppercase; }
          .category-header { background: #d4af37; color: #fff; font-weight: bold; }
          .total-row { background: #d4af37; color: #000; font-weight: bold; font-size: 18px; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        ${printContent}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const updateService = async (id, data) => {
    try {
      await axios.put(`${API}/services/${id}`, data, { headers });
      toast.success("Service mis à jour");
      setEditingService(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updateWeddingOption = async (id, data) => {
    try {
      await axios.put(`${API}/wedding-options/${id}`, data, { headers });
      toast.success("Option mise à jour");
      setEditingOption(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const createWeddingOption = async (optionData) => {
    try {
      await axios.post(`${API}/wedding-options`, optionData, { headers });
      toast.success("Option ajoutée");
      setShowAddOption(false);
      setNewOption({ name: "", description: "", price: 0, category: "coverage" });
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const deleteWeddingOption = async (id) => {
    if (!window.confirm("Supprimer cette option ?")) return;
    try {
      await axios.delete(`${API}/wedding-options/${id}`, { headers });
      toast.success("Option supprimée");
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const createClient = async () => {
    try {
      await axios.post(`${API}/admin/clients`, newClient, { headers });
      toast.success("Client créé");
      setShowAddClient(false);
      setNewClient({ name: "", email: "", password: "", phone: "" });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Delete client with all data and files
  const deleteClient = async (client) => {
    const confirmMessage = `⚠️ ATTENTION ⚠️\n\nVous allez supprimer définitivement le client "${client.name}" (${client.email}).\n\nCela supprimera :\n- Le compte client\n- Tous ses fichiers sur le serveur\n- Ses devis, factures et paiements\n- Ses conversations chat\n- Ses galeries et sélections photos\n\nCette action est IRRÉVERSIBLE !\n\nÊtes-vous sûr de vouloir continuer ?`;
    
    if (!window.confirm(confirmMessage)) return;
    
    // Double confirmation
    const doubleConfirm = window.prompt(`Pour confirmer, tapez le nom du client : "${client.name}"`);
    if (doubleConfirm !== client.name) {
      toast.error("Suppression annulée - le nom ne correspond pas");
      return;
    }
    
    try {
      const res = await axios.delete(`${API}/admin/clients/${client.id}`, { headers });
      toast.success(`Client ${client.name} supprimé avec succès`);
      setSelectedClient(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  // Open file transfer modal for a client
  const openClientFileTransfer = async (client) => {
    setShowClientFileTransfer(client);
    try {
      const res = await axios.get(`${API}/admin/client-transfers/${client.id}`, { headers });
      setClientTransfers(res.data);
    } catch (e) {
      setClientTransfers({ music: [], documents: [], photos: [], videos: [] });
    }
  };

  // Open document modal for a client
  const openDocumentModal = async (client) => {
    setDocumentModalClient(client);
    setShowDocumentModal(true);
    setNewDocument({ type: "invoice", title: "", amount: "", description: "", due_date: "", file: null });
    try {
      const res = await axios.get(`${API}/admin/clients/${client.id}/documents`, { headers });
      setClientDocuments(res.data);
    } catch (e) {
      setClientDocuments([]);
    }
  };

  // Upload document for client
  const uploadDocument = async () => {
    if (!documentModalClient || !newDocument.file || !newDocument.title || !newDocument.amount) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    
    setUploadingDocument(true);
    const formData = new FormData();
    formData.append("document_type", newDocument.type);
    formData.append("title", newDocument.title);
    formData.append("amount", parseFloat(newDocument.amount));
    formData.append("description", newDocument.description || "");
    formData.append("due_date", newDocument.due_date || "");
    formData.append("file", newDocument.file);
    
    try {
      await axios.post(`${API}/admin/clients/${documentModalClient.id}/documents`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success("Document ajouté avec succès !");
      setNewDocument({ type: "invoice", title: "", amount: "", description: "", due_date: "", file: null });
      // Refresh documents
      const res = await axios.get(`${API}/admin/clients/${documentModalClient.id}/documents`, { headers });
      setClientDocuments(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploadingDocument(false);
    }
  };

  // Delete document
  const deleteDocument = async (documentId) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await axios.delete(`${API}/admin/documents/${documentId}`, { headers });
      toast.success("Document supprimé");
      setClientDocuments(clientDocuments.filter(d => d.id !== documentId));
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Add payment to document
  const addDocumentPayment = async (documentId, amount) => {
    const paymentAmount = prompt("Montant du paiement reçu (€) :");
    if (!paymentAmount || isNaN(parseFloat(paymentAmount))) return;
    
    const formData = new FormData();
    formData.append("amount", parseFloat(paymentAmount));
    
    try {
      const res = await axios.post(`${API}/admin/documents/${documentId}/payment`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      toast.success(`Paiement de ${paymentAmount}€ enregistré`);
      // Refresh documents
      const docsRes = await axios.get(`${API}/admin/clients/${documentModalClient.id}/documents`, { headers });
      setClientDocuments(docsRes.data);
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement du paiement");
    }
  };

  // Upload file to client
  const uploadFileToClient = async (fileType, file) => {
    if (!showClientFileTransfer || !file) return;
    
    setUploadingToClient(true);
    setUploadToClientProgress(0);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      await axios.post(
        `${API}/admin/transfer-to-client/${showClientFileTransfer.id}/${fileType}`,
        formData,
        {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadToClientProgress(percent);
          }
        }
      );
      toast.success("Fichier envoyé au client !");
      // Refresh transfers
      const res = await axios.get(`${API}/admin/client-transfers/${showClientFileTransfer.id}`, { headers });
      setClientTransfers(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de l'upload");
    } finally {
      setUploadingToClient(false);
      setUploadToClientProgress(0);
    }
  };

  // Delete client file
  const deleteClientTransferFile = async (fileId) => {
    if (!window.confirm("Supprimer ce fichier ?")) return;
    try {
      await axios.delete(`${API}/admin/client-transfer/${fileId}`, { headers });
      toast.success("Fichier supprimé");
      // Refresh
      const res = await axios.get(`${API}/admin/client-transfers/${showClientFileTransfer.id}`, { headers });
      setClientTransfers(res.data);
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    try {
      const res = await axios.get(`${API}/admin/clients/${client.id}/files`, { headers });
      setClientFiles(res.data);
      // Also fetch downloads for this client
      fetchClientDownloads(client.id);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const addFileToClient = async () => {
    if (!selectedClient) return;
    try {
      await axios.post(`${API}/client/files`, { ...newFile, client_id: selectedClient.id }, { headers });
      toast.success("Fichier ajouté");
      setShowAddFile(false);
      setNewFile({ title: "", description: "", file_type: "video", file_url: "", thumbnail_url: "" });
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deleteFile = async (fileId) => {
    try {
      await axios.delete(`${API}/client/files/${fileId}`, { headers });
      toast.success("Fichier supprimé");
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  // Site Content Functions
  const updateSiteContent = async () => {
    try {
      await axios.put(`${API}/content`, editingContent, { headers });
      toast.success("Contenu mis à jour !");
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  // Upload Content Image
  const handleContentImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentContentField) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.");
      return;
    }
    
    if (file.size > 1024 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 1 Go)");
      return;
    }
    
    setUploadingContentImage(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/upload/content`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
      setEditingContent({ ...editingContent, [currentContentField]: uploadedUrl });
      toast.success("Image uploadée !");
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingContentImage(false);
      setCurrentContentField(null);
    }
  };

  const triggerContentUpload = (fieldName) => {
    setCurrentContentField(fieldName);
    contentFileRef.current?.click();
  };

  // Portfolio Functions
  // Upload Portfolio File
  const handlePortfolioFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.");
      return;
    }
    
    if (file.size > 1024 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 1 Go)");
      return;
    }
    
    setUploadingPortfolio(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/upload/portfolio`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
      setNewPortfolioItem({ 
        ...newPortfolioItem, 
        media_url: uploadedUrl, 
        media_type: res.data.media_type,
        thumbnail_url: res.data.media_type === 'photo' ? uploadedUrl : ''
      });
      toast.success("Fichier uploadé !");
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPortfolio(false);
    }
  };

  // Upload Thumbnail for video
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.");
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 50 Mo pour les miniatures)");
      return;
    }
    
    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/upload/portfolio`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
      setNewPortfolioItem({ 
        ...newPortfolioItem, 
        thumbnail_url: uploadedUrl
      });
      toast.success("Miniature uploadée !");
    } catch (e) {
      toast.error("Erreur lors de l'upload de la miniature");
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Upload Multiple Photos at once
  const handleMultiplePhotosUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // Validate client name
    if (!newPortfolioItem.client_name.trim()) {
      toast.error("Veuillez d'abord renseigner le nom du client");
      return;
    }
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const validFiles = files.filter(file => allowedTypes.includes(file.type));
    
    if (validFiles.length === 0) {
      toast.error("Aucun fichier image valide sélectionné");
      return;
    }
    
    if (validFiles.length !== files.length) {
      toast.warning(`${files.length - validFiles.length} fichier(s) ignoré(s) (format non supporté)`);
    }
    
    setUploadingMultiplePhotos(true);
    setMultiplePhotosProgress({ current: 0, total: validFiles.length });
    
    let successCount = 0;
    
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setMultiplePhotosProgress({ current: i + 1, total: validFiles.length });
      
      try {
        // Upload the file
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await axios.post(`${API}/upload/portfolio`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
        
        const uploadedUrl = `${BACKEND_URL}${uploadRes.data.url}`;
        
        // Create portfolio item
        const portfolioItem = {
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
          description: "",
          media_type: "photo",
          media_url: uploadedUrl,
          thumbnail_url: "",
          category: newPortfolioItem.category,
          client_name: newPortfolioItem.client_name,
          is_featured: false
        };
        
        await axios.post(`${API}/admin/portfolio`, portfolioItem, { headers });
        successCount++;
        
      } catch (err) {
        console.error(`Erreur upload ${file.name}:`, err);
      }
    }
    
    setUploadingMultiplePhotos(false);
    setMultiplePhotosProgress({ current: 0, total: 0 });
    
    if (successCount > 0) {
      toast.success(`${successCount} photo(s) ajoutée(s) avec succès !`);
      setShowAddPortfolio(false);
      setNewPortfolioItem({ title: "", description: "", media_type: "photo", media_url: "", thumbnail_url: "", category: "wedding", client_name: "", is_featured: false, story_duration: 3 });
      fetchData();
    } else {
      toast.error("Aucune photo n'a pu être uploadée");
    }
    
    // Reset file input
    if (multiplePhotosRef.current) {
      multiplePhotosRef.current.value = '';
    }
  };

  // Upload Client File
  const handleClientFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!selectedClient) {
      toast.error("Sélectionnez d'abord un client");
      return;
    }
    
    // Extended allowed types including documents
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 
      'video/mp4', 'video/webm', 'video/quicktime',
      'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed', 
      'application/pdf', 'application/octet-stream'
    ];
    const allowedExtensions = ['.zip', '.rar', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExt)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, ZIP, RAR ou PDF.");
      return;
    }
    
    if (file.size > 1024 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 1 Go)");
      return;
    }
    
    const title = prompt("Titre du fichier:", file.name.split('.')[0]);
    if (!title) return;
    
    setUploadingClientFile(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', '');
    
    try {
      await axios.post(`${API}/upload/client/${selectedClient.id}`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      toast.success("Fichier uploadé et client notifié par email !");
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur lors de l'upload: " + (e.response?.data?.detail || e.message));
    } finally {
      setUploadingClientFile(false);
      setUploadProgress(0);
    }
  };

  // Upload Client File Thumbnail
  const handleClientFileThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.");
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 50 Mo pour les miniatures)");
      return;
    }
    
    setUploadingClientFileThumbnail(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/upload/portfolio`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
      setNewFile({ 
        ...newFile, 
        thumbnail_url: uploadedUrl
      });
      toast.success("Miniature uploadée !");
    } catch (e) {
      toast.error("Erreur lors de l'upload de la miniature");
    } finally {
      setUploadingClientFileThumbnail(false);
    }
  };

  const createPortfolioItem = async () => {
    try {
      await axios.post(`${API}/admin/portfolio`, newPortfolioItem, { headers });
      toast.success("Élément ajouté au portfolio");
      setShowAddPortfolio(false);
      setNewPortfolioItem({ title: "", description: "", media_type: "photo", media_url: "", thumbnail_url: "", category: "wedding", client_name: "", is_featured: false, story_duration: 3 });
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const updatePortfolioItem = async (id, data) => {
    try {
      await axios.put(`${API}/admin/portfolio/${id}`, data, { headers });
      toast.success("Portfolio mis à jour");
      setEditingPortfolio(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deletePortfolioItem = async (id) => {
    if (!window.confirm("Supprimer cet élément ?")) return;
    try {
      await axios.delete(`${API}/admin/portfolio/${id}`, { headers });
      toast.success("Élément supprimé");
      fetchData();
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const logout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    navigate("/admin");
  };

  // Appointment functions
  const respondToAppointment = async (appointmentId, response) => {
    try {
      await axios.put(`${API}/appointments/${appointmentId}`, response, { headers });
      toast.success(
        response.status === "confirmed" ? "Rendez-vous confirmé ! Email envoyé au client." :
        response.status === "refused" ? "Rendez-vous refusé. Email envoyé au client." :
        "Nouvelle date proposée ! Email envoyé au client."
      );
      setSelectedAppointment(null);
      setAppointmentResponse({ status: "", admin_response: "", new_proposed_date: "", new_proposed_time: "" });
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const appointmentStatusColors = {
    pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-500 border-green-500/30",
    refused: "bg-red-500/20 text-red-500 border-red-500/30",
    rescheduled_pending: "bg-orange-500/20 text-orange-500 border-orange-500/30"
  };

  const appointmentStatusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    refused: "Refusé",
    rescheduled_pending: "Nouvelle date proposée"
  };

  // Gallery Functions
  const createGallery = async () => {
    if (!newGallery.client_id || !newGallery.name) {
      toast.error("Veuillez sélectionner un client et donner un nom à la galerie");
      return;
    }
    try {
      await axios.post(`${API}/admin/galleries`, newGallery, { headers });
      toast.success("Galerie créée !");
      setShowAddGallery(false);
      setNewGallery({ client_id: "", name: "", description: "" });
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la création");
    }
  };

  const deleteGallery = async (galleryId) => {
    if (!window.confirm("Supprimer cette galerie et toutes ses photos ?")) return;
    try {
      await axios.delete(`${API}/admin/galleries/${galleryId}`, { headers });
      toast.success("Galerie supprimée");
      setSelectedGallery(null);
      fetchData();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGalleryPhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedGallery) return;
    
    setUploadingGalleryPhoto(true);
    let successCount = 0;
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        await axios.post(`${API}/admin/galleries/${selectedGallery.id}/photos`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' }
        });
        successCount++;
      } catch (e) {
        console.error(`Error uploading ${file.name}`);
      }
    }
    
    toast.success(`${successCount} photo(s) uploadée(s) !`);
    setUploadingGalleryPhoto(false);
    
    // Refresh gallery
    const res = await axios.get(`${API}/admin/galleries`, { headers });
    setGalleries(res.data);
    const updated = res.data.find(g => g.id === selectedGallery.id);
    if (updated) setSelectedGallery(updated);
  };

  const deleteGalleryPhoto = async (photoId) => {
    if (!selectedGallery) return;
    try {
      await axios.delete(`${API}/admin/galleries/${selectedGallery.id}/photos/${photoId}`, { headers });
      toast.success("Photo supprimée");
      // Refresh gallery
      const res = await axios.get(`${API}/admin/galleries`, { headers });
      setGalleries(res.data);
      const updated = res.data.find(g => g.id === selectedGallery.id);
      if (updated) setSelectedGallery(updated);
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Gallery Music Functions
  const handleGalleryMusicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedGallery) return;
    
    setUploadingGalleryMusic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await axios.post(`${API}/admin/galleries/${selectedGallery.id}/music`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      
      toast.success("Musique uploadée !");
      // Refresh gallery
      const res = await axios.get(`${API}/admin/galleries`, { headers });
      setGalleries(res.data);
      const updated = res.data.find(g => g.id === selectedGallery.id);
      if (updated) setSelectedGallery(updated);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'upload");
    }
    setUploadingGalleryMusic(false);
    e.target.value = "";
  };

  const deleteGalleryMusic = async () => {
    if (!selectedGallery) return;
    try {
      await axios.delete(`${API}/admin/galleries/${selectedGallery.id}/music`, { headers });
      toast.success("Musique supprimée");
      // Refresh gallery
      const res = await axios.get(`${API}/admin/galleries`, { headers });
      setGalleries(res.data);
      const updated = res.data.find(g => g.id === selectedGallery.id);
      if (updated) setSelectedGallery(updated);
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const viewGallerySelection = async (gallery) => {
    try {
      const res = await axios.get(`${API}/admin/galleries/${gallery.id}/selection`, { headers });
      setGallerySelection(res.data);
      setSelectedGallery(gallery);
    } catch (e) {
      toast.error("Erreur lors du chargement de la sélection");
    }
  };

  // ==================== GUESTBOOK FUNCTIONS ====================
  
  const fetchGuestbooks = async () => {
    try {
      const res = await axios.get(`${API}/admin/guestbooks`, { headers });
      setGuestbooks(res.data);
    } catch (e) {
      console.error("Error fetching guestbooks:", e);
    }
  };

  const createGuestbook = async () => {
    if (!newGuestbook.client_id || !newGuestbook.name) {
      toast.error("Veuillez sélectionner un client et donner un nom");
      return;
    }
    try {
      await axios.post(`${API}/admin/guestbooks`, newGuestbook, { headers });
      toast.success("Livre d'or créé !");
      setShowAddGuestbook(false);
      setNewGuestbook({ client_id: "", name: "", event_date: "", welcome_message: "" });
      fetchGuestbooks();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création");
    }
  };

  const deleteGuestbook = async (guestbookId) => {
    if (!window.confirm("Supprimer ce livre d'or et tous ses messages ?")) return;
    try {
      await axios.delete(`${API}/admin/guestbooks/${guestbookId}`, { headers });
      toast.success("Livre d'or supprimé");
      setSelectedGuestbook(null);
      fetchGuestbooks();
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const fetchGuestbookDetail = async (guestbookId) => {
    try {
      const res = await axios.get(`${API}/admin/guestbooks/${guestbookId}`, { headers });
      setSelectedGuestbook(res.data);
    } catch (e) {
      toast.error("Erreur lors du chargement");
    }
  };

  const approveGuestbookMessage = async (messageId) => {
    try {
      await axios.put(`${API}/admin/guestbook-messages/${messageId}/approve`, {}, { headers });
      toast.success("Message approuvé");
      if (selectedGuestbook) fetchGuestbookDetail(selectedGuestbook.id);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deleteGuestbookMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/admin/guestbook-messages/${messageId}`, { headers });
      toast.success("Message supprimé");
      if (selectedGuestbook) fetchGuestbookDetail(selectedGuestbook.id);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const copyGuestbookLink = (guestbookId) => {
    const url = `${window.location.origin}/livre-dor/${guestbookId}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-500",
    confirmed: "bg-green-500/20 text-green-500",
    cancelled: "bg-red-500/20 text-red-500"
  };

  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    cancelled: "Annulé"
  };

  return (
    <div className="pt-20 min-h-screen" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-primary font-black text-3xl tracking-tighter uppercase">
            <span className="text-gold-gradient">Dashboard</span>
          </h1>
          
          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full pl-2 pr-4 py-2 transition-all"
              data-testid="admin-profile-btn"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
                {currentAdmin?.name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              
              {/* Name */}
              <span className="text-white text-sm font-medium hidden sm:block">
                {currentAdmin?.name || "Admin"}
              </span>
              
              {/* Chevron */}
              <svg className={`w-4 h-4 text-white/60 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Dropdown Menu */}
            {showProfileMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                />
                
                <div className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* Profile Header */}
                  <div className="p-4 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center text-black font-bold text-lg">
                        {currentAdmin?.name?.charAt(0)?.toUpperCase() || "A"}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{currentAdmin?.name || "Admin"}</p>
                        <p className="text-white/50 text-xs">{currentAdmin?.email}</p>
                      </div>
                    </div>
                    
                    {/* Role Badge */}
                    <div className="mt-3">
                      {currentAdmin?.role === "complet" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                          <Shield className="w-3 h-3" />
                          Admin complet
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          <User className="w-3 h-3" />
                          Collaborateur
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Menu Items */}
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                    >
                      <User className="w-4 h-4" />
                      Mon profil
                    </button>
                    
                    {currentAdmin?.role === "complet" && (
                      <button
                        onClick={() => {
                          setActiveTab("security");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm"
                      >
                        <Shield className="w-4 h-4" />
                        Sécurité
                      </button>
                    )}
                  </div>
                  
                  {/* Logout */}
                  <div className="p-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                      data-testid="admin-logout-btn"
                    >
                      <LogOut className="w-4 h-4" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Backup Reminder Alert */}
        {backupStatus?.needs_reminder && (
          <div className="bg-yellow-500/20 border border-yellow-500 p-4 mb-6 flex items-center justify-between" data-testid="backup-reminder">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-yellow-400">Rappel de sauvegarde</p>
                <p className="text-sm text-white/70">
                  {backupStatus.days_since_backup !== null 
                    ? `Dernière sauvegarde il y a ${backupStatus.days_since_backup} jours` 
                    : "Vous n'avez jamais fait de sauvegarde manuelle"}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab("settings")}
              className="btn-primary px-4 py-2 text-sm"
            >
              Faire une sauvegarde
            </button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Réservations</p>
              <p className="font-primary font-black text-3xl text-gold-gradient">{stats.total_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Devis Mariage</p>
              <p className="font-primary font-black text-3xl text-pink-500">{stats.pending_quotes || 0}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">En attente</p>
              <p className="font-primary font-black text-3xl text-yellow-500">{stats.pending_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Confirmées</p>
              <p className="font-primary font-black text-3xl text-green-500">{stats.confirmed_bookings}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Messages</p>
              <p className="font-primary font-black text-3xl text-blue-500">{stats.unread_messages}</p>
            </div>
            <div className="bg-card border border-white/10 p-6">
              <p className="text-white/60 text-sm">Services</p>
              <p className="font-primary font-black text-3xl">{stats.total_services}</p>
            </div>
          </div>
        )}

        {/* Storage Stats - Pie Chart */}
        {storageStats && storageStats.chart_data && storageStats.chart_data.length > 0 && (
          <div className="bg-card border border-white/10 p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <HardDrive className="text-primary" size={24} />
              <h3 className="font-primary text-xl text-white">Espace de stockage</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={storageStats.chart_data}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {storageStats.chart_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background border border-white/20 rounded-lg p-3 shadow-lg">
                              <p className="text-white font-medium">{data.name}</p>
                              <p className="text-primary">{data.size_formatted}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      formatter={(value, entry) => (
                        <span className="text-white/80 text-sm">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Storage Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-4 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm">Espace utilisé</p>
                    <p className="font-primary font-bold text-2xl text-primary">{storageStats.total_used_formatted}</p>
                  </div>
                  <div className="bg-background/50 p-4 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm">Espace libre</p>
                    <p className="font-primary font-bold text-2xl text-green-500">{storageStats.free_disk_formatted}</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {storageStats.chart_data.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 bg-background/30 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-white/80">{item.name}</span>
                      </div>
                      <span className="text-white/60">{item.size_formatted}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "Aperçu" },
            { id: "project-tracker", label: "📦 Suivi Projet" },
            { id: "tasks", label: "📋 Tâches" },
            { id: "calendar", label: "📅 Calendrier" },
            { id: "galleries", label: "📸 Galeries" },
            { id: "guestbooks", label: "📖 Livres d'or" },
            { id: "photofind", label: "📷 PhotoFind" },
            { id: "content", label: "Contenu Site" },
            { id: "portfolio", label: "Portfolio" },
            { id: "news", label: "📰 Actualités" },
            { id: "testimonials", label: "⭐ Témoignages" },
            { id: "welcome-popup", label: "🎬 Popup Accueil" },
            { id: "quotes", label: "Devis Mariage" },
            { id: "bookings", label: "Réservations" },
            { id: "clients", label: "Clients" },
            { id: "extensions", label: "💳 Extensions" },
            { id: "billing", label: "🧾 Facturation" },
            { id: "newsletter", label: "📧 Newsletter" },
            { id: "deployment", label: "🚀 Déploiement" },
            { id: "services", label: "Services" },
            { id: "options", label: "Options Mariage" },
            { id: "messages", label: "Messages" },
            { id: "appointments", label: "Rendez-vous" },
            { id: "settings", label: "Paramètres" },
            { id: "security", label: "🔐 Sécurité" }
          ]
          .filter(tab => {
            // Admin "complet" sees all tabs
            if (!currentAdmin || currentAdmin.role === "complet") return true;
            // Other roles only see allowed tabs
            return currentAdmin.allowed_tabs?.includes(tab.id);
          })
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`font-primary text-sm uppercase tracking-wider pb-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-white/60 hover:text-white"
              }`}
              data-testid={`admin-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
          
          {/* Chat Button */}
          <button
            onClick={() => setShowChat(true)}
            className="relative ml-4 bg-primary text-black px-4 py-2 text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
            data-testid="admin-chat-button"
          >
            <MessageSquare size={16} /> Chat
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </button>
        </div>

        {/* Project Tracker Tab */}
        {activeTab === "project-tracker" && (
          <div data-testid="admin-project-tracker">
            <ProjectTracker token={token} clients={clients} />
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div data-testid="admin-tasks">
            <h2 className="font-primary font-bold text-xl mb-6">
              {currentAdmin?.role === "complet" ? "Gestion des Tâches" : "Mes Tâches"}
            </h2>
            <TaskManager token={token} currentAdmin={currentAdmin} />
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div data-testid="admin-calendar">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Calendrier des Rendez-vous</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  ← Mois précédent
                </button>
                <span className="font-primary font-bold text-lg min-w-[200px] text-center">
                  {calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                </span>
                <button 
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Mois suivant →
                </button>
                <button 
                  onClick={() => setCalendarDate(new Date())}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Aujourd'hui
                </button>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500/30 border border-yellow-500"></div>
                <span className="text-white/60">En attente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/30 border border-green-500"></div>
                <span className="text-white/60">Confirmé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/30 border border-blue-500"></div>
                <span className="text-white/60">Nouvelle date proposée</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500/30 border border-red-500"></div>
                <span className="text-white/60">Refusé</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card border border-white/10">
              {/* Days Header */}
              <div className="grid grid-cols-7 border-b border-white/10">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
                  <div key={day} className="p-3 text-center font-primary font-bold text-sm text-white/60 border-r border-white/10 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {(() => {
                  const year = calendarDate.getFullYear();
                  const month = calendarDate.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const lastDay = new Date(year, month + 1, 0);
                  const daysInMonth = lastDay.getDate();
                  
                  // Adjust for Monday start (0 = Monday, 6 = Sunday)
                  let startDay = firstDay.getDay() - 1;
                  if (startDay < 0) startDay = 6;
                  
                  const days = [];
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  
                  // Empty cells before first day
                  for (let i = 0; i < startDay; i++) {
                    days.push(
                      <div key={`empty-${i}`} className="min-h-[120px] p-2 border-r border-b border-white/10 bg-black/20"></div>
                    );
                  }
                  
                  // Days of month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const currentDate = new Date(year, month, day);
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const isToday = currentDate.getTime() === today.getTime();
                    
                    // Get appointments for this day (check both proposed_date and confirmed dates)
                    const dayAppointments = appointments.filter(apt => {
                      const aptDate = apt.confirmed_date || apt.proposed_date;
                      return aptDate === dateStr;
                    });
                    
                    // Get bookings for this day
                    const dayBookings = bookings.filter(b => b.event_date === dateStr);
                    
                    days.push(
                      <div 
                        key={day} 
                        className={`min-h-[120px] p-2 border-r border-b border-white/10 ${isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className={`font-primary font-bold text-sm mb-2 ${isToday ? 'text-primary' : 'text-white/60'}`}>
                          {day}
                        </div>
                        <div className="space-y-1 overflow-y-auto max-h-[90px]">
                          {dayAppointments.map((apt) => {
                            const statusColors = {
                              pending: 'bg-yellow-500/30 border-yellow-500 text-yellow-300',
                              confirmed: 'bg-green-500/30 border-green-500 text-green-300',
                              refused: 'bg-red-500/30 border-red-500 text-red-300',
                              proposed: 'bg-blue-500/30 border-blue-500 text-blue-300'
                            };
                            const color = statusColors[apt.status] || statusColors.pending;
                            const time = apt.confirmed_time || apt.proposed_time;
                            
                            return (
                              <div 
                                key={apt.id}
                                onClick={() => { setSelectedAppointment(apt); setActiveTab("appointments"); }}
                                className={`text-xs p-1.5 border cursor-pointer hover:opacity-80 ${color}`}
                                title={`${apt.client_name} - ${apt.appointment_type}`}
                              >
                                <div className="font-bold truncate">{time} - {apt.client_name}</div>
                                <div className="truncate text-[10px] opacity-80">{apt.appointment_type}</div>
                              </div>
                            );
                          })}
                          {dayBookings.map((booking) => (
                            <div 
                              key={booking.id}
                              className="text-xs p-1.5 border bg-purple-500/30 border-purple-500 text-purple-300"
                              title={`Réservation: ${booking.client_name}`}
                            >
                              <div className="font-bold truncate">📷 {booking.client_name}</div>
                              <div className="truncate text-[10px] opacity-80">{booking.service_name || 'Réservation'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  // Fill remaining cells to complete the grid
                  const totalCells = days.length;
                  const remainingCells = (7 - (totalCells % 7)) % 7;
                  for (let i = 0; i < remainingCells; i++) {
                    days.push(
                      <div key={`empty-end-${i}`} className="min-h-[120px] p-2 border-r border-b border-white/10 bg-black/20"></div>
                    );
                  }
                  
                  return days;
                })()}
              </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="bg-card border border-white/10 p-4 text-center">
                <p className="text-3xl font-bold text-yellow-500">{appointments.filter(a => a.status === 'pending').length}</p>
                <p className="text-white/60 text-sm">En attente</p>
              </div>
              <div className="bg-card border border-white/10 p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{appointments.filter(a => a.status === 'confirmed').length}</p>
                <p className="text-white/60 text-sm">Confirmés</p>
              </div>
              <div className="bg-card border border-white/10 p-4 text-center">
                <p className="text-3xl font-bold text-blue-500">{appointments.filter(a => a.status === 'proposed').length}</p>
                <p className="text-white/60 text-sm">Date proposée</p>
              </div>
              <div className="bg-card border border-white/10 p-4 text-center">
                <p className="text-3xl font-bold text-purple-500">{bookings.length}</p>
                <p className="text-white/60 text-sm">Réservations</p>
              </div>
            </div>
          </div>
        )}

        {/* Galleries Tab */}
        {activeTab === "galleries" && (
          <div data-testid="admin-galleries">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">
                📸 Galeries Photos - Sélection Client
              </h2>
              <button 
                onClick={() => setShowAddGallery(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Créer une galerie
              </button>
            </div>

            <p className="text-white/60 mb-6">
              Uploadez des photos pour vos clients. Ils pourront les voir et sélectionner celles qu'ils souhaitent pour la retouche.
            </p>

            {/* Add Gallery Modal */}
            {showAddGallery && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/20 p-6 max-w-md w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-primary font-bold text-lg">Nouvelle Galerie</h3>
                    <button onClick={() => setShowAddGallery(false)} className="text-white/60 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Client *</label>
                      <select
                        value={newGallery.client_id}
                        onChange={(e) => setNewGallery({ ...newGallery, client_id: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      >
                        <option value="">Sélectionner un client</option>
                        {clients.map(client => (
                          <option key={client.id} value={client.id}>{client.name} ({client.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Nom de la galerie *</label>
                      <input
                        type="text"
                        placeholder="Ex: Mariage 15 juin 2024"
                        value={newGallery.name}
                        onChange={(e) => setNewGallery({ ...newGallery, name: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Description (optionnel)</label>
                      <textarea
                        placeholder="Description de l'événement..."
                        value={newGallery.description}
                        onChange={(e) => setNewGallery({ ...newGallery, description: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                        rows={2}
                      />
                    </div>
                    <button onClick={createGallery} className="btn-primary w-full py-3">
                      Créer la galerie
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Gallery List or Detail View */}
            {!selectedGallery ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleries.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-white/60">
                    Aucune galerie créée. Cliquez sur "Créer une galerie" pour commencer.
                  </div>
                ) : (
                  galleries.map((gallery) => (
                    <div 
                      key={gallery.id} 
                      className="bg-card border border-white/10 p-4 hover:border-primary transition-colors cursor-pointer"
                      onClick={() => setSelectedGallery(gallery)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-primary font-bold">{gallery.name}</h3>
                          <p className="text-white/60 text-sm">{gallery.client_name}</p>
                        </div>
                        <div className="flex gap-2">
                          {gallery.music_url && (
                            <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 flex items-center gap-1" title="Musique ajoutée">
                              <Music size={12} />
                            </span>
                          )}
                          {gallery.is_validated && (
                            <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 flex items-center gap-1">
                              <Check size={12} /> Validé
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-sm text-white/50">
                        <span>{gallery.photos?.length || 0} photos</span>
                        <span>{gallery.selection_count || 0} sélectionnées</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Gallery Detail View */
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <button 
                      onClick={() => { setSelectedGallery(null); setGallerySelection(null); }}
                      className="text-primary hover:underline text-sm mb-2"
                    >
                      ← Retour aux galeries
                    </button>
                    <h3 className="font-primary font-bold text-xl">{selectedGallery.name}</h3>
                    <p className="text-white/60">{selectedGallery.client_name} • {selectedGallery.photos?.length || 0} photos</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      ref={galleryFileRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryPhotoUpload}
                    />
                    <input
                      type="file"
                      ref={galleryMusicRef}
                      className="hidden"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                      onChange={handleGalleryMusicUpload}
                    />
                    <button 
                      onClick={() => galleryFileRef.current?.click()}
                      disabled={uploadingGalleryPhoto}
                      className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {uploadingGalleryPhoto ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                      Ajouter des photos
                    </button>
                    <button 
                      onClick={() => galleryMusicRef.current?.click()}
                      disabled={uploadingGalleryMusic}
                      className={`px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50 ${
                        selectedGallery.music_url 
                          ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" 
                          : "btn-outline"
                      }`}
                      data-testid="upload-music-button"
                    >
                      {uploadingGalleryMusic ? <Loader size={16} className="animate-spin" /> : <Music size={16} />}
                      {selectedGallery.music_url ? "Changer musique" : "Ajouter musique"}
                    </button>
                    {selectedGallery.music_url && (
                      <button 
                        onClick={deleteGalleryMusic}
                        className="bg-red-500/20 text-red-400 px-3 py-2 text-sm hover:bg-red-500/30"
                        title="Supprimer la musique"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => viewGallerySelection(selectedGallery)}
                      className="btn-outline px-4 py-2 text-sm"
                    >
                      Voir sélection ({selectedGallery.selection_count || 0})
                    </button>
                    <button 
                      onClick={() => deleteGallery(selectedGallery.id)}
                      className="bg-red-500/20 text-red-500 px-4 py-2 text-sm hover:bg-red-500/30"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Selection View */}
                {gallerySelection && gallerySelection.photos && gallerySelection.photos.length > 0 && (
                  <div className="bg-green-500/10 border border-green-500/30 p-4 mb-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-primary font-bold text-green-400">
                        📋 Photos sélectionnées par le client ({gallerySelection.photos.length})
                      </h4>
                      <div className="flex items-center gap-3">
                        {gallerySelection.is_validated && (
                          <span className="bg-green-500 text-black text-xs px-3 py-1 font-bold">
                            ✓ VALIDÉ
                          </span>
                        )}
                        <a
                          href={`${API}/admin/galleries/${selectedGallery.id}/download-selection`}
                          onClick={(e) => {
                            e.preventDefault();
                            // Create download with auth header
                            fetch(`${API}/admin/galleries/${selectedGallery.id}/download-selection`, {
                              headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` }
                            })
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Selection_${selectedGallery.name.replace(/\s/g, '_')}.zip`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              a.remove();
                              toast.success("Téléchargement du ZIP en cours...");
                            })
                            .catch(() => toast.error("Erreur lors du téléchargement"));
                          }}
                          className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                        >
                          <Download size={16} /> Télécharger ZIP
                        </a>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                      {gallerySelection.photos.map((photo) => (
                        <div key={photo.id} className="aspect-square border-2 border-green-500">
                          <img 
                            src={`${BACKEND_URL}${photo.url}`} 
                            alt="" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => setGallerySelection(null)}
                      className="text-white/60 hover:text-white text-sm mt-3"
                    >
                      Masquer la sélection
                    </button>
                  </div>
                )}

                {/* All Photos Grid */}
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {selectedGallery.photos?.map((photo) => {
                    const isSelected = gallerySelection?.selected_photo_ids?.includes(photo.id);
                    return (
                      <div 
                        key={photo.id} 
                        className={`relative aspect-square group ${isSelected ? 'ring-2 ring-green-500' : ''}`}
                      >
                        <img 
                          src={`${BACKEND_URL}${photo.url}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-green-500 text-black p-1">
                            <Check size={12} />
                          </div>
                        )}
                        <button
                          onClick={() => deleteGalleryPhoto(photo.id)}
                          className="absolute top-1 left-1 bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {(!selectedGallery.photos || selectedGallery.photos.length === 0) && (
                  <div className="text-center py-12 text-white/60 border border-dashed border-white/20">
                    <Image size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucune photo dans cette galerie</p>
                    <p className="text-sm">Cliquez sur "Ajouter des photos" pour commencer</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Guestbooks Tab */}
        {activeTab === "guestbooks" && (
          <div>
            {!selectedGuestbook ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="font-primary font-bold text-xl">Livres d'or ({guestbooks.length})</h2>
                  <button 
                    onClick={() => setShowAddGuestbook(true)}
                    className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                    data-testid="add-guestbook-btn"
                  >
                    <Plus size={16} /> Nouveau livre d'or
                  </button>
                </div>

                {/* Add Guestbook Modal */}
                {showAddGuestbook && (
                  <div className="bg-card border border-white/10 p-6 mb-6 rounded-lg">
                    <h3 className="font-bold mb-4">Créer un livre d'or</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Client *</label>
                        <select
                          value={newGuestbook.client_id}
                          onChange={(e) => setNewGuestbook({...newGuestbook, client_id: e.target.value})}
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white"
                        >
                          <option value="" className="bg-[#1a1a1a] text-white">Sélectionner un client</option>
                          {clients.map(c => (
                            <option key={c.id} value={c.id} className="bg-[#1a1a1a] text-white">{c.name} ({c.email})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Nom du livre d'or *</label>
                        <input
                          type="text"
                          value={newGuestbook.name}
                          onChange={(e) => setNewGuestbook({...newGuestbook, name: e.target.value})}
                          placeholder="Ex: Mariage Julie & Marc"
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Date de l'événement</label>
                        <input
                          type="text"
                          value={newGuestbook.event_date}
                          onChange={(e) => setNewGuestbook({...newGuestbook, event_date: e.target.value})}
                          placeholder="Ex: 15 juin 2025"
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-1">Message d'accueil</label>
                        <input
                          type="text"
                          value={newGuestbook.welcome_message}
                          onChange={(e) => setNewGuestbook({...newGuestbook, welcome_message: e.target.value})}
                          placeholder="Laissez un message pour les mariés !"
                          className="w-full bg-black/50 border border-white/20 rounded px-3 py-2 text-white placeholder:text-white/40"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button onClick={createGuestbook} className="btn-primary px-4 py-2 text-sm">Créer</button>
                      <button onClick={() => setShowAddGuestbook(false)} className="btn-outline px-4 py-2 text-sm">Annuler</button>
                    </div>
                  </div>
                )}

                {/* Guestbooks List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guestbooks.map((gb) => (
                    <div 
                      key={gb.id} 
                      className="bg-card border border-white/10 p-4 hover:border-primary transition-colors cursor-pointer"
                      onClick={() => fetchGuestbookDetail(gb.id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-primary font-bold">{gb.name}</h3>
                          <p className="text-white/60 text-sm">{gb.client_name}</p>
                          {gb.event_date && <p className="text-white/40 text-xs mt-1">{gb.event_date}</p>}
                        </div>
                        <BookOpen className="text-primary" size={20} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">{gb.message_count || 0} messages</span>
                        {gb.pending_count > 0 && (
                          <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs">
                            {gb.pending_count} en attente
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {guestbooks.length === 0 && (
                    <div className="col-span-full text-center py-12 text-white/40">
                      <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Aucun livre d'or créé</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Guestbook Detail View */}
                <div className="flex items-center gap-4 mb-6">
                  <button 
                    onClick={() => setSelectedGuestbook(null)}
                    className="text-white/60 hover:text-white"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-primary font-bold text-xl">{selectedGuestbook.name}</h2>
                    <p className="text-white/60 text-sm">{selectedGuestbook.client_name} • {selectedGuestbook.event_date}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyGuestbookLink(selectedGuestbook.id)}
                      className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                      title="Copier le lien de partage"
                    >
                      <Copy size={16} /> Copier le lien
                    </button>
                    <button 
                      onClick={() => deleteGuestbook(selectedGuestbook.id)}
                      className="bg-red-500/20 text-red-500 px-4 py-2 text-sm hover:bg-red-500/30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="bg-card border border-white/10 p-4 mb-6 flex items-center gap-6">
                  <div className="bg-white p-2 rounded">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/livre-dor/${selectedGuestbook.id}`)}`}
                      alt="QR Code"
                      className="w-24 h-24"
                    />
                  </div>
                  <div>
                    <p className="font-medium mb-1">QR Code de partage</p>
                    <p className="text-white/60 text-sm mb-2">Les invités peuvent scanner ce code pour laisser un message</p>
                    <code className="text-xs bg-black/50 px-2 py-1 rounded text-primary">
                      {window.location.origin}/livre-dor/{selectedGuestbook.id}
                    </code>
                  </div>
                </div>

                {/* Messages List */}
                <div>
                  <h3 className="font-bold mb-4">
                    Messages ({selectedGuestbook.messages?.length || 0})
                  </h3>
                  
                  {selectedGuestbook.messages?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedGuestbook.messages.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`bg-card border p-4 ${msg.is_approved ? 'border-green-500/30' : 'border-yellow-500/30'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                                <span className="text-primary font-bold">{msg.author_name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <p className="font-medium">{msg.author_name}</p>
                                <p className="text-white/40 text-xs">
                                  {msg.message_type === "text" ? "Texte" : msg.message_type === "audio" ? "Audio" : "Vidéo"}
                                  {" • "}
                                  {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!msg.is_approved && (
                                <button
                                  onClick={() => approveGuestbookMessage(msg.id)}
                                  className="bg-green-500/20 text-green-500 px-3 py-1 text-sm hover:bg-green-500/30 flex items-center gap-1"
                                >
                                  <Check size={14} /> Approuver
                                </button>
                              )}
                              <button
                                onClick={() => deleteGuestbookMessage(msg.id)}
                                className="bg-red-500/20 text-red-500 p-1 hover:bg-red-500/30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          
                          {/* Message Content */}
                          {msg.message_type === "text" && (
                            <p className="text-white/80 ml-13 pl-13">{msg.text_content}</p>
                          )}
                          {msg.message_type === "audio" && (
                            <audio src={`${BACKEND_URL}${msg.media_url}`} controls className="w-full mt-2" />
                          )}
                          {msg.message_type === "video" && (
                            <video src={`${BACKEND_URL}${msg.media_url}`} controls className="w-full mt-2 rounded max-h-64" />
                          )}
                          
                          {!msg.is_approved && (
                            <span className="inline-block mt-2 bg-yellow-500/20 text-yellow-500 text-xs px-2 py-0.5 rounded">
                              En attente d'approbation
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-white/40">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Aucun message pour le moment</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Site Content Tab */}
        {activeTab === "content" && siteContent && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Modifier le contenu du site</h2>
              <button onClick={updateSiteContent} className="btn-primary px-6 py-2 text-sm">
                Enregistrer les modifications
              </button>
            </div>

            {/* Hidden file input for content uploads */}
            <input
              type="file"
              ref={contentFileRef}
              onChange={handleContentImageUpload}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />

            {/* Hero Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-primary">Section Hero (Accueil)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre principal</label>
                  <input
                    type="text"
                    value={editingContent.hero_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, hero_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.hero_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, hero_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image de fond</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingContent.hero_image || ""}
                      onChange={(e) => setEditingContent({...editingContent, hero_image: e.target.value})}
                      className="flex-1 bg-background border border-white/20 px-4 py-3"
                      placeholder="URL ou cliquez sur Uploader"
                    />
                    <button
                      type="button"
                      onClick={() => triggerContentUpload('hero_image')}
                      disabled={uploadingContentImage}
                      className="btn-primary px-4 py-3 flex items-center gap-2"
                    >
                      {uploadingContentImage && currentContentField === 'hero_image' ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Uploader
                    </button>
                  </div>
                  {editingContent.hero_image && (
                    <img src={editingContent.hero_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Wedding Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-pink-400">Service Mariage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.wedding_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.wedding_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.wedding_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, wedding_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingContent.wedding_image || ""}
                      onChange={(e) => setEditingContent({...editingContent, wedding_image: e.target.value})}
                      className="flex-1 bg-background border border-white/20 px-4 py-3"
                      placeholder="URL ou cliquez sur Uploader"
                    />
                    <button
                      type="button"
                      onClick={() => triggerContentUpload('wedding_image')}
                      disabled={uploadingContentImage}
                      className="btn-primary px-4 py-3 flex items-center gap-2"
                    >
                      {uploadingContentImage && currentContentField === 'wedding_image' ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Uploader
                    </button>
                  </div>
                  {editingContent.wedding_image && (
                    <img src={editingContent.wedding_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Podcast Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-blue-400">Service Podcast</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.podcast_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.podcast_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.podcast_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, podcast_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingContent.podcast_image || ""}
                      onChange={(e) => setEditingContent({...editingContent, podcast_image: e.target.value})}
                      className="flex-1 bg-background border border-white/20 px-4 py-3"
                      placeholder="URL ou cliquez sur Uploader"
                    />
                    <button
                      type="button"
                      onClick={() => triggerContentUpload('podcast_image')}
                      disabled={uploadingContentImage}
                      className="btn-primary px-4 py-3 flex items-center gap-2"
                    >
                      {uploadingContentImage && currentContentField === 'podcast_image' ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Uploader
                    </button>
                  </div>
                  {editingContent.podcast_image && (
                    <img src={editingContent.podcast_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* TV Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-purple-400">Service Plateau TV</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre</label>
                  <input
                    type="text"
                    value={editingContent.tv_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre</label>
                  <input
                    type="text"
                    value={editingContent.tv_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Description</label>
                  <textarea
                    value={editingContent.tv_description || ""}
                    onChange={(e) => setEditingContent({...editingContent, tv_description: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-white/60 mb-2">Image</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={editingContent.tv_image || ""}
                      onChange={(e) => setEditingContent({...editingContent, tv_image: e.target.value})}
                      className="flex-1 bg-background border border-white/20 px-4 py-3"
                      placeholder="URL ou cliquez sur Uploader"
                    />
                    <button
                      type="button"
                      onClick={() => triggerContentUpload('tv_image')}
                      disabled={uploadingContentImage}
                      className="btn-primary px-4 py-3 flex items-center gap-2"
                    >
                      {uploadingContentImage && currentContentField === 'tv_image' ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Upload size={16} />
                      )}
                      Uploader
                    </button>
                  </div>
                  {editingContent.tv_image && (
                    <img src={editingContent.tv_image} alt="Preview" className="mt-2 h-32 object-cover" />
                  )}
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-green-400">Informations de Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Téléphone</label>
                  <input
                    type="text"
                    value={editingContent.phone || ""}
                    onChange={(e) => setEditingContent({...editingContent, phone: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <input
                    type="email"
                    value={editingContent.email || ""}
                    onChange={(e) => setEditingContent({...editingContent, email: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Adresse</label>
                  <input
                    type="text"
                    value={editingContent.address || ""}
                    onChange={(e) => setEditingContent({...editingContent, address: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Horaires</label>
                  <input
                    type="text"
                    value={editingContent.hours || ""}
                    onChange={(e) => setEditingContent({...editingContent, hours: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-yellow-400">Section Appel à l'action</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titre CTA</label>
                  <input
                    type="text"
                    value={editingContent.cta_title || ""}
                    onChange={(e) => setEditingContent({...editingContent, cta_title: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Sous-titre CTA</label>
                  <input
                    type="text"
                    value={editingContent.cta_subtitle || ""}
                    onChange={(e) => setEditingContent({...editingContent, cta_subtitle: e.target.value})}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
            </div>

            <button onClick={updateSiteContent} className="btn-primary w-full py-4 text-sm">
              Enregistrer toutes les modifications
            </button>
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === "portfolio" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gérer le Portfolio</h2>
              <button
                onClick={() => setShowAddPortfolio(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>

            {/* Add Portfolio Modal */}
            {showAddPortfolio && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <h3 className="font-primary font-bold text-xl mb-4">Ajouter au Portfolio</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nom du client *"
                      value={newPortfolioItem.client_name}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, client_name: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                      data-testid="portfolio-client-name"
                    />
                    <input
                      type="text"
                      placeholder="Titre"
                      value={newPortfolioItem.title}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, title: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <textarea
                      placeholder="Description"
                      value={newPortfolioItem.description}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, description: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                      rows={2}
                    />
                    <select
                      value={newPortfolioItem.category}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, category: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    >
                      <option value="wedding">Mariage</option>
                      <option value="podcast">Podcast</option>
                      <option value="tv_set">Plateau TV</option>
                    </select>
                    
                    {/* Upload Multiple Photos Section */}
                    <div className="border-2 border-dashed border-green-500/50 p-4 text-center bg-green-500/5">
                      <input
                        type="file"
                        ref={multiplePhotosRef}
                        onChange={handleMultiplePhotosUpload}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newPortfolioItem.client_name.trim()) {
                            toast.error("Veuillez d'abord renseigner le nom du client");
                            return;
                          }
                          multiplePhotosRef.current?.click();
                        }}
                        disabled={uploadingMultiplePhotos}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 w-full flex items-center justify-center gap-2 font-bold"
                      >
                        {uploadingMultiplePhotos ? (
                          <>
                            <Loader size={16} className="animate-spin" /> 
                            Upload {multiplePhotosProgress.current}/{multiplePhotosProgress.total}...
                          </>
                        ) : (
                          <>
                            <Upload size={16} /> 📸 Uploader PLUSIEURS photos
                          </>
                        )}
                      </button>
                      <p className="text-xs text-white/50 mt-2">Sélectionnez plusieurs photos d'un coup (JPG, PNG, WEBP, GIF)</p>
                    </div>
                    
                    <div className="text-white/40 text-center text-sm">— OU une seule photo/vidéo —</div>
                    
                    {/* Upload Single File Section */}
                    <div className="border-2 border-dashed border-primary/50 p-4 text-center bg-primary/5">
                      <input
                        type="file"
                        ref={portfolioFileRef}
                        onChange={handlePortfolioFileUpload}
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => portfolioFileRef.current?.click()}
                        disabled={uploadingPortfolio}
                        className="btn-primary px-6 py-3 w-full flex items-center justify-center gap-2"
                      >
                        {uploadingPortfolio ? (
                          <>
                            <Loader size={16} className="animate-spin" /> Upload en cours...
                          </>
                        ) : (
                          <>
                            <Upload size={16} /> Uploader une photo/vidéo
                          </>
                        )}
                      </button>
                      <p className="text-xs text-white/50 mt-2">JPG, PNG, WEBP, GIF, MP4, WEBM, MOV (max 1 Go)</p>
                    </div>
                    
                    {/* Preview uploaded file */}
                    {newPortfolioItem.media_url && (
                      <div className="relative">
                        <p className="text-sm text-white/60 mb-2">Aperçu :</p>
                        {newPortfolioItem.media_type === 'photo' ? (
                          <img src={newPortfolioItem.media_url} alt="Preview" className="w-full h-40 object-cover" />
                        ) : (
                          <video src={newPortfolioItem.media_url} className="w-full h-40 object-cover" controls />
                        )}
                      </div>
                    )}
                    
                    <div className="text-white/40 text-center text-sm">— ou URL externe —</div>
                    
                    <input
                      type="url"
                      placeholder="URL externe (YouTube, Vimeo, etc.)"
                      value={newPortfolioItem.media_url}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, media_url: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    
                    {/* Thumbnail upload section for videos */}
                    <div className="space-y-2">
                      <p className="text-sm text-white/60">Miniature (optionnel, pour vidéos) :</p>
                      <input
                        type="file"
                        id="thumbnail-upload"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleThumbnailUpload}
                      />
                      <label
                        htmlFor="thumbnail-upload"
                        className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-primary/50 py-3 cursor-pointer hover:bg-primary/10 transition-colors ${uploadingThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingThumbnail ? (
                          <>
                            <Loader size={16} className="animate-spin" /> Upload en cours...
                          </>
                        ) : (
                          <>
                            <Upload size={16} /> Uploader une miniature
                          </>
                        )}
                      </label>
                      <p className="text-xs text-white/50">JPG, PNG, WEBP, GIF (max 50 Mo)</p>
                      
                      {/* Thumbnail preview */}
                      {newPortfolioItem.thumbnail_url && (
                        <div className="relative">
                          <img src={newPortfolioItem.thumbnail_url} alt="Miniature" className="w-full h-32 object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewPortfolioItem({ ...newPortfolioItem, thumbnail_url: '' })}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <select
                      value={newPortfolioItem.media_type}
                      onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, media_type: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    >
                      <option value="photo">📷 Photo</option>
                      <option value="video">🎬 Vidéo</option>
                      <option value="story">📱 Story (vidéo courte)</option>
                    </select>
                    
                    {/* Story duration slider */}
                    {newPortfolioItem.media_type === "story" && (
                      <div className="bg-purple-500/10 border border-purple-500/30 p-4 rounded">
                        <label className="block text-sm text-purple-400 mb-2">
                          ⏱️ Durée de la story : {newPortfolioItem.story_duration >= 60 
                            ? `${Math.floor(newPortfolioItem.story_duration / 60)}m${newPortfolioItem.story_duration % 60 > 0 ? ` ${newPortfolioItem.story_duration % 60}s` : ''}`
                            : `${newPortfolioItem.story_duration}s`}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="90"
                          value={newPortfolioItem.story_duration}
                          onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, story_duration: parseInt(e.target.value) })}
                          className="w-full accent-purple-500"
                        />
                        <div className="flex justify-between text-xs text-white/40 mt-1">
                          <span>1s</span>
                          <span>30s</span>
                          <span>1m</span>
                          <span>1m30</span>
                        </div>
                        <p className="text-xs text-purple-300/60 mt-2">
                          💡 Les stories apparaissent en haut de la page Portfolio, comme sur Instagram
                        </p>
                      </div>
                    )}
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPortfolioItem.is_featured}
                        onChange={(e) => setNewPortfolioItem({ ...newPortfolioItem, is_featured: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-sm">Mettre en avant</span>
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddPortfolio(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button onClick={createPortfolioItem} className="btn-primary flex-1 py-3">
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Portfolio Modal */}
            {editingPortfolio && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  <h3 className="font-primary font-bold text-xl mb-4">Modifier l'élément</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Nom du client</label>
                      <input
                        type="text"
                        placeholder="Nom du client"
                        value={editingPortfolio.client_name || ""}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, client_name: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Titre</label>
                      <input
                        type="text"
                        placeholder="Titre"
                        value={editingPortfolio.title || ""}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, title: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Description</label>
                      <textarea
                        placeholder="Description"
                        value={editingPortfolio.description || ""}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, description: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Catégorie</label>
                      <select
                        value={editingPortfolio.category || "wedding"}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, category: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      >
                        <option value="wedding">Mariage</option>
                        <option value="podcast">Podcast</option>
                        <option value="tv_set">Plateau TV</option>
                      </select>
                    </div>
                    
                    {/* Current Media Preview */}
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Média actuel</label>
                      <div className="relative aspect-video bg-black/30 mb-2">
                        {editingPortfolio.media_type === "photo" ? (
                          <img src={editingPortfolio.media_url} alt="Aperçu" className="w-full h-full object-contain" />
                        ) : (
                          <img src={editingPortfolio.thumbnail_url || editingPortfolio.media_url} alt="Aperçu" className="w-full h-full object-contain" />
                        )}
                      </div>
                    </div>
                    
                    {/* Upload New Media */}
                    <div>
                      <label className="text-sm text-white/60 mb-1 block">Changer le média (optionnel)</label>
                      <input
                        type="file"
                        id="edit-portfolio-media"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await axios.post(`${API}/upload/portfolio`, formData, {
                              headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                            });
                            const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
                            setEditingPortfolio({ 
                              ...editingPortfolio, 
                              media_url: uploadedUrl,
                              media_type: res.data.media_type
                            });
                            toast.success("Média mis à jour !");
                          } catch (err) {
                            toast.error("Erreur lors de l'upload");
                          }
                        }}
                      />
                      <label
                        htmlFor="edit-portfolio-media"
                        className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-primary/50 py-3 cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        <Upload size={16} /> Uploader un nouveau média
                      </label>
                    </div>
                    
                    {/* Upload New Thumbnail */}
                    {editingPortfolio.media_type === "video" && (
                      <div>
                        <label className="text-sm text-white/60 mb-1 block">Miniature vidéo</label>
                        {editingPortfolio.thumbnail_url && (
                          <div className="relative mb-2">
                            <img src={editingPortfolio.thumbnail_url} alt="Miniature" className="w-full h-32 object-cover" />
                            <button
                              type="button"
                              onClick={() => setEditingPortfolio({ ...editingPortfolio, thumbnail_url: '' })}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                        <input
                          type="file"
                          id="edit-portfolio-thumbnail"
                          className="hidden"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await axios.post(`${API}/upload/portfolio`, formData, {
                                headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                              });
                              const uploadedUrl = `${BACKEND_URL}${res.data.url}`;
                              setEditingPortfolio({ ...editingPortfolio, thumbnail_url: uploadedUrl });
                              toast.success("Miniature mise à jour !");
                            } catch (err) {
                              toast.error("Erreur lors de l'upload");
                            }
                          }}
                        />
                        <label
                          htmlFor="edit-portfolio-thumbnail"
                          className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-primary/50 py-3 cursor-pointer hover:bg-primary/10 transition-colors"
                        >
                          <Upload size={16} /> {editingPortfolio.thumbnail_url ? "Changer la miniature" : "Ajouter une miniature"}
                        </label>
                      </div>
                    )}
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingPortfolio.is_featured || false}
                        onChange={(e) => setEditingPortfolio({ ...editingPortfolio, is_featured: e.target.checked })}
                        className="accent-primary"
                      />
                      <span className="text-sm">Mettre en avant (Featured)</span>
                    </label>
                    
                    <div className="flex gap-2 pt-4">
                      <button 
                        onClick={() => setEditingPortfolio(null)} 
                        className="btn-outline flex-1 py-3"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await updatePortfolioItem(editingPortfolio.id, {
                              title: editingPortfolio.title,
                              description: editingPortfolio.description,
                              client_name: editingPortfolio.client_name,
                              category: editingPortfolio.category,
                              media_url: editingPortfolio.media_url,
                              thumbnail_url: editingPortfolio.thumbnail_url,
                              is_featured: editingPortfolio.is_featured
                            });
                            setEditingPortfolio(null);
                            toast.success("Élément modifié !");
                          } catch (err) {
                            toast.error("Erreur lors de la modification");
                          }
                        }} 
                        className="btn-primary flex-1 py-3"
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio Grid - Organized by Client */}
            
            {/* Filter and View Toggle */}
            <div className="flex flex-wrap gap-4 mb-6 items-center">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPortfolioFilterCategory("all")}
                  className={`px-4 py-2 text-xs font-bold ${portfolioFilterCategory === "all" ? "bg-primary text-black" : "bg-card border border-white/20 text-white/60"}`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setPortfolioFilterCategory("stories")}
                  className={`px-4 py-2 text-xs font-bold ${portfolioFilterCategory === "stories" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "bg-card border border-white/20 text-white/60"}`}
                >
                  📱 Stories ({portfolio.filter(p => p.media_type === "story").length})
                </button>
                <button
                  onClick={() => setPortfolioFilterCategory("wedding")}
                  className={`px-4 py-2 text-xs font-bold ${portfolioFilterCategory === "wedding" ? "bg-pink-500 text-white" : "bg-card border border-white/20 text-white/60"}`}
                >
                  Mariages
                </button>
                <button
                  onClick={() => setPortfolioFilterCategory("podcast")}
                  className={`px-4 py-2 text-xs font-bold ${portfolioFilterCategory === "podcast" ? "bg-blue-500 text-white" : "bg-card border border-white/20 text-white/60"}`}
                >
                  Podcast
                </button>
                <button
                  onClick={() => setPortfolioFilterCategory("tv_set")}
                  className={`px-4 py-2 text-xs font-bold ${portfolioFilterCategory === "tv_set" ? "bg-purple-500 text-white" : "bg-card border border-white/20 text-white/60"}`}
                >
                  Plateau TV
                </button>
              </div>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => { setPortfolioViewMode("clients"); setSelectedPortfolioClient(null); }}
                  className={`px-4 py-2 text-xs ${portfolioViewMode === "clients" ? "btn-primary" : "btn-outline"}`}
                >
                  👥 Par Client
                </button>
                <button
                  onClick={() => setPortfolioViewMode("all")}
                  className={`px-4 py-2 text-xs ${portfolioViewMode === "all" ? "btn-primary" : "btn-outline"}`}
                >
                  📋 Tout Afficher
                </button>
              </div>
            </div>

            {/* Stories Section - Quick Access */}
            {portfolioFilterCategory === "stories" && (
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {portfolio.filter(p => p.media_type === "story").map((item) => {
                    const views = storyViews[item.id] || { total: 0, clients: 0, anonymous: 0 };
                    return (
                    <div key={item.id} className="bg-card border border-purple-500/30 overflow-hidden" data-testid={`story-admin-${item.id}`}>
                      <div className="relative aspect-video bg-black/50">
                        {item.thumbnail_url ? (
                          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <video src={item.media_url} className="w-full h-full object-cover" muted />
                        )}
                        <span className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-1 font-bold">
                          📱 Story
                        </span>
                        <span className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 font-mono">
                          {item.story_duration >= 60 
                            ? `${Math.floor(item.story_duration / 60)}m${item.story_duration % 60 > 0 ? item.story_duration % 60 + 's' : ''}`
                            : `${item.story_duration || 3}s`}
                        </span>
                        <span className={`absolute bottom-2 left-2 text-xs px-2 py-1 font-bold ${
                          item.category === "wedding" ? "bg-pink-500" : item.category === "podcast" ? "bg-blue-500" : "bg-purple-500"
                        }`}>
                          {item.category === "wedding" ? "Mariage" : item.category === "podcast" ? "Podcast" : "TV"}
                        </span>
                      </div>
                      <div className="p-4">
                        <p className="text-primary text-xs font-bold mb-1 uppercase tracking-wider">{item.client_name || "Sans client"}</p>
                        <h3 className="font-primary font-semibold text-sm truncate mb-2">{item.title}</h3>
                        
                        {/* Views Stats */}
                        <div 
                          className="bg-black/30 p-2 rounded mb-3 cursor-pointer hover:bg-black/50 transition-colors"
                          onClick={() => fetchStoryViewDetails(item.id)}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/60">👁️ Vues</span>
                            <span className="font-bold text-white">{views.total}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-green-400">👤 Clients</span>
                            <span className="text-green-400">{views.clients}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-gray-400">👻 Anonymes</span>
                            <span className="text-gray-400">{views.anonymous}</span>
                          </div>
                          <p className="text-[10px] text-white/40 mt-1 text-center">Cliquer pour détails</p>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPortfolio(item)}
                            className="flex-1 py-2 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30"
                          >
                            ✎ Modifier
                          </button>
                          <button
                            onClick={() => deletePortfolioItem(item.id)}
                            className="flex-1 py-2 text-xs bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
                {portfolio.filter(p => p.media_type === "story").length === 0 && (
                  <p className="text-center text-white/60 py-12">Aucune story. Cliquez sur "+ Ajouter" et sélectionnez "📱 Story"</p>
                )}

                {/* Story Views Detail Modal */}
                {selectedStoryViews && (
                  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-white/10 p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-primary font-bold text-lg">👁️ Détails des vues</h3>
                        <button onClick={() => setSelectedStoryViews(null)} className="text-white/60 hover:text-white">
                          <X size={24} />
                        </button>
                      </div>
                      
                      {/* Stats Summary */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-black/30 p-3 text-center rounded">
                          <p className="text-2xl font-bold">{selectedStoryViews.total_views}</p>
                          <p className="text-xs text-white/60">Total</p>
                        </div>
                        <div className="bg-green-500/20 p-3 text-center rounded">
                          <p className="text-2xl font-bold text-green-400">{selectedStoryViews.client_views?.length || 0}</p>
                          <p className="text-xs text-green-400">Clients</p>
                        </div>
                        <div className="bg-gray-500/20 p-3 text-center rounded">
                          <p className="text-2xl font-bold text-gray-400">{selectedStoryViews.anonymous_views}</p>
                          <p className="text-xs text-gray-400">Anonymes</p>
                        </div>
                      </div>
                      
                      {/* Client Views List */}
                      {selectedStoryViews.client_views?.length > 0 && (
                        <div>
                          <h4 className="font-primary font-bold text-sm mb-3 text-green-400">👤 Clients qui ont vu</h4>
                          <div className="space-y-2">
                            {selectedStoryViews.client_views.map((view, index) => (
                              <div key={index} className="flex justify-between items-center bg-green-500/10 p-2 rounded">
                                <span className="font-medium">{view.name}</span>
                                <span className="text-xs text-white/60">
                                  {new Date(view.viewed_at).toLocaleDateString('fr-FR', { 
                                    day: '2-digit', 
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedStoryViews.anonymous_views > 0 && (
                        <div className="mt-4 p-3 bg-gray-500/10 rounded">
                          <p className="text-sm text-gray-400">
                            👻 {selectedStoryViews.anonymous_views} visiteur{selectedStoryViews.anonymous_views > 1 ? 's' : ''} anonyme{selectedStoryViews.anonymous_views > 1 ? 's' : ''} ont également vu cette story
                          </p>
                        </div>
                      )}
                      
                      {selectedStoryViews.total_views === 0 && (
                        <p className="text-center text-white/60 py-8">Aucune vue pour le moment</p>
                      )}
                      
                      <button
                        onClick={() => setSelectedStoryViews(null)}
                        className="btn-primary w-full py-3 mt-6"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client View */}
            {portfolioViewMode === "clients" && !selectedPortfolioClient && portfolioFilterCategory !== "stories" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(() => {
                  // Group portfolio by client
                  const filteredPortfolio = portfolioFilterCategory === "all" 
                    ? portfolio 
                    : portfolio.filter(p => p.category === portfolioFilterCategory);
                  
                  // Exclude stories from client view
                  const nonStoryPortfolio = filteredPortfolio.filter(p => p.media_type !== "story");
                  
                  const clientsMap = {};
                  nonStoryPortfolio.forEach(item => {
                    const clientName = item.client_name || "Sans client";
                    if (!clientsMap[clientName]) {
                      clientsMap[clientName] = {
                        name: clientName,
                        items: [],
                        coverPhoto: null,
                        categories: new Set()
                      };
                    }
                    clientsMap[clientName].items.push(item);
                    clientsMap[clientName].categories.add(item.category);
                    if (!clientsMap[clientName].coverPhoto) {
                      if (item.media_type === "photo") {
                        clientsMap[clientName].coverPhoto = item.media_url;
                      } else if (item.thumbnail_url) {
                        clientsMap[clientName].coverPhoto = item.thumbnail_url;
                      }
                    }
                  });
                  
                  const clients = Object.values(clientsMap);
                  
                  if (clients.length === 0) {
                    return <p className="text-center text-white/60 py-12 col-span-full">Aucun élément dans le portfolio</p>;
                  }
                  
                  return clients.map(client => (
                    <div 
                      key={client.name} 
                      className="bg-card border border-white/10 overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedPortfolioClient(client.name)}
                    >
                      <div className="relative aspect-video bg-black/50">
                        {client.coverPhoto ? (
                          <img src={client.coverPhoto} alt={client.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/5 to-white/10">
                            <Users size={48} className="text-white/30" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {Array.from(client.categories).map(cat => (
                            <span key={cat} className={`text-xs px-2 py-1 font-bold ${
                              cat === "wedding" ? "bg-pink-500" : cat === "podcast" ? "bg-blue-500" : "bg-purple-500"
                            }`}>
                              {cat === "wedding" ? "Mariage" : cat === "podcast" ? "Podcast" : "TV"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-primary font-bold text-lg mb-2">{client.name}</h3>
                        <div className="flex items-center gap-4 text-white/60 text-sm">
                          <span className="flex items-center gap-1">
                            <Image size={14} />
                            {client.items.filter(i => i.media_type === "photo").length} photos
                          </span>
                          <span className="flex items-center gap-1">
                            <Video size={14} />
                            {client.items.filter(i => i.media_type === "video").length} vidéos
                          </span>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Selected Client Detail View */}
            {portfolioViewMode === "clients" && selectedPortfolioClient && (
              <div>
                <button
                  onClick={() => setSelectedPortfolioClient(null)}
                  className="flex items-center gap-2 text-white/60 hover:text-primary transition-colors mb-6"
                >
                  <ArrowLeft size={20} />
                  <span>Retour aux clients</span>
                </button>
                <h3 className="font-primary font-bold text-2xl mb-6 text-primary">{selectedPortfolioClient}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portfolio
                    .filter(item => (item.client_name || "Sans client") === selectedPortfolioClient)
                    .filter(item => portfolioFilterCategory === "all" || item.category === portfolioFilterCategory)
                    .map((item) => (
                    <div key={item.id} className="bg-card border border-white/10 overflow-hidden" data-testid={`portfolio-admin-${item.id}`}>
                      <div className="relative aspect-video bg-black/50">
                        {item.media_type === "photo" ? (
                          <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-full object-cover" />
                        )}
                        {item.is_featured && (
                          <span className="absolute top-2 right-2 bg-primary text-black text-xs px-2 py-1 font-bold">Featured</span>
                        )}
                        <span className={`absolute top-2 left-2 text-xs px-2 py-1 font-bold ${
                          item.category === "wedding" ? "bg-pink-500" : item.category === "podcast" ? "bg-blue-500" : "bg-purple-500"
                        }`}>
                          {item.category === "wedding" ? "Mariage" : item.category === "podcast" ? "Podcast" : "Plateau TV"}
                        </span>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {item.media_type === "photo" ? <Image size={16} className="text-primary" /> : <Video size={16} className="text-primary" />}
                          <h3 className="font-primary font-semibold text-sm truncate">{item.title}</h3>
                        </div>
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => setEditingPortfolio(item)}
                            className="flex-1 py-2 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30"
                          >
                            ✎ Modifier
                          </button>
                          <button
                            onClick={() => updatePortfolioItem(item.id, { is_featured: !item.is_featured })}
                            className={`flex-1 py-2 text-xs ${item.is_featured ? "btn-primary" : "btn-outline"}`}
                          >
                            {item.is_featured ? "★" : "☆"}
                          </button>
                          <button
                            onClick={() => deletePortfolioItem(item.id)}
                            className="px-3 py-2 text-xs bg-red-500/20 text-red-500 border border-red-500/50"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Items View */}
            {portfolioViewMode === "all" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolio
                  .filter(item => portfolioFilterCategory === "all" || item.category === portfolioFilterCategory)
                  .map((item) => (
                  <div key={item.id} className="bg-card border border-white/10 overflow-hidden" data-testid={`portfolio-admin-${item.id}`}>
                    <div className="relative aspect-video bg-black/50">
                      {item.media_type === "photo" ? (
                        <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-full object-cover" />
                      )}
                      {item.is_featured && (
                        <span className="absolute top-2 right-2 bg-primary text-black text-xs px-2 py-1 font-bold">Featured</span>
                      )}
                      <span className={`absolute top-2 left-2 text-xs px-2 py-1 font-bold ${
                        item.category === "wedding" ? "bg-pink-500" : item.category === "podcast" ? "bg-blue-500" : "bg-purple-500"
                      }`}>
                        {item.category === "wedding" ? "Mariage" : item.category === "podcast" ? "Podcast" : "Plateau TV"}
                      </span>
                    </div>
                    <div className="p-4">
                      {item.client_name && (
                        <p className="text-primary text-xs font-bold mb-1 uppercase tracking-wider">{item.client_name}</p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        {item.media_type === "photo" ? <Image size={16} className="text-primary" /> : <Video size={16} className="text-primary" />}
                        <h3 className="font-primary font-semibold text-sm truncate">{item.title}</h3>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <button
                          onClick={() => setEditingPortfolio(item)}
                          className="flex-1 py-2 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30"
                        >
                          ✎ Modifier
                        </button>
                        <button
                          onClick={() => updatePortfolioItem(item.id, { is_featured: !item.is_featured })}
                          className={`flex-1 py-2 text-xs ${item.is_featured ? "btn-primary" : "btn-outline"}`}
                        >
                          {item.is_featured ? "★" : "☆"}
                        </button>
                        <button
                          onClick={() => deletePortfolioItem(item.id)}
                          className="px-3 py-2 text-xs bg-red-500/20 text-red-500 border border-red-500/50"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {portfolio.length === 0 && (
              <p className="text-center text-white/60 py-12">Aucun élément dans le portfolio</p>
            )}
          </div>
        )}

        {/* News/Actualités Tab */}
        {activeTab === "news" && (
          <div data-testid="admin-news-tab">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gérer les Actualités</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-white/60">
                  Publications: <span className="text-primary font-bold">{newsPosts.length}</span>
                </span>
                {pendingComments.length > 0 && (
                  <span className="text-yellow-500">
                    {pendingComments.length} commentaire(s) en attente
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Create New Post */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Plus size={20} className="text-primary" />
                  Nouvelle Publication
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 block mb-2">Légende *</label>
                    <textarea
                      value={newPostCaption}
                      onChange={(e) => setNewPostCaption(e.target.value)}
                      placeholder="Décrivez votre publication..."
                      rows={3}
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/60 block mb-2">Lieu (optionnel)</label>
                    <input
                      type="text"
                      value={newPostLocation}
                      onChange={(e) => setNewPostLocation(e.target.value)}
                      placeholder="Paris, France"
                      className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                    />
                  </div>
                  
                  <div
                    onClick={() => newPostCaption.trim() && newsMediaRef.current?.click()}
                    className={`aspect-video bg-background/50 border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors ${
                      newPostCaption.trim() ? "border-white/20 hover:border-primary/50" : "border-white/10 cursor-not-allowed"
                    }`}
                  >
                    {uploadingNewsMedia ? (
                      <>
                        <Loader className="animate-spin text-primary" size={48} />
                        <p className="text-white/60 mt-4">Upload en cours...</p>
                      </>
                    ) : (
                      <>
                        <Upload size={48} className="text-white/30" />
                        <p className="text-white/60 mt-4">
                          {newPostCaption.trim() ? "Cliquez pour ajouter une photo ou vidéo" : "Ajoutez d'abord une légende"}
                        </p>
                        <p className="text-white/40 text-sm mt-2">JPG, PNG, MP4, WebM</p>
                      </>
                    )}
                  </div>
                  
                  <input
                    ref={newsMediaRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={createNewsPost}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Pending Comments */}
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <MessageCircle size={20} className="text-yellow-500" />
                  Commentaires à Valider ({pendingComments.length})
                </h3>
                
                {pendingComments.length === 0 ? (
                  <p className="text-white/40 text-center py-8">Aucun commentaire en attente</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {pendingComments.map((comment) => (
                      <div key={comment.id} className="bg-background/50 border border-white/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <User size={16} className="text-white/50" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{comment.guest_name}</p>
                            <p className="text-xs text-white/50">{comment.guest_email}</p>
                            <p className="text-sm mt-2">{comment.content}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => updateCommentStatus(comment.id, "approved")}
                            className="flex-1 px-3 py-1.5 bg-green-500 text-white text-xs hover:bg-green-600"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => updateCommentStatus(comment.id, "rejected")}
                            className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30"
                          >
                            Rejeter
                          </button>
                          <button
                            onClick={() => deleteComment(comment.id)}
                            className="px-3 py-1.5 bg-white/5 text-white/50 text-xs hover:bg-white/10"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Posts Grid */}
            <div className="mt-8">
              <h3 className="font-bold text-lg mb-4">Publications ({newsPosts.length})</h3>
              
              {loadingNews ? (
                <div className="text-center py-12">
                  <Loader className="animate-spin mx-auto text-primary" size={32} />
                </div>
              ) : newsPosts.length === 0 ? (
                <div className="text-center py-12 bg-card border border-white/10">
                  <p className="text-white/60">Aucune publication. Créez votre première actualité !</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {newsPosts.map((post) => (
                    <div key={post.id} className="relative aspect-square group bg-card overflow-hidden">
                      {post.media_type === "photo" ? (
                        <img
                          src={`${BACKEND_URL}${post.media_url}`}
                          alt={post.caption}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={`${BACKEND_URL}${post.media_url}`}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                      
                      {/* Overlay */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                        <div className="flex gap-4 text-white text-sm mb-2">
                          <span className="flex items-center gap-1">
                            <Heart size={14} /> {post.likes_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle size={14} /> {post.comments_count}
                          </span>
                        </div>
                        <p className="text-xs text-center text-white/70 line-clamp-2 mb-2">{post.caption}</p>
                        <button
                          onClick={() => deleteNewsPost(post.id)}
                          className="px-3 py-1 bg-red-500 text-white text-xs hover:bg-red-600"
                        >
                          Supprimer
                        </button>
                      </div>
                      
                      {post.media_type === "video" && (
                        <div className="absolute top-1 right-1 bg-black/50 px-1.5 py-0.5 text-xs text-white">
                          VIDEO
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Testimonials Tab */}
        {activeTab === "testimonials" && (
          <div data-testid="admin-testimonials-tab">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gérer les Témoignages</h2>
              <div className="flex gap-4 text-sm">
                <span className="text-white/60">
                  En attente: <span className="text-yellow-500 font-bold">{testimonials.filter(t => t.status === "pending").length}</span>
                </span>
                <span className="text-white/60">
                  Approuvés: <span className="text-green-500 font-bold">{testimonials.filter(t => t.status === "approved").length}</span>
                </span>
              </div>
            </div>

            {loadingTestimonials ? (
              <div className="text-center py-12">
                <Loader className="animate-spin mx-auto text-primary" size={32} />
                <p className="text-white/60 mt-4">Chargement...</p>
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12 bg-card border border-white/10 p-8">
                <p className="text-white/60">Aucun témoignage reçu pour le moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {testimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className={`bg-card border p-6 ${
                      testimonial.status === "pending" ? "border-yellow-500/50" :
                      testimonial.status === "approved" ? "border-green-500/30" : "border-red-500/30"
                    }`}
                    data-testid={`testimonial-item-${testimonial.id}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                            <User className="text-primary" size={24} />
                          </div>
                          <div>
                            <h3 className="font-bold text-white">{testimonial.client_name}</h3>
                            <p className="text-sm text-white/50">{testimonial.client_email}</p>
                            {testimonial.client_role && (
                              <p className="text-xs text-primary">{testimonial.client_role}</p>
                            )}
                          </div>
                          {/* Rating */}
                          <div className="flex gap-0.5 ml-auto">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < testimonial.rating ? "text-primary" : "text-white/20"}>★</span>
                            ))}
                          </div>
                        </div>

                        {/* Message */}
                        <p className="text-white/80 bg-background/50 p-4 border border-white/10 italic">
                          "{testimonial.message}"
                        </p>

                        {/* Meta */}
                        <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                          <span>Service: {testimonial.service_type || "Non précisé"}</span>
                          <span>•</span>
                          <span>Reçu le: {new Date(testimonial.created_at).toLocaleDateString("fr-FR")}</span>
                          {testimonial.featured && (
                            <>
                              <span>•</span>
                              <span className="text-primary font-bold">★ Mis en avant</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {/* Status badge */}
                        <span className={`px-3 py-1 text-xs font-bold text-center ${
                          testimonial.status === "pending" ? "bg-yellow-500/20 text-yellow-500" :
                          testimonial.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                        }`}>
                          {testimonial.status === "pending" ? "EN ATTENTE" :
                           testimonial.status === "approved" ? "APPROUVÉ" : "REJETÉ"}
                        </span>

                        {testimonial.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateTestimonial(testimonial.id, { status: "approved" })}
                              className="px-4 py-2 bg-green-500 text-white text-sm hover:bg-green-600 flex items-center justify-center gap-2"
                            >
                              <Check size={16} /> Approuver
                            </button>
                            <button
                              onClick={() => updateTestimonial(testimonial.id, { status: "rejected" })}
                              className="px-4 py-2 bg-red-500/20 text-red-500 text-sm hover:bg-red-500/30"
                            >
                              Rejeter
                            </button>
                          </>
                        )}

                        {testimonial.status === "approved" && (
                          <button
                            onClick={() => updateTestimonial(testimonial.id, { featured: !testimonial.featured })}
                            className={`px-4 py-2 text-sm ${
                              testimonial.featured 
                                ? "bg-primary/20 text-primary" 
                                : "bg-white/10 text-white/60 hover:bg-white/20"
                            }`}
                          >
                            {testimonial.featured ? "★ Retirer" : "☆ Mettre en avant"}
                          </button>
                        )}

                        <button
                          onClick={() => deleteTestimonial(testimonial.id)}
                          className="px-4 py-2 bg-white/5 text-white/50 text-sm hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} /> Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Welcome Popup Tab */}
        {activeTab === "welcome-popup" && (
          <div data-testid="admin-welcome-popup-tab">
            <h2 className="font-primary font-bold text-xl mb-6">Popup d'Accueil</h2>
            
            {welcomePopup ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Video Upload Section */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Video className="text-primary" size={20} />
                    Vidéo du Popup
                  </h3>
                  
                  {welcomePopup.video_url ? (
                    <div className="space-y-4">
                      <div className="aspect-video bg-black border border-white/10 overflow-hidden">
                        <video
                          src={`${BACKEND_URL}${welcomePopup.video_url}`}
                          className="w-full h-full object-contain"
                          controls
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => welcomeVideoRef.current?.click()}
                          className="flex-1 btn-outline px-4 py-2 text-sm flex items-center justify-center gap-2"
                          disabled={uploadingPopupVideo}
                        >
                          <Upload size={16} /> Remplacer
                        </button>
                        <button
                          onClick={deleteWelcomeVideo}
                          className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-sm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => welcomeVideoRef.current?.click()}
                      className="aspect-video bg-background/50 border-2 border-dashed border-white/20 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center transition-colors"
                    >
                      {uploadingPopupVideo ? (
                        <>
                          <Loader className="animate-spin text-primary" size={48} />
                          <p className="text-white/60 mt-4">Upload en cours...</p>
                        </>
                      ) : (
                        <>
                          <Upload size={48} className="text-white/30" />
                          <p className="text-white/60 mt-4">Cliquez pour uploader une vidéo</p>
                          <p className="text-white/40 text-sm mt-2">MP4, WebM, MOV • Max 500MB</p>
                        </>
                      )}
                    </div>
                  )}
                  
                  <input
                    ref={welcomeVideoRef}
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                    onChange={uploadWelcomeVideo}
                    className="hidden"
                  />
                </div>

                {/* Settings Section */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-bold text-lg mb-4">Paramètres du Popup</h3>
                  
                  <div className="space-y-4">
                    {/* Enable/Disable */}
                    <div className="flex items-center justify-between p-4 bg-background/50 border border-white/10">
                      <div>
                        <p className="font-bold">Activer le popup</p>
                        <p className="text-sm text-white/50">Afficher à l'arrivée sur le site</p>
                      </div>
                      <button
                        onClick={() => updateWelcomePopup({ enabled: !welcomePopup.enabled })}
                        className={`w-14 h-7 rounded-full transition-colors ${
                          welcomePopup.enabled ? "bg-green-500" : "bg-white/20"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          welcomePopup.enabled ? "translate-x-8" : "translate-x-1"
                        }`}></div>
                      </button>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="text-sm text-white/60 block mb-2">Titre</label>
                      <input
                        type="text"
                        value={welcomePopup.title}
                        onChange={(e) => setWelcomePopup({...welcomePopup, title: e.target.value})}
                        onBlur={() => updateWelcomePopup({ title: welcomePopup.title })}
                        className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="text-sm text-white/60 block mb-2">Sous-titre</label>
                      <input
                        type="text"
                        value={welcomePopup.subtitle}
                        onChange={(e) => setWelcomePopup({...welcomePopup, subtitle: e.target.value})}
                        onBlur={() => updateWelcomePopup({ subtitle: welcomePopup.subtitle })}
                        className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                      />
                    </div>

                    {/* Button Text */}
                    <div>
                      <label className="text-sm text-white/60 block mb-2">Texte du bouton</label>
                      <input
                        type="text"
                        value={welcomePopup.button_text}
                        onChange={(e) => setWelcomePopup({...welcomePopup, button_text: e.target.value})}
                        onBlur={() => updateWelcomePopup({ button_text: welcomePopup.button_text })}
                        className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                      />
                    </div>

                    {/* Button Link */}
                    <div>
                      <label className="text-sm text-white/60 block mb-2">Lien du bouton</label>
                      <select
                        value={welcomePopup.button_link}
                        onChange={(e) => {
                          setWelcomePopup({...welcomePopup, button_link: e.target.value});
                          updateWelcomePopup({ button_link: e.target.value });
                        }}
                        className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                      >
                        <option value="/portfolio">Portfolio</option>
                        <option value="/devis-mariage">Devis Mariage</option>
                        <option value="/temoignages">Témoignages</option>
                        <option value="/contact">Contact</option>
                        <option value="/services/wedding">Mariages</option>
                        <option value="/services/podcast">Podcast</option>
                        <option value="/services/tv_set">Plateau TV</option>
                      </select>
                    </div>

                    {/* Show once per session */}
                    <div className="flex items-center justify-between p-4 bg-background/50 border border-white/10">
                      <div>
                        <p className="font-bold text-sm">Une fois par session</p>
                        <p className="text-xs text-white/50">Ne pas réafficher après fermeture</p>
                      </div>
                      <button
                        onClick={() => updateWelcomePopup({ show_once_per_session: !welcomePopup.show_once_per_session })}
                        className={`w-14 h-7 rounded-full transition-colors ${
                          welcomePopup.show_once_per_session ? "bg-green-500" : "bg-white/20"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          welcomePopup.show_once_per_session ? "translate-x-8" : "translate-x-1"
                        }`}></div>
                      </button>
                    </div>

                    {welcomePopup.updated_at && (
                      <p className="text-xs text-white/40 text-right">
                        Dernière modification: {new Date(welcomePopup.updated_at).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Loader className="animate-spin mx-auto text-primary" size={32} />
              </div>
            )}
          </div>
        )}

        {/* Wedding Quotes Tab */}
        {(activeTab === "overview" || activeTab === "quotes") && (
          <div className="mb-12">
            <h2 className="font-primary font-bold text-xl mb-4">Demandes de devis mariage</h2>

            {/* Quote Detail Modal */}
            {selectedQuote && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-card border border-primary w-full max-w-3xl my-8">
                  {/* Modal Header */}
                  <div className="bg-primary p-6 flex justify-between items-center">
                    <div>
                      <h2 className="font-primary font-bold text-2xl text-black">Devis Mariage</h2>
                      <p className="text-black/70">Ref: #{selectedQuote.id?.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={printQuote} className="bg-black/20 text-black px-4 py-2 hover:bg-black/30 flex items-center gap-2">
                        <Printer size={18} /> Imprimer / PDF
                      </button>
                      <button onClick={() => setSelectedQuote(null)} className="bg-black/20 text-black px-3 py-2 hover:bg-black/30">
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Printable Content */}
                  <div ref={quoteDetailRef} className="p-6">
                    {/* Header for print */}
                    <div className="header hidden print:block">
                      <h1>CREATIVINDUSTRY France</h1>
                      <p>Devis Mariage - Ref: #{selectedQuote.id?.slice(0, 8).toUpperCase()}</p>
                    </div>

                    {/* Client Info */}
                    <div className="section mb-8">
                      <h2 className="font-primary font-bold text-lg text-primary mb-4 pb-2 border-b border-white/20">
                        Informations Client
                      </h2>
                      <div className="info-grid grid grid-cols-2 gap-4">
                        <div className="info-item">
                          <p className="label text-white/50 text-xs uppercase">Nom</p>
                          <p className="value font-bold text-lg">{selectedQuote.client_name}</p>
                        </div>
                        <div className="info-item">
                          <p className="label text-white/50 text-xs uppercase">Email</p>
                          <p className="value font-bold">{selectedQuote.client_email}</p>
                        </div>
                        <div className="info-item">
                          <p className="label text-white/50 text-xs uppercase">Téléphone</p>
                          <p className="value font-bold">{selectedQuote.client_phone}</p>
                        </div>
                        <div className="info-item">
                          <p className="label text-white/50 text-xs uppercase">Date du mariage</p>
                          <p className="value font-bold text-primary">{selectedQuote.event_date}</p>
                        </div>
                        {selectedQuote.event_location && (
                          <div className="info-item col-span-2">
                            <p className="label text-white/50 text-xs uppercase">Lieu</p>
                            <p className="value font-bold">{selectedQuote.event_location}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Prestations */}
                    <div className="section mb-8">
                      <h2 className="font-primary font-bold text-lg text-primary mb-4 pb-2 border-b border-white/20">
                        Prestations Sélectionnées
                      </h2>
                      <table className="w-full">
                        <thead>
                          <tr className="bg-black/30">
                            <th className="text-left p-3 text-white/60 text-sm uppercase">Prestation</th>
                            <th className="text-right p-3 text-white/60 text-sm uppercase">Prix</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Group by category */}
                          {selectedQuote.options_by_category && Object.entries(selectedQuote.options_by_category).map(([category, options]) => (
                            <>
                              <tr key={`cat-${category}`} className="category-header bg-primary/20">
                                <td colSpan={2} className="p-3 font-bold text-primary uppercase text-sm">
                                  {category === 'coverage' ? '📸 Couverture' : 
                                   category === 'extras' ? '✨ Options' : 
                                   category === 'editing' ? '🎬 Livrables' : category}
                                </td>
                              </tr>
                              {options.map((opt, i) => (
                                <tr key={`${category}-${i}`} className="border-b border-white/10">
                                  <td className="p-3">{opt.name}</td>
                                  <td className="p-3 text-right font-bold">{opt.price}€</td>
                                </tr>
                              ))}
                            </>
                          ))}
                          {/* If no categories, show flat list */}
                          {!selectedQuote.options_by_category && selectedQuote.options_details?.map((opt, i) => (
                            <tr key={i} className="border-b border-white/10">
                              <td className="p-3">{opt.name}</td>
                              <td className="p-3 text-right font-bold">{opt.price}€</td>
                            </tr>
                          ))}
                          {/* Total */}
                          <tr className="total-row bg-primary">
                            <td className="p-4 font-bold text-black text-lg">TOTAL</td>
                            <td className="p-4 text-right font-bold text-black text-2xl">{selectedQuote.total_price}€</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Message */}
                    {selectedQuote.message && (
                      <div className="section mb-8">
                        <h2 className="font-primary font-bold text-lg text-primary mb-4 pb-2 border-b border-white/20">
                          Message du Client
                        </h2>
                        <div className="bg-black/30 p-4 italic text-white/80">
                          "{selectedQuote.message}"
                        </div>
                      </div>
                    )}

                    {/* Footer for print */}
                    <div className="footer text-center text-white/50 text-sm mt-8 pt-4 border-t border-white/10">
                      <p>CREATIVINDUSTRY France • contact@creativindustry.com</p>
                      <p>Devis généré le {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>

                  {/* Modal Actions */}
                  <div className="p-6 border-t border-white/10 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60">Statut:</span>
                      <select
                        value={selectedQuote.status}
                        onChange={(e) => updateQuoteStatus(selectedQuote.id, e.target.value)}
                        className="bg-background border border-white/20 px-3 py-2"
                      >
                        <option value="pending">En attente</option>
                        <option value="confirmed">Confirmé</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                    <button onClick={() => setSelectedQuote(null)} className="btn-outline px-6 py-2">
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-white/10 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-black/50">
                  <tr>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Client</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Date</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Options</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Total</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Statut</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.slice(0, activeTab === "overview" ? 5 : 50).map((quote) => (
                    <tr key={quote.id} className="border-t border-white/10" data-testid={`quote-row-${quote.id}`}>
                      <td className="p-4">
                        <p className="font-semibold">{quote.client_name}</p>
                        <p className="text-white/60 text-sm">{quote.client_email}</p>
                        <p className="text-white/40 text-xs">{quote.client_phone}</p>
                      </td>
                      <td className="p-4">
                        <p>{quote.event_date}</p>
                        {quote.event_location && <p className="text-white/60 text-sm">{quote.event_location}</p>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {quote.options_details?.slice(0, 3).map((opt, i) => (
                            <span key={i} className="bg-white/10 px-2 py-0.5 text-xs">{opt.name}</span>
                          ))}
                          {quote.options_details?.length > 3 && (
                            <span className="text-white/40 text-xs">+{quote.options_details.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-primary font-bold text-gold-gradient">{quote.total_price}€</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-semibold ${statusColors[quote.status]}`}>
                          {statusLabels[quote.status]}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openQuoteDetail(quote.id)}
                            className="bg-primary/20 text-primary px-3 py-1 text-sm hover:bg-primary/30 flex items-center gap-1"
                            data-testid={`quote-view-${quote.id}`}
                          >
                            <Eye size={14} /> Voir
                          </button>
                          <select
                            value={quote.status}
                            onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                            className="bg-background border border-white/20 px-2 py-1 text-sm"
                            data-testid={`quote-status-select-${quote.id}`}
                          >
                            <option value="pending">En attente</option>
                            <option value="confirmed">Confirmé</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotes.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucun devis</p>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {(activeTab === "overview" || activeTab === "bookings") && (
          <div className="mb-12">
            <h2 className="font-primary font-bold text-xl mb-4">Réservations (Podcast/TV)</h2>
            <div className="bg-card border border-white/10 overflow-hidden overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-black/50">
                  <tr>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Client</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Service</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Date</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Statut</th>
                    <th className="text-left p-4 font-primary text-sm text-white/60">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.slice(0, activeTab === "overview" ? 5 : 50).map((booking) => (
                    <tr key={booking.id} className="border-t border-white/10" data-testid={`booking-row-${booking.id}`}>
                      <td className="p-4">
                        <p className="font-semibold">{booking.client_name}</p>
                        <p className="text-white/60 text-sm">{booking.client_email}</p>
                      </td>
                      <td className="p-4">
                        <p>{booking.service_name}</p>
                        <p className="text-white/60 text-sm capitalize">{booking.service_category === "tv_set" ? "Plateau TV" : booking.service_category}</p>
                      </td>
                      <td className="p-4">{booking.event_date}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 text-xs font-semibold ${statusColors[booking.status]}`}>
                          {statusLabels[booking.status]}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          value={booking.status}
                          onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                          className="bg-background border border-white/20 px-2 py-1 text-sm"
                          data-testid={`booking-status-select-${booking.id}`}
                        >
                          <option value="pending">En attente</option>
                          <option value="confirmed">Confirmé</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucune réservation</p>
              )}
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === "services" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Gestion des services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div key={service.id} className="bg-card border border-white/10 p-6" data-testid={`service-card-admin-${service.id}`}>
                  {editingService === service.id ? (
                    <EditServiceForm
                      service={service}
                      onSave={(data) => updateService(service.id, data)}
                      onCancel={() => setEditingService(null)}
                    />
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`text-xs uppercase tracking-wider ${
                            service.category === "wedding" ? "text-pink-400" :
                            service.category === "podcast" ? "text-blue-400" : "text-purple-400"
                          }`}>
                            {service.category === "wedding" ? "Mariage" :
                             service.category === "podcast" ? "Podcast" : "Plateau TV"}
                          </span>
                          <h3 className="font-primary font-bold text-lg">{service.name}</h3>
                        </div>
                        <span className={`text-xs px-2 py-1 ${service.is_active ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"}`}>
                          {service.is_active ? "Actif" : "Inactif"}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mb-4">{service.description}</p>
                      <p className="font-primary font-black text-2xl text-gold-gradient mb-4">{service.price}€</p>
                      <button
                        onClick={() => setEditingService(service.id)}
                        className="btn-outline w-full py-2 text-xs"
                        data-testid={`edit-service-${service.id}`}
                      >
                        Modifier
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wedding Options Tab */}
        {activeTab === "options" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Options du devis mariage</h2>
              <button
                onClick={() => setShowAddOption(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter une option
              </button>
            </div>

            {/* Add Option Modal */}
            {showAddOption && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-md">
                  <h3 className="font-primary font-bold text-xl mb-4">Nouvelle option</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Catégorie</label>
                      <select
                        value={newOption.category}
                        onChange={(e) => setNewOption({ ...newOption, category: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      >
                        <option value="coverage">Couverture</option>
                        <option value="extras">Options</option>
                        <option value="editing">Livrables</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Nom de l'option</label>
                      <input
                        type="text"
                        placeholder="Ex: Cérémonie religieuse"
                        value={newOption.name}
                        onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Description</label>
                      <textarea
                        placeholder="Description de l'option..."
                        value={newOption.description}
                        onChange={(e) => setNewOption({ ...newOption, description: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Prix (€)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={newOption.price}
                        onChange={(e) => setNewOption({ ...newOption, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddOption(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button 
                        onClick={() => createWeddingOption(newOption)}
                        disabled={!newOption.name}
                        className="btn-primary flex-1 py-3 disabled:opacity-50"
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {["coverage", "extras", "editing"].map(cat => {
              const catOptions = weddingOptions.filter(o => o.category === cat);
              const labels = { coverage: "Couverture", extras: "Options", editing: "Livrables" };
              return (
                <div key={cat} className="mb-8">
                  <h3 className="font-primary font-semibold text-lg mb-4">{labels[cat]}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catOptions.map(option => (
                      <div key={option.id} className="bg-card border border-white/10 p-4" data-testid={`option-admin-${option.id}`}>
                        {editingOption === option.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              defaultValue={option.name}
                              className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                              id={`edit-name-${option.id}`}
                            />
                            <textarea
                              defaultValue={option.description}
                              className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                              rows={2}
                              id={`edit-desc-${option.id}`}
                            />
                            <input
                              type="number"
                              defaultValue={option.price}
                              className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                              id={`edit-price-${option.id}`}
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setEditingOption(null)} className="btn-outline flex-1 py-2 text-xs">
                                Annuler
                              </button>
                              <button 
                                onClick={() => {
                                  const name = document.getElementById(`edit-name-${option.id}`).value;
                                  const description = document.getElementById(`edit-desc-${option.id}`).value;
                                  const price = parseFloat(document.getElementById(`edit-price-${option.id}`).value);
                                  updateWeddingOption(option.id, { name, description, price });
                                }}
                                className="btn-primary flex-1 py-2 text-xs"
                              >
                                Sauver
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <h4 className="font-primary font-semibold">{option.name}</h4>
                              <span className="font-primary font-bold text-primary">{option.price}€</span>
                            </div>
                            <p className="text-white/60 text-sm mt-1 mb-3">{option.description}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingOption(option.id)}
                                className="text-primary text-xs hover:underline"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => deleteWeddingOption(option.id)}
                                className="text-red-400 text-xs hover:underline"
                              >
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Clients Tab */}
        {activeTab === "clients" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-primary font-bold text-xl">Gestion des Clients</h2>
              <button
                onClick={() => setShowAddClient(true)}
                className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
              >
                <Plus size={16} /> Nouveau Client
              </button>
            </div>

            {/* Add Client Modal */}
            {showAddClient && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-white/10 p-6 w-full max-w-md">
                  <h3 className="font-primary font-bold text-xl mb-4">Nouveau Client</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nom complet"
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="password"
                      placeholder="Mot de passe"
                      value={newClient.password}
                      onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      className="w-full bg-background border border-white/20 px-4 py-3"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddClient(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button onClick={createClient} className="btn-primary flex-1 py-3">
                        Créer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Online Users Summary */}
            <div className="bg-card border border-green-500/30 p-4 mb-6">
              <h3 className="font-primary font-bold text-lg mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                Clients connectés ({onlineUsers.filter(u => u.is_online).length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {onlineUsers.filter(u => u.is_online).map(user => (
                  <span key={user.id} className="bg-green-500/20 text-green-400 px-3 py-1 text-sm rounded-full">
                    {user.name}
                  </span>
                ))}
                {onlineUsers.filter(u => u.is_online).length === 0 && (
                  <span className="text-white/40 text-sm">Aucun client connecté actuellement</span>
                )}
              </div>
            </div>

            {/* Admins Section */}
            <div className="bg-card border border-amber-500/30 p-4 mb-6">
              <h3 className="font-primary font-bold text-lg mb-3 flex items-center gap-2">
                <Shield size={20} className="text-amber-500" />
                Administrateurs ({adminsList.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {adminsList.map((admin) => (
                  <div key={admin.id} className="bg-background border border-amber-500/20 p-3 rounded flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                        <Shield size={18} className="text-amber-500" />
                      </div>
                      <div>
                        <p className="font-primary font-semibold text-sm flex items-center gap-2">
                          {admin.name}
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
                        </p>
                        <p className="text-white/60 text-xs">{admin.email}</p>
                      </div>
                    </div>
                    {admin.mfa_enabled && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded" title="MFA activé">MFA</span>
                    )}
                  </div>
                ))}
                {adminsList.length === 0 && (
                  <p className="text-white/40 text-sm col-span-full">Aucun administrateur</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client List */}
              <div>
                <h3 className="font-primary font-semibold mb-4 flex items-center gap-2">
                  <User size={18} className="text-blue-400" />
                  Liste des clients ({clients.length})
                </h3>
                <div className="space-y-2">
                  {clients.map((client) => {
                    const userOnline = onlineUsers.find(u => u.id === client.id);
                    const isOnline = userOnline?.is_online;
                    return (
                      <div
                        key={client.id}
                        className={`w-full text-left bg-card border p-4 transition-colors ${
                          selectedClient?.id === client.id ? "border-primary" : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <button onClick={() => selectClient(client)} className="flex-1 text-left">
                            <p className="font-primary font-semibold flex items-center gap-2">
                              {client.name}
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-medium">CLIENT</span>
                              {isOnline && (
                                <span className="w-2 h-2 bg-green-500 rounded-full" title="En ligne"></span>
                              )}
                            </p>
                            <p className="text-white/60 text-sm">{client.email}</p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/50">
                              {client.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={12} /> {client.phone}
                                </span>
                              )}
                              {client.created_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} /> Inscrit le {new Date(client.created_at).toLocaleDateString('fr-FR')}
                                </span>
                              )}
                              {client.last_login && (
                                <span className="flex items-center gap-1">
                                  <Clock size={12} /> Dernière connexion : {new Date(client.last_login).toLocaleDateString('fr-FR')} à {new Date(client.last_login).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-2">
                            {isOnline && (
                              <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">En ligne</span>
                            )}
                            <button
                              onClick={() => openDocumentModal(client)}
                              className="bg-primary/20 text-primary border border-primary/50 px-3 py-1 text-xs flex items-center gap-1 hover:bg-primary/30"
                              title="Factures et Devis"
                            >
                              <FileText size={12} /> Documents
                            </button>
                            <button
                              onClick={() => openClientFileTransfer(client)}
                              className="btn-outline px-3 py-1 text-xs flex items-center gap-1"
                              title="Envoyer des fichiers"
                            >
                              <Upload size={12} /> Fichiers
                            </button>
                            <button
                              onClick={() => openExpirationModal(client)}
                              className="bg-amber-500/20 text-amber-400 border border-amber-500/50 px-3 py-1 text-xs flex items-center gap-1 hover:bg-amber-500/30"
                              title="Définir la date d'expiration"
                            >
                              <Clock size={12} /> Expiration
                            </button>
                            <button
                              onClick={() => deleteClient(client)}
                              className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 text-xs flex items-center gap-1 hover:bg-red-500/30"
                              title="Supprimer le client"
                              data-testid={`delete-client-${client.id}`}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {clients.length === 0 && (
                    <p className="text-center text-white/60 py-8">Aucun client</p>
                  )}
                </div>
              </div>

              {/* Client Files */}
              {selectedClient && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-primary font-semibold">Fichiers de {selectedClient.name}</h3>
                    <button
                      onClick={() => setShowAddFile(true)}
                      className="btn-outline px-4 py-2 text-xs flex items-center gap-2"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>

                  {/* Add File Modal */}
                  {showAddFile && (
                    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                      <div className="bg-card border border-white/10 p-6 w-full max-w-md">
                        <h3 className="font-primary font-bold text-xl mb-4">Ajouter un fichier</h3>
                        <div className="space-y-4">
                          
                          {/* Upload Section */}
                          <div className="border-2 border-dashed border-primary/50 p-4 text-center bg-primary/5">
                            <input
                              type="file"
                              ref={clientFileRef}
                              onChange={handleClientFileUpload}
                              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/pdf,.zip,.rar,.pdf"
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => clientFileRef.current?.click()}
                              disabled={uploadingClientFile}
                              className="btn-primary px-6 py-3 w-full flex items-center justify-center gap-2"
                            >
                              {uploadingClientFile ? (
                                <>
                                  <Loader size={16} className="animate-spin" /> Upload en cours... {uploadProgress}%
                                </>
                              ) : (
                                <>
                                  <Upload size={16} /> Uploader un fichier
                                </>
                              )}
                            </button>
                            
                            {/* Progress Bar */}
                            {uploadingClientFile && (
                              <div className="mt-3">
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                  <div 
                                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                                <p className="text-xs text-primary mt-1 font-bold">{uploadProgress}% uploadé</p>
                              </div>
                            )}
                            
                            <p className="text-xs text-white/50 mt-2">JPG, PNG, MP4, WEBM, MOV, ZIP, RAR, PDF (max 1 Go)</p>
                            <p className="text-xs text-green-400 mt-1">Le client sera notifié par email !</p>
                          </div>
                          
                          <div className="text-white/40 text-center text-sm">— ou lien externe —</div>
                          
                          <input
                            type="text"
                            placeholder="Titre"
                            value={newFile.title}
                            onChange={(e) => setNewFile({ ...newFile, title: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <input
                            type="text"
                            placeholder="Description (optionnel)"
                            value={newFile.description}
                            onChange={(e) => setNewFile({ ...newFile, description: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          <select
                            value={newFile.file_type}
                            onChange={(e) => setNewFile({ ...newFile, file_type: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          >
                            <option value="video">Vidéo</option>
                            <option value="photo">Photo</option>
                            <option value="document">Document</option>
                          </select>
                          <input
                            type="url"
                            placeholder="URL du fichier (Google Drive, Dropbox...)"
                            value={newFile.file_url}
                            onChange={(e) => setNewFile({ ...newFile, file_url: e.target.value })}
                            className="w-full bg-background border border-white/20 px-4 py-3"
                          />
                          
                          {/* Thumbnail upload section for client files */}
                          <div className="space-y-2">
                            <p className="text-sm text-white/60">Miniature (optionnel) :</p>
                            <input
                              type="file"
                              id="client-file-thumbnail-upload"
                              className="hidden"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleClientFileThumbnailUpload}
                            />
                            <label
                              htmlFor="client-file-thumbnail-upload"
                              className={`flex items-center justify-center gap-2 w-full border-2 border-dashed border-primary/50 py-3 cursor-pointer hover:bg-primary/10 transition-colors ${uploadingClientFileThumbnail ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {uploadingClientFileThumbnail ? (
                                <>
                                  <Loader size={16} className="animate-spin" /> Upload en cours...
                                </>
                              ) : (
                                <>
                                  <Upload size={16} /> Uploader une miniature
                                </>
                              )}
                            </label>
                            <p className="text-xs text-white/50">JPG, PNG, WEBP, GIF (max 50 Mo)</p>
                            
                            {/* Thumbnail preview */}
                            {newFile.thumbnail_url && (
                              <div className="relative">
                                <img src={newFile.thumbnail_url} alt="Miniature" className="w-full h-32 object-cover" />
                                <button
                                  type="button"
                                  onClick={() => setNewFile({ ...newFile, thumbnail_url: '' })}
                                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <button onClick={() => setShowAddFile(false)} className="btn-outline flex-1 py-3">
                              Annuler
                            </button>
                            <button onClick={addFileToClient} className="btn-primary flex-1 py-3">
                              Ajouter via lien
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {clientFiles.map((file) => (
                      <div key={file.id} className="bg-card border border-white/10 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {file.file_type === "video" && <Video size={20} className="text-primary" />}
                          {file.file_type === "photo" && <Image size={20} className="text-primary" />}
                          {file.file_type === "document" && <FileText size={20} className="text-primary" />}
                          <div>
                            <p className="font-semibold text-sm">{file.title}</p>
                            <p className="text-white/40 text-xs truncate max-w-[200px]">{file.file_url}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteFile(file.id)}
                          className="text-red-500 hover:text-red-400 text-xs"
                        >
                          Supprimer
                        </button>
                      </div>
                    ))}
                    {clientFiles.length === 0 && (
                      <p className="text-center text-white/60 py-8">Aucun fichier</p>
                    )}
                  </div>

                  {/* Download History for this client */}
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <h4 className="font-primary font-semibold mb-3 flex items-center gap-2">
                      <Download size={16} className="text-blue-400" />
                      Historique des téléchargements
                    </h4>
                    {clientDownloads.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {clientDownloads.map((dl) => (
                          <div key={dl.id} className="bg-blue-500/10 border border-blue-500/30 p-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-white/80">Fichier téléchargé</span>
                              <span className="text-blue-400 text-xs">
                                {new Date(dl.downloaded_at).toLocaleString("fr-FR")}
                              </span>
                            </div>
                            <p className="text-white font-semibold mt-1">{dl.file_title || "Fichier"}</p>
                            {dl.file_type && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                dl.file_type === 'video' ? 'bg-purple-500/20 text-purple-400' :
                                dl.file_type === 'photo' ? 'bg-green-500/20 text-green-400' :
                                'bg-orange-500/20 text-orange-400'
                              }`}>
                                {dl.file_type === 'video' ? 'Vidéo' : dl.file_type === 'photo' ? 'Photo' : 'Document'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/40 text-sm">Aucun téléchargement enregistré</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Expiration Modal */}
        {showExpirationModal && expirationClient && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-white/10 p-6 w-full max-w-md">
              <h3 className="font-primary font-bold text-xl mb-2">Délai d'expiration</h3>
              <p className="text-white/60 text-sm mb-6">
                Définir le délai de suppression automatique pour <strong className="text-primary">{expirationClient.name}</strong>
              </p>
              
              <div className="space-y-3 mb-6">
                {[
                  { value: "3_days", label: "3 jours" },
                  { value: "1_week", label: "1 semaine" },
                  { value: "2_weeks", label: "2 semaines" },
                  { value: "1_month", label: "1 mois" },
                  { value: "3_months", label: "3 mois" },
                  { value: "6_months", label: "6 mois (par défaut)" },
                  { value: "1_year", label: "1 an" },
                  { value: "custom", label: "Personnalisé" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
                      expirationOption === option.value
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="expiration"
                      value={option.value}
                      checked={expirationOption === option.value}
                      onChange={(e) => setExpirationOption(e.target.value)}
                      className="accent-primary"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              
              {expirationOption === "custom" && (
                <div className="mb-6">
                  <label className="text-sm text-white/60 block mb-2">Nombre de jours</label>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value) || 1)}
                    className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary"
                  />
                </div>
              )}
              
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 mb-6">
                <p className="text-amber-400 text-sm">
                  ⚠️ Le compte sera automatiquement supprimé après ce délai à partir de maintenant.
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowExpirationModal(false)}
                  className="btn-outline flex-1 py-3"
                >
                  Annuler
                </button>
                <button
                  onClick={updateClientExpiration}
                  disabled={updatingExpiration}
                  className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
                >
                  {updatingExpiration ? (
                    <>
                      <Loader size={16} className="animate-spin" /> Mise à jour...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Appliquer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Extensions Tab */}
        {activeTab === "extensions" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-primary font-bold text-xl">💳 Gestion des Extensions</h2>
              <div className="flex gap-3">
                <button
                  onClick={fetchArchivedClients}
                  className="btn-outline px-4 py-2 text-sm"
                >
                  Voir archives
                </button>
                <button
                  onClick={cleanupExpiredAccounts}
                  className="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 text-sm hover:bg-red-500/30"
                >
                  Archiver comptes expirés
                </button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-500/10 border border-blue-500/30 p-4">
              <p className="text-sm text-blue-300">
                <strong>Système d'expiration :</strong> Chaque compte client expire automatiquement selon le délai défini (6 mois par défaut). 
                Les clients avec un compte expiré peuvent renouveler directement via PayPal (20€/semaine ou 90€/6 mois).
              </p>
            </div>

            {/* Renewal Requests */}
            <div className="bg-card border border-green-500/30 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-green-400" /> 
                Demandes de renouvellement PayPal
                {renewalRequests.length > 0 && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                    {renewalRequests.length}
                  </span>
                )}
              </h3>
              
              {loadingRenewals ? (
                <div className="text-center py-8">
                  <Loader className="animate-spin mx-auto text-green-400" size={32} />
                </div>
              ) : renewalRequests.length === 0 ? (
                <p className="text-white/50 text-center py-8">Aucune demande de renouvellement en attente</p>
              ) : (
                <div className="space-y-4">
                  {renewalRequests.map((request) => (
                    <div key={request.id} className="bg-background border border-green-500/30 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{request.client_name}</p>
                        <p className="text-white/60 text-sm">{request.client_email}</p>
                        <p className="text-xs text-white/40 mt-1">
                          Demandé le {new Date(request.created_at).toLocaleDateString('fr-FR')} à {new Date(request.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-400">{request.amount}€</p>
                          <p className="text-xs text-white/40">{request.plan_label} (+{request.days} jours)</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => approveRenewal(request.id)}
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm flex items-center gap-1"
                          >
                            <Check size={16} /> Valider
                          </button>
                          <button
                            onClick={() => rejectRenewal(request.id)}
                            className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-2 text-sm hover:bg-red-500/30"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-white/40 mt-4">
                💡 Vérifiez le paiement sur PayPal avant de valider. Le client recevra un email de confirmation.
              </p>
            </div>

            {/* Pending Extension Orders */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Clock size={20} className="text-yellow-400" /> Demandes en attente
              </h3>
              
              {extensionOrders.filter(o => o.status === "pending").length === 0 ? (
                <p className="text-white/50 text-center py-8">Aucune demande en attente</p>
              ) : (
                <div className="space-y-4">
                  {extensionOrders.filter(o => o.status === "pending").map((order) => (
                    <div key={order.id} className="bg-background border border-yellow-500/30 p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold">{order.client_name}</p>
                        <p className="text-white/60 text-sm">{order.client_email}</p>
                        <p className="text-xs text-white/40 mt-1">
                          Demandé le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{order.amount}€</p>
                          <p className="text-xs text-white/40">+{order.extension_days} jours</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => validateExtension(order.id)}
                            className="btn-primary px-4 py-2 text-sm"
                          >
                            ✓ Valider
                          </button>
                          <button
                            onClick={() => deleteExtensionOrder(order.id)}
                            className="btn-outline px-4 py-2 text-sm text-red-400 border-red-400"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validated Orders History */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Check size={20} className="text-green-400" /> Historique des validations
              </h3>
              
              {extensionOrders.filter(o => o.status === "paid").length === 0 ? (
                <p className="text-white/50 text-center py-4">Aucune extension validée</p>
              ) : (
                <div className="space-y-2">
                  {extensionOrders.filter(o => o.status === "paid").slice(0, 10).map((order) => (
                    <div key={order.id} className="bg-background border border-green-500/20 p-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <Check size={16} className="text-green-400" />
                        <span className="font-semibold">{order.client_name}</span>
                        <span className="text-white/40">{order.client_email}</span>
                      </div>
                      <div className="flex items-center gap-4 text-white/60">
                        <span>{order.amount}€</span>
                        <span>Validé le {new Date(order.paid_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Archived Clients */}
            {archivedClients.length > 0 && (
              <div className="bg-card border border-white/10 p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <FileArchive size={20} className="text-white/40" /> Clients archivés
                </h3>
                <div className="space-y-2">
                  {archivedClients.map((client) => (
                    <div key={client.id} className="bg-background border border-white/10 p-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-semibold">{client.name}</span>
                        <span className="text-white/40 ml-2">{client.email}</span>
                      </div>
                      <div className="text-white/40 text-xs">
                        Archivé le {new Date(client.archived_at).toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clients Near Expiration */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-orange-400" /> Clients proches de l'expiration
              </h3>
              <div className="space-y-2">
                {clients
                  .filter(c => {
                    if (!c.expires_at) return false;
                    const daysLeft = Math.ceil((new Date(c.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                    return daysLeft <= 30 && daysLeft > 0;
                  })
                  .map((client) => {
                    const daysLeft = Math.ceil((new Date(client.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={client.id} className="bg-background border border-orange-500/20 p-3 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold">{client.name}</span>
                          <span className="text-white/40 ml-2">{client.email}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs ${daysLeft <= 7 ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {daysLeft} jours restants
                        </span>
                      </div>
                    );
                  })}
                {clients.filter(c => {
                  if (!c.expires_at) return false;
                  const daysLeft = Math.ceil((new Date(c.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
                  return daysLeft <= 30 && daysLeft > 0;
                }).length === 0 && (
                  <p className="text-white/50 text-center py-4">Aucun client proche de l'expiration</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing/Facturation Tab */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-primary font-bold text-xl">🧾 Facturation - Renouvellements PayPal</h2>
              <button
                onClick={fetchBillingData}
                className="btn-outline px-4 py-2 text-sm"
              >
                Actualiser
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-white/10 p-6">
                <p className="text-white/60 text-sm mb-1">Chiffre d'affaires total</p>
                <p className="text-3xl font-bold text-green-400">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(billingStats.total_revenue)}
                </p>
              </div>
              <div className="bg-card border border-white/10 p-6">
                <p className="text-white/60 text-sm mb-1">Nombre de factures</p>
                <p className="text-3xl font-bold text-primary">{billingStats.total_invoices}</p>
              </div>
              <div className="bg-card border border-white/10 p-6">
                <p className="text-white/60 text-sm mb-1">Panier moyen</p>
                <p className="text-3xl font-bold text-blue-400">
                  {billingStats.total_invoices > 0 
                    ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(billingStats.total_revenue / billingStats.total_invoices)
                    : "0,00 €"
                  }
                </p>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-bold mb-4">Historique des factures</h3>
              
              {loadingBilling ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="animate-spin text-primary" size={32} />
                </div>
              ) : renewalInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-2 text-white/60 text-sm">N° Facture</th>
                        <th className="text-left py-3 px-2 text-white/60 text-sm">Client</th>
                        <th className="text-left py-3 px-2 text-white/60 text-sm">Forfait</th>
                        <th className="text-right py-3 px-2 text-white/60 text-sm">HT</th>
                        <th className="text-right py-3 px-2 text-white/60 text-sm">TVA</th>
                        <th className="text-right py-3 px-2 text-white/60 text-sm">TTC</th>
                        <th className="text-left py-3 px-2 text-white/60 text-sm">Date</th>
                        <th className="text-left py-3 px-2 text-white/60 text-sm">Statut</th>
                        <th className="text-left py-3 px-2 text-white/60 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {renewalInvoices.map((invoice) => (
                        <tr key={invoice.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-2 font-mono text-sm text-primary">{invoice.invoice_number}</td>
                          <td className="py-3 px-2">
                            <p className="font-medium">{invoice.client_name}</p>
                            <p className="text-white/50 text-xs">{invoice.client_email}</p>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              invoice.plan === "weekly" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                            }`}>
                              {invoice.plan_label}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">{invoice.amount_ht?.toFixed(2)} €</td>
                          <td className="py-3 px-2 text-right text-white/50">{invoice.tva?.toFixed(2)} €</td>
                          <td className="py-3 px-2 text-right font-bold text-green-400">{invoice.amount_ttc?.toFixed(2)} €</td>
                          <td className="py-3 px-2 text-white/60 text-sm">
                            {new Date(invoice.created_at).toLocaleDateString('fr-FR', { 
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-2">
                            <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">
                              Payée
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await axios.get(
                                    `${API}/admin/renewal-invoice/${invoice.id}/pdf`,
                                    { 
                                      headers,
                                      responseType: 'blob'
                                    }
                                  );
                                  const url = window.URL.createObjectURL(new Blob([response.data]));
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.setAttribute('download', `Facture_${invoice.invoice_number}.pdf`);
                                  document.body.appendChild(link);
                                  link.click();
                                  link.remove();
                                  window.URL.revokeObjectURL(url);
                                } catch (e) {
                                  toast.error("Erreur lors du téléchargement");
                                }
                              }}
                              className="text-primary hover:text-primary/80 flex items-center gap-1 text-sm"
                            >
                              <Download size={16} /> PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-white/50 text-center py-8">Aucune facture de renouvellement pour le moment</p>
              )}
            </div>
          </div>
        )}

        {/* Newsletter Tab */}
        {activeTab === "newsletter" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">📧 Gestion de la Newsletter</h2>
            
            {loadingNewsletter ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-card border border-white/10 p-6 text-center">
                    <p className="text-3xl font-bold text-primary">{newsletterStats?.total_clients || 0}</p>
                    <p className="text-white/60 text-sm mt-1">Total Clients</p>
                  </div>
                  <div className="bg-card border border-white/10 p-6 text-center">
                    <p className="text-3xl font-bold text-green-500">{newsletterStats?.subscribed_count || 0}</p>
                    <p className="text-white/60 text-sm mt-1">Abonnés</p>
                  </div>
                  <div className="bg-card border border-white/10 p-6 text-center">
                    <p className="text-3xl font-bold text-red-500">{newsletterStats?.unsubscribed_count || 0}</p>
                    <p className="text-white/60 text-sm mt-1">Désabonnés</p>
                  </div>
                  <div className="bg-card border border-white/10 p-6 text-center">
                    <p className="text-3xl font-bold text-primary">{newsletterStats?.subscription_rate || 0}%</p>
                    <p className="text-white/60 text-sm mt-1">Taux d'abonnement</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Send Newsletter Form */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
                      <FileText size={20} className="text-primary" />
                      Envoyer une Newsletter
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Sujet de l'email</label>
                        <input
                          type="text"
                          value={newsletterForm.subject}
                          onChange={(e) => setNewsletterForm(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Ex: Nouveautés du mois..."
                          className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none"
                          data-testid="newsletter-subject-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Message</label>
                        <textarea
                          value={newsletterForm.message}
                          onChange={(e) => setNewsletterForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Écrivez votre message ici..."
                          rows={6}
                          className="w-full bg-background border border-white/20 px-4 py-3 focus:border-primary focus:outline-none resize-none"
                          data-testid="newsletter-message-input"
                        />
                      </div>
                      <button
                        onClick={handleSendNewsletter}
                        disabled={sendingNewsletter || !newsletterForm.subject || !newsletterForm.message}
                        className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                        data-testid="send-newsletter-btn"
                      >
                        {sendingNewsletter ? (
                          <>
                            <Loader className="animate-spin" size={16} />
                            Envoi en cours...
                          </>
                        ) : (
                          <>
                            📧 Envoyer à {newsletterStats?.subscribed_count || 0} abonné(s)
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Recent Newsletters */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
                      <Clock size={20} className="text-primary" />
                      Historique des envois
                    </h3>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {(newsletterStats?.recent_newsletters || []).length === 0 ? (
                        <p className="text-white/40 text-center py-4">Aucun envoi récent</p>
                      ) : (
                        newsletterStats.recent_newsletters.map((nl, idx) => (
                          <div key={idx} className="bg-background p-3 border border-white/10">
                            <p className="font-semibold text-sm truncate">{nl.subject}</p>
                            <p className="text-white/40 text-xs mt-1">
                              {new Date(nl.sent_at).toLocaleDateString("fr-FR", { 
                                day: "numeric", 
                                month: "short", 
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                            <div className="flex gap-3 mt-2 text-xs">
                              <span className="text-green-400">✓ {nl.sent_count} envoyé(s)</span>
                              {nl.failed_count > 0 && (
                                <span className="text-red-400">✗ {nl.failed_count} échec(s)</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscribers List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Subscribed */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
                      <Check size={20} className="text-green-500" />
                      Abonnés ({newsletterSubscribers.subscribers.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {newsletterSubscribers.subscribers.length === 0 ? (
                        <p className="text-white/40 text-center py-4">Aucun abonné</p>
                      ) : (
                        newsletterSubscribers.subscribers.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                            <div>
                              <p className="font-semibold text-sm">{sub.name}</p>
                              <p className="text-white/40 text-xs">{sub.email}</p>
                            </div>
                            <span className="text-green-500 text-xs">● Abonné</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Unsubscribed */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
                      <X size={20} className="text-red-500" />
                      Désabonnés ({newsletterSubscribers.unsubscribers.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {newsletterSubscribers.unsubscribers.length === 0 ? (
                        <p className="text-white/40 text-center py-4">Aucun désabonné</p>
                      ) : (
                        newsletterSubscribers.unsubscribers.map((unsub) => (
                          <div key={unsub.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                            <div>
                              <p className="font-semibold text-sm">{unsub.name}</p>
                              <p className="text-white/40 text-xs">{unsub.email}</p>
                            </div>
                            <span className="text-red-500 text-xs">● Désabonné</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Deployment Tab */}
        {activeTab === "deployment" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">🚀 Gestion du Déploiement</h2>
            
            {loadingDeployment ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <>
                {/* Current Status */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-primary font-bold text-lg mb-4">📊 Statut Actuel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-background p-4 border border-white/10">
                      <p className="text-white/60 text-sm">Version actuelle</p>
                      <p className="font-mono text-primary font-bold">{deploymentStatus?.current_commit || "Inconnue"}</p>
                    </div>
                    <div className="bg-background p-4 border border-white/10">
                      <p className="text-white/60 text-sm">Branche</p>
                      <p className="font-mono text-white font-bold">{deploymentStatus?.branch || "main"}</p>
                    </div>
                    <div className="bg-background p-4 border border-white/10">
                      <p className="text-white/60 text-sm">Mises à jour disponibles</p>
                      <p className={`font-bold ${deploymentStatus?.updates_available > 0 ? "text-yellow-500" : "text-green-500"}`}>
                        {deploymentStatus?.updates_available > 0 ? `${deploymentStatus.updates_available} nouvelle(s)` : "À jour ✓"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Update Button */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4">📥 Mettre à jour</h3>
                    <p className="text-white/60 text-sm mb-4">
                      Récupère la dernière version du code depuis GitHub, recompile le frontend et redémarre le service.
                    </p>
                    <button
                      onClick={handleDeployUpdate}
                      disabled={deploying}
                      className="btn-primary w-full py-3 disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="deploy-update-btn"
                    >
                      {deploying ? (
                        <>
                          <Loader className="animate-spin" size={16} />
                          Mise à jour en cours...
                        </>
                      ) : (
                        <>🚀 Forcer la mise à jour</>
                      )}
                    </button>
                  </div>

                  {/* Logs */}
                  <div className="bg-card border border-white/10 p-6">
                    <h3 className="font-primary font-bold text-lg mb-4">📋 Logs</h3>
                    <div className="bg-black p-4 font-mono text-sm h-40 overflow-y-auto border border-white/10">
                      {deployLogs.length === 0 ? (
                        <p className="text-white/40">Aucune action en cours...</p>
                      ) : (
                        deployLogs.map((log, idx) => (
                          <p key={idx} className={log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-green-400" : "text-white/80"}>
                            {log}
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Rollback Options */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-primary font-bold text-lg mb-4">⏪ Revenir à une version précédente</h3>
                  <p className="text-white/60 text-sm mb-4">
                    ⚠️ Attention : Un rollback restaurera le code à une version antérieure. Utilisez cette option uniquement en cas de problème urgent.
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(deploymentStatus?.commits || []).map((commit, idx) => (
                      <div 
                        key={commit.hash} 
                        className={`flex items-center justify-between p-3 border ${idx === 0 ? "border-primary bg-primary/10" : "border-white/10 bg-background"}`}
                      >
                        <div className="flex-1">
                          <span className="font-mono text-primary text-sm">{commit.hash}</span>
                          <span className="text-white/60 text-sm ml-3">{commit.message}</span>
                          {idx === 0 && <span className="ml-2 text-xs bg-primary text-black px-2 py-0.5 rounded">ACTUEL</span>}
                        </div>
                        {idx !== 0 && (
                          <button
                            onClick={() => handleDeployRollback(commit.hash)}
                            disabled={deploying}
                            className="btn-outline text-sm px-3 py-1 disabled:opacity-50"
                            data-testid={`rollback-${commit.hash}`}
                          >
                            Restaurer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deployment History */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-primary font-bold text-lg mb-4">📜 Historique des déploiements</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {deploymentHistory.length === 0 ? (
                      <p className="text-white/40 text-center py-4">Aucun historique</p>
                    ) : (
                      deploymentHistory.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between py-2 px-3 bg-background border border-white/10">
                          <div>
                            <span className={`text-xs px-2 py-0.5 rounded mr-2 ${entry.action === "update" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                              {entry.action === "update" ? "MISE À JOUR" : "ROLLBACK"}
                            </span>
                            <span className="font-mono text-sm text-primary">{entry.commit}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white/60">{entry.performed_by}</p>
                            <p className="text-xs text-white/40">
                              {new Date(entry.performed_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Messages reçus</h2>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`bg-card border p-6 ${msg.is_read ? "border-white/10" : "border-primary"}`} data-testid={`message-${msg.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-primary font-bold">{msg.name}</h3>
                      <p className="text-white/60 text-sm">{msg.email} {msg.phone && `• ${msg.phone}`}</p>
                    </div>
                    <span className="text-white/40 text-sm">
                      {new Date(msg.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <p className="font-semibold mb-2">{msg.subject}</p>
                  <p className="text-white/70 text-sm">{msg.message}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucun message</p>
              )}
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === "appointments" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-4">Demandes de rendez-vous</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments List */}
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <p className="text-center text-white/60 py-8">Aucune demande de rendez-vous</p>
                ) : (
                  appointments.map((apt) => (
                    <div 
                      key={apt.id} 
                      onClick={() => setSelectedAppointment(apt)}
                      className={`bg-card border p-4 cursor-pointer transition-all hover:border-primary ${selectedAppointment?.id === apt.id ? "border-primary" : "border-white/10"}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-primary font-bold">{apt.client_name}</h3>
                          <p className="text-white/60 text-sm">{apt.client_email}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 border ${appointmentStatusColors[apt.status] || "bg-white/10"}`}>
                          {appointmentStatusLabels[apt.status] || apt.status}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="text-white/50">Motif :</span> {apt.appointment_type_label || apt.appointment_type}</p>
                        <p><span className="text-white/50">Date souhaitée :</span> <span className="text-primary font-semibold">{apt.proposed_date} à {apt.proposed_time}</span></p>
                        {apt.new_proposed_date && (
                          <p><span className="text-white/50">Nouvelle date :</span> <span className="text-orange-400 font-semibold">{apt.new_proposed_date} à {apt.new_proposed_time}</span></p>
                        )}
                      </div>
                      <p className="text-white/40 text-xs mt-3">
                        Réf: RDV-{apt.id.substring(0, 8).toUpperCase()} • {new Date(apt.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Selected Appointment Detail */}
              {selectedAppointment && (
                <div className="bg-card border border-primary p-6">
                  <h3 className="font-primary font-bold text-lg mb-4">Détails du rendez-vous</h3>
                  
                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between">
                      <span className="text-white/60">Client</span>
                      <span className="font-semibold">{selectedAppointment.client_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Email</span>
                      <span>{selectedAppointment.client_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Téléphone</span>
                      <span>{selectedAppointment.client_phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Motif</span>
                      <span>{selectedAppointment.appointment_type_label || selectedAppointment.appointment_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Date souhaitée</span>
                      <span className="text-primary font-bold">{selectedAppointment.proposed_date} à {selectedAppointment.proposed_time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Durée</span>
                      <span>{selectedAppointment.duration} min</span>
                    </div>
                    {selectedAppointment.message && (
                      <div className="bg-background p-3 mt-2">
                        <p className="text-white/60 text-xs mb-1">Message du client :</p>
                        <p className="text-sm">{selectedAppointment.message}</p>
                      </div>
                    )}
                  </div>

                  {selectedAppointment.status === "pending" && (
                    <div className="space-y-4 border-t border-white/10 pt-4">
                      <h4 className="font-primary font-semibold">Répondre à la demande</h4>
                      
                      <textarea
                        placeholder="Message pour le client (optionnel)"
                        value={appointmentResponse.admin_response}
                        onChange={(e) => setAppointmentResponse({ ...appointmentResponse, admin_response: e.target.value })}
                        className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
                        rows={2}
                      />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToAppointment(selectedAppointment.id, { status: "confirmed", admin_response: appointmentResponse.admin_response })}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 text-sm font-semibold"
                        >
                          ✓ Confirmer
                        </button>
                        <button
                          onClick={() => respondToAppointment(selectedAppointment.id, { status: "refused", admin_response: appointmentResponse.admin_response })}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-semibold"
                        >
                          ✕ Refuser
                        </button>
                      </div>
                      
                      <div className="border-t border-white/10 pt-4">
                        <h5 className="text-sm font-semibold mb-3">Ou proposer une autre date :</h5>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <input
                            type="date"
                            value={appointmentResponse.new_proposed_date}
                            onChange={(e) => setAppointmentResponse({ ...appointmentResponse, new_proposed_date: e.target.value })}
                            className="bg-background border border-white/20 px-3 py-2 text-sm"
                          />
                          <input
                            type="time"
                            value={appointmentResponse.new_proposed_time}
                            onChange={(e) => setAppointmentResponse({ ...appointmentResponse, new_proposed_time: e.target.value })}
                            className="bg-background border border-white/20 px-3 py-2 text-sm"
                          />
                        </div>
                        <button
                          onClick={() => respondToAppointment(selectedAppointment.id, { 
                            status: "rescheduled_pending", 
                            admin_response: appointmentResponse.admin_response,
                            new_proposed_date: appointmentResponse.new_proposed_date,
                            new_proposed_time: appointmentResponse.new_proposed_time
                          })}
                          disabled={!appointmentResponse.new_proposed_date || !appointmentResponse.new_proposed_time}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 text-sm font-semibold disabled:opacity-50"
                        >
                          📅 Proposer cette date
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedAppointment.status !== "pending" && (
                    <div className={`p-4 text-center ${appointmentStatusColors[selectedAppointment.status]}`}>
                      <p className="font-semibold">{appointmentStatusLabels[selectedAppointment.status]}</p>
                      {selectedAppointment.status === "rescheduled_pending" && (
                        <p className="text-sm mt-1">En attente de confirmation du client pour le {selectedAppointment.new_proposed_date} à {selectedAppointment.new_proposed_time}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div>
            <h2 className="font-primary font-bold text-xl mb-6">Paramètres</h2>
            
            {/* Bank Details */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-primary">💳 Coordonnées bancaires</h3>
              <p className="text-white/60 text-sm mb-4">Ces informations seront envoyées aux clients pour le paiement de l'acompte.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Titulaire du compte</label>
                  <input
                    type="text"
                    value={bankDetails.account_holder}
                    onChange={(e) => setBankDetails({ ...bankDetails, account_holder: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    placeholder="CREATIVINDUSTRY FRANCE"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Nom de la banque</label>
                  <input
                    type="text"
                    value={bankDetails.bank_name}
                    onChange={(e) => setBankDetails({ ...bankDetails, bank_name: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                    placeholder="Revolut"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">IBAN</label>
                  <input
                    type="text"
                    value={bankDetails.iban}
                    onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 font-mono"
                    placeholder="FR76..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">BIC</label>
                  <input
                    type="text"
                    value={bankDetails.bic}
                    onChange={(e) => setBankDetails({ ...bankDetails, bic: e.target.value })}
                    className="w-full bg-background border border-white/20 px-4 py-3 font-mono"
                    placeholder="REVOFRP2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Pourcentage d'acompte (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={bankDetails.deposit_percentage}
                    onChange={(e) => setBankDetails({ ...bankDetails, deposit_percentage: parseInt(e.target.value) })}
                    className="w-full bg-background border border-white/20 px-4 py-3"
                  />
                </div>
              </div>
              
              <button onClick={updateBankDetails} className="btn-primary px-6 py-3 mt-6">
                Enregistrer les coordonnées bancaires
              </button>
            </div>

            {/* Backup Section */}
            <div className="bg-card border border-green-500/30 p-6 mb-6">
              <h3 className="font-primary font-bold text-lg mb-4 text-green-400">💾 Sauvegarde complète</h3>
              <p className="text-white/60 text-sm mb-4">
                Téléchargez une sauvegarde de votre site :
              </p>
              <ul className="text-white/60 text-sm mb-4 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Base de données (clients, réservations, devis, portfolio...)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Fichiers uploadés (photos, vidéos, stories...)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Instructions de restauration
                </li>
              </ul>
              
              {/* Option: Include code for migration */}
              <div className="bg-blue-500/10 border border-blue-500/30 p-4 mb-6 rounded">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="includeCode"
                    className="mt-1 w-5 h-5 accent-primary"
                    onChange={(e) => window.backupIncludeCode = e.target.checked}
                  />
                  <div>
                    <span className="font-medium text-blue-400">🚀 Inclure le code source (migration serveur)</span>
                    <p className="text-white/50 text-xs mt-1">
                      Cochez cette option pour obtenir une sauvegarde complète permettant de migrer vers un autre serveur.
                      Inclut : code backend, frontend compilé, fichier .env.example, guide d'installation.
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Progress Bar */}
              {backupProgress.active && (
                <div className="mb-6 bg-background border border-white/10 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{backupProgress.step}</span>
                    <span className="text-sm text-primary">{backupProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-300"
                      style={{ width: `${backupProgress.progress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <button 
                disabled={backupProgress.active}
                onClick={async () => {
                  const includeCode = window.backupIncludeCode || false;
                  setBackupProgress({ active: true, step: 'Préparation de la sauvegarde...', progress: 5 });
                  try {
                    // Step 1: Create the backup file
                    setBackupProgress({ active: true, step: includeCode ? 'Création de la sauvegarde complète (code + données)...' : 'Création de la sauvegarde...', progress: 20 });
                    const createResponse = await axios.post(`${API}/admin/backup/create`, { include_code: includeCode }, { headers });
                    
                    if (createResponse.data.success) {
                      setBackupProgress({ active: true, step: `Sauvegarde créée (${createResponse.data.size_mb} MB). Téléchargement...`, progress: 50 });
                      
                      // Step 2: Download the file with progress
                      const downloadUrl = createResponse.data.download_url.replace('/api', '');
                      const downloadResponse = await axios.get(`${API}${downloadUrl}`, {
                        headers,
                        responseType: 'blob',
                        onDownloadProgress: (progressEvent) => {
                          const percentCompleted = Math.round(50 + (progressEvent.loaded / progressEvent.total) * 45);
                          setBackupProgress({ 
                            active: true, 
                            step: `Téléchargement... ${Math.round(progressEvent.loaded / 1024 / 1024)} MB`, 
                            progress: percentCompleted 
                          });
                        }
                      });
                      
                      setBackupProgress({ active: true, step: 'Finalisation...', progress: 98 });
                      
                      const url = window.URL.createObjectURL(new Blob([downloadResponse.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', createResponse.data.filename);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      window.URL.revokeObjectURL(url);
                      
                      setBackupProgress({ active: true, step: 'Terminé !', progress: 100 });
                      toast.success("Sauvegarde téléchargée avec succès !");
                      confirmBackupDownload();
                      
                      // Reset progress after 2 seconds
                      setTimeout(() => {
                        setBackupProgress({ active: false, step: '', progress: 0 });
                      }, 2000);
                    }
                  } catch (e) {
                    console.error('Backup error:', e);
                    setBackupProgress({ active: false, step: '', progress: 0 });
                    toast.error("Erreur lors de la création de la sauvegarde. Vérifiez les permissions du serveur.");
                  }
                }}
                className={`${backupProgress.active ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white px-6 py-3 font-bold flex items-center gap-2`}
              >
                {backupProgress.active ? (
                  <>
                    <Loader size={20} className="animate-spin" /> Sauvegarde en cours...
                  </>
                ) : (
                  <>
                    <Download size={20} /> Télécharger la sauvegarde ZIP
                  </>
                )}
              </button>
              {backupStatus?.last_backup && (
                <p className="text-xs text-green-400 mt-2">
                  ✅ Dernière sauvegarde : {new Date(backupStatus.last_backup.performed_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </p>
              )}
              <p className="text-xs text-white/40 mt-3">
                💡 Conseil : Faites une sauvegarde régulière (1x/semaine) et conservez-la sur un disque externe ou cloud.
              </p>
            </div>
          </div>
        )}

        {/* Security Tab - MFA */}
        {activeTab === "security" && (
          <div data-testid="admin-security">
            <h2 className="font-primary font-bold text-xl mb-6">🔐 Sécurité du compte</h2>
            
            {/* MFA Status Card */}
            <div className="bg-card border border-white/10 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${mfaStatus.mfa_enabled ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                    <Shield size={24} className={mfaStatus.mfa_enabled ? 'text-green-500' : 'text-yellow-500'} />
                  </div>
                  <div>
                    <h3 className="font-primary font-bold text-lg">Double Authentification (MFA)</h3>
                    <p className={`text-sm ${mfaStatus.mfa_enabled ? 'text-green-500' : 'text-yellow-500'}`}>
                      {mfaStatus.mfa_enabled ? '✓ Activée' : '⚠ Non activée'}
                    </p>
                  </div>
                </div>
                {mfaStatus.mfa_enabled && (
                  <div className="text-right">
                    <p className="text-sm text-white/60">Codes de secours restants</p>
                    <p className={`font-bold ${mfaStatus.backup_codes_remaining <= 2 ? 'text-red-500' : 'text-green-500'}`}>
                      {mfaStatus.backup_codes_remaining}
                    </p>
                  </div>
                )}
              </div>
              
              <p className="text-white/60 text-sm mb-6">
                La double authentification ajoute une couche de sécurité supplémentaire en demandant un code temporaire 
                de votre application d'authentification (Google Authenticator, Authy, etc.) lors de la connexion.
              </p>
              
              {!mfaStatus.mfa_enabled ? (
                <button onClick={setupMfa} className="btn-primary px-6 py-3">
                  Activer la double authentification
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={regenerateBackupCodes} className="btn-outline px-6 py-3">
                    Régénérer les codes de secours
                  </button>
                  <button onClick={() => setShowDisableMfa(true)} className="bg-red-500/20 text-red-500 border border-red-500/50 px-6 py-3 hover:bg-red-500/30">
                    Désactiver MFA
                  </button>
                </div>
              )}
            </div>

            {/* MFA Setup Modal */}
            {mfaSetupData && !mfaStatus.mfa_enabled && (
              <div className="bg-card border border-primary/30 p-6 mb-6">
                <h3 className="font-primary font-bold text-lg mb-4 text-primary">Configuration MFA</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* QR Code */}
                  <div className="text-center">
                    <p className="text-sm text-white/60 mb-4">1. Scannez ce QR code avec votre application d'authentification</p>
                    <div className="bg-white p-4 inline-block rounded">
                      <img 
                        src={`data:image/png;base64,${mfaSetupData.qr_code}`} 
                        alt="QR Code MFA" 
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-2">Ou entrez manuellement: <code className="bg-black/50 px-2 py-1 rounded text-xs">{mfaSetupData.secret}</code></p>
                  </div>
                  
                  {/* Verify Code */}
                  <div>
                    <p className="text-sm text-white/60 mb-4">2. Entrez le code à 6 chiffres pour vérifier</p>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaVerifyCode}
                      onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-background border border-white/20 px-4 py-4 text-center text-2xl tracking-widest font-mono mb-4"
                    />
                    <button 
                      onClick={verifyMfaSetup} 
                      disabled={mfaVerifyCode.length !== 6}
                      className="btn-primary w-full py-3 disabled:opacity-50"
                    >
                      Vérifier et activer
                    </button>
                    <button 
                      onClick={() => { setMfaSetupData(null); setMfaVerifyCode(""); }}
                      className="btn-outline w-full py-3 mt-2"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Backup Codes Display */}
            {showBackupCodes && mfaSetupData?.backup_codes && (
              <div className="bg-card border border-yellow-500/30 p-6 mb-6">
                <h3 className="font-primary font-bold text-lg mb-2 text-yellow-500">⚠️ Codes de secours</h3>
                <p className="text-white/60 text-sm mb-4">
                  Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une seule fois 
                  pour récupérer l'accès à votre compte si vous perdez votre téléphone.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                  {mfaSetupData.backup_codes.map((code, index) => (
                    <div key={index} className="bg-black/50 px-3 py-2 text-center font-mono text-sm">
                      {code}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => {
                    const codes = mfaSetupData.backup_codes.join('\n');
                    navigator.clipboard.writeText(codes);
                    toast.success("Codes copiés dans le presse-papier !");
                  }}
                  className="btn-outline px-4 py-2 text-sm mr-2"
                >
                  📋 Copier les codes
                </button>
                <button 
                  onClick={() => setShowBackupCodes(false)}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  J'ai sauvegardé mes codes
                </button>
              </div>
            )}

            {/* Disable MFA Modal */}
            {showDisableMfa && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-red-500/30 p-6 w-full max-w-md">
                  <h3 className="font-primary font-bold text-lg mb-4 text-red-500">⚠️ Désactiver MFA</h3>
                  <p className="text-white/60 text-sm mb-6">
                    Attention ! La désactivation de MFA réduit la sécurité de votre compte.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Mot de passe</label>
                      <input
                        type="password"
                        value={disableMfaData.password}
                        onChange={(e) => setDisableMfaData({ ...disableMfaData, password: e.target.value })}
                        className="w-full bg-background border border-white/20 px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Code MFA ou code de secours</label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="123456 ou ABCD1234"
                        value={disableMfaData.code}
                        onChange={(e) => setDisableMfaData({ ...disableMfaData, code: e.target.value.toUpperCase() })}
                        className="w-full bg-background border border-white/20 px-4 py-3 font-mono"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowDisableMfa(false)} className="btn-outline flex-1 py-3">
                        Annuler
                      </button>
                      <button 
                        onClick={disableMfa} 
                        disabled={!disableMfaData.password || disableMfaData.code.length < 6}
                        className="bg-red-500 text-white flex-1 py-3 hover:bg-red-600 disabled:opacity-50"
                      >
                        Désactiver
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Security Tips */}
            <div className="bg-card border border-white/10 p-6">
              <h3 className="font-primary font-bold text-lg mb-4">💡 Conseils de sécurité</h3>
              <ul className="space-y-3 text-white/60 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  Utilisez un mot de passe unique et complexe (minimum 12 caractères)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  Activez la double authentification (MFA) pour protéger votre compte
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  Conservez vos codes de secours dans un endroit sûr (coffre-fort, gestionnaire de mots de passe)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500">✓</span>
                  Ne partagez jamais vos identifiants de connexion
                </li>
              </ul>
            </div>

            {/* Admin Accounts Management */}
            <div className="bg-card border border-white/10 p-6 mt-6">
              <h3 className="font-primary font-bold text-lg mb-4">👥 Gestion des Administrateurs</h3>
              <p className="text-white/60 text-sm mb-6">
                Créez et gérez les comptes administrateurs avec leurs rôles et accès aux onglets.
              </p>
              
              {/* Create New Admin Form */}
              <div className="bg-background border border-white/10 p-4 mb-6">
                <h4 className="font-bold text-sm mb-4 text-primary">+ Créer un nouvel administrateur</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Nom"
                    value={newAdminData?.name || ""}
                    onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
                    className="bg-card border border-white/20 px-3 py-2 text-sm"
                    data-testid="new-admin-name"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newAdminData?.email || ""}
                    onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
                    className="bg-card border border-white/20 px-3 py-2 text-sm"
                    data-testid="new-admin-email"
                  />
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={newAdminData?.password || ""}
                    onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
                    className="bg-card border border-white/20 px-3 py-2 text-sm"
                    data-testid="new-admin-password"
                  />
                  <select
                    value={newAdminData?.role || "complet"}
                    onChange={(e) => setNewAdminData({ ...newAdminData, role: e.target.value })}
                    className="bg-card border border-white/20 px-3 py-2 text-sm"
                    data-testid="new-admin-role"
                  >
                    <option value="complet">Admin Complet - Accès total</option>
                    <option value="collaborateur">Collaborateur - Exécute les tâches</option>
                  </select>
                </div>
                
                {/* Tab Selection for non-complet roles */}
                {newAdminData?.role && newAdminData.role !== "complet" && (
                  <div className="mb-4">
                    <label className="block text-white/60 text-xs mb-2">Onglets accessibles :</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "overview", label: "Aperçu" },
                        { id: "tasks", label: "Tâches" },
                        { id: "calendar", label: "Calendrier" },
                        { id: "galleries", label: "Galeries" },
                        { id: "content", label: "Contenu" },
                        { id: "portfolio", label: "Portfolio" },
                        { id: "quotes", label: "Devis" },
                        { id: "bookings", label: "Réservations" },
                        { id: "clients", label: "Clients" },
                        { id: "messages", label: "Messages" },
                        { id: "appointments", label: "RDV" }
                      ].map(tab => (
                        <label key={tab.id} className="flex items-center gap-1 text-xs cursor-pointer bg-white/5 px-2 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={(newAdminData?.allowed_tabs || []).includes(tab.id)}
                            onChange={(e) => {
                              const tabs = newAdminData?.allowed_tabs || [];
                              if (e.target.checked) {
                                setNewAdminData({ ...newAdminData, allowed_tabs: [...tabs, tab.id] });
                              } else {
                                setNewAdminData({ ...newAdminData, allowed_tabs: tabs.filter(t => t !== tab.id) });
                              }
                            }}
                            className="rounded"
                          />
                          {tab.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={createNewAdmin}
                  disabled={!newAdminData?.name || !newAdminData?.email || !newAdminData?.password}
                  className="btn-primary px-6 py-2 text-sm disabled:opacity-50"
                  data-testid="create-admin-btn"
                >
                  Créer le compte
                </button>
              </div>

              {/* Admin List */}
              <div>
                <h4 className="font-bold text-sm mb-4">Liste des administrateurs ({adminsList.length})</h4>
                <div className="space-y-3">
                  {adminsList.map((adminItem) => (
                    <div key={adminItem.id} className="py-4 px-4 bg-background border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <User size={18} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{adminItem.name}</p>
                            <p className="text-white/40 text-xs">{adminItem.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            adminItem.role === "complet" ? "bg-red-500/20 text-red-400" :
                            adminItem.role !== "complet" ? "bg-blue-500/20 text-blue-400" :
                            "bg-primary/20 text-primary"
                          }`}>
                            {adminItem.role === "complet" ? "Admin" : "Collaborateur"}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${adminItem.mfa_enabled ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                            {adminItem.mfa_enabled ? 'MFA ✓' : 'MFA ✗'}
                          </span>
                          {adminItem.is_active === false && (
                            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">Désactivé</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Edit permissions (only for non-self admins) */}
                      {adminItem.id !== JSON.parse(localStorage.getItem("admin_user") || "{}").id && (
                        <div className="border-t border-white/10 pt-3 mt-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              value={adminItem.role || "complet"}
                              onChange={async (e) => {
                                try {
                                  await axios.put(`${API}/admin/update-admin/${adminItem.id}`, 
                                    { role: e.target.value }, 
                                    { headers: { Authorization: `Bearer ${token}` } }
                                  );
                                  loadAdminsList();
                                  toast.success("Rôle mis à jour");
                                } catch (err) {
                                  toast.error(err.response?.data?.detail || "Erreur");
                                }
                              }}
                              className="bg-card border border-white/20 px-2 py-1 text-xs rounded"
                            >
                              <option value="complet">Admin Complet</option>
                              <option value="collaborateur">Collaborateur</option>
                            </select>
                            
                            <label className="flex items-center gap-1 text-xs cursor-pointer">
                              <input
                                type="checkbox"
                                checked={adminItem.is_active !== false}
                                onChange={async (e) => {
                                  try {
                                    await axios.put(`${API}/admin/update-admin/${adminItem.id}`, 
                                      { is_active: e.target.checked }, 
                                      { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    loadAdminsList();
                                    toast.success(e.target.checked ? "Compte activé" : "Compte désactivé");
                                  } catch (err) {
                                    toast.error(err.response?.data?.detail || "Erreur");
                                  }
                                }}
                                className="rounded"
                              />
                              Actif
                            </label>
                            
                            <button
                              onClick={() => deleteAdmin(adminItem.id)}
                              className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                              data-testid={`delete-admin-${adminItem.id}`}
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                          
                          {/* Allowed tabs for non-complet */}
                          {adminItem.role !== "complet" && (
                            <div className="mt-3">
                              <p className="text-white/40 text-xs mb-2">Onglets accessibles :</p>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { id: "overview", label: "Aperçu" },
                                  { id: "tasks", label: "Tâches" },
                                  { id: "calendar", label: "Calendrier" },
                                  { id: "galleries", label: "Galeries" },
                                  { id: "content", label: "Contenu" },
                                  { id: "portfolio", label: "Portfolio" },
                                  { id: "quotes", label: "Devis" },
                                  { id: "bookings", label: "Réservations" },
                                  { id: "clients", label: "Clients" },
                                  { id: "messages", label: "Messages" },
                                  { id: "appointments", label: "RDV" }
                                ].map(tab => (
                                  <label key={tab.id} className={`flex items-center gap-1 text-xs cursor-pointer px-2 py-1 rounded ${
                                    (adminItem.allowed_tabs || []).includes(tab.id) ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40"
                                  }`}>
                                    <input
                                      type="checkbox"
                                      checked={(adminItem.allowed_tabs || []).includes(tab.id)}
                                      onChange={async (e) => {
                                        const tabs = adminItem.allowed_tabs || [];
                                        const newTabs = e.target.checked 
                                          ? [...tabs, tab.id]
                                          : tabs.filter(t => t !== tab.id);
                                        try {
                                          await axios.put(`${API}/admin/update-admin/${adminItem.id}`, 
                                            { allowed_tabs: newTabs }, 
                                            { headers: { Authorization: `Bearer ${token}` } }
                                          );
                                          loadAdminsList();
                                        } catch (err) {
                                          toast.error(err.response?.data?.detail || "Erreur");
                                        }
                                      }}
                                      className="rounded hidden"
                                    />
                                    {tab.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Documents Modal */}
        {showDocumentModal && documentModalClient && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-primary p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-primary font-bold text-xl">
                  📄 Documents de {documentModalClient.name}
                </h3>
                <button onClick={() => { setShowDocumentModal(false); setDocumentModalClient(null); }} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>

              {/* Upload New Document */}
              <div className="bg-background border border-white/10 p-4 mb-6">
                <h4 className="font-bold mb-4">Ajouter un document</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Type *</label>
                    <select
                      value={newDocument.type}
                      onChange={(e) => setNewDocument({...newDocument, type: e.target.value})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                    >
                      <option value="invoice">Facture</option>
                      <option value="quote">Devis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Montant (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newDocument.amount}
                      onChange={(e) => setNewDocument({...newDocument, amount: e.target.value})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-1">Titre *</label>
                    <input
                      type="text"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({...newDocument, title: e.target.value})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                      placeholder="Ex: Facture prestation mariage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Description</label>
                    <input
                      type="text"
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                      placeholder="Description optionnelle"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-1">Date d'échéance</label>
                    <input
                      type="date"
                      value={newDocument.due_date}
                      onChange={(e) => setNewDocument({...newDocument, due_date: e.target.value})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-white/60 mb-1">Fichier PDF *</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setNewDocument({...newDocument, file: e.target.files[0]})}
                      className="w-full bg-background border border-white/20 p-2 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={uploadDocument}
                  disabled={uploadingDocument}
                  className="mt-4 btn-primary px-6 py-2 flex items-center gap-2"
                >
                  {uploadingDocument ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploadingDocument ? "Envoi en cours..." : "Ajouter le document"}
                </button>
              </div>

              {/* Documents List */}
              <div>
                <h4 className="font-bold mb-4">Documents ({clientDocuments.length})</h4>
                {clientDocuments.length === 0 ? (
                  <p className="text-white/60 text-center py-8">Aucun document pour ce client</p>
                ) : (
                  <div className="space-y-3">
                    {clientDocuments.map((doc) => {
                      const remaining = doc.amount - (doc.paid_amount || 0);
                      return (
                        <div key={doc.id} className="bg-background border border-white/10 p-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-0.5 rounded ${doc.document_type === 'invoice' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                  {doc.document_type === 'invoice' ? 'FACTURE' : 'DEVIS'}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  doc.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                  doc.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {doc.status === 'paid' ? 'Payé' : doc.status === 'partial' ? 'Partiel' : 'En attente'}
                                </span>
                              </div>
                              <p className="font-semibold">{doc.title}</p>
                              {doc.description && <p className="text-sm text-white/60">{doc.description}</p>}
                              <p className="text-xs text-white/40 mt-1">
                                Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                                {doc.due_date && ` • Échéance: ${new Date(doc.due_date).toLocaleDateString('fr-FR')}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xl font-bold text-primary">{doc.amount.toFixed(2)}€</p>
                                {doc.paid_amount > 0 && remaining > 0 && (
                                  <p className="text-xs text-yellow-400">Payé: {doc.paid_amount.toFixed(2)}€ • Reste: {remaining.toFixed(2)}€</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <a
                                  href={`${API.replace('/api', '')}${doc.file_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-outline px-3 py-1 text-xs flex items-center gap-1"
                                >
                                  <Eye size={12} /> Voir
                                </a>
                                {doc.status !== 'paid' && (
                                  <button
                                    onClick={() => addDocumentPayment(doc.id, remaining)}
                                    className="bg-green-500/20 text-green-400 border border-green-500/50 px-3 py-1 text-xs flex items-center gap-1 hover:bg-green-500/30"
                                  >
                                    <CreditCard size={12} /> Paiement
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteDocument(doc.id)}
                                  className="bg-red-500/20 text-red-400 border border-red-500/50 px-3 py-1 text-xs flex items-center gap-1 hover:bg-red-500/30"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Client File Transfer Modal */}
        {showClientFileTransfer && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-primary p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-primary font-bold text-xl">
                  📁 Fichiers de {showClientFileTransfer.name}
                </h3>
                <button onClick={() => setShowClientFileTransfer(null)} className="text-white/60 hover:text-white text-2xl">×</button>
              </div>

              {/* Upload Progress */}
              {uploadingToClient && (
                <div className="bg-primary/20 border border-primary p-4 mb-6">
                  <div className="flex items-center gap-3">
                    <Loader className="animate-spin text-primary" size={20} />
                    <span>Upload en cours... {uploadToClientProgress}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-2 mt-2 rounded">
                    <div className="bg-primary h-2 rounded transition-all" style={{ width: `${uploadToClientProgress}%` }} />
                  </div>
                </div>
              )}

              <p className="text-white/60 text-sm mb-6">
                Envoyez des fichiers directement dans l'espace client. Maximum 10 Go par fichier. Le client sera notifié par email.
              </p>

              {/* Download All as ZIP */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    fetch(`${API}/admin/client/${showClientFileTransfer.id}/files-zip`, { headers })
                      .then(res => {
                        if (!res.ok) throw new Error("Aucun fichier à télécharger");
                        return res.blob();
                      })
                      .then(blob => {
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Fichiers_${showClientFileTransfer.name.replace(/\s/g, '_')}.zip`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                        toast.success("Téléchargement ZIP en cours...");
                      })
                      .catch((e) => toast.error(e.message || "Erreur lors du téléchargement"));
                  }}
                  className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                  data-testid="download-client-files-zip"
                >
                  <FileArchive size={16} /> Télécharger tous les fichiers (ZIP)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Music Upload */}
                <div className="bg-background border border-white/10 p-4">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">🎵 Musiques</h4>
                  <label className="btn-primary w-full py-2 text-sm cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={14} /> Ajouter
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.flac,.aac,.ogg"
                      className="hidden"
                      onChange={(e) => uploadFileToClient("music", e.target.files[0])}
                      disabled={uploadingToClient}
                    />
                  </label>
                  <p className="text-xs text-white/40 mt-2">MP3, WAV, M4A...</p>
                </div>

                {/* Documents Upload */}
                <div className="bg-background border border-white/10 p-4">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">📄 Documents</h4>
                  <label className="btn-primary w-full py-2 text-sm cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={14} /> Ajouter
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.zip,.rar"
                      className="hidden"
                      onChange={(e) => uploadFileToClient("documents", e.target.files[0])}
                      disabled={uploadingToClient}
                    />
                  </label>
                  <p className="text-xs text-white/40 mt-2">PDF, DOC, ZIP...</p>
                </div>

                {/* Photos Upload */}
                <div className="bg-background border border-white/10 p-4">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">📷 Photos</h4>
                  <label className="btn-primary w-full py-2 text-sm cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={14} /> Ajouter
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.heic"
                      className="hidden"
                      onChange={(e) => uploadFileToClient("photos", e.target.files[0])}
                      disabled={uploadingToClient}
                    />
                  </label>
                  <p className="text-xs text-white/40 mt-2">JPG, PNG, WEBP...</p>
                </div>

                {/* Videos Upload */}
                <div className="bg-background border border-white/10 p-4">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">🎬 Vidéos</h4>
                  <label className="btn-primary w-full py-2 text-sm cursor-pointer flex items-center justify-center gap-2">
                    <Upload size={14} /> Ajouter
                    <input
                      type="file"
                      accept=".mp4,.mov,.avi,.mkv,.webm"
                      className="hidden"
                      onChange={(e) => uploadFileToClient("videos", e.target.files[0])}
                      disabled={uploadingToClient}
                    />
                  </label>
                  <p className="text-xs text-white/40 mt-2">MP4, MOV, AVI...</p>
                </div>
              </div>

              {/* Files List */}
              <div className="space-y-4">
                {["music", "documents", "photos", "videos"].map(type => (
                  <div key={type} className="border border-white/10 p-4">
                    <h4 className="font-bold text-sm mb-3 capitalize flex items-center gap-2">
                      {type === "music" && "🎵"}{type === "documents" && "📄"}{type === "photos" && "📷"}{type === "videos" && "🎬"} 
                      {type === "music" ? "Musiques" : type === "documents" ? "Documents" : type === "photos" ? "Photos" : "Vidéos"} 
                      ({clientTransfers[type]?.length || 0})
                    </h4>
                    {clientTransfers[type]?.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {clientTransfers[type].map(file => (
                          <div key={file.id} className="flex items-center justify-between py-2 px-3 bg-card border border-white/10">
                            <div className="flex-1 truncate">
                              <span className="text-sm">{file.original_name}</span>
                              <span className="text-xs text-white/40 ml-2">
                                ({(file.size_bytes / (1024 * 1024)).toFixed(2)} MB)
                              </span>
                            </div>
                            <button 
                              onClick={() => deleteClientTransferFile(file.id)}
                              className="text-red-400 hover:text-red-300 ml-2"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-xs">Aucun fichier</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowClientFileTransfer(null)} 
                  className="btn-outline px-6 py-2"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Chat Modal */}
        <AdminChat isOpen={showChat} onClose={() => { setShowChat(false); fetchUnreadMessages(); }} />
        
        {/* Team Chat (floating button) */}
        <TeamChat token={token} currentAdmin={currentAdmin} />
      </div>
    </div>
  );
};

// Edit Service Form Component
const EditServiceForm = ({ service, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: service.name,
    description: service.description,
    price: service.price,
    duration: service.duration || "",
    is_active: service.is_active,
    features: service.features || []
  });
  const [newFeature, setNewFeature] = useState("");

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({ ...formData, features: [...formData.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (index) => {
    setFormData({ ...formData, features: formData.features.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
        placeholder="Nom"
        data-testid="edit-service-name"
      />
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
        rows={2}
        placeholder="Description"
        data-testid="edit-service-description"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
          className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
          placeholder="Prix"
          data-testid="edit-service-price"
        />
        <input
          type="text"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          className="w-full bg-background border border-white/20 px-3 py-2 text-sm"
          placeholder="Durée"
          data-testid="edit-service-duration"
        />
      </div>
      
      {/* Features Editor */}
      <div className="border border-white/10 p-3 space-y-2">
        <p className="text-xs text-white/60 font-semibold uppercase tracking-wider">Prestations incluses</p>
        {formData.features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2 bg-background/50 p-2">
            <span className="text-sm flex-1">{feature}</span>
            <button 
              onClick={() => removeFeature(index)}
              className="text-red-400 hover:text-red-300 text-xs px-2"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            type="text"
            value={newFeature}
            onChange={(e) => setNewFeature(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
            className="flex-1 bg-background border border-white/20 px-3 py-2 text-sm"
            placeholder="Ajouter une prestation..."
          />
          <button 
            onClick={addFeature}
            className="btn-primary px-4 py-2 text-xs"
          >
            +
          </button>
        </div>
      </div>
      
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="accent-primary"
          data-testid="edit-service-active"
        />
        Service actif
      </label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="btn-outline flex-1 py-2 text-xs">
          Annuler
        </button>
        <button onClick={() => onSave(formData)} className="btn-primary flex-1 py-2 text-xs" data-testid="save-service-btn">
          Sauvegarder
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
