"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  CreditCard,
  Building2,
  Wallet,
  Coins,
  ChevronDown,
  Info,
} from "lucide-react";

interface BookingRefundModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
  onRefundCompleted: (updatedBooking?: any) => void;
}

const PRESET_REASONS = [
  "Уменьшение срока аренды (досрочный возврат)",
  "По вине автопроката (тех. неисправность / поломка)",
  "Замена автомобиля на более дешевый класс",
  "Претензия клиента / компенсация за неудобства",
  "Другая причина",
];

export const BookingRefundModal: React.FC<BookingRefundModalProps> = ({
  booking,
  isOpen,
  onClose,
  onRefundCompleted,
}) => {
  const [amount, setAmount] = useState<number | string>("");
  const [selectedPresetReason, setSelectedPresetReason] = useState<string>(PRESET_REASONS[0]);
  const [customComment, setCustomComment] = useState<string>("");
  const [method, setMethod] = useState<string>("CASH");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [managerName, setManagerName] = useState<string>("Менеджер смены");
  const [adjustBookingTotal, setAdjustBookingTotal] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setSelectedPresetReason(PRESET_REASONS[0]);
      setCustomComment("");
      setMethod("CASH");
      setAdjustBookingTotal(true);
      setErrorMessage("");
      setSuccessMessage("");

      // Загружаем финансовые счета / кассы
      fetch("/api/finance")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
            if (data.accounts.length > 0) {
              // Ищем кассу в городе бронирования или первую кассу
              const cityId = booking?.car?.cityId;
              const matchingAccount = data.accounts.find(
                (a: any) => a.cityId === cityId && a.type === "CASH"
              );
              setSelectedAccountId(matchingAccount ? matchingAccount.id : data.accounts[0].id);
            }
          }
        })
        .catch((err) => console.error("Error loading accounts:", err));
    }
  }, [isOpen, booking]);

  if (!isOpen || !booking) return null;

  const fullReason =
    selectedPresetReason === "Другая причина"
      ? customComment.trim() || "Возврат средств"
      : `${selectedPresetReason}${customComment ? ` (${customComment.trim()})` : ""}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMessage("Укажите сумму возврата больше 0");
      return;
    }

    if (numAmount > booking.totalAmount && adjustBookingTotal) {
      if (
        !confirm(
          `Сумма возврата (${numAmount} ₾) превышает текущую стоимость бронирования (${booking.totalAmount} ₾). Продолжить?`
        )
      ) {
        return;
      }
    }

    if (selectedPresetReason === "Другая причина" && !customComment.trim()) {
      setErrorMessage("Напишите подробный комментарий с причиной возврата");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          reason: selectedPresetReason,
          notes: customComment.trim() || undefined,
          method,
          accountId: selectedAccountId || undefined,
          managerName,
          adjustBookingTotal,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Не удалось оформить возврат");
      }

      setSuccessMessage(`Возврат ${numAmount} ₾ клиенту успешно зафиксирован!`);
      setTimeout(() => {
        onRefundCompleted(data.booking);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка сервера");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 text-white my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Оформление возврата клиенту</h3>
              <p className="text-xs text-slate-400">
                Бронь № <strong className="text-amber-300 font-mono">{booking.bookingNumber}</strong> •{" "}
                {booking.car?.brand} {booking.car?.model}
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

        {/* Current status banner */}
        <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">Клиент:</span>
            <span className="font-bold text-white">{booking.customer?.fullName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Текущая стоимость брони:</span>
            <span className="font-mono font-black text-amber-400 text-sm">
              {booking.totalAmount} ₾ (GEL)
            </span>
          </div>
        </div>

        {/* Error/Success alerts */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Reason presets */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Причина возврата:
            </label>
            <div className="space-y-1.5">
              {PRESET_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setSelectedPresetReason(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs border transition ${
                    selectedPresetReason === r
                      ? "bg-rose-500/20 border-rose-500 text-rose-200 font-bold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Refund amount input */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Сумма возврата клиенту:
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold font-mono">₾</span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-white font-mono font-black text-lg focus:outline-none focus:border-rose-500"
              />
              <span className="absolute right-3.5 top-3 text-slate-500 text-xs font-mono font-bold">
                GEL (лари)
              </span>
            </div>
          </div>

          {/* Comment / explanation */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Комментарий / Пояснение к возврату:
            </label>
            <textarea
              rows={2}
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Например: вернул машину на 2 дня раньше срока, перерасчет по договоренности..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
            />
          </div>

          {/* Payment Method and Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Способ выплаты:
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="CASH">💵 Наличные из кассы</option>
                <option value="TBC_BANK">🏦 Перевод TBC Bank</option>
                <option value="BOG_BANK">🏦 Перевод Bank of Georgia</option>
                <option value="CARD_POS">💳 Возврат на банковскую карту</option>
                <option value="CRYPTO">🪙 Крипта (USDT)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Списать с кассы / счета:
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">Без списания со счета</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance} {acc.currency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Manager name */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Ответственный менеджер:
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Adjust booking total checkbox */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start space-x-2.5">
            <input
              type="checkbox"
              id="adjustTotal"
              checked={adjustBookingTotal}
              onChange={(e) => setAdjustBookingTotal(e.target.checked)}
              className="mt-0.5 rounded bg-slate-900 border-slate-700 text-rose-500 focus:ring-rose-500"
            />
            <label htmlFor="adjustTotal" className="text-xs text-slate-300 cursor-pointer">
              <strong>Скорректировать общую сумму бронирования</strong>
              <span className="block text-[11px] text-slate-400 mt-0.5">
                Уменьшит общую стоимость бронирования на {amount || 0} ₾, чтобы в аналитике и отчетах
                сохранялся точный баланс.
              </span>
            </label>
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
              className="px-5 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Проводка..." : "Подтвердить возврат средств"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
