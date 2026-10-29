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
import { FleetCatalogHub } from "@/components/FleetCatalogHub";
import { LoyalClientMobileApp } from "@/components/LoyalClientMobileApp";
import { FleetTimelineGrid } from "@/components/FleetTimelineGrid";
import { ContractModal } from "@/components/ContractModal";
import { HandoverWizardModal } from "@/components/HandoverWizardModal";
import { ReturnWizardModal } from "@/components/ReturnWizardModal";
import { NotificationsModal } from "@/components/NotificationsModal";
import { KnowledgeBaseView } from "@/components/KnowledgeBaseView";
import { CustomerCrmHub } from "@/components/CustomerCrmHub";
import { TeamAccessHub } from "@/components/TeamAccessHub";
import { TeamMessengerHub } from "@/components/TeamMessengerHub";
import { AiAssistantModal } from "@/components/AiAssistantModal";
import { RecordExpenseModal } from "@/components/RecordExpenseModal";
import { DatabaseBackupModal } from "@/components/DatabaseBackupModal";
import { RefreshCw, MessageSquare } from "lucide-react";
import { LanguageProvider } from "@/contexts/LanguageContext";

export default function Home() {
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<
    "timeline" | "catalog" | "pricing" | "maintenance" | "handover" | "mobileapp" | "techpassports" | "owners" | "crm" | "washing" | "finance" | "reports" | "executive" | "knowledge" | "team" | "chats"
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
  const [userRole, setUserRole] = useState<"EXECUTIVE" | "MANAGER" | "OWNER">("EXECUTIVE");
  const [currentUserName, setCurrentUserName] = useState<string>("Менеджер смены");
  const [ownerIdFromUrl, setOwnerIdFromUrl] = useState<string | null>(null);

  // Check role, user and city from URL query param or localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlRole = params.get("role")?.toUpperCase();
      const urlCity = params.get("city")?.toUpperCase();
      const urlOwnerId = params.get("ownerId");
      const urlUser = params.get("user");

      if (urlCity && ["TBS", "BUS", "KUT"].includes(urlCity)) {
        setSelectedCity(urlCity);
      }

      if (urlUser) {
        const decodedUser = decodeURIComponent(urlUser).trim();
        setCurrentUserName(decodedUser);
        localStorage.setItem("rentportal_manager_name", decodedUser);
      } else {
        const savedUser = localStorage.getItem("rentportal_manager_name");
        if (savedUser) {
          setCurrentUserName(savedUser);
        }
      }

      if (urlOwnerId) {
        setOwnerIdFromUrl(urlOwnerId);
      }

      if (urlRole === "OWNER") {
        setUserRole("OWNER");
        setActiveTab("owners");
        localStorage.setItem("rentportal_role", "OWNER");
        if (urlOwnerId) {
          localStorage.setItem("rentportal_ownerId", urlOwnerId);
          setOwnerIdFromUrl(urlOwnerId);
        }
      } else if (urlRole === "MANAGER") {
        setUserRole("MANAGER");
        localStorage.setItem("rentportal_role", "MANAGER");
      } else if (urlRole === "EXECUTIVE" || urlRole === "ADMIN") {
        setUserRole("EXECUTIVE");
        setActiveTab("timeline");
        localStorage.setItem("rentportal_role", "EXECUTIVE");
        localStorage.removeItem("rentportal_ownerId");
      } else {
        // Обычный вход по главной ссылке без параметров:
        // Не блокируем руководителя в изолированном кабинете инвестора!
        const savedRole = localStorage.getItem("rentportal_role");
        if (savedRole === "MANAGER") {
          setUserRole("MANAGER");
        } else {
          setUserRole("EXECUTIVE");
          setActiveTab("timeline");
          localStorage.setItem("rentportal_role", "EXECUTIVE");
          localStorage.removeItem("rentportal_ownerId");
        }
      }
    }
  }, []);

  const handleSwitchRole = (newRole: "EXECUTIVE" | "MANAGER" | "OWNER") => {
    setUserRole(newRole);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (newRole === "MANAGER") {
        url.searchParams.set("role", "manager");
        url.searchParams.delete("ownerId");
        localStorage.setItem("rentportal_role", "MANAGER");
        localStorage.removeItem("rentportal_ownerId");
      } else if (newRole === "OWNER") {
        url.searchParams.set("role", "owner");
        if (ownerIdFromUrl) {
          url.searchParams.set("ownerId", ownerIdFromUrl);
          localStorage.setItem("rentportal_ownerId", ownerIdFromUrl);
        }
        localStorage.setItem("rentportal_role", "OWNER");
      } else {
        url.searchParams.delete("role");
        url.searchParams.delete("ownerId");
        localStorage.setItem("rentportal_role", "EXECUTIVE");
        localStorage.removeItem("rentportal_ownerId");
      }
      window.history.replaceState({}, "", url.toString());
    }
    if (newRole === "MANAGER") {
      const restrictedTabs = ["mobileapp", "owners", "reports", "executive", "team"];
      if (restrictedTabs.includes(activeTab)) {
        setActiveTab("handover");
      }
    } else if (newRole === "OWNER") {
      setActiveTab("owners");
    }
  };

  // Guard activeTab if in MANAGER or OWNER role
  useEffect(() => {
    if (userRole === "MANAGER") {
      const restrictedTabs = ["mobileapp", "owners", "reports", "executive", "team"];
      if (restrictedTabs.includes(activeTab)) {
        setActiveTab("handover");
      }
    } else if (userRole === "OWNER") {
      if (activeTab !== "owners") {
        setActiveTab("owners");
      }
    }
  }, [userRole, activeTab]);

  // Modals
  const [contractBooking, setContractBooking] = useState<any | null>(null);
  const [handoverBooking, setHandoverBooking] = useState<any | null>(null);
  const [returnBooking, setReturnBooking] = useState<any | null>(null);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

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

  // Toggle washing status (20 GEL полная, 10 GEL кузов/салон)
  const handleToggleWash = async (
    bookingId: string,
    newStatus: string,
    washType: string = "FULL",
    cost: number = 20
  ) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/wash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          washStatus: newStatus,
          washType,
          cost: newStatus === "CLEAN" ? cost : 0,
        }),
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

  const handleOpenGlobalNewBooking = () => {
    if (activeTab !== "timeline") {
      setActiveTab("timeline");
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-new-booking"));
    }, 60);
  };

  return (
    <LanguageProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header
        selectedCity={selectedCity}
        onSelectCity={(city) => setSelectedCity(city)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onSimulateNewBooking={handleSimulateNewBooking}
        onOpenRecordExpense={() => setIsExpenseModalOpen(true)}
        onOpenNewBooking={handleOpenGlobalNewBooking}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        userRole={userRole}
        currentUserName={currentUserName}
        onSwitchRole={handleSwitchRole}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-6">
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

            {activeTab === "catalog" && (
              <FleetCatalogHub
                onOpenBookingForCar={(_carId) => {
                  setActiveTab("timeline");
                }}
              />
            )}

            {activeTab === "pricing" && <FleetPricingRegistry />}

            {activeTab === "handover" && (
              <MorningSchedule
                bookings={bookings}
                currentUserName={currentUserName}
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

            {activeTab === "owners" && (
              <OwnerInvestorCabinet
                initialOwnerId={ownerIdFromUrl}
                userRole={userRole}
                onSwitchToOwnerMode={(ownerId) => {
                  setOwnerIdFromUrl(ownerId);
                  setUserRole("OWNER");
                  setActiveTab("owners");
                  if (typeof window !== "undefined") {
                    localStorage.setItem("rentportal_role", "OWNER");
                    localStorage.setItem("rentportal_ownerId", ownerId);
                    const url = new URL(window.location.href);
                    url.searchParams.set("role", "owner");
                    url.searchParams.set("ownerId", ownerId);
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
              />
            )}

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

            {activeTab === "team" && (
              <TeamAccessHub
                onSwitchToOwner={(ownerId) => {
                  setOwnerIdFromUrl(ownerId);
                  setUserRole("OWNER");
                  setActiveTab("owners");
                  if (typeof window !== "undefined") {
                    localStorage.setItem("rentportal_role", "OWNER");
                    localStorage.setItem("rentportal_ownerId", ownerId);
                    const url = new URL(window.location.href);
                    url.searchParams.set("role", "owner");
                    url.searchParams.set("ownerId", ownerId);
                    window.history.replaceState({}, "", url.toString());
                  }
                }}
                onSwitchToRoleTab={(tab: any) => {
                  setActiveTab(tab);
                }}
              />
            )}

            {activeTab === "chats" && <TeamMessengerHub />}
          </>
        )}
      </main>

      {/* Contract Modal */}
      {contractBooking && (
        <ContractModal
          booking={contractBooking}
          initialLang={contractBooking.contractLanguage}
          onClose={() => setContractBooking(null)}
        />
      )}

      {/* Handover Wizard Modal */}
      {handoverBooking && (
        <HandoverWizardModal
          booking={handoverBooking}
          currentUserName={currentUserName}
          onClose={() => setHandoverBooking(null)}
          onComplete={handleCompleteHandover}
        />
      )}

      {/* Return Wizard Modal */}
      {returnBooking && (
        <ReturnWizardModal
          booking={returnBooking}
          currentUserName={currentUserName}
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

      {/* Floating Action Cluster: Bottom Right (Chat + AI Assistant side-by-side, never overlapping) */}
      <div className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-40 flex items-center space-x-2.5 pointer-events-none">
        {activeTab !== "chats" && (
          <button
            onClick={() => setActiveTab("chats")}
            className="pointer-events-auto hidden md:flex bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-500 text-white px-3.5 py-2 sm:py-2.5 rounded-full shadow-xl shadow-indigo-950/60 items-center space-x-2 transition-all active:scale-95 group border border-indigo-400/30 hover:scale-105 text-xs font-bold"
            title="Открыть корпоративный чат сотрудников"
          >
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-indigo-200" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse ring-1 ring-indigo-950" />
            </div>
            <span>Чат команды</span>
          </button>
        )}

        <div className="pointer-events-auto">
          <AiAssistantModal standaloneTrigger={false} />
        </div>
      </div>

      {/* Global Quick Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        currentUserName={currentUserName}
        onClose={() => setIsExpenseModalOpen(false)}
        onExpenseCreated={() => {
          fetchBookings();
        }}
      />

      {/* Global Database Backup & Storage Status Modal */}
      <DatabaseBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={() => {
          fetchBookings();
          fetchNotifications();
          window.dispatchEvent(new CustomEvent("fleet-timeline-refresh"));
        }}
      />
    </div>
    </LanguageProvider>
  );
}
