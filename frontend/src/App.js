import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Components
import Header from "./components/Header";
import Footer from "./components/Footer";
import ChatWidget from "./components/ChatWidget";
import WelcomePopup from "./components/WelcomePopup";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

// Pages
import HomePage from "./pages/HomePage";
import ServicePage from "./pages/ServicePage";
import WeddingQuotePage from "./pages/WeddingQuotePage";
import PortfolioPage from "./pages/PortfolioPage";
import BookingPage from "./pages/BookingPage";
import AppointmentPage from "./pages/AppointmentPage";
import AppointmentConfirmPage from "./pages/AppointmentConfirmPage";
import ContactPage from "./pages/ContactPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import NewsPage from "./pages/NewsPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import ClientLogin from "./pages/ClientLogin";
import ClientDashboard from "./pages/ClientDashboard";
import UnsubscribePage from "./pages/UnsubscribePage";
import RenewalPage from "./pages/RenewalPage";
import PaymentConfirmPage from "./pages/PaymentConfirmPage";
import SharedGalleryPage from "./pages/SharedGalleryPage";
import GuestbookPage from "./pages/GuestbookPage";
import PhotoFindPage from "./pages/PhotoFindPage";
import PhotoFindDownloadPage from "./pages/PhotoFindDownloadPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/services/wedding" element={<ServicePage category="wedding" />} />
            <Route path="/services/podcast" element={<ServicePage category="podcast" />} />
            <Route path="/services/tv_set" element={<ServicePage category="tv_set" />} />
            <Route path="/devis-mariage" element={<WeddingQuotePage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/rendez-vous" element={<AppointmentPage />} />
            <Route path="/rendez-vous/confirmer/:appointmentId/:token" element={<AppointmentConfirmPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/temoignages" element={<TestimonialsPage />} />
            <Route path="/actualites" element={<NewsPage />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/client" element={<ClientLogin />} />
            <Route path="/client/dashboard" element={<ClientDashboard />} />
            <Route path="/unsubscribe/:clientId" element={<UnsubscribePage />} />
            <Route path="/renouvellement" element={<RenewalPage />} />
            <Route path="/renouvellement/success" element={<RenewalPage />} />
            <Route path="/renouvellement/cancel" element={<RenewalPage />} />
            <Route path="/espace-client" element={<ClientLogin />} />
            <Route path="/paiement-confirme" element={<PaymentConfirmPage />} />
            {/* Shared Gallery (public access) */}
            <Route path="/galerie/:galleryId" element={<SharedGalleryPage />} />
            {/* Guestbook (public access) */}
            <Route path="/livre-dor/:guestbookId" element={<GuestbookPage />} />
            {/* PhotoFind - Facial Recognition Photo Booth */}
            <Route path="/photofind/:eventId" element={<PhotoFindPage />} />
            {/* Aliases for different URLs */}
            <Route path="/mariages" element={<ServicePage category="wedding" />} />
            <Route path="/podcast" element={<ServicePage category="podcast" />} />
            <Route path="/plateau-tv" element={<ServicePage category="tv_set" />} />
          </Routes>
        </main>
        <Footer />
        <ChatWidget />
        <WelcomePopup />
        <PWAInstallPrompt />
        <Toaster position="top-right" richColors />
      </div>
    </BrowserRouter>
  );
}

export default App;
