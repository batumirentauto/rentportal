import React, { useState } from "react";
import {
  Clock,
  MapPin,
  Car,
  User,
  Phone,
  MessageCircle,
  FileText,
  Key,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Package,
  Check,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  X,
} from "lucide-react";
import { ReturnWizardModal } from "./ReturnWizardModal";
import { ManagerTasksSection } from "./ManagerTasksSection";

interface MorningScheduleProps {
  bookings: any[];
  onOpenContract: (booking: any) => void;
  onOpenHandover: (booking: any) => void;
  onToggleWash: (bookingId: string, currentStatus: string) => void;
  unreadCount: number;
  onDismissNotification: (bookingId?: string) => void;
  onRefreshData?: () => void;
}

export const MorningSchedule: React.FC<MorningScheduleProps> = ({
  bookings,
  onOpenContract,
  onOpenHandover,
  onToggleWash,
  unreadCount,
  onDismissNotification,
  onRefreshData,
}) => {
  const [selectedReturnBooking, setSelectedReturnBooking] = useState<any | null>(null);
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);

  // Morning statistics
  const totalToday = bookings.length;
  const activeCount = bookings.filter((b) => b.status === "ACTIVE").length;
  const needsWashCount = bookings.filter((b) => b.car.washStatus === "NEEDS_WASH").length;
  const newDaytimeCount = bookings.filter((b) => b.isAddedDuringDay).length;

  const threeHoursAgoMs = Date.now() - 3 * 60 * 60 * 1000;
  const overdueBookings = bookings.filter((b) => {
    return (
      b.status !== "ACTIVE" &&
      b.status !== "COMPLETED" &&
      b.status !== "CANCELLED" &&
      !b.actualHandoverAt &&
      !b.overdueDecision &&
      new Date(b.startDate).getTime() <= threeHoursAgoMs
    );
  });

  const handleOverdueAction = async (bookingId: string, decision: "CANCEL" | "KEEP", notes?: string) => {
    setDecisionLoadingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/overdue-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      const data = await res.json();
      if (data.success) {
        if (onRefreshData) onRefreshData();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении решения");
    } finally {
      setDecisionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ⚠️ CRITICAL BANNER: CLIENT NO-SHOW OVER 3 HOURS */}
      {overdueBookings.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950 via-red-900 to-rose-900 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-white animate-pulse">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="p-3 bg-rose-600 rounded-xl flex-shrink-0 shadow-lg">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-rose-200">
                  ⚠️ Внимание! Неявка клиента более 3 часов ({overdueBookings.length} брони)
                </span>
                <span className="bg-rose-500 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                  Требуется решение
                </span>
              </div>
              <p className="text-xs text-rose-200/90 mt-1">
                Время выдачи наступило более 3 часов назад, но факт выдачи не внесен менеджером. Необходимо решить: <strong>оставляем ли мы эту бронь или снимаем с автомобиля</strong>, чтобы освободить его для других клиентов.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Notification Banner for Daytime Bookings */}
      {unreadCount > 0 && (
        <div className="bg-gradient-to-r from-red-900/90 via-red-800 to-amber-900 border-2 border-red-500 rounded-2xl p-4 sm:p-5 shadow-2xl animate-bounce-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2.5 bg-red-600 rounded-xl flex-shrink-0 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base">
                  🔔 Внимание! Поступила новая бронь в течение дня
                </span>
                <span className="bg-red-500 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">
                  +{unreadCount} Новая
                </span>
              </div>
              <p className="text-xs text-red-200 mt-0.5">
                К утреннему расписанию до 09:00 добавлена новая срочная выдача. Проверьте готовность машины и документы!
              </p>
            </div>
          </div>
          <button
            onClick={() => onDismissNotification()}
            className="self-end sm:self-center px-4 py-2 bg-white text-red-950 font-bold text-xs rounded-xl shadow hover:bg-red-50 transition active:scale-95 flex items-center space-x-1.5 whitespace-nowrap"
          >
            <Check className="w-4 h-4" />
            <span>Принял в работу</span>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block font-medium">Выдач в плане:</span>
          <div className="text-2xl font-black text-white mt-1">{totalToday}</div>
          <span className="text-[10px] text-slate-500">Запланировано на смену</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block font-medium">Требуют мойки:</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{needsWashCount}</div>
          <span className="text-[10px] text-amber-500/80">Проверьте перед выдачей</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block font-medium">Выдано клиентам:</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{activeCount}</div>
          <span className="text-[10px] text-emerald-500/80">В поездке по Грузии</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
          <span className="text-slate-400 text-xs block font-medium">Новых за день:</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{newDaytimeCount}</div>
          <span className="text-[10px] text-rose-400/80">Поступили после 09:00</span>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
            <span>График выдач автомобилей</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
              {bookings.length} броней
            </span>
          </h3>
          <span className="text-xs text-slate-400">
            Города: Тбилиси (TBS) • Батуми (BUS) • Кутаиси (KUT)
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Car className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="font-bold text-white">Выдач в выбранном городе нет</p>
            <p className="text-xs text-slate-500 mt-1">Выберите другой филиал или переключите фильтр на «Все города»</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {bookings.map((booking) => {
              const startDate = new Date(booking.startDate);
              const timeFormatted = startDate.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const dateFormatted = startDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
              });

              const endDate = new Date(booking.endDate);
              const returnTimeFormatted = endDate.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const returnDateFormatted = endDate.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
              });

              const isHandedOver = booking.status === "ACTIVE";
              const isOverdueNoShow =
                !isHandedOver &&
                booking.status !== "CANCELLED" &&
                !booking.overdueDecision &&
                startDate.getTime() <= threeHoursAgoMs;

              const actualHandoverTime = booking.actualHandoverAt || booking.handoverReport?.handedOverAt
                ? new Date(booking.actualHandoverAt || booking.handoverReport?.handedOverAt).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;
              const isNeedsWash = booking.car.washStatus === "NEEDS_WASH";
              const isWashing = booking.car.washStatus === "WASHING";

              return (
                <div
                  key={booking.id}
                  className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-lg hover:border-slate-700 ${
                    isOverdueNoShow
                      ? "border-rose-500/90 bg-rose-950/20 ring-2 ring-rose-500/80 shadow-rose-950/50"
                      : isHandedOver
                      ? "border-emerald-500/40 bg-emerald-950/10"
                      : booking.isAddedDuringDay && !booking.notifiedManager
                      ? "border-red-500/80 bg-red-950/20 ring-1 ring-red-500"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Time, City, Car */}
                    <div className="space-y-3 flex-1">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Pickup Time */}
                        <span className="flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-lg font-bold font-mono">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Выдача: {timeFormatted}</span>
                          <span className="text-[10px] text-amber-400/70 ml-1">({dateFormatted})</span>
                        </span>

                        {/* Return Time */}
                        <span className="flex items-center space-x-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs px-2.5 py-1 rounded-lg font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Возврат: {booking.handoverReport?.expectedReturnTime || returnTimeFormatted}</span>
                          <span className="text-[10px] text-slate-500 ml-1">({returnDateFormatted})</span>
                        </span>

                        <span className="bg-slate-800 text-slate-200 border border-slate-700 text-xs px-2.5 py-1 rounded-lg font-bold">
                          {booking.car.city.nameRu} ({booking.car.city.code})
                        </span>

                        <span className="font-mono text-xs text-slate-400">
                          № {booking.bookingNumber}
                        </span>

                        {booking.isAddedDuringDay && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                            + Новая бронь днем
                          </span>
                        )}

                        {booking.isSelfServiceBooking && (
                          <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                            <span>📱 VIP Самобронь</span>
                          </span>
                        )}

                        {isHandedOver ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>
                              Выдан в {actualHandoverTime || timeFormatted} (В поездке)
                            </span>
                          </span>
                        ) : isOverdueNoShow ? (
                          <span className="bg-rose-600 text-white border border-rose-400 text-xs px-2.5 py-1 rounded-lg font-black flex items-center space-x-1.5 animate-pulse shadow-md">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>⚠️ Неявка клиента (&gt;3 ч)</span>
                          </span>
                        ) : (
                          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs px-2.5 py-1 rounded-lg font-semibold">
                            Ожидает выдачи
                          </span>
                        )}
                      </div>

                      {/* Car Details & Wash Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                            <Car className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-white text-base">
                                {booking.car.brand} {booking.car.model}
                              </h4>
                              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded font-mono text-amber-400 font-bold border border-slate-700">
                                {booking.car.plateNumber}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400">
                              {booking.car.year} г. • {booking.car.transmission} • {booking.car.fuelType} • Пробег: {booking.car.currentMileage.toLocaleString()} км
                            </p>
                          </div>
                        </div>

                        {/* Wash Status Badge & Switch */}
                        <div className="flex items-center space-x-2 self-start sm:self-center">
                          <button
                            onClick={() =>
                              onToggleWash(
                                booking.id,
                                isNeedsWash ? "CLEAN" : "NEEDS_WASH"
                              )
                            }
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                              isNeedsWash
                                ? "bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/40"
                                : isWashing
                                ? "bg-blue-950/40 border-blue-500/60 text-blue-300"
                                : "bg-emerald-950/40 border-emerald-500/60 text-emerald-300"
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>
                              {isNeedsWash
                                ? "Требует мойки"
                                : isWashing
                                ? "На мойке..."
                                : "Чистая ✓"}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Pickup Place & Customer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex items-center space-x-1.5 text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-slate-200">
                              {booking.pickupType === "AIRPORT" ? "Аэропорт (Доставка)" : "База / Офис"}:
                            </span>
                          </div>
                          <p className="text-white font-medium pl-5">
                            {booking.pickupLocation.name}
                          </p>
                          {booking.pickupAddress && (
                            <p className="text-slate-400 pl-5 text-[11px]">
                              {booking.pickupAddress}
                            </p>
                          )}
                        </div>

                        <div className="space-y-1 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800">
                          <div className="flex items-center space-x-1.5 text-slate-400">
                            <User className="w-3.5 h-3.5 text-amber-400" />
                            <span className="font-bold text-slate-200">Клиент:</span>
                            <span className="text-white font-semibold">{booking.customer.fullName}</span>
                          </div>
                          <div className="flex items-center space-x-3 pl-5 text-[11px]">
                            <span className="text-slate-300">{booking.customer.phone}</span>
                            {booking.customer.whatsapp && (
                              <a
                                href={`https://wa.me/${booking.customer.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline flex items-center space-x-1 font-medium"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                          <p className="text-slate-400 pl-5 text-[10px]">
                            Паспорт: {booking.customer.passportNumber} | Права: {booking.customer.driverLicenseNumber}
                          </p>
                        </div>
                      </div>

                      {/* ⚠️ Decision Panel for Overdue No-Show */}
                      {isOverdueNoShow && (
                        <div className="bg-rose-950/70 border-2 border-rose-500 rounded-xl p-3.5 space-y-2.5 text-white shadow-lg animate-in fade-in duration-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="text-xs font-black text-rose-200 uppercase flex items-center space-x-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
                              <span>Клиент не пришел более 3 часов! Выдача не зафиксирована.</span>
                            </span>
                            <span className="text-[11px] text-rose-300 font-bold font-mono">
                              Оставляем или снимаем бронь?
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-rose-500/40">
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Снять бронь № ${booking.bookingNumber} с авто ${booking.car.brand} ${booking.car.model}? Автомобиль сразу станет свободным для других клиентов.`
                                  )
                                ) {
                                  handleOverdueAction(
                                    booking.id,
                                    "CANCEL",
                                    "Снято менеджером: неявка клиента более 3 часов"
                                  );
                                }
                              }}
                              disabled={decisionLoadingId === booking.id}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black shadow transition active:scale-95 flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Снять бронь с авто</span>
                            </button>

                            <button
                              onClick={() => {
                                const note =
                                  prompt(
                                    "Укажите причину сохранения брони (например: 'Клиент подтвердил, задерживается самолет'):",
                                    "Клиент задерживается"
                                  ) || "Клиент задерживается";
                                handleOverdueAction(booking.id, "KEEP", note);
                              }}
                              disabled={decisionLoadingId === booking.id}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black shadow transition active:scale-95 flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Оставить бронь (Клиент в пути)</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Extras Needed */}
                      {booking.extras && booking.extras.length > 0 && (
                        <div className="flex items-center space-x-2 text-xs bg-slate-800/20 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-semibold text-slate-400">Доп. оборудование:</span>
                          <span className="text-white">
                            {booking.extras.map((e: any) => `${e.name} (${e.quantity} шт)`).join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Financials & Action Buttons */}
                    <div className="lg:w-64 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-5 space-y-4">
                      {/* Price box */}
                      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-slate-400">Сумма заказа:</span>
                          <span className="text-xl font-black text-amber-400 font-mono">
                            ${booking.totalAmount}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                          <span>Аренда ({booking.rentalDays} дн):</span>
                          <span>${booking.rentalTotal}</span>
                        </div>
                        {booking.deliveryFee > 0 && (
                          <div className="flex justify-between text-[11px] text-slate-400">
                            <span>Доставка:</span>
                            <span>${booking.deliveryFee}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] text-emerald-400 font-medium pt-1 mt-1 border-t border-slate-800">
                          <span>Депозит (залог):</span>
                          <span>${booking.depositAmount}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        {/* Contract button */}
                        <button
                          onClick={() => onOpenContract(booking)}
                          className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700 transition"
                        >
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span>Договор (Печать)</span>
                        </button>

                        {/* Handover Wizard Button */}
                        {!isHandedOver ? (
                          <button
                            onClick={() => onOpenHandover(booking)}
                            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95"
                          >
                            <Key className="w-4 h-4" />
                            <span>Выдать авто (Чек-лист)</span>
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="w-full py-1.5 px-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Выдан (В поездке)</span>
                            </div>
                            <button
                              onClick={() => setSelectedReturnBooking(booking)}
                              className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950/40 transition active:scale-95"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span>Принять возврат (Чек-лист)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📋 Задачи от руководителя на смену */}
      <div className="pt-4 border-t border-slate-800">
        <ManagerTasksSection role="MANAGER" onRefreshParent={onRefreshData} />
      </div>

      {/* Return Wizard Modal */}
      {selectedReturnBooking && (
        <ReturnWizardModal
          booking={selectedReturnBooking}
          onClose={() => setSelectedReturnBooking(null)}
          onCompleted={() => {
            setSelectedReturnBooking(null);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
};
