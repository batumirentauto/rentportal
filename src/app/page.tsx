"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { MorningSchedule } from "@/components/MorningSchedule";
import { WashingManagement } from "@/components/WashingManagement";
import { FinanceView } from "@/components/FinanceView";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { ReportingAnalyticsDashboard } from "@/components/ReportingAnalyticsDashboard";
import { TechPassportFinesRegistry } from "@/components/TechPassportFinesRegistry";
import { OwnerInvestorCabinet } from "@/components/OwnerInvestorCabinet";
import { FleetPricingRegistry } from "@/components/FleetPricingRegistry";
import { FleetMaintenanceHub } from "@/components/FleetMaintenanceHub";
import { LoyalClientMobileApp } from "@/components/LoyalClientMobileApp";
import { FleetTimelineGrid } from "@/components/FleetTimelineGrid";
import { ContractModal } from "@/components/ContractModal";
import { HandoverWizardModal } from "@/components/HandoverWizardModal";
import { ReturnWizardModal } from "@/components/ReturnWizardModal";
import { NotificationsModal } from "@/components/NotificationsModal";
import { KnowledgeBaseView } from "@/components/KnowledgeBaseView";
import { CustomerCrmHub } from "@/components/CustomerCrmHub";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<
    "timeline" | "pricing" | "maintenance" | "handover" | "mobileapp" | "techpassports" | "owners" | "crm" | "washing" | "finance" | "reports" | "executive" | "knowledge"
  >("timeline");
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [stopBlockedCars, setStopBlockedCars] = useState<any[]>([]);
  const [overdueBookings, setOverdueBookings] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  // Modals
  const [contractBooking, setContractBooking] = useState<any | null>(null);
  const [handoverBooking, setHandoverBooking] = useState<any | null>(null);
  const [returnBooking, setReturnBooking] = useState<any | null>(null);

  // Fetch bookings based on city filter
  const fetchBookings = useCallback(async () => {
    try {
      const url = `/api/bookings?city=${selectedCity}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
      }
    } catch (e) {
      console.error("Error loading bookings:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  // Fetch daytime notifications & blocked cars
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      if (data.success) {
        setUnreadCount(data.unreadCount);
        setNotificationsList(data.notifications || []);
        setStopBlockedCars(data.stopBlockedCars || []);
        setOverdueBookings(data.overdueBookings || []);
        setPendingTasks(data.pendingTasks || []);
      }
    } catch (e) {
      console.error("Error checking notifications:", e);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
    fetchNotifications();

    // Polling interval for live notification check (каждые 10 секунд)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchBookings, fetchNotifications]);

  // Toggle washing status
  const handleToggleWash = async (bookingId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/wash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ washStatus: newStatus, cost: 25 }),
      });
      const data = await res.json();
      if (data.success) {
        fetchBookings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate new daytime booking
  const handleSimulateNewBooking = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        await fetchBookings();
        await fetchNotifications();
      } else {
        alert(data.error || "Не удалось создать бронь");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Dismiss notification
  const handleDismissNotification = async (bookingId?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      fetchNotifications();
      fetchBookings();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteHandover = () => {
    setHandoverBooking(null);
    fetchBookings();
    fetchNotifications();
    // Switch to finance view or show success
    setActiveTab("finance");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        selectedCity={selectedCity}
        onSelectCity={(city) => setSelectedCity(city)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onSimulateNewBooking={handleSimulateNewBooking}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
            <p className="font-semibold text-white">Загрузка данных автопроката Грузии...</p>
          </div>
        ) : (
          <>
            {activeTab === "timeline" && (
              <FleetTimelineGrid
                selectedCity={selectedCity}
                onOpenContract={(b) => setContractBooking(b)}
                onOpenHandover={(b) => setHandoverBooking(b)}
                onOpenReturn={(b) => setReturnBooking(b)}
              />
            )}

            {activeTab === "pricing" && <FleetPricingRegistry />}

            {activeTab === "handover" && (
              <MorningSchedule
                bookings={bookings}
                onOpenContract={(b) => setContractBooking(b)}
                onOpenHandover={(b) => setHandoverBooking(b)}
                onToggleWash={handleToggleWash}
                unreadCount={unreadCount}
                onDismissNotification={handleDismissNotification}
                onRefreshData={() => {
                  fetchBookings();
                  fetchNotifications();
                }}
              />
            )}

            {activeTab === "mobileapp" && <LoyalClientMobileApp />}

            {activeTab === "techpassports" && <TechPassportFinesRegistry />}

            {activeTab === "owners" && <OwnerInvestorCabinet />}

            {activeTab === "crm" && (
              <CustomerCrmHub
                onOpenBookingForCustomer={(c) => {
                  setActiveTab("timeline");
                }}
              />
            )}

            {activeTab === "maintenance" && <FleetMaintenanceHub />}

            {activeTab === "washing" && (
              <WashingManagement
                bookings={bookings}
                onToggleWash={handleToggleWash}
              />
            )}

            {activeTab === "finance" && <FinanceView />}

            {activeTab === "reports" && <ReportingAnalyticsDashboard />}

            {activeTab === "executive" && <ExecutiveDashboard />}

            {activeTab === "knowledge" && <KnowledgeBaseView />}
          </>
        )}
      </main>

      {/* Contract Modal */}
      {contractBooking && (
        <ContractModal
          booking={contractBooking}
          onClose={() => setContractBooking(null)}
        />
      )}

      {/* Handover Wizard Modal */}
      {handoverBooking && (
        <HandoverWizardModal
          booking={handoverBooking}
          onClose={() => setHandoverBooking(null)}
          onComplete={handleCompleteHandover}
        />
      )}

      {/* Return Wizard Modal */}
      {returnBooking && (
        <ReturnWizardModal
          booking={returnBooking}
          onClose={() => setReturnBooking(null)}
          onCompleted={() => {
            setReturnBooking(null);
            fetchBookings();
            fetchNotifications();
            setActiveTab("washing");
          }}
        />
      )}

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notificationsList}
        stopBlockedCars={stopBlockedCars}
        overdueBookings={overdueBookings}
        pendingTasks={pendingTasks}
        onDismissAll={() => {
          handleDismissNotification();
        }}
        onRefreshData={() => {
          fetchBookings();
          fetchNotifications();
        }}
        onOpenHandover={(b) => setHandoverBooking(b)}
      />
    </div>
  );
}
