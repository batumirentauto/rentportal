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
  ArrowUp,
  ArrowDown,
  Repeat,
  Compass,
  PlusCircle,
  Share2,
  Send,
  ImageIcon,
  RotateCcw,
  Edit3,
  Database,
  Users,
  DollarSign,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  Minimize2,
  Coins,
  Download,
  Printer,
} from "lucide-react";
import { downloadDocument, downloadAllCustomerDocuments } from "@/lib/downloadDocument";
import { ContractModal } from "./ContractModal";
import { NewBookingModal } from "./NewBookingModal";
import { ShareOfferModal } from "./ShareOfferModal";
import { StopUnblockModal } from "./StopUnblockModal";
import { CarDetailsModal } from "./CarDetailsModal";
import { NewCarModal } from "./NewCarModal";
import { AvailabilitySearchModal } from "./AvailabilitySearchModal";
import { CustomerDocumentUploadModal } from "./CustomerDocumentUploadModal";
import { CustomerDossierModal } from "./CustomerDossierModal";
import { EditBookingModal } from "./EditBookingModal";
import { FleetCityDistributorModal } from "./FleetCityDistributorModal";
import { DatabaseBackupModal } from "./DatabaseBackupModal";
import { BookingHistoryModal } from "./BookingHistoryModal";
import { BookingRefundModal } from "./BookingRefundModal";
import { BookingExtensionModal } from "./BookingExtensionModal";
import { AdditionalDriversModal } from "./AdditionalDriversModal";
import { CarSwapModal } from "./CarSwapModal";

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
  const [gridMode, setGridMode] = useState<"LIVE" | "ARCHIVE">("LIVE");
  const [currentStartDate, setCurrentStartDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [daysCount, setDaysCount] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // "ALL", "COMPLETED", "AVAILABLE", "RENTED", "ONE_WAY"
  const [timelineError, setTimelineError] = useState<string | null>(null);
  
  // Selected booking for popup details
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isDocsUploadModalOpen, setIsDocsUploadModalOpen] = useState<boolean>(false);
  const [isCustomerDossierOpen, setIsCustomerDossierOpen] = useState<boolean>(false);
  const [isEditBookingOpen, setIsEditBookingOpen] = useState<boolean>(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState<boolean>(false);
  const [isCarSwapModalOpen, setIsCarSwapModalOpen] = useState<boolean>(false);
  const [isAdditionalDriversModalOpen, setIsAdditionalDriversModalOpen] = useState<boolean>(false);
  const [internalContractBooking, setInternalContractBooking] = useState<any | null>(null);
  const [copiedPopupPhone, setCopiedPopupPhone] = useState<boolean>(false);

  const handleOpenContract = (booking: any) => {
    if (onOpenContract) {
      onOpenContract(booking);
    } else {
      setInternalContractBooking(booking);
    }
  };

  const handleCopyPopupPhone = (text: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedPopupPhone(true);
      setTimeout(() => setCopiedPopupPhone(false), 2000);
    } catch {
      // fallback
    }
  };

  // New Booking Modal state
  const [isNewBookingOpen, setIsNewBookingOpen] = useState<boolean>(false);
  const [bookingInitialCarId, setBookingInitialCarId] = useState<string>("");
  const [bookingInitialDate, setBookingInitialDate] = useState<string>("");
  const [bookingInitialDays, setBookingInitialDays] = useState<number>(1);

  // Availability Search & Matcher Modal state
  const [isAvailabilitySearchOpen, setIsAvailabilitySearchOpen] = useState<boolean>(false);

  // Dynamic Header Height measurement for sticky top calculations
  const [headerHeight, setHeaderHeight] = useState<number>(140);
  const [isPageScrolled, setIsPageScrolled] = useState<boolean>(false);
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Esc key & body scroll lock for Fullscreen mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  useEffect(() => {
    const updateH = () => {
      const el = document.getElementById("main-app-header");
      if (el) {
        setHeaderHeight(el.getBoundingClientRect().height);
      }
    };
    updateH();
    window.addEventListener("resize", updateH);
    window.addEventListener("orientationchange", updateH);
    const observer = new ResizeObserver(updateH);
    const el = document.getElementById("main-app-header");
    if (el) observer.observe(el);

    const onScroll = () => {
      setIsPageScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", updateH);
      window.removeEventListener("orientationchange", updateH);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  const scrollToFilters = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToGrid = () => {
    const el = document.getElementById("timeline-main-container");
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 4;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const scrollToLegend = () => {
    const el = document.getElementById("timeline-legend-panel");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleOpenNewBooking = (carId?: string, dateStr?: string, days?: number) => {
    setBookingInitialCarId(carId || "");
    setBookingInitialDate(dateStr || "");
    setBookingInitialDays(days || 1);
    setIsNewBookingOpen(true);
  };

  useEffect(() => {
    const handleGlobalOpen = (e?: any) => {
      const { carId, dateStr, days } = e?.detail || {};
      handleOpenNewBooking(carId, dateStr, days);
    };
    window.addEventListener("open-new-booking", handleGlobalOpen);
    return () => {
      window.removeEventListener("open-new-booking", handleGlobalOpen);
    };
  }, []);

  // Selection mode for client offer & shareable cards
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedCarIds, setSelectedCarIds] = useState<string[]>([]);
  const [unblockCar, setUnblockCar] = useState<any | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Car Details & Availability Modal states
  const [selectedCarForDetails, setSelectedCarForDetails] = useState<string | null>(null);
  const [carModalTab, setCarModalTab] = useState<"general" | "availability">("general");
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState<boolean>(false);
  const [isCityDistributorOpen, setIsCityDistributorOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const toggleCarSelection = (carId: string) => {
    setSelectedCarIds((prev) =>
      prev.includes(carId) ? prev.filter((id) => id !== carId) : [...prev, carId]
    );
  };

  const baseDate = useMemo(() => {
    const d = new Date(currentStartDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentStartDate]);

  const fetchTimeline = async () => {
    setLoading(true);
    setTimelineError(null);
    try {
      const includeArchived = statusFilter === "ARCHIVED";
      const res = await fetch(
        `/api/fleet/timeline?startDate=${currentStartDate}&days=${daysCount}&city=${selectedCity}&includeArchived=${includeArchived}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setTimelineError(json.error || "Не удалось загрузить данные шахматки");
      }
    } catch (e) {
      console.error("Error loading timeline:", e);
      setTimelineError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [currentStartDate, daysCount, selectedCity, statusFilter]);

  const handleSwitchToArchive = () => {
    const d = new Date();
    d.setDate(d.getDate() - (daysCount - 1));
    d.setHours(0, 0, 0, 0);
    setCurrentStartDate(d.toISOString().split("T")[0]);
    setGridMode("ARCHIVE");
  };

  const handleSwitchToLive = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentStartDate(d.toISOString().split("T")[0]);
    setGridMode("LIVE");
  };

  const handlePrev = () => {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() - (gridMode === "ARCHIVE" ? daysCount : 7));
    setCurrentStartDate(d.toISOString().split("T")[0]);
  };

  const handleNext = () => {
    const d = new Date(currentStartDate);
    d.setDate(d.getDate() + (gridMode === "ARCHIVE" ? daysCount : 7));
    if (gridMode === "ARCHIVE") {
      const maxStart = new Date();
      maxStart.setDate(maxStart.getDate() - (daysCount - 1));
      maxStart.setHours(0, 0, 0, 0);
      if (d > maxStart) {
        setCurrentStartDate(maxStart.toISOString().split("T")[0]);
        return;
      }
    }
    setCurrentStartDate(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    if (gridMode === "ARCHIVE") {
      const d = new Date();
      d.setDate(d.getDate() - (daysCount - 1));
      d.setHours(0, 0, 0, 0);
      setCurrentStartDate(d.toISOString().split("T")[0]);
    } else {
      setCurrentStartDate(new Date().toISOString().split("T")[0]);
    }
  };

  const filteredCars = useMemo(() => {
    if (!data?.cars) return [];
    return data.cars.filter((car: any) => {
      const matchesSearch =
        car.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.plateNumber.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "AVAILABLE") return car.status === "AVAILABLE" && !car.isArchived;
      if (statusFilter === "RENTED") return car.status === "RENTED" && !car.isArchived;
      if (statusFilter === "COMPLETED") {
        return car.bookings.some((b: any) => b.status === "COMPLETED");
      }
      if (statusFilter === "ONE_WAY") {
        return car.bookings.some((b: any) => b.isOneWay);
      }
      if (statusFilter === "ARCHIVED") {
        return car.isArchived;
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
    <div className="space-y-4">
      {/* Controls Bar: Navigation, Date jump, Search & Period */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3 shadow-md">
        
        {/* Mobile quick action strip: jump to today / expand filters / jump to grid */}
        <div className="sm:hidden flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
              title="Назад"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs shadow"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs"
              title="Вперед"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Prominent High-Contrast Fullscreen Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 shadow-lg active:scale-95 transition border ${
                isFullscreen
                  ? "bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-400/60 shadow-blue-600/30 ring-2 ring-blue-500/30"
              }`}
              title={isFullscreen ? "Выйти из полноэкранного режима" : "Развернуть шахматку на весь экран"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-950" />
                  <span className="text-[11px] font-black">Свернуть</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                  <span className="text-[11px] font-black whitespace-nowrap">Во весь экран</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsMobileControlsOpen(!isMobileControlsOpen)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-bold rounded-xl transition shrink-0"
            >
              <Search className="w-3 h-3 text-amber-400" />
              <span>{isMobileControlsOpen ? "Свернуть ▲" : "Фильтры ▼"}</span>
            </button>
          </div>
        </div>

        {/* Full controls: always visible on desktop, toggled on mobile */}
        <div className={`space-y-3 ${isMobileControlsOpen ? "block" : "hidden sm:block"}`}>
        {/* Row 1: Mode Switcher (Live Timeline vs Archive Timeline) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2">
            <div className="flex bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold shadow-inner">
              <button
                onClick={handleSwitchToLive}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition ${
                  gridMode === "LIVE"
                    ? "bg-amber-500 text-slate-950 shadow-md font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>📅 Актуальная шахматка</span>
              </button>
              <button
                onClick={handleSwitchToArchive}
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl transition ${
                  gridMode === "ARCHIVE"
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md font-black ring-2 ring-purple-400"
                    : "text-purple-300 hover:text-white hover:bg-purple-950/40"
                }`}
                title="Переключиться в архивную шахматку броней до сегодняшней даты"
              >
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span>🕒 Архивная шахматка (прошлые брони)</span>
              </button>
            </div>

            {gridMode === "ARCHIVE" && (
              <span className="hidden sm:inline-flex text-[11px] px-2.5 py-1 rounded-xl bg-purple-950/70 border border-purple-500/40 text-purple-300 font-bold">
                Архив до {days[days.length - 1]?.dayNumber} {days[days.length - 1]?.monthName}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            {gridMode === "ARCHIVE" ? (
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 rounded-xl font-bold transition shadow"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Открыть архив таблицей / поиском</span>
              </button>
            ) : (
              <button
                onClick={handleSwitchToArchive}
                className="flex items-center space-x-1 px-3 py-1.5 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl font-bold transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Посмотреть прошлые брони ➔</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Date Navigator & Filter controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Date Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1">
              <button
                onClick={handlePrev}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                title={gridMode === "ARCHIVE" ? `Назад на ${daysCount} дн. вглубь архива` : "Назад на 7 дней"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleToday}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  (gridMode === "LIVE" && currentStartDate === new Date().toISOString().split("T")[0]) ||
                  (gridMode === "ARCHIVE" && days[days.length - 1]?.isToday)
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-800 text-slate-300 hover:text-white"
                }`}
                title={gridMode === "ARCHIVE" ? "Сдвинуть архив вплотную к сегодняшнему дню" : "К сегодняшнему дню"}
              >
                {gridMode === "ARCHIVE" ? "До сегодня" : "Сегодня"}
              </button>

              <button
                onClick={handleNext}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                title={gridMode === "ARCHIVE" ? `Вперед на ${daysCount} дн. к сегодняшней дате` : "Вперед на 7 дней"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Date Picker Jump */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-700">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="date"
                value={currentStartDate}
                max={gridMode === "ARCHIVE" ? new Date().toISOString().split("T")[0] : undefined}
                onChange={(e) => setCurrentStartDate(e.target.value)}
                className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
                title={gridMode === "ARCHIVE" ? "Выберите дату начала архивного периода" : "Выберите любую дату календаря (например, 27 декабря)"}
              />
            </div>

            {/* Quick jump for mode */}
            {gridMode === "ARCHIVE" ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => {
                    const d = new Date(currentStartDate);
                    d.setDate(d.getDate() - 30);
                    setCurrentStartDate(d.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-950 text-purple-300 hover:text-white border border-purple-500/30 transition"
                  title="Сдвинуться назад на 30 дней вглубь архива"
                >
                  ⏪ -1 мес
                </button>
                <button
                  onClick={handleToday}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-950 text-amber-300 hover:text-white border border-amber-500/30 transition"
                  title="Показать архив вплоть до сегодняшней даты"
                >
                  К сегодняшнему дню ➔
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setCurrentStartDate("2026-12-27");
                  setDaysCount(14);
                }}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1 ${
                  currentStartDate === "2026-12-27"
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                    : "bg-slate-950 text-amber-300 hover:text-white border-amber-500/30"
                }`}
                title="Перейти к 27 декабря 2026 (Новогодний пик)"
              >
                <span>🎄 27 дек (Новый Год)</span>
              </button>
            )}

            <span className="text-xs text-slate-400 font-medium pl-1 hidden lg:inline">
              с {days[0]?.dayNumber} {days[0]?.monthName} по {days[days.length - 1]?.dayNumber} {days[days.length - 1]?.monthName}
            </span>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Availability Matcher Button */}
            <button
              onClick={() => setIsAvailabilitySearchOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition active:scale-95"
              title="Проверить свободные машины на любой диапазон дат (например, с 27 декабря по 5 января)"
            >
              <Search className="w-3.5 h-3.5" />
              <span>🔍 Подобрать авто на даты</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск авто..."
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-32 sm:w-40"
              />
            </div>

            {/* Period length */}
            <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800 text-xs font-medium">
              <button
                onClick={() => {
                  setDaysCount(7);
                  if (gridMode === "ARCHIVE") {
                    const d = new Date();
                    d.setDate(d.getDate() - 6);
                    setCurrentStartDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`px-2 py-1 rounded-lg transition ${
                  daysCount === 7 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                7 дн.
              </button>
              <button
                onClick={() => {
                  setDaysCount(14);
                  if (gridMode === "ARCHIVE") {
                    const d = new Date();
                    d.setDate(d.getDate() - 13);
                    setCurrentStartDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`px-2 py-1 rounded-lg transition ${
                  daysCount === 14 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                14 дн.
              </button>
              <button
                onClick={() => {
                  setDaysCount(21);
                  if (gridMode === "ARCHIVE") {
                    const d = new Date();
                    d.setDate(d.getDate() - 20);
                    setCurrentStartDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`px-2 py-1 rounded-lg transition ${
                  daysCount === 21 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                21 дн.
              </button>
              <button
                onClick={() => {
                  setDaysCount(30);
                  if (gridMode === "ARCHIVE") {
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    setCurrentStartDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`px-2 py-1 rounded-lg transition ${
                  daysCount === 30 ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
                title="Отобразить 30 дней (целый месяц)"
              >
                30 дн.
              </button>
            </div>

            {/* Status selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Все брони</option>
              <option value="COMPLETED">🏁 Только завершенные</option>
              <option value="ONE_WAY">⇄ Только One-Way (междугородние)</option>
              <option value="AVAILABLE">Только свободные</option>
              <option value="RENTED">Только в поездке</option>
              <option value="ARCHIVED">📦 Выведенные из автопарка</option>
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

            {/* Booking Archive Mode CTA */}
            <button
              onClick={() => {
                if (gridMode === "LIVE") {
                  handleSwitchToArchive();
                } else {
                  handleSwitchToLive();
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                gridMode === "ARCHIVE"
                  ? "bg-purple-600 text-white font-black shadow-lg ring-2 ring-purple-400"
                  : "bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40"
              }`}
              title="Переключить шахматку в режим архива (до сегодняшней даты)"
            >
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>{gridMode === "ARCHIVE" ? "🕒 Архивная шахматка (активна)" : "🕒 Архив броней"}</span>
            </button>

            {/* Quick City Distributor CTA */}
            <button
              onClick={() => setIsCityDistributorOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold shadow transition"
              title="Быстро распределить города для всех автомобилей автопарка"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>📍 Города авто</span>
            </button>

            {/* Database Backup CTA */}
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-bold shadow transition"
              title="Резервное копирование и статус сохранности базы данных"
            >
              <Database className="w-3.5 h-3.5" />
              <span>💾 Бэкап</span>
            </button>

            {/* Legend / Расшифровка Jump CTA */}
            <button
              type="button"
              onClick={scrollToLegend}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold shadow transition"
              title="Перейти к расшифровке цветов городов и статусов броней"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Расшифровка</span>
            </button>

            {/* Fullscreen Mode CTA */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow ${
                isFullscreen
                  ? "bg-amber-500 text-slate-950 font-black shadow-lg"
                  : "bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40"
              }`}
              title={isFullscreen ? "Выйти из полноэкранного режима (Esc)" : "Развернуть шахматку на весь экран"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-950" /> : <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{isFullscreen ? "Свернуть" : "Во весь экран"}</span>
            </button>

            {/* New Car CTA */}
            <button
              onClick={() => setIsNewCarModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold shadow transition ml-auto sm:ml-0"
              title="Добавить новый автомобиль в автопарк и задать город дислокации"
            >
              <Car className="w-3.5 h-3.5" />
              <span>+ Автомобиль</span>
            </button>

            {/* New Booking CTA */}
            <button
              onClick={() => handleOpenNewBooking()}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Новая бронь</span>
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Archive Banner Alert when in Archive Mode */}
      {gridMode === "ARCHIVE" && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-500/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2">
          <div className="flex items-start space-x-3">
            <div className="p-3 bg-purple-600/20 border border-purple-400/40 rounded-2xl text-purple-300 shrink-0">
              <Clock className="w-5 h-5 text-purple-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  🕒 Архивная шахматка бронирований (до сегодняшней даты)
                </h3>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  Режим истории
                </span>
              </div>
              <p className="text-xs text-purple-200/80 mt-1 max-w-3xl">
                Вы просматриваете историю броней в виде шахматки. Кликните на любую полоску брони для просмотра, перепроверки или фактовой корректировки дат, автомобиля или тарифа.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
              title="Открыть архив броней в виде таблицы с поиском и суммами"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Табличный реестр</span>
            </button>

            <button
              onClick={handleSwitchToLive}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Вернуться в актуальную шахматку</span>
            </button>
          </div>
        </div>
      )}

      {/* TIMELINE GANTT GRID CONTAINER */}
      <div
        id="timeline-main-container"
        className={
          isFullscreen
            ? "fixed inset-0 z-[60] bg-slate-950 flex flex-col p-2 sm:p-3 overflow-hidden shadow-2xl animate-in fade-in duration-150"
            : "bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        }
      >
        {/* Fullscreen Dedicated Compact Navigation Bar */}
        {isFullscreen && (
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/90 gap-2 shrink-0 bg-slate-950 px-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-white flex items-center space-x-1.5">
                <span className="text-base">📅</span>
                <span className="hidden sm:inline">Шахматка во весь экран</span>
                <span className="sm:hidden font-mono">Шахматка</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                ({filteredCars.length} авто)
              </span>
            </div>

            {/* Quick date navigator inside fullscreen */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrev}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg text-xs"
                title="Назад"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs shadow"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 rounded-lg text-xs"
                title="Вперед"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-300 font-bold ml-1 hidden lg:inline">
                {days[0]?.dayNumber} {days[0]?.monthName} — {days[days.length - 1]?.dayNumber} {days[days.length - 1]?.monthName}
              </span>
            </div>

            {/* Actions: + Бронь & Exit Fullscreen */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleOpenNewBooking()}
                className="hidden xs:flex items-center space-x-1 px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Бронь</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg active:scale-95 transition"
                title="Выйти из полноэкранного режима (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5 text-slate-950" />
                <span className="hidden sm:inline">✖ Свернуть экран (Esc)</span>
                <span className="sm:hidden">✖ Свернуть</span>
              </button>
            </div>
          </div>
        )}

        <div
          className={`overflow-auto ${isFullscreen ? "flex-1 rounded-xl border border-slate-800/80" : "rounded-2xl"}`}
          style={
            isFullscreen
              ? { height: "100%" }
              : { maxHeight: `calc(100dvh - ${headerHeight}px - 1.25rem)` }
          }
        >
          <div className="w-max min-w-full pb-24">
            {/* Header row: Cars column + Day columns - Sticky at top of the grid */}
            <div className="flex border-b border-slate-800 bg-slate-950 sticky top-0 z-30 shadow-md">
              <div className="w-[136px] sm:w-[220px] shrink-0 px-2.5 sm:px-3 py-2 sm:py-2.5 border-r border-slate-800 font-bold text-[11px] sm:text-xs text-slate-300 uppercase tracking-wider flex items-center justify-between sticky left-0 z-40 bg-slate-950 shadow-[4px_0_12px_rgba(0,0,0,0.6)]">
                <div className="flex items-center space-x-1.5 truncate">
                  <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Автомобили</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded shrink-0">
                  {filteredCars.length}
                </span>
              </div>

              {/* Day headers */}
              <div
                className="grid flex-1"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(84px, 1fr))`,
                  minWidth: `${days.length * 84}px`,
                }}
              >
                {days.map((day: any) => {
                  return (
                    <div
                      key={day.dateStr}
                      className={`p-1.5 sm:p-2 text-center border-r border-slate-800/80 transition-colors ${
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
                          className={`text-xs sm:text-sm font-black font-mono ${
                            day.isToday
                              ? "bg-amber-500 text-slate-950 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow text-xs"
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
              {timelineError ? (
                <div className="p-12 text-center text-rose-400 text-xs space-y-3">
                  <p className="font-bold text-sm">⚠️ {timelineError}</p>
                  <p className="text-slate-400 text-[11px]">Произошла ошибка при получении данных автопарка</p>
                  <button
                    onClick={fetchTimeline}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
                  >
                    Повторить загрузку
                  </button>
                </div>
              ) : filteredCars.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <p>Нет автомобилей, соответствующих выбранным фильтрам.</p>
                  {(searchQuery || statusFilter !== "ALL" || selectedCity !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("ALL");
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition"
                    >
                      Сбросить фильтры
                    </button>
                  )}
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
                      className={`flex hover:bg-slate-800/30 transition-colors group ${
                        isSelectionMode ? "cursor-pointer" : ""
                      } ${isSelected ? "bg-purple-950/20" : ""}`}
                    >
                      {/* Left: Car Details & Distinct City Color Border - Pinned horizontally */}
                      <div
                        onClick={(e) => {
                          if (isSelectionMode) {
                            toggleCarSelection(car.id);
                          } else {
                            setSelectedCarForDetails(car.id);
                            setCarModalTab("general");
                          }
                        }}
                        className={`w-[130px] sm:w-[220px] shrink-0 sticky left-0 z-20 p-2 sm:p-3 border-r border-slate-800 bg-slate-900 shadow-[4px_0_12px_rgba(0,0,0,0.6)] flex items-center space-x-1.5 sm:space-x-2.5 transition-colors cursor-pointer hover:bg-slate-850 group/car ${
                          isSelected ? "bg-purple-950/40 ring-1 ring-purple-500/70" : ""
                        } ${cityTheme.borderL}`}
                        title="Нажмите, чтобы открыть карточку автомобиля, сменить город присутствия или закрыть доступность"
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
                            <h4 className="font-extrabold text-white text-[11px] sm:text-xs truncate max-w-[75px] sm:max-w-[130px] group-hover/car:text-amber-400 transition-colors" title={`${car.brand} ${car.model}`}>
                              {car.brand} {car.model}
                            </h4>
                            
                            {/* Prominent City Badge with Distinct Color */}
                            <span
                              className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded font-black border flex items-center space-x-0.5 shrink-0 ${cityTheme.badgeBg}`}
                              title={`Город дислокации: ${cityTheme.name}`}
                            >
                              <span>{cityTheme.icon}</span>
                              <span>{car.city.code}</span>
                            </span>
                          </div>

                          {/* Plate & Status */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 shrink-0">
                              {car.plateNumber}
                            </span>
                            {car.isArchived ? (
                              <span className="text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/50 shadow truncate">
                                В архиве
                              </span>
                            ) : car.isStopBlocked ? (
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

                          {/* ACTIVE AVAILABILITY BLOCKS (MANUAL BLOCKS) */}
                          {car.availabilityBlocks?.filter((b: any) => b.isActive).map((b: any) => (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCarForDetails(car.id);
                                setCarModalTab("availability");
                              }}
                              className="bg-red-950/90 border border-red-500/80 rounded-lg p-1 text-[9px] text-red-200 space-y-0.5 hover:bg-red-900 transition shadow cursor-pointer"
                              title="Нажмите для управления блокировкой"
                            >
                              <div className="font-bold flex items-center justify-between">
                                <span className="truncate">⛔ {b.reasonText || (b.reason === "MAINTENANCE" ? "На ТО / ремонте" : "Закрыт")}</span>
                                <span className="font-mono text-[8px] bg-red-600 px-1 rounded text-white font-black shrink-0 ml-1">
                                  {b.endDate ? "В ПЕРИОДЕ" : "БЕССРОЧНО"}
                                </span>
                              </div>
                              <div className="text-[8px] text-red-300 font-mono truncate">
                                {b.endDate ? `до ${new Date(b.endDate).toLocaleDateString("ru-RU")}` : "Бессрочно"}
                              </div>
                            </div>
                          ))}

                          {/* STOP BLOCKED ACTION BANNER */}
                          {car.isStopBlocked && (!car.availabilityBlocks || car.availabilityBlocks.filter((b: any) => b.isActive).length === 0) && (
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
                      <div
                        className="relative flex-1 min-h-[76px] sm:min-h-[88px] bg-slate-950/40"
                        style={{
                          minWidth: `${days.length * 84}px`,
                        }}
                      >
                        {/* Day vertical grid lines & clickable slots */}
                        <div
                          className="grid h-full absolute inset-0"
                          style={{
                            gridTemplateColumns: `repeat(${days.length}, minmax(84px, 1fr))`,
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

                        {/* Booking & Availability Block Bars */}
                        <div className="absolute inset-0 flex items-center pointer-events-none">
                          {/* Availability Block Bars (Manual closures) */}
                          {car.availabilityBlocks?.map((block: any) => {
                            const bStart = new Date(block.startDate);
                            // If no endDate, it's indefinite: block to the end of visible days + 1 day
                            const bEnd = block.endDate
                              ? new Date(block.endDate)
                              : new Date(days[days.length - 1]?.timestamp + 24 * 60 * 60 * 1000);

                            const firstDayTimestamp = days[0]?.timestamp;
                            const msPerDay = 24 * 60 * 60 * 1000;

                            const startDiffDays = (bStart.getTime() - firstDayTimestamp) / msPerDay;
                            const endDiffDays = (bEnd.getTime() - firstDayTimestamp) / msPerDay;

                            const visibleStart = Math.max(0, startDiffDays);
                            const visibleEnd = Math.min(days.length, endDiffDays);

                            if (visibleEnd < 0 || visibleStart >= days.length) {
                              return null;
                            }

                            const leftPercent = (visibleStart / days.length) * 100;
                            const widthPercent = Math.max(1, ((visibleEnd - visibleStart) / days.length) * 100);

                            return (
                              <div
                                key={block.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCarForDetails(car.id);
                                  setCarModalTab("availability");
                                }}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className="absolute h-[68px] rounded-xl p-1.5 cursor-pointer pointer-events-auto transition-all hover:scale-[1.01] hover:z-30 flex flex-col justify-between overflow-hidden bg-gradient-to-r from-red-950 via-rose-950 to-red-900 border-2 border-red-500/80 text-white shadow-lg shadow-red-950/60"
                                title={`Доступность закрыта: ${block.reasonText || block.reason}. Нажмите для управления.`}
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold leading-tight">
                                  <span className="truncate max-w-[85%] flex items-center space-x-1.5 text-red-200">
                                    <span className="text-red-400">⛔</span>
                                    <span className="truncate uppercase tracking-wide text-[10px]">
                                      {block.reasonText || (block.reason === "MAINTENANCE" ? "ТО / Ремонт" : block.reason === "SERVICE_TRIP" ? "Служебный выезд" : "Закрыто")}
                                    </span>
                                  </span>
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-black/50 text-red-300 border border-red-500/30">
                                    {block.endDate ? "В ПЕРИОДЕ" : "БЕССРОЧНО"}
                                  </span>
                                </div>

                                <div className="text-[10px] text-red-200/90 truncate font-semibold">
                                  {block.notes || (block.endDate ? `до ${new Date(block.endDate).toLocaleDateString("ru-RU")}` : "Бессрочно (до ручного открытия)")}
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-red-300/80 leading-none">
                                  <span>С {new Date(block.startDate).toLocaleDateString("ru-RU")}</span>
                                  <span className="underline hover:text-white font-bold">Снять ➔</span>
                                </div>
                              </div>
                            );
                          })}

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
                            const isCompleted = booking.status === "COMPLETED";
                            const isOneWay = booking.isOneWay;

                            // Format times (Выдача и возврат)
                            const startTime = bStart.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                            const returnTime = bEnd.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                            const isTimeDifferent = startTime !== returnTime;
                            const timeLabel = isTimeDifferent ? `${startTime} → ${returnTime}` : startTime;

                            // Location checks: Airport vs Delivery
                            const pName = (booking.pickupLocation?.name || "").toLowerCase();
                            const rName = (booking.returnLocation?.name || "").toLowerCase();
                            const isAirport =
                              booking.pickupType === "AIRPORT" ||
                              booking.pickupLocation?.type === "AIRPORT" ||
                              pName.includes("аэропорт") ||
                              pName.includes("airport") ||
                              booking.returnType === "AIRPORT" ||
                              booking.returnLocation?.type === "AIRPORT" ||
                              rName.includes("аэропорт") ||
                              rName.includes("airport");

                            const isDelivery =
                              !isAirport &&
                              (booking.pickupType === "DELIVERY" ||
                                booking.pickupLocation?.type === "CUSTOM" ||
                                pName.includes("доставк") ||
                                pName.includes("отель") ||
                                pName.includes("delivery") ||
                                Boolean(booking.pickupAddress) ||
                                booking.returnType === "DELIVERY" ||
                                booking.returnLocation?.type === "CUSTOM" ||
                                rName.includes("доставк") ||
                                rName.includes("отель") ||
                                rName.includes("delivery") ||
                                Boolean(booking.returnAddress));

                            let barStyle = "bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-400 text-white shadow-blue-900/40";
                            
                            if (isCompleted) {
                              barStyle = "bg-gradient-to-r from-slate-800 via-slate-850 to-slate-800 border-2 border-emerald-500/60 text-slate-100 shadow-md";
                            } else if (isOneWay) {
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

                            const firstName = (booking.customer?.fullName || "").trim().split(/\s+/)[0] || "Клиент";

                            return (
                              <div
                                key={booking.id}
                                onClick={() => setSelectedBooking({ ...booking, car: booking.car || car })}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                                className={`absolute h-[68px] rounded-xl p-1.5 cursor-pointer pointer-events-auto transition-all hover:scale-[1.02] hover:z-30 flex flex-col justify-between overflow-hidden shadow-lg ${barStyle}`}
                                title={`Бронь ${booking.bookingNumber}: ${booking.customer.fullName}. Выдача: ${startTime}${isTimeDifferent ? `, Возврат: ${returnTime}` : ''}`}
                              >
                                {/* Line 1: Time badge + Airport/Delivery badge */}
                                <div className="flex items-center justify-between gap-1 leading-tight">
                                  <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-black/60 text-amber-300 border border-amber-400/40 flex items-center space-x-0.5 shrink-0 shadow-sm leading-none"
                                    title={`Время выдачи: ${startTime}${isTimeDifferent ? ` / Возврат: ${returnTime}` : ''}`}
                                  >
                                    <span>⏰</span>
                                    <span>{timeLabel}</span>
                                  </span>

                                  {isAirport ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-sky-400 text-slate-950 flex items-center space-x-0.5 shrink-0 shadow-sm leading-none">
                                      <span>✈️</span>
                                      <span>Аэропорт</span>
                                    </span>
                                  ) : isDelivery ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center space-x-0.5 shrink-0 shadow-sm leading-none">
                                      <span>🚚</span>
                                      <span>Доставка</span>
                                    </span>
                                  ) : isOneWay ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-fuchsia-400 text-slate-950 flex items-center space-x-0.5 shrink-0 shadow-sm leading-none">
                                      <span>⇄</span>
                                      <span>{booking.toCityCode}</span>
                                    </span>
                                  ) : null}

                                  {(booking.swappedFromBookingId || booking.swappedToBookingId) && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-400 text-slate-950 flex items-center space-x-0.5 shrink-0 shadow-sm leading-none" title="Замена автомобиля">
                                      <span>🔄</span>
                                      <span>Замена</span>
                                    </span>
                                  )}
                                </div>

                                {/* Line 2: Customer First Name */}
                                <div className="font-extrabold text-xs sm:text-[13px] text-white truncate flex items-center space-x-1 drop-shadow leading-snug my-auto">
                                  <span className="opacity-80 text-[11px]">👤</span>
                                  <span className="truncate">{firstName}</span>
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

      {/* Extended Legend: Cities and Trip Types (Dedicated Bottom Panel) */}
      <div id="timeline-legend-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs mb-28 shadow-xl">
        {/* Row 1: City Colors */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 border-b border-slate-800 pb-3">
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
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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

            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-800 border-2 border-emerald-500" />
              <span className="text-emerald-300 font-bold">🏁 Завершена (архив)</span>
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
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBooking(null);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1 pt-0.5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span
                    className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded border ${
                      selectedBooking.isOneWay
                        ? "bg-purple-950/80 text-purple-300 border-purple-500/50"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {selectedBooking.isOneWay ? "⇄ МЕЖДУГОРОДНЯЯ (ONE-WAY)" : "ЛОКАЛЬНАЯ АРЕНДА"}
                  </span>
                  <span className="font-mono text-xs text-slate-300 font-bold">
                    {selectedBooking.bookingNumber}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  {selectedBooking.car?.brand
                    ? `${selectedBooking.car.brand} ${selectedBooking.car.model} (${selectedBooking.car.plateNumber})`
                    : "Автомобиль бронирования"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
                title="Закрыть"
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
                    Сбор One-Way: {selectedBooking.deliveryFee} ₾
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
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <button
                      type="button"
                      onClick={() => setIsCustomerDossierOpen(true)}
                      className="font-bold text-amber-300 hover:text-amber-200 flex items-center space-x-1.5 hover:underline group text-left transition"
                      title="Открыть карточку клиента и фото документов"
                    >
                      <User className="w-4 h-4 text-amber-400 group-hover:scale-110 transition shrink-0" />
                      <span className="text-sm font-black">{selectedBooking.customer?.fullName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-normal">
                        Карточка →
                      </span>
                    </button>
                    {selectedBooking.customer?.totalActiveDebt > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsCustomerDossierOpen(true)}
                        className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-rose-600 hover:bg-rose-500 text-white animate-pulse flex items-center space-x-1 shadow transition"
                        title="У клиента есть непогашенный долг! Нажмите для просмотра и погашения"
                      >
                        <Coins className="w-3 h-3 text-rose-200" />
                        <span>ДОЛГ: {selectedBooking.customer.totalActiveDebt} ₾</span>
                      </button>
                    )}
                    {selectedBooking.source && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                          selectedBooking.source === "TELEGRAM"
                            ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            : selectedBooking.source === "INSTAGRAM"
                            ? "bg-pink-500/20 text-pink-300 border-pink-500/40"
                            : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        }`}
                      >
                        {selectedBooking.source === "TELEGRAM"
                          ? "🔷 Telegram"
                          : selectedBooking.source === "INSTAGRAM"
                          ? "📸 Instagram"
                          : "🟢 WhatsApp"}
                      </span>
                    )}
                  </div>

                  {/* Phone with 1-click icon copy */}
                  {selectedBooking.customer?.phone && (
                    <div className="flex items-center space-x-1.5 font-mono text-[11px] text-slate-300 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                      <span>📞 {selectedBooking.customer.phone}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPopupPhone(selectedBooking.customer.phone)}
                        className={`p-1 rounded transition border shadow-sm ${
                          copiedPopupPhone
                            ? "bg-emerald-500/25 text-emerald-300 border-emerald-500/50"
                            : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                        }`}
                        title="Скопировать номер телефона"
                      >
                        {copiedPopupPhone ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-amber-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Паспорт: {selectedBooking.customer.passportNumber} • Права: {selectedBooking.customer.driverLicenseNumber}
                </p>

                {/* Customer Documents badges & AI upload trigger */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                    <span className="text-[10px] text-slate-400">Документы:</span>
                    {selectedBooking.customer.passportPhotoUrl ? (
                      <div className="inline-flex items-center rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 overflow-hidden shadow-sm">
                        <a
                          href={selectedBooking.customer.passportPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 hover:bg-blue-500/30 transition flex items-center space-x-1"
                          title="Открыть фото паспорта в новом окне"
                        >
                          <span>✓ Паспорт</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadDocument(
                            selectedBooking.customer.passportPhotoUrl,
                            `Паспорт_${selectedBooking.customer.fullName?.replace(/\s+/g, "_")}_Бронь_${selectedBooking.bookingNumber}`
                          )}
                          className="px-1.5 py-0.5 bg-blue-600/40 hover:bg-blue-600 text-white border-l border-blue-500/30 transition flex items-center"
                          title="Скачать фото паспорта"
                        >
                          <Download className="w-3 h-3" />
                          <span className="text-[9px] ml-1 font-bold">Скачать</span>
                        </button>
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-500 border border-slate-800">
                        Паспорт —
                      </span>
                    )}

                    {selectedBooking.customer.driverLicensePhotoUrl ? (
                      <div className="inline-flex items-center rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 overflow-hidden shadow-sm">
                        <a
                          href={selectedBooking.customer.driverLicensePhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 hover:bg-purple-500/30 transition flex items-center space-x-1"
                          title="Открыть лицевую сторону прав в новом окне"
                        >
                          <span>✓ Права (лицо)</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadDocument(
                            selectedBooking.customer.driverLicensePhotoUrl,
                            `Права_Лицо_${selectedBooking.customer.fullName?.replace(/\s+/g, "_")}_Бронь_${selectedBooking.bookingNumber}`
                          )}
                          className="px-1.5 py-0.5 bg-purple-600/40 hover:bg-purple-600 text-white border-l border-purple-500/30 transition flex items-center"
                          title="Скачать фото прав (лицо)"
                        >
                          <Download className="w-3 h-3" />
                          <span className="text-[9px] ml-1 font-bold">Скачать</span>
                        </button>
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-500 border border-slate-800">
                        Права (лицо) —
                      </span>
                    )}

                    {selectedBooking.customer.driverLicenseBackPhotoUrl ? (
                      <div className="inline-flex items-center rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 overflow-hidden shadow-sm">
                        <a
                          href={selectedBooking.customer.driverLicenseBackPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 hover:bg-cyan-500/30 transition flex items-center space-x-1"
                          title="Открыть оборотную сторону прав в новом окне"
                        >
                          <span>✓ Права (оборот)</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => downloadDocument(
                            selectedBooking.customer.driverLicenseBackPhotoUrl,
                            `Права_Оборот_${selectedBooking.customer.fullName?.replace(/\s+/g, "_")}_Бронь_${selectedBooking.bookingNumber}`
                          )}
                          className="px-1.5 py-0.5 bg-cyan-600/40 hover:bg-cyan-600 text-white border-l border-cyan-500/30 transition flex items-center"
                          title="Скачать фото прав (оборот)"
                        >
                          <Download className="w-3 h-3" />
                          <span className="text-[9px] ml-1 font-bold">Скачать</span>
                        </button>
                      </div>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 text-slate-500 border border-slate-800">
                        Права (оборот) —
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {(selectedBooking.customer.passportPhotoUrl || selectedBooking.customer.driverLicensePhotoUrl || selectedBooking.customer.driverLicenseBackPhotoUrl) && (
                      <button
                        type="button"
                        onClick={() => downloadAllCustomerDocuments(
                          selectedBooking.customer,
                          selectedBooking.bookingNumber,
                          selectedBooking.additionalDrivers
                        )}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md flex items-center space-x-1.5 transition active:scale-95"
                        title="Скачать все прикрепленные документы клиента на устройство в один клик"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>📥 Скачать все документы</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsDocsUploadModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gradient-to-r from-amber-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-purple-500/30 text-amber-300 border border-amber-500/40 flex items-center space-x-1 transition shadow-sm active:scale-95"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>🪪 Загрузить / Распознать</span>
                    </button>
                  </div>
                </div>

                {/* Additional Drivers Documents (if any) */}
                {selectedBooking.additionalDrivers && selectedBooking.additionalDrivers.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-semibold">Документы второго водителя:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedBooking.additionalDrivers.map((driver: any, idx: number) => (
                        <div key={idx} className="bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 flex items-center space-x-2 text-[11px]">
                          <span className="font-bold text-slate-200">{driver.fullName}</span>
                          {driver.licensePhotoUrl && (
                            <button
                              type="button"
                              onClick={() => downloadDocument(driver.licensePhotoUrl, `Права_Лицо_${driver.fullName?.replace(/\s+/g, "_")}`)}
                              className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/40 text-[10px] font-bold flex items-center space-x-1"
                              title="Скачать права дополнительного водителя (лицо)"
                            >
                              <span>Права (лицо)</span>
                              <Download className="w-2.5 h-2.5 text-purple-300" />
                            </button>
                          )}
                          {driver.licenseBackPhotoUrl && (
                            <button
                              type="button"
                              onClick={() => downloadDocument(driver.licenseBackPhotoUrl, `Права_Оборот_${driver.fullName?.replace(/\s+/g, "_")}`)}
                              className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/40 text-[10px] font-bold flex items-center space-x-1"
                              title="Скачать права дополнительного водителя (оборот)"
                            >
                              <span>Права (оборот)</span>
                              <Download className="w-2.5 h-2.5 text-cyan-300" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                  {selectedBooking.pickupAddress && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] text-amber-400 font-bold block">
                        📍 Адрес / локация доставки:
                      </span>
                      {selectedBooking.pickupAddress.startsWith("http") ? (
                        <a
                          href={selectedBooking.pickupAddress}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:text-sky-300 underline font-medium flex items-center space-x-1 mt-0.5 break-all"
                        >
                          <span>{selectedBooking.pickupAddress}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-slate-200 font-medium">{selectedBooking.pickupAddress}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.pickupAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline shrink-0 ml-1.5"
                          >
                            Карта ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
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
                  {selectedBooking.returnAddress && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80">
                      <span className="text-[10px] text-amber-400 font-bold block">
                        📍 Адрес возврата / забора:
                      </span>
                      {selectedBooking.returnAddress.startsWith("http") ? (
                        <a
                          href={selectedBooking.returnAddress}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sky-400 hover:text-sky-300 underline font-medium flex items-center space-x-1 mt-0.5 break-all"
                        >
                          <span>{selectedBooking.returnAddress}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-xs text-slate-200 font-medium">{selectedBooking.returnAddress}</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedBooking.returnAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-400 hover:text-amber-300 underline shrink-0 ml-1.5"
                          >
                            Карта ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
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
                    {selectedBooking.totalAmount} ₾ (GEL)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Депозит:</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {selectedBooking.depositAmount} ₾ (GEL)
                  </span>
                </div>
              </div>

              {/* Additional Drivers Section (до 4х с фото прав) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>Дополнительные водители:</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {selectedBooking.additionalDrivers?.length || 0} / 4
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdditionalDriversModalOpen(true)}
                    className="text-[11px] font-bold text-blue-400 hover:text-blue-300 underline flex items-center space-x-1"
                  >
                    <span>+ Добавить / Фото</span>
                  </button>
                </div>

                {selectedBooking.additionalDrivers && selectedBooking.additionalDrivers.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {selectedBooking.additionalDrivers.map((driver: any, idx: number) => (
                      <div
                        key={driver.id || idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                      >
                        <div>
                          <strong className="text-white block font-medium">
                            {idx + 1}. {driver.fullName}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {driver.licenseNumber ? `Права: ${driver.licenseNumber}` : "Права не указаны"}
                            {driver.phone ? ` • ${driver.phone}` : ""}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {driver.licensePhotoUrl && (
                            <a
                              href={driver.licensePhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:underline"
                            >
                              Права (лицо)
                            </a>
                          )}
                          {driver.licenseBackPhotoUrl && (
                            <a
                              href={driver.licenseBackPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:underline"
                            >
                              Права (оборот)
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    Дополнительные водители не добавлены. Можно добавить до 4-х человек с фото прав.
                  </p>
                )}
              </div>

              {/* Extensions list (если есть продления) */}
              {selectedBooking.extensions && selectedBooking.extensions.length > 0 && (
                <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-amber-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Продления аренды ({selectedBooking.extensions.length}):</span>
                    </span>
                  </div>
                  {selectedBooking.extensions.map((ext: any, idx: number) => (
                    <div
                      key={ext.id || idx}
                      className="p-1.5 bg-slate-900/80 rounded-lg text-[11px] flex justify-between items-center text-slate-300"
                    >
                      <div>
                        <span>
                          {ext.type === "DAYS" ? `+${ext.extraDays} дн.` : `+${ext.extraHours} ч.`}{" "}
                          до {new Date(ext.newEndDate).toLocaleDateString("ru-RU")}{" "}
                          {new Date(ext.newEndDate).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {ext.notes && <span className="text-slate-500 block text-[10px]">{ext.notes}</span>}
                      </div>
                      <div className="text-right font-mono">
                        <strong className="text-amber-400">+{ext.amount} ₾</strong>
                        <span
                          className={`block text-[9px] ${
                            ext.paymentStatus === "PAID" ? "text-emerald-400" : "text-amber-400 font-bold"
                          }`}
                        >
                          {ext.paymentStatus === "PAID" ? "✓ Оплачено" : "К оплате при сдаче"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Swap Info Banner */}
              {(selectedBooking.swappedToBookingId || selectedBooking.swappedFromBookingId) && (
                <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-2.5 text-xs space-y-1">
                  <div className="flex items-center space-x-1.5 text-cyan-300 font-bold">
                    <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Внимание: по этой аренде была выполнена замена автомобиля</span>
                  </div>
                  {selectedBooking.swappedToBookingId && (
                    <div className="text-[11px] text-slate-300">
                      Клиент пересажен на следующий автомобиль (создана продолженная активная бронь).
                    </div>
                  )}
                  {selectedBooking.swappedFromBookingId && (
                    <div className="text-[11px] text-slate-300">
                      Это замещающий автомобиль (клиент ранее ехал на другой машине).
                    </div>
                  )}
                </div>
              )}

              {/* Refunds list (если есть возвраты клиенту) */}
              {selectedBooking.refunds && selectedBooking.refunds.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <span className="flex items-center space-x-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Оформленные возвраты средств клиенту ({selectedBooking.refunds.length}):</span>
                    </span>
                    <span className="font-mono text-rose-400 font-bold">
                      -{selectedBooking.refunds.reduce((s: number, r: any) => s + (r.amount || 0), 0)} ₾
                    </span>
                  </div>
                  {selectedBooking.refunds.map((rf: any, idx: number) => (
                    <div
                      key={rf.id || idx}
                      className="p-1.5 bg-slate-900/80 rounded-lg text-[11px] flex justify-between items-center text-slate-300"
                    >
                      <div>
                        <span className="text-rose-200 font-bold">{rf.reason}</span>
                        {rf.notes && <span className="text-slate-400 block text-[10px]">{rf.notes}</span>}
                        <span className="text-[9px] text-slate-500 block">
                          {new Date(rf.createdAt || rf.date).toLocaleDateString("ru-RU")} •{" "}
                          {rf.managerName || "Менеджер"}
                        </span>
                      </div>
                      <strong className="font-mono text-rose-400 font-black">-{rf.amount} ₾</strong>
                    </div>
                  ))}
                </div>
              )}

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

            {/* Actions Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              {/* Primary Call-to-Action */}
              {onOpenHandover && selectedBooking.status !== "ACTIVE" && selectedBooking.status !== "COMPLETED" && (
                <button
                  type="button"
                  onClick={() => {
                    const bookingWithCar = {
                      ...selectedBooking,
                      car: selectedBooking.car || {
                        id: selectedBooking.carId,
                        brand: "Автомобиль",
                        model: "",
                        plateNumber: "",
                        currentMileage: 50000,
                        currentFuelPerc: 100,
                      },
                      extras: selectedBooking.extras || [],
                    };
                    onOpenHandover(bookingWithCar);
                    setSelectedBooking(null);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-amber-950/40 transition active:scale-95"
                >
                  <Key className="w-4 h-4 text-slate-950" />
                  <span>Выдать автомобиль клиенту</span>
                </button>
              )}

              {onOpenReturn && (selectedBooking.status === "ACTIVE" || selectedBooking.handoverReport) && (
                <button
                  type="button"
                  onClick={() => {
                    const bookingWithCar = {
                      ...selectedBooking,
                      car: selectedBooking.car || {
                        id: selectedBooking.carId,
                        brand: "Автомобиль",
                        model: "",
                        plateNumber: "",
                        currentMileage: 50000,
                        currentFuelPerc: 100,
                      },
                      extras: selectedBooking.extras || [],
                    };
                    onOpenReturn(bookingWithCar);
                    setSelectedBooking(null);
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 text-slate-950" />
                  <span>Принять возврат автомобиля</span>
                </button>
              )}

              {/* 📄 Договор аренды автомобиля к печати (A4 / PDF) */}
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-950 to-amber-950/30 p-3 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-black text-white">Договор аренды автомобиля</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {selectedBooking.contractLanguage === "GE"
                          ? "🇬🇪 ქართული"
                          : selectedBooking.contractLanguage === "EN"
                          ? "🇬🇧 English"
                          : "🇷🇺 Русский"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Готов к просмотру и моментальной печати (A4 / PDF)
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenContract(selectedBooking);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-950/40 transition active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Печать договора (A4 / PDF)</span>
                  </button>
                </div>
              </div>

              {/* Secondary Actions Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditBookingOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Редактировать параметры бронирования, даты и автомобиль"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Редактировать</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsCarSwapModalOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Заменить автомобиль в процессе аренды"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Заменить авто</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExtensionModalOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Продлить срок аренды на дни или часы"
                >
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Продлить</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Оформить возврат клиенту денег"
                >
                  <DollarSign className="w-3.5 h-3.5 text-rose-400" />
                  <span>Возврат денег</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const hasDocs = selectedBooking.customer?.passportPhotoUrl ||
                      selectedBooking.customer?.driverLicensePhotoUrl ||
                      selectedBooking.customer?.driverLicenseBackPhotoUrl;
                    if (hasDocs) {
                      downloadAllCustomerDocuments(
                        selectedBooking.customer,
                        selectedBooking.bookingNumber,
                        selectedBooking.additionalDrivers
                      );
                    } else {
                      setIsDocsUploadModalOpen(true);
                    }
                  }}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition active:scale-95"
                  title="Скачать все прикрепленные документы клиента"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Скачать документы</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenContract(selectedBooking);
                  }}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Договор</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAdditionalDriversModalOpen(true)}
                  className="flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
                  title="Дополнительные водители"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Водители ({selectedBooking.additionalDrivers?.length || 0})</span>
                </button>
              </div>
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
        initialDays={bookingInitialDays}
      />

      {/* Customer Document Upload & AI OCR Modal */}
      {isDocsUploadModalOpen && selectedBooking?.customer && (
        <CustomerDocumentUploadModal
          isOpen={isDocsUploadModalOpen}
          onClose={() => setIsDocsUploadModalOpen(false)}
          customer={selectedBooking.customer}
          bookingId={selectedBooking.id}
          bookingNumber={selectedBooking.bookingNumber}
          onCustomerUpdated={(updatedCust) => {
            setSelectedBooking((prev: any) =>
              prev ? { ...prev, customer: { ...prev.customer, ...updatedCust } } : null
            );
            fetchTimeline();
          }}
        />
      )}

      {/* Customer Full Dossier & Documents Modal */}
      {isCustomerDossierOpen && selectedBooking?.customer && (
        <CustomerDossierModal
          isOpen={isCustomerDossierOpen}
          onClose={() => setIsCustomerDossierOpen(false)}
          customerId={selectedBooking.customer.id}
          bookingId={selectedBooking.id}
          onCustomerUpdated={(updatedCust) => {
            setSelectedBooking((prev: any) =>
              prev ? { ...prev, customer: { ...prev.customer, ...updatedCust } } : null
            );
            fetchTimeline();
          }}
        />
      )}

      {/* Edit Booking Modal (Dates, Car, Locations, Pricing, Status) */}
      {isEditBookingOpen && selectedBooking && (
        <EditBookingModal
          isOpen={isEditBookingOpen}
          onClose={() => setIsEditBookingOpen(false)}
          booking={selectedBooking}
          cars={data?.cars || []}
          onBookingUpdated={(updatedBooking) => {
            setSelectedBooking(updatedBooking);
            fetchTimeline();
          }}
        />
      )}

      {/* Booking Refund Modal */}
      {isRefundModalOpen && selectedBooking && (
        <BookingRefundModal
          isOpen={isRefundModalOpen}
          onClose={() => setIsRefundModalOpen(false)}
          booking={selectedBooking}
          onRefundCompleted={(updatedBooking) => {
            if (updatedBooking) {
              setSelectedBooking(updatedBooking);
            }
            fetchTimeline();
          }}
        />
      )}

      {/* Booking Extension Modal */}
      {isExtensionModalOpen && selectedBooking && (
        <BookingExtensionModal
          isOpen={isExtensionModalOpen}
          onClose={() => setIsExtensionModalOpen(false)}
          booking={selectedBooking}
          onExtensionCompleted={(updatedBooking) => {
            if (updatedBooking) {
              setSelectedBooking(updatedBooking);
            }
            fetchTimeline();
          }}
        />
      )}

      {/* Additional Drivers Modal (up to 4 with license photos) */}
      {isAdditionalDriversModalOpen && selectedBooking && (
        <AdditionalDriversModal
          isOpen={isAdditionalDriversModalOpen}
          onClose={() => setIsAdditionalDriversModalOpen(false)}
          bookingId={selectedBooking.id}
          bookingNumber={selectedBooking.bookingNumber}
          onDriversUpdated={() => {
            fetchTimeline();
            fetch(`/api/bookings/${selectedBooking.id}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.success && d.booking) {
                  setSelectedBooking(d.booking);
                }
              })
              .catch(() => {});
          }}
        />
      )}

      {/* Car Swap Modal */}
      {isCarSwapModalOpen && selectedBooking && (
        <CarSwapModal
          isOpen={isCarSwapModalOpen}
          onClose={() => setIsCarSwapModalOpen(false)}
          booking={selectedBooking}
          onSwapCompleted={() => {
            setIsCarSwapModalOpen(false);
            setSelectedBooking(null);
            fetchTimeline();
          }}
        />
      )}

      {/* Availability Search & Matcher Modal */}
      {isAvailabilitySearchOpen && (
        <AvailabilitySearchModal
          isOpen={isAvailabilitySearchOpen}
          onClose={() => setIsAvailabilitySearchOpen(false)}
          currentCity={selectedCity}
          onJumpTimeline={(dateStr) => {
            setCurrentStartDate(dateStr);
            setDaysCount(14);
          }}
          onBookCar={(carId, startDateStr, days) => {
            handleOpenNewBooking(carId, startDateStr, days);
          }}
        />
      )}

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

      {/* Car Details & Presence City / Availability Modal */}
      {selectedCarForDetails && (
        <CarDetailsModal
          carId={selectedCarForDetails}
          isOpen={!!selectedCarForDetails}
          initialTab={carModalTab}
          onClose={() => setSelectedCarForDetails(null)}
          onUpdated={() => {
            fetchTimeline();
          }}
        />
      )}

      {/* New Car Modal */}
      {isNewCarModalOpen && (
        <NewCarModal
          isOpen={isNewCarModalOpen}
          defaultCityCode={selectedCity === "ALL" ? "BUS" : selectedCity}
          onClose={() => setIsNewCarModalOpen(false)}
          onCarCreated={() => {
            fetchTimeline();
          }}
        />
      )}

      {/* Fleet City Distributor Modal */}
      {isCityDistributorOpen && (
        <FleetCityDistributorModal
          isOpen={isCityDistributorOpen}
          onClose={() => setIsCityDistributorOpen(false)}
          onCitiesUpdated={() => {
            fetchTimeline();
          }}
        />
      )}

      {/* Database Backup & Storage Modal */}
      {isBackupModalOpen && (
        <DatabaseBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          onDataRestored={() => {
            fetchTimeline();
          }}
        />
      )}

      {/* Booking History & Archive Modal */}
      {isHistoryModalOpen && (
        <BookingHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          cars={data?.cars || []}
          onSelectBooking={(booking) => {
            setSelectedBooking(booking);
            setIsHistoryModalOpen(false);
          }}
          onEditBooking={(booking) => {
            setSelectedBooking(booking);
            setIsEditBookingOpen(true);
            setIsHistoryModalOpen(false);
          }}
          onOpenContract={(booking) => {
            if (onOpenContract) {
              onOpenContract(booking);
              setIsHistoryModalOpen(false);
            }
          }}
          onOpenHandover={(booking) => {
            if (onOpenHandover) {
              onOpenHandover(booking);
              setIsHistoryModalOpen(false);
            }
          }}
          onOpenReturn={(booking) => {
            if (onOpenReturn) {
              onOpenReturn(booking);
              setIsHistoryModalOpen(false);
            }
          }}
          onOpenCustomerDossier={(customer, bookingId) => {
            setSelectedBooking((prev: any) => ({
              ...prev,
              id: bookingId,
              customer,
            }));
            setIsCustomerDossierOpen(true);
            setIsHistoryModalOpen(false);
          }}
          onOpenDocsUpload={(customer, bookingId, bookingNumber) => {
            setSelectedBooking((prev: any) => ({
              ...prev,
              id: bookingId,
              bookingNumber,
              customer,
            }));
            setIsDocsUploadModalOpen(true);
            setIsHistoryModalOpen(false);
          }}
        />
      )}



      {/* Printable Contract Modal */}
      {internalContractBooking && (
        <ContractModal
          booking={internalContractBooking}
          onClose={() => setInternalContractBooking(null)}
        />
      )}

    </div>
  );
};
