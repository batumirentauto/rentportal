"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Car as CarIcon, MapPin, Check, AlertTriangle, Sparkles, Upload, Loader2, FileText, Camera } from "lucide-react";

interface NewCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCarCreated?: () => void;
  defaultCityCode?: string;
}

export const NewCarModal: React.FC<NewCarModalProps> = ({
  isOpen,
  onClose,
  onCarCreated,
  defaultCityCode = "BUS",
}) => {
  const [cities, setCities] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields
  const [plateNumber, setPlateNumber] = useState("");
  const [vin, setVin] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [color, setColor] = useState("Белый");
  const [transmission, setTransmission] = useState("AUTOMATIC");
  const [fuelType, setFuelType] = useState("PETROL");
  const [cityId, setCityId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [carClass, setCarClass] = useState("COMFORT");
  const [currentMileage, setCurrentMileage] = useState<number>(50000);
  const [clientMinDailyRate, setClientMinDailyRate] = useState<number>(35);
  const [clientStandardDailyRate, setClientStandardDailyRate] = useState<number>(50);
  const [clientMaxDailyRate, setClientMaxDailyRate] = useState<number>(75);
  const [defaultOwnerDailyRate, setDefaultOwnerDailyRate] = useState<number>(25);
  const [hasBatumiParking, setHasBatumiParking] = useState<boolean>(false);
  const [batumiParkingPermitNumber, setBatumiParkingPermitNumber] = useState<string>("");
  const [hasGpsTracker, setHasGpsTracker] = useState<boolean>(true);
  const [isGpsFeeChargedToOwner, setIsGpsFeeChargedToOwner] = useState<boolean>(true);
  const [pricingNotes, setPricingNotes] = useState("");

  // Tech Passport state & AI OCR
  const [techPassportNumber, setTechPassportNumber] = useState("");
  const [techPassportFrontUrl, setTechPassportFrontUrl] = useState<string | null>(null);
  const [techPassportBackUrl, setTechPassportBackUrl] = useState<string | null>(null);
  const [isUploadingTpSlot, setIsUploadingTpSlot] = useState<string | null>(null);
  const [isRecognizingTp, setIsRecognizingTp] = useState(false);
  const [tpOcrNotice, setTpOcrNotice] = useState<string | null>(null);

  const handleUploadTp = async (file: File, slot: "front" | "back") => {
    try {
      setIsUploadingTpSlot(slot);
      setTpOcrNotice(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "tech_passports");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success && json.url) {
        if (slot === "front") setTechPassportFrontUrl(json.url);
        if (slot === "back") setTechPassportBackUrl(json.url);
      }
    } catch (e: any) {
      setErrorMsg("Ошибка загрузки фото: " + e.message);
    } finally {
      setIsUploadingTpSlot(null);
    }
  };

  const handleRecognizeTp = async () => {
    if (!techPassportFrontUrl && !techPassportBackUrl) {
      alert("Сначала прикрепите фото техпаспорта (лицевую или оборотную сторону)!");
      return;
    }
    try {
      setIsRecognizingTp(true);
      setTpOcrNotice(null);
      const res = await fetch("/api/ai/recognize-tech-passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontUrl: techPassportFrontUrl,
          backUrl: techPassportBackUrl,
          autoSave: false,
        }),
      });
      const json = await res.json();
      if (!json.success || !json.extractedData) {
        throw new Error(json.error || "Не удалось считать техпаспорт");
      }
      const d = json.extractedData;
      if (d.vin) setVin(d.vin);
      if (d.year) setYear(d.year);
      if (d.plateNumber) setPlateNumber(d.plateNumber);
      if (d.techPassportNumber) setTechPassportNumber(d.techPassportNumber);
      if (d.brand) setBrand(d.brand);
      if (d.model) setModel(d.model);
      if (d.color) setColor(d.color);

      setTpOcrNotice(`✓ Распознано ИИ: ${d.brand || ""} ${d.model || ""} (${d.plateNumber || ""}), VIN: ${d.vin || "—"}, Год: ${d.year || "—"}`);
    } catch (e: any) {
      setErrorMsg("Ошибка считывания: " + e.message);
    } finally {
      setIsRecognizingTp(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      fetch("/api/locations")
        .then((res) => res.json())
        .then((data) => {
          if (data.cities) {
            setCities(data.cities);
            const found = data.cities.find((c: any) => c.code === defaultCityCode) || data.cities[0];
            if (found) setCityId(found.id);
          }
        })
        .catch(console.error);

      fetch("/api/owners/portal")
        .then((res) => res.json())
        .then((data) => {
          if (data.owners) setOwners(data.owners);
        })
        .catch(console.error);
    }
  }, [isOpen, defaultCityCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber || !brand || !model || !cityId) {
      setErrorMsg("Заполните обязательные поля: Госномер, Марка, Модель и Город присутствия!");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/fleet/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plateNumber,
          vin: vin || null,
          brand,
          model,
          year,
          color,
          transmission,
          fuelType,
          cityId,
          ownerId: ownerId || null,
          carClass,
          currentMileage,
          clientMinDailyRate,
          clientStandardDailyRate,
          clientMaxDailyRate,
          defaultOwnerDailyRate,
          hasBatumiParking,
          batumiParkingPermitNumber: batumiParkingPermitNumber || null,
          hasGpsTracker,
          isGpsFeeChargedToOwner,
          techPassportNumber: techPassportNumber || null,
          techPassportFrontUrl: techPassportFrontUrl || null,
          techPassportBackUrl: techPassportBackUrl || null,
          pricingNotes: pricingNotes || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (onCarCreated) onCarCreated();
        onClose();
      } else {
        setErrorMsg(data.error || "Ошибка сохранения автомобиля");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Сетевая ошибка при создании автомобиля");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <CarIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Добавить автомобиль в автопарк</h3>
              <p className="text-xs text-slate-400">Укажите госномер, характеристики и город дислокации</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* City Selection - Prominent */}
          <div className="bg-cyan-950/20 border border-cyan-500/30 p-3.5 rounded-2xl space-y-2">
            <label className="text-cyan-300 font-bold block flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>Город присутствия / Базирования машины (Обязательно):</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {cities.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setCityId(c.id)}
                  className={`p-2 rounded-xl border text-center transition font-bold ${
                    cityId === c.id
                      ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/30"
                      : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className="block text-sm">
                    {c.code === "TBS" ? "🏛️" : c.code === "BUS" ? "🌊" : "✈️"}
                  </span>
                  <span className="text-xs block">{c.nameRu}</span>
                  <span className="text-[10px] opacity-70 font-mono">{c.code}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Tech Passport OCR Scanner Block */}
          <div className="bg-gradient-to-r from-purple-950/30 via-slate-900 to-indigo-950/30 p-3.5 rounded-2xl border-2 border-purple-500/40 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-200 flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Быстрое заполнение по техпаспорту (ИИ OCR):</span>
              </span>
              <span className="text-[10px] text-purple-300 font-bold bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                ОПЦИОНАЛЬНО
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Прикрепите фото техпаспорта — нейросеть автоматически заполнит VIN-код, год, госномер, марку и номер техпаспорта.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Front Slot */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-300 font-semibold block">Лицевая сторона</span>
                {techPassportFrontUrl ? (
                  <div className="flex items-center justify-center space-x-1 text-[10px] text-emerald-400 font-bold">
                    <span>✓ Загружено</span>
                    <button
                      type="button"
                      onClick={() => setTechPassportFrontUrl(null)}
                      className="text-red-400 hover:underline ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer block">
                    {isUploadingTpSlot === "front" ? "..." : "+ Фото (Лицевая)"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={Boolean(isUploadingTpSlot)}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadTp(f, "front");
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Back Slot */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center space-y-1">
                <span className="text-[10px] text-slate-300 font-semibold block">Оборотная сторона</span>
                {techPassportBackUrl ? (
                  <div className="flex items-center justify-center space-x-1 text-[10px] text-emerald-400 font-bold">
                    <span>✓ Загружено</span>
                    <button
                      type="button"
                      onClick={() => setTechPassportBackUrl(null)}
                      className="text-red-400 hover:underline ml-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer block">
                    {isUploadingTpSlot === "back" ? "..." : "+ Фото (Оборот)"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      disabled={Boolean(isUploadingTpSlot)}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadTp(f, "back");
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {(techPassportFrontUrl || techPassportBackUrl) && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  disabled={isRecognizingTp}
                  onClick={handleRecognizeTp}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white flex items-center space-x-1.5 transition active:scale-95 shadow"
                >
                  {isRecognizingTp ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Считывание...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>✨ Считать техпаспорт ИИ</span>
                    </>
                  )}
                </button>
                {tpOcrNotice && (
                  <span className="text-[10px] text-emerald-400 font-bold max-w-[260px] truncate">
                    {tpOcrNotice}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Plate, Brand, Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Госномер Грузии *:</label>
              <input
                type="text"
                required
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                placeholder="AA-123-BB"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-amber-400 font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Марка *:</label>
              <input
                type="text"
                required
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Toyota"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Модель *:</label>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="RAV4"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          {/* Year, Color, Class, Transmission */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Год выпуска:</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Цвет:</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Класс авто:</label>
              <select
                value={carClass}
                onChange={(e) => setCarClass(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="ECONOMY">Эконом</option>
                <option value="COMFORT">Комфорт</option>
                <option value="CROSSOVER">Кроссовер</option>
                <option value="SUV">Внедорожник 4x4</option>
                <option value="PREMIUM">Премиум</option>
                <option value="CABRIO">Кабриолет</option>
                <option value="MINIVAN">Минивэн</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">КПП:</label>
              <select
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="AUTOMATIC">Автомат</option>
                <option value="MANUAL">Механика</option>
              </select>
            </div>
          </div>

          {/* Pricing Rates */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <span className="font-bold text-white block">Тарифы для клиентов (₾ GEL / день):</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Мин (15+ дн):</label>
                <input
                  type="number"
                  value={clientMinDailyRate}
                  onChange={(e) => setClientMinDailyRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Стандарт (4-14 дн):</label>
                <input
                  type="number"
                  value={clientStandardDailyRate}
                  onChange={(e) => setClientStandardDailyRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-amber-300 font-bold font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Макс (1-3 дня):</label>
                <input
                  type="number"
                  value={clientMaxDailyRate}
                  onChange={(e) => setClientMaxDailyRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Owner Requisites */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1">Владелец / Инвестор:</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="">Автопарк компании (собственный)</option>
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
                value={defaultOwnerDailyRate}
                onChange={(e) => setDefaultOwnerDailyRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95"
            >
              {isSubmitting ? "Добавление..." : "Добавить автомобиль"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
