import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Calendar,
  Clock,
  Car,
  MapPin,
  Wallet,
  AlertTriangle,
  Repeat,
  Save,
  Loader2,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: any;
  cars?: any[];
  onBookingUpdated: (updatedBooking: any) => void;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  cars = [],
  onBookingUpdated,
}) => {
  // Car Selection
  const [selectedCarId, setSelectedCarId] = useState<string>(booking?.carId || "");

  // Dates & Times
  const initialStart = booking?.startDate ? new Date(booking.startDate) : new Date();
  const initialEnd = booking?.endDate ? new Date(booking.endDate) : new Date();

  const [startDateStr, setStartDateStr] = useState<string>(
    initialStart.toISOString().split("T")[0]
  );
  const [startTimeStr, setStartTimeStr] = useState<string>(
    initialStart.toTimeString().slice(0, 5) || "10:00"
  );

  const [endDateStr, setEndDateStr] = useState<string>(
    initialEnd.toISOString().split("T")[0]
  );
  const [returnTimeStr, setReturnTimeStr] = useState<string>(
    initialEnd.toTimeString().slice(0, 5) || "10:00"
  );

  const [rentalDays, setRentalDays] = useState<number>(booking?.rentalDays || 3);

  // Locations
  const [pickupCityCode, setPickupCityCode] = useState<string>(
    booking?.fromCityCode || booking?.pickupLocation?.city?.code || "TBS"
  );
  const [pickupLocationId, setPickupLocationId] = useState<string>(
    booking?.pickupLocationId || ""
  );
  const [pickupType, setPickupType] = useState<string>(booking?.pickupType || "OFFICE");
  const [pickupAddress, setPickupAddress] = useState<string>(booking?.pickupAddress || "");

  const [returnCityCode, setReturnCityCode] = useState<string>(
    booking?.toCityCode || booking?.returnLocation?.city?.code || "TBS"
  );
  const [returnLocationId, setReturnLocationId] = useState<string>(
    booking?.returnLocationId || ""
  );
  const [returnType, setReturnType] = useState<string>(booking?.returnType || "OFFICE");
  const [returnAddress, setReturnAddress] = useState<string>(booking?.returnAddress || "");

  // Financials
  const [dailyRate, setDailyRate] = useState<number>(booking?.dailyRate || 65);
  const [deliveryFee, setDeliveryFee] = useState<number>(booking?.deliveryFee || 0);
  const [extrasTotal, setExtrasTotal] = useState<number>(booking?.extrasTotal || 0);
  const [depositAmount, setDepositAmount] = useState<number>(booking?.depositAmount || 300);
  const [totalAmount, setTotalAmount] = useState<number>(booking?.totalAmount || 195);
  const [ownerDailyRate, setOwnerDailyRate] = useState<number>(booking?.ownerDailyRate || 25);

  // Status & Notes
  const [status, setStatus] = useState<string>(booking?.status || "CONFIRMED");
  const [managerNotes, setManagerNotes] = useState<string>(
    booking?.overdueDecisionNotes || ""
  );

  // All available locations list from API
  const [allLocations, setAllLocations] = useState<any[]>([]);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch locations
  useEffect(() => {
    const loadLocs = async () => {
      try {
        const res = await fetch("/api/locations");
        const json = await res.json();
        if (json.success && json.locations) {
          setAllLocations(json.locations);
        }
      } catch (e) {
        console.error("Error loading locations:", e);
      }
    };
    loadLocs();
  }, []);

  // When startDate or rentalDays change, auto update endDate
  const handleDaysChange = (newDays: number) => {
    const d = Math.max(1, newDays);
    setRentalDays(d);
    const start = new Date(startDateStr);
    if (!isNaN(start.getTime())) {
      start.setDate(start.getDate() + d);
      setEndDateStr(start.toISOString().split("T")[0]);
    }
    // Auto recalculate total
    const rentTot = d * dailyRate;
    setTotalAmount(rentTot + deliveryFee + extrasTotal);
  };

  // When endDate changes, auto update rentalDays
  const handleEndDateChange = (newEndStr: string) => {
    setEndDateStr(newEndStr);
    const s = new Date(startDateStr).getTime();
    const e = new Date(newEndStr).getTime();
    if (e > s) {
      const days = Math.max(1, Math.round((e - s) / (24 * 60 * 60 * 1000)));
      setRentalDays(days);
      const rentTot = days * dailyRate;
      setTotalAmount(rentTot + deliveryFee + extrasTotal);
    }
  };

  // When dailyRate changes, update total
  const handleDailyRateChange = (rate: number) => {
    setDailyRate(rate);
    const rentTot = rentalDays * rate;
    setTotalAmount(rentTot + deliveryFee + extrasTotal);
  };

  // One-way calculation
  const isOneWay = pickupCityCode !== returnCityCode;

  // Filter locations by city
  const pickupLocations = useMemo(() => {
    return allLocations.filter((l) => l.city?.code === pickupCityCode);
  }, [allLocations, pickupCityCode]);

  const returnLocations = useMemo(() => {
    return allLocations.filter((l) => l.city?.code === returnCityCode);
  }, [allLocations, returnCityCode]);

  // Recalculate all financials
  const handleRecalculateTotals = () => {
    const autoOneWay = isOneWay ? 50 : 0;
    const computedDelivery = deliveryFee > 0 ? deliveryFee : autoOneWay;
    setDeliveryFee(computedDelivery);
    const rentTot = rentalDays * dailyRate;
    setTotalAmount(rentTot + computedDelivery + extrasTotal);
  };

  if (!isOpen || !booking) return null;

  const currentCar = cars.find((c) => c.id === selectedCarId) || booking.car;
  const isCarChanged = selectedCarId !== booking.carId;

  // Save changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const fullStart = new Date(`${startDateStr}T${startTimeStr}:00`);
      const fullEnd = new Date(`${endDateStr}T${returnTimeStr}:00`);

      const payload = {
        carId: selectedCarId,
        startDate: fullStart.toISOString(),
        endDate: fullEnd.toISOString(),
        rentalDays,
        pickupLocationId: pickupLocationId || undefined,
        pickupType,
        pickupAddress: pickupAddress || null,
        returnLocationId: returnLocationId || undefined,
        returnType,
        returnAddress: returnAddress || null,
        dailyRate,
        rentalTotal: rentalDays * dailyRate,
        deliveryFee,
        extrasTotal,
        totalAmount,
        depositAmount,
        ownerDailyRate,
        ownerTotalPayout: ownerDailyRate * rentalDays,
        status,
        overdueDecisionNotes: managerNotes || null,
      };

      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Не удалось сохранить изменения брони");
      }

      onBookingUpdated(json.booking);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка при сохранении бронирования");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                {booking.bookingNumber}
              </span>
              <span className="text-xs text-slate-400">
                Клиент: <strong className="text-white">{booking.customer?.fullName}</strong>
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5 flex items-center space-x-2">
              <span>✏️ Редактирование параметров бронирования</span>
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-center space-x-2 text-xs text-red-200">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* 1. CAR SELECTION (Замена автомобиля) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Car className="w-4 h-4 text-amber-400" />
                <span>Автомобиль автопарка:</span>
              </span>
              {isCarChanged && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Автомобиль изменен!
                </span>
              )}
            </div>

            <select
              value={selectedCarId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCarId(newId);
                const found = cars.find((c) => c.id === newId);
                if (found?.clientStandardDailyRate) {
                  handleDailyRateChange(found.clientStandardDailyRate);
                }
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:border-amber-500 text-xs"
            >
              {cars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.plateNumber}) • {c.cityName || c.city?.nameRu} • {c.clientStandardDailyRate || 65} ₾/день
                </option>
              ))}
            </select>

            {currentCar && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Текущий выбор: <strong className="text-white">{currentCar.brand} {currentCar.model}</strong> ({currentCar.plateNumber})
                </span>
                <span>
                  Город стоянки: <strong className="text-amber-400">{currentCar.cityName || currentCar.city?.nameRu || "—"}</strong>
                </span>
              </div>
            )}
          </div>

          {/* 2. DATES, TIMES & RENTAL DAYS */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Даты и время аренды:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Start Date & Time */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-semibold">
                  Дата и время выдачи авто:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={startDateStr}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setStartDateStr(newStart);
                      const s = new Date(newStart);
                      s.setDate(s.getDate() + rentalDays);
                      setEndDateStr(s.toISOString().split("T")[0]);
                    }}
                    className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    required
                  />
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-center"
                    required
                  />
                </div>
              </div>

              {/* End Date & Time */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-semibold">
                  Дата и время возврата авто:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="date"
                    value={endDateStr}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="col-span-2 bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                    required
                  />
                  <input
                    type="time"
                    value={returnTimeStr}
                    onChange={(e) => setReturnTimeStr(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono text-center"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Rental Days counter */}
            <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
              <span className="text-slate-300 font-semibold">
                Срок аренды (дней):
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDaysChange(rentalDays - 1)}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center transition"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={rentalDays}
                  onChange={(e) => handleDaysChange(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-amber-400"
                />
                <button
                  type="button"
                  onClick={() => handleDaysChange(rentalDays + 1)}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold flex items-center justify-center transition"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 3. LOCATIONS (Города и точки выдачи / возврата) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Города и локации выдачи / сдачи:</span>
              </span>
              {isOneWay && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center space-x-1">
                  <Repeat className="w-3 h-3" />
                  <span>One-Way междугородняя</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pickup location */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Филиал выдачи:</span>
                  <div className="flex space-x-1">
                    {["TBS", "BUS", "KUT"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setPickupCityCode(c);
                          const firstLoc = allLocations.find((l) => l.city?.code === c);
                          if (firstLoc) setPickupLocationId(firstLoc.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          pickupCityCode === c
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <select
                  value={pickupLocationId}
                  onChange={(e) => setPickupLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-[11px]"
                >
                  {pickupLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Return location */}
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-300">Филиал возврата:</span>
                  <div className="flex space-x-1">
                    {["TBS", "BUS", "KUT"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setReturnCityCode(c);
                          const firstLoc = allLocations.find((l) => l.city?.code === c);
                          if (firstLoc) setReturnLocationId(firstLoc.id);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          returnCityCode === c
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <select
                  value={returnLocationId}
                  onChange={(e) => setReturnLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-[11px]"
                >
                  {returnLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 4. FINANCIAL DETAILS (Тарифы, сборы, залог, итого) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>Финансы и стоимость аренды:</span>
              </span>
              <button
                type="button"
                onClick={handleRecalculateTotals}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-bold"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Авторасчет</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Суточный тариф (₾ GEL):
                </label>
                <input
                  type="number"
                  value={dailyRate}
                  onChange={(e) => handleDailyRateChange(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Сбор One-Way / Доставка (₾):
                </label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => {
                    const fee = Number(e.target.value);
                    setDeliveryFee(fee);
                    setTotalAmount(rentalDays * dailyRate + fee + extrasTotal);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Залог / Депозит (₾ GEL):
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-bold text-amber-400">
                  ИТОГО к оплате (₾ GEL):
                </label>
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Number(e.target.value))}
                  className="w-full bg-slate-900 border-2 border-amber-500/50 rounded-lg p-1.5 text-amber-300 font-mono font-black text-sm"
                  required
                />
              </div>
            </div>
          </div>

          {/* 5. STATUS & MANAGER NOTES */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Статус бронирования:
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
                >
                  <option value="CONFIRMED">🟡 Подтверждена (CONFIRMED)</option>
                  <option value="PREPARING">🔵 На подготовке (PREPARING)</option>
                  <option value="ACTIVE">🟢 В аренде / Выдана (ACTIVE)</option>
                  <option value="COMPLETED">⚪ Завершена (COMPLETED)</option>
                  <option value="CANCELLED">🔴 Отменена (CANCELLED)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                  Ставка владельца авто (₾/день):
                </label>
                <input
                  type="number"
                  value={ownerDailyRate}
                  onChange={(e) => setOwnerDailyRate(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-semibold">
                Примечания и комментарии менеджера:
              </label>
              <textarea
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                placeholder="Рейс прибытия, пожелания клиента, особые условия..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>💾 Сохранить изменения брони</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
