"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Calendar,
  Clock,
  Car as CarIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Zap,
  MapPin,
  Sparkles,
  ArrowRight,
  Filter,
} from "lucide-react";

interface AvailabilitySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookCar: (carId: string, startDate: string, rentalDays: number) => void;
  onJumpTimeline: (dateStr: string) => void;
  currentCity?: string;
}

export const AvailabilitySearchModal: React.FC<AvailabilitySearchModalProps> = ({
  isOpen,
  onClose,
  onBookCar,
  onJumpTimeline,
  currentCity = "ALL",
}) => {
  // Dates
  const [startDate, setStartDate] = useState<string>("2026-12-27");
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endDate, setEndDate] = useState<string>("2027-01-05");
  const [returnTime, setReturnTime] = useState<string>("10:00");
  const [cityFilter, setCityFilter] = useState<string>(currentCity);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [carsData, setCarsData] = useState<any[]>([]);
  const [copied, setCopied] = useState<boolean>(false);

  // Compute total rental days
  const rentalDays = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffMs = e.getTime() - s.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  }, [startDate, endDate]);

  // Fetch fleet timeline data for the chosen range
  const checkAvailability = async () => {
    setLoading(true);
    try {
      const daysToFetch = Math.max(rentalDays + 3, 14);
      const res = await fetch(
        `/api/fleet/timeline?startDate=${startDate}&days=${daysToFetch}&city=${cityFilter}`
      );
      const json = await res.json();
      if (json.success && json.cars) {
        setCarsData(json.cars);
      }
    } catch (e) {
      console.error("Availability check failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkAvailability();
    }
  }, [isOpen, startDate, endDate, cityFilter]);

  // Determine availability of each car
  const { availableCars, occupiedCars } = useMemo(() => {
    const startReq = new Date(`${startDate}T${startTime}:00`).getTime();
    const endReq = new Date(`${endDate}T${returnTime}:00`).getTime();

    const available: any[] = [];
    const occupied: any[] = [];

    carsData.forEach((car) => {
      // Check search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          car.brand?.toLowerCase().includes(q) ||
          car.model?.toLowerCase().includes(q) ||
          car.plateNumber?.toLowerCase().includes(q);
        if (!matches) return;
      }

      // Check Stop block
      if (car.isStopBlocked) {
        occupied.push({
          ...car,
          occupancyReason: `Автомобиль на СТОПе: ${car.stopReason || "Техническое обслуживание"}`,
        });
        return;
      }

      // Check availability blocks
      const overlappingBlock = car.availabilityBlocks?.find((b: any) => {
        if (!b.isActive) return false;
        const bStart = new Date(b.startDate).getTime();
        const bEnd = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return startReq < bEnd && endReq > bStart;
      });

      if (overlappingBlock) {
        occupied.push({
          ...car,
          occupancyReason: `Блокировка доступности: ${overlappingBlock.reasonText || overlappingBlock.reason || "Сервис / ТО"}`,
        });
        return;
      }

      // Check bookings overlap
      const overlappingBooking = car.bookings?.find((b: any) => {
        if (b.status === "CANCELLED") return false;
        const bStart = new Date(b.startDate).getTime();
        const bEnd = new Date(b.endDate).getTime();
        return startReq < bEnd && endReq > bStart;
      });

      if (overlappingBooking) {
        const bEndDate = new Date(overlappingBooking.endDate).toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "short",
        });
        occupied.push({
          ...car,
          occupancyReason: `Занят в аренде у клиента (${overlappingBooking.customer?.fullName || "Клиент"}). Освобождается ${bEndDate}`,
          freeFromDate: bEndDate,
        });
        return;
      }

      // If no overlap, car is free!
      const dailyRate = car.clientStandardDailyRate || car.dailyRate || 80;
      const totalAmount = dailyRate * rentalDays;

      available.push({
        ...car,
        calculatedDailyRate: dailyRate,
        calculatedTotal: totalAmount,
      });
    });

    return { availableCars: available, occupiedCars: occupied };
  }, [carsData, startDate, startTime, endDate, returnTime, searchQuery, rentalDays]);

  // Copy WhatsApp offer text
  const handleCopyWhatsAppOffer = () => {
    const sDateRu = new Date(startDate).toLocaleDateString("ru-RU");
    const eDateRu = new Date(endDate).toLocaleDateString("ru-RU");

    let text = `Здравствуйте! 🚗 Подборка свободных автомобилей на ваши даты:\n`;
    text += `📅 Период аренды: ${sDateRu} — ${eDateRu} (${rentalDays} сут.)\n`;
    text += `📍 Город: ${cityFilter === "BUS" ? "Батуми" : cityFilter === "TBS" ? "Тбилиси" : cityFilter === "KUT" ? "Кутаиси" : "Грузия"}\n\n`;

    if (availableCars.length === 0) {
      text += `К сожалению, на указанные даты все автомобили заняты. Пожалуйста, уточните другие даты.\n`;
    } else {
      text += `Доступные автомобили:\n`;
      availableCars.slice(0, 6).forEach((car, idx) => {
        text += `${idx + 1}. ${car.brand} ${car.model} (${car.year} г., АКПП) — ${car.calculatedDailyRate} ₾/сутки (Итого за ${rentalDays} дн.: ${car.calculatedTotal} ₾)\n`;
      });
      text += `\n🛡️ В стоимость включено: полное страхование КАСКО, без ограничения пробега по всей Грузии.\n`;
      text += `💰 Возвратный гарантийный залог: 300 ₾ (возвращается сразу при сдаче авто).\n`;
      text += `📑 Для бронирования требуется только паспорт и водительское удостоверение (стаж от 2 лет).\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92dvh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30 uppercase">
                  Подбор свободных авто
                </span>
                <span className="text-xs text-slate-400">
                  Поиск на любую дату (включая декабрь и праздники)
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Проверка доступности автопарка на даты
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date & Filter Selection Row */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* Start Date */}
            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Дата начала (получение):</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:border-amber-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                <span>Дата возврата:</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:border-amber-500"
              />
            </div>

            {/* City */}
            <div>
              <label className="text-slate-400 text-[11px] font-semibold block mb-1 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Город:</span>
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-bold"
              >
                <option value="ALL">Все города (Грузия)</option>
                <option value="TBS">🏛️ Тбилиси (TBS)</option>
                <option value="BUS">🌊 Батуми (BUS)</option>
                <option value="KUT">🌿 Кутаиси (KUT)</option>
              </select>
            </div>

            {/* Rental Summary Badge */}
            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-2.5 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] text-amber-300 font-bold uppercase">Срок аренды:</span>
              <span className="text-base font-black text-white font-mono mt-0.5">
                {rentalDays} {rentalDays === 1 ? "сутки" : rentalDays < 5 ? "суток" : "дней"}
              </span>
            </div>
          </div>

          {/* Quick Date Presets & Filter search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-slate-400 font-medium">Быстрые даты:</span>
              <button
                type="button"
                onClick={() => {
                  setStartDate("2026-12-27");
                  setEndDate("2027-01-05");
                }}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold transition flex items-center space-x-1"
              >
                <span>🎄 Новый Год (27 дек - 5 янв)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStartDate("2026-12-30");
                  setEndDate("2027-01-08");
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition"
              >
                <span>🎅 Каникулы (30 дек - 8 янв)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const d1 = new Date();
                  const d2 = new Date();
                  d2.setDate(d2.getDate() + 7);
                  setStartDate(d1.toISOString().split("T")[0]);
                  setEndDate(d2.toISOString().split("T")[0]);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition"
              >
                <span>Ближайшая неделя</span>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Фильтр по модели..."
                className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 w-44"
              />
            </div>
          </div>
        </div>

        {/* Results Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CarIcon className="w-8 h-8 animate-bounce text-amber-400 mx-auto" />
              <p className="font-bold text-white text-sm">Проверяем занятость автопарка на выбранные даты...</p>
            </div>
          ) : (
            <>
              {/* AVAILABLE CARS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <h3 className="font-extrabold text-sm text-white">
                      Свободные автомобили на весь период ({availableCars.length})
                    </h3>
                  </div>

                  {availableCars.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppOffer}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 active:scale-95"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Скопировано в буфер!" : "Скопировать КП для WhatsApp"}</span>
                    </button>
                  )}
                </div>

                {availableCars.length === 0 ? (
                  <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-xs">
                    На даты с {startDate} по {endDate} все автомобили заняты. Попробуйте сдвинуть даты или выбрать другой город.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {availableCars.map((car) => (
                      <div
                        key={car.id}
                        className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between space-y-3 group"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-white text-sm">
                                {car.brand} {car.model}
                              </span>
                              <span className="text-xs text-slate-400">({car.year} г.)</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="font-mono text-[11px] font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                                {car.plateNumber}
                              </span>
                              <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                                <MapPin className="w-3 h-3 text-cyan-400" />
                                <span>{car.city?.nameRu || "Батуми"}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400 font-mono block">
                              {car.calculatedDailyRate} ₾ <span className="text-[10px] font-normal text-slate-400">/ день</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              Итого: <strong>{car.calculatedTotal} ₾</strong> ({rentalDays} дн.)
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              onJumpTimeline(startDate);
                              onClose();
                            }}
                            className="text-[11px] text-slate-400 hover:text-white flex items-center space-x-1 transition"
                          >
                            <span>Показать на шахматке</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onBookCar(car.id, startDate, rentalDays);
                              onClose();
                            }}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition active:scale-95 flex items-center space-x-1"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Забронировать</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* OCCUPIED CARS SECTION */}
              {occupiedCars.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                      Занятые автомобили на эти даты ({occupiedCars.length})
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {occupiedCars.map((car) => (
                      <div
                        key={car.id}
                        className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-slate-300 block">
                            {car.brand} {car.model} ({car.plateNumber})
                          </span>
                          <span className="text-[10px] text-red-400 block truncate max-w-[280px]">
                            {car.occupancyReason}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onJumpTimeline(startDate);
                            onClose();
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline ml-2 shrink-0"
                        >
                          Шахматка
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-400 text-[11px] flex items-center space-x-2">
            <span>💡 Подборка учитывает все действующие брони, выезды и регламентные блокировки СТО.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs transition"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
