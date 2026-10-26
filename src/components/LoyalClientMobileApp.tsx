"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Smartphone,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  User,
  Heart,
  X,
  Repeat,
  Phone,
  MessageCircle,
  Fuel,
  Gauge,
  CreditCard,
  Crown,
  Search,
  Filter,
  ArrowRight,
  Percent,
  Gift,
  Zap,
  Info,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const LoyalClientMobileApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState<boolean>(true);

  // App Tabs
  const [activeTab, setActiveTab] = useState<"search" | "my_trips" | "vip_perks">("search");

  // Booking Parameters (Standard Car Rental Flow)
  const [cityFilter, setCityFilter] = useState<string>("BUS"); // Default to Batumi or ALL
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState<string>("11:00");
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [endTime, setEndTime] = useState<string>("11:00");

  // Filters
  const [classFilter, setClassFilter] = useState<string>("ALL"); // "ALL", "ECONOMY", "COMFORT", "CROSSOVER", "SUV", "PREMIUM"
  const [onlyUpgrades, setOnlyUpgrades] = useState<boolean>(false);

  // Booking Modal State
  const [selectedCar, setSelectedCar] = useState<any | null>(null);
  const [isUpgradeApplied, setIsUpgradeApplied] = useState<boolean>(true);
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [returnLocationId, setReturnLocationId] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);

  // Calculate rental days
  const rentalDays = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  }, [startDate, endDate]);

  const fetchCarsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        city: cityFilter,
        class: classFilter,
        startDate,
        endDate,
      });
      const res = await fetch(`/api/client-app/cars?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.locations?.length > 0 && !pickupLocationId) {
          const defaultLoc = json.locations.find((l: any) => l.city?.code === cityFilter) || json.locations[0];
          setPickupLocationId(defaultLoc.id);
          setReturnLocationId(defaultLoc.id);
        }
      }
    } catch (e) {
      console.error("Error loading VIP cars:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarsData();
  }, [cityFilter, classFilter, startDate, endDate]);

  const customer = data?.customer;
  const cars = data?.cars || [];
  const locations = data?.locations || [];

  // Filter cars based on availability and upgrade toggle
  const displayedCars = useMemo(() => {
    return cars.filter((c: any) => {
      if (onlyUpgrades && !c.isUpgradeOffer) return false;
      return true;
    });
  }, [cars, onlyUpgrades]);

  const handleOpenBooking = (car: any) => {
    setSelectedCar(car);
    setIsUpgradeApplied(car.isUpgradeOffer);
    const loc = locations.find((l: any) => l.city?.code === car.cityCode) || locations[0];
    if (loc) {
      setPickupLocationId(loc.id);
      setReturnLocationId(loc.id);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedCar) return;
    setIsSubmittingBooking(true);

    try {
      const appliedRate = isUpgradeApplied && selectedCar.isUpgradeOffer
        ? selectedCar.upgradeDailyRate
        : selectedCar.vipDailyRate;

      const res = await fetch("/api/client-app/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id,
          customerName: customer?.fullName,
          customerPhone: customer?.phone,
          carId: selectedCar.id,
          startDate,
          startTime,
          rentalDays,
          pickupLocationId,
          returnLocationId,
          selectedExtras,
          isClassUpgraded: isUpgradeApplied && selectedCar.isUpgradeOffer,
          upgradeFromClass: selectedCar.upgradeFromClass,
          appliedDailyRate: appliedRate,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setBookingSuccessData(json.booking);
        setSelectedCar(null);
        await fetchCarsData();
      } else {
        alert("Ошибка при создании брони: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка соединения с сервером");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Display Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
              VSL VIP Booking
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Быстрое бронирование для постоянных клиентов
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1">
            Простой выбор дат и мгновенное бронирование свободных авто
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Без сложных графиков: клиент выбирает даты, видит доступные машины и получает бесплатный апгрейд класса по программе лояльности.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs shrink-0">
          <button
            onClick={() => setIsPhoneFrameMode(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              isPhoneFrameMode
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Вид смартфона</span>
          </button>
          <button
            onClick={() => setIsPhoneFrameMode(false)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              !isPhoneFrameMode
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>На весь экран</span>
          </button>
        </div>
      </div>

      {/* Main Container: Phone Frame OR Full Width */}
      <div className={`mx-auto ${isPhoneFrameMode ? "max-w-[430px]" : "w-full max-w-5xl"}`}>
        {/* Smartphone Shell Frame */}
        <div
          className={`bg-slate-950 text-white shadow-2xl overflow-hidden relative flex flex-col ${
            isPhoneFrameMode
              ? "rounded-[44px] border-[8px] border-slate-800 min-h-[850px] max-h-[900px]"
              : "rounded-2xl border border-slate-800 min-h-[700px]"
          }`}
        >
          {/* iOS Status Bar (if phone frame) */}
          {isPhoneFrameMode && (
            <div className="bg-slate-950 px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-300 select-none z-30">
              <span className="font-semibold font-mono text-[13px]">10:30</span>
              {/* Dynamic Island */}
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center space-x-1.5 px-2 border border-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-amber-300">VIP</span>
              </div>
              <div className="flex items-center space-x-1 text-[11px]">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* APP HEADER */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 px-4 pt-3 pb-3 border-b border-slate-800/80 sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 shadow">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-white text-sm">
                      {customer?.fullName || "Постоянный VIP клиент"}
                    </span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold uppercase">
                      Gold VIP
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold block">
                    ⚡ Скидка 15% • Депозит 0 ₾ • Бесплатный апгрейд
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Поездок:</span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {customer?.tripsCount || 4} завершено
                </span>
              </div>
            </div>
          </div>

          {/* APP BODY SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 text-xs">
            {activeTab === "search" && (
              <>
                {/* 1. ULTRA-SIMPLE DATES & LOCATION SEARCH BAR (Standard Car Booking) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      <span>Параметры поездки</span>
                    </span>
                    <span className="text-[11px] font-bold text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/30">
                      {rentalDays} {rentalDays === 1 ? "сутки" : rentalDays < 5 ? "суток" : "суток"}
                    </span>
                  </div>

                  {/* City Selection Pills */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1">
                      Город получения авто:
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: "BUS", label: "🌊 Батуми" },
                        { id: "TBS", label: "🏛️ Тбилиси" },
                        { id: "KUT", label: "🌿 Кутаиси" },
                        { id: "ALL", label: "Все" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setCityFilter(c.id)}
                          className={`py-1.5 px-1 rounded-xl text-[11px] font-bold text-center transition ${
                            cityFilter === c.id
                              ? "bg-amber-500 text-slate-950 font-black shadow"
                              : "bg-slate-950 text-slate-300 border border-slate-800 hover:text-white"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Pickup Date */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center space-x-1">
                          <CalendarIcon className="w-3 h-3 text-amber-400" />
                          <span>Получение:</span>
                        </span>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="bg-transparent text-amber-300 font-mono text-[10px] font-bold focus:outline-none cursor-pointer"
                        />
                      </div>
                      <input
                        type="date"
                        value={startDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (e.target.value > endDate) {
                            setEndDate(e.target.value);
                          }
                        }}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Return Date */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                        <span className="flex items-center space-x-1">
                          <CalendarIcon className="w-3 h-3 text-cyan-400" />
                          <span>Возврат:</span>
                        </span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="bg-transparent text-cyan-300 font-mono text-[10px] font-bold focus:outline-none cursor-pointer"
                        />
                      </div>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-transparent text-white font-mono font-bold text-xs focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Car Class Quick Filter */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-0.5 text-xs">
                    {[
                      { id: "ALL", label: "Все классы" },
                      { id: "ECONOMY", label: "🚗 Эконом" },
                      { id: "COMFORT", label: "🚘 Комфорт" },
                      { id: "CROSSOVER", label: "🚙 Кроссоверы" },
                      { id: "SUV", label: "🏔️ Внедорожники" },
                      { id: "PREMIUM", label: "👑 Премиум" },
                    ].map((cls) => (
                      <button
                        key={cls.id}
                        onClick={() => setClassFilter(cls.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
                          classFilter === cls.id
                            ? "bg-slate-700 text-white font-extrabold shadow"
                            : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                        }`}
                      >
                        {cls.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. VIP CLASS UPGRADE BANNER (Повышение класса авто) */}
                <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-amber-900/50 border border-amber-500/50 rounded-2xl p-3.5 shadow-xl relative overflow-hidden">
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-md">
                      <Gift className="w-5 h-5 text-slate-950 animate-bounce" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-black text-amber-300 text-xs uppercase tracking-wide">
                          Повышение класса в подарок!
                        </span>
                        <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded">
                          VIP
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-tight">
                        Как постоянному клиенту, вам доступен <strong className="text-white">бесплатный апгрейд класса авто</strong>. Выбирайте кроссовер или комфорт по цене эконома!
                      </p>
                      <button
                        onClick={() => setOnlyUpgrades(!onlyUpgrades)}
                        className={`mt-1.5 inline-flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          onlyUpgrades
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow"
                            : "bg-slate-950 text-amber-400 border-amber-500/40 hover:text-white"
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{onlyUpgrades ? "Показаны только авто с апгрейдом" : "Показать варианты с апгрейдом"}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. AVAILABLE CARS FEED */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <span>Свободные авто на ваши даты:</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold font-mono">
                      {displayedCars.filter((c: any) => c.isAvailableForDates).length} свободно
                    </span>
                  </div>

                  {loading ? (
                    <div className="py-16 text-center text-slate-400 space-y-2">
                      <Car className="w-8 h-8 text-amber-500 animate-bounce mx-auto" />
                      <p className="text-xs font-bold text-white">Проверяем занятость на выбранные даты...</p>
                    </div>
                  ) : displayedCars.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                      Нет автомобилей, соответствующих заданным датам или фильтрам.
                    </div>
                  ) : (
                    displayedCars.map((car: any) => {
                      const cityTheme = getCityTheme(car.cityCode);
                      const isFree = car.isAvailableForDates;

                      // Price calculation
                      const dailyRate = car.isUpgradeOffer ? car.upgradeDailyRate : car.vipDailyRate;
                      const totalRentPrice = dailyRate * rentalDays;
                      const totalStandardPrice = car.standardRate * rentalDays;
                      const totalSavings = totalStandardPrice - totalRentPrice;

                      return (
                        <div
                          key={car.id}
                          className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition space-y-2.5 ${
                            isFree
                              ? "border-slate-800 hover:border-slate-700"
                              : "border-red-900/40 opacity-60"
                          }`}
                        >
                          {/* Car Image with Badge Overlays */}
                          <div className="relative h-40 bg-slate-950 overflow-hidden">
                            <img
                              src={car.imageUrl}
                              alt={`${car.brand} ${car.model}`}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/50" />

                            {/* Top Badges */}
                            <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${cityTheme.badgeBg}`}
                              >
                                {cityTheme.icon} {car.cityName}
                              </span>

                              {/* Upgrade Badge if available */}
                              {car.isUpgradeOffer && isFree && (
                                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2 py-0.5 rounded-md text-[10px] font-black shadow flex items-center space-x-1">
                                  <Sparkles className="w-3 h-3" />
                                  <span>Апгрейд до {car.carClass}</span>
                                </span>
                              )}
                            </div>

                            {/* Live availability badge */}
                            <div className="absolute top-2.5 right-2.5">
                              {isFree ? (
                                <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 shadow">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Свободен</span>
                                </span>
                              ) : (
                                <span className="bg-red-950/90 text-red-300 border border-red-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                  {car.availableFromText}
                                </span>
                              )}
                            </div>

                            {/* Car title on image bottom */}
                            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                              <div>
                                <h4 className="font-black text-white text-base leading-tight">
                                  {car.brand} {car.model}
                                </h4>
                                <span className="text-[10px] font-mono text-amber-300">
                                  {car.plateNumber} • {car.year} г. • {car.carClass}
                                </span>
                              </div>
                              <span className="text-[10px] bg-slate-900/90 px-2 py-0.5 rounded text-slate-300 border border-slate-700 font-semibold">
                                {car.transmission}
                              </span>
                            </div>
                          </div>

                          {/* Specs & Pricing */}
                          <div className="px-3 pb-3 space-y-2.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Двигатель: {car.engineVolume}</span>
                              <span>•</span>
                              <span>Топливо: {car.fuelType}</span>
                              <span>•</span>
                              <span>Бак: {car.currentFuelPerc}%</span>
                            </div>

                            {/* Upgrade savings highlight */}
                            {car.isUpgradeOffer && isFree && (
                              <div className="bg-amber-950/50 border border-amber-500/30 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-[10px]">
                                <span className="text-amber-200 font-medium">
                                  🎁 Класс {car.carClass} по цене {car.upgradeFromClass}
                                </span>
                                <span className="text-emerald-400 font-bold">
                                  Экономия: {totalSavings} ₾
                                </span>
                              </div>
                            )}

                            {/* Price Bar & Booking Action */}
                            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-baseline space-x-1.5">
                                  <span className="text-base font-black text-amber-400 font-mono">
                                    {dailyRate} ₾
                                  </span>
                                  <span className="text-[10px] text-slate-500 line-through font-mono">
                                    {car.standardRate} ₾
                                  </span>
                                  <span className="text-[10px] text-slate-400">/ сутки</span>
                                </div>
                                <span className="text-[10px] text-emerald-400 font-bold block">
                                  Итого за {rentalDays} дн: {totalRentPrice} ₾
                                </span>
                              </div>

                              {isFree ? (
                                <button
                                  onClick={() => handleOpenBooking(car)}
                                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow transition active:scale-95 shrink-0"
                                >
                                  <span>Забронировать</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="px-3 py-2 bg-slate-800 text-slate-500 rounded-xl text-xs font-bold cursor-not-allowed shrink-0"
                                >
                                  Занят
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}

            {/* TAB 2: MY TRIPS (МОИ ПОЕЗДКИ) */}
            {activeTab === "my_trips" && (
              <div className="space-y-3">
                <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider block">
                  Активные и завершенные аренды:
                </span>

                {customer?.activeBookings?.length > 0 ? (
                  customer.activeBookings.map((trip: any) => (
                    <div
                      key={trip.id}
                      className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2 shadow-lg"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold uppercase">
                            Активная поездка
                          </span>
                          <h4 className="font-bold text-white text-sm mt-1">
                            {trip.car?.brand} {trip.car?.model} ({trip.car?.plateNumber})
                          </h4>
                        </div>
                        <span className="font-mono text-xs text-amber-400 font-black">
                          {trip.totalAmount} ₾
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 space-y-1">
                        <div>Даты: с {new Date(trip.startDate).toLocaleDateString("ru-RU")} по {new Date(trip.endDate).toLocaleDateString("ru-RU")}</div>
                        <div>Маршрут: {trip.pickupLocation?.name} ➔ {trip.returnLocation?.name}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
                    Нет активных поездок на данный момент.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: VIP PERKS (ПРИВИЛЕГИИ ЛОЯЛЬНОСТИ) */}
            {activeTab === "vip_perks" && (
              <div className="space-y-3">
                <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider block">
                  Ваши персональные привилегии постоянного клиента:
                </span>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-start space-x-3">
                    <Gift className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-xs">Бесплатный апгрейд класса авто</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Возможность бронировать кроссовер или комфорт по тарифу эконома при наличии свободных авто.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-start space-x-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-xs">Аренда без залога (0 ₾ Депозит)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Для проверенных постоянных клиентов гарантийный депозит полностью отменён.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-start space-x-3">
                    <Percent className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-xs">Персональная скидка 15%</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Постоянная скидка автоматически включена в стоимость всех автомобилей автопарка.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-start space-x-3">
                    <Zap className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white text-xs">Мгновенная выдача за 2 минуты</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Все документы уже внесены в систему. При получении нужно только сверить пробег и забрать ключи.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM NAVIGATION BAR */}
          <div className="bg-slate-900/95 border-t border-slate-800/80 px-6 py-2.5 flex items-center justify-around select-none">
            <button
              onClick={() => setActiveTab("search")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "search" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Car className="w-5 h-5" />
              <span className="text-[10px]">Бронирование</span>
            </button>

            <button
              onClick={() => setActiveTab("my_trips")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "my_trips" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
              <span className="text-[10px]">Мои поездки</span>
            </button>

            <button
              onClick={() => setActiveTab("vip_perks")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "vip_perks" ? "text-amber-400 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              <Crown className="w-5 h-5" />
              <span className="text-[10px]">Привилегии</span>
            </button>
          </div>
        </div>
      </div>

      {/* FAST 1-CLICK BOOKING MODAL */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">
                  Быстрое бронирование автомобиля
                </h3>
              </div>
              <button
                onClick={() => setSelectedCar(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto text-xs">
              {/* Selected Car Card */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center space-x-3">
                <img
                  src={selectedCar.imageUrl}
                  alt={selectedCar.model}
                  className="w-20 h-14 object-cover rounded-lg shrink-0 border border-slate-800"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-white text-sm truncate">
                    {selectedCar.brand} {selectedCar.model}
                  </h4>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {selectedCar.plateNumber} • {selectedCar.year} г. • {selectedCar.carClass}
                  </div>
                  <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                    Дислокация: {selectedCar.cityName}
                  </div>
                </div>
              </div>

              {/* VIP Upgrade Toggle */}
              {selectedCar.isUpgradeOffer && (
                <div className="bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/60 p-3 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-300 text-xs flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Бесплатный апгрейд класса</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={isUpgradeApplied}
                      onChange={(e) => setIsUpgradeApplied(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <p className="text-[10px] text-slate-300">
                    {isUpgradeApplied
                      ? `Применен апгрейд с класса ${selectedCar.upgradeFromClass} до ${selectedCar.carClass}. Вы экономите ${(selectedCar.standardRate - selectedCar.upgradeDailyRate) * rentalDays} ₾!`
                      : "Вы можете активировать бесплатное повышение класса прямо сейчас."}
                  </p>
                </div>
              )}

              {/* Trip Dates Summary */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 text-[10px] block">Получение:</span>
                  <span className="font-bold text-white font-mono">{startDate} в {startTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Возврат:</span>
                  <span className="font-bold text-white font-mono">{endDate} в {endTime}</span>
                </div>
              </div>

              {/* Pickup & Return Locations */}
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Место получения:
                  </label>
                  <select
                    value={pickupLocationId}
                    onChange={(e) => setPickupLocationId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city?.nameRu})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    Место возврата:
                  </label>
                  <select
                    value={returnLocationId}
                    onChange={(e) => setReturnLocationId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.city?.nameRu})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Тариф за сутки:</span>
                  <span className="font-mono font-bold text-white">
                    {isUpgradeApplied && selectedCar.isUpgradeOffer
                      ? `${selectedCar.upgradeDailyRate} ₾ (со скидкой апгрейда)`
                      : `${selectedCar.vipDailyRate} ₾`}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Дней аренды:</span>
                  <span className="font-mono text-white">{rentalDays} дн.</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Гарантийный депозит:</span>
                  <span className="font-bold text-emerald-400">0 ₾ (VIP клиент)</span>
                </div>
                <div className="border-t border-slate-800 pt-1.5 flex justify-between items-baseline">
                  <span className="font-bold text-white text-xs">Итого к оплате:</span>
                  <span className="font-black text-amber-400 text-base font-mono">
                    {(isUpgradeApplied && selectedCar.isUpgradeOffer ? selectedCar.upgradeDailyRate : selectedCar.vipDailyRate) * rentalDays} ₾
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                onClick={() => setSelectedCar(null)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition text-xs"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={isSubmittingBooking}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>{isSubmittingBooking ? "Оформляем..." : "Подтвердить бронь"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOOKING SUCCESS MODAL */}
      {bookingSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/60 w-full max-w-md rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                Бронь подтверждена
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                № {bookingSuccessData.bookingNumber}
              </h3>
              <p className="text-xs text-slate-300">
                Автомобиль <strong className="text-white">{bookingSuccessData.carName}</strong> зарезервирован на ваше имя.
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
              <div>📍 Место выдачи: <strong className="text-white">{bookingSuccessData.pickupLocationName}</strong></div>
              <div>📅 Дата: <strong className="text-amber-400 font-mono">{startDate} в {startTime}</strong></div>
              <div>💰 Сумма к оплате: <strong className="text-emerald-400 font-mono">{bookingSuccessData.totalAmount} ₾</strong> (без залога)</div>
            </div>

            <p className="text-[11px] text-slate-400">
              Машина будет вымыта и подготовлена к вашему приезду. Менеджер уже получил уведомление.
            </p>

            <button
              onClick={() => setBookingSuccessData(null)}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black rounded-xl shadow-lg transition active:scale-95 text-xs"
            >
              Отлично, спасибо!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
