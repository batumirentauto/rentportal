"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRightLeft, DollarSign, Wallet, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TransferCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransferSuccess: () => void;
  initialFromAccountId?: string;
  accounts: any[];
}

export const TransferCashModal: React.FC<TransferCashModalProps> = ({
  isOpen,
  onClose,
  onTransferSuccess,
  initialFromAccountId,
  accounts,
}) => {
  const { language } = useLanguage();
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Split accounts into cash registers vs bank/crypto
  const cashAccounts = accounts.filter((a) => a.type === "CASH");
  const bankAccounts = accounts.filter((a) => a.type === "BANK_ACCOUNT" || a.type === "CRYPTO_WALLET");

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (initialFromAccountId) {
        setFromAccountId(initialFromAccountId);
      } else if (cashAccounts.length > 0 && !fromAccountId) {
        setFromAccountId(cashAccounts[0].id);
      }
    }
  }, [isOpen, initialFromAccountId]);

  // When fromAccount changes, pick sensible default recipient
  useEffect(() => {
    if (fromAccountId && !toAccountId) {
      // Find an executive cash or first available different account
      const defaultTo = accounts.find(
        (a) => a.id !== fromAccountId && (a.name.includes("Павел") || a.name.includes("Колесников") || a.name.includes("Руководство") || a.type === "BANK_ACCOUNT")
      );
      if (defaultTo) {
        setToAccountId(defaultTo.id);
      }
    }
  }, [fromAccountId]);

  if (!isOpen) return null;

  const currentFromAcc = accounts.find((a) => a.id === fromAccountId);
  const currentToAcc = accounts.find((a) => a.id === toAccountId);
  const currentMaxBalance = currentFromAcc ? Math.max(0, currentFromAcc.currentBalance || 0) : 0;

  const handleSetMaxAmount = () => {
    if (currentMaxBalance > 0) {
      setAmount(String(currentMaxBalance));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = Number(amount);
    if (!fromAccountId || !toAccountId) {
      setError(language === "ka" ? "აირჩიეთ სალაროები" : "Выберите кассу отправителя и кассу получателя");
      return;
    }

    if (fromAccountId === toAccountId) {
      setError(language === "ka" ? "სალაროები არ უნდა ემთხვეოდეს" : "Касса списания и зачисления не могут совпадать");
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError(language === "ka" ? "მიუთითეთ სწორი თანხა" : "Укажите корректную сумму перевода (больше 0)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/finance/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: numAmount,
          notes: notes.trim() || undefined,
          senderName: currentFromAcc?.managerResponsible || currentFromAcc?.name,
          recipientName: currentToAcc?.managerResponsible || currentToAcc?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка при выполнении перевода");
      }

      setSuccessMsg(data.message || "Перевод успешно выполнен!");
      setTimeout(() => {
        onTransferSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Не удалось провести перевод средств");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {language === "ka" ? "თანხის გადატანა სალაროებს შორის" : "Перенос денег между кассами"}
              </h3>
              <p className="text-[10px] text-slate-400">
                {language === "ka" ? "ცვლის ჩაბარება, ინკასაცია ან მენეჯერებს შორის გადაცემა" : "Сдача смены руководителю, передача кассы или инкассация"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Откуда списать */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{language === "ka" ? "საიდან (გამგზავნი სალარო):" : "Откуда списать (Касса отправителя):"}</span>
              {currentFromAcc && (
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  {language === "ka" ? "ხელზე:" : "В кассе:"} {currentFromAcc.currentBalance} ₾
                </span>
              )}
            </label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
              required
            >
              <option value="" disabled>-- Выберите кассу отправителя --</option>
              <optgroup label="💵 Наличные кассы менеджеров и руководства">
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance} ₾)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏦 Банковские счета / Крипта">
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance} {acc.currency})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 2. Куда зачислить */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>{language === "ka" ? "სად ჩაირიცხოს (მიმღები):" : "Куда зачислить (Касса / Счёт получателя):"}</span>
              {currentToAcc && (
                <span className="text-[11px] font-mono text-indigo-400 font-bold">
                  {language === "ka" ? "ბალანსი:" : "Баланс:"} {currentToAcc.currentBalance} {currentToAcc.currency}
                </span>
              )}
            </label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 transition"
              required
            >
              <option value="" disabled>-- Выберите получателя --</option>
              <optgroup label="💵 Кассы руководства и менеджеров">
                {cashAccounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currentBalance} ₾)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="🏦 Банковские счета компании">
                {bankAccounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.currentBalance} {acc.currency})
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* 3. Сумма перевода */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                {language === "ka" ? "გადასარიცხი თანხა (₾):" : "Сумма перевода (₾ GEL):"}
              </label>
              {currentMaxBalance > 0 && (
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-bold transition"
                >
                  Вся сумма: {currentMaxBalance} ₾
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-10 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-500 transition"
                required
              />
              <span className="absolute right-3 top-2.5 text-slate-500 font-bold font-mono text-xs">
                GEL ₾
              </span>
            </div>

            {/* Быстрые кнопки сумм */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[50, 100, 200, 500, 1000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(String(quick))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-mono font-semibold transition"
                >
                  +{quick} ₾
                </button>
              ))}
            </div>
          </div>

          {/* 4. Комментарий / Причина */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {language === "ka" ? "კომენტარი / მიზეზი:" : "Комментарий к проводке (необязательно):"}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Например: Менеджер Женя передал наличную кассу руководителю Паше"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-slate-600 transition placeholder:text-slate-600"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-2.5 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              {language === "ka" ? "გაუქმება" : "Отмена"}
            </button>
            <button
              type="submit"
              disabled={loading || !amount || Number(amount) <= 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Проводка...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Подтвердить перевод {amount ? `${amount} ₾` : ""}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
