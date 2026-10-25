import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  Smartphone,
  Calendar,
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
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const LoyalClientMobileApp: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [isPhoneFrameMode, setIsPhoneFrameMode] = useState<boolean>(true);

  // App Inner Tab
  const [activeTab, setActiveTab] = useState<"fleet" | "my_trips" | "vip" | "concierge">("fleet");

  // Booking Modal State
  const [selectedCar, setSelectedCar] = useState<any | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<string>("11:00");
  const [rentalDays, setRentalDays] = useState<number>(3);
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [returnLocationId, setReturnLocationId] = useState<string>("");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [bookingSuccessData, setBookingSuccessData] = useState<any | null>(null);

  const fetchCarsData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client-app/cars?city=${cityFilter}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.locations?.length > 0 && !pickupLocationId) {
          setPickupLocationId(json.locations[0].id);
          setReturnLocationId(json.locations[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCarsData();
  }, [cityFilter]);

  const handleOpenBooking = (car: any) => {
    setSelectedCar(car);
    // Auto set location by car city
    const loc = data?.locations?.find((l: any) => l.city?.code === car.cityCode) || data?.locations?.[0];
    if (loc) {
      setPickupLocationId(loc.id);
      setReturnLocationId(loc.id);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedCar || !data?.customer?.id) return;
    setIsSubmittingBooking(true);

    try {
      const res = await fetch("/api/client-app/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: data.customer.id,
          carId: selectedCar.id,
          startDate,
          startTime,
          rentalDays,
          pickupLocationId,
          returnLocationId,
          selectedExtras,
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
      alert("Ошибка сети при отправке запроса");
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const customer = data?.customer;
  const cars = data?.cars || [];
  const locations = data?.locations || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Display Mode Toggle */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
              VSL VIP Mobile App
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Мобильное приложение для постоянных клиентов
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">
            Самостоятельное бронирование свободных авто в реальном времени
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Клиент видит живую доступность машин по всей Грузии (Тбилиси, Батуми, Кутаиси) и бронирует без менеджеров и документов за 30 секунд.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setIsPhoneFrameMode(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              isPhoneFrameMode
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Смартфон (iPhone)</span>
          </button>
          <button
            onClick={() => setIsPhoneFrameMode(false)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
              !isPhoneFrameMode
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>Полный экран</span>
          </button>
        </div>
      </div>

      {/* Main Container: Phone Frame OR Full Width */}
      <div className={`mx-auto ${isPhoneFrameMode ? "max-w-[430px]" : "w-full"}`}>
        {/* Smartphone Shell Frame */}
        <div
          className={`bg-slate-950 text-white rounded-[44px] shadow-2xl border-[8px] border-slate-800 overflow-hidden relative flex flex-col ${
            isPhoneFrameMode ? "min-h-[840px] max-h-[890px]" : "rounded-3xl border border-slate-800 min-h-[600px]"
          }`}
        >
          {/* iOS Status Bar (if phone frame) */}
          {isPhoneFrameMode && (
            <div className="bg-slate-950 px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-300 select-none z-30">
              <span className="font-semibold font-mono text-[13px]">12:45</span>
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
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 px-4 pt-3 pb-3 border-b border-slate-800/80 sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-black text-slate-950 shadow">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-white text-sm">
                      {customer?.fullName || "Алексей Смирнов"}
                    </span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-extrabold uppercase">
                      Gold VIP
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold block">
                    ⚡ Персональная скидка {customer?.discountPercent || 10}% применена
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Поездок:</span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {customer?.tripsCount || 5} завершено
                </span>
              </div>
            </div>

            {/* City Selector Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pt-3 pb-1 text-xs">
              {[
                { id: "ALL", label: "Все города" },
                { id: "TBS", label: "🏛️ Тбилиси" },
                { id: "BUS", label: "🌊 Батуми" },
                { id: "KUT", label: "🌿 Кутаиси" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCityFilter(c.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                    cityFilter === c.id
                      ? "bg-amber-500 text-slate-950 font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* APP BODY SCROLLABLE */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
            {/* TAB 1: FLEET FEED (СВОБОДНЫЕ АВТОМОБИЛИ) */}
            {activeTab === "fleet" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider">
                    Свободные авто в реальном времени:
                  </span>
                  <span className="text-[10px] text-slate-500">{cars.length} найдено</span>
                </div>

                {cars.map((car: any) => {
                  const cityTheme = getCityTheme(car.cityCode);
                  return (
                    <div
                      key={car.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition hover:border-slate-700 space-y-2.5"
                    >
                      {/* Car Image with Status Badge Overlay */}
                      <div className="relative h-36 bg-slate-950 overflow-hidden">
                        <img
                          src={car.imageUrl}
                          alt={`${car.brand} ${car.model}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${cityTheme.badgeBg}`}
                          >
                            {cityTheme.icon} {car.cityName}
                          </span>
                        </div>

                        {/* Live availability pill */}
                        <div className="absolute top-2.5 right-2.5">
                          {car.isAvailableNow ? (
                            <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 shadow">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Свободен сейчас</span>
                            </span>
                          ) : (
                            <span className="bg-slate-900/90 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              С {car.availableFromDate}
                            </span>
                          )}
                        </div>

                        {/* Car title on image */}
                        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                          <div>
                            <h4 className="font-black text-white text-base leading-tight">
                              {car.brand} {car.model}
                            </h4>
                            <span className="text-[10px] font-mono text-amber-300">
                              {car.plateNumber} • {car.year} г.
                            </span>
                          </div>
                          <span className="text-[10px] bg-slate-900/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {car.transmission}
                          </span>
                        </div>
                      </div>

                      {/* Specs and Pricing */}
                      <div className="px-3 pb-3 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Двигатель: {car.engineVolume || "2.5L"}</span>
                          <span>•</span>
                          <span>Топливо: {car.fuelType}</span>
                          <span>•</span>
                          <span>Бак: {car.currentFuelPerc}%</span>
                        </div>

                        {/* Price & Action */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <div className="flex items-baseline space-x-1.5">
                              <span className="text-base font-black text-amber-400 font-mono">
                                ${car.vipDailyRate}
                              </span>
                              <span className="text-[10px] text-slate-500 line-through font-mono">
                                ${car.baseDailyRate}
                              </span>
                              <span className="text-[10px] text-slate-400">/ сутки</span>
                            </div>
                            <span className="text-[9px] text-emerald-400 block font-semibold">
                              VIP скидка -{car.discountPercent}% включена
                            </span>
                          </div>

                          <button
                            onClick={() => handleOpenBooking(car)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow transition active:scale-95"
                          >
                            <span>Забронировать</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: MY TRIPS (МОИ ПОЕЗДКИ) */}
            {activeTab === "my_trips" && (
              <div className="space-y-3">
                <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider block">
                  Активные и завершенные аренды:
                </span>

                {customer?.activeBookings?.map((trip: any) => (
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
                        ${trip.totalAmount} USD
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-0.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Возврат:</span>
                        <span className="font-bold text-white">
                          {new Date(trip.endDate).toLocaleDateString("ru-RU")}{" "}
                          {new Date(trip.endDate).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Локация сдачи:</span>
                        <span className="text-amber-300 truncate max-w-[170px]">
                          {trip.returnLocation?.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-1">
                      <a
                        href="https://wa.me/995599123456"
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-center font-bold text-[11px] flex items-center justify-center space-x-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Продлить в WhatsApp</span>
                      </a>
                    </div>
                  </div>
                ))}

                {/* Past Trips history */}
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    История поездок ({customer?.recentBookings?.length || 0}):
                  </span>
                  {customer?.recentBookings?.map((b: any) => (
                    <div
                      key={b.id}
                      className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-white block">
                          {b.car?.brand} {b.car?.model}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(b.startDate).toLocaleDateString("ru-RU")} • {b.rentalDays} дн.
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-slate-300">${b.totalAmount}</span>
                        <span className="text-[10px] text-emerald-400 block">Завершено</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: VIP PERKS */}
            {activeTab === "vip" && (
              <div className="space-y-3.5">
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-500/40 rounded-2xl p-4 text-center space-y-1.5">
                  <Crown className="w-8 h-8 text-amber-400 mx-auto" />
                  <h4 className="font-black text-base text-white">Статус Gold VIP</h4>
                  <p className="text-xs text-amber-200">
                    Привилегии клуба постоянных гостей VSL Georgia
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Скидка -10% на все автомобили</strong>
                      <span className="text-slate-400 text-[11px]">
                        Автоматически применяется при любом бронировании в Тбилиси, Батуми и Кутаиси.
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Выдача без очереди и оформления</strong>
                      <span className="text-slate-400 text-[11px]">
                        Ваши паспорт и права уже в системе. Получение ключей за 2 минуты без очередей.
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Бесплатный 2-й водитель</strong>
                      <span className="text-slate-400 text-[11px]">
                        Вписание второго водителя в договор бесплатно для VIP гостей.
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white block">Приоритет чистоты и подачи</strong>
                      <span className="text-slate-400 text-[11px]">
                        Автомобиль готовится вне очереди с комплексной мойкой и заправкой до 100%.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: CONCIERGE SUPPORT 24/7 */}
            {activeTab === "concierge" && (
              <div className="space-y-3.5 text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <Phone className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">Служба заботы VSL</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-[260px] mx-auto">
                    Круглосуточная помощь на дорогах Грузии, консультации по маршрутам в горы и поддержка 24/7
                  </p>
                </div>

                <div className="space-y-2 pt-2 max-w-[280px] mx-auto">
                  <a
                    href="https://wa.me/995599123456"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Написать в WhatsApp</span>
                  </a>

                  <a
                    href="tel:+995599123456"
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold flex items-center justify-center space-x-2 border border-slate-700"
                  >
                    <Phone className="w-4 h-4" />
                    <span>+995 599 123 456 (Тбилиси)</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM TAB BAR (КАК В iOS / ANDROID ПРИЛОЖЕНИИ) */}
          <div className="bg-slate-950 border-t border-slate-800 px-3 py-2 flex items-center justify-around text-xs sticky bottom-0 z-30">
            <button
              onClick={() => setActiveTab("fleet")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "fleet" ? "text-amber-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Car className="w-5 h-5" />
              <span className="text-[10px]">Автопарк</span>
            </button>

            <button
              onClick={() => setActiveTab("my_trips")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "my_trips" ? "text-amber-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-[10px]">Мои поездки</span>
            </button>

            <button
              onClick={() => setActiveTab("vip")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "vip" ? "text-amber-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Crown className="w-5 h-5" />
              <span className="text-[10px]">VIP Клуб</span>
            </button>

            <button
              onClick={() => setActiveTab("concierge")}
              className={`flex flex-col items-center space-y-1 transition ${
                activeTab === "concierge" ? "text-amber-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Phone className="w-5 h-5" />
              <span className="text-[10px]">Поддержка</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: SELF-SERVICE INSTANT BOOKING SHEET */}
      {selectedCar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Самостоятельное бронирование
                </span>
                <h3 className="font-extrabold text-base text-white mt-1">
                  {selectedCar.brand} {selectedCar.model} ({selectedCar.plateNumber})
                </h3>
              </div>
              <button
                onClick={() => setSelectedCar(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Car Info */}
            <div className="flex items-center space-x-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
              <img
                src={selectedCar.imageUrl}
                alt={selectedCar.model}
                className="w-16 h-12 object-cover rounded-lg"
              />
              <div>
                <span className="font-bold text-white block">
                  {selectedCar.cityName} • {selectedCar.transmission}
                </span>
                <span className="text-amber-400 font-mono font-black text-sm">
                  ${selectedCar.vipDailyRate} USD / сутки
                </span>
                <span className="text-[10px] text-slate-400 ml-1.5">(скидка -{selectedCar.discountPercent}%)</span>
              </div>
            </div>

            {/* Dates & Duration */}
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">📅 Дата получения:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold block mb-1">⏰ Время:</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  ⏳ Дней аренды: <strong className="text-white">{rentalDays} дн.</strong>
                </label>
                <div className="flex space-x-1.5">
                  {[1, 2, 3, 5, 7, 10, 14].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRentalDays(d)}
                      className={`flex-1 py-1.5 rounded-lg font-bold font-mono transition ${
                        rentalDays === d
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-1.5 pt-1">
                <label className="text-slate-400 font-semibold block">📍 Локация получения:</label>
                <select
                  value={pickupLocationId}
                  onChange={(e) => setPickupLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-400 font-semibold block">🏁 Локация возврата (One-Way):</label>
                <select
                  value={returnLocationId}
                  onChange={(e) => setReturnLocationId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500 text-xs"
                >
                  {locations.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Total calculation */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Итого к оплате при получении:</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  ${selectedCar.vipDailyRate * rentalDays} USD
                </span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold block">✓ Без очереди</span>
                <span className="text-[10px] text-slate-500">Документы уже в базе</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCar(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition text-xs"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmittingBooking}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl font-black shadow-lg transition text-xs"
              >
                {isSubmittingBooking ? "Бронирование..." : "Подтвердить в 1 клик"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BOOKING CONFIRMATION SUCCESS */}
      {bookingSuccessData && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/60 text-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-bold">
                Бронь подтверждена!
              </span>
              <h3 className="font-black text-lg text-white mt-2">
                № {bookingSuccessData.bookingNumber}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {bookingSuccessData.carName} ({bookingSuccessData.plateNumber})
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Дата получения:</span>
                <span className="font-bold text-white">
                  {new Date(bookingSuccessData.startDate).toLocaleDateString("ru-RU")}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Срок аренды:</span>
                <span className="font-bold text-white">{bookingSuccessData.rentalDays} дн.</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Итого:</span>
                <span className="font-black text-amber-400 font-mono">
                  ${bookingSuccessData.totalAmount} USD
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Автомобиль передан на подготовку и мойку. Менеджер встретит вас в назначенное время с готовыми ключами!
            </p>

            <button
              onClick={() => setBookingSuccessData(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition text-xs shadow-lg"
            >
              Отлично, понятно
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
