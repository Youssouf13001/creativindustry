import { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Check, Clock, Users, FileText, Image, Video, MessageSquare } from "lucide-react";
import { API } from "../../config/api";

const OverviewTab = ({ stats, bookings, appointments, messages, unreadMessages, onTabChange }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "confirmed": return "bg-green-500/20 text-green-400";
      case "pending": return "bg-yellow-500/20 text-yellow-400";
      case "pending_payment": return "bg-orange-500/20 text-orange-400";
      case "refused": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "confirmed": return "Confirme";
      case "pending": return "En attente";
      case "pending_payment": return "Paiement en attente";
      case "payment_received": return "Paiement recu";
      case "refused": return "Refuse";
      case "rescheduled_pending": return "Report propose";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Reservations</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.bookings || 0}</p>
            </div>
            <Calendar className="w-10 h-10 text-amber-500/50" />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Devis</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.quotes || 0}</p>
            </div>
            <FileText className="w-10 h-10 text-amber-500/50" />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Portfolio</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.portfolio || 0}</p>
            </div>
            <Image className="w-10 h-10 text-amber-500/50" />
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">Messages</p>
              <p className="text-2xl font-bold text-white mt-1">{stats?.messages || 0}</p>
              {unreadMessages > 0 && (
                <span className="text-xs text-amber-400">{unreadMessages} non lu(s)</span>
              )}
            </div>
            <MessageSquare className="w-10 h-10 text-amber-500/50" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Reservations recentes</h3>
            <button 
              onClick={() => onTabChange("bookings")}
              className="text-amber-400 text-sm hover:underline"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {bookings?.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{booking.client_name}</p>
                  <p className="text-slate-400 text-sm">{booking.service_name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
              </div>
            ))}
            {(!bookings || bookings.length === 0) && (
              <p className="text-slate-400 text-center py-4">Aucune reservation</p>
            )}
          </div>
        </div>

        {/* Recent Appointments */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Rendez-vous recents</h3>
            <button 
              onClick={() => onTabChange("appointments")}
              className="text-amber-400 text-sm hover:underline"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {appointments?.slice(0, 5).map((apt) => (
              <div key={apt.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{apt.client_name}</p>
                  <p className="text-slate-400 text-sm">{apt.proposed_date} a {apt.proposed_time}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(apt.status)}`}>
                  {getStatusLabel(apt.status)}
                </span>
              </div>
            ))}
            {(!appointments || appointments.length === 0) && (
              <p className="text-slate-400 text-center py-4">Aucun rendez-vous</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Messages */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Messages recents</h3>
          <button 
            onClick={() => onTabChange("messages")}
            className="text-amber-400 text-sm hover:underline"
          >
            Voir tout
          </button>
        </div>
        <div className="space-y-3">
          {messages?.slice(0, 5).map((msg) => (
            <div key={msg.id} className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-medium">{msg.name}</p>
                <span className={`w-2 h-2 rounded-full ${msg.is_read ? 'bg-slate-500' : 'bg-amber-500'}`}></span>
              </div>
              <p className="text-slate-400 text-sm">{msg.subject}</p>
              <p className="text-slate-500 text-xs mt-1">{msg.email}</p>
            </div>
          ))}
          {(!messages || messages.length === 0) && (
            <p className="text-slate-400 text-center py-4">Aucun message</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
