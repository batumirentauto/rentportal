"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Car as CarIcon,
  MapPin,
  Calendar,
  Clock,
  ShieldAlert,
  Wrench,
  Check,
  AlertTriangle,
  Fuel,
  Gauge,
  User,
  Wallet,
  Lock,
  Unlock,
  FileText,
  RotateCcw,
  Sparkles,
  Upload,
  Camera,
  FileCheck,
  ExternalLink,
} from "lucide-react";

interface CarDetailsModalProps {
  carId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  initialTab?: "general" | "availability";
}

export const CarDetailsModal: React.FC<CarDetailsModalProps> = ({
  carId,
  isOpen,
  onClose,
  onUpdated,
  initialTab = "general",
}) => {
  const [activeTab, setActiveTab] = useState<"general" | "availability" | "bookings">(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [car, setCar] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states - General
  const [cityId, setCityId] = useState<string>("");
  const [status, setStatus] = useState<string>("AVAILABLE");
  const [currentMileage, setCurrentMileage] = useState<number>(50000);
  const [currentFuelPerc, setCurrentFuelPerc] = useState<number>(100);
  const [clientMinRate, setClientMinRate] = useState<number>(35);
  const [clientStandardRate, setClientStandardRate] = useState<number>(50);
  const [clientMaxRate, setClientMaxRate] = useState<number>(75);
  const [ownerId, setOwnerId] = useState<string>("");
  const [ownerDailyRate, setOwnerDailyRate] = useState<number>(25);
  const [pricingNotes, setPricingNotes] = useState<string>("");

  // Batumi Parking & GPS
  const [hasBatumiParking, setHasBatumiParking] = useState<boolean>(false);
  const [batumiParkingNumber, setBatumiParkingNumber] = useState<string>("");
  const [batumiParkingExpiresAt, setBatumiParkingExpiresAt] = useState<string>("");
  const [hasGpsTracker, setHasGpsTracker] = useState<boolean>(true);
  const [isGpsFeeChargedToOwner, setIsGpsFeeChargedToOwner] = useState<boolean>(true);

  // Tech Passport & Documents
  const [techPassportNumber, setTechPassportNumber] = useState<string>("");
  const [techPassportFrontUrl, setTechPassportFrontUrl] = useState<string | null>(null);
  const [techPassportBackUrl, setTechPassportBackUrl] = useState<string | null>(null);
  const [insurancePolicyPhotoUrl, setInsurancePolicyPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  // Form states - New Availability Block
  const [blockStartDate, setBlockStartDate] = useState<string>("");
  const [blockEndDate, setBlockEndDate] = useState<string>("");
  const [isIndefiniteBlock, setIsIndefiniteBlock] = useState<boolean>(false);
  const [blockReason, setBlockReason] = useState<string>("MAINTENANCE");
  const [blockReasonText, setBlockReasonText] = useState<string>("");
  const [blockNotes, setBlockNotes] = useState<string>("");
  const [blockCreatedBy, setBlockCreatedBy] = useState<string>("Менеджер");

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchCarDetails = async () => {
    if (!carId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/fleet/cars/${carId}`);
      const data = await res.json();
      if (data.success && data.car) {
        setCar(data.car);
        setCities(data.cities || []);
        setOwners(data.owners || []);

        setCityId(data.car.cityId || "");
        setStatus(data.car.status || "AVAILABLE");
        setCurrentMileage(data.car.currentMileage || 50000);
        setCurrentFuelPerc(data.car.currentFuelPerc ?? 100);
        setClientMinRate(data.car.clientMinDailyRate || 35);
        setClientStandardRate(data.car.clientStandardDailyRate || 50);
        setClientMaxRate(data.car.clientMaxDailyRate || 75);
        setOwnerId(data.car.ownerId || "");
        setOwnerDailyRate(data.car.defaultOwnerDailyRate || 25);
        setPricingNotes(data.car.pricingNotes || "");

        setHasBatumiParking(Boolean(data.car.hasBatumiParking));
        setBatumiParkingNumber(data.car.batumiParkingPermitNumber || "");
        setBatumiParkingExpiresAt(data.car.batumiParkingExpiresAt ? data.car.batumiParkingExpiresAt.split("T")[0] : "");
        setHasGpsTracker(data.car.hasGpsTracker !== false);
        setIsGpsFeeChargedToOwner(data.car.isGpsFeeChargedToOwner !== false);

        setTechPassportNumber(data.car.techPassportNumber || "");
        setTechPassportFrontUrl(data.car.techPassportFrontUrl || null);
        setTechPassportBackUrl(data.car.techPassportBackUrl || null);
        setInsurancePolicyPhotoUrl(data.car.insurancePolicyPhotoUrl || null);

        setBlockStartDate(todayStr);
        setBlockEndDate("");
        setIsIndefiniteBlock(false);
      } else {
        setErrorMsg(data.error || "Не удалось загрузить данные автомобиля");
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg("Ошибка связи с сервером");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && carId) {
      setActiveTab(initialTab);
      fetchCarDetails();
    }
  }, [isOpen, carId, initialTab]);

  if (!isOpen) return null;

  // Быстрая смена города присутствия в 1 клик
  const handleQuickChangeCity = async (targetCityId: string) => {
    if (targetCityId === cityId && targetCityId === car?.cityId) return;
    setCityId(targetCityId);
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityId: targetCityId }),
      });
      const data = await res.json();
      if (data.success) {
        setCar(data.car);
        setSuccessMsg(data.message || "Город дислокации успешно изменен!");
        if (onUpdated) onUpdated();
      } else {
        setErrorMsg(data.error || "Не удалось сменить город");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка сервера при смене города");
    } finally {
      setSaving(false);
    }
  };

  // Загрузка фото документов (техпаспорт лицевая/оборотная сторона, страховка)
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, field: "techPassportFront" | "techPassportBack" | "insurance") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", field === "insurance" ? "insurances" : "tech_passports");

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        if (field === "techPassportFront") {
          setTechPassportFrontUrl(data.url);
          // Auto-save to car immediately
          await fetch(`/api/fleet/cars/${carId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ techPassportFrontUrl: data.url }),
          });
          setSuccessMsg("Фото лицевой стороны техпаспорта успешно загружено!");
        } else if (field === "techPassportBack") {
          setTechPassportBackUrl(data.url);
          await fetch(`/api/fleet/cars/${carId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ techPassportBackUrl: data.url }),
          });
          setSuccessMsg("Фото оборотной стороны техпаспорта успешно загружено!");
        } else if (field === "insurance") {
          setInsurancePolicyPhotoUrl(data.url);
          await fetch(`/api/fleet/cars/${carId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ insurancePolicyPhotoUrl: data.url }),
          });
          setSuccessMsg("Фото полиса страхования успешно загружено!");
        }
        if (onUpdated) onUpdated();
      } else {
        setErrorMsg(data.error || "Не удалось загрузить фото");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Сетевая ошибка при загрузке фото");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Сохранение общих параметров
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/fleet/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityId,
          status,
          currentMileage,
          currentFuelPerc,
          clientMinDailyRate: clientMinRate,
          clientStandardDailyRate: clientStandardRate,
          clientMaxDailyRate: clientMaxRate,
          ownerId: ownerId || null,
          defaultOwnerDailyRate: ownerDailyRate,
          pricingNotes,
          hasBatumiParking,
          batumiParkingPermitNumber: batumiParkingNumber,
          batumiParkingExpiresAt: batumiParkingExpiresAt || null,
          hasGpsTracker,
          isGpsFeeChargedToOwner,
          techPassportNumber,
          techPassportFrontUrl,
          techPassportBackUrl,
          insurancePolicyPhotoUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCar(data.car);
        setSuccessMsg("Параметры автомобиля успешно сохранены!");
        if (onUpdated) onUpdated();
      } else {
        setErrorMsg(data.error || "Не удалось сохранить изменения");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка сервера при сохранении");
    } finally {
      setSaving(false);
    }
  };

  // Закрытие доступности (Создание блокировки)
  const handleCreateAvailabilityBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const effectiveEndDate = isIndefiniteBlock ? null : (blockEndDate || null);

    try {
      const res = await fetch(`/api/fleet/cars/${carId}/availability-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: blockStartDate || todayStr,
          endDate: effectiveEndDate,
          reason: blockReason,
          reasonText: blockReasonText || undefined,
          notes: blockNotes || undefined,
          createdBy: blockCreatedBy || "Менеджер",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        setBlockNotes("");
        setBlockReasonText("");
        setBlockEndDate("");
        setIsIndefiniteBlock(false);
        await fetchCarDetails();
        if (onUpdated) onUpdated();
      } else {
        setErrorMsg(data.error || "Не удалось заблокировать автомобиль");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка сервера при создании блокировки");
    } finally {
      setSaving(false);
    }
  };

  // Снятие блокировки (Восстановление доступности)
  const handleRemoveBlock = async (blockId: string) => {
    if (!confirm("Вы уверены, что хотите снять эту блокировку и открыть доступность автомобиля?")) {
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/fleet/cars/${carId}/availability-blocks?blockId=${blockId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMsg(data.message);
        await fetchCarDetails();
        if (onUpdated) onUpdated();
      } else {
        setErrorMsg(data.error || "Не удалось снять блокировку");
      }
    } catch (e) {
      console.error(e);
      setErrorMsg("Ошибка сервера при снятии блокировки");
    } finally {
      setSaving(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "MAINTENANCE":
        return { label: "🔧 ТО / Техобслуживание", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
      case "REPAIR":
        return { label: "⚙️ Ремонт / Ожидание запчастей", color: "bg-red-500/20 text-red-300 border-red-500/40" };
      case "SERVICE_TRIP":
        return { label: "🚗 Служебная поездка / Перегон", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
      case "PERSONAL":
        return { label: "👑 Резерв руководства / Личные цели", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
      case "DETAILING":
        return { label: "🧼 Химчистка / Детейлинг", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" };
      default:
        return { label: "⛔ Закрыто / Блокировка", color: "bg-slate-700 text-slate-200 border-slate-600" };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 sm:p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
                <CarIcon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {car ? `${car.brand} ${car.model}` : "Карточка автомобиля"}
                  </h3>
                  {car?.year && (
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                      {car.year}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {car?.plateNumber && (
                    <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-700 flex items-center space-x-1">
                      <span>🇬🇪</span>
                      <span>{car.plateNumber}</span>
                    </span>
                  )}
                  {car?.city && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{car.city.nameRu}</span>
                    </span>
                  )}
                  {car?.isStopBlocked ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-black bg-red-600 text-white animate-pulse shadow-sm shadow-red-900">
                      ⛔ НА СТОПЕ
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      🟢 В строю
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === "general"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-850 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Дислокация & Параметры</span>
            </button>

            <button
              onClick={() => setActiveTab("availability")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === "availability"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "bg-slate-850 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Закрыть доступность</span>
              {car?.availabilityBlocks?.filter((b: any) => b.isActive)?.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-400 animate-ping ml-1" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("bookings")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === "bookings"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-slate-850 text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Брони ({car?.bookings?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mx-4 mt-3 p-3 bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 text-xs font-semibold rounded-2xl flex items-center space-x-2 shadow-lg animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-950/90 border border-red-500/80 text-red-200 text-xs font-semibold rounded-2xl flex items-center space-x-2 shadow-lg animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Загрузка карточки автомобиля...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: GENERAL & CITY PRESENCE */}
              {activeTab === "general" && (
                <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
                  {/* CITY OF PRESENCE - PRIMARY HIGHLIGHTED BLOCK */}
                  <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-indigo-950/40 border-2 border-cyan-500/50 rounded-2xl p-4 space-y-3 shadow-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">📍</span>
                        <div>
                          <span className="text-sm font-black text-cyan-200 block">
                            Город дислокации и присутствия автомобиля
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Текущее фактическое местонахождение машины
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40">
                        {cities.find((c) => c.id === cityId)?.nameRu || "Не выбран"}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      💡 <strong>Быстрое переключение:</strong> если сотрудник отогнал машину в другой город или автомобиль прибыл без создания брони, просто нажмите на нужный город — дислокация обновится немедленно:
                    </p>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {cities.map((c) => {
                        const isCurrent = c.id === cityId;
                        let theme = "hover:border-slate-600 bg-slate-900 text-slate-300";
                        if (c.code === "TBS") {
                          theme = isCurrent
                            ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-lg shadow-amber-500/30 scale-[1.02]"
                            : "hover:border-amber-500/60 text-amber-200 bg-amber-950/20";
                        } else if (c.code === "BUS") {
                          theme = isCurrent
                            ? "bg-cyan-400 text-slate-950 font-black border-cyan-300 shadow-lg shadow-cyan-400/30 scale-[1.02]"
                            : "hover:border-cyan-500/60 text-cyan-200 bg-cyan-950/20";
                        } else if (c.code === "KUT") {
                          theme = isCurrent
                            ? "bg-emerald-500 text-slate-950 font-black border-emerald-300 shadow-lg shadow-emerald-500/30 scale-[1.02]"
                            : "hover:border-emerald-500/60 text-emerald-200 bg-emerald-950/20";
                        }

                        return (
                          <button
                            type="button"
                            key={c.id}
                            disabled={saving}
                            onClick={() => handleQuickChangeCity(c.id)}
                            className={`p-2.5 rounded-xl border transition-all text-center flex flex-col items-center justify-center space-y-1 ${theme}`}
                          >
                            <span className="text-base">
                              {c.code === "TBS" ? "🏛️" : c.code === "BUS" ? "🌊" : "✈️"}
                            </span>
                            <span className="font-bold text-xs">{c.nameRu}</span>
                            <span className="text-[10px] font-mono opacity-80">{c.code}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase tracking-wider block bg-black/30 px-1.5 py-0.2 rounded-full">
                                Здесь сейчас
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational Status & Telemetry */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <label className="text-slate-400 text-[10px] block">Статус автомобиля:</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold text-xs"
                      >
                        <option value="AVAILABLE">🟢 Свободен (В строю)</option>
                        <option value="RENTED">🔵 В поездке / Аренда</option>
                        <option value="MAINTENANCE">🟠 На техобслуживании (СТО)</option>
                        <option value="WASHING">🧼 На мойке</option>
                        <option value="BLOCKED">⛔ Заблокирован / СТОП</option>
                      </select>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <label className="text-slate-400 text-[10px] flex items-center space-x-1">
                        <Gauge className="w-3 h-3 text-amber-400" />
                        <span>Текущий пробег (км):</span>
                      </label>
                      <input
                        type="number"
                        value={currentMileage}
                        onChange={(e) => setCurrentMileage(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                      <label className="text-slate-400 text-[10px] flex items-center space-x-1">
                        <Fuel className="w-3 h-3 text-cyan-400" />
                        <span>Топливо в баке (%):</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={currentFuelPerc}
                        onChange={(e) => setCurrentFuelPerc(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <span className="font-bold text-white block">Тарифная сетка для клиентов (₾ GEL / день):</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Мин (15+ дн):</label>
                        <input
                          type="number"
                          value={clientMinRate}
                          onChange={(e) => setClientMinRate(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Стандарт (4-14 дн):</label>
                        <input
                          type="number"
                          value={clientStandardRate}
                          onChange={(e) => setClientStandardRate(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-amber-300 font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] block mb-1">Макс (1-3 дня):</label>
                        <input
                          type="number"
                          value={clientMaxRate}
                          onChange={(e) => setClientMaxRate(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">Заметки и особенности торга:</label>
                      <input
                        type="text"
                        value={pricingNotes}
                        onChange={(e) => setPricingNotes(e.target.value)}
                        placeholder="Например: популярный для Казбеги, ниже 110 ₾ не отдавать..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                  </div>

                  {/* Owner Requisites */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">Владелец / Инвестор автомобиля:</label>
                      <select
                        value={ownerId}
                        onChange={(e) => setOwnerId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      >
                        <option value="">Без владельца (автопарк компании)</option>
                        {owners.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.fullName} ({o.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-400 text-[10px] block mb-1">Выплата владельцу в день (₾):</label>
                      <input
                        type="number"
                        value={ownerDailyRate}
                        onChange={(e) => setOwnerDailyRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Batumi Parking & GPS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">🅿️ Парковка Батуми:</span>
                        <input
                          type="checkbox"
                          checked={hasBatumiParking}
                          onChange={(e) => setHasBatumiParking(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                        />
                      </div>
                      {hasBatumiParking && (
                        <div className="space-y-1.5 pt-1">
                          <input
                            type="text"
                            value={batumiParkingNumber}
                            onChange={(e) => setBatumiParkingNumber(e.target.value)}
                            placeholder="Номер разрешения (BAT-...)"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-[11px]"
                          />
                          <input
                            type="date"
                            value={batumiParkingExpiresAt}
                            onChange={(e) => setBatumiParkingExpiresAt(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white font-mono text-[11px]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="bg-cyan-950/20 p-3 rounded-xl border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-cyan-300">🛰️ GPS Мониторинг:</span>
                        <input
                          type="checkbox"
                          checked={hasGpsTracker}
                          onChange={(e) => setHasGpsTracker(e.target.checked)}
                          className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                        />
                      </div>
                      {hasGpsTracker && (
                        <label className="flex items-center space-x-2 text-[11px] text-slate-300 cursor-pointer pt-2">
                          <input
                            type="checkbox"
                            checked={isGpsFeeChargedToOwner}
                            onChange={(e) => setIsGpsFeeChargedToOwner(e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                          />
                          <span>Списывать 10 ₾/мес с инвестора</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Tech Passport (Vehicle Registration Certificate) & Photo Upload */}
                  <div className="bg-gradient-to-br from-amber-950/20 via-slate-900 to-indigo-950/20 p-4 rounded-2xl border-2 border-amber-500/40 space-y-3.5 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">📄</span>
                        <div>
                          <span className="text-sm font-extrabold text-amber-200 block">
                            Техпаспорт автомобиля (Свидетельство о регистрации ТС)
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Номер техпаспорта Грузии и фотокопии документа
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-500/40">
                        {techPassportFrontUrl || techPassportBackUrl ? "✓ Фото загружено" : "Требует фото"}
                      </span>
                    </div>

                    <div>
                      <label className="text-slate-300 text-[10px] font-semibold block mb-1">
                        Номер техпаспорта (свидетельства):
                      </label>
                      <input
                        type="text"
                        value={techPassportNumber}
                        onChange={(e) => setTechPassportNumber(e.target.value)}
                        placeholder="например: AA1298412 или BVA2040481"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-amber-500"
                      />
                    </div>

                    {/* TWO PHOTO CARDS: FRONT & BACK */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* 1. FRONT SIDE */}
                      <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-[11px] font-bold flex items-center space-x-1">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            <span>Лицевая сторона техпаспорта:</span>
                          </span>
                          {techPassportFrontUrl && (
                            <span className="text-[9px] text-emerald-400 font-bold">✓ Загружено</span>
                          )}
                        </div>

                        {techPassportFrontUrl ? (
                          <div className="space-y-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                            <a
                              href={techPassportFrontUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group overflow-hidden rounded-lg border border-slate-700 block w-full h-28 bg-slate-950"
                              title="Нажмите для просмотра в полный размер"
                            >
                              <img
                                src={techPassportFrontUrl}
                                alt="Техпаспорт (лицевая сторона)"
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white">
                                🔍 Открыть фото
                              </div>
                            </a>
                            <div className="flex items-center justify-between pt-1">
                              <a
                                href={techPassportFrontUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-cyan-300 hover:underline font-bold"
                              >
                                🔍 Просмотреть
                              </a>
                              <div className="flex items-center space-x-2">
                                <label className="text-[10px] text-amber-300 hover:text-white cursor-pointer font-bold">
                                  <span>Заменить</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    disabled={isUploadingPhoto}
                                    onChange={(e) => handleUploadFile(e, "techPassportFront")}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setTechPassportFrontUrl(null)}
                                  className="text-[10px] text-red-400 hover:underline"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-950/10 border border-dashed border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-center space-y-2 py-4">
                            <FileText className="w-6 h-6 text-amber-400/80" />
                            <span className="text-[11px] text-slate-300 font-medium">
                              Лицевая сторона не прикреплена
                            </span>
                            <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition active:scale-95 flex items-center space-x-1.5">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isUploadingPhoto ? "Загрузка..." : "Загрузить"}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                disabled={isUploadingPhoto}
                                onChange={(e) => handleUploadFile(e, "techPassportFront")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      {/* 2. BACK SIDE */}
                      <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-300 text-[11px] font-bold flex items-center space-x-1">
                            <Camera className="w-3.5 h-3.5 text-amber-400" />
                            <span>Оборотная сторона техпаспорта:</span>
                          </span>
                          {techPassportBackUrl && (
                            <span className="text-[9px] text-emerald-400 font-bold">✓ Загружено</span>
                          )}
                        </div>

                        {techPassportBackUrl ? (
                          <div className="space-y-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                            <a
                              href={techPassportBackUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group overflow-hidden rounded-lg border border-slate-700 block w-full h-28 bg-slate-950"
                              title="Нажмите для просмотра в полный размер"
                            >
                              <img
                                src={techPassportBackUrl}
                                alt="Техпаспорт (оборотная сторона)"
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white">
                                🔍 Открыть фото
                              </div>
                            </a>
                            <div className="flex items-center justify-between pt-1">
                              <a
                                href={techPassportBackUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-cyan-300 hover:underline font-bold"
                              >
                                🔍 Просмотреть
                              </a>
                              <div className="flex items-center space-x-2">
                                <label className="text-[10px] text-amber-300 hover:text-white cursor-pointer font-bold">
                                  <span>Заменить</span>
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    disabled={isUploadingPhoto}
                                    onChange={(e) => handleUploadFile(e, "techPassportBack")}
                                    className="hidden"
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setTechPassportBackUrl(null)}
                                  className="text-[10px] text-red-400 hover:underline"
                                >
                                  Удалить
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-950/10 border border-dashed border-amber-500/40 rounded-xl flex flex-col items-center justify-center text-center space-y-2 py-4">
                            <FileText className="w-6 h-6 text-amber-400/80" />
                            <span className="text-[11px] text-slate-300 font-medium">
                              Оборотная сторона не прикреплена
                            </span>
                            <label className="cursor-pointer px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition active:scale-95 flex items-center space-x-1.5">
                              <Upload className="w-3.5 h-3.5" />
                              <span>{isUploadingPhoto ? "Загрузка..." : "Загрузить"}</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                disabled={isUploadingPhoto}
                                onChange={(e) => handleUploadFile(e, "techPassportBack")}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* INSURANCE POLICY ROW */}
                    <div className="pt-2 border-t border-amber-500/20">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-slate-300 font-semibold block truncate">Полис страхования (КАСКО):</span>
                          <span className="text-[10px] text-slate-500 truncate block">
                            {insurancePolicyPhotoUrl ? "✓ Фото полиса прикреплено" : "Нет фото полиса"}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {insurancePolicyPhotoUrl && (
                            <a
                              href={insurancePolicyPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-cyan-300 hover:underline font-bold mr-1"
                            >
                              Просмотреть
                            </a>
                          )}
                          <label className="cursor-pointer px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[10px] border border-slate-700 transition shrink-0 flex items-center space-x-1">
                            <Upload className="w-3 h-3 text-blue-400" />
                            <span>{insurancePolicyPhotoUrl ? "Заменить" : "Загрузить"}</span>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              disabled={isUploadingPhoto}
                              onChange={(e) => handleUploadFile(e, "insurance")}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-slate-400 hover:text-white"
                    >
                      Закрыть
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95"
                    >
                      {saving ? "Сохранение..." : "Сохранить параметры"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: AVAILABILITY & MANUAL BLOCKING */}
              {activeTab === "availability" && (
                <div className="space-y-5 text-xs">
                  {/* Create New Block Form */}
                  <form
                    onSubmit={handleCreateAvailabilityBlock}
                    className="bg-slate-950 p-4 rounded-2xl border border-red-500/40 space-y-3.5 shadow-xl"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-red-400" />
                        <h4 className="font-extrabold text-white text-sm">
                          Закрыть доступность автомобиля / Поставить на паузу
                        </h4>
                      </div>
                      <span className="text-[10px] text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40 font-bold">
                        Ручная блокировка
                      </span>
                    </div>

                    {/* Start Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-slate-300 font-semibold block">Дата начала закрытия:</label>
                          <button
                            type="button"
                            onClick={() => setBlockStartDate(todayStr)}
                            className="text-[10px] text-amber-400 hover:underline"
                          >
                            [ Сегодня ]
                          </button>
                        </div>
                        <input
                          type="date"
                          required
                          value={blockStartDate}
                          onChange={(e) => setBlockStartDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-red-500"
                        />
                      </div>

                      {/* End Date with Indefinite Option */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-slate-300 font-semibold block">Дата окончания:</label>
                          <label className="flex items-center space-x-1 cursor-pointer text-[10px] text-red-300 font-semibold">
                            <input
                              type="checkbox"
                              checked={isIndefiniteBlock}
                              onChange={(e) => {
                                setIsIndefiniteBlock(e.target.checked);
                                if (e.target.checked) setBlockEndDate("");
                              }}
                              className="rounded bg-slate-900 border-slate-700 text-red-500 focus:ring-0"
                            />
                            <span>Бессрочно</span>
                          </label>
                        </div>
                        <input
                          type="date"
                          disabled={isIndefiniteBlock}
                          value={blockEndDate}
                          onChange={(e) => setBlockEndDate(e.target.value)}
                          placeholder="Не выбрано (бессрочно)"
                          className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-red-500 ${
                            isIndefiniteBlock ? "opacity-40 cursor-not-allowed" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Explanatory Rule Banner */}
                    <div className="bg-red-950/30 p-2.5 rounded-xl border border-red-500/30 text-[11px] text-red-200/90 leading-tight">
                      ℹ️ <strong>Правило системы:</strong> если дату окончания пропустить или отметить «Бессрочно», автомобиль закрывается от даты начала <strong>до конца (бессрочно)</strong>, пока вы вручную не снимете блокировку. Если выбрана дата окончания — автомобиль будет закрыт ровно в указанный диапазон дат.
                    </div>

                    {/* Reason */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Причина закрытия:</label>
                        <select
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                        >
                          <option value="MAINTENANCE">🔧 ТО / Техобслуживание</option>
                          <option value="REPAIR">⚙️ Кузовной ремонт / Ожидание запчастей</option>
                          <option value="SERVICE_TRIP">🚗 Служебная поездка сотрудника (перегон/дела)</option>
                          <option value="PERSONAL">👑 Резерв руководства / Личные цели</option>
                          <option value="DETAILING">🧼 Химчистка / Детейлинг</option>
                          <option value="OTHER">⛔ Другое</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-slate-300 font-semibold block mb-1">Уточнение / кто взял машину:</label>
                        <input
                          type="text"
                          value={blockReasonText}
                          onChange={(e) => setBlockReasonText(e.target.value)}
                          placeholder="например: Поездка в Батуми (Малхаз)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-red-500"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">Дополнительный комментарий:</label>
                      <input
                        type="text"
                        value={blockNotes}
                        onChange={(e) => setBlockNotes(e.target.value)}
                        placeholder="Контакты мастера, ожидаемый срок возвращения..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-red-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white font-black rounded-xl shadow-lg shadow-red-900/40 transition active:scale-95 flex items-center space-x-1.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{saving ? "Закрытие..." : "Закрыть доступность автомобиля"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Active and Historical Blocks List */}
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-white text-sm flex items-center space-x-2">
                      <span>Список текущих блокировок и простоев</span>
                      <span className="text-xs font-mono font-normal text-slate-400">
                        ({car?.availabilityBlocks?.length || 0})
                      </span>
                    </h4>

                    {car?.availabilityBlocks && car.availabilityBlocks.length > 0 ? (
                      <div className="space-y-2.5">
                        {car.availabilityBlocks.map((b: any) => {
                          const info = getReasonLabel(b.reason);
                          const isCurrentlyActive =
                            b.isActive &&
                            new Date(b.startDate) <= new Date() &&
                            (!b.endDate || new Date(b.endDate) >= new Date());

                          return (
                            <div
                              key={b.id}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                b.isActive
                                  ? isCurrentlyActive
                                    ? "bg-red-950/40 border-red-500/60 shadow-lg shadow-red-950/50"
                                    : "bg-amber-950/30 border-amber-500/40"
                                  : "bg-slate-950/60 border-slate-800 opacity-60"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${info.color}`}>
                                    {info.label}
                                  </span>
                                  {b.reasonText && (
                                    <span className="font-bold text-white text-xs">{b.reasonText}</span>
                                  )}
                                  {b.isActive ? (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600 text-white">
                                      {b.endDate ? "В ПЕРИОДЕ" : "БЕССРОЧНО"}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                                      Снята
                                    </span>
                                  )}
                                </div>

                                <div className="font-mono text-xs text-slate-300 flex items-center space-x-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>
                                    С {new Date(b.startDate).toLocaleDateString("ru-RU")}
                                    {b.endDate ? (
                                      <span> по {new Date(b.endDate).toLocaleDateString("ru-RU")}</span>
                                    ) : (
                                      <span className="text-red-400 font-bold"> — Бессрочно (до снятия)</span>
                                    )}
                                  </span>
                                </div>

                                {b.notes && (
                                  <p className="text-[11px] text-slate-400 italic">Примечание: {b.notes}</p>
                                )}

                                <div className="text-[10px] text-slate-500">
                                  Установил: {b.createdBy || "Менеджер"} • {new Date(b.createdAt).toLocaleDateString("ru-RU")}
                                </div>
                              </div>

                              {b.isActive && (
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => handleRemoveBlock(b.id)}
                                  className="self-start sm:self-center px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-bold rounded-xl text-xs shadow transition active:scale-95 flex items-center space-x-1 shrink-0"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Снять блокировку</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <Check className="w-6 h-6 text-emerald-400 mx-auto mb-1 opacity-70" />
                        <p className="font-semibold text-xs text-slate-400">
                          Автомобиль полностью доступен для бронирования
                        </p>
                        <span className="text-[10px] text-slate-500">
                          Нет активных ручных закрытий и простоев
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: UPCOMING BOOKINGS */}
              {activeTab === "bookings" && (
                <div className="space-y-3 text-xs">
                  <h4 className="font-extrabold text-white text-sm">
                    Ближайшие аренды автомобиля {car?.brand} {car?.model}
                  </h4>

                  {car?.bookings && car.bookings.length > 0 ? (
                    <div className="space-y-2">
                      {car.bookings.map((b: any) => (
                        <div
                          key={b.id}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-amber-400">{b.bookingNumber}</span>
                              <span className="font-bold text-white">{b.customer?.fullName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                  b.status === "ACTIVE"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                    : "bg-blue-950 text-blue-400 border border-blue-500/40"
                                }`}
                              >
                                {b.status === "ACTIVE" ? "В поездке" : "Подтверждена"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center space-x-1 font-mono">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(b.startDate).toLocaleDateString("ru-RU")} —{" "}
                                {new Date(b.endDate).toLocaleDateString("ru-RU")} ({b.rentalDays} дн.)
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Выдача: {b.pickupLocation?.city?.nameRu} ➔ Возврат: {b.returnLocation?.city?.nameRu}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-amber-400 font-mono block">
                              {b.totalAmount} ₾
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {b.dailyRate} ₾/день
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                      <p>Нет запланированных бронирований</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
