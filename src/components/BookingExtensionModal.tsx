"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Banknote,
  Coins,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { calculateExtraHoursFee } from "@/lib/extra-hours";

interface BookingExtensionModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onExtensionCompleted: (updatedBooking?: any) => void;
}

export const BookingExtensionModal: React.FC<BookingExtensionModalProps> = ({
  booking,
  isOpen,
  onClose,
  onExtensionCompleted,
}) => {
  const [extensionType, setExtensionType] = useState<"DAYS" | "HOURS">("DAYS");
  const [extraDays, setExtraDays] = useState<number>(1);
  const [extraHours, setExtraHours] = useState<number>(2);

  const [dailyRate, setDailyRate] = useState<number | string>(booking?.dailyRate || 50);
  const [extensionAmount, setExtensionAmount] = useState<number | string>(
    (booking?.dailyRate || 50) * 1
  );

  const [paymentTiming, setPaymentTiming] = useState<"IMMEDIATE" | "ON_RETURN">("IMMEDIATE");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [managerName, setManagerName] = useState<string>("Менеджер смены");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen && booking) {
      const baseDailyRate = booking.dailyRate || 50;
      setExtensionType("DAYS");
      setExtraDays(1);
      setExtraHours(2);
      setDailyRate(baseDailyRate);
      setExtensionAmount(baseDailyRate * 1);
      setPaymentTiming("IMMEDIATE");
      setPaymentMethod("BANK_TRANSFER");
      setNotes("");
      setErrorMessage("");
      setSuccessMessage("");

      // Загружаем финансовые счета / кассы
      fetch("/api/finance")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
            if (data.accounts.length > 0) {
              const cityId = booking?.car?.cityId;
              const matching = data.accounts.find(
                (a: any) =>
                  a.bankName === "TBC" ||
                  (a.cityId === cityId && a.type === "CASH")
              );
              setSelectedAccountId(matching ? matching.id : data.accounts[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading accounts:", err));
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const currentEndDate = new Date(booking.endDate);

  // Расчет новой даты возврата
  const calculatedNewEndDate = new Date(currentEndDate);
  if (extensionType === "DAYS") {
    calculatedNewEndDate.setDate(calculatedNewEndDate.getDate() + (Number(extraDays) || 0));
  } else {
    calculatedNewEndDate.setHours(calculatedNewEndDate.getHours() + (Number(extraHours) || 0));
  }

  // Расчет для доп. часов
  const hoursCalc = calculateExtraHoursFee(
    Number(extraHours) || 0,
    Number(dailyRate) || booking.dailyRate || 50
  );

  // Хэндлеры для взаимозаменяемости тарифа и суммы в днях:
  const handleDaysChange = (days: number) => {
    const d = Math.max(1, days);
    setExtraDays(d);
    const rate = Number(dailyRate) || 0;
    setExtensionAmount(Math.round(d * rate));
  };

  const handleDailyRateChange = (val: number | string) => {
    const rate = val === "" ? 0 : Number(val);
    setDailyRate(val);
    const d = Number(extraDays) || 1;
    setExtensionAmount(Math.round(d * rate));
  };

  const handleExtensionAmountChange = (val: number | string) => {
    const amt = val === "" ? 0 : Number(val);
    setExtensionAmount(val);
    const d = Number(extraDays) || 1;
    if (d > 0) {
      setDailyRate(Math.round((amt / d) * 10) / 10);
    }
  };

  const handleHoursChange = (hours: number) => {
    const h = Math.max(1, hours);
    setExtraHours(h);
    const calc = calculateExtraHoursFee(h, Number(dailyRate) || booking.dailyRate || 50);
    setExtensionAmount(calc.totalFee);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const amt = Number(extensionAmount);
    if (amt < 0) {
      setErrorMessage("Сумма к доплате не может быть отрицательной");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: extensionType,
          extraDays: extensionType === "DAYS" ? extraDays : 0,
          extraHours: extensionType === "HOURS" ? extraHours : 0,
          newEndDate: calculatedNewEndDate.toISOString(),
          dailyRate: Number(dailyRate),
          amount: amt,
          paymentTiming,
          paymentMethod: paymentTiming === "IMMEDIATE" ? paymentMethod : null,
          accountId: paymentTiming === "IMMEDIATE" ? selectedAccountId : null,
          managerName,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Не удалось продлить бронь");
      }

      setSuccessMessage(
        `Аренда успешно продлена до ${calculatedNewEndDate.toLocaleDateString("ru-RU")} ${calculatedNewEndDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} (+${amt} ₾)`
      );

      setTimeout(() => {
        onExtensionCompleted(data.booking);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка сервера");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 md:p-6 text-white my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Продление аренды выданного авто</h3>
              <p className="text-xs text-slate-400">
                Бронь № <strong className="text-amber-300 font-mono">{booking.bookingNumber}</strong> •{" "}
                {booking.car?.brand} {booking.car?.model} ({booking.car?.plateNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current booking info */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Клиент:</span>
            <span className="font-bold text-white truncate block">{booking.customer?.fullName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Текущий возврат:</span>
            <span className="font-mono font-bold text-amber-300">
              {currentEndDate.toLocaleDateString("ru-RU")}{" "}
              {currentEndDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px]">Текущий тариф / дни:</span>
            <span className="font-mono font-bold text-slate-200">
              {booking.dailyRate} ₾/день ({booking.rentalDays} дн.)
            </span>
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Extension type selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setExtensionType("DAYS");
                const rate = Number(dailyRate) || booking.dailyRate || 50;
                setExtensionAmount(extraDays * rate);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                extensionType === "DAYS"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Продление на дни (сутки)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setExtensionType("HOURS");
                const calc = calculateExtraHoursFee(
                  extraHours,
                  Number(dailyRate) || booking.dailyRate || 50
                );
                setExtensionAmount(calc.totalFee);
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
                extensionType === "HOURS"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Продление на часы (доп. часы)</span>
            </button>
          </div>

          {/* DAYS MODE */}
          {extensionType === "DAYS" && (
            <div className="space-y-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Количество дополнительных дней:
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[1, 2, 3, 5, 7].map((d) => (
                    <button
                      type="button"
                      key={d}
                      onClick={() => handleDaysChange(d)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        extraDays === d
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      +{d} {d === 1 ? "день" : d < 5 ? "дня" : "дней"}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Или указать вручную:</span>
                  <input
                    type="number"
                    min="1"
                    value={extraDays}
                    onChange={(e) => handleDaysChange(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-white text-xs"
                  />
                  <span className="text-xs text-slate-400">дн.</span>
                </div>
              </div>

              {/* Interchangeable: Daily Rate and Extension Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-850">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Тариф за сутки продления (₾/день):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">₾</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={dailyRate === 0 ? "" : dailyRate}
                      onChange={(e) => handleDailyRateChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 pl-8 pr-3 text-white font-mono font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Можно скорректировать на доп. срок
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-amber-300 block mb-1">
                    Сумма к доплате за продление (₾):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">₾</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={extensionAmount === 0 ? "" : extensionAmount}
                      onChange={(e) => handleExtensionAmountChange(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-900 border-2 border-amber-500/70 rounded-xl py-1.5 pl-8 pr-3 text-amber-300 font-mono font-black text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <span className="text-[10px] text-amber-400/90 block mt-0.5">
                    Любая договорная сумма, согласованная с клиентом
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* HOURS MODE */}
          {extensionType === "HOURS" && (
            <div className="space-y-3 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Продление на количество часов:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => handleHoursChange(h)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition text-center ${
                        extraHours === h
                          ? "bg-amber-500/20 border-amber-500 text-amber-300"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {h === 8 ? ">7 ч" : `+${h} ч`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rule Explanation Banner */}
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Тариф по регламенту:</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {hoursCalc.ratePerHour} ₾/час
                  </span>
                </div>
                <p className="text-slate-400 text-[10px]">
                  • 1-й час: <strong>БЕСПЛАТНО</strong> (0 ₾)
                  <br />
                  • Следующие 6 часов: 10 ₾/ч (при цене авто до 160 ₾), 15 ₾/ч (161–260 ₾), 20 ₾/ч (от
                  261 ₾)
                  <br />• Спустя 7 часов: начисляются полные следующие сутки ({booking.dailyRate} ₾)
                </p>
                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Итого за {extraHours} ч:</span>
                  <span className="text-amber-400 font-mono font-black text-sm">
                    {hoursCalc.totalFee} ₾ ({hoursCalc.explanation})
                  </span>
                </div>
              </div>

              {/* Manual fee override */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                <div>
                  <span className="text-xs font-bold text-white block">Сумма доплаты к начислению:</span>
                  <span className="text-[10px] text-amber-400/90 block">
                    Можно ввести любую согласованную с клиентом сумму
                  </span>
                </div>
                <div className="relative w-32">
                  <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono font-bold text-xs">
                    ₾
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={extensionAmount}
                    onChange={(e) => setExtensionAmount(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-amber-500/80 rounded-lg py-1 pl-6 pr-2 text-right font-mono font-black text-amber-300 text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* New return date preview badge */}
          <div className="p-3 bg-gradient-to-r from-blue-950/40 via-amber-950/20 to-slate-950 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center space-x-1.5">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Новый срок возврата автомобиля:</span>
            </span>
            <div className="text-right">
              <span className="font-mono font-black text-amber-300 text-sm block">
                {calculatedNewEndDate.toLocaleDateString("ru-RU")}{" "}
                {calculatedNewEndDate.toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-[10px] text-blue-300 font-mono">
                (+{extensionType === "DAYS" ? `${extraDays} дн.` : `${extraHours} ч.`})
              </span>
            </div>
          </div>

          {/* PAYMENT TIMING (КОГДА ОПЛАТА) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              Когда и как производится оплата:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTiming("IMMEDIATE")}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  paymentTiming === "IMMEDIATE"
                    ? "bg-emerald-950/40 border-emerald-500 text-white shadow"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    paymentTiming === "IMMEDIATE"
                      ? "border-emerald-400 bg-emerald-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {paymentTiming === "IMMEDIATE" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <strong className="text-xs block text-emerald-300">
                    Оплата сейчас (в момент продления)
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Переводом по звонку, наличными в офис или криптой
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentTiming("ON_RETURN")}
                className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  paymentTiming === "ON_RETURN"
                    ? "bg-cyan-950/40 border-cyan-500 text-white shadow"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    paymentTiming === "ON_RETURN"
                      ? "border-cyan-400 bg-cyan-500 text-slate-950"
                      : "border-slate-600"
                  }`}
                >
                  {paymentTiming === "ON_RETURN" && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <strong className="text-xs block text-cyan-300">
                    Оплатят при возврате автомобиля
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Сумма будет включена в окончательный расчет при сдаче
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Method and Account (only if IMMEDIATE) */}
          {paymentTiming === "IMMEDIATE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Способ получения оплаты:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_TRANSFER">🏦 Перевод по звонку (TBC / BOG)</option>
                  <option value="CASH">💵 Завезли наличные в офис</option>
                  <option value="CRYPTO">🪙 Криптовалюта (USDT)</option>
                  <option value="CARD">💳 Банковская карта / эквайринг</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Зачислить в кассу / на счет:
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Без привязки к счету</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currentBalance} {acc.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Manager name & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Менеджер:
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Комментарий / Источник:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Продлил по WhatsApp, согласовано..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-xl text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Сохранение..." : `Подтвердить продление (+${extensionAmount} ₾)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
