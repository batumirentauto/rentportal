import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Calendar,
  Car,
  User,
  MapPin,
  Clock,
  DollarSign,
  Repeat,
  Check,
  CheckCircle2,
  Compass,
  ShieldAlert,
  Crown,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: () => void;
  initialCarId?: string;
  initialDate?: string;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
  initialCarId,
  initialDate,
}) => {
  const [cars, setCars] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [carId, setCarId] = useState<string>(initialCarId || "");
  const [customerId, setCustomerId] = useState<string>("");
  
  // Quick Customer inputs if creating new
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>("");
  const [newCustomerPassport, setNewCustomerPassport] = useState<string>("");
  const [newCustomerLicense, setNewCustomerLicense] = useState<string>("");

  const [startDate, setStartDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<string>("10:00");
  const [returnTime, setReturnTime] = useState<string>("10:00");
  
  const [rentalDays, setRentalDays] = useState<number>(3);

  const computedEndDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + rentalDays);
    return d.toISOString().split("T")[0];
  }, [startDate, rentalDays]);
  const [pickupCityCode, setPickupCityCode] = useState<string>("TBS");
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [pickupType, setPickupType] = useState<string>("OFFICE");
  const [pickupAddress, setPickupAddress] = useState<string>("");

  const [returnCityCode, setReturnCityCode] = useState<string>("TBS");
  const [returnLocationId, setReturnLocationId] = useState<string>("");
  const [returnType, setReturnType] = useState<string>("OFFICE");

  const [dailyRate, setDailyRate] = useState<number>(65);
  const [ownerDailyRate, setOwnerDailyRate] = useState<number>(25);
  const [depositAmount, setDepositAmount] = useState<number>(300);
  const [acknowledgedRelocation, setAcknowledgedRelocation] = useState<boolean>(false);
  const [acknowledgedStopBlock, setAcknowledgedStopBlock] = useState<boolean>(false);
  const [acknowledgedBlacklist, setAcknowledgedBlacklist] = useState<boolean>(false);

  // Load cars, locations, customers
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [carsRes, custRes, bRes] = await Promise.all([
          fetch("/api/fleet/timeline?days=30"),
          fetch("/api/customers"),
          fetch("/api/bookings"),
        ]);

        const [carsJson, custJson, bJson] = await Promise.all([
          carsRes.json(),
          custRes.json(),
          bRes.json(),
        ]);

        if (carsJson.success) {
          setCars(carsJson.cars || []);
          if (!carId && carsJson.cars?.length > 0) {
            setCarId(initialCarId || carsJson.cars[0].id);
          }
        }

        if (custJson.success && custJson.customers) {
          setCustomers(custJson.customers);
          if (custJson.customers.length > 0 && !customerId) {
            setCustomerId(custJson.customers[0].id);
          }
        } else if (bJson.success && bJson.bookings) {
          const custMap = new Map();
          bJson.bookings.forEach((b: any) => {
            if (b.customer) custMap.set(b.customer.id, b.customer);
          });
          const custList = Array.from(custMap.values());
          setCustomers(custList);
          if (custList.length > 0 && !customerId) {
            setCustomerId(custList[0].id);
          }
        }

        if (bJson.success && bJson.bookings) {
          const locMap = new Map();
          bJson.bookings.forEach((b: any) => {
            if (b.pickupLocation) locMap.set(b.pickupLocation.id, b.pickupLocation);
            if (b.returnLocation) locMap.set(b.returnLocation.id, b.returnLocation);
          });
          const locList = Array.from(locMap.values());
          setLocations(locList);

          if (locList.length > 0) {
            const defaultPickup = locList.find((l: any) => l.city?.code === pickupCityCode) || locList[0];
            setPickupLocationId(defaultPickup.id);
            setReturnLocationId(defaultPickup.id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isOpen, initialCarId]);

  // Selected Car object
  const selectedCar = useMemo(() => {
    return cars.find((c) => c.id === carId);
  }, [cars, carId]);

  // Selected Customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Reset blacklist acknowledgment when customer changes
  useEffect(() => {
    setAcknowledgedBlacklist(false);
  }, [customerId]);

  // Auto-set pricing when car changes
  useEffect(() => {
    if (selectedCar) {
      if (selectedCar.clientStandardDailyRate) {
        setDailyRate(selectedCar.clientStandardDailyRate);
      }
      if (selectedCar.defaultOwnerDailyRate) {
        setOwnerDailyRate(selectedCar.defaultOwnerDailyRate);
      }
    }
  }, [selectedCar]);

  // Determine car's projected city on the chosen startDate
  const projectedCityOnStartDate = useMemo(() => {
    if (!selectedCar) return null;

    const targetDate = new Date(`${startDate}T${startTime}:00`);

    // Сортируем все брони этого автомобиля по дате окончания
    const sortedBookings = [...(selectedCar.bookings || [])].sort(
      (a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );

    // Ищем последнюю One-Way бронь, которая завершится ДО или В ДЕНЬ нашей даты
    let currentCity = selectedCar.city;

    for (const b of sortedBookings) {
      const bEnd = new Date(b.endDate);
      if (b.isOneWay && bEnd <= targetDate) {
        currentCity = b.returnLocation.city;
      }
    }

    return currentCity;
  }, [selectedCar, startDate, startTime]);

  // Relocation Warning detection:
  // Is car's projected city DIFFERENT from the manager's chosen pickupCityCode?
  const isCityMismatch = useMemo(() => {
    if (!projectedCityOnStartDate) return false;
    return projectedCityOnStartDate.code !== pickupCityCode;
  }, [projectedCityOnStartDate, pickupCityCode]);

  // One-way drop-off detection & Pricing calculations
  const isOneWay = pickupCityCode !== returnCityCode;
  const oneWayFee = isOneWay ? 50 : 0;
  const rentalTotal = rentalDays * dailyRate;
  const totalAmount = rentalTotal + oneWayFee;
  const ownerTotalPayout = ownerDailyRate * rentalDays;
  const companyMargin = totalAmount - ownerTotalPayout;
  const marginPercent = totalAmount > 0 ? Math.round((companyMargin / totalAmount) * 100) : 0;
  const isLossMaking = dailyRate < ownerDailyRate;

  // Filter locations by city
  const pickupLocationsForCity = useMemo(() => {
    return locations.filter((l) => l.city?.code === pickupCityCode);
  }, [locations, pickupCityCode]);

  const returnLocationsForCity = useMemo(() => {
    return locations.filter((l) => l.city?.code === returnCityCode);
  }, [locations, returnCityCode]);

  // Update default locations on city change
  useEffect(() => {
    if (pickupLocationsForCity.length > 0) {
      setPickupLocationId(pickupLocationsForCity[0].id);
    }
  }, [pickupCityCode, pickupLocationsForCity]);

  useEffect(() => {
    if (returnLocationsForCity.length > 0) {
      setReturnLocationId(returnLocationsForCity[0].id);
    }
  }, [returnCityCode, returnLocationsForCity]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCar?.isStopBlocked && !acknowledgedStopBlock) {
      alert("Внимание! Этот автомобиль находится на СТОПе (истек техосмотр или страховка). Подтвердите ознакомление в блоке предупреждения перед оформлением брони.");
      return;
    }

    if (selectedCustomer?.isBlacklisted && !acknowledgedBlacklist) {
      alert(`⛔ БРОНИРОВАНИЕ ЗАБЛОКИРОВАНО!\n\nКлиент "${selectedCustomer.fullName}" находится в ЧЁРНОМ СПИСКЕ компании.\nПричина: ${selectedCustomer.blacklistReason || "Не указана"}\n\nЕсли выдача согласована с генеральным директором, отметьте галочку подтверждения согласования.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const returnDateObj = new Date(startDate);
      returnDateObj.setDate(returnDateObj.getDate() + rentalDays);
      const returnDateStr = returnDateObj.toISOString().split("T")[0];
      const endDateTime = new Date(`${returnDateStr}T${returnTime || startTime}:00`);

      let targetCustomerId = customerId;

      // If new customer details provided
      if (!targetCustomerId && newCustomerName) {
        // Fallback or use existing
        targetCustomerId = customers[0]?.id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          customerId: targetCustomerId || customers[0]?.id,
          startDate: startDateTime,
          endDate: endDateTime,
          rentalDays,
          pickupLocationId,
          pickupType,
          pickupAddress: pickupAddress || undefined,
          returnLocationId,
          returnType,
          dailyRate,
          rentalTotal,
          deliveryFee: oneWayFee,
          extrasTotal: 0,
          totalAmount,
          depositAmount,
          currency: "GEL",
          ownerDailyRate,
          isAddedDuringDay: true,
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        onBookingCreated();
        onClose();
      } else {
        alert("Ошибка: " + resJson.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Ошибка при создании бронирования");
    } finally {
      setIsSubmitting(false);
    }
  };

  const carCityTheme = projectedCityOnStartDate ? getCityTheme(projectedCityOnStartDate.code) : null;
  const chosenPickupTheme = getCityTheme(pickupCityCode);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded uppercase">
                Новое бронирование
              </span>
              <span className="text-xs text-slate-400">
                Создание брони в системе
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              Оформление аренды автомобиля
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Car selection & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Выберите автомобиль:
              </label>
              <select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
              >
                {cars.map((c: any) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className={c.isStopBlocked ? "text-red-400 font-bold" : ""}
                  >
                    {c.isStopBlocked ? "⛔ [НА СТОПЕ] " : ""}
                    {c.brand} {c.model} ({c.plateNumber}) • {c.city.nameRu}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Клиент:
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={`w-full bg-slate-950 border rounded-xl p-2.5 text-white font-medium focus:outline-none ${
                  selectedCustomer?.isBlacklisted
                    ? "border-red-500 bg-red-950/30 text-red-200"
                    : "border-slate-700 focus:border-amber-500"
                }`}
              >
                {customers.map((cust: any) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.isBlacklisted
                      ? `⛔ [ЧЁРНЫЙ СПИСОК] ${cust.fullName} (${cust.phone})`
                      : cust.loyaltyTier && cust.loyaltyTier !== "STANDARD"
                      ? `👑 [${cust.loyaltyTier}] ${cust.fullName} (${cust.phone})`
                      : `${cust.fullName} (${cust.phone})`}
                  </option>
                ))}
              </select>

              {/* Customer Warning or Loyalty Banner */}
              {selectedCustomer?.isBlacklisted && (
                <div className="mt-2.5 p-3 bg-red-950/90 border-2 border-red-500 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-red-300 font-black text-sm">
                    <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                    <span>ВНИМАНИЕ: КЛИЕНТ В ЧЁРНОМ СПИСКЕ!</span>
                  </div>
                  <p className="text-xs text-red-200 leading-relaxed">
                    <strong>Причина блокировки:</strong>{" "}
                    {selectedCustomer.blacklistReason || "Грубое нарушение договора / повреждение авто / задолженность."}
                  </p>
                  <label className="flex items-start space-x-2 pt-1.5 border-t border-red-800/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={acknowledgedBlacklist}
                      onChange={(e) => setAcknowledgedBlacklist(e.target.checked)}
                      className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="text-xs text-red-300 font-semibold">
                      Подтверждаю согласование брони для черного списка с генеральным директором / СБ
                    </span>
                  </label>
                </div>
              )}

              {selectedCustomer && !selectedCustomer.isBlacklisted && selectedCustomer.loyaltyTier && selectedCustomer.loyaltyTier !== "STANDARD" && (
                <div className="mt-2 px-3 py-1.5 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-purple-300 font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Статус: {selectedCustomer.loyaltyTier}</span>
                  </div>
                  <span className="text-amber-300 font-extrabold">
                    Скидка клиента: {selectedCustomer.discountPercent}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dates & Duration & Times */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">📅 Дата выдачи:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1 flex items-center justify-between">
                  <span>⏰ Время выдачи:</span>
                  <span className="text-[10px] text-amber-400 font-normal">в брони</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">⏳ Дней аренды:</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={rentalDays}
                  onChange={(e) => setRentalDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">🏁 Дата возврата (расчёт):</label>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 text-slate-300 font-mono font-medium flex items-center justify-between">
                  <span>{new Date(computedEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="text-[10px] text-slate-500 font-sans">автоматически</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1 flex items-center justify-between">
                  <span>🕒 Время возврата:</span>
                  <span className="text-[10px] text-slate-400 font-normal">необязательно</span>
                </label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  title="Время возврата (по умолчанию равно времени выдачи, можно изменить при согласовании)"
                />
              </div>
            </div>
          </div>

          {/* Pickup & Return Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pickup */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Локация выдачи:</span>
              
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setPickupCityCode("TBS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "TBS"
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🏛️ Тбилиси
                </button>
                <button
                  type="button"
                  onClick={() => setPickupCityCode("BUS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "BUS"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌊 Батуми
                </button>
                <button
                  type="button"
                  onClick={() => setPickupCityCode("KUT")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "KUT"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌿 Кутаиси
                </button>
              </div>

              <select
                value={pickupLocationId}
                onChange={(e) => setPickupLocationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
              >
                {pickupLocationsForCity.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Return */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">Локация сдачи:</span>
                {isOneWay && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded font-bold">
                    ⇄ One-Way (+${oneWayFee})
                  </span>
                )}
              </div>

              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => setReturnCityCode("TBS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "TBS"
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🏛️ Тбилиси
                </button>
                <button
                  type="button"
                  onClick={() => setReturnCityCode("BUS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "BUS"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌊 Батуми
                </button>
                <button
                  type="button"
                  onClick={() => setReturnCityCode("KUT")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "KUT"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌿 Кутаиси
                </button>
              </div>

              <select
                value={returnLocationId}
                onChange={(e) => setReturnLocationId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
              >
                {returnLocationsForCity.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ⛔ HIGH VISIBILITY WARNING: CAR IS ON STOP-BLOCK! */}
          {selectedCar?.isStopBlocked && (
            <div className="bg-gradient-to-r from-red-950 via-rose-950/95 to-red-900 border-2 border-red-500 rounded-2xl p-4 shadow-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-600 rounded-xl text-white flex-shrink-0 mt-0.5 animate-pulse">
                  <AlertTriangle className="w-5 h-5 font-black" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Блокировка СТОП
                    </span>
                    <h4 className="font-extrabold text-red-200 text-sm">
                      ВНИМАНИЕ МЕНЕДЖЕРУ: АВТОМОБИЛЬ НАХОДИТСЯ НА СТОПЕ!
                    </h4>
                  </div>
                  <p className="text-red-100 text-xs leading-relaxed font-semibold">
                    Причина: {selectedCar.stopReason || "Истёк срок гостехосмотра (PTI) или страховки (КАСКО)"}.
                  </p>
                  <p className="text-[11px] text-red-200/80 italic">
                    ⚠️ По законам Грузии эксплуатация данного автомобиля без действующего техосмотра / страховки влечет штраф и аннулирование страхового покрытия. Перед выдачей авто клиенту необходимо пройти техосмотр или продлить полис.
                  </p>
                </div>
              </div>

              {/* Acknowledgment checkbox */}
              <div className="pt-2 border-t border-red-500/40">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={acknowledgedStopBlock}
                    onChange={(e) => setAcknowledgedStopBlock(e.target.checked)}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                  <span>
                    Я подтверждаю, что авто на СТОПе и гарантирую прохождение техосмотра / оформление полиса до момента передачи клиенту
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ⚠️ HIGH VISIBILITY WARNING: CAR WILL BE IN ANOTHER CITY! */}
          {/* (Предупреждение менеджера без жесткого запрета) */}
          {isCityMismatch && carCityTheme && (
            <div className="bg-gradient-to-r from-amber-950 via-amber-900/90 to-orange-950 border-2 border-amber-500 rounded-2xl p-4 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-500 rounded-xl text-slate-950 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 font-black" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-amber-300 text-sm flex items-center space-x-1.5">
                    <span>ВНИМАНИЕ МЕНЕДЖЕРУ: АВТОМОБИЛЬ БУДЕТ В ДРУГОМ ГОРОДЕ!</span>
                  </h4>
                  <p className="text-amber-100 text-xs leading-relaxed">
                    На выбранную дату (<strong>{new Date(startDate).toLocaleDateString("ru-RU")}</strong>) автомобиль{" "}
                    <strong>{selectedCar?.brand} {selectedCar?.model} ({selectedCar?.plateNumber})</strong> будет фактически находиться в городе{" "}
                    <span className="underline font-bold text-amber-200">{projectedCityOnStartDate?.nameRu} ({projectedCityOnStartDate?.code})</span>, а вы оформляете выдачу в{" "}
                    <span className="underline font-bold text-white">{chosenPickupTheme.name} ({chosenPickupTheme.tag})</span>.
                  </p>
                  <p className="text-[11px] text-amber-200/90 italic">
                    💡 Бронирование разрешено (запрет не накладывается), но потребуется согласовать перегон автомобиля между городами (~370 км / 5-6 часов в пути).
                  </p>
                </div>
              </div>

              {/* Acknowledgment checkbox */}
              <div className="pt-2 border-t border-amber-500/40">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={acknowledgedRelocation}
                    onChange={(e) => setAcknowledgedRelocation(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>
                    Я подтверждаю, что ознакомлен с предупреждением и организую перегон авто к моменту выдачи
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 🏷️ БАЗА ЦЕН & РУЧНОЙ ВВОД СТОИМОСТИ АРЕНДЫ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Тарифная сетка & Стоимость аренды
                </span>
              </div>
              <span className="text-[11px] text-amber-300 font-medium">
                Ручное указание суммы менеджером
              </span>
            </div>

            {/* Price Fork Recommendations & Owner Rate from DB */}
            {selectedCar && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Владельцу авто:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {ownerDailyRate} ₾/день ({ownerTotalPayout} ₾ за {rentalDays} дн.)
                    </span>
                  </div>

                  {selectedCar.pricingNotes && (
                    <span className="text-[10px] text-amber-300/90 italic truncate max-w-xs">
                      💬 {selectedCar.pricingNotes}
                    </span>
                  )}
                </div>

                {/* Price Fork Buttons */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Вилка цен для клиентов по базе (нажмите для быстрой установки тарифа):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDailyRate(selectedCar.clientMinDailyRate || 35)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientMinDailyRate || 35)
                          ? "bg-blue-600/30 border-blue-400 text-blue-200 font-bold ring-1 ring-blue-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-slate-400">🟢 Мин (15+ дн.):</div>
                      <div className="font-mono font-bold text-xs text-blue-400">
                        {selectedCar.clientMinDailyRate || 35} ₾/дн
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDailyRate(selectedCar.clientStandardDailyRate || 50)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientStandardDailyRate || 50)
                          ? "bg-amber-500/30 border-amber-400 text-amber-200 font-bold ring-1 ring-amber-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-amber-400/80">🟡 Стандарт (реком.):</div>
                      <div className="font-mono font-bold text-xs text-amber-300">
                        {selectedCar.clientStandardDailyRate || 50} ₾/дн
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDailyRate(selectedCar.clientMaxDailyRate || 75)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientMaxDailyRate || 75)
                          ? "bg-orange-600/30 border-orange-400 text-orange-200 font-bold ring-1 ring-orange-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-orange-400/80">🔴 Макс (1-3 дн. / пик):</div>
                      <div className="font-mono font-bold text-xs text-orange-400">
                        {selectedCar.clientMaxDailyRate || 75} ₾/дн
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Price Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Суточный тариф ($/день):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Вручную за 1 день</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Итого за аренду ($ за {rentalDays} дн.):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    value={rentalTotal}
                    onChange={(e) => {
                      const total = Number(e.target.value);
                      if (rentalDays > 0) {
                        setDailyRate(Math.round(total / rentalDays));
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Вручную общая сумма</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Ставка владельцу ($/день):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    value={ownerDailyRate}
                    onChange={(e) => setOwnerDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Корректировка инвестору</span>
              </div>
            </div>

            {/* Warning if loss-making */}
            {isLossMaking && (
              <div className="p-2.5 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  <strong>Внимание:</strong> Вы указали суточный тариф (${dailyRate}), который ниже выплаты владельцу авто (${ownerDailyRate})! Сделка убыточна на ${ownerDailyRate - dailyRate}/день.
                </span>
              </div>
            )}

            {/* Live Financial Breakdown & Margin */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Клиент платит (с доставкой):</span>
                <span className="font-mono text-lg font-black text-amber-400">
                  {totalAmount} ₾ (GEL)
                </span>
                {oneWayFee > 0 && (
                  <span className="text-[10px] text-purple-300 block">
                    (включая One-Way: +{oneWayFee} ₾)
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Выплата владельцу:</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {ownerTotalPayout} ₾ (GEL)
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Маржа компании:</span>
                <span className={`font-mono text-base font-black px-2 py-0.5 rounded ${
                  companyMargin >= 0
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-950/80 text-red-300 border border-red-500/40"
                }`}>
                  {companyMargin >= 0 ? `+` : ``}{companyMargin} ₾ ({marginPercent}%)
                </span>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-400 block text-[10px]">Залог с клиента:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono text-slate-500">₾</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (isCityMismatch && !acknowledgedRelocation)}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Сохранение...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Подтвердить и создать бронь</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
