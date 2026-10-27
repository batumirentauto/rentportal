import React, { useState, useMemo } from "react";
import {
  X,
  Camera,
  Video,
  CheckCircle2,
  FileCheck,
  Fuel,
  Gauge,
  FileText,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Check,
  Clock,
  Calendar,
  Sparkles,
  MapPin,
  ExternalLink,
  Upload,
  Loader2,
  Trash2,
  RefreshCw,
  Droplets,
  Download,
} from "lucide-react";

interface HandoverWizardModalProps {
  booking: any;
  onClose: () => void;
  onComplete: () => void;
}

export const HandoverWizardModal: React.FC<HandoverWizardModalProps> = ({
  booking,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const car = booking?.car || {};

  // Step 1: Vehicle & Checklist
  const [mileage, setMileage] = useState<number>(car.currentMileage || 50000);
  const [fuelPercent, setFuelPercent] = useState<number>(car.currentFuelPerc !== undefined ? car.currentFuelPerc : 100);
  const [techPassportVerified, setTechPassportVerified] = useState<boolean>(true);
  const [clientBriefed, setClientBriefed] = useState<boolean>(true);
  const [washerFluidChecked, setWasherFluidChecked] = useState<boolean>(true);
  const [tirePressureChecked, setTirePressureChecked] = useState<boolean>(true);

  // Мойка авто перед выдачей (20 ₾ полная, 10 ₾ кузов/салон)
  const [washOption, setWashOption] = useState<"NONE" | "FULL" | "BODY" | "INTERIOR">("NONE");
  const [washCost, setWashCost] = useState<number>(0);
  const [washAccount, setWashAccount] = useState<string>("CASH_BATUMI");

  // Time & Date of Handover & Return (опциональные поля с умными значениями по умолчанию)
  const bookingReturnDate = useMemo(() => {
    return booking?.endDate ? new Date(booking.endDate) : null;
  }, [booking]);

  const defaultHandoverTime = useMemo(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, []);

  const defaultHandoverDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const defaultReturnTime = useMemo(() => {
    if (!bookingReturnDate) return "12:00";
    return `${String(bookingReturnDate.getHours()).padStart(2, "0")}:${String(bookingReturnDate.getMinutes()).padStart(2, "0")}`;
  }, [bookingReturnDate]);

  const defaultReturnDate = useMemo(() => {
    if (!bookingReturnDate) return "";
    return bookingReturnDate.toISOString().split("T")[0];
  }, [bookingReturnDate]);

  const [actualHandoverTime, setActualHandoverTime] = useState<string>(defaultHandoverTime);
  const [actualHandoverDate, setActualHandoverDate] = useState<string>(defaultHandoverDate);
  const [expectedReturnTime, setExpectedReturnTime] = useState<string>(defaultReturnTime);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(defaultReturnDate);

  const [dashboardPhoto, setDashboardPhoto] = useState<string | null>(
    booking?.handoverReport?.dashboardPhotoUrl || null
  );
  const [techPassportPhoto, setTechPassportPhoto] = useState<string | null>(
    booking?.handoverReport?.techPassportPhotoUrl || null
  );
  const [carBodyVideo, setCarBodyVideo] = useState<string | null>(
    booking?.handoverReport?.carBodyVideoUrl || null
  );

  // Step 2: Extras
  const [issuedExtras, setIssuedExtras] = useState<string[]>(
    booking?.extras ? booking.extras.map((e: any) => e.id) : []
  );

  // Step 3: Contract Photo
  const [contractPhoto, setContractPhoto] = useState<string | null>(
    booking?.handoverReport?.contractPhotoUrl || null
  );

  // Media uploading state
  const [uploadingSlots, setUploadingSlots] = useState<{
    dashboard?: boolean;
    techPassport?: boolean;
    video?: boolean;
    contract?: boolean;
  }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (
    file: File,
    type: "dashboard" | "techPassport" | "video" | "contract"
  ) => {
    try {
      setUploadError(null);
      setUploadingSlots((prev) => ({ ...prev, [type]: true }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", type === "video" ? "inspections_video" : "inspections");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось загрузить файл на сервер");
      }

      if (type === "dashboard") setDashboardPhoto(data.url);
      else if (type === "techPassport") setTechPassportPhoto(data.url);
      else if (type === "video") setCarBodyVideo(data.url);
      else if (type === "contract") setContractPhoto(data.url);
    } catch (err: any) {
      console.error(`Error uploading ${type}:`, err);
      setUploadError(`Ошибка при загрузке: ${err.message || "Сетевая ошибка"}`);
    } finally {
      setUploadingSlots((prev) => ({ ...prev, [type]: false }));
    }
  };

  // Step 4: Payments
  const [rentalAmount, setRentalAmount] = useState<number>(booking.totalAmount);
  const [rentalCurrency, setRentalCurrency] = useState<string>(booking.currency || "GEL");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH"); // "CASH", "CARD_POS", "TBC_BANK", "BOG_BANK", "CREDO_BANK", "CRYPTO"
  const [depositAmount, setDepositAmount] = useState<number>(
    booking.depositAmount !== undefined && booking.depositAmount !== null ? Number(booking.depositAmount) : 0
  );
  const [depositCurrency, setDepositCurrency] = useState<string>("GEL");
  const [depositMethod, setDepositMethod] = useState<string>("CASH");
  
  // Change calculation
  const [amountReceived, setAmountReceived] = useState<number>(booking.totalAmount);
  const [changeOnReturn, setChangeOnReturn] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const toggleExtra = (id: string) => {
    if (issuedExtras.includes(id)) {
      setIssuedExtras(issuedExtras.filter((item) => item !== id));
    } else {
      setIssuedExtras([...issuedExtras, id]);
    }
  };

  const handleAmountReceivedChange = (val: number) => {
    setAmountReceived(val);
    const diff = val - rentalAmount;
    if (diff > 0) {
      setChangeOnReturn(diff);
    } else {
      setChangeOnReturn(0);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerName: "Менеджер смены (Грузия)",
          mileageAtHandover: mileage,
          fuelLevelPercent: fuelPercent,
          techPassportVerified,
          clientBriefed,
          issuedExtras,
          dashboardPhotoUrl: dashboardPhoto,
          techPassportPhotoUrl: techPassportPhoto,
          contractPhotoUrl: contractPhoto,
          carBodyVideoUrl: carBodyVideo,
          notes,
          // Фиксация времени выдачи и возврата (необязательно)
          actualHandoverTime,
          actualHandoverDate,
          expectedReturnTime,
          expectedReturnDate,
          // Учет мойки перед выдачей
          washOption,
          washCost,
          washAccount,
          rentalAmount,
          rentalCurrency,
          paymentMethod,
          depositAmount,
          depositCurrency,
          depositMethod,
          amountExpected: rentalAmount,
          amountReceived,
          changeOnReturn,
          paymentNotes: `Оплата выдачи ${booking.bookingNumber}. Способ: ${paymentMethod}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onComplete();
      } else {
        alert("Ошибка при сохранении: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка сети при оформлении выдачи");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded">
                АКТ ПРИЁМА-ПЕРЕДАЧИ
              </span>
              <span className="font-mono text-sm text-slate-300">
                {booking.bookingNumber}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Выдача: {car.brand || ""} {car.model || "Автомобиль"} {car.plateNumber ? `(${car.plateNumber})` : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 border-b border-slate-800 text-center text-xs font-medium bg-slate-950/60">
          <div
            className={`py-2 px-1 border-b-2 transition-all truncate ${
              currentStep === 1
                ? "border-amber-500 text-amber-400 font-bold"
                : currentStep > 1
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <span className="sm:hidden">1. Авто</span>
            <span className="hidden sm:inline">1. Авто & Медиа</span>
          </div>
          <div
            className={`py-2 px-1 border-b-2 transition-all truncate ${
              currentStep === 2
                ? "border-amber-500 text-amber-400 font-bold"
                : currentStep > 2
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <span className="sm:hidden">2. Опции</span>
            <span className="hidden sm:inline">2. Оборудование</span>
          </div>
          <div
            className={`py-2 px-1 border-b-2 transition-all truncate ${
              currentStep === 3
                ? "border-amber-500 text-amber-400 font-bold"
                : currentStep > 3
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <span className="sm:hidden">3. Доки</span>
            <span className="hidden sm:inline">3. Договор & Доки</span>
          </div>
          <div
            className={`py-2 px-1 border-b-2 transition-all truncate ${
              currentStep === 4
                ? "border-amber-500 text-amber-400 font-bold"
                : "border-transparent text-slate-500"
            }`}
          >
            <span className="sm:hidden">4. Оплата</span>
            <span className="hidden sm:inline">4. Оплата & Касса</span>
          </div>
        </div>

        {/* Wizard Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* STEP 1: VEHICLE & MEDIA */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">Клиент:</span>
                  <p className="font-semibold text-white">{booking.customer.fullName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Место встречи:</span>
                  <p className="font-semibold text-amber-400">{booking.pickupLocation.name}</p>
                  {booking.pickupAddress && (
                    <div className="mt-1 flex items-center space-x-1.5 flex-wrap">
                      <span className="text-xs text-emerald-400 font-medium">📍 {booking.pickupAddress}</span>
                      {booking.pickupAddress.startsWith("http") ? (
                        <a
                          href={booking.pickupAddress}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 underline flex items-center space-x-0.5"
                        >
                          <span>Карта</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.pickupAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-sky-400 hover:text-sky-300 underline"
                        >
                          (Google Maps ↗)
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Odometer & Fuel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span>Пробег при выдаче (км):</span>
                  </label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    По базе: {(car.currentMileage || mileage || 0).toLocaleString()} км
                  </span>
                </div>

                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                      <Fuel className="w-4 h-4 text-emerald-400" />
                      <span>Уровень топлива:</span>
                      {car?.fuelType !== "ELECTRIC" && (
                        <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                          бак {car?.tankVolumeLiters || 60} л
                        </span>
                      )}
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {fuelPercent === 100
                        ? "1 (100% / Полный бак)"
                        : fuelPercent === 75
                        ? "3/4 (75%)"
                        : fuelPercent === 50
                        ? "1/2 (50%)"
                        : fuelPercent === 25
                        ? "1/4 (25%)"
                        : fuelPercent === 0
                        ? "0 (0% / Пустой)"
                        : `${fuelPercent}%`}
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={fuelPercent}
                    onChange={(e) => setFuelPercent(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  {/* 5 marks: 0 - 1/4 - 1/2 - 3/4 - 1 */}
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1.5 font-bold px-0.5">
                    <span className={fuelPercent === 0 ? "text-amber-400 font-extrabold" : ""}>0</span>
                    <span className={fuelPercent === 25 ? "text-amber-400 font-extrabold" : ""}>1/4</span>
                    <span className={fuelPercent === 50 ? "text-amber-400 font-extrabold" : ""}>1/2</span>
                    <span className={fuelPercent === 75 ? "text-amber-400 font-extrabold" : ""}>3/4</span>
                    <span className={fuelPercent === 100 ? "text-emerald-400 font-extrabold" : ""}>1</span>
                  </div>

                  {/* Corresponding percentages: 0% - 25% - 50% - 75% - 100% */}
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono px-0.5 mb-2.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>

                  {/* Quick preset buttons for instant 1-touch mobile selection */}
                  <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-700/60">
                    {[
                      { label: "0", pct: "0%", val: 0 },
                      { label: "1/4", pct: "25%", val: 25 },
                      { label: "1/2", pct: "50%", val: 50 },
                      { label: "3/4", pct: "75%", val: 75 },
                      { label: "1", pct: "100%", val: 100 },
                    ].map((btn) => (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setFuelPercent(btn.val)}
                        className={`py-1.5 px-1 rounded-xl border text-center transition active:scale-95 ${
                          fuelPercent === btn.val
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20"
                            : "bg-slate-900/90 border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600"
                        }`}
                      >
                        <span className="block text-xs font-bold leading-tight">{btn.label}</span>
                        <span className={`block text-[9px] ${fuelPercent === btn.val ? "text-slate-950 font-bold" : "text-slate-400"}`}>
                          {btn.pct}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Handover & Return Time Capture */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Фиксация времени выдачи и возврата (Необязательно)
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                    по умолчанию текущее
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Actual Handover Time */}
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold flex items-center space-x-1">
                        <span>🚗 Автомобиль выдан в:</span>
                      </span>
                      <span className="text-[10px] text-amber-400 font-medium">факт</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        value={actualHandoverDate}
                        onChange={(e) => setActualHandoverDate(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="time"
                        value={actualHandoverTime}
                        onChange={(e) => setActualHandoverTime(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Точное время передачи ключей клиенту
                    </span>
                  </div>

                  {/* Agreed Return Time */}
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 font-semibold flex items-center space-x-1">
                        <span>🏁 Время возврата:</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-medium">план сдачи</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="date"
                        value={expectedReturnDate}
                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="time"
                        value={expectedReturnTime}
                        onChange={(e) => setExpectedReturnTime(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      Согласованное время сдачи авто при завершении
                    </span>
                  </div>
                </div>
              </div>

              {/* УЧЕТ МОЙКИ АВТОМОБИЛЯ ПЕРЕД ВЫДАЧЕЙ */}
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      Мойка автомобиля перед выдачей
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border ${
                    washOption !== "NONE" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "bg-slate-900 text-slate-400 border-slate-700"
                  }`}>
                    {washOption !== "NONE" ? "Учитывается в ежемесячный отчёт" : "Авто чистое"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Была ли проведена мойка авто перед выдачей? Начисление фиксируется в отчёте партнеру-автомойке (расчёт раз в месяц).
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => { setWashOption("NONE"); setWashCost(0); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      washOption === "NONE"
                        ? "bg-slate-700 text-white border-slate-500 font-bold shadow"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span className="block text-base mb-0.5">✓</span>
                    <span className="text-xs block font-bold">Не мыли</span>
                    <span className="text-[10px] text-slate-500 block">Чистая машина</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWashOption("FULL"); setWashCost(20); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      washOption === "FULL"
                        ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-lg shadow-cyan-900/40"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-cyan-300"
                    }`}
                  >
                    <span className="block text-base mb-0.5">✨</span>
                    <span className="text-xs block font-bold">Полная мойка</span>
                    <span className="text-[10px] text-cyan-200/80 block">Кузов + салон</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWashOption("BODY"); setWashCost(10); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      washOption === "BODY"
                        ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-lg shadow-cyan-900/40"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-cyan-300"
                    }`}
                  >
                    <span className="block text-base mb-0.5">🚗</span>
                    <span className="text-xs block font-bold">Только кузов</span>
                    <span className="text-[10px] text-cyan-200/80 block">Снаружи</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWashOption("INTERIOR"); setWashCost(10); }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      washOption === "INTERIOR"
                        ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-lg shadow-cyan-900/40"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-cyan-300"
                    }`}
                  >
                    <span className="block text-base mb-0.5">💺</span>
                    <span className="text-xs block font-bold">Только салон</span>
                    <span className="text-[10px] text-cyan-200/80 block">Уборка салона</span>
                  </button>
                </div>
              </div>

              {/* Checks */}
              <div className="space-y-2 bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={techPassportVerified}
                    onChange={(e) => setTechPassportVerified(e.target.checked)}
                    className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="text-slate-200">
                    <strong>Оригинал техпаспорта</strong> проверен и находится в автомобиле (бардачок)
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer pt-2 border-t border-slate-700/50">
                  <input
                    type="checkbox"
                    checked={clientBriefed}
                    onChange={(e) => setClientBriefed(e.target.checked)}
                    className="w-5 h-5 rounded accent-amber-500 cursor-pointer"
                  />
                  <span className="text-slate-200">
                    <strong>Инструктаж клиента проведен</strong> (правила парковки в Тбилиси/Батуми, штрафы видеофиксации, контакты помощи)
                  </span>
                </label>

                {/* Quick Client Memo Actions from vslrentcar.com */}
                <div className="pt-2.5 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 bg-slate-900/50 p-2.5 rounded-xl">
                  <span className="text-[11px] text-slate-300 font-semibold flex items-center space-x-1">
                    <span>📚 Памятка водителя VSL Rent (vslrentcar.com):</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const memoText = `🇬🇪 ПАМЯТКА КЛИЕНТУ АВТОПРОКАТА VSL RENT (vslrentcar.com)\n\n1. 🪪 ДОКУМЕНТЫ: Только физический оригинал прав (фото в телефоне не принимаются полицией, штраф 1500 GEL) и загранпаспорт.\n2. 💰 ЗАЛОГ 0 GEL: Никаких блокировок на карте. Безлимитный пробег 100%.\n3. ⏰ ВРЕМЯ: Счёт 24ч с момента выдачи, 1-й час задержки — бесплатно.\n4. 🧼 МОЙКА: Мыть машину перед сдачей НЕ ТРЕБУЕТСЯ.\n5. 🚫 ЗАПРЕТ: Выезд за границу Грузии, Абхазия, Южная Осетия, перевал Тушетия (Омало).\n6. 📹 ШТРАФЫ: Камеры средней скорости на трассах. Проверка на protocols.ge.\n7. 🚨 SOS (24/7): +995 591 181 430 (линия ДТП), +995 591 050 752 (WhatsApp), 112 (полиция). Не двигать авто до фиксации!\n\nСчастливого пути по Грузии! 🏔️🌊`;
                        navigator.clipboard.writeText(memoText);
                        alert("Памятка клиенту скопирована в буфер обмена!");
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg text-xs flex items-center space-x-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Скопировать памятку</span>
                    </button>
                    {booking.customer?.whatsapp && (
                      <a
                        href={`https://wa.me/${booking.customer.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                          `🇬🇪 ПАМЯТКА КЛИЕНТУ АВТОПРОКАТА VSL RENT (vslrentcar.com)\n\nЗдравствуйте, ${booking.customer.fullName}!\n\n1. 🪪 ДОКУМЕНТЫ: При себе всегда держите физический оригинал прав и паспорт (электронные права полицией Грузии не принимаются).\n2. 💰 УСЛОВИЯ: Залог 0 ₾, пробег безлимитный, 1-й час опоздания — бесплатно.\n3. 🧼 МОЙКА: Мыть машину перед сдачей НЕ НУЖНО.\n4. 🚫 ЗАПРЕТ: Выезд за пределы Грузии, въезд в Абхазию, Юж. Осетию и перевал Тушетия (Омало).\n5. 📹 КАМЕРЫ: Контроль средней скорости на трассах. Проверка штрафов на protocols.ge.\n6. 🚨 SOS 24/7: +995 591 181 430 (ДТП), +995 591 050 752 (WhatsApp), 112 (экстренная служба).\n\nЖелаем приятной дороги!`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow transition"
                      >
                        <span>Отправить в WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Media capture / Upload Simulation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Обязательная фото/видео фиксация (на телефон):
                  </h4>
                  <span className="text-[10px] text-amber-400/90 font-medium">
                    камера или галерея
                  </span>
                </div>

                {uploadError && (
                  <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-2.5 rounded-xl text-xs flex items-center justify-between">
                    <span>{uploadError}</span>
                    <button
                      type="button"
                      onClick={() => setUploadError(null)}
                      className="text-rose-400 hover:text-white ml-2 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Photo 1: Dashboard */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    dashboardPhoto ? "bg-slate-800/80 border-emerald-500/50" : "bg-slate-800/50 border-slate-700/80 hover:border-amber-500/50"
                  }`}>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Camera className={`w-4 h-4 ${dashboardPhoto ? "text-emerald-400" : "text-amber-400"}`} />
                      <span className="text-xs font-bold text-slate-200">Панель приборов</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mb-2">одометр + уровень топлива</span>

                    {uploadingSlots.dashboard ? (
                      <div className="w-full py-4 flex flex-col items-center justify-center space-y-1.5 bg-slate-900/60 rounded-lg border border-slate-700">
                        <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                        <span className="text-[11px] text-amber-300 font-medium">Загрузка фото...</span>
                      </div>
                    ) : dashboardPhoto ? (
                      <div className="w-full space-y-2">
                        <div className="relative group rounded-lg overflow-hidden border border-slate-700 max-h-28 bg-black">
                          <img
                            src={dashboardPhoto}
                            alt="Панель приборов"
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute top-1 right-1 flex items-center space-x-1">
                            <a
                              href={`${dashboardPhoto}?download=1`}
                              download
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                              title="Скачать фото приборки"
                            >
                              <Download className="w-3 h-3 text-amber-400" />
                            </a>
                            <a
                              href={dashboardPhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                              title="Открыть в полном размере"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <div className="w-full bg-emerald-950/60 border border-emerald-500/50 rounded-lg px-2 py-1 flex items-center justify-center space-x-1 text-emerald-400 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Приборка зафиксирована</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                          <a
                            href={`${dashboardPhoto}?download=1`}
                            download
                            className="text-[11px] text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/25 px-2 py-1 rounded-lg flex items-center space-x-1 border border-amber-500/30 transition"
                            title="Скачать фото приборки"
                          >
                            <Download className="w-3 h-3 text-amber-400" />
                            <span>Скачать</span>
                          </a>
                          <label className="cursor-pointer text-[11px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-1 rounded-lg flex items-center space-x-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "dashboard");
                              }}
                            />
                            <RefreshCw className="w-3 h-3 text-amber-400" />
                            <span>Заменить</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setDashboardPhoto(null)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-lg flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Удалить</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full mt-auto space-y-1.5">
                        <label className="cursor-pointer w-full py-2 px-3 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow transition active:scale-95">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "dashboard");
                            }}
                          />
                          <Camera className="w-4 h-4 text-amber-400" />
                          <span>Снять / Загрузить фото</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Photo 2: Tech passport */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    techPassportPhoto ? "bg-slate-800/80 border-emerald-500/50" : "bg-slate-800/50 border-slate-700/80 hover:border-blue-500/50"
                  }`}>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <FileCheck className={`w-4 h-4 ${techPassportPhoto ? "text-emerald-400" : "text-blue-400"}`} />
                      <span className="text-xs font-bold text-slate-200">Фото техпаспорта</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mb-2">свидетельство о регистрации</span>

                    {uploadingSlots.techPassport ? (
                      <div className="w-full py-4 flex flex-col items-center justify-center space-y-1.5 bg-slate-900/60 rounded-lg border border-slate-700">
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-[11px] text-blue-300 font-medium">Загрузка техпаспорта...</span>
                      </div>
                    ) : techPassportPhoto ? (
                      <div className="w-full space-y-2">
                        <div className="relative group rounded-lg overflow-hidden border border-slate-700 max-h-28 bg-black">
                          <img
                            src={techPassportPhoto}
                            alt="Техпаспорт"
                            className="w-full h-24 object-cover"
                          />
                          <div className="absolute top-1 right-1 flex items-center space-x-1">
                            <a
                              href={`${techPassportPhoto}?download=1`}
                              download
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                              title="Скачать фото техпаспорта"
                            >
                              <Download className="w-3 h-3 text-blue-400" />
                            </a>
                            <a
                              href={techPassportPhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 bg-black/70 hover:bg-black text-white rounded-md text-[10px]"
                              title="Открыть в полном размере"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                        <div className="w-full bg-emerald-950/60 border border-emerald-500/50 rounded-lg px-2 py-1 flex items-center justify-center space-x-1 text-emerald-400 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Техпаспорт зафиксирован</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                          <a
                            href={`${techPassportPhoto}?download=1`}
                            download
                            className="text-[11px] text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/25 px-2 py-1 rounded-lg flex items-center space-x-1 border border-blue-500/30 transition"
                            title="Скачать фото техпаспорта"
                          >
                            <Download className="w-3 h-3 text-blue-400" />
                            <span>Скачать</span>
                          </a>
                          <label className="cursor-pointer text-[11px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-1 rounded-lg flex items-center space-x-1">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "techPassport");
                              }}
                            />
                            <RefreshCw className="w-3 h-3 text-blue-400" />
                            <span>Заменить</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setTechPassportPhoto(null)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-lg flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Удалить</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full mt-auto space-y-1.5">
                        <label className="cursor-pointer w-full py-2 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow transition active:scale-95">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "techPassport");
                            }}
                          />
                          <Camera className="w-4 h-4 text-blue-400" />
                          <span>Снять / Загрузить фото</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Video: Walkaround */}
                  <div className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                    carBodyVideo ? "bg-slate-800/80 border-emerald-500/50" : "bg-slate-800/50 border-slate-700/80 hover:border-red-500/50"
                  }`}>
                    <div className="flex items-center space-x-1.5 mb-1">
                      <Video className={`w-4 h-4 ${carBodyVideo ? "text-emerald-400" : "text-rose-400"}`} />
                      <span className="text-xs font-bold text-slate-200">Круговое видео кузова</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mb-2">царапины и сколы по кругу 360°</span>

                    {uploadingSlots.video ? (
                      <div className="w-full py-4 flex flex-col items-center justify-center space-y-1.5 bg-slate-900/60 rounded-lg border border-slate-700">
                        <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
                        <span className="text-[11px] text-rose-300 font-medium">Загрузка видео...</span>
                        <span className="text-[9px] text-slate-400">Пожалуйста, подождите</span>
                      </div>
                    ) : carBodyVideo ? (
                      <div className="w-full space-y-2">
                        <div className="rounded-lg overflow-hidden border border-slate-700 bg-black max-h-28">
                          <video
                            src={carBodyVideo}
                            controls
                            playsInline
                            className="w-full h-24 object-contain"
                          />
                        </div>
                        <div className="w-full bg-emerald-950/60 border border-emerald-500/50 rounded-lg px-2 py-1 flex items-center justify-center space-x-1 text-emerald-400 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Видео 360° загружено</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                          <a
                            href={`${carBodyVideo}?download=1`}
                            download
                            className="text-[11px] text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-500/25 px-2 py-1 rounded-lg flex items-center space-x-1 border border-rose-500/30 transition font-medium"
                            title="Скачать видео осмотра"
                          >
                            <Download className="w-3 h-3 text-rose-400" />
                            <span>Скачать видео</span>
                          </a>
                          <label className="cursor-pointer text-[11px] text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-1 rounded-lg flex items-center space-x-1">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, "video");
                              }}
                            />
                            <RefreshCw className="w-3 h-3 text-rose-400" />
                            <span>Заменить</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setCarBodyVideo(null)}
                            className="text-[11px] text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded-lg flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Удалить</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full mt-auto space-y-1.5">
                        <label className="cursor-pointer w-full py-2 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow transition active:scale-95">
                          <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, "video");
                            }}
                          />
                          <Video className="w-4 h-4 text-rose-400" />
                          <span>Записать / Загрузить видео</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: EXTRAS */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <h3 className="font-bold text-white text-base flex items-center space-x-2 mb-1">
                  <Package className="w-5 h-5 text-amber-400" />
                  <span>Чек-лист выдачи дополнительного оборудования</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Отметьте аксессуары, которые передаются клиенту в салон автомобиля:
                </p>
              </div>

              <div className="space-y-2">
                {booking.extras && booking.extras.length > 0 ? (
                  booking.extras.map((extra: any) => {
                    const isChecked = issuedExtras.includes(extra.id);
                    return (
                      <div
                        key={extra.id}
                        onClick={() => toggleExtra(extra.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          isChecked
                            ? "bg-amber-950/30 border-amber-500/60 text-white"
                            : "bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div
                            className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold block">{extra.name}</span>
                            <span className="text-xs text-slate-400">
                              Кол-во: {extra.quantity} шт. | Стоимость в брони: ${extra.price}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            isChecked
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-700 text-slate-300"
                          }`}
                        >
                          {isChecked ? "Выдано ✓" : "Не выдано"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 bg-slate-800/20 rounded-xl border border-slate-800">
                    В заявке нет заказанных дополнительных опций.
                  </div>
                )}
              </div>

              {/* Технический контроль перед выдачей */}
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/40 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Контроль состояния перед выдачей:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center space-x-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-700/60 cursor-pointer hover:border-slate-600 transition">
                    <input
                      type="checkbox"
                      checked={washerFluidChecked}
                      onChange={(e) => setWasherFluidChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex items-center space-x-2 text-slate-200">
                      <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="font-semibold">Жидкость в бачке омывателя</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 bg-slate-900/70 p-3 rounded-xl border border-slate-700/60 cursor-pointer hover:border-slate-600 transition">
                    <input
                      type="checkbox"
                      checked={tirePressureChecked}
                      onChange={(e) => setTirePressureChecked(e.target.checked)}
                      className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex items-center space-x-2 text-slate-200">
                      <Gauge className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-semibold">Давление в шинах</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CONTRACT & DOCS PHOTO */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60">
                <h3 className="font-bold text-white text-base flex items-center space-x-2 mb-1">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Фото подписанного контракта и документов</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Сделайте совместное фото подписанного контракта вместе с оригиналом водительского удостоверения и паспорта клиента:
                </p>
              </div>

              {/* Upload preview card */}
              <div className="border-2 border-dashed border-amber-500/50 bg-amber-950/10 rounded-2xl p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Фото подписанного договора + паспорт + права
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Снимок подтверждает физическое присутствие клиента и юридическую силу договора. Сделайте фото договора вместе с оригиналами документов клиента.
                  </p>
                </div>

                {uploadingSlots.contract ? (
                  <div className="py-4 flex flex-col items-center justify-center space-y-1.5 bg-slate-900/60 rounded-xl border border-slate-700 max-w-sm mx-auto">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    <span className="text-xs text-amber-300 font-medium">Загрузка фото договора...</span>
                  </div>
                ) : contractPhoto ? (
                  <div className="max-w-sm mx-auto space-y-2">
                    <div className="relative group rounded-xl overflow-hidden border border-slate-700 max-h-48 bg-black">
                      <img
                        src={contractPhoto}
                        alt="Подписанный договор и документы"
                        className="w-full h-44 object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center space-x-1.5">
                        <a
                          href={`${contractPhoto}?download=1`}
                          download
                          className="p-1.5 bg-black/70 hover:bg-black text-amber-300 rounded-lg text-xs flex items-center space-x-1"
                          title="Скачать фото договора"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={contractPhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-black/70 hover:bg-black text-white rounded-lg text-xs"
                          title="Открыть в полном размере"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <div className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 text-xs px-3 py-1.5 rounded-lg inline-flex items-center space-x-1.5 font-medium">
                      <Check className="w-4 h-4" />
                      <span>Фото успешно сделано и прикреплено к отчёту</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <a
                        href={`${contractPhoto}?download=1`}
                        download
                        className="text-xs text-amber-300 hover:text-white bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-amber-500/30 transition active:scale-95 font-medium"
                        title="Скачать фото договора"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Скачать фото</span>
                      </a>
                      <label className="cursor-pointer text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 border border-slate-700 transition active:scale-95">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, "contract");
                          }}
                        />
                        <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Заменить фото</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setContractPhoto(null)}
                        className="text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl flex items-center space-x-1 border border-rose-500/30 transition active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <label className="cursor-pointer inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition active:scale-95">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, "contract");
                        }}
                      />
                      <Camera className="w-4 h-4" />
                      <span>Снять на камеру / Загрузить фото</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 text-xs text-slate-300 space-y-1">
                <p><strong>Клиент:</strong> {booking.customer.fullName}</p>
                <p><strong>Паспорт:</strong> {booking.customer.passportNumber}</p>
                <p><strong>Водительское удостоверение:</strong> {booking.customer.driverLicenseNumber}</p>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT & CASH REGISTER */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="bg-gradient-to-r from-amber-950/40 to-slate-800/60 p-4 rounded-xl border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Сумма к оплате (Аренда + Допы + Доставка):
                  </span>
                  <div className="text-2xl font-extrabold text-amber-400 font-mono mt-0.5">
                    {rentalAmount} <span className="text-sm font-bold text-amber-500/80">₾ (GEL)</span>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                    Депозит (Залог):
                  </span>
                  {depositAmount > 0 ? (
                    <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                      {depositAmount} <span className="text-sm font-bold text-emerald-500/80">₾ (GEL)</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg text-xs font-bold mt-1">
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>0 ₾ (Без залога)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Способ приёма оплаты за аренду:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "CASH"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">💵 Наличные</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">GEL, USD, EUR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD_POS")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "CARD_POS"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">💳 Терминал / Карта</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">POS-терминал</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("BOG_BANK")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "BOG_BANK"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">🏦 Bank of Georgia</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">BOG перевод</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("TBC_BANK")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "TBC_BANK"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">🏦 TBC Bank</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">TBC перевод</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CREDO_BANK")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "CREDO_BANK"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">🏦 Credo Bank</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">Credo перевод</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CRYPTO")}
                    className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold text-left transition-all min-w-0 overflow-hidden ${
                      paymentMethod === "CRYPTO"
                        ? "bg-amber-500 text-slate-950 border-amber-400 shadow"
                        : "bg-slate-800/60 border-slate-700 text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    <div className="truncate">💎 Криптовалюта</div>
                    <span className="block text-[10px] font-normal opacity-80 mt-0.5 truncate">USDT TRC20</span>
                  </button>
                </div>
              </div>

              {/* Deposit Method - only shown if depositAmount > 0 */}
              {depositAmount > 0 ? (
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Способ приёма залога (депозита):
                    </label>
                    <span className="text-xs text-amber-400 font-bold font-mono">{depositAmount} ₾ (GEL)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositMethod("CASH")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                        depositMethod === "CASH"
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      💵 Наличные
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod("CARD_HOLD")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                        depositMethod === "CARD_HOLD"
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      💳 Холдирование карты
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositMethod("TRANSFER")}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition ${
                        depositMethod === "TRANSFER"
                          ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow"
                          : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white"
                      }`}
                    >
                      🏦 Банк перевод
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Тариф без залога: залог 0 ₾ — средства на карте клиента не удерживаются.</span>
                </div>
              )}

              {/* Change calculator (Сдача при возврате) */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Калькулятор сдачи:
                  </span>
                  {changeOnReturn > 0 && (
                    <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                      Сдача при возврате: {changeOnReturn} ₾ (GEL)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Получено фактически от клиента (₾):
                    </label>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={(e) => handleAmountReceivedChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Сдача к возврату клиенту (₾):
                    </label>
                    <input
                      type="number"
                      value={changeOnReturn}
                      onChange={(e) => setChangeOnReturn(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  💡 Если клиент дал крупную купюру и у менеджера нет сдачи, сумма сдачи фиксируется в системе и автоматически будет выдана клиенту при возврате автомобиля.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Заметки менеджера / примечание к выдаче:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Любые особенности выдачи (например: клиент попросил продление, мелкая царапина на заднем бампере согласована)..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Отмена
            </button>
          )}

          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg transition active:scale-95"
            >
              <span>Далее</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-6 py-2.5 text-xs font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Сохранение в базу...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Выдать авто и закрыть акт</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
