import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  Car,
  DollarSign,
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
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const OwnerInvestorCabinet: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [period, setPeriod] = useState<string>("thisMonth"); // "thisMonth", "30days", "all"

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
          currency: selectedOwner.payoutCurrency || "USD",
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

  const { owners, selectedOwner, metrics, cars, bookings, payouts } = data || {};

  return (
    <div className="space-y-6 text-slate-100 print:text-black">
      {/* 1. TOP HEADER & OWNER SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
                Investor & Owner Cabinet
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Управление доходностью парка инвесторов (~80 машин)
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
              <span>Личный кабинет владельца: {selectedOwner?.fullName}</span>
            </h2>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            <button
              onClick={() => {
                setPayoutAmount(metrics?.pendingBalanceUSD || 500);
                setIsRecordPayoutOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              <CreditCard className="w-4 h-4" />
              <span>+ Выплатить инвестору</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
              title="Печать отчета о начислениях / Акт для владельца авто"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Акт-отчет / PDF</span>
            </button>

            <button
              onClick={() => fetchPortalData()}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
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
              Выберите владельца (инвестора):
            </span>
            <select
              value={selectedOwnerId}
              onChange={(e) => handleSelectOwner(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
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
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
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
              <span className="font-bold text-white">{selectedOwner.bankName || "Не указан"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">IBAN / Счет:</span>
              <span className="font-mono font-bold text-amber-300">
                {selectedOwner.bankIban || "Не указан"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">Валюта:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {selectedOwner.payoutCurrency}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. KEY METRICS SCORECARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Earned */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Заработано инвестором
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              ${metrics?.totalOwnerEarningsUSD?.toLocaleString()} USD
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              за {metrics?.totalDaysRented || 0} дней аренды автопарка
            </div>
          </div>
        </div>

        {/* Pending Payout */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              К выплате инвестору
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              ${metrics?.pendingBalanceUSD?.toLocaleString()} USD
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              уже выплачено: ${metrics?.totalPaidOutUSD?.toLocaleString()} USD
            </div>
          </div>
        </div>

        {/* Fleet Count & Live Status */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Автопарк в управлении
            </span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
              {metrics?.totalCarsCount || 0} авто
            </span>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{metrics?.activeRentedCarsNow || 0} в поездке прямо сейчас</span>
            </div>
          </div>
        </div>

        {/* Average Daily Payout Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Средняя ставка владельца
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-purple-300 font-mono tracking-tight">
              ${metrics?.averageDailyRateUSD || 0} USD/сутки
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              средний фиксированный доход за 1 авто-день
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL-TIME FLEET UTILIZATION CARDS (АВТОПАРК ВЛАДЕЛЬЦА В РЕАЛЬНОМ ВРЕМЕНИ) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base text-white">
              Автомобили инвестора и статус сдаваемости в реальном времени
            </h3>
            <p className="text-xs text-slate-400">
              Текущее состояние каждого авто, базовая ставка за день и сдаваемость
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-full font-bold">
            {cars?.length} авто
          </span>
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
                    <span className="text-emerald-400">100% готов</span>
                  </div>
                )}

                {/* Financials & Owner Daily Rate */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                  {/* Utilization in period */}
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Сдаваемость в периоде:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-cyan-300">
                        {car.daysRented} дн. ({car.utilizationRate}%)
                      </span>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Доход этого авто:</span>
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      ${car.earnedUSD} USD
                    </span>
                  </div>

                  {/* Fixed Daily Rate Payable to Owner with Edit Button */}
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ставка владельцу:</span>
                      <span className="font-mono font-black text-amber-400 text-xs">
                        ${car.defaultOwnerDailyRate} USD / сутки
                      </span>
                    </div>
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
            );
          })}
        </div>
      </div>

      {/* 5. BOOKINGS & DETAILED ACCRUALS TABLE WITH RATE OVERRIDE (РЕЕСТР ПОЕЗДОК И НАЧИСЛЕНИЙ) */}
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
                <th className="py-3 px-3 font-bold text-center">Ставка владельца</th>
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
                          ${b.ownerDailyRate} USD / сут.
                        </div>
                        {b.isRateAdjusted && (
                          <span className="text-[9px] bg-purple-950 text-purple-300 border border-purple-500/40 px-1 py-0.2 rounded font-sans">
                            скорректировано (база: ${b.defaultCarRate})
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 text-sm">
                        ${b.ownerTotalPayout} USD
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

      {/* 6. PAYOUTS HISTORY TABLE (ИСТОРИЯ ВЫПЛАТ ИНВЕСТОРУ) */}
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
            Всего выплачено: ${metrics?.totalPaidOutUSD} USD
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
                        : "🪙 Криптовалюта USDT"}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{p.notes || "Выплата дохода от аренды"}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-bold">
                        ✓ Выплачено
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                      ${p.amount.toLocaleString()} {p.currency}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MODAL: EDIT CAR BASE DAILY RATE */}
      {editingCarRate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Базовая ставка владельца
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
                  Фиксированная ставка владельцу за 1 день аренды (USD):
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={newCarBaseRate}
                  onChange={(e) => setNewCarBaseRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono font-black text-lg focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  💡 Эта ставка будет автоматически начисляться владельцу за каждый день аренды этого автомобиля по умолчанию.
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

      {/* 8. MODAL: EDIT SPECIFIC BOOKING RATE (CORRECTION FOR LONG RENTALS) */}
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
                  Базовая ставка авто: <strong>${editingBookingRate.defaultCarRate} USD / сут.</strong>
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Скорректированная ставка за сутки (USD):
                </label>
                <input
                  type="number"
                  min="5"
                  max="500"
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
                  Итоговая сумма к выплате владельцу ($):
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
                  💡 Например, для длинной брони на {editingBookingRate.rentalDays} дн. согласована индивидуальная скидка, и сумма скорректирована.
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

      {/* 9. MODAL: RECORD PAYOUT TO OWNER */}
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
                  {selectedOwner?.bankName} • {selectedOwner?.bankIban}
                </span>
                <span className="text-emerald-400 font-mono font-bold block text-[11px]">
                  Текущий остаток к выплате: ${metrics?.pendingBalanceUSD} USD
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Сумма выплаты ({selectedOwner?.payoutCurrency}):
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
                  <option value="BANK_TRANSFER">🏦 Банковский перевод на IBAN</option>
                  <option value="CASH">💵 Выдача наличных в офисе</option>
                  <option value="CRYPTO">🪙 Перевод USDT TRC20</option>
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
                  placeholder="Выплата за октябрь 2026, п/п #8912..."
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
