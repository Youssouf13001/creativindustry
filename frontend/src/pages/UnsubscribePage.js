import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Mail, ArrowLeft, RefreshCw } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function UnsubscribePage() {
  const { clientId } = useParams();
  const [status, setStatus] = useState("loading"); // loading, success, already, error, resubscribed
  const [email, setEmail] = useState("");
  const [isResubscribing, setIsResubscribing] = useState(false);

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/newsletter/unsubscribe/${clientId}`);
        setEmail(response.data.email || "");
        
        if (response.data.already_unsubscribed) {
          setStatus("already");
        } else {
          setStatus("success");
        }
      } catch (error) {
        console.error("Unsubscribe error:", error);
        setStatus("error");
      }
    };

    if (clientId) {
      unsubscribe();
    }
  }, [clientId]);

  const handleResubscribe = async () => {
    setIsResubscribing(true);
    try {
      await axios.post(`${API_URL}/api/newsletter/resubscribe/${clientId}`);
      setStatus("resubscribed");
    } catch (error) {
      console.error("Resubscribe error:", error);
    } finally {
      setIsResubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-2xl font-bold">
              <span className="text-[#D4AF37]">CREATIV</span>
              <span className="text-white">INDUSTRY</span>
            </h1>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-8 text-center">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Traitement en cours...
              </h2>
              <p className="text-gray-400">
                Veuillez patienter pendant que nous traitons votre demande.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Désabonnement réussi
              </h2>
              <p className="text-gray-400 mb-4">
                Vous ne recevrez plus de notifications par email concernant les nouvelles vidéos et stories.
              </p>
              {email && (
                <p className="text-sm text-gray-500 mb-6">
                  Email : <span className="text-[#D4AF37]">{email}</span>
                </p>
              )}
              <div className="space-y-3">
                <Button
                  onClick={handleResubscribe}
                  disabled={isResubscribing}
                  variant="outline"
                  className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                  data-testid="resubscribe-btn"
                >
                  {isResubscribing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Se réabonner
                </Button>
                <Link to="/" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white"
                    data-testid="back-home-btn"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à l'accueil
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === "already" && (
            <>
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-yellow-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Déjà désabonné
              </h2>
              <p className="text-gray-400 mb-6">
                Vous êtes déjà désabonné de notre newsletter.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={handleResubscribe}
                  disabled={isResubscribing}
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#B8860B]"
                  data-testid="resubscribe-btn"
                >
                  {isResubscribing ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Se réabonner
                </Button>
                <Link to="/" className="block">
                  <Button
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white"
                    data-testid="back-home-btn"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour à l'accueil
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === "resubscribed" && (
            <>
              <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-[#D4AF37]" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Réabonnement réussi !
              </h2>
              <p className="text-gray-400 mb-6">
                Vous recevrez à nouveau nos notifications par email pour les nouvelles vidéos et stories.
              </p>
              <Link to="/" className="block">
                <Button
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#B8860B]"
                  data-testid="back-home-btn"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour à l'accueil
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Une erreur s'est produite
              </h2>
              <p className="text-gray-400 mb-6">
                Nous n'avons pas pu traiter votre demande. Le lien est peut-être invalide ou expiré.
              </p>
              <Link to="/contact" className="block">
                <Button
                  className="w-full bg-[#D4AF37] text-black hover:bg-[#B8860B]"
                  data-testid="contact-btn"
                >
                  Nous contacter
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Footer text */}
        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} CREATIVINDUSTRY France. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
