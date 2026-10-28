"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Calendar,
  Car,
  User,
  Phone,
  FileText,
  Edit3,
  MapPin,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  TrendingUp,
  DollarSign,
  Key,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface BookingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars?: any[];
  onSelectBooking?: (booking: any) => void;
  onEditBooking?: (booking: any) => void;
  onOpenContract?: (booking: any) => void;
  onOpenHandover?: (booking: any) => void;
  onOpenReturn?: (booking: any) => void;
  onOpenCustomerDossier?: (customer: any, bookingId?: string) => void;
  onOpenDocsUpload?: (customer: any, bookingId?: string, bookingNumber?: string) => void;
}

export const BookingHistoryModal: React.FC<BookingHistoryModalProps> = ({
  isOpen,
  onClose,
  cars = [],
  onSelectBooking,
  onEditBooking,
  onOpenContract,
  onOpenHandover,
  onOpenReturn,
  onOpenCustomerDossier,
  onOpenDocsUpload,
}) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [selectedCarFilter, setSelectedCarFilter] = useState<string>("ALL");
  const [selectedBookingForPreview, setSelectedBookingForPreview] = useState<any | null>(null);

  // Fetch all bookings sorted newest first
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/bookings?order=desc");
      const json = await res.json();
      if (json.success && Array.isArray(json.bookings)) {
        setBookings(json.bookings);
      }
    } catch (err) {
      console.error("Error fetching bookings archive:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen]);

  // Status counters for tab badges
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: bookings.length,
      COMPLETED: 0,
      ACTIVE: 0,
      CONFIRMED: 0,
      CANCELLED: 0,
    };
    bookings.forEach((b) => {
      const st = b.status?.toUpperCase();
      if (st === "COMPLETED") counts.COMPLETED++;
      else if (st === "ACTIVE") counts.ACTIVE++;
      else if (st === "CONFIRMED" || st === "PREPARING") counts.CONFIRMED++;
      else if (st === "CANCELLED") counts.CANCELLED++;
    });
    return counts;
  }, [bookings]);

  // Filtered list
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Status filter
      if (statusFilter !== "ALL") {
        const st = b.status?.toUpperCase();
        if (statusFilter === "CONFIRMED") {
          if (st !== "CONFIRMED" && st !== "PREPARING") return false;
        } else if (st !== statusFilter) {
          return false;
        }
      }

      // City filter
      if (cityFilter !== "ALL") {
        const carCity = b.car?.city?.code || "";
        const pickupCity = b.pickupLocation?.city?.code || "";
        if (carCity !== cityFilter && pickupCity !== cityFilter) {
          return false;
        }
      }

      // Car filter
      if (selectedCarFilter !== "ALL" && b.carId !== selectedCarFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const bNum = (b.bookingNumber || "").toLowerCase();
        const cName = (b.customer?.fullName || "").toLowerCase();
        const cPhone = (b.customer?.phone || "").toLowerCase();
        const cPlate = (b.car?.plateNumber || "").toLowerCase();
        const cBrand = (b.car?.brand || "").toLowerCase();
        const cModel = (b.car?.model || "").toLowerCase();
        const pLoc = (b.pickupLocation?.name || "").toLowerCase();
        const rLoc = (b.returnLocation?.name || "").toLowerCase();

        const match =
          bNum.includes(q) ||
          cName.includes(q) ||
          cPhone.includes(q) ||
          cPlate.includes(q) ||
          cBrand.includes(q) ||
          cModel.includes(q) ||
          pLoc.includes(q) ||
          rLoc.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [bookings, statusFilter, cityFilter, selectedCarFilter, searchQuery]);

  // KPI Metrics on filtered results
  const metrics = useMemo(() => {
    const totalCount = filteredBookings.length;
    let totalRevenue = 0;
    let totalDays = 0;

    filteredBookings.forEach((b) => {
      if (b.status !== "CANCELLED") {
        totalRevenue += Number(b.totalAmount || b.rentalTotal || 0);
        totalDays += Number(b.rentalDays || 1);
      }
    });

    const avgCheck = totalCount > 0 ? Math.round(totalRevenue / totalCount) : 0;
    const avgDays = totalCount > 0 ? (totalDays / totalCount).toFixed(1) : "0";

    return { totalCount, totalRevenue, avgCheck, avgDays };
  }, [filteredBookings]);

  if (!isOpen) return null;

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "COMPLETED":
        return {
          label: "Завершена",
          bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          dot: "bg-emerald-400",
        };
      case "ACTIVE":
        return {
          label: "В поездке",
          bg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
          dot: "bg-blue-400 animate-pulse",
        };
      case "PREPARING":
        return {
          label: "Подготовка",
          bg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
          dot: "bg-purple-400",
        };
      case "CONFIRMED":
        return {
          label: "Ожидает",
          bg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          dot: "bg-amber-400",
        };
      case "CANCELLED":
        return {
          label: "Отменена",
          bg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
          dot: "bg-rose-400",
        };
      default:
        return {
          label: status || "Черновик",
          bg: "bg-slate-700/50 text-slate-300 border-slate-600",
          dot: "bg-slate-400",
        };
    }
  };

  const getCityBadge = (code?: string) => {
    switch (code) {
      case "BUS":
        return { name: "Батуми", color: "bg-blue-900/60 text-blue-300 border-blue-600/40" };
      case "TBS":
        return { name: "Тбилиси", color: "bg-purple-900/60 text-purple-300 border-purple-600/40" };
      case "KUT":
        return { name: "Кутаиси", color: "bg-emerald-900/60 text-emerald-300 border-emerald-600/40" };
      default:
        return { name: code || "Грузия", color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl my-auto max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/30 rounded-2xl text-amber-400 shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  История бронирований
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Архив и Журнал
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Полный реестр завершённых, текущих и архивных заказов со всеми деталями
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchBookings}
              disabled={loading}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition"
              title="Обновить список"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl border border-slate-700 transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-medium">Найдено броней</div>
              <div className="text-lg font-black text-white">{metrics.totalCount}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-medium">Оборот по выборке</div>
              <div className="text-lg font-black text-emerald-400">
                {metrics.totalRevenue.toLocaleString("ru-RU")} ₾
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-medium">Средний чек</div>
              <div className="text-lg font-black text-amber-300">
                {metrics.avgCheck.toLocaleString("ru-RU")} ₾
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center space-x-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px] font-medium">Средний срок</div>
              <div className="text-lg font-black text-purple-300">{metrics.avgDays} сут.</div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 space-y-3">
          {/* Top row: Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold overflow-x-auto pb-1">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                statusFilter === "ALL"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60"
              }`}
            >
              <span>Все</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {statusCounts.ALL}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("COMPLETED")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                statusFilter === "COMPLETED"
                  ? "bg-emerald-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-800/80 text-emerald-400 hover:bg-slate-800 border border-slate-700/60"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Завершённые</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {statusCounts.COMPLETED}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                statusFilter === "ACTIVE"
                  ? "bg-blue-500 text-slate-950 font-black shadow-md"
                  : "bg-slate-800/80 text-blue-400 hover:bg-slate-800 border border-slate-700/60"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>В поездке</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {statusCounts.ACTIVE}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("CONFIRMED")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                statusFilter === "CONFIRMED"
                  ? "bg-amber-400 text-slate-950 font-black shadow-md"
                  : "bg-slate-800/80 text-amber-400 hover:bg-slate-800 border border-slate-700/60"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Ожидают выдачи</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {statusCounts.CONFIRMED}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("CANCELLED")}
              className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                statusFilter === "CANCELLED"
                  ? "bg-rose-500 text-white font-black shadow-md"
                  : "bg-slate-800/80 text-rose-400 hover:bg-slate-800 border border-slate-700/60"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Отменённые</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {statusCounts.CANCELLED}
              </span>
            </button>
          </div>

          {/* Bottom row: Search + City + Car selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по клиенту, телефону, госномеру, марке авто или номеру брони..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* City Filter */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">📍 Все города</option>
              <option value="BUS">📍 Батуми</option>
              <option value="TBS">📍 Тбилиси</option>
              <option value="KUT">📍 Кутаиси</option>
            </select>

            {/* Car Filter */}
            {cars.length > 0 && (
              <select
                value={selectedCarFilter}
                onChange={(e) => setSelectedCarFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-[200px]"
              >
                <option value="ALL">🚗 Все автомобили</option>
                {cars.map((car: any) => (
                  <option key={car.id} value={car.id}>
                    {car.brand} {car.model} ({car.plateNumber})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Bookings Content List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
              <p className="text-sm font-semibold">Загрузка журнала бронирований...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-slate-800/60 rounded-3xl border border-slate-700 mb-3 text-slate-500">
                <Clock className="w-10 h-10" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Бронирований не найдено</h3>
              <p className="text-xs text-slate-400 max-w-md">
                По выбранным фильтрам или поисковому запросу ничего не найдено. Попробуйте сбросить фильтры.
              </p>
              {(searchQuery || statusFilter !== "ALL" || cityFilter !== "ALL" || selectedCarFilter !== "ALL") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                    setCityFilter("ALL");
                    setSelectedCarFilter("ALL");
                  }}
                  className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition"
                >
                  Сбросить все фильтры
                </button>
              )}
            </div>
          ) : (
            filteredBookings.map((b) => {
              const statusInfo = getStatusBadge(b.status);
              const carCityInfo = getCityBadge(b.car?.city?.code);
              const isOneWay =
                b.pickupLocation?.city?.code &&
                b.returnLocation?.city?.code &&
                b.pickupLocation?.city?.code !== b.returnLocation?.city?.code;

              const startDateStr = new Date(b.startDate).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const endDateStr = new Date(b.endDate).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={b.id}
                  className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 shadow-md group"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left block: Booking ID, Car & Client Info */}
                    <div className="space-y-2 flex-1">
                      {/* Top sub-row: ID, Status, One-Way badge */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                          {b.bookingNumber}
                        </span>

                        <span
                          className={`flex items-center space-x-1.5 text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusInfo.bg}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>

                        {isOneWay && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center space-x-1">
                            <span>⇄ One-Way</span>
                          </span>
                        )}

                        <span className="text-[11px] text-slate-500 ml-auto lg:ml-0">
                          Создана: {new Date(b.createdAt).toLocaleDateString("ru-RU")}
                        </span>
                      </div>

                      {/* Main details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                        
                        {/* Car details */}
                        <div className="flex items-start space-x-2.5">
                          <div className="p-2 bg-slate-800 text-amber-400 rounded-xl border border-slate-700 mt-0.5">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white flex items-center space-x-1.5">
                              <span>
                                {b.car?.brand} {b.car?.model}
                              </span>
                              {b.car?.year && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({b.car.year})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5 text-xs">
                              <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300 text-[11px]">
                                {b.car?.plateNumber || "Без номера"}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${carCityInfo.color}`}>
                                {carCityInfo.name}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Customer details */}
                        <div className="flex items-start space-x-2.5">
                          <div className="p-2 bg-slate-800 text-blue-400 rounded-xl border border-slate-700 mt-0.5">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            {b.customer ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (onOpenCustomerDossier) {
                                      onOpenCustomerDossier(b.customer, b.id);
                                    }
                                  }}
                                  className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center space-x-1 text-left"
                                  title="Открыть досье клиента"
                                >
                                  <span>{b.customer.fullName}</span>
                                  <ExternalLink className="w-3 h-3 inline opacity-70" />
                                </button>
                                <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <a
                                    href={`tel:${b.customer.phone}`}
                                    className="hover:text-white transition"
                                  >
                                    {b.customer.phone}
                                  </a>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-slate-400 italic">Клиент не привязан</div>
                            )}
                          </div>
                        </div>

                        {/* Dates & Route */}
                        <div className="flex items-start space-x-2.5">
                          <div className="p-2 bg-slate-800 text-purple-400 rounded-xl border border-slate-700 mt-0.5">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center space-x-1">
                              <span>{startDateStr}</span>
                              <ArrowRight className="w-3 h-3 text-slate-500" />
                              <span>{endDateStr}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Срок: <strong className="text-purple-300">{b.rentalDays} сут.</strong>
                              {" • "}
                              {b.pickupLocation?.city?.name || "Батуми"} → {b.returnLocation?.city?.name || "Батуми"}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right block: Financials & Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between border-t lg:border-t-0 border-slate-800/80 pt-3 lg:pt-0 gap-3">
                      
                      {/* Price & Deposit tag */}
                      <div className="lg:text-right">
                        <div className="text-xs text-slate-400">Стоимость аренды</div>
                        <div className="text-lg font-black text-emerald-400 tracking-tight">
                          {(b.totalAmount || b.rentalTotal || 0).toLocaleString("ru-RU")} ₾
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {b.dailyRate} ₾/сут • Залог: {b.depositAmount || 0} ₾
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Edit Booking */}
                        <button
                          onClick={() => {
                            if (onEditBooking) {
                              onEditBooking(b);
                            } else if (onSelectBooking) {
                              onSelectBooking(b);
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 active:scale-95 shadow"
                          title="Редактировать бронь, даты и автомобиль"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Карточка / Изменить</span>
                        </button>

                        {/* Contract */}
                        {onOpenContract && (
                          <button
                            onClick={() => onOpenContract(b)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 active:scale-95 shadow"
                            title="Сформировать и распечатать договор"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>Договор</span>
                          </button>
                        )}

                        {/* Customer Dossier */}
                        {onOpenCustomerDossier && b.customer && (
                          <button
                            onClick={() => onOpenCustomerDossier(b.customer, b.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1 active:scale-95 shadow"
                            title="Открыть досье клиента"
                          >
                            <User className="w-3.5 h-3.5 text-blue-400" />
                            <span>Досье</span>
                          </button>
                        )}

                        {/* Handover action if waiting */}
                        {onOpenHandover && (b.status === "CONFIRMED" || b.status === "PREPARING") && (
                          <button
                            onClick={() => onOpenHandover(b)}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs shadow transition active:scale-95 flex items-center space-x-1"
                            title="Выдать автомобиль клиенту"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Выдать</span>
                          </button>
                        )}

                        {/* Return action if active */}
                        {onOpenReturn && (b.status === "ACTIVE" || b.handoverReport) && (
                          <button
                            onClick={() => onOpenReturn(b)}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow transition active:scale-95 flex items-center space-x-1"
                            title="Принять возврат автомобиля"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Принять возврат</span>
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Показано: <strong>{filteredBookings.length}</strong> из {bookings.length} записей</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition active:scale-95"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
