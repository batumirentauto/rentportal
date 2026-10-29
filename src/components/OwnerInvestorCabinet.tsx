import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Car,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Check,
  X,
  CreditCard,
  Building2,
  RefreshCw,
  Printer,
  ChevronRight,
  ShieldCheck,
  Percent,
  Sliders,
  FileText,
  Phone,
  Send,
  Wrench,
  Plus,
  Trash2,
  Receipt,
  Shield,
  FileCheck,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  UserPlus,
  Share2,
  Copy,
  Search,
  ExternalLink,
  CheckSquare,
  Square,
  Lock,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

const EXPENSE_CATEGORIES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: "MAINTENANCE", label: "ТО / Замена масла и фильтров", icon: "🛠️", desc: "Регулярное ТО, масло 5W30/0W20, фильтры" },
  { id: "BATUMI_PARKING", label: "Парковочное разрешение Батуми", icon: "🅿️", desc: "Муниципальный абонемент Batumi Parking" },
  { id: "GPS_TRACKER", label: "Абонплата за GPS (10 ₾/мес)", icon: "🛰️", desc: "Ежемесячная плата за GPS-мониторинг (10 лари на 1 авто)" },
  { id: "INSURANCE", label: "Страховка КАСКО / ОСАГО", icon: "🛡️", desc: "Годовой полис, франшиза, продление" },
  { id: "PTI_INSPECTION", label: "Техосмотр PTI (гостехосмотр)", icon: "📋", desc: "Официальный техосмотр Грузии" },
  { id: "REPAIRS", label: "Ремонт деталей / СТО / Ходовая", icon: "⚙️", desc: "Колодки, подвеска, электрика, двигатель" },
  { id: "TIRES", label: "Шины и шиномонтаж", icon: "🛞", desc: "Сезонный комплект, балансировка, переобувка" },
  { id: "WASHING", label: "Химчистка / Детейлинг / Мойка", icon: "🧼", desc: "Глубокая очистка салона перед сдачей" },
  { id: "OTHER", label: "Прочие расходы инвестора", icon: "📦", desc: "Аксессуары, ключи, эвакуатор, парковка" },
];

interface OwnerInvestorCabinetProps {
  initialOwnerId?: string | null;
  userRole?: "EXECUTIVE" | "MANAGER" | "OWNER";
  onSwitchToOwnerMode?: (ownerId: string) => void;
}

