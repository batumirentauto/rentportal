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
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

const EXPENSE_CATEGORIES: { id: string; label: string; icon: string; desc: string }[] = [
  { id: "MAINTENANCE", label: "ТО / Замена масла и фильтров", icon: "🛠️", desc: "Регулярное ТО, масло 5W30/0W20, фильтры" },
  { id: "INSURANCE", label: "Страховка КАСКО / ОСАГО", icon: "🛡️", desc: "Годовой полис, франшиза, продление" },
  { id: "PTI_INSPECTION", label: "Техосмотр PTI (гостехосмотр)", icon: "📋", desc: "Официальный техосмотр Грузии" },
  { id: "REPAIRS", label: "Ремонт деталей / СТО / Ходовая", icon: "⚙️", desc: "Колодки, подвеска, электрика, двигатель" },
  { id: "TIRES", label: "Шины и шиномонтаж", icon: "🛞", desc: "Сезонный комплект, балансировка, переобувка" },
  { id: "WASHING", label: "Химчистка / Детейлинг / Мойка", icon: "🧼", desc: "Глубокая очистка салона перед сдачей" },
  { id: "OTHER", label: "Прочие расходы инвестора", icon: "📦", desc: "Аксессуары, ключи, эвакуатор, парковка" },
];

export const OwnerInvestorCabinet: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
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
  const [payoutNotes, setPayoutNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchPortalData = async (ownerId?: string) => {
    setLoading(true);
    try {
      const idToFetch = ownerId || selectedOwnerId;
      const url = `/api/owners/portal?ownerId=${idToFetch || ""}&period=${period}`;
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
  }, [selectedOwnerId, period]);

  // Handle Owner Switcher
  const handleSelectOwner = (id: string) => {
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
              <span>{selectedOwner?.fullName}</span>
            </h2>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Primary Action: Add Expense */}
            <button
              onClick={() => {
                setExpenseCarId(cars?.[0]?.id || "");
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-rose-600 via-amber-600 to-orange-500 hover:from-rose-500 hover:to-orange-400 text-white rounded-xl text-xs font-extrabold shadow-lg transition active:scale-95"
            >
              <Wrench className="w-4 h-4" />
              <span>+ Внести расход на авто</span>
            </button>

            {/* Payout to Investor */}
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
          </div>
        </div>

        {/* Owner Selector & Period Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Owner Switcher */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Выберите владельца автомобиля:
            </span>
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
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-black text-slate-950 text-base shadow">
              {selectedOwner.fullName.charAt(0)}
            </div>
            <div>
              <span className="font-extrabold text-white text-sm block">
                {selectedOwner.fullName}
              </span>
              <p className="text-slate-400 text-[11px]">
                Тел: {selectedOwner.phone} {selectedOwner.email && `• ${selectedOwner.email}`}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-500 block">Банк для выплат:</span>
              <span className="font-bold text-white">{selectedOwner.bankName || "TBC Bank / Bank of Georgia"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">IBAN / Счет:</span>
              <span className="font-mono font-bold text-amber-300">
                {selectedOwner.bankIban || "GE... (уточняется)"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Основная валюта:</span>
              <span className="font-bold text-emerald-400 font-mono">
                ₾ GEL (Грузинский Лари)
              </span>
            </div>
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
              за {metrics?.totalDaysRented || 0} дней аренды автопарка
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
              Доход от аренды минус расходы на авто
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
          <span>📅 Начисления по арендам ({bookings?.length || 0})</span>
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
            <button
              onClick={() => {
                setExpenseCarId(cars?.[0]?.id || "");
                setIsAddExpenseOpen(true);
              }}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 rounded-xl text-xs font-bold self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Записать расход на авто</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cars?.map((car: any) => {
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
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
            <div className="flex items-center space-x-3">
              <span className="text-xs text-rose-300 font-mono font-bold">
                Сумма расходов: {metrics?.totalOwnerExpensesGEL?.toLocaleString()} ₾
              </span>
              <button
                onClick={() => {
                  setExpenseCarId(cars?.[0]?.id || "");
                  setIsAddExpenseOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-lg transition"
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
                Прозрачный расчет по каждому дню аренды с возможностью корректировки ставки на длинные брони
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Всего поездок: <strong className="text-white">{bookings?.length}</strong>
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

                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                          {b.ownerTotalPayout} ₾
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
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
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg transition"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
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
    </div>
  );
};
