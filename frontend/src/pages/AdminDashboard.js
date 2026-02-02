import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Calendar, Check, Camera, Mic, Tv, X, Clock, Users, FileText, Image, Video, Plus, Minus, User, LogOut, Upload, Loader, Download, Eye, Printer, ArrowLeft, Shield } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
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
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingMultiplePhotos, setUploadingMultiplePhotos] = useState(false);
  const [multiplePhotosProgress, setMultiplePhotosProgress] = useState({ current: 0, total: 0 });
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingClientFileThumbnail, setUploadingClientFileThumbnail] = useState(false);
  const [uploadingClientFile, setUploadingClientFile] = useState(false);
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
  const [gallerySelection, setGallerySelection] = useState(null);
  const galleryFileRef = useRef(null);
  // MFA states
  const [mfaStatus, setMfaStatus] = useState({ mfa_enabled: false, backup_codes_remaining: 0 });
  const [mfaSetupData, setMfaSetupData] = useState(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disableMfaData, setDisableMfaData] = useState({ password: "", code: "" });
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("admin_token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      navigate("/admin");
      return;
    }
    fetchData();
    fetchBankDetails();
    fetchMfaStatus();
  }, [token]);

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
      const [statsRes, bookingsRes, quotesRes, servicesRes, optionsRes, messagesRes, portfolioRes, clientsRes, contentRes, appointmentsRes, galleriesRes] = await Promise.all([
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
        axios.get(`${API}/admin/galleries`, { headers })
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
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem("admin_token");
        navigate("/admin");
      }
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

  const selectClient = async (client) => {
    setSelectedClient(client);
    try {
      const res = await axios.get(`${API}/admin/clients/${client.id}/files`, { headers });
      setClientFiles(res.data);
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
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.");
      return;
    }
    
    if (file.size > 1024 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 1 Go)");
      return;
    }
    
    const title = prompt("Titre du fichier:", file.name.split('.')[0]);
    if (!title) return;
    
    setUploadingClientFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', '');
    
    try {
      await axios.post(`${API}/upload/client/${selectedClient.id}`, formData, {
        headers: { ...headers, 'Content-Type': 'multipart/form-data' }
      });
      toast.success("Fichier uploadé et client notifié par email !");
      selectClient(selectedClient);
    } catch (e) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingClientFile(false);
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

  const viewGallerySelection = async (gallery) => {
    try {
      const res = await axios.get(`${API}/admin/galleries/${gallery.id}/selection`, { headers });
      setGallerySelection(res.data);
      setSelectedGallery(gallery);
    } catch (e) {
      toast.error("Erreur lors du chargement de la sélection");
    }
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
          <button onClick={logout} className="btn-outline px-6 py-2 text-sm" data-testid="admin-logout-btn">
            Déconnexion
          </button>
        </div>

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

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "overview", label: "Aperçu" },
            { id: "calendar", label: "📅 Calendrier" },
            { id: "galleries", label: "📸 Galeries" },
            { id: "content", label: "Contenu Site" },
            { id: "portfolio", label: "Portfolio" },
            { id: "quotes", label: "Devis Mariage" },
            { id: "bookings", label: "Réservations" },
            { id: "clients", label: "Clients" },
            { id: "services", label: "Services" },
            { id: "options", label: "Options Mariage" },
            { id: "messages", label: "Messages" },
            { id: "appointments", label: "Rendez-vous" },
            { id: "settings", label: "Paramètres" },
            { id: "security", label: "🔐 Sécurité" }
          ].map((tab) => (
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
        </div>

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
                        {gallery.is_validated && (
                          <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 flex items-center gap-1">
                            <Check size={12} /> Validé
                          </span>
                        )}
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
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={galleryFileRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryPhotoUpload}
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
                  {portfolio.filter(p => p.media_type === "story").map((item) => (
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
                        <h3 className="font-primary font-semibold text-sm truncate mb-3">{item.title}</h3>
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
                  ))}
                </div>
                {portfolio.filter(p => p.media_type === "story").length === 0 && (
                  <p className="text-center text-white/60 py-12">Aucune story. Cliquez sur "+ Ajouter" et sélectionnez "📱 Story"</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client List */}
              <div>
                <h3 className="font-primary font-semibold mb-4">Liste des clients ({clients.length})</h3>
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className={`w-full text-left bg-card border p-4 transition-colors ${
                        selectedClient?.id === client.id ? "border-primary" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="font-primary font-semibold">{client.name}</p>
                      <p className="text-white/60 text-sm">{client.email}</p>
                    </button>
                  ))}
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
                              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
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
                                  <Loader size={16} className="animate-spin" /> Upload en cours...
                                </>
                              ) : (
                                <>
                                  <Upload size={16} /> Uploader un fichier
                                </>
                              )}
                            </button>
                            <p className="text-xs text-white/50 mt-2">JPG, PNG, MP4, WEBM, MOV (max 1 Go)</p>
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
                </div>
              )}
            </div>
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
          </div>
        )}
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
