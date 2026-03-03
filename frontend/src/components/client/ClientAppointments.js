import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { API } from '../../config/api';

const ClientAppointments = ({ client, token }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const headers = { Authorization: `Bearer ${token}` };

  const statusColors = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
    refused: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    rescheduled_pending: "bg-orange-500/20 text-orange-400 border-orange-500/30"
  };

  const statusLabels = {
    pending: "En attente",
    confirmed: "Confirmé",
    refused: "Refusé",
    cancelled: "Annulé",
    rescheduled_pending: "Nouvelle date proposée"
  };

  const statusIcons = {
    pending: <AlertCircle className="w-4 h-4" />,
    confirmed: <CheckCircle className="w-4 h-4" />,
    refused: <XCircle className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
    rescheduled_pending: <Clock className="w-4 h-4" />
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/client/appointments`, { headers });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error("Erreur lors du chargement des rendez-vous");
    } finally {
      setLoading(false);
    }
  };

  const respondToReschedule = async (appointmentId, accept) => {
    try {
      await axios.put(
        `${API}/client/appointments/${appointmentId}/respond-reschedule`,
        { accept },
        { headers }
      );
      toast.success(accept ? "Nouvelle date acceptée" : "Nouvelle date refusée");
      fetchAppointments();
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error responding to reschedule:', error);
      toast.error("Erreur lors de la réponse");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-primary font-bold text-primary">Mes Rendez-vous</h2>
        <span className="text-sm text-gray-400">{appointments.length} rendez-vous</span>
      </div>

      {appointments.length === 0 ? (
        <div className="bg-card border border-white/10 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-400">Aucun rendez-vous pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des RDV */}
          <div className="space-y-4">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className={`bg-card border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50 ${
                  selectedAppointment?.id === apt.id ? 'border-primary' : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">{apt.appointment_type_label || apt.appointment_type}</h3>
                    <p className="text-sm text-gray-400">Réf: RDV-{apt.id?.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusColors[apt.status]}`}>
                    {statusIcons[apt.status]}
                    {statusLabels[apt.status]}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-300">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{apt.proposed_date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{apt.proposed_time}</span>
                  </div>
                </div>

                {apt.status === 'rescheduled_pending' && apt.new_proposed_date && (
                  <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
                    <p className="text-orange-400 font-medium">Nouvelle date proposée :</p>
                    <p className="text-white">{apt.new_proposed_date} à {apt.new_proposed_time}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Détails du RDV sélectionné */}
          {selectedAppointment && (
            <div className="bg-card border border-white/10 rounded-lg p-6 h-fit sticky top-4">
              <h3 className="text-lg font-semibold text-primary mb-4">Détails du rendez-vous</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Date</p>
                    <p className="text-white font-medium">{selectedAppointment.proposed_date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Heure</p>
                    <p className="text-white font-medium">{selectedAppointment.proposed_time}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Motif</p>
                  <p className="text-white">{selectedAppointment.appointment_type_label || selectedAppointment.appointment_type}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-400 mb-1">Durée</p>
                  <p className="text-white">{selectedAppointment.duration} min</p>
                </div>

                {selectedAppointment.message && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Votre message</p>
                    <p className="text-white text-sm bg-background p-3 rounded">{selectedAppointment.message}</p>
                  </div>
                )}

                {selectedAppointment.admin_response && (
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Réponse de l'équipe</p>
                    <p className="text-white text-sm bg-primary/10 border border-primary/30 p-3 rounded">{selectedAppointment.admin_response}</p>
                  </div>
                )}

                {/* Statut */}
                <div className={`p-4 rounded-lg text-center ${statusColors[selectedAppointment.status]}`}>
                  <div className="flex items-center justify-center gap-2">
                    {statusIcons[selectedAppointment.status]}
                    <span className="font-semibold">{statusLabels[selectedAppointment.status]}</span>
                  </div>
                </div>

                {/* Actions pour nouvelle date proposée */}
                {selectedAppointment.status === 'rescheduled_pending' && selectedAppointment.new_proposed_date && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-sm text-gray-400 mb-3">L'équipe vous propose une nouvelle date :</p>
                    <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg mb-4">
                      <p className="text-lg font-bold text-white">{selectedAppointment.new_proposed_date}</p>
                      <p className="text-orange-400">à {selectedAppointment.new_proposed_time}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => respondToReschedule(selectedAppointment.id, true)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded font-medium transition-colors"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => respondToReschedule(selectedAppointment.id, false)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded font-medium transition-colors"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientAppointments;
