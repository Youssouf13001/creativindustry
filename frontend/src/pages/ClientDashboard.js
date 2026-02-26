import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Video, Image, FileText, Download, LogOut, FolderOpen, Check, X, Camera, ZoomIn, ChevronLeft, ChevronRight, FileArchive, User, Settings, Lock, Upload, Loader, Bell, Music, File, CreditCard, Receipt, Euro, Trash2, UploadCloud, FileDown, Clock, AlertTriangle, CreditCard as CardIcon, Eye, ClipboardList, Play, Share2, QrCode, BookOpen, Mic, MessageCircle, Copy, Box, Sparkles, Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import ClientChat from "../components/ClientChat";
import { DevisPreview, InvoicePreview } from "../components/DocumentPreview";
import { PaymentSummaryCard } from "../components/DevisInvoiceCards";
import GallerySlideshowModal from "../components/GallerySlideshowModal";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Stripe Card Form Component for Guestbook
const StripeGuestbookForm = ({ amount, onSuccess, onCancel, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      { payment_method: { card: elements.getElement(CardElement) } }
    );

    if (paymentError) {
      setError(paymentError.message);
      setProcessing(false);
    } else if (paymentIntent.status === "succeeded") {
      onSuccess(paymentIntent.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white/10 p-4 rounded-lg">
        <CardElement options={{
          style: {
            base: { fontSize: "16px", color: "#fff", "::placeholder": { color: "#aab7c4" } },
            invalid: { color: "#fa755a" }
          }
        }} />
      </div>
      {error && <div className="bg-red-500/20 border border-red-500/50 p-3 rounded text-red-400 text-sm">{error}</div>}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-lg">Annuler</button>
        <button type="submit" disabled={!stripe || processing} className="flex-1 bg-[#635bff] hover:bg-[#5851db] text-white font-bold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          {processing ? <><Loader className="animate-spin" size={20} /> Paiement...</> : <>Payer {amount}€</>}
        </button>
      </div>
    </form>
  );
};

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
  
  // Slideshow state
  const [showSlideshow, setShowSlideshow] = useState(false);
  
  // Gallery premium options state
  const [galleryOptions, setGalleryOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [purchasingOption, setPurchasingOption] = useState(null);
  
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
  
  // Guestbook states
  const [myGuestbooks, setMyGuestbooks] = useState([]);
  const [selectedClientGuestbook, setSelectedClientGuestbook] = useState(null);
  const [myRenewalInvoices, setMyRenewalInvoices] = useState([]);
  
  // Account expiration states
  const [accountStatus, setAccountStatus] = useState(null);
  const [requestingExtension, setRequestingExtension] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  
  // Document preview states
  const [selectedDevisPreview, setSelectedDevisPreview] = useState(null);
  const [selectedInvoicePreview, setSelectedInvoicePreview] = useState(null);
  
  // Admin uploaded documents
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [selectedAdminDocument, setSelectedAdminDocument] = useState(null);
  
  // Project status (visible tasks from admin)
  const [projectStatus, setProjectStatus] = useState([]);
  
  // PayPal payment state
  const [payingDocument, setPayingDocument] = useState(null);
  
  // Stripe payment state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripePaymentId, setStripePaymentId] = useState(null);
  const [stripePaymentDetails, setStripePaymentDetails] = useState(null);
  
  // Guestbook purchase state
  const [showGuestbookPurchase, setShowGuestbookPurchase] = useState(false);
  const [guestbookPurchaseLoading, setGuestbookPurchaseLoading] = useState(false);
  const [newGuestbookName, setNewGuestbookName] = useState("");
  const [newGuestbookEventDate, setNewGuestbookEventDate] = useState("");
  
  // Stripe Promise for guestbook
  const [stripePromise, setStripePromise] = useState(null);
  const [showGuestbookStripeForm, setShowGuestbookStripeForm] = useState(false);
  const [guestbookStripeClientSecret, setGuestbookStripeClientSecret] = useState(null);
  const [guestbookStripePaymentId, setGuestbookStripePaymentId] = useState(null);
  
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

  // Load Stripe
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const res = await axios.get(`${API}/public/stripe-config`);
        if (res.data.publishable_key) {
          setStripePromise(loadStripe(res.data.publishable_key));
        }
      } catch (e) {
        console.error("Failed to load Stripe config");
      }
    };
    loadStripeKey();
  }, []);

  const fetchData = async () => {
    try {
      const [filesRes, galleriesRes, meRes, adminDocsRes, projectStatusRes] = await Promise.all([
        axios.get(`${API}/client/files`, { headers }),
        axios.get(`${API}/client/galleries`, { headers }),
        axios.get(`${API}/client/me`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API}/client/documents`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/client/project-progress`, { headers }).catch(() => ({ data: { steps: [], current_step: 0 } }))
      ]);
      setFiles(filesRes.data);
      setGalleries(galleriesRes.data);
      setAdminDocuments(adminDocsRes.data || []);
      // Use new project progress format
      const projectData = projectStatusRes.data;
      setProjectStatus(projectData.steps || []);
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

  // Fetch account status (expiration, etc.)
  const fetchAccountStatus = async () => {
    try {
      const res = await axios.get(`${API}/client/account-status`, { headers });
      setAccountStatus(res.data);
    } catch (e) {
      // Check if account is expired - redirect to renewal page
      if (e.response?.status === 403 && e.response?.data?.detail?.expired) {
        // Clear local storage and redirect to renewal page
        localStorage.removeItem("client_token");
        localStorage.removeItem("client_user");
        localStorage.removeItem("client_info");
        toast.error("Votre compte a expiré. Veuillez renouveler votre abonnement.");
        navigate("/renouvellement");
        return;
      }
      console.error("Error fetching account status");
    }
  };

  // Request account extension
  const requestExtension = async () => {
    setRequestingExtension(true);
    try {
      const res = await axios.post(`${API}/client/request-extension`, {}, { headers });
      setBankDetails(res.data.bank_details);
      setShowExtensionModal(true);
      toast.success("Demande d'extension enregistrée !");
      fetchAccountStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la demande");
    } finally {
      setRequestingExtension(false);
    }
  };

  // Cancel extension request
  const cancelExtension = async () => {
    try {
      await axios.delete(`${API}/client/cancel-extension`, { headers });
      toast.success("Demande d'extension annulée");
      setShowExtensionModal(false);
      fetchAccountStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
    }
  };

  // Initial fetch of account status
  useEffect(() => {
    if (token) {
      fetchAccountStatus();
    }
  }, [token]);

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
      // Load premium options
      loadGalleryOptions(gallery.id);
    } catch (e) {
      toast.error("Erreur lors du chargement de la galerie");
    }
  };

  // Load gallery premium options (3D, HD download)
  const loadGalleryOptions = async (galleryId) => {
    setLoadingOptions(true);
    try {
      const res = await axios.get(`${API}/client/gallery/${galleryId}/options`, { headers });
      setGalleryOptions(res.data);
    } catch (e) {
      console.error("Error loading gallery options:", e);
      setGalleryOptions(null);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Purchase gallery option (3D or HD)
  const purchaseGalleryOption = async (option) => {
    if (!selectedGallery) return;
    
    setPurchasingOption(option);
    try {
      const res = await axios.post(`${API}/client/gallery/purchase`, {
        gallery_id: selectedGallery.id,
        option: option
      }, { headers });
      
      if (res.data.approval_url) {
        // Redirect to PayPal
        window.location.href = res.data.approval_url;
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création du paiement");
    } finally {
      setPurchasingOption(null);
    }
  };

  // Download HD photos
  const downloadHDPhotos = async () => {
    if (!selectedGallery) return;
    
    try {
      toast.info("Préparation du téléchargement...");
      const response = await axios.get(
        `${API}/client/gallery/${selectedGallery.id}/download-hd`,
        { headers, responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedGallery.name.replace(/\s/g, '_')}_HD.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Téléchargement démarré !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors du téléchargement");
    }
  };

  // Download video slideshow
  const downloadVideoSlideshow = async () => {
    if (!selectedGallery) return;
    
    try {
      toast.info("Génération de la vidéo en cours... Cela peut prendre quelques minutes.");
      const response = await axios.get(
        `${API}/client/gallery/${selectedGallery.id}/download-video`,
        { headers, responseType: 'blob', timeout: 300000 } // 5 min timeout
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedGallery.name.replace(/\s/g, '_')}_diaporama.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Vidéo téléchargée !");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la génération de la vidéo");
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
    if (activeTab === "invoices") {
      // Also fetch renewal invoices
      fetchRenewalInvoices();
    }
    if (activeTab === "guestbooks") {
      fetchMyGuestbooks();
    }
  }, [activeTab]);

  // Fetch guestbooks for the client
  const fetchMyGuestbooks = async () => {
    try {
      const res = await axios.get(`${API}/client/guestbooks`, { headers });
      setMyGuestbooks(res.data || []);
    } catch (e) {
      console.error("Error fetching guestbooks:", e);
    }
  };

  const fetchGuestbookDetail = async (guestbookId) => {
    try {
      const res = await axios.get(`${API}/client/guestbooks/${guestbookId}`, { headers });
      setSelectedClientGuestbook(res.data);
    } catch (e) {
      toast.error("Erreur lors du chargement");
    }
  };

  const approveClientGuestbookMessage = async (messageId) => {
    try {
      await axios.put(`${API}/client/guestbook-messages/${messageId}/approve`, {}, { headers });
      toast.success("Message approuvé");
      if (selectedClientGuestbook) fetchGuestbookDetail(selectedClientGuestbook.id);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const deleteClientGuestbookMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/client/guestbook-messages/${messageId}`, { headers });
      toast.success("Message supprimé");
      if (selectedClientGuestbook) fetchGuestbookDetail(selectedClientGuestbook.id);
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const copyGuestbookLink = (guestbookId) => {
    const url = `${window.location.origin}/livre-dor/${guestbookId}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  };

  // Fetch renewal invoices for the client
  const fetchRenewalInvoices = async () => {
    try {
      const res = await axios.get(`${API}/client/my-renewal-invoices`, { headers });
      setMyRenewalInvoices(res.data || []);
    } catch (e) {
      console.error("Error fetching renewal invoices:", e);
    }
  };

  // PayPal payment for devis/invoice/document
  const handlePayPalPayment = async (docType, docRef, amount, title) => {
    setPayingDocument({ docType, docRef, amount, title });
    
    try {
      const payload = {
        amount: amount,
        description: title
      };
      
      if (docType === "devis") payload.devis_id = docRef;
      else if (docType === "invoice") payload.invoice_id = docRef;
      else if (docType === "document") payload.document_id = docRef;
      
      const res = await axios.post(`${API}/client/paypal/create-devis-payment`, payload, { headers });
      
      if (res.data.approval_url) {
        window.location.href = res.data.approval_url;
      } else {
        toast.error("Erreur: URL de paiement non reçue");
        setPayingDocument(null);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création du paiement");
      setPayingDocument(null);
    }
  };

  // Stripe payment for devis/invoice/document
  const handleStripePayment = async (docType, docRef, amount, title) => {
    setPayingDocument({ docType, docRef, amount, title });
    
    try {
      const res = await axios.post(`${API}/client/stripe/create-devis-payment`, {
        doc_type: docType,
        doc_ref: docRef,
        amount: amount,
        title: title
      }, { headers });
      
      if (res.data.client_secret) {
        setStripeClientSecret(res.data.client_secret);
        setStripePaymentId(res.data.payment_id);
        setStripePaymentDetails({ docType, docRef, amount, title });
        setShowStripeModal(true);
      } else {
        toast.error("Erreur: Configuration Stripe non reçue");
        setPayingDocument(null);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création du paiement");
      setPayingDocument(null);
    }
  };

  // Confirm Stripe payment
  const confirmStripePayment = async (paymentIntentId) => {
    try {
      const res = await axios.post(`${API}/client/stripe/confirm-devis-payment`, {
        payment_id: stripePaymentId,
        payment_intent_id: paymentIntentId
      }, { headers });
      
      if (res.data.success) {
        toast.success(res.data.message || "Paiement confirmé !");
        setShowStripeModal(false);
        setStripeClientSecret(null);
        setStripePaymentId(null);
        setPayingDocument(null);
        fetchDevisData();
      } else {
        toast.error(res.data.message || "Erreur lors de la confirmation");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la confirmation");
    }
  };

  // Purchase Guestbook with Stripe
  const purchaseGuestbookStripe = async () => {
    if (!newGuestbookName.trim()) {
      toast.error("Veuillez entrer un nom pour votre livre d'or");
      return;
    }
    
    if (!stripePromise) {
      toast.error("Stripe n'est pas encore chargé. Réessayez dans quelques secondes.");
      return;
    }
    
    setGuestbookPurchaseLoading(true);
    
    try {
      const res = await axios.post(`${API}/client/guestbook/purchase-stripe`, {
        name: newGuestbookName,
        event_date: newGuestbookEventDate || null
      }, { headers });
      
      if (res.data.client_secret) {
        setGuestbookStripeClientSecret(res.data.client_secret);
        setGuestbookStripePaymentId(res.data.payment_id);
        setShowGuestbookPurchase(false);
        setShowGuestbookStripeForm(true);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création du paiement");
    } finally {
      setGuestbookPurchaseLoading(false);
    }
  };

  // Confirm Guestbook Stripe payment
  const confirmGuestbookStripe = async (paymentIntentId) => {
    try {
      const res = await axios.post(`${API}/client/guestbook/confirm-stripe-payment`, {
        payment_id: guestbookStripePaymentId,
        payment_intent_id: paymentIntentId,
        name: newGuestbookName,
        event_date: newGuestbookEventDate
      }, { headers });
      
      if (res.data.success) {
        toast.success("Livre d'or créé avec succès ! 🎉");
        setShowGuestbookStripeForm(false);
        setGuestbookStripeClientSecret(null);
        setGuestbookStripePaymentId(null);
        setNewGuestbookName("");
        setNewGuestbookEventDate("");
        fetchGuestbooks();
      } else {
        toast.error(res.data.message || "Erreur lors de la confirmation");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la confirmation");
    }
  };

  // Purchase Guestbook with PayPal
  const purchaseGuestbookPayPal = async () => {
    if (!newGuestbookName.trim()) {
      toast.error("Veuillez entrer un nom pour votre livre d'or");
      return;
    }
    
    setGuestbookPurchaseLoading(true);
    
    try {
      const res = await axios.post(`${API}/client/guestbook/purchase-paypal`, {
        name: newGuestbookName,
        event_date: newGuestbookEventDate || null
      }, { headers });
      
      if (res.data.approval_url) {
        // Store guestbook info in localStorage for after payment
        localStorage.setItem("pending_guestbook", JSON.stringify({
          name: newGuestbookName,
          event_date: newGuestbookEventDate
        }));
        window.location.href = res.data.approval_url;
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la création du paiement");
    } finally {
      setGuestbookPurchaseLoading(false);
    }
  };

  // Confirm Stripe guestbook payment
  // Handle PayPal return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get("paymentId");
    const payerId = urlParams.get("PayerID");
    const paymentSuccess = urlParams.get("payment_success");
    const paymentCancelled = urlParams.get("payment_cancelled");
    
    if (paymentId && payerId && paymentSuccess) {
      // Execute the payment
      const executePayment = async () => {
        try {
          const res = await axios.post(
            `${API}/client/paypal/execute-devis-payment?payment_id=${paymentId}&payer_id=${payerId}`,
            {},
            { headers }
          );
          toast.success(res.data.message || "Paiement confirmé !");
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Refresh data
          fetchDevisData();
        } catch (e) {
          toast.error(e.response?.data?.detail || "Erreur lors de la confirmation du paiement");
        }
      };
      executePayment();
    } else if (paymentCancelled) {
      toast.info("Paiement annulé");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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
                { id: "project", label: "Mon Projet", icon: ClipboardList },
                { id: "galleries", label: "Galeries", icon: FolderOpen },
                { id: "files", label: "Fichiers", icon: FileText },
                { id: "transfers", label: "Transferts", icon: UploadCloud },
                { id: "devis", label: "Devis", icon: Receipt },
                { id: "invoices", label: "Factures", icon: File },
                { id: "payments", label: "Paiements", icon: Euro },
                { id: "guestbooks", label: "Livre d'or", icon: BookOpen },
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

      {/* Account Expiration Banner */}
      {accountStatus && (
        <div className={`border-b ${
          accountStatus.is_expired 
            ? "bg-red-500/20 border-red-500/50" 
            : accountStatus.days_remaining <= 30 
              ? "bg-yellow-500/20 border-yellow-500/50" 
              : "bg-blue-500/10 border-blue-500/30"
        }`}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {accountStatus.is_expired ? (
                  <AlertTriangle className="text-red-400" size={24} />
                ) : (
                  <Clock className={accountStatus.days_remaining <= 30 ? "text-yellow-400" : "text-blue-400"} size={24} />
                )}
                <div>
                  {accountStatus.is_expired ? (
                    <>
                      <p className="font-bold text-red-400">Votre compte a expiré</p>
                      <p className="text-sm text-red-300">Vos fichiers seront archivés prochainement. Prolongez votre accès pour continuer.</p>
                    </>
                  ) : (
                    <>
                      <p className={`font-bold ${accountStatus.days_remaining <= 30 ? "text-yellow-400" : "text-blue-400"}`}>
                        {accountStatus.days_remaining <= 30 
                          ? `⚠️ Votre compte expire dans ${accountStatus.days_remaining} jours` 
                          : `Votre compte est actif - ${accountStatus.days_remaining} jours restants`
                        }
                      </p>
                      <p className="text-sm text-white/60">
                        Date limite : {accountStatus.expires_at ? new Date(accountStatus.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {accountStatus.pending_order ? (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">Paiement en attente de validation</span>
                    <button
                      onClick={() => setShowExtensionModal(true)}
                      className="btn-outline px-4 py-2 text-sm"
                    >
                      Voir détails
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowExtensionModal(true)}
                    disabled={requestingExtension}
                    className="btn-primary px-6 py-2 text-sm flex items-center gap-2"
                    data-testid="request-extension-btn"
                  >
                    {requestingExtension ? (
                      <Loader size={16} className="animate-spin" />
                    ) : (
                      <CardIcon size={16} />
                    )}
                    Prolonger de 2 mois (24€)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Status Tab */}
        {activeTab === "project" && (
          <div className="space-y-6" data-testid="client-project-status">
            <h2 className="font-primary font-bold text-xl flex items-center gap-2">
              <ClipboardList size={20} className="text-primary" /> Suivi de votre projet
            </h2>
            
            {projectStatus.length === 0 ? (
              <div className="bg-card border border-white/10 p-8 text-center">
                <ClipboardList size={48} className="mx-auto mb-4 text-white/20" />
                <p className="text-white/60">Aucune mise à jour de projet pour le moment.</p>
                <p className="text-white/40 text-sm mt-2">Les étapes de votre projet apparaîtront ici.</p>
              </div>
            ) : (
              <>
                {/* Progress Bar with Steps */}
                <div className="bg-card border border-white/10 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-semibold">Progression de votre projet</span>
                    <span className="text-primary font-bold text-2xl">
                      {Math.min(100, Math.round((projectStatus.filter(s => s.status === "completed").length / Math.max(1, projectStatus.length)) * 100))}%
                    </span>
                  </div>
                  
                  {/* Visual Steps Bar */}
                  <div className="relative mb-6">
                    {/* Background bar */}
                    <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary via-yellow-500 to-green-500 h-4 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, (projectStatus.filter(s => s.status === "completed").length / Math.max(1, projectStatus.length)) * 100)}%` }}
                      />
                    </div>
                    
                    {/* Step markers on the bar */}
                    <div className="absolute top-0 left-0 right-0 h-4 flex items-center justify-between px-1">
                      {projectStatus.map((step, idx) => (
                        <div 
                          key={step.id || step.step || idx}
                          className={`w-3 h-3 rounded-full border-2 ${
                            step.status === "completed" 
                              ? "bg-green-500 border-green-400" 
                              : step.status === "in_progress"
                              ? "bg-primary border-primary animate-pulse"
                              : "bg-white/20 border-white/30"
                          }`}
                          title={step.label || step.client_status_label || `Étape ${step.step || step.step_number || idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center border-t border-white/10 pt-4">
                    <div>
                      <div className="text-2xl font-bold text-green-400">{projectStatus.filter(s => s.status === "completed").length}</div>
                      <div className="text-xs text-white/40">Terminées</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-primary">{projectStatus.filter(s => s.status === "in_progress").length}</div>
                      <div className="text-xs text-white/40">En cours</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white/60">{projectStatus.filter(s => s.status === "pending").length}</div>
                      <div className="text-xs text-white/40">À venir</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Timeline */}
                <div className="bg-card border border-white/10 p-6">
                  <h3 className="font-semibold mb-4 text-white/80">Détail des étapes</h3>
                  <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/10" />
                    
                    <div className="space-y-0">
                      {projectStatus.map((item, index) => (
                        <div 
                          key={item.id || item.step || index} 
                          className="relative pl-14 pb-8 last:pb-0"
                          data-testid={`project-status-item-${item.step || index}`}
                        >
                          {/* Circle indicator */}
                          <div className={`absolute left-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                            item.status === "completed" 
                              ? "bg-green-500/20 border-green-500 text-green-400" 
                              : item.status === "in_progress"
                              ? "bg-primary/20 border-primary text-primary animate-pulse"
                              : "bg-white/5 border-white/20 text-white/40"
                          }`}>
                            {item.status === "completed" ? (
                              <Check size={18} />
                            ) : (
                              <span className="font-bold text-sm">{item.step || item.step_number || index + 1}</span>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className={`${item.status === "completed" ? "opacity-80" : ""}`}>
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <h3 className={`font-semibold ${
                                item.status === "completed" 
                                  ? "text-green-400" 
                                  : item.status === "in_progress"
                                  ? "text-primary"
                                  : "text-white"
                              }`}>
                                {item.label || item.client_status_label || item.title}
                              </h3>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                item.status === "completed" 
                                  ? "bg-green-500/20 text-green-400" 
                                  : item.status === "in_progress"
                                  ? "bg-primary/20 text-primary"
                                  : "bg-white/10 text-white/40"
                              }`}>
                                {item.status === "completed" ? "Terminé ✓" : item.status === "in_progress" ? "En cours..." : "À venir"}
                              </span>
                            </div>
                            
                            {item.description && (
                              <p className="text-white/60 text-sm">{item.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Info box */}
            <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
              <p className="text-primary text-sm">
                <Bell size={16} className="inline mr-2" />
                Vous recevrez une notification par email à chaque mise à jour importante de votre projet.
              </p>
            </div>
          </div>
        )}

        {/* Guestbooks Tab */}
        {activeTab === "guestbooks" && (
          <div>
            {!selectedClientGuestbook ? (
              <div>
                <h2 className="font-primary font-bold text-xl mb-6 flex items-center gap-2">
                  <BookOpen size={20} className="text-primary" /> Mes Livres d'or
                </h2>
                
                {myGuestbooks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myGuestbooks.map((gb) => (
                      <div 
                        key={gb.id} 
                        className="bg-card border border-white/10 p-4 hover:border-primary transition-colors cursor-pointer"
                        onClick={() => fetchGuestbookDetail(gb.id)}
                        data-testid={`guestbook-card-${gb.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-primary font-bold">{gb.name}</h3>
                            {gb.event_date && <p className="text-white/60 text-sm">{gb.event_date}</p>}
                          </div>
                          <BookOpen className="text-primary" size={20} />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-400">{gb.approved_count || 0} approuvés</span>
                          {gb.pending_count > 0 && (
                            <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs">
                              {gb.pending_count} en attente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Button to buy another guestbook */}
                    <div 
                      className="bg-card border border-dashed border-white/20 p-4 hover:border-primary transition-colors cursor-pointer flex flex-col items-center justify-center text-center min-h-[120px]"
                      onClick={() => setShowGuestbookPurchase(true)}
                    >
                      <Plus className="text-primary mb-2" size={24} />
                      <p className="text-white/60">Créer un autre livre d'or</p>
                    </div>
                  </div>
                ) : (
                  /* Guestbook Purchase Offer */
                  <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/30 rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-primary/20 p-6 text-center">
                      <div className="text-5xl mb-3">📖</div>
                      <h3 className="text-2xl font-bold mb-2">Livre d'Or Numérique</h3>
                      <p className="text-white/70">Gardez les messages de vos invités pour toujours</p>
                    </div>
                    
                    {/* Benefits */}
                    <div className="p-6">
                      <h4 className="font-bold mb-4 text-center">✨ Les avantages</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-green-500/20 p-2 rounded">
                            <MessageCircle className="text-green-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">Messages texte</p>
                            <p className="text-white/50 text-sm">Vos invités peuvent écrire leurs vœux</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-blue-500/20 p-2 rounded">
                            <Video className="text-blue-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">Messages vidéo</p>
                            <p className="text-white/50 text-sm">Jusqu'à 60 secondes de vidéo</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-purple-500/20 p-2 rounded">
                            <Mic className="text-purple-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">Messages audio</p>
                            <p className="text-white/50 text-sm">Enregistrements vocaux</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-yellow-500/20 p-2 rounded">
                            <QrCode className="text-yellow-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">QR Code unique</p>
                            <p className="text-white/50 text-sm">Partagez facilement avec vos invités</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-pink-500/20 p-2 rounded">
                            <Shield className="text-pink-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">Modération</p>
                            <p className="text-white/50 text-sm">Approuvez les messages avant affichage</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 bg-white/5 p-3 rounded">
                          <div className="bg-cyan-500/20 p-2 rounded">
                            <Download className="text-cyan-400" size={18} />
                          </div>
                          <div>
                            <p className="font-medium">Conservation illimitée</p>
                            <p className="text-white/50 text-sm">Gardez vos souvenirs pour toujours</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price */}
                      <div className="text-center mb-6">
                        <p className="text-white/60 text-sm mb-1">Prix unique</p>
                        <p className="text-4xl font-bold text-primary">200€</p>
                        <p className="text-white/40 text-xs">TVA incluse</p>
                      </div>
                      
                      {/* CTA Button */}
                      <button
                        onClick={() => setShowGuestbookPurchase(true)}
                        className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-4 rounded-lg flex items-center justify-center gap-3 text-lg transition-colors"
                        data-testid="buy-guestbook-btn"
                      >
                        <BookOpen size={24} /> Créer mon Livre d'Or
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Purchase Modal */}
                {showGuestbookPurchase && (
                  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-white/10 rounded-lg max-w-md w-full p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <BookOpen className="text-primary" size={24} /> Créer mon Livre d'Or
                      </h3>
                      
                      <div className="space-y-4 mb-6">
                        <div>
                          <label className="block text-sm text-white/60 mb-1">Nom de l'événement *</label>
                          <input
                            type="text"
                            value={newGuestbookName}
                            onChange={(e) => setNewGuestbookName(e.target.value)}
                            placeholder="Ex: Mariage Sophie & Pierre"
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 focus:border-primary focus:outline-none"
                            data-testid="guestbook-name-input"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-white/60 mb-1">Date de l'événement (optionnel)</label>
                          <input
                            type="date"
                            value={newGuestbookEventDate}
                            onChange={(e) => setNewGuestbookEventDate(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded px-4 py-3 focus:border-primary focus:outline-none"
                            data-testid="guestbook-date-input"
                          />
                        </div>
                      </div>
                      
                      <div className="bg-white/5 rounded p-4 mb-6 text-center">
                        <p className="text-white/60 text-sm">Total à payer</p>
                        <p className="text-3xl font-bold text-primary">200€</p>
                      </div>
                      
                      <div className="space-y-3">
                        {/* Stripe Button */}
                        <button
                          onClick={purchaseGuestbookStripe}
                          disabled={guestbookPurchaseLoading || !newGuestbookName.trim()}
                          className="w-full bg-[#635bff] hover:bg-[#5851db] disabled:bg-gray-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                          data-testid="guestbook-stripe-btn"
                        >
                          {guestbookPurchaseLoading ? (
                            <Loader className="animate-spin" size={20} />
                          ) : (
                            <CreditCard size={20} />
                          )}
                          Payer par Carte Bancaire
                        </button>
                        
                        {/* PayPal Button */}
                        <button
                          onClick={purchaseGuestbookPayPal}
                          disabled={guestbookPurchaseLoading || !newGuestbookName.trim()}
                          className="w-full bg-[#0070ba] hover:bg-[#005ea6] disabled:bg-gray-600 text-white font-bold py-3 rounded flex items-center justify-center gap-2"
                          data-testid="guestbook-paypal-btn"
                        >
                          Payer avec PayPal
                        </button>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowGuestbookPurchase(false);
                          setNewGuestbookName("");
                          setNewGuestbookEventDate("");
                        }}
                        className="w-full mt-4 text-white/60 hover:text-white py-2"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Guestbook Detail View */}
                <div className="flex items-center gap-4 mb-6">
                  <button 
                    onClick={() => setSelectedClientGuestbook(null)}
                    className="text-white/60 hover:text-white"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex-1">
                    <h2 className="font-primary font-bold text-xl">{selectedClientGuestbook.name}</h2>
                    {selectedClientGuestbook.event_date && (
                      <p className="text-white/60 text-sm">{selectedClientGuestbook.event_date}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => copyGuestbookLink(selectedClientGuestbook.id)}
                    className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                  >
                    <Copy size={16} /> Partager
                  </button>
                </div>

                {/* QR Code */}
                <div className="bg-card border border-white/10 p-4 mb-6 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2 rounded">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`${window.location.origin}/livre-dor/${selectedClientGuestbook.id}`)}`}
                      alt="QR Code"
                      className="w-20 h-20"
                    />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="font-medium mb-1">QR Code de partage</p>
                    <p className="text-white/60 text-sm">Partagez ce QR code avec vos invités pour qu'ils puissent laisser des messages</p>
                  </div>
                </div>

                {/* Messages */}
                <h3 className="font-bold mb-4">Messages ({selectedClientGuestbook.messages?.length || 0})</h3>
                
                {selectedClientGuestbook.messages?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedClientGuestbook.messages.map((msg) => (
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
                                onClick={() => approveClientGuestbookMessage(msg.id)}
                                className="bg-green-500/20 text-green-500 px-3 py-1 text-sm hover:bg-green-500/30 flex items-center gap-1"
                              >
                                <Check size={14} /> Approuver
                              </button>
                            )}
                            <button
                              onClick={() => deleteClientGuestbookMessage(msg.id)}
                              className="bg-red-500/20 text-red-500 p-1 hover:bg-red-500/30"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        {msg.message_type === "text" && (
                          <p className="text-white/80">{msg.text_content}</p>
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
                  <div className="text-center py-12 bg-card border border-white/10">
                    <MessageCircle size={48} className="mx-auto mb-4 text-white/30" />
                    <p className="text-white/60">Aucun message pour le moment</p>
                    <p className="text-white/40 text-sm mt-2">Partagez le QR code avec vos invités</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
                  <Upload size={16} /> Ajouter des photos
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.heic"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileTransfer("photos", e.target.files)}
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
                  <Upload size={16} /> Ajouter des vidéos
                  <input
                    type="file"
                    accept=".mp4,.mov,.avi,.mkv,.webm"
                    className="hidden"
                    multiple
                    onChange={(e) => handleFileTransfer("videos", e.target.files)}
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
              <div className="space-y-3">
                {myDevis.map((devis) => (
                  <div key={devis.devis_id} className="bg-card border border-white/10 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg">Devis N° {devis.devis_data?.quote_number || devis.devis_id?.slice(-8)}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          devis.status === "accepted" ? "bg-green-500/20 text-green-400" :
                          devis.status === "rejected" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {devis.status === "accepted" ? "Accepté" : devis.status === "rejected" ? "Refusé" : "En attente"}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm">{devis.event_type} • {devis.event_date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(devis.total_amount || 0)}</p>
                      <button
                        onClick={() => setSelectedDevisPreview(devis)}
                        className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <Eye size={16} /> Voir
                      </button>
                      <button
                        onClick={() => {
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
                        className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                      >
                        <Download size={16} /> PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Modal Devis Preview */}
            {selectedDevisPreview && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto p-4">
                <div className="bg-background border border-white/10 rounded-lg max-w-4xl w-full my-8 relative">
                  <button
                    onClick={() => setSelectedDevisPreview(null)}
                    className="absolute top-4 right-4 text-white/60 hover:text-white z-10 bg-black/50 rounded-full p-2"
                  >
                    <X size={24} />
                  </button>
                  <div className="max-h-[80vh] overflow-y-auto">
                    <DevisPreview
                      devis={selectedDevisPreview}
                      onDownload={(d) => {
                        fetch(`${API}/client/devis/${d.devis_id}/pdf`, { headers })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Devis_${d.devis_id?.slice(-8)}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          })
                          .catch(() => toast.error("Erreur lors du téléchargement"));
                      }}
                    />
                  </div>
                </div>
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
              <div className="space-y-3">
                {myInvoices.map((invoice) => {
                  const totalPaid = (myPayments.payments || [])
                    .filter(p => p.invoice_id === invoice.invoice_id || p.devis_id === invoice.devis_id)
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                  const remaining = (invoice.amount || 0) - totalPaid;
                  
                  return (
                    <div key={invoice.invoice_id} className="bg-card border border-white/10 p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-lg">Facture N° {invoice.invoice_number || invoice.invoice_id?.slice(-8)}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${
                              remaining <= 0 ? "bg-green-500/20 text-green-400" :
                              totalPaid > 0 ? "bg-yellow-500/20 text-yellow-400" :
                              "bg-red-500/20 text-red-400"
                            }`}>
                              {remaining <= 0 ? "Soldée" : totalPaid > 0 ? "Partiel" : "En attente"}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm">
                            Émise le {new Date(invoice.invoice_date).toLocaleDateString('fr-FR')}
                            {invoice.event_type && ` • ${invoice.event_type}`}
                          </p>
                          {totalPaid > 0 && remaining > 0 && (
                            <p className="text-sm text-yellow-400 mt-1">
                              Payé: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(totalPaid)} • Reste: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(remaining)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.amount || 0)}</p>
                          <button
                            onClick={() => setSelectedInvoicePreview(invoice)}
                            className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                          >
                            <Eye size={16} /> Voir
                          </button>
                          <button
                            onClick={() => {
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
                          >
                            <Download size={16} /> PDF
                          </button>
                        </div>
                      </div>
                      
                      {/* Payment Section */}
                      {remaining > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="text-sm">
                              <span className="text-white font-semibold">Reste à payer :</span>{" "}
                              <span className="text-primary font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(remaining)}</span>
                              <span className="text-white/40 text-xs ml-2">(TVA 20% incluse)</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Stripe CB Button */}
                              <button
                                onClick={() => handleStripePayment(
                                  "invoice", 
                                  invoice.invoice_id, 
                                  remaining,
                                  `Facture N° ${invoice.invoice_number || invoice.invoice_id?.slice(-8)}`
                                )}
                                disabled={payingDocument?.docRef === invoice.invoice_id}
                                className="bg-[#635bff] hover:bg-[#5851db] disabled:bg-gray-600 text-white px-4 py-2 text-sm rounded flex items-center gap-2 transition-colors"
                              >
                                {payingDocument?.docRef === invoice.invoice_id ? (
                                  <>
                                    <Loader size={16} className="animate-spin" /> Chargement...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard size={16} /> CB
                                  </>
                                )}
                              </button>
                              {/* PayPal Button */}
                              <button
                                onClick={() => handlePayPalPayment(
                                  "invoice", 
                                  invoice.invoice_id, 
                                  remaining,
                                  `Facture N° ${invoice.invoice_number || invoice.invoice_id?.slice(-8)}`
                                )}
                                disabled={payingDocument?.docRef === invoice.invoice_id}
                                className="bg-[#0070ba] hover:bg-[#005ea6] disabled:bg-gray-600 text-white px-4 py-2 text-sm rounded flex items-center gap-2 transition-colors"
                              >
                                PayPal
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-green-400/80 mt-2">
                            ✓ Paiement sécurisé - Enregistrement automatique
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Admin Uploaded Documents */}
            {adminDocuments.length > 0 && (
              <div className="mt-8">
                <h3 className="font-primary font-bold text-lg mb-4">📎 Documents supplémentaires</h3>
                <div className="space-y-3">
                  {adminDocuments.map((doc) => {
                    const remaining = doc.amount - (doc.paid_amount || 0);
                    return (
                      <div key={doc.id} className="bg-card border border-white/10 p-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-bold text-lg">{doc.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${
                                doc.document_type === 'invoice' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                              }`}>
                                {doc.document_type === 'invoice' ? 'FACTURE' : 'DEVIS'}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                doc.status === 'paid' ? "bg-green-500/20 text-green-400" :
                                doc.status === 'partial' ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                {doc.status === 'paid' ? "Soldé" : doc.status === 'partial' ? "Partiel" : "En attente"}
                              </span>
                            </div>
                            {doc.description && <p className="text-white/60 text-sm">{doc.description}</p>}
                            <p className="text-white/60 text-sm">
                              Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                              {doc.due_date && ` • Échéance: ${new Date(doc.due_date).toLocaleDateString('fr-FR')}`}
                            </p>
                            {doc.paid_amount > 0 && remaining > 0 && (
                              <p className="text-sm text-yellow-400 mt-1">
                                Payé: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc.paid_amount)} • Reste: {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(remaining)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <p className="text-2xl font-bold text-primary">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(doc.amount)}</p>
                            <button
                              onClick={() => setSelectedAdminDocument(doc)}
                              className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
                            >
                              <Eye size={16} /> Voir
                            </button>
                            <button
                              onClick={() => {
                                fetch(`${API}/client/documents/${doc.id}/download`, { headers })
                                  .then(res => res.blob())
                                  .then(blob => {
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = doc.filename || `${doc.document_type}_${doc.id}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                    a.remove();
                                  })
                                  .catch(() => toast.error("Erreur lors du téléchargement"));
                              }}
                              className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                            >
                              <Download size={16} /> PDF
                            </button>
                          </div>
                        </div>
                        
                        {/* Payment Section */}
                        {remaining > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="text-sm">
                                <span className="text-white font-semibold">Reste à payer :</span>{" "}
                                <span className="text-primary font-bold">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(remaining)}</span>
                                <span className="text-white/40 text-xs ml-2">(TVA 20% incluse)</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Stripe CB Button */}
                                <button
                                  onClick={() => handleStripePayment(
                                    "document", 
                                    doc.id, 
                                    remaining,
                                    doc.title
                                  )}
                                  disabled={payingDocument?.docRef === doc.id}
                                  className="bg-[#635bff] hover:bg-[#5851db] disabled:bg-gray-600 text-white px-4 py-2 text-sm rounded flex items-center gap-2 transition-colors"
                                >
                                  {payingDocument?.docRef === doc.id ? (
                                    <>
                                      <Loader size={16} className="animate-spin" /> Chargement...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard size={16} /> CB
                                    </>
                                  )}
                                </button>
                                {/* PayPal Button */}
                                <button
                                  onClick={() => handlePayPalPayment(
                                    "document", 
                                    doc.id, 
                                    remaining,
                                    doc.title
                                  )}
                                  disabled={payingDocument?.docRef === doc.id}
                                  className="bg-[#0070ba] hover:bg-[#005ea6] disabled:bg-gray-600 text-white px-4 py-2 text-sm rounded flex items-center gap-2 transition-colors"
                                >
                                  PayPal
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-green-400/80 mt-2">
                              ✓ Paiement sécurisé - Enregistrement automatique
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Modal Admin Document Preview */}
            {selectedAdminDocument && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                <div className="bg-background border border-white/10 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
                  <div className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-xl">{selectedAdminDocument.title}</h3>
                        <p className="text-sm text-white/60">
                          {selectedAdminDocument.document_type === 'invoice' ? 'Facture' : 'Devis'} • {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selectedAdminDocument.amount)}
                        </p>
                      </div>
                      <button onClick={() => setSelectedAdminDocument(null)} className="text-white/60 hover:text-white text-2xl">×</button>
                    </div>
                    <div className="flex-1 bg-white/5 border border-white/10 flex items-center justify-center min-h-[300px]">
                      <div className="text-center p-8">
                        <FileText size={64} className="mx-auto text-primary mb-4" />
                        <p className="text-white/60 mb-4">Aperçu PDF non disponible</p>
                        <p className="text-sm text-white/40">Cliquez sur "Télécharger" pour voir le document</p>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                      <button onClick={() => setSelectedAdminDocument(null)} className="btn-outline px-4 py-2">
                        Fermer
                      </button>
                      <button
                        onClick={() => {
                          fetch(`${API}/client/documents/${selectedAdminDocument.id}/download`, { headers })
                            .then(res => res.blob())
                            .then(blob => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = selectedAdminDocument.filename || `${selectedAdminDocument.document_type}_${selectedAdminDocument.id}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              a.remove();
                            })
                            .catch(() => toast.error("Erreur lors du téléchargement"));
                        }}
                        className="btn-primary px-4 py-2 flex items-center gap-2"
                      >
                        <Download size={16} /> Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Modal Invoice Preview */}
            {selectedInvoicePreview && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-start justify-center overflow-y-auto p-4">
                <div className="bg-background border border-white/10 rounded-lg max-w-4xl w-full my-8 relative">
                  <button
                    onClick={() => setSelectedInvoicePreview(null)}
                    className="absolute top-4 right-4 text-white/60 hover:text-white z-10 bg-black/50 rounded-full p-2"
                  >
                    <X size={24} />
                  </button>
                  <div className="max-h-[80vh] overflow-y-auto">
                    <InvoicePreview
                      invoice={selectedInvoicePreview}
                      payments={myPayments.payments || []}
                      onDownload={(inv) => {
                        fetch(`${API}/client/invoice/${inv.invoice_id}/pdf`, { headers })
                          .then(res => res.blob())
                          .then(blob => {
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Facture_${inv.invoice_number || inv.invoice_id?.slice(-8)}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          })
                          .catch(() => toast.error("Erreur lors du téléchargement"));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Renewal Invoices Section */}
            {myRenewalInvoices.length > 0 && (
              <div className="mt-8">
                <h3 className="font-primary font-bold text-lg mb-4">🔄 Factures de Renouvellement</h3>
                <div className="space-y-3">
                  {myRenewalInvoices.map((invoice) => (
                    <div key={invoice.id} className="bg-card border border-green-500/20 p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-lg">{invoice.invoice_number}</h4>
                            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
                              Payée
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              invoice.plan === "weekly" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                            }`}>
                              {invoice.plan_label}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm">
                            {new Date(invoice.created_at).toLocaleDateString('fr-FR', { 
                              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                            {" • "}Prolongation de {invoice.days} jours
                          </p>
                          <p className="text-sm text-green-400 mt-1">
                            Accès prolongé jusqu'au {new Date(invoice.new_expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-white/50 mb-1">
                            HT: {invoice.amount_ht?.toFixed(2)}€ + TVA: {invoice.tva?.toFixed(2)}€
                          </div>
                          <p className="text-2xl font-bold text-green-400">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(invoice.amount_ttc)}
                          </p>
                          <p className="text-xs text-white/40">via {invoice.payment_method}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && (
          <div className="space-y-6">
            <h2 className="font-primary font-bold text-xl mb-4">💰 Mes Paiements</h2>
            
            {/* Payment Summary Card */}
            <PaymentSummaryCard
              totalAmount={myPayments.total_amount}
              totalPaid={myPayments.total_paid}
              remaining={myPayments.remaining}
              bankDetails={bankDetails}
            />

            {/* Payment History */}
            <div className="bg-card border border-white/10 overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-green-500/20 to-transparent border-b border-white/10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <div className="w-1 h-4 bg-green-500 rounded"></div>
                  Historique des règlements
                </h3>
              </div>
              <div className="p-4">
                {myPayments.payments.length === 0 ? (
                  <p className="text-white/40 text-center py-4">Aucun paiement enregistré</p>
                ) : (
                  <div className="space-y-3">
                    {myPayments.payments.map((payment) => (
                      <div key={payment.payment_id} className="flex justify-between items-center py-3 px-4 bg-green-500/10 rounded">
                        <div>
                          <p className="font-semibold text-white">{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(payment.amount)}</p>
                          <p className="text-white/40 text-sm">{new Date(payment.payment_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          {payment.payment_method && <p className="text-white/60 text-sm">{payment.payment_method}</p>}
                          <span className="text-green-400 text-xs flex items-center gap-1"><Check size={12} /> Payé</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                  <div className="flex flex-wrap gap-2">
                    {/* Slideshow Button */}
                    {(selectedGallery.photos || []).length > 0 && (
                      <button
                        onClick={() => setShowSlideshow(true)}
                        className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary px-4 py-2 rounded transition-colors"
                        data-testid="slideshow-button"
                      >
                        <Play size={18} /> Diaporama
                      </button>
                    )}
                    {!isValidated && (
                      <>
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
                      </>
                    )}
                  </div>
                  {isValidated && (
                    <span className="bg-green-500/20 text-green-400 px-4 py-2 text-sm flex items-center gap-2">
                      <Check size={16} /> Sélection validée
                    </span>
                  )}
                </div>

                {/* Premium Options Section */}
                {galleryOptions && (
                  <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-6 mb-6">
                    <h3 className="font-primary font-bold text-lg mb-4 flex items-center gap-2">
                      <Sparkles className="text-purple-400" size={20} />
                      Options Premium
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 3D Gallery Option */}
                      <div className={`bg-black/30 rounded-lg p-4 border ${galleryOptions.options.gallery_3d.unlocked ? 'border-green-500/50' : 'border-white/10'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Box className="text-purple-400" size={24} />
                          <div>
                            <h4 className="font-semibold">Galerie 3D</h4>
                            <p className="text-white/60 text-sm">Expérience immersive</p>
                          </div>
                        </div>
                        {galleryOptions.options.gallery_3d.unlocked ? (
                          <a
                            href={`/galerie3d/${selectedGallery.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-green-500/20 text-green-400 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors"
                          >
                            <Check size={16} /> Accéder à la 3D
                          </a>
                        ) : (
                          <button
                            onClick={() => purchaseGalleryOption('gallery_3d')}
                            disabled={purchasingOption === 'gallery_3d'}
                            className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {purchasingOption === 'gallery_3d' ? (
                              <Loader className="animate-spin" size={16} />
                            ) : (
                              <>
                                <Lock size={16} /> Débloquer {galleryOptions.options.gallery_3d.price}€
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* HD Download Option */}
                      <div className={`bg-black/30 rounded-lg p-4 border ${galleryOptions.options.hd_download?.unlocked ? 'border-green-500/50' : 'border-white/10'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Download className="text-indigo-400" size={24} />
                          <div>
                            <h4 className="font-semibold">Téléchargement HD</h4>
                            <p className="text-white/60 text-sm">Toutes les photos</p>
                          </div>
                        </div>
                        {galleryOptions.options.hd_download?.unlocked ? (
                          <button
                            onClick={downloadHDPhotos}
                            className="w-full bg-green-500/20 text-green-400 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors"
                          >
                            <Download size={16} /> Télécharger ZIP
                          </button>
                        ) : (
                          <button
                            onClick={() => purchaseGalleryOption('hd_download')}
                            disabled={purchasingOption === 'hd_download'}
                            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {purchasingOption === 'hd_download' ? (
                              <Loader className="animate-spin" size={16} />
                            ) : (
                              <>
                                <Lock size={16} /> Débloquer {galleryOptions.options.hd_download?.price}€
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Video Slideshow Option */}
                      {galleryOptions.options.video_slideshow && (
                        <div className={`bg-black/30 rounded-lg p-4 border ${galleryOptions.options.video_slideshow?.unlocked ? 'border-green-500/50' : 'border-white/10'}`}>
                          <div className="flex items-center gap-3 mb-3">
                            <Play className="text-pink-400" size={24} />
                            <div>
                              <h4 className="font-semibold">Vidéo Diaporama</h4>
                              <p className="text-white/60 text-sm">MP4 avec musique</p>
                            </div>
                          </div>
                          {galleryOptions.options.video_slideshow?.unlocked ? (
                            <button
                              onClick={downloadVideoSlideshow}
                              className="w-full bg-green-500/20 text-green-400 py-2 rounded flex items-center justify-center gap-2 hover:bg-green-500/30 transition-colors"
                            >
                              <Download size={16} /> Télécharger MP4
                            </button>
                          ) : (
                            <button
                              onClick={() => purchaseGalleryOption('video_slideshow')}
                              disabled={purchasingOption === 'video_slideshow'}
                              className="w-full bg-pink-500 hover:bg-pink-600 text-white py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                              {purchasingOption === 'video_slideshow' ? (
                                <Loader className="animate-spin" size={16} />
                              ) : (
                                <>
                                  <Lock size={16} /> Débloquer {galleryOptions.options.video_slideshow?.price}€
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Pack Complete Option */}
                      <div className={`bg-black/30 rounded-lg p-4 border-2 ${galleryOptions.options.pack_complete?.unlocked ? 'border-green-500/50' : 'border-primary/50'}`}>
                        <div className="flex items-center gap-3 mb-3">
                          <Sparkles className="text-primary" size={24} />
                          <div>
                            <h4 className="font-semibold text-primary">Pack Complet</h4>
                            <p className="text-white/60 text-sm">3D + Vidéo + HD</p>
                          </div>
                        </div>
                        {galleryOptions.options.pack_complete?.unlocked ? (
                          <div className="w-full bg-green-500/20 text-green-400 py-2 rounded flex items-center justify-center gap-2">
                            <Check size={16} /> Tout débloqué !
                          </div>
                        ) : (
                          <button
                            onClick={() => purchaseGalleryOption('pack_complete')}
                            disabled={purchasingOption === 'pack_complete'}
                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                          >
                            {purchasingOption === 'pack_complete' ? (
                              <Loader className="animate-spin" size={16} />
                            ) : (
                              <>
                                <Lock size={16} /> Débloquer {galleryOptions.options.pack_complete?.price}€
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {loadingOptions && (
                  <div className="bg-black/30 rounded-lg p-6 mb-6 flex items-center justify-center">
                    <Loader className="animate-spin text-primary" size={24} />
                  </div>
                )}

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

      {/* Extension Payment Modal */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <CardIcon size={48} className="mx-auto text-primary mb-4" />
              <h2 className="text-xl font-bold">Prolonger votre compte</h2>
              <p className="text-white/60 text-sm mt-2">
                Extension de 2 mois pour 24€ TTC
              </p>
            </div>

            {accountStatus?.pending_order ? (
              <div className="space-y-6">
                <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 text-center">
                  <p className="text-yellow-400 font-bold">Paiement en attente de validation</p>
                  <p className="text-sm text-white/60 mt-2">
                    Votre demande a été enregistrée. Une fois le paiement reçu, votre compte sera prolongé automatiquement.
                  </p>
                </div>

                <div className="bg-background border border-white/10 p-4">
                  <h3 className="font-bold mb-3 text-primary">Instructions de paiement</h3>
                  <p className="text-sm text-white/60 mb-4">Effectuez un virement de <strong className="text-white">24€ TTC</strong> avec les informations suivantes :</p>
                  
                  {bankDetails ? (
                    <div className="space-y-2 text-sm">
                      <p><span className="text-white/60">Bénéficiaire :</span> <strong>{bankDetails.account_holder}</strong></p>
                      <p><span className="text-white/60">IBAN :</span> <strong className="font-mono">{bankDetails.iban}</strong></p>
                      <p><span className="text-white/60">BIC :</span> <strong className="font-mono">{bankDetails.bic}</strong></p>
                      <p><span className="text-white/60">Référence :</span> <strong>EXT-{accountStatus.pending_order?.id?.slice(0, 8).toUpperCase()}</strong></p>
                    </div>
                  ) : (
                    <p className="text-white/60">Coordonnées bancaires envoyées par email.</p>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={cancelExtension}
                    className="btn-outline flex-1 py-3 text-red-400 border-red-400"
                  >
                    Annuler la demande
                  </button>
                  <a
                    href="https://paypal.me/creativindustryfranc/24"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex-1 py-3 text-center flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.64h6.67c2.205 0 3.902.57 4.904 1.65.944 1.02 1.28 2.47.997 4.3-.02.13-.04.26-.07.4-.71 3.69-3.12 5.5-7.18 5.5H9.19l-1.04 5.53a.64.64 0 0 1-.63.54h-.45l.01-.03z"/>
                    </svg>
                    Payer 24€ avec PayPal
                  </a>
                </div>
                <p className="text-center text-white/40 text-xs mt-4">
                  Après paiement, votre compte sera prolongé sous 24h
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-background border border-white/10 p-4">
                  <h3 className="font-bold mb-3">Détails de l'offre</h3>
                  <ul className="space-y-2 text-sm text-white/80">
                    <li className="flex items-center gap-2">
                      <Check size={16} className="text-green-400" /> Accès prolongé de 2 mois
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={16} className="text-green-400" /> Tous vos fichiers conservés
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={16} className="text-green-400" /> Téléchargement illimité pendant la période
                    </li>
                  </ul>
                </div>

                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">24€ <span className="text-lg font-normal text-white/60">TTC</span></p>
                  <p className="text-white/60 text-sm">20€ HT + 4€ TVA (20%)</p>
                </div>

                {/* PayPal Button */}
                <a
                  href="https://paypal.me/creativindustryfranc/24"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    requestExtension();
                  }}
                  className="w-full bg-[#0070ba] hover:bg-[#005ea6] text-white py-4 text-center flex items-center justify-center gap-3 font-bold transition-colors"
                  data-testid="paypal-pay-btn"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.77.77 0 0 1 .757-.64h6.67c2.205 0 3.902.57 4.904 1.65.944 1.02 1.28 2.47.997 4.3-.02.13-.04.26-.07.4-.71 3.69-3.12 5.5-7.18 5.5H9.19l-1.04 5.53a.64.64 0 0 1-.63.54h-.45l.01-.03z"/>
                  </svg>
                  Payer 24€ avec PayPal
                </a>

                <button
                  onClick={() => setShowExtensionModal(false)}
                  className="btn-outline w-full py-3"
                >
                  Annuler
                </button>

                <p className="text-center text-white/40 text-xs">
                  Paiement sécurisé par PayPal. Votre compte sera prolongé sous 24h après validation.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client Chat Widget */}
      <ClientChat />

      {/* Gallery Slideshow Modal */}
      {selectedGallery && (
        <GallerySlideshowModal
          isOpen={showSlideshow}
          onClose={() => setShowSlideshow(false)}
          photos={(selectedGallery.photos || []).map(photo => ({
            ...photo,
            url: `${BACKEND_URL}${photo.url}`
          }))}
          galleryName={selectedGallery.name}
          shareUrl={`${window.location.origin}/galerie/${selectedGallery.id}`}
          musicUrl={selectedGallery.music_url ? `${BACKEND_URL}${selectedGallery.music_url}` : null}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