export const OwnerInvestorCabinet: React.FC<OwnerInvestorCabinetProps> = ({
  initialOwnerId,
  userRole = "EXECUTIVE",
  onSwitchToOwnerMode,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>(initialOwnerId || "");
  const [period, setPeriod] = useState<string>("thisMonth"); // "thisMonth", "30days", "all"
  const [activeTab, setActiveTab] = useState<"cars" | "expenses" | "bookings" | "payouts">("cars");

  // Modal: Add Owner Expense
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [expenseCarId, setExpenseCarId] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("MAINTENANCE");
  const [expenseAmount, setExpenseAmount] = useState<string>("150");
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [expenseDescription, setExpenseDescription] = useState<string>("");
  const [expenseReceiptUrl, setExpenseReceiptUrl] = useState<string>("");

  // Modal: Add New Owner (Investor)
  const [isAddOwnerOpen, setIsAddOwnerOpen] = useState<boolean>(false);
  const [newOwnerFullName, setNewOwnerFullName] = useState<string>("");
  const [newOwnerPhone, setNewOwnerPhone] = useState<string>("");
  const [newOwnerEmail, setNewOwnerEmail] = useState<string>("");
  const [newOwnerWhatsapp, setNewOwnerWhatsapp] = useState<string>("");
  const [newOwnerBankName, setNewOwnerBankName] = useState<string>("TBC Bank");
  const [newOwnerBankIban, setNewOwnerBankIban] = useState<string>("");
  const [newOwnerNotes, setNewOwnerNotes] = useState<string>("");
  const [newOwnerDailyRate, setNewOwnerDailyRate] = useState<number>(25);
  const [newOwnerCarIds, setNewOwnerCarIds] = useState<string[]>([]);
  const [newOwnerCarSearch, setNewOwnerCarSearch] = useState<string>("");

  // Modal: Manage Attached Cars for Current Owner
  const [isManageCarsOpen, setIsManageCarsOpen] = useState<boolean>(false);
  const [manageCarIds, setManageCarIds] = useState<string[]>([]);
  const [manageDailyRate, setManageDailyRate] = useState<number>(25);
  const [manageCarSearch, setManageCarSearch] = useState<string>("");

  // Modal: Share Owner Access Link
  const [isShareLinkOpen, setIsShareLinkOpen] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Modal: Edit Car Base Rate
  const [editingCarRate, setEditingCarRate] = useState<any | null>(null);
  const [newCarBaseRate, setNewCarBaseRate] = useState<number>(25);

  // Modal: Edit Specific Booking Rate (e.g. for long-term rental discount)
  const [editingBookingRate, setEditingBookingRate] = useState<any | null>(null);
  const [customDailyRate, setCustomDailyRate] = useState<number>(25);
  const [customTotalPayout, setCustomTotalPayout] = useState<number>(100);

  // Modal: Record New Payout to Owner
  const [isRecordPayoutOpen, setIsRecordPayoutOpen] = useState<boolean>(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(500);
  const [payoutMethod, setPayoutMethod] = useState<string>("BANK_TRANSFER");
  const [payoutAccountId, setPayoutAccountId] = useState<string>("");
  const [payoutNotes, setPayoutNotes] = useState<string>("");
  const [companyAccounts, setCompanyAccounts] = useState<any[]>([]);

  // Modal: Edit Owner Personal Profile & Requisites
  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [profileFullName, setProfileFullName] = useState<string>("");
  const [profilePhone, setProfilePhone] = useState<string>("");
  const [profileWhatsapp, setProfileWhatsapp] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profilePassportNumber, setProfilePassportNumber] = useState<string>("");
  const [profileBankName, setProfileBankName] = useState<string>("TBC Bank");
  const [profileBankIban, setProfileBankIban] = useState<string>("");
  const [profilePayoutCurrency, setProfilePayoutCurrency] = useState<string>("GEL");
  const [profileNotes, setProfileNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load company financial accounts for payouts
  useEffect(() => {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts && d.accounts.length > 0) {
          setCompanyAccounts(d.accounts);
          setPayoutAccountId((prev) => prev || d.accounts[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Sync initialOwnerId
  useEffect(() => {
    if (initialOwnerId && initialOwnerId !== selectedOwnerId) {
      setSelectedOwnerId(initialOwnerId);
    }
  }, [initialOwnerId]);

  const fetchPortalData = async (ownerId?: string) => {
    setLoading(true);
    try {
      const idToFetch = ownerId || selectedOwnerId || initialOwnerId || "";
      const roleQuery = userRole === "OWNER" ? "&role=owner" : "";
      const url = `/api/owners/portal?ownerId=${idToFetch}&period=${period}${roleQuery}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (!selectedOwnerId && json.selectedOwner) {
          setSelectedOwnerId(json.selectedOwner.id);
        }
      }
    } catch (e) {
      console.error("Error loading owner portal:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [selectedOwnerId, period, userRole]);

  // Handle Owner Switcher
  const handleSelectOwner = (id: string) => {
    if (userRole === "OWNER") return; // Locked in owner mode
    setSelectedOwnerId(id);
  };

  // Add owner personal expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner?.id || !expenseAmount || !expenseDescription) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADD_EXPENSE",
          ownerId: selectedOwner.id,
          carId: expenseCarId || undefined,
          category: expenseCategory,
          amount: Number(expenseAmount),
          currency: "GEL",
          description: expenseDescription,
          receiptPhotoUrl: expenseReceiptUrl || undefined,
          date: expenseDate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddExpenseOpen(false);
        setExpenseDescription("");
        setExpenseReceiptUrl("");
        setExpenseAmount("150");
        await fetchPortalData();
      } else {
        alert(json.error || "Не удалось сохранить расход");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении расхода");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete owner expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту запись расхода?")) return;
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_EXPENSE",
          expenseId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPortalData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Charge monthly GPS fee (10 GEL per car)
  const handleChargeMonthlyGps = async () => {
    if (!selectedOwner?.id) return;
    if (!confirm(`Начислить ежемесячную абонплату за GPS-трекинг по 10 лари на каждый автомобиль инвестора «${selectedOwner.fullName}»?`)) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CHARGE_MONTHLY_GPS",
          ownerId: selectedOwner.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        await fetchPortalData();
      } else {
        alert(json.error || "Ошибка списания абонплаты за GPS");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сети");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle GPS monthly charging for owner
  const handleToggleGpsCharge = async (currentVal: boolean) => {
    if (!selectedOwner?.id) return;
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TOGGLE_OWNER_GPS_CHARGE",
          ownerId: selectedOwner.id,
          chargeGpsMonthly: !currentVal,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchPortalData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save car base daily rate
  const handleSaveCarBaseRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarRate) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_CAR_DEFAULT_RATE",
          carId: editingCarRate.id,
          defaultOwnerDailyRate: newCarBaseRate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingCarRate(null);
        await fetchPortalData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save customized booking rate
  const handleSaveBookingRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookingRate) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_BOOKING_RATE",
          bookingId: editingBookingRate.bookingId,
          ownerDailyRate: customDailyRate,
          ownerTotalPayout: customTotalPayout,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingBookingRate(null);
        await fetchPortalData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record payout to owner
  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner?.id || !payoutAmount) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: selectedOwner.id,
          amount: payoutAmount,
          currency: "GEL",
          paymentMethod: payoutMethod,
          accountId: payoutAccountId || undefined,
          notes: payoutNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsRecordPayoutOpen(false);
        setPayoutNotes("");
        await fetchPortalData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenEditProfile = () => {
    if (!selectedOwner) return;
    setProfileFullName(selectedOwner.fullName || "");
    setProfilePhone(selectedOwner.phone || "");
    setProfileWhatsapp(selectedOwner.whatsapp || selectedOwner.phone || "");
    setProfileEmail(selectedOwner.email || "");
    setProfilePassportNumber(selectedOwner.passportNumber || "");
    setProfileBankName(selectedOwner.bankName || "TBC Bank");
    setProfileBankIban(selectedOwner.bankIban || "");
    setProfilePayoutCurrency(selectedOwner.payoutCurrency || "GEL");
    setProfileNotes(selectedOwner.notes || "");
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner?.id || !profileFullName.trim() || !profilePhone.trim()) {
      alert("Пожалуйста, укажите ваше имя и телефон");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OWNER_PROFILE",
          targetOwnerId: selectedOwner.id,
          fullName: profileFullName.trim(),
          phone: profilePhone.trim(),
          whatsapp: profileWhatsapp.trim() || undefined,
          email: profileEmail.trim() || undefined,
          passportNumber: profilePassportNumber.trim() || undefined,
          bankName: profileBankName.trim() || undefined,
          bankIban: profileBankIban.trim().toUpperCase() || undefined,
          payoutCurrency: profilePayoutCurrency,
          notes: profileNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditProfileOpen(false);
        await fetchPortalData();
        alert("✓ Ваши личные данные и реквизиты успешно сохранены!");
      } else {
        alert(json.error || "Ошибка сохранения профиля");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сети при сохранении профиля");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate and copy owner access link
  const getOwnerShareUrl = (ownerId?: string) => {
    const id = ownerId || selectedOwner?.id;
    if (!id || typeof window === "undefined") return "";
    return `${window.location.origin}/?role=owner&ownerId=${id}`;
  };

  const handleCopyLink = () => {
    const url = getOwnerShareUrl();
    if (url && typeof window !== "undefined") {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // Open modal to manage cars for selected owner
  const handleOpenManageCars = () => {
    if (!selectedOwner) return;
    const currentAttachedIds = (data?.fleetCars || [])
      .filter((c: any) => c.ownerId === selectedOwner.id)
      .map((c: any) => c.id);
    setManageCarIds(currentAttachedIds);
    setManageDailyRate(cars?.[0]?.defaultOwnerDailyRate || 25);
    setManageCarSearch("");
    setIsManageCarsOpen(true);
  };

  // Create new owner
  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerFullName.trim() || !newOwnerPhone.trim()) {
      alert("Пожалуйста, укажите имя и телефон владельца");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_OWNER",
          fullName: newOwnerFullName,
          phone: newOwnerPhone,
          email: newOwnerEmail,
          whatsapp: newOwnerWhatsapp || newOwnerPhone,
          bankName: newOwnerBankName,
          bankIban: newOwnerBankIban,
          notes: newOwnerNotes,
          defaultOwnerDailyRate: Number(newOwnerDailyRate) || 25,
          carIds: newOwnerCarIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddOwnerOpen(false);
        const createdId = json.owner.id;
        setNewOwnerFullName("");
        setNewOwnerPhone("");
        setNewOwnerEmail("");
        setNewOwnerWhatsapp("");
        setNewOwnerBankIban("");
        setNewOwnerNotes("");
        setNewOwnerCarIds([]);
        setSelectedOwnerId(createdId);
        await fetchPortalData(createdId);
        setIsShareLinkOpen(true);
      } else {
        alert(json.error || "Ошибка создания кабинета владельца");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save updated cars for selected owner
  const handleSaveOwnerCars = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOwner?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_OWNER_CARS",
          targetOwnerId: selectedOwner.id,
          carIds: manageCarIds,
          defaultOwnerDailyRate: Number(manageDailyRate) || 25,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsManageCarsOpen(false);
        await fetchPortalData();
        alert(json.message || "Автомобили инвестора успешно обновлены!");
      } else {
        alert(json.error || "Ошибка привязки автомобилей");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сети");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete owner
  const handleDeleteOwner = async () => {
    if (!selectedOwner?.id) return;
    if (
      !confirm(
        `Вы уверены, что хотите удалить личный кабинет «${selectedOwner.fullName}»?\nВсе привязанные автомобили останутся в общем автопарке и будут отвязаны.`
      )
    ) {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_OWNER",
          targetOwnerId: selectedOwner.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedOwnerId("");
        await fetchPortalData();
      } else {
        alert(json.error || "Ошибка удаления");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-white text-base">Загрузка кабинета владельца автомобиля...</p>
      </div>
    );
  }

  const { owners, selectedOwner, metrics, cars, bookings, payouts, expenses } = data || {};

  return (
    <div className="space-y-6 text-slate-100 print:text-black">
      {/* 1. TOP HEADER & OWNER SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
                Личный кабинет Инвестора
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Доходность автопарка • Учёт личных расходов без Excel • Валюта: ₾ GEL
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
              <span>{selectedOwner?.fullName || "Инвестор не выбран"}</span>
            </h2>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Executive: Create New Investor */}
            {userRole !== "OWNER" && (
              <button
                onClick={() => {
                  setNewOwnerCarIds([]);
                  setIsAddOwnerOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95"
                title="Создать новый личный кабинет владельца авто"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Новый инвестор</span>
              </button>
            )}

            {/* Executive: Attach / Manage Cars */}
            {userRole !== "OWNER" && selectedOwner && (
              <button
                onClick={handleOpenManageCars}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95"
                title="Выбрать и привязать автомобили к этому инвестору"
              >
                <Car className="w-4 h-4" />
                <span>🚗 Привязать авто</span>
              </button>
            )}

            {/* Executive: Share Isolated Link to Investor */}
            {userRole !== "OWNER" && selectedOwner && (
              <button
                onClick={() => setIsShareLinkOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition active:scale-95"
                title="Получить ссылку с изолированным доступом для инвестора"
              >
                <Share2 className="w-4 h-4" />
                <span>🔗 Ссылка инвестору</span>
              </button>
            )}

            {/* Executive: Test View as this Investor */}
            {userRole !== "OWNER" && selectedOwner && onSwitchToOwnerMode && (
              <button
                onClick={() => onSwitchToOwnerMode(selectedOwner.id)}
                className="flex items-center space-x-1.5 px-3 py-2.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
                title="Протестировать изолированный личный кабинет от лица этого инвестора"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>👁️ Вид инвестора</span>
              </button>
            )}

            {/* Primary Action: Add Expense (Available for both Executive and Owner!) */}
            <button
              onClick={() => {
                setExpenseCarId(cars?.[0]?.id || "");
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-rose-600 via-amber-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white rounded-xl text-xs font-extrabold shadow-lg transition active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              <span>+ Внести расход на авто</span>
            </button>

            {/* Owner Edit Profile Action */}
            {userRole === "OWNER" && selectedOwner && (
              <button
                onClick={handleOpenEditProfile}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95 shadow-md"
                title="Редактировать контакты, реквизиты банка и IBAN"
              >
                <Edit3 className="w-4 h-4 text-amber-400" />
                <span>Мои реквизиты и профиль</span>
              </button>
            )}

            {/* Payout to Investor - Executive only */}
            {userRole !== "OWNER" && selectedOwner && (
              <button
                onClick={() => {
                  setPayoutAmount(metrics?.pendingBalanceUSD || 500);
                  setIsRecordPayoutOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>+ Выплатить инвестору</span>
              </button>
            )}

            {/* Print Act / PDF */}
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
              title="Печать отчета о начислениях / Акт для владельца авто"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Акт-отчет / PDF</span>
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchPortalData()}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Executive: Delete Owner button */}
            {userRole !== "OWNER" && selectedOwner && (
              <button
                onClick={handleDeleteOwner}
                className="p-2.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-xl transition border border-rose-800/40"
                title="Удалить личный кабинет инвестора (автомобили останутся)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Owner Selector & Period Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Owner Switcher: hidden in OWNER mode */}
          {userRole === "OWNER" ? (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-lg">
                  👤
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                    Ваш личный кабинет инвестора:
                  </span>
                  <h3 className="font-extrabold text-white text-sm">
                    {selectedOwner?.fullName}
                  </h3>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Ваш автопарк:</span>
                <span className="text-xs font-black text-amber-400 font-mono">
                  {cars?.length || 0} автомобилей
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Выберите владельца автомобиля:
                </span>
                <button
                  onClick={() => {
                    setNewOwnerCarIds([]);
                    setIsAddOwnerOpen(true);
                  }}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Создать нового</span>
                </button>
              </div>
              <select
                value={selectedOwnerId}
                onChange={(e) => handleSelectOwner(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
              >
                {owners?.map((o: any) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName} • {o.carsCount} авто ({o.cities?.join(", ")}) • {o.phone}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Filter */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Период отчета о доходности:
            </span>
            <div className="flex space-x-1.5">
              {[
                { id: "thisMonth", label: "Текущий месяц" },
                { id: "30days", label: "Последние 30 дней" },
                { id: "all", label: "За все время" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition ${
                    period === p.id
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. INVESTOR PASSPORT & REQUISITES BANNER */}
      {selectedOwner && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs shadow-lg">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-base shadow-md shrink-0">
              {selectedOwner.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-white text-sm sm:text-base">
                  {selectedOwner.fullName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                  Владелец
                </span>
              </div>
              <p className="text-slate-300 text-[11px] sm:text-xs mt-0.5 flex flex-wrap items-center gap-x-2">
                <span>📞 {selectedOwner.phone}</span>
                {selectedOwner.whatsapp && (
                  <span className="text-emerald-400">• WA: {selectedOwner.whatsapp}</span>
                )}
                {selectedOwner.email && <span>• ✉️ {selectedOwner.email}</span>}
                {selectedOwner.passportNumber && (
                  <span className="text-slate-400">• ID: {selectedOwner.passportNumber}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-3 sm:gap-4">
              <div>
                <span className="text-[10px] text-slate-500 block">Банк для выплат:</span>
                <span className="font-bold text-white">{selectedOwner.bankName || "TBC Bank / Bank of Georgia"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">IBAN / Счет:</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedOwner.bankIban || "Не указан"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Основная валюта:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {selectedOwner.payoutCurrency === "USD" ? "$ USD" : "₾ GEL"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">GPS (10 ₾/мес):</span>
                <button
                  type="button"
                  onClick={() => handleToggleGpsCharge(Boolean(selectedOwner.chargeGpsMonthly))}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition ${
                    selectedOwner.chargeGpsMonthly !== false
                      ? "bg-emerald-950 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300"
                  }`}
                  title="Опция: взимать ли с владельца 10 лари в месяц за абонентскую плату GPS-трекера"
                >
                  {selectedOwner.chargeGpsMonthly !== false ? "✓ Вкл" : "✕ Откл"}
                </button>
              </div>
            </div>

            {/* Edit My Profile & Requisites Button */}
            <button
              onClick={handleOpenEditProfile}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-md transition active:scale-95 shrink-0"
              title="Изменить контакты, телефон, банк и IBAN для выплат"
            >
              <Edit3 className="w-4 h-4 text-slate-950" />
              <span>{userRole === "OWNER" ? "Редактировать мои данные" : "Редактировать данные"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. KEY METRICS SCORECARDS (ДОХОД, РАСХОДЫ НА ПАРК, ЧИСТАЯ ПРИБЫЛЬ И ВЫПЛАТЫ) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Earned from Rentals */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Заработано от аренды
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              {metrics?.totalOwnerEarningsUSD?.toLocaleString()} ₾
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              за {metrics?.totalDaysRented || 0} дн. завершённых аренд
            </div>
          </div>
        </div>

        {/* Total Owner Expenses (ТО, ремонт, шины, КАСКО) */}
        <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-2xl relative overflow-hidden shadow-lg bg-rose-950/10">
          <div className="flex justify-between items-start">
            <span className="text-xs text-rose-300 font-bold uppercase tracking-wider">
              Расходы на авто (ТО / СТО)
            </span>
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono tracking-tight">
              {metrics?.totalOwnerExpensesGEL?.toLocaleString()} ₾
            </span>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>{expenses?.length || 0} зап. в журнале</span>
              <button
                onClick={() => {
                  setExpenseCarId(cars?.[0]?.id || "");
                  setIsAddExpenseOpen(true);
                }}
                className="text-[10px] text-amber-400 font-bold hover:underline"
              >
                + Записать
              </button>
            </div>
          </div>
        </div>

        {/* Net Profit for Investor */}
        <div className="bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-emerald-300 font-black uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Чистая прибыль</span>
            </span>
            <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
              {metrics?.netProfitInvestorGEL?.toLocaleString()} ₾
            </span>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              Доход от завершённых аренд минус расходы на авто
            </div>
          </div>
        </div>

        {/* Pending Payout */}
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-amber-300 font-bold uppercase tracking-wider">
              К выплате инвестору
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              {metrics?.pendingBalanceUSD?.toLocaleString()} ₾
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              уже выплачено: {metrics?.totalPaidOutUSD?.toLocaleString()} ₾
            </div>
          </div>
        </div>
      </div>

      {/* 4. CABINET NAVIGATION TABS */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("cars")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "cars"
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Car className="w-4 h-4" />
          <span>🚗 Автопарк инвестора ({cars?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "expenses"
              ? "bg-rose-600 text-white shadow-md font-black"
              : "bg-slate-900 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>🛠️ Журнал расходов на авто ({expenses?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("bookings")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "bookings"
              ? "bg-emerald-600 text-white shadow-md font-black"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📅 Начисления по арендам ({bookings?.filter((b: any) => b.isCompleted)?.length || 0} / {bookings?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("payouts")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === "payouts"
              ? "bg-teal-600 text-white shadow-md font-black"
              : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>💳 История выплат ({payouts?.length || 0})</span>
        </button>
      </div>

      {/* 5. TAB 1: FLEET CARDS & REAL-TIME UTILIZATION */}
      {activeTab === "cars" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-base text-white">
                Автомобили инвестора: сдаваемость, доходы и расходы
              </h3>
              <p className="text-xs text-slate-400">
                Полная статистика по каждой машине: выручка от аренд, затраты на обслуживание и чистый результат
              </p>
            </div>
            <div className="flex items-center space-x-2 self-start sm:self-auto">
              {userRole !== "OWNER" && selectedOwner && (
                <button
                  onClick={handleOpenManageCars}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition shadow"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Привязать / отвязать авто</span>
                </button>
              )}
              <button
                onClick={() => {
                  setExpenseCarId(cars?.[0]?.id || "");
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Записать расход на авто</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(!cars || cars.length === 0) ? (
              <div className="col-span-full py-12 px-6 text-center bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">К этому кабинету пока не привязаны автомобили</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    {userRole !== "OWNER"
                      ? "Нажмите кнопку «Привязать авто», чтобы выбрать автомобили из общего парка и закрепить их за этим инвестором."
                      : "В вашем кабинете пока нет закрепленных машин. Обратитесь к управляющему парком для подключения."}
                  </p>
                </div>
                {userRole !== "OWNER" && selectedOwner && (
                  <button
                    onClick={handleOpenManageCars}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
                  >
                    <Car className="w-4 h-4" />
                    <span>Привязать автомобили сейчас</span>
                  </button>
                )}
              </div>
            ) : (
              cars.map((car: any) => {
                const cityTheme = getCityTheme(car.cityCode);
                const isRented = car.status === "RENTED";

                return (
                  <div
                    key={car.id}
                    className={`bg-slate-900 border rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden transition-all ${
                      isRented
                        ? "border-emerald-500/60 bg-emerald-950/10"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className={`w-2.5 h-10 rounded-full ${cityTheme.borderL}`} />
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          {car.brand} {car.model}
                        </h4>
                        <span className="font-mono text-xs text-amber-400 font-black">
                          {car.plateNumber}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      {isRented ? (
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-black flex items-center space-x-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>В поездке</span>
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] px-2 py-0.5 rounded font-bold">
                          Свободен к выдаче
                        </span>
                      )}
                    </div>
                  </div>

                  {/* City & Mileage */}
                  <div className="flex justify-between items-center text-[11px] text-slate-400 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                    <span className={`font-bold ${cityTheme.accentText}`}>
                      {cityTheme.icon} {car.cityName}
                    </span>
                    <span>Пробег: {car.currentMileage?.toLocaleString()} км</span>
                  </div>

                  {/* Current Active Trip Info */}
                  {car.activeBooking ? (
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 text-xs space-y-1">
                      <div className="flex justify-between text-emerald-300 font-bold text-[11px]">
                        <span>Текущая бронь: № {car.activeBooking.bookingNumber}</span>
                        <span>Возврат:</span>
                      </div>
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span className="truncate max-w-[150px]">{car.activeBooking.customerName}</span>
                        <span className="font-mono font-bold text-white">
                          {new Date(car.activeBooking.returnDate).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Готов к аренде</span>
                      <span className="text-emerald-400 font-bold">100% готов</span>
                    </div>
                  )}

                  {/* Financials & Owner Daily Rate */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                    {/* Batumi Parking & GPS Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                        car.hasBatumiParking
                          ? "bg-blue-950/80 text-blue-300 border-blue-500/40"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}>
                        <span>🅿️ Парковка Батуми:</span>
                        <strong className={car.hasBatumiParking ? "text-blue-300" : "text-slate-500"}>
                          {car.hasBatumiParking ? `✓ Абонемент` : "Нет"}
                        </strong>
                      </span>

                      <span className={`px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                        car.hasGpsTracker
                          ? "bg-indigo-950/80 text-indigo-300 border-indigo-500/40"
                          : "bg-slate-950 text-slate-500 border-slate-800"
                      }`}>
                        <span>🛰️ GPS:</span>
                        <strong className="text-indigo-300">
                          {car.hasGpsTracker ? (car.isGpsFeeChargedToOwner !== false ? "10 ₾/мес" : "Без списания") : "Нет"}
                        </strong>
                      </span>
                    </div>

                    {/* Utilization in period */}
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Сдаваемость в периоде:</span>
                      <span className="font-mono font-bold text-cyan-300">
                        {car.daysRented} дн. ({car.utilizationRate}%)
                      </span>
                    </div>

                    {/* Breakdown: Revenue, Expenses, Net Profit */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 font-mono">
                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>💰 Доход от аренды:</span>
                        <span className="font-bold text-emerald-400">{car.earnedUSD} ₾</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-[11px]">
                        <span>🛠️ Расходы (ТО/ремонт):</span>
                        <span className="font-bold text-rose-400">-{car.expensesGEL || 0} ₾</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800 text-xs font-black">
                        <span className="text-white">📈 Чистая прибыль:</span>
                        <span className={(car.netProfitGEL ?? car.earnedUSD) >= 0 ? "text-emerald-300" : "text-rose-400"}>
                          {car.netProfitGEL ?? car.earnedUSD} ₾
                        </span>
                      </div>
                    </div>

                    {/* Fixed Daily Rate Payable to Owner with Edit Button & Quick Add Expense */}
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Ставка инвестору:</span>
                        <span className="font-mono font-black text-amber-400 text-xs">
                          {car.defaultOwnerDailyRate} ₾ / сутки
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => {
                            setExpenseCarId(car.id);
                            setIsAddExpenseOpen(true);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold transition"
                          title="Записать расход конкретно на это авто"
                        >
                          <Wrench className="w-3 h-3 text-rose-400" />
                          <span>Расход</span>
                        </button>
                        {userRole !== "OWNER" && (
                          <button
                            onClick={() => {
                              setEditingCarRate(car);
                              setNewCarBaseRate(car.defaultOwnerDailyRate || 25);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] font-bold transition border border-slate-700"
                            title="Изменить базовую суточную ставку инвестора для этого авто"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Ставка</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* 6. TAB 2: OWNER EXPENSES JOURNAL (УЧЁТ РАСХОДОВ ВЛАДЕЛЬЦА БЕЗ EXCEL) */}
      {activeTab === "expenses" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-0">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <span>🛠️ Журнал расходов владельца на автомобили</span>
                <span className="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold">
                  Замена таблиц Excel
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Все затраты на ТО, замену масла, запчасти, КАСКО, техосмотр PTI и резину в одном месте
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-rose-300 font-mono font-bold mr-1">
                Сумма: {metrics?.totalOwnerExpensesGEL?.toLocaleString()} ₾
              </span>
              <button
                type="button"
                onClick={handleChargeMonthlyGps}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-bold transition shadow"
                title="Списать ежемесячную абонплату 10 лари/авто за GPS"
              >
                <span>🛰️ Списать GPS (10 ₾/авто)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpenseCarId(cars?.[0]?.id || "");
                  setExpenseCategory("BATUMI_PARKING");
                  setExpenseAmount("40");
                  setExpenseDescription("Парковочный абонемент Батуми (Batumi Parking)");
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 text-blue-300 rounded-xl text-xs font-bold transition shadow"
              >
                <span>🅿️ Парковка Батуми</span>
              </button>
              <button
                onClick={() => {
                  setExpenseCarId(cars?.[0]?.id || "");
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-lg transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Добавить расход</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Дата</th>
                  <th className="py-3 px-3 font-bold">Автомобиль</th>
                  <th className="py-3 px-3 font-bold">Категория расхода</th>
                  <th className="py-3 px-3 font-bold">Описание / СТО / Запчасти</th>
                  <th className="py-3 px-3 font-bold text-center">Чек / Акт</th>
                  <th className="py-3 px-4 font-bold text-right">Сумма (₾ GEL)</th>
                  <th className="py-3 px-3 font-bold text-center">Удалить</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {expenses?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="max-w-md mx-auto space-y-2">
                        <Wrench className="w-10 h-10 text-slate-600 mx-auto" />
                        <p className="font-bold text-white text-sm">Расходов на авто пока не внесено</p>
                        <p className="text-xs text-slate-500">
                          Нажмите кнопку «+ Добавить расход», чтобы записать затраты на ТО, масло, страховку или ремонт, не прибегая к Excel.
                        </p>
                        <button
                          onClick={() => {
                            setExpenseCarId(cars?.[0]?.id || "");
                            setIsAddExpenseOpen(true);
                          }}
                          className="mt-2 inline-flex items-center space-x-1 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Записать первый расход</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses?.map((e: any) => {
                    const catInfo = EXPENSE_CATEGORIES.find((c) => c.id === e.category) || {
                      label: e.category,
                      icon: "📦",
                    };

                    return (
                      <tr key={e.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {new Date(e.date).toLocaleDateString("ru-RU", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>

                        <td className="py-3 px-3">
                          {e.carBrand ? (
                            <div>
                              <span className="font-bold text-white block">
                                {e.carBrand} {e.carModel}
                              </span>
                              <span className="font-mono text-[10px] text-amber-400 font-black">
                                {e.carPlate}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Весь автопарк</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <span className="inline-flex items-center space-x-1 bg-slate-800 text-slate-200 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                            <span>{catInfo.icon}</span>
                            <span>{catInfo.label}</span>
                          </span>
                        </td>

                        <td className="py-3 px-3 text-slate-300 max-w-xs">
                          <p className="line-clamp-2 leading-relaxed">{e.description}</p>
                        </td>

                        <td className="py-3 px-3 text-center">
                          {e.receiptPhotoUrl ? (
                            <a
                              href={e.receiptPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline text-[11px] font-mono font-bold flex items-center justify-center space-x-1"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Открыть</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[10px]">без фото</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-rose-400 text-sm">
                          -{e.amount?.toLocaleString()} ₾
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"
                            title="Удалить запись расхода"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: BOOKINGS & DETAILED ACCRUALS TABLE WITH RATE OVERRIDE */}
      {activeTab === "bookings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="font-extrabold text-base text-white">
                Детализация поездок и начислений инвестору
              </h3>
              <p className="text-xs text-slate-400">
                Начисления производятся строго по факту возврата автомобиля (завершения поездки)
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Завершено: <strong className="text-emerald-400">{bookings?.filter((b: any) => b.isCompleted)?.length || 0}</strong> из <strong className="text-white">{bookings?.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Бронь / Автомобиль</th>
                  <th className="py-3 px-3 font-bold">Даты поездки</th>
                  <th className="py-3 px-3 font-bold text-center">Дней аренды</th>
                  <th className="py-3 px-3 font-bold text-center">Ставка инвестора</th>
                  <th className="py-3 px-3 font-bold text-right">Начислено владельцу</th>
                  <th className="py-3 px-4 font-bold text-center">Корректировка</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {bookings?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      За выбранный период поездок по автомобилям владельца нет
                    </td>
                  </tr>
                ) : (
                  bookings?.map((b: any) => {
                    const bStart = new Date(b.startDate);
                    const bEnd = new Date(b.endDate);
                    const isLongRental = b.rentalDays >= 5;

                    return (
                      <tr key={b.bookingId} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-white text-xs block">
                            № {b.bookingNumber}
                          </span>
                          <span className="text-slate-300 font-semibold">
                            {b.carBrand} {b.carModel} ({b.carPlate})
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            Клиент: {b.customerName}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="text-slate-200 block font-mono">
                            {bStart.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })} —{" "}
                            {bEnd.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}
                          </span>
                          <span className="text-[10px] text-slate-500">{b.pickupCity}</span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="font-bold text-white text-sm">{b.rentalDays} дн.</span>
                          {isLongRental && (
                            <span className="text-[10px] text-amber-400 block font-sans">
                              длинная аренда
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="font-mono font-bold text-amber-300">
                            {b.ownerDailyRate} ₾ / сут.
                          </div>
                          {b.isRateAdjusted && (
                            <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40 px-1 py-0.2 rounded font-sans">
                              скорректировано (база: {b.defaultCarRate} ₾)
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right font-mono font-black text-sm">
                          {b.isCompleted ? (
                            <div>
                              <span className="text-emerald-400 block font-black text-sm">
                                +{b.ownerTotalPayout} ₾
                              </span>
                              <span className="text-[10px] text-emerald-500/80 font-sans font-medium block">
                                ✓ Авто возвращено
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-amber-400/90 block font-bold text-sm">
                                {b.ownerTotalPayout} ₾
                              </span>
                              <span className="text-[10px] text-amber-500/80 font-sans font-medium block">
                                {b.status === "ACTIVE"
                                  ? "🚗 В поездке (расчёт при возврате)"
                                  : "⏳ До выдачи (расчёт при возврате)"}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setEditingBookingRate(b);
                              setCustomDailyRate(b.ownerDailyRate || 25);
                              setCustomTotalPayout(b.ownerTotalPayout || 25 * b.rentalDays);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 mx-auto transition border border-slate-700"
                            title="Скорректировать ставку для этой поездки"
                          >
                            <Edit3 className="w-3 h-3 text-amber-400" />
                            <span>Править</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: PAYOUTS HISTORY TABLE (ИСТОРИЯ ВЫПЛАТ ИНВЕСТОРУ) */}
      {activeTab === "payouts" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base text-white">
                История произведенных выплат инвестору
              </h3>
              <p className="text-xs text-slate-400">
                Банковские переводы и подтвержденные выплаты владельцу
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-bold font-mono">
              Всего выплачено: {metrics?.totalPaidOutUSD} ₾ (GEL)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Дата перевода</th>
                  <th className="py-3 px-3 font-bold">Способ выплаты</th>
                  <th className="py-3 px-3 font-bold">Примечание / Назначение</th>
                  <th className="py-3 px-3 font-bold text-center">Статус</th>
                  <th className="py-3 px-4 font-bold text-right">Сумма выплаты</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {payouts?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      Выплат инвестору пока не производилось
                    </td>
                  </tr>
                ) : (
                  payouts?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-white">
                        {new Date(p.paidAt).toLocaleDateString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {p.paymentMethod === "BANK_TRANSFER"
                          ? "🏦 Банковский перевод IBAN"
                          : p.paymentMethod === "CASH"
                          ? "💵 Наличные в офисе"
                          : "🪙 Перевод криптовалютой"}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{p.notes || "Выплата дохода от аренды"}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-bold">
                          ✓ Выплачено
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        {p.amount.toLocaleString()} ₾ (GEL)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. MODAL: ADD OWNER EXPENSE (ВНЕСТИ РАСХОД НА АВТОМОБИЛЬ) */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Запись расхода владельца
                  </h3>
                  <span className="text-xs text-slate-400">
                    Инвестор: <strong className="text-white">{selectedOwner?.fullName}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              {/* Select Car */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Автомобиль (на который понесён расход):
                </label>
                <select
                  value={expenseCarId}
                  onChange={(e) => setExpenseCarId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-rose-500"
                >
                  <option value="">-- Общий расход на весь парк инвестора --</option>
                  {cars?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.plateNumber}) • {c.cityName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Категория расхода:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setExpenseCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-start space-x-2 transition ${
                        expenseCategory === cat.id
                          ? "bg-rose-950/60 border-rose-500 text-white shadow"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <span className="font-bold text-xs block text-slate-200">
                          {cat.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block line-clamp-1">
                          {cat.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Сумма в Лари (₾ GEL):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      placeholder="150"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-rose-400 font-mono font-black text-base focus:outline-none focus:border-rose-500"
                      required
                    />
                    <span className="absolute right-3 top-2.5 font-bold text-slate-400 font-mono">
                      ₾ GEL
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Дата расхода:
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Description / Work Details */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Описание работ / Название СТО / Купленные детали:
                </label>
                <textarea
                  rows={2}
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="Замена моторного масла 5W30 Motul + масляный и воздушный фильтр на сервисе в Батуми"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-rose-500 placeholder-slate-600"
                  required
                />
              </div>

              {/* Receipt photo URL */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Ссылка на фото чека / заказ-наряда (необязательно):
                </label>
                <input
                  type="text"
                  value={expenseReceiptUrl}
                  onChange={(e) => setExpenseReceiptUrl(e.target.value)}
                  placeholder="https://... или номер чека / накладной"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-rose-500 placeholder-slate-600"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2 border-t border-slate-800 sticky bottom-0 bg-slate-900/95 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg transition active:scale-95"
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить расход"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. MODAL: EDIT CAR BASE DAILY RATE */}
      {editingCarRate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Базовая ставка инвестора
                </span>
                <h3 className="font-extrabold text-base text-white mt-1">
                  {editingCarRate.brand} {editingCarRate.model} ({editingCarRate.plateNumber})
                </h3>
              </div>
              <button
                onClick={() => setEditingCarRate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCarBaseRate} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Фиксированная ставка инвестору за 1 день аренды (₾ GEL):
                </label>
                <input
                  type="number"
                  min="5"
                  max="1500"
                  value={newCarBaseRate}
                  onChange={(e) => setNewCarBaseRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono font-black text-lg focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  💡 Эта ставка будет автоматически начисляться владельцу за каждый день аренды этого автомобиля.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCarRate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black shadow-lg transition"
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить ставку"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. MODAL: EDIT SPECIFIC BOOKING RATE (CORRECTION FOR LONG RENTALS) */}
      {editingBookingRate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Корректировка ставки брони
                </span>
                <h3 className="font-extrabold text-base text-white mt-1">
                  Бронь № {editingBookingRate.bookingNumber} ({editingBookingRate.rentalDays} дн.)
                </h3>
              </div>
              <button
                onClick={() => setEditingBookingRate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBookingRate} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block">Автомобиль:</span>
                <span className="font-bold text-white block">
                  {editingBookingRate.carBrand} {editingBookingRate.carModel} ({editingBookingRate.carPlate})
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Базовая ставка авто: <strong>{editingBookingRate.defaultCarRate} ₾ / сут.</strong>
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Скорректированная ставка за сутки (₾ GEL):
                </label>
                <input
                  type="number"
                  min="5"
                  max="1500"
                  value={customDailyRate}
                  onChange={(e) => {
                    const r = Number(e.target.value);
                    setCustomDailyRate(r);
                    setCustomTotalPayout(r * editingBookingRate.rentalDays);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold text-base focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Итоговая сумма к выплате инвестору (₾ GEL):
                </label>
                <input
                  type="number"
                  min="5"
                  value={customTotalPayout}
                  onChange={(e) => setCustomTotalPayout(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-emerald-400 font-mono font-black text-lg focus:outline-none focus:border-purple-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  💡 Для длинной брони на {editingBookingRate.rentalDays} дн. согласована индивидуальная сумма выплаты инвестору.
                </p>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBookingRate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {isSubmitting ? "Сохранение..." : "Применить корректировку"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 12. MODAL: RECORD PAYOUT TO OWNER */}
      {isRecordPayoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Выплата инвестору
                </span>
                <h3 className="font-extrabold text-base text-white mt-1">
                  Выплата для {selectedOwner?.fullName}
                </h3>
              </div>
              <button
                onClick={() => setIsRecordPayoutOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayout} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block">Реквизиты:</span>
                <span className="font-bold text-white block">
                  {selectedOwner?.bankName || "TBC Bank"} • {selectedOwner?.bankIban || "Счет инвестора"}
                </span>
                <span className="text-emerald-400 font-mono font-bold block text-[11px]">
                  Текущий остаток к выплате: {metrics?.pendingBalanceUSD} ₾ (GEL)
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Сумма выплаты (₾ GEL):
                </label>
                <input
                  type="number"
                  min="1"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-400 font-mono font-black text-xl focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Способ перевода:
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_TRANSFER">🏦 Банковский перевод на IBAN (TBC / BOG)</option>
                  <option value="CASH">💵 Выдача наличных в кассе офиса</option>
                  <option value="CRYPTO">🪙 Криптовалютный перевод</option>
                </select>
              </div>

              {companyAccounts.length > 0 && (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Счёт списания компании (источник выплаты):
                  </label>
                  <select
                    value={payoutAccountId}
                    onChange={(e) => setPayoutAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-emerald-500"
                  >
                    {companyAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currentBalance} {acc.currency === "GEL" ? "₾" : "$"})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-emerald-400/90 mt-1 block">
                    ✓ Сумма будет списана с этого счёта и автоматически отразится в общем журнале расходов компании и отчётности P&L.
                  </span>
                </div>
              )}

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Примечание / Номер платежки:
                </label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="Выплата дохода от аренды за октябрь 2026..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordPayoutOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {isSubmitting ? "Проведение..." : "Подтвердить выплату"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW OWNER (INVESTOR) CABINET */}
      {isAddOwnerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  Личный кабинет владельца
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Создать личный кабинет инвестора
                </h3>
                <p className="text-xs text-slate-400">
                  Заполните данные владельца и отметьте автомобили, принадлежащие ему
                </p>
              </div>
              <button
                onClick={() => setIsAddOwnerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOwner} className="space-y-4 text-xs">
              {/* Personal info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    ФИО владельца *
                  </label>
                  <input
                    type="text"
                    value={newOwnerFullName}
                    onChange={(e) => setNewOwnerFullName(e.target.value)}
                    placeholder="Георгий Беридзе"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Номер телефона *
                  </label>
                  <input
                    type="text"
                    value={newOwnerPhone}
                    onChange={(e) => {
                      setNewOwnerPhone(e.target.value);
                      if (!newOwnerWhatsapp) setNewOwnerWhatsapp(e.target.value);
                    }}
                    placeholder="+995 555 12 34 56"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    WhatsApp (для отправки ссылки и отчетов)
                  </label>
                  <input
                    type="text"
                    value={newOwnerWhatsapp}
                    onChange={(e) => setNewOwnerWhatsapp(e.target.value)}
                    placeholder="+995 555 12 34 56"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Email (опционально)
                  </label>
                  <input
                    type="email"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    placeholder="investor@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Bank Requisites */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Банк для выплат
                  </label>
                  <input
                    type="text"
                    value={newOwnerBankName}
                    onChange={(e) => setNewOwnerBankName(e.target.value)}
                    placeholder="TBC Bank / Bank of Georgia"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Номер счета / IBAN инвестора
                  </label>
                  <input
                    type="text"
                    value={newOwnerBankIban}
                    onChange={(e) => setNewOwnerBankIban(e.target.value)}
                    placeholder="GE29TB7000000000000000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Base Daily Rate & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Ставка инвестору по умолчанию (₾ GEL / сутки)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newOwnerDailyRate}
                    onChange={(e) => setNewOwnerDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Сумма, начисляемая владельцу за каждый день фактической аренды его авто
                  </span>
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Примечание / Условия договора
                  </label>
                  <input
                    type="text"
                    value={newOwnerNotes}
                    onChange={(e) => setNewOwnerNotes(e.target.value)}
                    placeholder="Договор управления от 01.11, комиссия 20%..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Cars selection checklist */}
              <div className="border border-slate-800 rounded-xl p-3 bg-slate-950/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs flex items-center space-x-1.5">
                    <Car className="w-4 h-4 text-emerald-400" />
                    <span>Привязать автомобили к этому владельцу ({newOwnerCarIds.length} выбрано):</span>
                  </span>
                  <input
                    type="text"
                    placeholder="Поиск по марке/номеру..."
                    value={newOwnerCarSearch}
                    onChange={(e) => setNewOwnerCarSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-emerald-500 w-44"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {data?.fleetCars
                    ?.filter((c: any) => {
                      if (!newOwnerCarSearch.trim()) return true;
                      const q = newOwnerCarSearch.toLowerCase();
                      return (
                        c.brand.toLowerCase().includes(q) ||
                        c.model.toLowerCase().includes(q) ||
                        c.plateNumber.toLowerCase().includes(q)
                      );
                    })
                    .map((car: any) => {
                      const isSelected = newOwnerCarIds.includes(car.id);
                      return (
                        <div
                          key={car.id}
                          onClick={() => {
                            if (isSelected) {
                              setNewOwnerCarIds(newOwnerCarIds.filter((id) => id !== car.id));
                            } else {
                              setNewOwnerCarIds([...newOwnerCarIds, car.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition select-none ${
                            isSelected
                              ? "bg-emerald-950/50 border-emerald-500/60 text-white"
                              : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-slate-600 bg-slate-800"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-bold text-xs">{car.brand} {car.model}</span>
                            <span className="font-mono text-[11px] text-amber-400 font-bold px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                              {car.plateNumber}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px]">
                            <span className="text-slate-400">{car.city?.nameRu || "Батуми"}</span>
                            {car.ownerId && (
                              <span className="text-amber-300/80 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                                уже закреплена
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddOwnerOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-black shadow-lg transition"
                >
                  {isSubmitting ? "Создание..." : "Создать кабинет и привязать авто"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE CARS FOR EXISTING OWNER */}
      {isManageCarsOpen && selectedOwner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                  Привязка автопарка
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Автомобили инвестора: {selectedOwner.fullName}
                </h3>
                <p className="text-xs text-slate-400">
                  Отметьте галочками автомобили, принадлежащие этому инвестору. Они будут отображаться в его личном кабинете.
                </p>
              </div>
              <button
                onClick={() => setIsManageCarsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOwnerCars} className="space-y-4 text-xs">
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="text-slate-300 font-bold block mb-0.5">
                    Базовая ставка владельца (₾ / день):
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Применится ко всем привязанным машинам инвестора
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  value={manageDailyRate}
                  onChange={(e) => setManageDailyRate(Number(e.target.value))}
                  className="w-28 bg-slate-900 border border-slate-700 rounded-xl p-2 text-amber-400 font-mono font-black text-center focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Список авто ({manageCarIds.length} выбрано из {data?.fleetCars?.length || 0}):
                  </span>
                  <input
                    type="text"
                    placeholder="Поиск по авто..."
                    value={manageCarSearch}
                    onChange={(e) => setManageCarSearch(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white text-[11px] focus:outline-none focus:border-indigo-500 w-48"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                  {data?.fleetCars
                    ?.filter((c: any) => {
                      if (!manageCarSearch.trim()) return true;
                      const q = manageCarSearch.toLowerCase();
                      return (
                        c.brand.toLowerCase().includes(q) ||
                        c.model.toLowerCase().includes(q) ||
                        c.plateNumber.toLowerCase().includes(q)
                      );
                    })
                    .map((car: any) => {
                      const isSelected = manageCarIds.includes(car.id);
                      const isCurrentlyOtherOwner = car.ownerId && car.ownerId !== selectedOwner.id;

                      return (
                        <div
                          key={car.id}
                          onClick={() => {
                            if (isSelected) {
                              setManageCarIds(manageCarIds.filter((id) => id !== car.id));
                            } else {
                              setManageCarIds([...manageCarIds, car.id]);
                            }
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition select-none ${
                            isSelected
                              ? "bg-indigo-950/40 border-indigo-500/60 text-white"
                              : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-600 bg-slate-800"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="font-bold text-xs">{car.brand} {car.model}</span>
                            <span className="font-mono text-[11px] text-amber-400 font-bold px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800">
                              {car.plateNumber}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-[10px]">
                            <span className="text-slate-400">{car.city?.nameRu || "Батуми"}</span>
                            {isCurrentlyOtherOwner && (
                              <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                                перепривязка
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManageCarsOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black shadow-lg transition"
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить привязку авто"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SHARE INVESTOR ACCESS LINK */}
      {isShareLinkOpen && selectedOwner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                  Изолированный доступ инвестора
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Доступ для {selectedOwner.fullName}
                </h3>
              </div>
              <button
                onClick={() => setIsShareLinkOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 space-y-1">
              <p className="font-bold flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Безопасный изолированный режим:</span>
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Инвестор видит <strong>исключительно свои автомобили</strong> ({cars?.length || 0} шт.), занятость, начисления и историю выплат. Доступ к чужим авто, CRM, кассе, отчетам и руководству компании полностью закрыт.
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1.5 text-xs">
                Персональная ссылка на личный кабинет:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={getOwnerShareUrl()}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-amber-300 font-mono text-xs select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shrink-0 shadow-md ${
                    copiedLink
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-950"
                  }`}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? "Скопировано!" : "Копировать"}</span>
                </button>
              </div>
            </div>

            {/* WhatsApp direct sending */}
            {selectedOwner.phone && (
              <div className="pt-2">
                <a
                  href={`https://wa.me/${selectedOwner.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Здравствуйте, ${selectedOwner.fullName}! Ваш личный кабинет инвестора в автопрокате готов. Здесь вы можете в реальном времени отслеживать занятость ваших автомобилей, начисления и выплаты: ${getOwnerShareUrl()}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  <span>Отправить ссылку в WhatsApp владельцу</span>
                </a>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setIsShareLinkOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OWNER PROFILE & REQUISITES */}
      {isEditProfileOpen && selectedOwner && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                  Личные данные и реквизиты
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  {userRole === "OWNER" ? "Редактирование моих данных" : `Редактирование данных: ${selectedOwner.fullName}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Personal Contacts */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  1. Контактная информация:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      ФИО владельца *
                    </label>
                    <input
                      type="text"
                      required
                      value={profileFullName}
                      onChange={(e) => setProfileFullName(e.target.value)}
                      placeholder="Имя Фамилия"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Основной телефон *
                    </label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+995 500 00-00-00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      WhatsApp для связи
                    </label>
                    <input
                      type="text"
                      value={profileWhatsapp}
                      onChange={(e) => setProfileWhatsapp(e.target.value)}
                      placeholder="+995..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Электронная почта (Email)
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="investor@gmail.com"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Паспорт / Номер ID (для договоров и актов)
                  </label>
                  <input
                    type="text"
                    value={profilePassportNumber}
                    onChange={(e) => setProfilePassportNumber(e.target.value)}
                    placeholder="Серия и номер паспорта / личный номер ID"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Bank Requisites for Payouts */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  2. Реквизиты для перечисления прибыли:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Банк получателя
                    </label>
                    <select
                      value={profileBankName}
                      onChange={(e) => setProfileBankName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="TBC Bank">TBC Bank (Грузия)</option>
                      <option value="Bank of Georgia">Bank of Georgia (BOG)</option>
                      <option value="Liberty Bank">Liberty Bank</option>
                      <option value="Basisbank">Basisbank</option>
                      <option value="Cartu Bank">Cartu Bank</option>
                      <option value="TeraBank">TeraBank</option>
                      <option value="Другой зарубежный счет">Другой зарубежный счет</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Валюта выплаты прибыли
                    </label>
                    <select
                      value={profilePayoutCurrency}
                      onChange={(e) => setProfilePayoutCurrency(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                    >
                      <option value="GEL">₾ GEL (Грузинский Лари)</option>
                      <option value="USD">$ USD (Доллары США)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    IBAN номер счёта (например: GE29TB...)
                  </label>
                  <input
                    type="text"
                    value={profileBankIban}
                    onChange={(e) => setProfileBankIban(e.target.value)}
                    placeholder="GE..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-amber-300 font-mono text-xs font-bold uppercase focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Укажите IBAN вашего счета в грузинском банке для автоматического формирования выплат.
                  </p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Примечания к выплатам / пожелания:
                </label>
                <textarea
                  rows={2}
                  value={profileNotes}
                  onChange={(e) => setProfileNotes(e.target.value)}
                  placeholder="Например: Выплата на счет ИП или до 5 числа каждого месяца..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white text-xs font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl font-black text-xs shadow-lg transition active:scale-95"
                >
                  {isSubmitting ? "Сохранение..." : "💾 Сохранить изменения"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
