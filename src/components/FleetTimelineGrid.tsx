import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  User,
  Phone,
  MapPin,
  X,
  FileText,
  Key,
  Sparkles,
  Info,
  ArrowRight,
  Repeat,
  Compass,
  PlusCircle,
  Share2,
  Send,
  ImageIcon,
  RotateCcw,
} from "lucide-react";
import { NewBookingModal } from "./NewBookingModal";
import { ShareOfferModal } from "./ShareOfferModal";
import { StopUnblockModal } from "./StopUnblockModal";

interface FleetTimelineGridProps {
  onOpenContract?: (booking: any) => void;
  onOpenHandover?: (booking: any) => void;
  onOpenReturn?: (booking: any) => void;
  selectedCity: string;
}

// 3 фирменных контрастных цвета для городов Грузии:
// 🌊 Батуми: яркий морской циан / бирюза
// 🏛️ Тбилиси: теплый терракотово-янтарный / оранжевый
// 🌿 Кутаиси: насыщенный изумрудно-зеленый
export const getCityTheme = (cityCode: string) => {
  switch (cityCode) {
    case "BUS":
      return {
        name: "Батуми",
        icon: "🌊",
        badgeBg: "bg-cyan-950/90 text-cyan-300 border-cyan-400/80 shadow-cyan-950",
        borderL: "border-l-[5px] border-l-cyan-400",
        accentText: "text-cyan-400",
        bgLight: "bg-cyan-950/20",
        tag: "Батуми (BUS)",
      };
    case "TBS":
      return {
        name: "Тбилиси",
        icon: "🏛️",
        badgeBg: "bg-amber-950/90 text-amber-300 border-amber-400/80 shadow-amber-950",
        borderL: "border-l-[5px] border-l-amber-500",
        accentText: "text-amber-400",
        bgLight: "bg-amber-950/20",
        tag: "Тбилиси (TBS)",
      };
    case "KUT":
      return {
        name: "Кутаиси",
        icon: "🌿",
        badgeBg: "bg-emerald-950/90 text-emerald-300 border-emerald-400/80 shadow-emerald-950",
        borderL: "border-l-[5px] border-l-emerald-500",
        accentText: "text-emerald-400",
        bgLight: "bg-emerald-950/20",
        tag: "Кутаиси (KUT)",
      };
    default:
      return {
        name: "Грузия",
        icon: "📍",
        badgeBg: "bg-slate-800 text-slate-300 border-slate-700",
        borderL: "border-l-[5px] border-l-slate-600",
        accentText: "text-slate-400",
        bgLight: "bg-slate-900",
        tag: "Грузия",
      };
  }
};

