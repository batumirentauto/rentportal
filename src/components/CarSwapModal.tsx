import React, { useState, useEffect, useMemo } from "react";
import { MileageInput } from "./MileageInput";
import {
  X,
  RefreshCw,
  Car,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Fuel,
  Gauge,
  Sparkles,
  Wrench,
  ThumbsDown,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface CarSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  onSwapCompleted?: (result: any) => void;
}

export const CarSwapModal: React.FC<CarSwapModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSwapCompleted,
}) => {
  const currentCar = booking?.car;

  // Step state / navigation
  const [loadingCars, setLoadingCars] = useState<boolean>(true);
  const [availableCars, setAvailableCars] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Return of old car details
  const todayStr = new Date().toISOString().split("T")[0];
  const nowTimeStr = new Date().toTimeString().slice(0, 5);
  const [swapDate, setSwapDate] = useState<string>(todayStr);
  const [swapTime, setSwapTime] = useState<string>(nowTimeStr);

  // Days breakdown
  const totalOriginalDays = Math.max(1, booking?.rentalDays || 1);
  const [daysOnOldCar, setDaysOnOldCar] = useState<number>(1);
  const daysOnNewCar = Math.max(1, totalOriginalDays - daysOnOldCar);

  const [oldCarMileage, setOldCarMileage] = useState<number>(
    currentCar?.currentMileage || 50000
  );
  const [oldCarFuel, setOldCarFuel] = useState<number>(100);
  const [oldCarCleanliness, setOldCarCleanliness] = useState<string>("CLEAN");
  const [oldCarNextStatus, setOldCarNextStatus] = useState<string>("AVAILABLE"); // "AVAILABLE" | "STOP" | "NEEDS_WASH"
  const [oldCarCondition, setOldCarCondition] = useState<string>("");

  // 2. Swap reason
  const [swapReason, setSwapReason] = useState<string>("CLIENT_DISLIKED");
  const [reasonDetails, setReasonDetails] = useState<string>("");

  // 3. New car selection
  const [selectedNewCarId, setSelectedNewCarId] = useState<string>("");
  const [newCarMileage, setNewCarMileage] = useState<number>(0);
  const [newCarFuel, setNewCarFuel] = useState<number>(100);
  const [searchCarQuery, setSearchCarQuery] = useState<string>("");

  // 4. Financial decision
  const oldDailyRate = booking?.dailyRate || 100;
  const selectedNewCar = useMemo(() => {
    return availableCars.find((c) => c.id === selectedNewCarId);
  }, [availableCars, selectedNewCarId]);

  const newDailyRate = selectedNewCar?.dailyRate || oldDailyRate;
  const calculatedOldCost = daysOnOldCar * oldDailyRate;
  const calculatedNewCost = daysOnNewCar * newDailyRate;
  const calculatedTotal = calculatedOldCost + calculatedNewCost;
  const naturalPriceDiff = calculatedTotal - (booking?.totalAmount || 0);

  // Financial action: "NO_CHANGE" | "CHARGE_CLIENT" | "REFUND_CLIENT" | "CUSTOM"
  const [financialAction, setFinancialAction] = useState<string>("NO_CHANGE");
  const [customTotal, setCustomTotal] = useState<number>(booking?.totalAmount || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [paymentStatus, setPaymentStatus] = useState<string>("PAID");
  const [managerName, setManagerName] = useState<string>("Менеджер смены");
  const [notes, setNotes] = useState<string>("");

  // Copy helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  // Auto-calculate days on old car when modal opens
  useEffect(() => {
    if (booking?.startDate) {
      const start = new Date(booking.startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.max(1, Math.min(totalOriginalDays, Math.ceil(diffMs / (1000 * 60 * 60 * 24))));
      setDaysOnOldCar(diffDays);
    }
  }, [booking]);

  // Load available cars for replacement
  useEffect(() => {
    if (!isOpen || !booking?.id) return;
    const fetchCars = async () => {
      try {
        setLoadingCars(true);
        setErrorMessage(null);
        const res = await fetch(`/api/bookings/${booking.id}/swap-car?swapDate=${swapDate}`);
        const data = await res.json();
        if (data.success) {
          setAvailableCars(data.availableCars || []);
          // Auto select first free car if none selected
          const firstFree = (data.availableCars || []).find((c: any) => c.isAvailableForPeriod);
          if (firstFree && !selectedNewCarId) {
            setSelectedNewCarId(firstFree.id);
            setNewCarMileage(firstFree.currentMileage || 0);
          }
        } else {
          setErrorMessage(data.error || "Не удалось загрузить автомобили");
        }
      } catch (err: any) {
        setErrorMessage(err.message || "Ошибка подключения");
      } finally {
        setLoadingCars(false);
      }
    };

    fetchCars();
  }, [isOpen, booking?.id, swapDate]);

  // When selected new car changes, update initial mileage
  useEffect(() => {
    if (selectedNewCar) {
      setNewCarMileage(selectedNewCar.currentMileage || 0);
    }
  }, [selectedNewCar]);

  if (!isOpen || !booking) return null;

  // Final financial numbers
  let effectiveTotal = booking.totalAmount;
  let effectiveDifference = 0;

  if (financialAction === "NO_CHANGE") {
    effectiveTotal = booking.totalAmount;
    effectiveDifference = 0;
  } else if (financialAction === "CHARGE_CLIENT") {
    effectiveTotal = Math.max(booking.totalAmount, calculatedTotal);
    effectiveDifference = Math.max(0, naturalPriceDiff);
  } else if (financialAction === "REFUND_CLIENT") {
    effectiveTotal = Math.min(booking.totalAmount, calculatedTotal);
    effectiveDifference = Math.min(0, naturalPriceDiff);
  } else if (financialAction === "CUSTOM") {
    effectiveTotal = customTotal;
    effectiveDifference = customTotal - booking.totalAmount;
  }

  const filteredCars = availableCars.filter((c) => {
    if (!searchCarQuery) return true;
    const q = searchCarQuery.toLowerCase();
    return (
      c.brand.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.plateNumber.toLowerCase().includes(q) ||
      (c.city?.nameRu || "").toLowerCase().includes(q)
    );
  });

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewCarId) {
      setErrorMessage("Пожалуйста, выберите новый автомобиль из списка");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        newCarId: selectedNewCarId,
        swapDate: `${swapDate}T${swapTime}:00`,
        daysOnOldCar,
        daysOnNewCar,
        oldCarMileageAtReturn: oldCarMileage,
        oldCarFuelLevel: oldCarFuel,
        oldCarCleanliness,
        oldCarNextStatus,
        oldCarCondition,
        newCarMileageAtHandover: newCarMileage,
        newCarFuelLevel: newCarFuel,
        swapReason,
        reasonDetails,
        financialAction,
        oldDailyRate,
        newDailyRate,
        priceDifference: effectiveDifference,
        newTotalAmount: effectiveTotal,
        customNewTotal: financialAction === "CUSTOM" ? customTotal : undefined,
        differencePaymentMethod: paymentMethod,
        differencePaymentStatus: paymentStatus,
        managerName,
        notes,
      };

      const res = await fetch(`/api/bookings/${booking.id}/swap-car`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Не удалось выполнить замену автомобиля");
      }

      setSuccessMessage(data.message || "Автомобиль успешно заменен!");
      setTimeout(() => {
        if (onSwapCompleted) onSwapCompleted(data);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при выполнении замены");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1">
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>ОПЕРАЦИЯ: ЗАМЕНА АВТОМОБИЛЯ</span>
              </span>
              <span className="font-mono text-xs text-slate-400">
                Бронь: <strong className="text-white">{booking.bookingNumber}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 flex items-center space-x-2">
              <span>Замена авто клиенту:</span>
              <span className="text-amber-400">{booking.customer?.fullName}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Пересадка клиента на другой автомобиль с перерасчетом стоимости и фиксацией состояния обеих машин.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-2xl text-red-200 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-center space-x-2 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmitSwap} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          
          {/* 1. СТАРЫЙ АВТОМОБИЛЬ И ПАРАМЕТРЫ СДАЧИ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <Car className="w-4 h-4 text-amber-400" />
                <span>1. Текущий автомобиль (Сдача / Осмотр):</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Исходный срок: <strong>{totalOriginalDays} дн.</strong> ({booking.dailyRate} ₾/день)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {/* Car details */}
              <div className="space-y-1">
                <div className="font-black text-white text-sm">
                  {currentCar?.brand} {currentCar?.model}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-mono">Госномер:</span>
                    <span className="font-mono text-amber-400 font-bold">{currentCar?.plateNumber}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentCar?.plateNumber, "old-plate")}
                      className="p-0.5 text-slate-500 hover:text-white"
                      title="Скопировать госномер"
                    >
                      {copiedKey === "old-plate" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Swap Date & Time */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-semibold">Дата и время замены:</label>
                <div className="flex space-x-1.5">
                  <input
                    type="date"
                    value={swapDate}
                    onChange={(e) => setSwapDate(e.target.value)}
                    className="w-2/3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    required
                  />
                  <input
                    type="time"
                    value={swapTime}
                    onChange={(e) => setSwapTime(e.target.value)}
                    className="w-1/3 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Days on old car */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 block font-semibold">
                  Фактически дней на этом авто:
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setDaysOnOldCar((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="font-mono font-black text-amber-400 text-sm w-12 text-center bg-slate-950 py-1 rounded-lg border border-slate-800">
                    {daysOnOldCar} дн.
                  </span>
                  <button
                    type="button"
                    onClick={() => setDaysOnOldCar((p) => Math.min(totalOriginalDays, p + 1))}
                    className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold text-white flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Останется: {daysOnNewCar} дн.)
                  </span>
                </div>
              </div>
            </div>

            {/* Odometer, Fuel & Return Next Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Odometer */}
              <div>
                <MileageInput
                  valueKm={oldCarMileage}
                  onChangeKm={(km) => setOldCarMileage(km)}
                  label="Одометр при сдаче"
                  required
                />
              </div>

              {/* Fuel Level */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold flex items-center space-x-1">
                  <Fuel className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Уровень топлива ({oldCarFuel}%):</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={oldCarFuel}
                    onChange={(e) => setOldCarFuel(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                  <span className="font-mono text-cyan-400 text-xs w-10 text-right">{oldCarFuel}%</span>
                </div>
              </div>

              {/* Where to send the old car */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                  Куда направить сдаваемый авто:
                </label>
                <select
                  value={oldCarNextStatus}
                  onChange={(e) => setOldCarNextStatus(e.target.value)}
                  className={`w-full border rounded-xl p-2 text-xs font-bold focus:outline-none ${
                    oldCarNextStatus === "STOP"
                      ? "bg-red-950/80 border-red-500 text-red-300"
                      : oldCarNextStatus === "NEEDS_WASH"
                      ? "bg-amber-950/60 border-amber-500 text-amber-300"
                      : "bg-slate-900 border-slate-700 text-emerald-300"
                  }`}
                >
                  <option value="AVAILABLE">🟢 Свободен (Исправен, клиенту просто не подошел)</option>
                  <option value="NEEDS_WASH">🧼 На автомойку (Перед следующей выдачей)</option>
                  <option value="STOP">🔴 На СТО / Ремонт (Поломка / дефект / ДТП)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. ПРИЧИНА ЗАМЕНЫ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-200 flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>2. Причина замены автомобиля:</span>
            </span>

            {/* Reason selector tags */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: "CLIENT_DISLIKED", label: "👎 Не понравился клиенту", icon: ThumbsDown, desc: "Габариты, динамика, комфорт" },
                { id: "BREAKDOWN", label: "🛠️ Техническая поломка", icon: Wrench, desc: "Стук, чек, кондиционер, датчик" },
                { id: "UPGRADE", label: "⬆️ Апгрейд класса", icon: ArrowUpRight, desc: "Клиент захотел авто выше классом" },
                { id: "ACCIDENT", label: "💥 ДТП / Повреждение", icon: ShieldAlert, desc: "Страховой случай на дороге" },
                { id: "LOGISTICS", label: "🚚 Операционная замена", icon: RefreshCw, desc: "Инициатива компании" },
                { id: "OTHER", label: "💬 Другая причина", icon: Sparkles, desc: "Индивидуальное согласование" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSwapReason(r.id)}
                  className={`p-2 rounded-xl border text-left transition flex flex-col justify-between ${
                    swapReason === r.id
                      ? "bg-purple-600/25 border-purple-500 text-white shadow-md shadow-purple-950/40"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850"
                  }`}
                >
                  <span className="font-bold text-xs">{r.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{r.desc}</span>
                </button>
              ))}
            </div>

            {/* Details input */}
            <div>
              <input
                type="text"
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Подробный комментарий (например: 'Клиенту тяжело парковать большой внедорожник, попросил компактный седан' или 'Загорелся индикатор давления шин')..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* 3. ВЫБОР НОВОГО АВТОМОБИЛЯ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
              <div>
                <span className="font-bold text-slate-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>3. Выберите новый автомобиль на оставшиеся {daysOnNewCar} дн.:</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Доступны авто, не занятые с {swapDate} по {new Date(booking.endDate).toLocaleDateString("ru-RU")}
                </span>
              </div>

              {/* Quick filter input */}
              <input
                type="text"
                value={searchCarQuery}
                onChange={(e) => setSearchCarQuery(e.target.value)}
                placeholder="🔍 Поиск авто..."
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500 w-full sm:w-48"
              />
            </div>

            {loadingCars ? (
              <div className="py-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                <span>Загрузка свободных автомобилей...</span>
              </div>
            ) : filteredCars.length === 0 ? (
              <div className="p-4 bg-slate-900 rounded-xl text-center text-slate-400">
                Нет свободных автомобилей на этот период. Попробуйте скорректировать дату замены.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredCars.map((car) => {
                  const isSelected = selectedNewCarId === car.id;
                  const isFree = car.isAvailableForPeriod;

                  return (
                    <button
                      key={car.id}
                      type="button"
                      disabled={!isFree}
                      onClick={() => setSelectedNewCarId(car.id)}
                      className={`p-2.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border-cyan-400 text-white shadow-lg ring-1 ring-cyan-400"
                          : isFree
                          ? "bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-200"
                          : "bg-slate-900/30 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-xs text-white">
                            {car.brand} {car.model}
                          </div>
                          <div className="font-mono text-[11px] text-amber-400 font-bold">
                            {car.plateNumber}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-xs text-emerald-400">
                            {car.dailyRate} ₾/д
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {car.city?.nameRu}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-mono">{car.currentMileage || 0} км</span>
                        {isFree ? (
                          <span className="text-emerald-400 font-semibold">✓ Свободен</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">⛔ {car.conflictReason}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* New Car Odometer & Fuel at pickup */}
            {selectedNewCar && (
              <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-3">
                <MileageInput
                  valueKm={newCarMileage}
                  onChangeKm={(km) => setNewCarMileage(km)}
                  label="Одометр нового авто при выдаче"
                  required
                />

                <div className="flex items-center space-x-2 pt-1 border-t border-cyan-500/20">
                  <Fuel className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-slate-300">Топливо:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newCarFuel}
                    onChange={(e) => setNewCarFuel(Number(e.target.value))}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-cyan-300 font-mono font-bold text-xs text-center"
                  />
                  <span className="text-cyan-400 font-mono font-bold">%</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. ФИНАНСОВЫЙ ПЕРЕРАСЧЕТ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-bold text-slate-200 flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>4. Финансовый перерасчет стоимости аренды:</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Исходная стоимость: <strong className="text-white">{booking.totalAmount} ₾</strong>
              </span>
            </div>

            {/* Calculations Breakdown visual */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Старый авто ({currentCar?.brand})</span>
                <span className="font-mono text-white font-bold text-sm">
                  {daysOnOldCar} дн. × {oldDailyRate} ₾ = {calculatedOldCost} ₾
                </span>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Новый авто ({selectedNewCar?.brand || "—"})</span>
                <span className="font-mono text-cyan-300 font-bold text-sm">
                  {daysOnNewCar} дн. × {newDailyRate} ₾ = {calculatedNewCost} ₾
                </span>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">Расчетная разница</span>
                <span className={`font-mono font-black text-sm ${naturalPriceDiff > 0 ? "text-amber-400" : naturalPriceDiff < 0 ? "text-blue-400" : "text-emerald-400"}`}>
                  {naturalPriceDiff > 0 ? `+${naturalPriceDiff} ₾ (Доплата)` : naturalPriceDiff < 0 ? `${naturalPriceDiff} ₾ (Возврат)` : "0 ₾ (Без доплат)"}
                </span>
              </div>
            </div>

            {/* 4 Financial Decision Options */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] text-slate-300 font-bold block">
                Выберите финансовое решение:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* 1. NO CHANGE */}
                <button
                  type="button"
                  onClick={() => setFinancialAction("NO_CHANGE")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    financialAction === "NO_CHANGE"
                      ? "bg-emerald-950/50 border-emerald-500 text-white shadow-md shadow-emerald-950/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-300">✓ Без изменения стоимости</span>
                    <span className="font-mono text-xs font-black text-emerald-400">0 ₾</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Клиент ничего не доплачивает (комплимент от компании / поломка авто). Итого: {booking.totalAmount} ₾.
                  </span>
                </button>

                {/* 2. CHARGE DIFFERENCE */}
                <button
                  type="button"
                  onClick={() => setFinancialAction("CHARGE_CLIENT")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    financialAction === "CHARGE_CLIENT"
                      ? "bg-amber-950/50 border-amber-500 text-white shadow-md shadow-amber-950/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-amber-300">
                      💰 Доплата с клиента ({Math.max(0, naturalPriceDiff)} ₾)
                    </span>
                    <span className="font-mono text-xs font-black text-amber-400">
                      +{Math.max(0, naturalPriceDiff)} ₾
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Новый авто выше классом. Итоговая сумма брони: {booking.totalAmount + Math.max(0, naturalPriceDiff)} ₾.
                  </span>
                </button>

                {/* 3. REFUND CLIENT */}
                <button
                  type="button"
                  onClick={() => setFinancialAction("REFUND_CLIENT")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    financialAction === "REFUND_CLIENT"
                      ? "bg-blue-950/50 border-blue-500 text-white shadow-md shadow-blue-950/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-blue-300">
                      💸 Возврат переплаты клиенту
                    </span>
                    <span className="font-mono text-xs font-black text-blue-400">
                      {Math.min(0, naturalPriceDiff)} ₾
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Новый авто экономичнее. Вернуть клиенту разницу {Math.abs(Math.min(0, naturalPriceDiff))} ₾.
                  </span>
                </button>

                {/* 4. CUSTOM SUM */}
                <button
                  type="button"
                  onClick={() => setFinancialAction("CUSTOM")}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    financialAction === "CUSTOM"
                      ? "bg-purple-950/50 border-purple-500 text-white shadow-md shadow-purple-950/30"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-purple-300">⚙️ Индивидуальная сумма</span>
                    <span className="font-mono text-xs font-black text-purple-400">Вручную</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Задать точную итоговую стоимость бронирования вручную.
                  </span>
                </button>
              </div>

              {/* Custom Total Input if CUSTOM */}
              {financialAction === "CUSTOM" && (
                <div className="p-3 bg-purple-950/30 border border-purple-500/40 rounded-xl flex items-center space-x-3">
                  <span className="text-xs text-purple-200 font-bold">Итоговая стоимость всей аренды:</span>
                  <input
                    type="number"
                    value={customTotal}
                    onChange={(e) => setCustomTotal(Number(e.target.value))}
                    className="w-28 bg-slate-950 border border-purple-500 rounded-lg p-1.5 text-white font-mono font-bold text-xs"
                  />
                  <span className="text-xs font-mono text-purple-300">
                    ₾ (Разница: {customTotal - booking.totalAmount > 0 ? `+${customTotal - booking.totalAmount}` : customTotal - booking.totalAmount} ₾)
                  </span>
                </div>
              )}

              {/* Payment Method & Timing if Difference exists */}
              {effectiveDifference !== 0 && (
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                      Способ взаиморасчета:
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="CASH">Наличные (Касса)</option>
                      <option value="CARD_POS">Банковская карта (POS-терминал)</option>
                      <option value="BANK_TRANSFER">Банковский перевод (TBC / BOG)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                      Статус оплаты разницы:
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white"
                    >
                      <option value="PAID">Оплачено / Возвращено сразу</option>
                      <option value="PENDING">К взаиморасчету при окончательном возврате</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. МЕНЕДЖЕР И ПРИМЕЧАНИЕ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                Менеджер, оформляющий замену:
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-xs font-bold"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                Служебная заметка для договора:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Заметки по смене авто..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-xs"
              />
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white transition text-xs font-bold"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedNewCarId}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black rounded-xl text-xs shadow-lg shadow-cyan-950/50 transition active:scale-95 disabled:opacity-50 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Выполнение замены...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Выполнить замену на {selectedNewCar?.brand || "авто"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
