import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { Check, X, Loader } from "lucide-react";
import { API } from "../config/api";

const AppointmentConfirmPage = () => {
  const [status, setStatus] = useState("loading");
  const [data, setData] = useState(null);
  const { appointmentId, token } = useParams();

  useEffect(() => {
    const confirmAppointment = async () => {
      try {
        const res = await axios.get(`${API}/appointments/confirm/${appointmentId}/${token}`);
        setData(res.data);
        setStatus("success");
      } catch (e) {
        setStatus("error");
      }
    };
    confirmAppointment();
  }, [appointmentId, token]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        {status === "loading" && (
          <div>
            <Loader size={48} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-white/60">Confirmation en cours...</p>
          </div>
        )}
        
        {status === "success" && (
          <div className="bg-card border border-green-500 p-8">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            <h1 className="font-primary font-bold text-2xl mb-4 text-green-500">Rendez-vous confirmé !</h1>
            <p className="text-white/70 mb-6">
              Votre rendez-vous est confirmé pour le :
            </p>
            <div className="bg-green-500 text-background p-4 mb-6">
              <p className="text-2xl font-bold">{data?.date}</p>
              <p className="text-xl">{data?.time}</p>
            </div>
            <p className="text-white/50 text-sm mb-6">
              Un email de confirmation vous a été envoyé.
            </p>
            <Link to="/" className="btn-primary px-8 py-3 text-sm inline-block">
              Retour à l'accueil
            </Link>
          </div>
        )}
        
        {status === "error" && (
          <div className="bg-card border border-red-500 p-8">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <X size={40} className="text-red-500" />
            </div>
            <h1 className="font-primary font-bold text-2xl mb-4 text-red-500">Erreur</h1>
            <p className="text-white/70 mb-6">
              Ce lien n'est plus valide ou le rendez-vous a déjà été traité.
            </p>
            <Link to="/rendez-vous" className="btn-primary px-8 py-3 text-sm inline-block">
              Faire une nouvelle demande
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentConfirmPage;
