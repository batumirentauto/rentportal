"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Search,
  Filter,
  PlusCircle,
  Copy,
  Check,
  MapPin,
  Calendar,
  Gauge,
  Fuel,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  LayoutGrid,
  List,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Lock,
  Unlock,
  Archive,
  DollarSign,
  Tag,
  Key,
  ShieldAlert,
} from "lucide-react";
import { CarDetailsModal } from "./CarDetailsModal";
import { NewCarModal } from "./NewCarModal";
import { FleetCityDistributorModal } from "./FleetCityDistributorModal";
import { getCityTheme } from "./FleetTimelineGrid";

interface FleetCatalogHubProps {
  onOpenBookingForCar?: (carId: string) => void;
}

export const FleetCatalogHub: React.FC<FleetCatalogHubProps> = ({
  onOpenBookingForCar,
}) => {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedClass, setSelectedClass] = useState<string>("ALL");
  const [selectedTransmission, setSelectedTransmission] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "TABLE">("GRID");

  // Modals
  const [selectedCarForDetails, setSelectedCarForDetails] = useState<string | null>(null);
  const [carModalTab, setCarModalTab] = useState<"general" | "availability">("general");
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState<boolean>(false);
  const [isCityDistributorOpen, setIsCityDistributorOpen] = useState<boolean>(false);

  // Copied VIN tooltip feedback
  const [copiedVinId, setCopiedVinId] = useState<string | null>(null);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fleet/cars?includeArchived=ALL");
      const json = await res.json();
      if (json.success && Array.isArray(json.cars)) {
        setCars(json.cars);
      }
    } catch (err) {
      console.error("Error fetching fleet catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  // Copy VIN handler
  const handleCopyVin = (carId: string, vin: string) => {
    if (!vin) return;
    navigator.clipboard.writeText(vin);
    setCopiedVinId(carId);
    setTimeout(() => {
      setCopiedVinId(null);
    }, 2000);
  };

  // Aggregated Brand Counts
  const brandStats = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    cars.forEach((c) => {
      if (!c.isArchived) {
        total++;
        const b = c.brand || "Другие";
        counts[b] = (counts[b] || 0) + 1;
      }
    });

    // Sort brands descending by number of cars
    const sortedBrands = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return { total, sortedBrands };
  }, [cars]);

  // Overall KPI metrics
  const metrics = useMemo(() => {
    let totalActive = 0;
    let availableNow = 0;
    let rentedNow = 0;
    let blockedNow = 0;
    let archivedCount = 0;
    let batumiCount = 0;
    let tbilisiCount = 0;
    let kutaisiCount = 0;
    let totalMileage = 0;

    cars.forEach((c) => {
      if (c.isArchived) {
        archivedCount++;
      } else {
        totalActive++;
        totalMileage += c.currentMileage || 0;
        if (c.status === "AVAILABLE" && !c.isStopBlocked) availableNow++;
        if (c.status === "RENTED") rentedNow++;
        if (c.isStopBlocked || c.status === "MAINTENANCE") blockedNow++;

        const cityCode = c.city?.code;
        if (cityCode === "BUS") batumiCount++;
        else if (cityCode === "TBS") tbilisiCount++;
        else if (cityCode === "KUT") kutaisiCount++;
      }
    });

    const avgMileage = totalActive > 0 ? Math.round(totalMileage / totalActive) : 0;

    return {
      totalActive,
      availableNow,
      rentedNow,
      blockedNow,
      archivedCount,
      batumiCount,
      tbilisiCount,
      kutaisiCount,
      avgMileage,
    };
  }, [cars]);

  // Filtered cars list
  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      // Archived filter
      if (selectedStatus === "ARCHIVED") {
        if (!car.isArchived) return false;
      } else {
        if (car.isArchived && selectedStatus !== "ALL_WITH_ARCHIVE") return false;
      }

      // Brand filter
      if (selectedBrand !== "ALL" && car.brand !== selectedBrand) {
        return false;
      }

      // City filter
      if (selectedCity !== "ALL" && car.city?.code !== selectedCity) {
        return false;
      }

      // Status filter
      if (selectedStatus === "AVAILABLE") {
        if (car.status !== "AVAILABLE" || car.isStopBlocked) return false;
      } else if (selectedStatus === "RENTED") {
        if (car.status !== "RENTED") return false;
      } else if (selectedStatus === "BLOCKED") {
        if (!car.isStopBlocked && car.status !== "MAINTENANCE") return false;
      }

      // Class filter
      if (selectedClass !== "ALL" && car.carClass !== selectedClass) {
        return false;
      }

      // Transmission filter
      if (selectedTransmission !== "ALL" && car.transmission !== selectedTransmission) {
        return false;
      }

      // Search query filter (plate, model, brand, vin, color, tech passport)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const plate = (car.plateNumber || "").toLowerCase();
        const brand = (car.brand || "").toLowerCase();
        const model = (car.model || "").toLowerCase();
        const vin = (car.vin || "").toLowerCase();
        const color = (car.color || "").toLowerCase();
        const tp = (car.techPassportNumber || "").toLowerCase();

        const match =
          plate.includes(q) ||
          brand.includes(q) ||
          model.includes(q) ||
          vin.includes(q) ||
          color.includes(q) ||
          tp.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [
    cars,
    selectedBrand,
    selectedCity,
    selectedStatus,
    selectedClass,
    selectedTransmission,
    searchQuery,
  ]);

  const getClassBadge = (carClass: string) => {
    switch (carClass?.toUpperCase()) {
      case "ECONOMY":
        return { label: "Эконом", bg: "bg-blue-950/70 text-blue-300 border-blue-500/30" };
      case "COMFORT":
        return { label: "Комфорт", bg: "bg-amber-950/70 text-amber-300 border-amber-500/30" };
      case "CROSSOVER":
      case "SUV":
        return { label: "Кроссовер 4x4", bg: "bg-emerald-950/70 text-emerald-300 border-emerald-500/30" };
      case "PREMIUM":
        return { label: "Премиум", bg: "bg-purple-950/70 text-purple-300 border-purple-500/30" };
      case "MINIVAN":
        return { label: "Минивэн", bg: "bg-indigo-950/70 text-indigo-300 border-indigo-500/30" };
      default:
        return { label: carClass || "Стандарт", bg: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  const getFallbackCarImage = (model: string) => {
    const m = (model || "").toLowerCase();
    if (m.includes("rav4")) return "https://images.unsplash.com/photo-1581540222194-0def2dda95b8?auto=format&fit=crop&w=600&q=80";
    if (m.includes("escape")) return "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80";
    if (m.includes("renegade")) return "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80";
    if (m.includes("prius")) return "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80";
    if (m.includes("tucson")) return "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80";
    if (m.includes("sportage")) return "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=600&q=80";
    if (m.includes("rogue")) return "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=600&q=80";
    if (m.includes("giulia")) return "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=600&q=80";
    return "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80";
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      
      {/* Top Banner & KPI Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        
        {/* Header row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  База и Каталог автопарка
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {metrics.totalActive} авто в строю
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Единая база автомобилей, технические параметры, VIN-коды, пробеги, города и тарифы
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCityDistributorOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
              title="Быстрое распределение городов для всего автопарка"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>📍 Распределить города</span>
            </button>

            <button
              onClick={() => setIsNewCarModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Добавить автомобиль</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-xs">
          
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px]">Всего в автопарке</div>
            <div className="text-xl font-black text-white mt-0.5">{cars.length}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">С учетом архива</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Свободны сейчас</span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{metrics.availableNow}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Готовы к аренде</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>В поездках</span>
            </div>
            <div className="text-xl font-black text-blue-400 mt-0.5">{metrics.rentedNow}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">У клиентов</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <span>🏛️ Тбилиси (TBS)</span>
            </div>
            <div className="text-xl font-black text-amber-300 mt-0.5">{metrics.tbilisiCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Филиал столицы</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <span>🌊 Батуми (BUS)</span>
            </div>
            <div className="text-xl font-black text-cyan-300 mt-0.5">{metrics.batumiCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Морской филиал</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-2xl">
            <div className="text-slate-400 text-[11px] flex items-center space-x-1">
              <span>🌿 Кутаиси (KUT)</span>
            </div>
            <div className="text-xl font-black text-emerald-300 mt-0.5">{metrics.kutaisiCount}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Хаб аэропорта</div>
          </div>

        </div>

      </div>

      {/* Brand Selection Pills */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Фильтр по маркам авто:</span>
          </span>
          <span className="text-slate-500 text-[11px]">
            Выбрано: <strong className="text-white">{filteredCars.length}</strong> авто
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedBrand("ALL")}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 ${
              selectedBrand === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <span>Все марки</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {brandStats.total}
            </span>
          </button>

          {brandStats.sortedBrands.map(([brand, count]) => {
            const isSelected = selectedBrand === brand;
            return (
              <button
                key={brand}
                onClick={() => setSelectedBrand(isSelected ? "ALL" : brand)}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1.5 active:scale-95 ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-md ring-2 ring-amber-300"
                    : "bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800"
                }`}
              >
                <span>{brand}</span>
                <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-slate-950/30 text-slate-950" : "bg-slate-800 text-amber-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar: Search, City, Status, View mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md flex flex-wrap items-center justify-between gap-2.5">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по госномеру, марке, модели, VIN-коду..."
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* City */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">📍 Все города</option>
            <option value="TBS">🏛️ Тбилиси</option>
            <option value="BUS">🌊 Батуми</option>
            <option value="KUT">🌿 Кутаиси</option>
          </select>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Статус: Все активные</option>
            <option value="AVAILABLE">🟢 Только свободные</option>
            <option value="RENTED">🚗 В поездке (у клиента)</option>
            <option value="BLOCKED">⛔ На СТОПе / закрыты</option>
            <option value="ARCHIVED">📦 Выведенные из автопарка</option>
            <option value="ALL_WITH_ARCHIVE">Все включая архив</option>
          </select>

          {/* Class */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Класс: Все</option>
            <option value="ECONOMY">Эконом</option>
            <option value="COMFORT">Комфорт</option>
            <option value="CROSSOVER">Кроссовер / SUV</option>
            <option value="PREMIUM">Премиум</option>
            <option value="MINIVAN">Минивэн</option>
          </select>

          {/* Transmission */}
          <select
            value={selectedTransmission}
            onChange={(e) => setSelectedTransmission(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">КПП: Все</option>
            <option value="AUTOMATIC">Автомат</option>
            <option value="MANUAL">Механика</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "GRID"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Отобразить карточками (Каталог)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("TABLE")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "TABLE"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Отобразить таблицей (Реестр)"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Main Content: Grid View or Table View */}
      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="font-bold text-white text-base">Загрузка каталога автопарка...</p>
        </div>
      ) : filteredCars.length === 0 ? (
        <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Автомобили не найдены</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            По заданным фильтрам марка/город/статус или поисковому запросу ничего не найдено.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedBrand("ALL");
              setSelectedCity("ALL");
              setSelectedStatus("ALL");
              setSelectedClass("ALL");
              setSelectedTransmission("ALL");
            }}
            className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition"
          >
            Сбросить все фильтры
          </button>
        </div>
      ) : viewMode === "GRID" ? (
        
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCars.map((car) => {
            const cityTheme = getCityTheme(car.city?.code);
            const classInfo = getClassBadge(car.carClass);
            const isAvailable = car.status === "AVAILABLE" && !car.isStopBlocked && !car.isArchived;
            const isRented = car.status === "RENTED" && !car.isArchived;
            const photoUrl = car.imageUrl || car.cardBannerUrl || getFallbackCarImage(car.model);
            const isVinCopied = copiedVinId === car.id;

            return (
              <div
                key={car.id}
                className={`bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl transition-all duration-200 flex flex-col group ${
                  car.isArchived ? "opacity-75 grayscale-[20%]" : ""
                }`}
              >
                {/* Photo & Badges Container */}
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={`${car.brand} ${car.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5">
                    {/* City Badge */}
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-xl border flex items-center space-x-1 shadow-md backdrop-blur-md ${cityTheme.badgeBg}`}
                    >
                      <span>{cityTheme.icon}</span>
                      <span>{cityTheme.name}</span>
                    </span>

                    {/* Status Badge */}
                    {car.isArchived ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-rose-950 text-rose-300 border border-rose-500/60 shadow">
                        📦 В архиве
                      </span>
                    ) : car.isStopBlocked ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-red-600 text-white animate-pulse shadow">
                        ⛔ НА СТОПЕ
                      </span>
                    ) : isRented ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-blue-950/90 text-blue-300 border border-blue-500/50 shadow">
                        🚗 В аренде
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        <span>Свободен</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Class & Plate Bar on Image */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold ${classInfo.bg}`}>
                      {classInfo.label}
                    </span>

                    <span className="font-mono text-xs font-black text-amber-400 bg-slate-950/90 backdrop-blur-md px-2.5 py-0.5 rounded-lg border border-slate-700 shadow flex items-center space-x-1">
                      <span>🇬🇪</span>
                      <span>{car.plateNumber}</span>
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                  
                  {/* Title & Year */}
                  <div>
                    <div className="flex items-baseline justify-between">
                      <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                        {car.brand} {car.model}
                      </h3>
                      {car.year && (
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {car.year} г.
                        </span>
                      )}
                    </div>
                    {car.color && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Цвет: <strong className="text-slate-300">{car.color}</strong>
                        {car.engineVolume && ` • ${car.engineVolume}`}
                      </div>
                    )}
                  </div>

                  {/* VIN Code with Instant Copy Button */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-slate-500 block leading-none mb-1 font-sans font-semibold">
                        VIN-код автомобиля:
                      </span>
                      <span className="text-xs font-bold text-amber-300 tracking-wider truncate block">
                        {car.vin || "НЕ УКАЗАН"}
                      </span>
                    </div>

                    {car.vin && (
                      <button
                        onClick={() => handleCopyVin(car.id, car.vin)}
                        className={`p-1.5 rounded-lg border transition active:scale-90 shrink-0 ${
                          isVinCopied
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                        }`}
                        title="Скопировать VIN в буфер обмена"
                      >
                        {isVinCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Technical & Mileage Parameters */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="space-y-1">
                      <div className="text-slate-500 flex items-center space-x-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>Пробег:</span>
                      </div>
                      <div className="font-mono font-bold text-white text-xs">
                        {(car.currentMileage || 0).toLocaleString("ru-RU")} км
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-slate-500 flex items-center space-x-1">
                        <Fuel className="w-3 h-3 text-amber-400" />
                        <span>Топливо / КПП:</span>
                      </div>
                      <div className="font-bold text-slate-200 truncate">
                        {car.fuelType === "ELECTRIC" ? "⚡ Электро" : `${car.currentFuelPerc || 100}% (бак ${car.tankVolumeLiters || 60} л)`} • {car.transmission === "MANUAL" ? "Мех." : "АКПП"}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                      <div className="text-slate-500 flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-purple-400" />
                        <span>Техпаспорт:</span>
                      </div>
                      <div className="font-mono font-bold text-slate-300 truncate">
                        {car.techPassportNumber || "—"}
                      </div>
                    </div>

                    <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                      <div className="text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-emerald-400" />
                        <span>Техосмотр:</span>
                      </div>
                      <div className="font-bold text-slate-300 truncate">
                        {car.inspectionExpiryDate
                          ? new Date(car.inspectionExpiryDate).toLocaleDateString("ru-RU")
                          : "Не указан"}
                      </div>
                    </div>
                  </div>

                  {/* Rates */}
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-400 text-[11px]">Тариф аренды:</span>
                    <div className="font-mono font-black text-emerald-400 text-sm">
                      {car.clientStandardDailyRate || 50} ₾<span className="text-[10px] text-slate-500 font-normal">/сут</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setSelectedCarForDetails(car.id);
                        setCarModalTab("general");
                      }}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition active:scale-95 flex items-center justify-center space-x-1"
                    >
                      <Car className="w-3.5 h-3.5" />
                      <span>Параметры / Карточка</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCarForDetails(car.id);
                        setCarModalTab("availability");
                      }}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition"
                      title="Управление доступностью и блокировками"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (

        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Автомобиль</th>
                  <th className="py-3 px-3">Госномер</th>
                  <th className="py-3 px-3">Город</th>
                  <th className="py-3 px-3">Статус</th>
                  <th className="py-3 px-3">VIN-код</th>
                  <th className="py-3 px-3">Пробег</th>
                  <th className="py-3 px-3">Техпаспорт</th>
                  <th className="py-3 px-3">Тариф</th>
                  <th className="py-3 px-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCars.map((car) => {
                  const cityTheme = getCityTheme(car.city?.code);
                  const isAvailable = car.status === "AVAILABLE" && !car.isStopBlocked && !car.isArchived;

                  return (
                    <tr
                      key={car.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedCarForDetails(car.id);
                        setCarModalTab("general");
                      }}
                    >
                      <td className="py-3 px-4">
                        <div className="font-black text-white group-hover:text-amber-400 transition-colors">
                          {car.brand} {car.model}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {car.year ? `${car.year} г.` : ""} {car.color ? `• ${car.color}` : ""}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {car.plateNumber}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cityTheme.badgeBg}`}>
                          {cityTheme.name}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {car.isArchived ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/50">
                            В архиве
                          </span>
                        ) : car.isStopBlocked ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-600 text-white animate-pulse">
                            СТОП
                          </span>
                        ) : isAvailable ? (
                          <span className="text-[10px] font-bold text-emerald-400">🟢 Свободен</span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-400">🚗 В аренде</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-amber-300">
                        {car.vin || "—"}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {(car.currentMileage || 0).toLocaleString("ru-RU")} км
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-400">
                        {car.techPassportNumber || "—"}
                      </td>

                      <td className="py-3 px-3 font-mono font-black text-emerald-400">
                        {car.clientStandardDailyRate || 50} ₾
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCarForDetails(car.id);
                            setCarModalTab("general");
                          }}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-bold text-xs transition"
                        >
                          Открыть
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Car Details & General/Availability Modal */}
      {selectedCarForDetails && (
        <CarDetailsModal
          carId={selectedCarForDetails}
          isOpen={!!selectedCarForDetails}
          initialTab={carModalTab}
          onClose={() => setSelectedCarForDetails(null)}
          onUpdated={() => {
            fetchCars();
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
            fetchCars();
          }}
        />
      )}

      {/* Fleet City Distributor Modal */}
      {isCityDistributorOpen && (
        <FleetCityDistributorModal
          isOpen={isCityDistributorOpen}
          onClose={() => setIsCityDistributorOpen(false)}
          onCitiesUpdated={() => {
            fetchCars();
          }}
        />
      )}

    </div>
  );
};
