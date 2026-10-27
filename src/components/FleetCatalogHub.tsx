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
  Camera,
  Upload,
  Eye,
  Loader2,
  X,
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

  // Photo upload / change modal state
  const [photoModalCar, setPhotoModalCar] = useState<any | null>(null);
  const [isUploadingCarPhoto, setIsUploadingCarPhoto] = useState<boolean>(false);
  const [carPhotoUrlInput, setCarPhotoUrlInput] = useState<string>("");

  // Tech Passport upload & AI recognition state
  const [recognizingTechPassportCarId, setRecognizingTechPassportCarId] = useState<string | null>(null);
  const [techPassportScanModalUrl, setTechPassportScanModalUrl] = useState<string | null>(null);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);

  const handleUploadAndRecognizeTechPassport = async (carId: string, file: File) => {
    try {
      setRecognizingTechPassportCarId(carId);
      setOcrSuccessNotice(null);

      // 1. Upload tech passport image to /api/upload
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "tech_passports");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData.success || !uploadData.url) {
        throw new Error(uploadData.error || "Ошибка загрузки фото техпаспорта");
      }

      // 2. Run AI OCR recognition via /api/ai/recognize-tech-passport
      const ocrRes = await fetch("/api/ai/recognize-tech-passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          frontUrl: uploadData.url,
          autoSave: true,
        }),
      });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok || !ocrData.success) {
        throw new Error(ocrData.error || "Ошибка распознавания техпаспорта нейросетью");
      }

      const d = ocrData.extractedData || {};
      setOcrSuccessNotice(
        `✓ Техпаспорт успешно распознан и сохранен! VIN: ${d.vin || "—"}, Госномер: ${d.plateNumber || "—"}, №: ${d.techPassportNumber || "—"}`
      );
      setTimeout(() => setOcrSuccessNotice(null), 6000);

      // 3. Update local state
      setCars((prev) =>
        prev.map((c) =>
          c.id === carId
            ? {
                ...c,
                techPassportFrontUrl: uploadData.url,
                techPassportNumber: d.techPassportNumber || c.techPassportNumber,
                vin: d.vin || c.vin,
                plateNumber: d.plateNumber || c.plateNumber,
                year: d.year || c.year,
              }
            : c
        )
      );
    } catch (err: any) {
      alert("Ошибка при обработке техпаспорта: " + (err.message || "Неизвестная ошибка"));
    } finally {
      setRecognizingTechPassportCarId(null);
    }
  };

  const handleUploadCarPhoto = async (carId: string, file: File) => {
    try {
      setIsUploadingCarPhoto(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "cars_catalog");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || "Ошибка загрузки фото");
      }

      await fetch(`/api/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url, cardBannerUrl: data.url }),
      });

      setCars((prev) =>
        prev.map((c) =>
          c.id === carId ? { ...c, imageUrl: data.url, cardBannerUrl: data.url } : c
        )
      );
      if (photoModalCar && photoModalCar.id === carId) {
        setPhotoModalCar((prev: any) => (prev ? { ...prev, imageUrl: data.url } : null));
      }
      setOcrSuccessNotice("✓ Фотография / карточка автомобиля успешно обновлена!");
      setTimeout(() => setOcrSuccessNotice(null), 4000);
    } catch (err: any) {
      alert("Не удалось загрузить фото автомобиля: " + (err.message || "Ошибка"));
    } finally {
      setIsUploadingCarPhoto(false);
    }
  };

  const handleSaveCarPhotoUrl = async (carId: string, url: string) => {
    try {
      setIsUploadingCarPhoto(true);
      await fetch(`/api/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url.trim() || null, cardBannerUrl: url.trim() || null }),
      });

      setCars((prev) =>
        prev.map((c) =>
          c.id === carId ? { ...c, imageUrl: url.trim() || null, cardBannerUrl: url.trim() || null } : c
        )
      );
      setPhotoModalCar(null);
      setCarPhotoUrlInput("");
      setOcrSuccessNotice("✓ Ссылка на фото автомобиля сохранена!");
      setTimeout(() => setOcrSuccessNotice(null), 4000);
    } catch (err: any) {
      alert("Ошибка сохранения ссылки на фото: " + (err.message || "Ошибка"));
    } finally {
      setIsUploadingCarPhoto(false);
    }
  };

  const handleResetCarPhoto = async (carId: string) => {
    if (!confirm("Сбросить загруженную фотографию к стандартному шаблону?")) return;
    try {
      setIsUploadingCarPhoto(true);
      await fetch(`/api/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: null, cardBannerUrl: null }),
      });

      setCars((prev) =>
        prev.map((c) =>
          c.id === carId ? { ...c, imageUrl: null, cardBannerUrl: null } : c
        )
      );
      setPhotoModalCar(null);
      setCarPhotoUrlInput("");
    } catch (err: any) {
      alert("Ошибка сброса фото: " + err.message);
    } finally {
      setIsUploadingCarPhoto(false);
    }
  };

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

  // Aggregated Brand Counts (case-insensitive & trimmed)
  const brandStats = useMemo(() => {
    const brandMap: Record<string, { label: string; count: number }> = {};
    let total = 0;
    cars.forEach((c) => {
      if (!c.isArchived) {
        total++;
        const rawBrand = (c.brand || "").trim();
        const displayBrand = rawBrand || "Другие";
        const key = displayBrand.toLowerCase();

        if (!brandMap[key]) {
          // Normalize all-caps brands (e.g. SUBARU -> Subaru, TOYOTA -> Toyota, except short acronyms like BMW)
          const formattedLabel =
            displayBrand.length > 3 && displayBrand === displayBrand.toUpperCase()
              ? displayBrand.charAt(0).toUpperCase() + displayBrand.slice(1).toLowerCase()
              : displayBrand;
          brandMap[key] = { label: formattedLabel, count: 0 };
        } else {
          // Prefer Title Case over ALL-CAPS if both exist
          if (displayBrand !== displayBrand.toUpperCase() && brandMap[key].label === brandMap[key].label.toUpperCase()) {
            brandMap[key].label = displayBrand;
          }
        }
        brandMap[key].count++;
      }
    });

    // Sort brands alphabetically (A-Z)
    const sortedBrands = Object.values(brandMap)
      .map((item) => [item.label, item.count] as [string, number])
      .sort((a, b) => {
        if (a[0] === "Другие") return 1;
        if (b[0] === "Другие") return -1;
        return a[0].localeCompare(b[0], "ru", { sensitivity: "base" });
      });
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

      // Brand filter (case-insensitive & trimmed)
      if (selectedBrand !== "ALL") {
        const sel = selectedBrand.trim().toLowerCase();
        const b = (car.brand || "").trim().toLowerCase();
        if (b !== sel) {
          return false;
        }
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
        if (!car.isStopBlocked && car.status !== "MAINTENANCE" && car.status !== "BLOCKED") return false;
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
    }).sort((a, b) => {
      const brandA = (a.brand || "").trim();
      const brandB = (b.brand || "").trim();
      const brandCmp = brandA.localeCompare(brandB, "ru", { sensitivity: "base" });
      if (brandCmp !== 0) return brandCmp;

      const modelA = (a.model || "").trim();
      const modelB = (b.model || "").trim();
      const modelCmp = modelA.localeCompare(modelB, "ru", { sensitivity: "base" });
      if (modelCmp !== 0) return modelCmp;

      return (a.plateNumber || "").localeCompare(b.plateNumber || "");
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
        
        {ocrSuccessNotice && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500/60 rounded-2xl flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{ocrSuccessNotice}</span>
            </div>
            <button onClick={() => setOcrSuccessNotice(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        
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
            const isSelected = selectedBrand !== "ALL" && selectedBrand.trim().toLowerCase() === brand.trim().toLowerCase();
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
            const hasValidInspection = Boolean(car.inspectionExpiryDate && new Date(car.inspectionExpiryDate) >= new Date());
            const isInspectionExpired = Boolean(car.inspectionExpiryDate && new Date(car.inspectionExpiryDate) < new Date());
            const inspectionExpiryFormatted = car.inspectionExpiryDate
              ? new Date(car.inspectionExpiryDate).toLocaleDateString("ru-RU")
              : null;
            const hasCustomPhoto = Boolean(car.imageUrl || car.cardBannerUrl);

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
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 z-10">
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

                  {/* Photo Custom / Fallback Tag & Quick Change Photo Button */}
                  <div className="absolute top-11 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-lg border backdrop-blur-sm pointer-events-auto ${
                      hasCustomPhoto
                        ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-950/85 text-slate-400 border-slate-800"
                    }`}>
                      {hasCustomPhoto ? "✓ Наша карточка" : "Шаблон фото"}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setPhotoModalCar(car);
                        setCarPhotoUrlInput(car.imageUrl || car.cardBannerUrl || "");
                      }}
                      className="p-1.5 bg-slate-950/90 hover:bg-amber-600 text-slate-200 hover:text-white rounded-xl border border-slate-700/80 shadow-md backdrop-blur-md transition flex items-center space-x-1 text-[10px] font-bold pointer-events-auto group/photo"
                      title="Сменить фотографию / загрузить товарную карточку авто"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400 group-hover/photo:text-white" />
                      <span className="text-[10px]">Сменить фото</span>
                    </button>
                  </div>

                  {/* Bottom Class & Plate Bar on Image */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-10">
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
                        {car.fuelType === "ELECTRIC" ? "⚡ Электро" : `${car.currentFuelPerc || 100}% (${car.tankVolumeLiters || 60} л)`} • {car.transmission === "MANUAL" ? "Мех." : "АКПП"}
                      </div>
                    </div>

                    {/* ТЕХПАСПОРТ АВТОМОБИЛЯ */}
                    {(() => {
                      const hasTechPassport = Boolean(car.techPassportFrontUrl || car.techPassportBackUrl || car.techPassportNumber);
                      const techPassportScanUrl = car.techPassportFrontUrl || car.techPassportBackUrl;
                      const isRecognizing = recognizingTechPassportCarId === car.id;

                      return (
                        <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80 col-span-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <FileText className={`w-3.5 h-3.5 ${hasTechPassport ? "text-emerald-400" : "text-rose-400"}`} />
                              <span className="font-bold text-white text-[11px]">Техпаспорт автомобиля:</span>
                            </div>

                            {hasTechPassport ? (
                              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded">
                                ✓ {car.techPassportNumber ? `№ ${car.techPassportNumber}` : "Загружен"}
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-rose-300 bg-rose-950/90 border border-rose-500/50 px-2 py-0.5 rounded animate-pulse">
                                ❌ Не загружен
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-850">
                            {techPassportScanUrl ? (
                              <button
                                type="button"
                                onClick={() => setTechPassportScanModalUrl(techPassportScanUrl)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center space-x-1 hover:underline"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Посмотреть скан</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">Скан не прикреплен</span>
                            )}

                            <label className={`cursor-pointer px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center space-x-1 transition shadow-sm ${
                              isRecognizing
                                ? "bg-amber-600 text-white cursor-wait"
                                : hasTechPassport
                                ? "bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-750"
                                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 shadow-amber-950/50"
                            }`}>
                              {isRecognizing ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>ИИ считывает...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 text-slate-950" />
                                  <span>{hasTechPassport ? "Обновить" : "Загрузить и распознать"}</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    className="hidden"
                                    disabled={isRecognizing}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleUploadAndRecognizeTechPassport(car.id, f);
                                    }}
                                  />
                                </>
                              )}
                            </label>
                          </div>
                        </div>
                      );
                    })()}
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
                  <th className="py-3 px-3">Техосмотр (PTI)</th>
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

                      <td className="py-3 px-3">
                        {car.techPassportFrontUrl || car.techPassportNumber ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                              ✓ {car.techPassportNumber ? `№ ${car.techPassportNumber}` : "Загружен"}
                            </span>
                            {car.techPassportFrontUrl && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTechPassportScanModalUrl(car.techPassportFrontUrl);
                                }}
                                className="p-1 hover:text-cyan-300 text-slate-400 transition"
                                title="Посмотреть скан техпаспорта"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                            <label
                              onClick={(e) => e.stopPropagation()}
                              className="cursor-pointer px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[9px] font-bold"
                              title="Обновить скан и распознать"
                            >
                              <span>{recognizingTechPassportCarId === car.id ? "..." : "Обновить"}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={recognizingTechPassportCarId === car.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleUploadAndRecognizeTechPassport(car.id, f);
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <label
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 rounded text-[10px] font-black inline-flex items-center space-x-1 shadow transition active:scale-95"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{recognizingTechPassportCarId === car.id ? "Считывание..." : "Загрузить"}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={recognizingTechPassportCarId === car.id}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadAndRecognizeTechPassport(car.id, f);
                              }}
                            />
                          </label>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {car.inspectionExpiryDate && new Date(car.inspectionExpiryDate) >= new Date() ? (
                          <span className="font-mono text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                            до {new Date(car.inspectionExpiryDate).toLocaleDateString("ru-RU")}
                          </span>
                        ) : car.inspectionExpiryDate ? (
                          <span className="font-mono text-[10px] text-red-400 font-bold bg-red-950 px-2 py-0.5 rounded border border-red-500/40">
                            Истек
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">—</span>
                        )}
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
          onUpdated={(updatedCar) => {
            fetchCars();
            if (updatedCar) {
              setOcrSuccessNotice(`✓ Изменения для ${updatedCar.brand || ""} ${updatedCar.model || ""} (${updatedCar.plateNumber || ""}) сохранены!`);
              setTimeout(() => setOcrSuccessNotice(null), 4000);
            }
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

      {/* Modal: Смена фото автомобиля / Загрузка товарной карточки */}
      {photoModalCar && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    Фото / Товарная карточка авто
                  </h3>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {photoModalCar.brand} {photoModalCar.model} ({photoModalCar.plateNumber})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPhotoModalCar(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current photo preview */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 block">
                Текущее изображение автомобиля:
              </span>
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                <img
                  src={photoModalCar.imageUrl || photoModalCar.cardBannerUrl || getFallbackCarImage(photoModalCar.model)}
                  alt="Предпросмотр"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-sm text-[10px] text-white font-bold border border-white/10">
                  {photoModalCar.imageUrl || photoModalCar.cardBannerUrl ? "✓ Загруженная карточка автопарка" : "Шаблонное авто"}
                </div>
              </div>
            </div>

            {/* Upload from device */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-300 block">
                Загрузить наше фото или товарную карточку (файл):
              </span>
              <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-amber-500/40 hover:border-amber-400 bg-slate-950 hover:bg-slate-950/80 cursor-pointer transition group">
                <Upload className="w-6 h-6 text-amber-400 group-hover:scale-110 transition mb-1" />
                <span className="text-xs font-bold text-white">
                  {isUploadingCarPhoto ? "Загрузка файла..." : "📁 Выберите файл с фото / карточкой"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  PNG, JPG, WEBP (рекомендуется формат 16:9 или рекламная товарная плашка)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingCarPhoto}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadCarPhoto(photoModalCar.id, f);
                  }}
                />
              </label>
            </div>

            {/* Or Paste Direct URL */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold text-slate-300 block">
                Или укажите прямую ссылку на изображение (URL):
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={carPhotoUrlInput}
                  onChange={(e) => setCarPhotoUrlInput(e.target.value)}
                  placeholder="https://... или /uploads/..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={!carPhotoUrlInput.trim() || isUploadingCarPhoto}
                  onClick={() => handleSaveCarPhotoUrl(photoModalCar.id, carPhotoUrlInput)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition disabled:opacity-50"
                >
                  Применить
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {(photoModalCar.imageUrl || photoModalCar.cardBannerUrl) ? (
                <button
                  type="button"
                  disabled={isUploadingCarPhoto}
                  onClick={() => handleResetCarPhoto(photoModalCar.id)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Сбросить к шаблону</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setPhotoModalCar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Просмотр скана техпаспорта */}
      {techPassportScanModalUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-5 space-y-3 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-bold text-white text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Скан техпаспорта автомобиля (Свидетельство о регистрации ТС)</span>
              </span>
              <button
                onClick={() => setTechPassportScanModalUrl(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto rounded-2xl bg-black flex items-center justify-center border border-slate-800">
              <img
                src={techPassportScanModalUrl}
                alt="Скан техпаспорта"
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={techPassportScanModalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Открыть оригинал в новой вкладке</span>
              </a>

              <button
                onClick={() => setTechPassportScanModalUrl(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