export const FleetTimelineGrid: React.FC<FleetTimelineGridProps> = ({
  onOpenContract,
  onOpenHandover,
  onOpenReturn,
  selectedCity,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDateOffset, setStartDateOffset] = useState<number>(0);
  const [daysCount, setDaysCount] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // "ALL", "AVAILABLE", "RENTED", "ONE_WAY"
  
  // Selected booking for popup details
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  // New Booking Modal state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [bookingInitialCarId, setBookingInitialCarId] = useState<string>("");
  const [bookingInitialDate, setBookingInitialDate] = useState<string>("");

  const handleOpenNewBooking = (carId?: string, dateStr?: string) => {
    setBookingInitialCarId(carId || "");
    setBookingInitialDate(dateStr || "");
    setIsNewBookingOpen(true);
  };

  // Selection mode for client offer & shareable cards
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [unblockCar, setUnblockCar] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  const toggleCarSelection = (carId: string) => {
    setSelectedCarIds((prev) =>
      prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]
    );
  };

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + startDateOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDateOffset]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const dateStr = baseDate.toISOString().split("T")[0];
      const res = await fetch(
        `/api/fleet/timeline?startDate=${dateStr}&days=${daysCount}&city=${selectedCity}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Error loading timeline:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [startDateOffset, daysCount, selectedCity]);

  const handlePrev = () => setStartDateOffset((prev) => prev - 7);
  const handleNext = () => setStartDateOffset((prev) => prev + 7);
  const handleToday = () => setStartDateOffset(0);

  const filteredCars = useMemo(() => {
    if (!data?.cars) return [];
    return data.cars.filter((car: any) => {
      const matchesSearch =
        car.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "AVAILABLE") return car.status === "AVAILABLE";
      if (statusFilter === "RENTED") return car.status === "RENTED";
      if (statusFilter === "ONE_WAY") {
        return car.bookings.some((b: any) => b.isOneWay);
      }

      return true;
    });
  }, [data?.cars, searchQuery, statusFilter]);

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Car className="w-10 h-10 animate-bounce text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-white text-base">Загрузка шахматки занятости и цветов филиалов...</p>
      </div>
    );
  }

  const days = data?.days || [];
  const stats = data?.stats || { totalCars: 0, rentedToday: 0, availableToday: 0, oneWayActiveCount: 0, occupancyRate: 0 };

  return (
    <div className="space-y-5">
      {/* Top Header & Fleet Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Интерактивная Шахматка
            </span>
            <span className="text-xs text-slate-400">
              Цветовая карта городов: 🏛️ Тбилиси • 🌊 Батуми • 🌿 Кутаиси
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            Календарь занятости & Дислокация автопарка
          </h1>
        </div>

        {/* City Legend Chips in Header for Instant Recognition */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Tbilisi chip */}
          <div className="bg-amber-950/60 border border-amber-500/60 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow">
            <span className="text-sm">🏛️</span>
            <div>
              <span className="font-bold text-amber-300 block text-[11px] leading-tight">Тбилиси (TBS)</span>
              <span className="text-[9px] text-amber-400/80">Оранжевый</span>
            </div>
          </div>

          {/* Batumi chip */}
          <div className="bg-cyan-950/60 border border-cyan-400/60 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow">
            <span className="text-sm">🌊</span>
            <div>
              <span className="font-bold text-cyan-300 block text-[11px] leading-tight">Батуми (BUS)</span>
              <span className="text-[9px] text-cyan-400/80">Бирюзовый</span>
            </div>
          </div>

          {/* Kutaisi chip */}
          <div className="bg-emerald-950/60 border border-emerald-500/60 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 shadow">
            <span className="text-sm">🌿</span>
            <div>
              <span className="font-bold text-emerald-300 block text-[11px] leading-tight">Кутаиси (KUT)</span>
              <span className="text-[9px] text-emerald-400/80">Зеленый</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Navigation, Date jump, Search & Period */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        {/* Date Navigator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrev}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
            title="Назад на 7 дней"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleToday}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              startDateOffset === 0
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Сегодня
          </button>

          <button
            onClick={handleNext}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
            title="Вперед на 7 дней"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-300 font-medium pl-2 hidden sm:inline">
            Период: с {days[0]?.dayNumber} {days[0]?.monthName} по {days[days.length - 1]?.dayNumber} {days[days.length - 1]?.monthName}
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по марке / номеру..."
              className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-36 sm:w-48"
            />
          </div>

          {/* Period length */}
          <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setDaysCount(7)}
              className={`px-2 py-1 rounded-lg transition ${
                daysCount === 7 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              7 дн.
            </button>
            <button
              onClick={() => setDaysCount(14)}
              className={`px-2 py-1 rounded-lg transition ${
                daysCount === 14 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              14 дн.
            </button>
            <button
              onClick={() => setDaysCount(21)}
              className={`px-2 py-1 rounded-lg transition ${
                daysCount === 21 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              21 дн.
            </button>
          </div>

          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Все брони</option>
            <option value="ONE_WAY">⇄ Только One-Way (междугородние)</option>
            <option value="AVAILABLE">Только свободные</option>
            <option value="RENTED">Только в поездке</option>
          </select>

          {/* Selection Mode Button for Client Offer */}
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedCarIds([]);
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              isSelectionMode
                ? "bg-purple-600 text-white font-black shadow-lg ring-2 ring-purple-400"
                : "bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/60 hover:text-white"
            }`}
            title="Отметить автомобили галочками и отправить подборку клиенту в мессенджеры"
          >
            <Share2 className="w-4 h-4" />
            <span>{isSelectionMode ? "Отменить подборку" : "📤 Подборка для клиента"}</span>
          </button>

          {/* New Booking CTA */}
          <button
            onClick={() => handleOpenNewBooking()}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow transition ml-auto sm:ml-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Новая бронь</span>
          </button>
        </div>
      </div>

      {/* TIMELINE GANTT GRID CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px] sm:min-w-[980px]">
            {/* Header row: Cars column + Day columns */}
            <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[240px_1fr] border-b border-slate-800 bg-slate-950 sticky top-0 z-20">
              <div className="p-2 sm:p-3 border-r border-slate-800 font-bold text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider flex items-center justify-between sticky left-0 z-30 bg-slate-950">
                <span className="truncate">Автомобиль</span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">{filteredCars.length} авто</span>
              </div>

              {/* Day headers */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(46px, 1fr))`,
                }}
              >
                {days.map((day: any) => {
                  return (
                    <div
                      key={day.dateStr}
                      className={`p-2 text-center border-r border-slate-800/80 transition-colors ${
                        day.isToday
                          ? "bg-amber-500/15 border-b-2 border-b-amber-500"
                          : day.isWeekend
                          ? "bg-slate-950/90 text-slate-400"
                          : "text-slate-300"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold block opacity-75">
                        {day.weekdayName}
                      </span>
                      <div className="flex items-center justify-center space-x-1 mt-0.5">
                        <span
                          className={`text-sm font-black font-mono ${
                            day.isToday
                              ? "bg-amber-500 text-slate-950 w-6 h-6 rounded-full flex items-center justify-center shadow"
                              : "text-white"
                          }`}
                        >
                          {day.dayNumber}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 block">
                        {day.monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cars Rows */}
            <div className="divide-y divide-slate-800/70">
              {filteredCars.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  Нет автомобилей, соответствующих выбранным фильтрам.
                </div>
              ) : (
                filteredCars.map((car: any) => {
                  const isAvailableNow = car.status === "AVAILABLE";
                  const cityTheme = getCityTheme(car.city.code);
                  const nextCityTheme = car.nextRelocation ? getCityTheme(car.nextRelocation.toCityCode) : null;
                  const isSelected = selectedCarIds.includes(car.id);

                  return (
                    <div
                      key={car.id}
                      onClick={() => {
                        if (isSelectionMode) toggleCarSelection(car.id);
                      }}
                      className={`grid grid-cols-[140px_1fr] sm:grid-cols-[240px_1fr] hover:bg-slate-800/30 transition-colors group ${
                        isSelectionMode ? "cursor-pointer" : ""
                      } ${isSelected ? "bg-purple-950/20" : ""}`}
                    >
                      {/* Left: Car Details & Distinct City Color Border */}
                      <div
                        className={`sticky left-0 z-10 p-2 sm:p-3 border-r border-slate-800 bg-slate-900/95 flex items-center space-x-1.5 sm:space-x-2.5 transition-all ${
                          isSelected ? "bg-purple-950/40 ring-1 ring-purple-500/70" : ""
                        } ${cityTheme.borderL}`}
                      >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleCarSelection(car.id);
                              }}
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded accent-purple-500 cursor-pointer shadow-lg"
                            />
                          </div>
                        )}

                        <div className="flex-1 space-y-1 sm:space-y-1.5 min-w-0">
                          {/* Brand & City badge */}
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-extrabold text-white text-[11px] sm:text-xs truncate max-w-[80px] sm:max-w-[140px]" title={`${car.brand} ${car.model}`}>
                              {car.brand} {car.model}
                            </h4>
                            
                            {/* Prominent City Badge with Distinct Color */}
                            <span
                              className={`text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 rounded font-black border flex items-center space-x-0.5 shrink-0 ${cityTheme.badgeBg}`}
                              title={`Город дислокации: ${cityTheme.name}`}
                            >
                              <span>{cityTheme.icon}</span>
                              <span>{car.city.code}</span>
                            </span>
                          </div>

                          {/* Plate & Status */}
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <span className="text-[9px] sm:text-[11px] font-mono font-bold text-amber-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                              {car.plateNumber}
                            </span>
                            {car.isStopBlocked ? (
                              <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse shadow-sm shadow-red-900">
                                СТОП
                              </span>
                            ) : (
                              <span
                                className={`text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full ${
                                  isAvailableNow
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                    : "bg-red-950 text-red-400 border border-red-500/40"
                                }`}
                              >
                                {isAvailableNow ? "Свободен" : "В аренде"}
                              </span>
                            )}
                          </div>

                          {/* STOP BLOCKED ACTION BANNER */}
                          {car.isStopBlocked && (
                            <div className="bg-red-950/80 border border-red-500/60 rounded-lg p-1.5 sm:p-2 text-[9px] sm:text-[10px] space-y-1 shadow">
                              <p className="text-red-200 font-semibold leading-tight line-clamp-2">
                                ⚠️ {car.stopReason || "Истек техосмотр / страховка"}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUnblockCar(car);
                                }}
                                className="w-full py-0.5 sm:py-1 px-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black rounded text-[9px] sm:text-[10px] shadow transition active:scale-95 flex items-center justify-center space-x-1"
                              >
                                <span>Продлить и снять со СТОПа</span>
                              </button>
                            </div>
                          )}

                          {/* Relocation indicator or Subtitle */}
                          {car.nextRelocation && nextCityTheme ? (
                            <div
                              className={`border px-1.5 py-0.5 rounded text-[9px] flex items-center space-x-1 font-bold ${nextCityTheme.badgeBg}`}
                            >
                              <span>{nextCityTheme.icon}</span>
                              <span className="truncate">
                                С {car.nextRelocation.date}: {car.nextRelocation.toCityCode}
                              </span>
                            </div>
                          ) : (
                            <span className="hidden sm:flex text-[10px] text-slate-500 items-center space-x-1">
                              <span>{cityTheme.icon}</span>
                              <span>Базирование: {cityTheme.name}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Days Timeline with Booking Bars */}
                      <div className="relative h-20 sm:h-24 overflow-hidden bg-slate-950/40">
                        {/* Day vertical grid lines & clickable slots */}
                        <div
                          className="grid h-full absolute inset-0"
                          style={{
                            gridTemplateColumns: `repeat(${days.length}, minmax(46px, 1fr))`,
                          }}
                        >
                          {days.map((day: any) => (
                            <div
                              key={day.dateStr}
                              onClick={() => handleOpenNewBooking(car.id, day.dateStr)}
                              title={`Создать бронь для ${car.brand} ${car.model} с ${day.dateStr}`}
                              className={`border-r border-slate-800/60 h-full cursor-pointer hover:bg-amber-500/10 transition-colors group relative ${
                                day.isToday
                                  ? "bg-amber-500/5"
                                  : day.isWeekend
                                  ? "bg-slate-900/30"
                                  : ""
                              }`}
                            />
                          ))}
                        </div>

                        {/* Booking Bars */}
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                          {car.bookings.map((booking: any) => {
                            const bStart = new Date(booking.startDate);
                            const bEnd = new Date(booking.endDate);
                            const firstDayTimestamp = days[0]?.timestamp;
                            const msPerDay = 24 * 60 * 60 * 1000;

                            const startDiffDays =
                              (bStart.getTime() - firstDayTimestamp) / msPerDay;
                            const endDiffDays =
                              (bEnd.getTime() - firstDayTimestamp) / msPerDay;

                            const visibleStart = Math.max(0, startDiffDays);
                            const visibleEnd = Math.min(days.length, endDiffDays);

                            if (visibleEnd < 0 || visibleStart >= days.length) {
                              return null;
                            }

                            const leftPercent = (visibleStart / days.length) * 100;
                            const widthPercent =
                              Math.max(1, ((visibleEnd - visibleStart) / days.length) * 100);

                            const isActive = booking.status === "ACTIVE";
                            const isPreparing = booking.status === "PREPARING";
                            const isOneWay = booking.isOneWay;

                            let barStyle = "bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400 text-white shadow-blue-900/40";
                            
                            if (isOneWay) {
                              if (isActive) {
                                barStyle = "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-800 border-2 border-fuchsia-300 text-white shadow-lg shadow-fuchsia-900/50 animate-pulse-subtle";
                              } else {
                                barStyle = "bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 border border-purple-400 text-white shadow-md shadow-purple-950";
                              }
                            } else if (isActive) {
                              barStyle = "bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400 text-white shadow-emerald-900/40";
                            } else if (isPreparing) {
                              barStyle = "bg-gradient-to-r from-amber-600 to-orange-700 border-amber-400 text-white shadow-amber-900/40";
                            }

                            return (
                              <div
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className={`absolute h-16 rounded-xl p-2 cursor-pointer pointer-events-auto transition-all hover:scale-[1.02] hover:z-30 flex flex-col justify-between overflow-hidden ${barStyle}`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold leading-tight">
                                  <span className="truncate max-w-[75%] flex items-center space-x-1">
                                    {booking.isSelfServiceBooking && <span title="Забронировано через VIP приложение">📱</span>}
                                    <span className="truncate">{booking.customer.fullName}</span>
                                  </span>
                                  <span className="font-mono font-black">${booking.totalAmount}</span>
                                </div>

                                {/* Route info badge on the bar */}
                                {isOneWay ? (
                                  <div className="bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-black flex items-center space-x-1.5 self-start text-amber-200 border border-amber-300/30">
                                    <Repeat className="w-3 h-3 text-amber-300 animate-spin-slow" />
                                    <span>
                                      {booking.fromCityCode} ➔ {booking.toCityCode} ({booking.toCityName})
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] opacity-85 truncate">
                                    {isActive ? "🚗 В поездке" : isPreparing ? "🧼 Подготовка" : "📅 Локальная бронь"}
                                  </div>
                                )}

                                <div className="flex items-center justify-between text-[9px] opacity-80 leading-none">
                                  <span className="font-mono">{booking.bookingNumber}</span>
                                  <span>{booking.rentalDays} дн.</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Extended Legend: Cities and Trip Types */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
        {/* Row 1: City Colors */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-800 pb-2.5">
          <span className="font-extrabold text-white uppercase text-[11px] tracking-wider">Цвета городов дислокации:</span>

          <div className="flex items-center space-x-1.5 bg-amber-950/60 border border-amber-500/50 px-2.5 py-1 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-amber-500 shadow" />
            <span className="font-bold text-amber-300">🏛️ Тбилиси (TBS) — Янтарно-оранжевый</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-cyan-950/60 border border-cyan-400/50 px-2.5 py-1 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-cyan-400 shadow" />
            <span className="font-bold text-cyan-300">🌊 Батуми (BUS) — Морской бирюзовый</span>
          </div>

          <div className="flex items-center space-x-1.5 bg-emerald-950/60 border border-emerald-500/50 px-2.5 py-1 rounded-lg">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow" />
            <span className="font-bold text-emerald-300">🌿 Кутаиси (KUT) — Изумрудно-зеленый</span>
          </div>
        </div>

        {/* Row 2: Trip Statuses */}
        <div className="flex flex-wrap items-center justify-between text-slate-300 gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-extrabold text-white uppercase text-[11px] tracking-wider">Статусы поездок:</span>
            
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-fuchsia-600 to-purple-600 border border-fuchsia-300" />
              <span className="font-bold text-fuchsia-300">В пути между городами (One-Way)</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-purple-700 border border-purple-400" />
              <span className="text-purple-300">Бронь со сдачей в другом городе</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Выдан клиенту (локально)</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Локальная бронь</span>
            </div>
          </div>

          <div className="text-[11px] text-amber-400/90 flex items-center space-x-1">
            <Compass className="w-3.5 h-3.5" />
            <span>При One-Way брони цвет карточки авто после даты сдачи изменится на цвет нового города</span>
          </div>
        </div>
      </div>

      {/* Booking Quick View Popup Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded border ${
                      selectedBooking.isOneWay
                        ? "bg-purple-950/80 text-purple-300 border-purple-500/50"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {selectedBooking.isOneWay ? "⇄ МЕЖДУГОРОДНЯЯ (ONE-WAY)" : "ЛОКАЛЬНАЯ АРЕНДА"}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {selectedBooking.bookingNumber}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedBooking.car?.brand} {selectedBooking.car?.model} ({selectedBooking.car?.plateNumber})
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* One-Way Logistical Route Banner */}
            {selectedBooking.isOneWay && (
              <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 p-3.5 rounded-xl border border-purple-500/40 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-purple-200">
                  <span className="flex items-center space-x-1.5">
                    <Repeat className="w-4 h-4 text-purple-400" />
                    <span>Перемещение авто между филиалами:</span>
                  </span>
                  <span className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded font-mono text-[10px]">
                    Сбор One-Way: ${selectedBooking.deliveryFee}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-sm font-black text-white pt-1">
                  <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800">
                    {selectedBooking.fromCityName} ({selectedBooking.fromCityCode})
                  </span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                  <span className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-amber-300">
                    {selectedBooking.toCityName} ({selectedBooking.toCityCode})
                  </span>
                </div>
                <p className="text-[11px] text-purple-300/80 pt-1">
                  ⚠️ <strong>Внимание при планировании:</strong> С {new Date(selectedBooking.endDate).toLocaleDateString("ru-RU")} этот автомобиль будет находиться в филиале <strong>{selectedBooking.toCityName}</strong> и доступен для выдачи только там.
                </p>
              </div>
            )}

            {/* Content */}
            <div className="space-y-3 text-xs">
              {/* Customer */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-amber-400" />
                    <span>{selectedBooking.customer.fullName}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedBooking.customer.phone}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Паспорт: {selectedBooking.customer.passportNumber} • Права: {selectedBooking.customer.driverLicenseNumber}
                </p>
              </div>

              {/* Dates & Place */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Выдача ({selectedBooking.fromCityName}):</span>
                  <span className="font-bold text-white">
                    {new Date(selectedBooking.startDate).toLocaleDateString("ru-RU")}{" "}
                    {new Date(selectedBooking.startDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 truncate">
                    {selectedBooking.pickupLocation?.name}
                  </span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Возврат ({selectedBooking.toCityName}):</span>
                  <span className="font-bold text-white">
                    {new Date(selectedBooking.endDate).toLocaleDateString("ru-RU")}{" "}
                    {new Date(selectedBooking.endDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1 truncate">
                    {selectedBooking.returnLocation?.name}
                  </span>
                </div>
              </div>

              {/* Actual Handover & Return Details */}
              {(selectedBooking.actualHandoverAt || selectedBooking.handoverReport) && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center justify-between text-emerald-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Фактическая выдача:</span>
                    </span>
                    <span className="font-mono">
                      {new Date(selectedBooking.actualHandoverAt || selectedBooking.handoverReport?.handedOverAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {selectedBooking.handoverReport?.expectedReturnTime && (
                    <div className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>Согласованное время сдачи:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {selectedBooking.handoverReport.expectedReturnTime}
                      </span>
                    </div>
                  )}
                  {selectedBooking.handoverReport?.managerName && (
                    <div className="text-[10px] text-slate-400">
                      Менеджер выдачи: {selectedBooking.handoverReport.managerName}
                    </div>
                  )}
                </div>
              )}

              {/* Price summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 block text-[10px]">Стоимость аренды:</span>
                  <span className="text-lg font-black text-amber-400 font-mono">
                    ${selectedBooking.totalAmount} USD
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Депозит:</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    ${selectedBooking.depositAmount} USD
                  </span>
                </div>
              </div>

              {/* Overdue No-Show Warning */}
              {selectedBooking.status !== "ACTIVE" &&
                selectedBooking.status !== "COMPLETED" &&
                selectedBooking.status !== "CANCELLED" &&
                !selectedBooking.actualHandoverAt &&
                !selectedBooking.overdueDecision &&
                new Date(selectedBooking.startDate).getTime() <= Date.now() - 3 * 60 * 60 * 1000 && (
                  <div className="bg-rose-950/80 border-2 border-rose-500 rounded-xl p-3 space-y-2 text-white">
                    <div className="flex items-center space-x-1.5 text-rose-300 text-xs font-black">
                      <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
                      <span>Неявка клиента более 3 часов! Выдача не зафиксирована.</span>
                    </div>
                    <p className="text-[11px] text-rose-200">
                      Оставляем эту бронь или снимаем с автомобиля, чтобы освободить его для других клиентов?
                    </p>
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-rose-500/40">
                      <button
                        onClick={async () => {
                          if (confirm(`Снять бронь № ${selectedBooking.bookingNumber} с автомобиля?`)) {
                            await fetch(`/api/bookings/${selectedBooking.id}/overdue-decision`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ decision: "CANCEL" }),
                            });
                            setSelectedBooking(null);
                            fetchTimeline();
                          }
                        }}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow transition active:scale-95"
                      >
                        Снять с авто
                      </button>
                      <button
                        onClick={async () => {
                          const notes =
                            prompt("Причина сохранения брони:", "Клиент задерживается") ||
                            "Клиент задерживается";
                          await fetch(`/api/bookings/${selectedBooking.id}/overdue-decision`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ decision: "KEEP", notes }),
                          });
                          setSelectedBooking(null);
                          fetchTimeline();
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition active:scale-95"
                      >
                        Оставить бронь
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
              {onOpenContract && (
                <button
                  onClick={() => {
                    onOpenContract(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Договор</span>
                </button>
              )}

              {onOpenHandover && selectedBooking.status !== "ACTIVE" && (
                <button
                  onClick={() => {
                    onOpenHandover(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Выдать авто</span>
                </button>
              )}

              {onOpenReturn && (selectedBooking.status === "ACTIVE" || selectedBooking.handoverReport) && (
                <button
                  onClick={() => {
                    onOpenReturn(selectedBooking);
                    setSelectedBooking(null);
                  }}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow transition active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Принять возврат авто</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Booking Modal with Cross-City Relocation Warning */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onBookingCreated={() => fetchTimeline()}
        initialCarId={bookingInitialCarId}
        initialDate={bookingInitialDate}
      />

      {/* Floating Action Bar for Client Offer Selection Mode */}
      {isSelectionMode && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-slate-900/95 border-2 border-purple-500 rounded-2xl px-6 py-3.5 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-mono font-black text-xs shadow">
              {selectedCarIds.length}
            </span>
            <span>авто выбрано для клиента</span>
          </div>

          <button
            onClick={() => {
              if (selectedCarIds.length > 0) setIsShareModalOpen(true);
            }}
            disabled={selectedCarIds.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition active:scale-95 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            <span>Поделиться (WhatsApp / Telegram / Instagram)</span>
          </button>

          <button
            onClick={() => {
              const freeCarIds = filteredCars.filter((c: any) => c.status === "AVAILABLE").map((c: any) => c.id);
              setSelectedCarIds(freeCarIds);
            }}
            className="text-xs text-purple-300 hover:text-white px-2 py-1 font-semibold"
          >
            Выбрать все свободные
          </button>

          <button
            onClick={() => setSelectedCarIds([])}
            className="text-xs text-slate-400 hover:text-white px-2 py-1"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Share Offer Modal */}
      {isShareModalOpen && (
        <ShareOfferModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          selectedCars={filteredCars.filter((c: any) => selectedCarIds.includes(c.id))}
        />
      )}

      {/* Stop Unblock Modal */}
      {unblockCar && (
        <StopUnblockModal
          isOpen={!!unblockCar}
          onClose={() => setUnblockCar(null)}
          car={unblockCar}
          onUnblocked={() => {
            setUnblockCar(null);
            fetchTimeline();
          }}
        />
      )}
    </div>
  );
};
