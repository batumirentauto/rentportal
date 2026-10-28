import React, { useState } from "react";
import {
  X,
  Bell,
  ShieldAlert,
  Car,
  Calendar,
  Clock,
  CheckCircle2,
  Check,
  Phone,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  XCircle,
  MessageCircle,
  Key,
  Sparkles,
} from "lucide-react";
import { StopUnblockModal } from "./StopUnblockModal";

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: any[];
  stopBlockedCars: any[];
  overdueBookings?: any[];
  pendingTasks?: any[];
  onDismissAll: () => void;
  onRefreshData: () => void;
  onOpenHandover?: (booking: any) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  stopBlockedCars = [],
  overdueBookings = [],
  pendingTasks = [],
  onDismissAll,
  onRefreshData,
  onOpenHandover,
}) => {
  const [selectedCarForUnblock, setSelectedCarForUnblock] = useState<any | null>(null);
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOverdueDecision = async (
    bookingId: string,
    decision: "CANCEL" | "KEEP",
    notes?: string
  ) => {
    setProcessingBookingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/overdue-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
      } else {
        alert("Ошибка: " + (data.error || "Не удалось сохранить решение"));
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении решения");
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleTaskAction = async (taskId: string, action: string) => {
    try {
      const notes = action === "COMPLETE" ? prompt("Отчет о выполнении задачи:", "Выполнено менеджером") || "Выполнено" : undefined;
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, completionNotes: notes }),
      });
      const data = await res.json();
      if (data.success) {
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalAlerts =
    notifications.length + stopBlockedCars.length + overdueBookings.length + pendingTasks.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-slate-800 rounded-xl text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">
                  Центр оперативных уведомлений
                </h2>
                {totalAlerts > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    {totalAlerts}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Неявка клиентов (&gt;3 ч), СТОП-блокировки и дневные брони
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-1">
          {/* 1. ⚠️ CRITICAL: CLIENT NO-SHOW OVERDUE BY 3+ HOURS (ОСТАВЛЯЕМ ИЛИ СНИМАЕМ?) */}
          {overdueBookings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-400 text-xs font-black uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>
                    Неявка клиента &gt;3 ч (Оставляем или снимаем?): {overdueBookings.length}
                  </span>
                </div>
                <span className="text-[10px] text-rose-300/80 font-medium">
                  Выдача не зафиксирована
                </span>
              </div>

              {overdueBookings.map((b) => {
                const startDateObj = new Date(b.startDate);
                const hoursAgo = Math.max(
                  0,
                  Math.round(
                    ((Date.now() - startDateObj.getTime()) / (1000 * 60 * 60)) * 10
                  ) / 10
                );
                const isProcessing = processingBookingId === b.id;

                return (
                  <div
                    key={b.id}
                    className="bg-gradient-to-br from-rose-950/40 via-slate-950 to-rose-950/20 border-2 border-rose-500/80 rounded-2xl p-4 space-y-3 shadow-xl"
                  >
                    {/* Top Row: Booking info & Elapsed time */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/30 pb-2.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black bg-rose-500 text-white px-2 py-0.5 rounded shadow">
                          № {b.bookingNumber}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                          {b.car.plateNumber}
                        </span>
                        <span className="text-xs text-white font-extrabold">
                          {b.car.brand} {b.car.model}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-xs text-rose-300 font-mono font-bold bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-500/40 self-start sm:self-auto">
                        <Clock className="w-3.5 h-3.5 text-rose-400" />
                        <span>Прошло {hoursAgo} ч. от плана</span>
                      </div>
                    </div>

                    {/* Middle details: Customer & Planned Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Клиент:</span>
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>{b.customer.fullName}</span>
                          <span className="text-slate-400 font-mono font-normal">
                            ({b.customer.phone})
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[11px]">
                          Назначенное время выдачи:
                        </span>
                        <span className="text-amber-300 font-mono font-bold">
                          {startDateObj.toLocaleDateString("ru-RU")},{" "}
                          {startDateObj.toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          ({b.pickupLocation?.name || b.car.city.nameRu})
                        </span>
                      </div>
                    </div>

                    <div className="bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/30 text-xs text-rose-100 flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                      <p className="leading-snug">
                        Клиент не явился за автомобилем спустя более 3 часов после запланированного времени. Менеджер выдачу не зафиксировал. <strong>Оставляем бронь за клиентом или снимаем с автомобиля?</strong>
                      </p>
                    </div>

                    {/* Decision Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {/* Customer contact helper */}
                      <div className="flex items-center space-x-2">
                        {b.customer.whatsapp && (
                          <a
                            href={`https://wa.me/${b.customer.whatsapp.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center space-x-1 border border-slate-700 transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        <a
                          href={`tel:${b.customer.phone}`}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1 border border-slate-700 transition"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Позвонить</span>
                        </a>
                      </div>

                      {/* Main Decisions */}
                      <div className="flex items-center space-x-2">
                        {/* ❌ Снять с автомобиля */}
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            if (
                              confirm(
                                `Вы уверены, что хотите СНЯТЬ бронь № ${b.bookingNumber} с автомобиля ${b.car.brand} ${b.car.model}? Автомобиль станет доступен для других клиентов.`
                              )
                            ) {
                              handleOverdueDecision(
                                b.id,
                                "CANCEL",
                                "Клиент не пришел за авто через 3+ часа. Бронь снята менеджером."
                              );
                            }
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Снять с авто</span>
                        </button>

                        {/* ⏳ Оставить бронь */}
                        <button
                          disabled={isProcessing}
                          onClick={() => {
                            const notes =
                              prompt(
                                "Укажите причину сохранения брони (например: 'Клиент подтвердил в чате, рейс задержан на 2 часа'):",
                                "Клиент задерживается, бронь сохранена"
                              ) || "Клиент задерживается";
                            handleOverdueDecision(b.id, "KEEP", notes);
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Оставить бронь</span>
                        </button>

                        {/* Handover shortcut if client just arrived */}
                        {onOpenHandover && (
                          <button
                            onClick={() => {
                              onOpenHandover(b);
                              onClose();
                            }}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center space-x-1"
                            title="Клиент только что пришел, оформить выдачу прямо сейчас"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Выдать</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ⚡ TASKS ASSIGNED BY EXECUTIVE */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Поручения от руководителя ({pendingTasks.length}):</span>
              </div>

              {pendingTasks.map((t) => (
                <div
                  key={t.id}
                  className="bg-indigo-950/25 border-2 border-indigo-500/70 rounded-2xl p-4 space-y-2.5 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        {t.priority === "URGENT" && (
                          <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                            🔴 Срочно
                          </span>
                        )}
                        <h4 className="font-extrabold text-white text-sm">
                          {t.title}
                        </h4>
                      </div>
                      {t.description && (
                        <p className="text-xs text-indigo-200 mt-1 leading-snug">
                          {t.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                        {t.car && (
                          <span className="text-amber-400 font-mono font-bold">
                            {t.car.brand} {t.car.model} ({t.car.plateNumber})
                          </span>
                        )}
                        {t.assignedToName && (
                          <span>• Кому: <strong>{t.assignedToName}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      {t.status === "PENDING" && (
                        <button
                          onClick={() => handleTaskAction(t.id, "ACCEPT")}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition"
                        >
                          Взять в работу
                        </button>
                      )}
                      <button
                        onClick={() => handleTaskAction(t.id, "COMPLETE")}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Выполнено</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. CRITICAL: CARS ON STOP (ТЕХОСМОТР / СТРАХОВКА) */}
          {stopBlockedCars.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-2 text-red-400 text-xs font-black uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                <span>Автомобили на СТОПе (Блокировка выдачи): {stopBlockedCars.length}</span>
              </div>

              {stopBlockedCars.map((car) => (
                <div
                  key={car.id}
                  className="bg-red-950/30 border-2 border-red-500/80 rounded-2xl p-4 space-y-2.5 shadow-lg shadow-red-950/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-black text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                          {car.plateNumber}
                        </span>
                        <h4 className="font-extrabold text-white text-sm">
                          {car.brand} {car.model}
                        </h4>
                        <span className="text-xs text-slate-400">({car.city?.nameRu})</span>
                      </div>
                      <p className="text-xs text-red-200 mt-1 leading-relaxed font-semibold">
                        ⛔ {car.stopReason || "Истек техосмотр или страховка"}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedCarForUnblock(car)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Продлить и снять со СТОПа</span>
                    </button>
                  </div>

                  {car.stopNotes && (
                    <div className="text-[11px] text-slate-300 bg-black/40 p-2 rounded-xl border border-red-500/20 italic">
                      {car.stopNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 3. URGENT DAYTIME BOOKINGS */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-black uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span>Новые брони в течение дня: {notifications.length}</span>
            </div>

            {totalAlerts === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-white">Все уведомления прочитаны</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Просроченных броней, автомобилей на стопе и новых дневных заявок нет
                </p>
              </div>
            ) : (
              notifications.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-300">
                        № {booking.bookingNumber}
                      </span>
                      <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        Новая бронь
                      </span>
                      {booking.isSelfServiceBooking && (
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.2 rounded-full font-bold">
                          📱 VIP Клиент
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      ${booking.totalAmount} USD
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-white">
                        {booking.car?.brand} {booking.car?.model}
                      </strong>
                      <span className="text-slate-400 ml-1 font-mono">
                        ({booking.car?.plateNumber})
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Клиент: <strong>{booking.customer?.fullName}</strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
          <button
            onClick={onDismissAll}
            className="text-slate-400 hover:text-white transition font-medium"
          >
            Пометить дневные брони как прочитанные
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Unblock Modal */}
      {selectedCarForUnblock && (
        <StopUnblockModal
          isOpen={!!selectedCarForUnblock}
          onClose={() => setSelectedCarForUnblock(null)}
          car={selectedCarForUnblock}
          onUnblocked={() => {
            onRefreshData();
            onClose();
          }}
        />
      )}
    </div>
  );
};
