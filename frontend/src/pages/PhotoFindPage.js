import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Camera, ShoppingCart, Check, X, Loader, Image, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { API, BACKEND_URL } from "../config/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Stripe Card Form
const StripePhotoForm = ({ amount, onSuccess, onCancel, clientSecret }) => {
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
        <button type="button" onClick={onCancel} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-lg text-white">Annuler</button>
        <button type="submit" disabled={!stripe || processing} className="flex-1 bg-[#635bff] hover:bg-[#5851db] text-white font-bold py-3 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
          {processing ? <><Loader className="animate-spin" size={20} /> Paiement...</> : <>Payer {amount}€</>}
        </button>
      </div>
    </form>
  );
};

const PhotoFindPage = () => {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [showPurchase, setShowPurchase] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ name: "", email: "" });
  const fileInputRef = useRef(null);
  
  // Stripe states
  const [stripePromise, setStripePromise] = useState(null);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState(null);
  const [stripePaymentId, setStripePaymentId] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchEvent();
    // Load Stripe
    const loadStripeKey = async () => {
      try {
        const res = await axios.get(`${API}/public/stripe-config`);
        if (res.data.publishable_key) {
          setStripePromise(loadStripe(res.data.publishable_key));
        }
      } catch (e) {
        console.error("Failed to load Stripe");
      }
    };
    loadStripeKey();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API}/public/photofind/${eventId}`);
      setEvent(res.data);
    } catch (e) {
      toast.error("Événement non trouvé ou inactif");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Reset the input so the same file can be selected again
      e.target.value = '';
      await searchWithImage(file);
    }
  };

  const searchWithImage = async (imageBlob) => {
    setSearching(true);
    setResults(null);
    
    const formData = new FormData();
    formData.append("file", imageBlob, "selfie.jpg");
    
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/search`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResults(res.data);
      if (res.data.matches_found === 0) {
        toast.info("Aucune photo correspondante trouvée. Essayez avec un autre angle.");
      } else {
        toast.success(`${res.data.matches_found} photo(s) trouvée(s) !`);
      }
    } catch (e) {
      const msg = e.response?.data?.detail || "Erreur lors de la recherche";
      toast.error(msg);
    } finally {
      setSearching(false);
    }
  };

  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    if (results?.photos) {
      setSelectedPhotos(results.photos.map(p => p.id));
    }
  };

  const calculatePrice = () => {
    const count = selectedPhotos.length;
    if (!results?.prices) return 0;
    if (count >= 10) return results.prices.pack_10;
    if (count >= 5) return results.prices.pack_5;
    return count * results.prices.per_photo;
  };

  const handlePurchase = async () => {
    if (!purchaseForm.name || !purchaseForm.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    const formData = new FormData();
    selectedPhotos.forEach(id => formData.append("photo_ids", id));
    formData.append("name", purchaseForm.name);
    formData.append("email", purchaseForm.email);
    
    try {
      const res = await axios.post(`${API}/public/photofind/${eventId}/purchase`, formData);
      toast.success(res.data.message);
      window.open(res.data.paypal_link, "_blank");
      setShowPurchase(false);
    } catch (e) {
      toast.error("Erreur lors de la commande");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <X className="mx-auto text-red-500 mb-4" size={64} />
          <h1 className="text-2xl font-primary text-white">Événement non trouvé</h1>
          <p className="text-white/60 mt-2">Cet événement n'existe pas ou n'est plus actif.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 to-transparent py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-primary text-3xl md:text-4xl text-white mb-2">
            {event.name}
          </h1>
          <p className="text-white/60">{event.description}</p>
          <p className="text-primary mt-2">{event.event_date}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Search Section */}
        {!results && (
          <div className="bg-card border border-white/10 rounded-xl p-8 text-center">
            <Camera className="mx-auto text-primary mb-4" size={64} />
            <h2 className="font-primary text-2xl text-white mb-4">
              Retrouvez vos photos !
            </h2>
            <p className="text-white/60 mb-8">
              Prenez un selfie ou importez une photo pour retrouver toutes les photos où vous apparaissez.
            </p>

            {/* Action Buttons */}
            {!searching && (
              <div className="flex flex-col gap-4">
                {/* Selfie button - uses native camera on mobile */}
                <label 
                  htmlFor="selfie-input"
                  className="px-8 py-4 bg-primary text-black font-bold rounded-lg flex items-center justify-center gap-2 text-lg cursor-pointer hover:bg-primary/90 transition-colors active:scale-95"
                >
                  <Camera size={24} /> Prendre un selfie
                </label>
                <input
                  id="selfie-input"
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                
                {/* Import from gallery */}
                <label 
                  htmlFor="gallery-input"
                  className="px-8 py-4 bg-white/10 text-white rounded-lg flex items-center justify-center gap-2 text-lg cursor-pointer hover:bg-white/20 transition-colors"
                >
                  <Image size={24} /> Importer depuis la galerie
                </label>
                <input
                  id="gallery-input"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}

            {/* Searching */}
            {searching && (
              <div className="flex flex-col items-center gap-4">
                <Loader className="animate-spin text-primary" size={48} />
                <p className="text-white/60">Recherche en cours...</p>
              </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-primary text-2xl text-white">
                  {results.matches_found} photo(s) trouvée(s)
                </h2>
                <p className="text-white/60">Sélectionnez les photos que vous souhaitez acheter</p>
              </div>
              <button
                onClick={() => { setResults(null); setSelectedPhotos([]); }}
                className="px-4 py-2 bg-white/10 text-white rounded-lg"
              >
                Nouvelle recherche
              </button>
            </div>

            {/* Photo Grid */}
            {results.photos.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                  {results.photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => togglePhotoSelection(photo.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedPhotos.includes(photo.id)
                          ? "border-primary shadow-lg shadow-primary/20"
                          : "border-transparent hover:border-white/20"
                      }`}
                    >
                      <img
                        src={`${BACKEND_URL}${photo.url}`}
                        alt="Photo"
                        className="w-full aspect-square object-cover"
                      />
                      {selectedPhotos.includes(photo.id) && (
                        <div className="absolute top-2 right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Check size={20} className="text-black" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white/80">
                          Correspondance: {Math.round(photo.similarity)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selection Actions */}
                <div className="flex items-center justify-between bg-card border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={selectAllPhotos}
                      className="text-primary hover:underline"
                    >
                      Tout sélectionner
                    </button>
                    <span className="text-white/60">
                      {selectedPhotos.length} photo(s) sélectionnée(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-primary text-2xl text-primary">
                      {calculatePrice()}€
                    </span>
                    <button
                      onClick={() => setShowPurchase(true)}
                      disabled={selectedPhotos.length === 0}
                      className="px-6 py-3 bg-primary text-black font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart size={20} /> Commander
                    </button>
                  </div>
                </div>

                {/* Pricing Info */}
                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">À l'unité</p>
                    <p className="font-primary text-xl text-white">{results.prices.per_photo}€</p>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">Pack 5 photos</p>
                    <p className="font-primary text-xl text-primary">{results.prices.pack_5}€</p>
                  </div>
                  <div className="bg-card/50 p-4 rounded-lg">
                    <p className="text-white/60 text-sm">Pack 10 photos</p>
                    <p className="font-primary text-xl text-green-500">{results.prices.pack_10}€</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <X className="mx-auto text-white/40 mb-4" size={64} />
                <p className="text-white/60">Aucune photo correspondante trouvée.</p>
                <p className="text-white/40 text-sm mt-2">Essayez avec un selfie plus net ou un autre angle.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchase && !showStripeForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="font-primary text-xl text-white mb-4">Finaliser la commande</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/60 text-sm mb-1">Votre nom</label>
                <input
                  type="text"
                  value={purchaseForm.name}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/20 rounded-lg text-white"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <label className="block text-white/60 text-sm mb-1">Votre email</label>
                <input
                  type="email"
                  value={purchaseForm.email}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, email: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-white/20 rounded-lg text-white"
                  placeholder="jean@example.com"
                />
              </div>
            </div>
            
            <div className="bg-background/50 p-4 rounded-lg mb-6">
              <div className="flex justify-between text-white/60">
                <span>{selectedPhotos.length} photo(s)</span>
                <span className="font-primary text-xl text-primary">{calculatePrice()}€</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Stripe CB Button */}
              {stripePromise && (
                <button
                  onClick={async () => {
                    if (!purchaseForm.name || !purchaseForm.email) {
                      toast.error("Veuillez remplir tous les champs");
                      return;
                    }
                    setPaymentLoading(true);
                    try {
                      const res = await axios.post(`${API}/public/photofind/${eventId}/create-stripe-payment`, {
                        photo_ids: selectedPhotos,
                        client_name: purchaseForm.name,
                        client_email: purchaseForm.email,
                        amount: calculatePrice()
                      });
                      if (res.data.client_secret) {
                        setStripeClientSecret(res.data.client_secret);
                        setStripePaymentId(res.data.payment_id);
                        setShowStripeForm(true);
                      }
                    } catch (e) {
                      toast.error(e.response?.data?.detail || "Erreur Stripe");
                    } finally {
                      setPaymentLoading(false);
                    }
                  }}
                  disabled={paymentLoading}
                  className="w-full px-4 py-3 bg-[#635bff] hover:bg-[#5851db] text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {paymentLoading ? <Loader className="animate-spin" size={20} /> : <CreditCard size={20} />}
                  Payer {calculatePrice()}€ par CB
                </button>
              )}
              
              {/* PayPal Button */}
              <button
                onClick={handlePurchase}
                disabled={paymentLoading}
                className="w-full px-4 py-3 bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold rounded-lg disabled:opacity-50"
              >
                Payer {calculatePrice()}€ avec PayPal
              </button>
              
              {/* Cancel */}
              <button
                onClick={() => setShowPurchase(false)}
                className="w-full px-4 py-3 bg-white/10 text-white rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Stripe Payment Form */}
      {showStripeForm && stripePromise && stripeClientSecret && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-white/10 rounded-xl p-6 max-w-md w-full">
            <h3 className="font-primary text-xl text-white mb-4 text-center">Paiement par Carte Bancaire</h3>
            
            <div className="bg-background/50 p-4 rounded-lg mb-6 text-center">
              <p className="text-white/60">{selectedPhotos.length} photo(s)</p>
              <p className="font-primary text-2xl text-primary">{calculatePrice()}€</p>
            </div>
            
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripePhotoForm
                amount={calculatePrice()}
                clientSecret={stripeClientSecret}
                onSuccess={async (paymentIntentId) => {
                  try {
                    const res = await axios.post(`${API}/photofind/${eventId}/confirm-stripe-payment`, {
                      payment_id: stripePaymentId,
                      payment_intent_id: paymentIntentId,
                      photo_ids: selectedPhotos,
                      client_name: purchaseForm.name,
                      client_email: purchaseForm.email
                    });
                    if (res.data.success) {
                      toast.success("Paiement confirmé ! Vérifiez votre email.");
                      setShowStripeForm(false);
                      setShowPurchase(false);
                      setSelectedPhotos([]);
                    }
                  } catch (e) {
                    toast.error("Erreur lors de la confirmation");
                  }
                }}
                onCancel={() => {
                  setShowStripeForm(false);
                  setStripeClientSecret(null);
                }}
              />
            </Elements>
            
            <p className="text-center text-white/40 text-xs mt-4">🔒 Paiement sécurisé par Stripe</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoFindPage;
