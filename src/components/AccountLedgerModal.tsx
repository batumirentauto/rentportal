"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Car,
  User,
  ShieldAlert,
  Fuel,
  Sparkles,
  Wrench,
  Landmark,
  Coins,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Wallet,
} from "lucide-react";

interface AccountLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName?: string;
}

type PeriodType = "all" | "today" | "yesterday" | "month";

export const AccountLedgerModal: React.FC<AccountLedgerModalProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName,
}) => {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [period, setPeriod] = useState<PeriodType>("all");
  const [activeTab, setActiveTab] = useState<"all" | "inflow" | "outflow" | "transfers">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchLedger = async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/accounts/${accountId}/ledger?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data);
      } else {
        console.error("Ledger error:", data.error);
      }
    } catch (e) {
      console.error("Error loading account ledger:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      fetchLedger();
    }
  }, [isOpen, accountId, period]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const account = ledgerData?.account;
  const summary = ledgerData?.summary;
  const rawEntries: any[] = ledgerData?.ledgerEntries || [];

  // Filter entries by tab and search
  const filteredEntries = useMemo(() => {
    return rawEntries.filter((item) => {
      // Tab filter
      if (activeTab === "inflow" && item.direction !== "INFLOW") return false;
      if (activeTab === "outflow" && item.direction !== "OUTFLOW") return false;
      if (activeTab === "transfers" && !item.direction.startsWith("TRANSFER")) return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const carText = item.car ? `${item.car.brand} ${item.car.model} ${item.car.plateNumber}`.toLowerCase() : "";
      const bookingText = item.booking ? item.booking.bookingNumber.toLowerCase() : "";
      const custText = item.customer ? `${item.customer.fullName} ${item.customer.phone}`.toLowerCase() : "";
      const descText = (item.description || "").toLowerCase();
      const titleText = (item.title || "").toLowerCase();
      const catText = (item.category || "").toLowerCase();
      const mgrText = (item.managerName || "").toLowerCase();

      return (
        carText.includes(q) ||
        bookingText.includes(q) ||
        custText.includes(q) ||
        descText.includes(q) ||
        titleText.includes(q) ||
        catText.includes(q) ||
        mgrText.includes(q)
      );
    });
  }, [rawEntries, activeTab, searchQuery]);

  if (!isOpen || !mounted) return null;

  const currencySymbol = account?.currency === "USD" ? "$" : "₾";

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              {account?.type === "CASH" ? (
                <Coins className="w-5 h-5 text-amber-400" />
              ) : account?.type === "CRYPTO_WALLET" ? (
                <Wallet className="w-5 h-5 text-emerald-400" />
              ) : (
                <Landmark className="w-5 h-5 text-cyan-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {account?.type === "CASH"
                    ? "💵 Наличная касса"
                    : account?.type === "CRYPTO_WALLET"
                    ? "🪙 Криптокошелек"
                    : "🏦 Банковский счёт"}
                </span>
                {account?.cityName && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {account.cityName}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate mt-0.5">
                {account?.name || accountName || "Выписка по источнику"}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {account?.managerResponsible ? (
                  <span>
                    Ответственный: <strong className="text-white">{account.managerResponsible}</strong>
                  </span>
                ) : (
                  <span>Учёт и аудит движения денежных средств</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={fetchLedger}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 border border-slate-700/60"
              title="Обновить данные"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 transition active:scale-95 border border-slate-700/60"
              title="Закрыть окно"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Summary / Balance Banner */}
        <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-slate-800/80 shrink-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Текущий остаток (Баланс) */}
            <div className="bg-slate-900 border-2 border-emerald-500/40 p-3 sm:p-3.5 rounded-2xl shadow-lg relative overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                💰 Текущий остаток (Баланс)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-xl sm:text-2xl font-black text-white font-mono">
                  {summary ? summary.currentBalance.toLocaleString() : "..."}
                </span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {currencySymbol} {account?.currency}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Фактически на руках / на счёте
              </span>
            </div>

            {/* Поступило (Доходы) */}
            <div className="bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>Поступило (+)</span>
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono">
                  +{summary ? summary.totalInflow.toLocaleString() : 0}
                </span>
                <span className="text-xs text-slate-400 font-mono">{currencySymbol}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Аренда: {summary?.inflowByCategory?.rental || 0} {currencySymbol} • Залоги: {summary?.inflowByCategory?.deposit || 0} {currencySymbol}
              </span>
            </div>

            {/* Израсходовано (Расходы) */}
            <div className="bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <TrendingDown className="w-3 h-3 text-rose-400" />
                <span>Расход (-)</span>
              </span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-lg sm:text-xl font-black text-rose-400 font-mono">
                  -{summary ? summary.totalOutflow.toLocaleString() : 0}
                </span>
                <span className="text-xs text-slate-400 font-mono">{currencySymbol}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                Штрафы: {summary?.expensesByCategory?.fines || 0} {currencySymbol} • Топливо: {summary?.expensesByCategory?.fuel || 0} {currencySymbol}
              </span>
            </div>

            {/* Межкассовые переводы */}
            <div className="bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl shadow">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
                <span>Переводы (⇄)</span>
              </span>
              <div className="flex items-baseline space-x-1 mt-1 font-mono text-xs font-bold">
                <span className="text-cyan-400">
                  +{summary ? summary.totalTransfersReceived.toLocaleString() : 0}
                </span>
                <span className="text-slate-500">/</span>
                <span className="text-amber-400">
                  -{summary ? summary.totalTransfersSent.toLocaleString() : 0}
                </span>
                <span className="text-slate-400">{currencySymbol}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Сдано / принято между кассами
              </span>
            </div>
          </div>

          {/* Detailed Categories Breakdown Badges */}
          {summary && (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">
                Разбивка расходов:
              </span>
              {summary.expensesByCategory?.fines > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono">
                  🚨 Штрафы: -{summary.expensesByCategory.fines} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.investorPayout > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  👑 Инвесторам: -{summary.expensesByCategory.investorPayout} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.fuel > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  ⛽ Топливо: -{summary.expensesByCategory.fuel} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.washing > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
                  ✨ Мойки: -{summary.expensesByCategory.washing} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.maintenance > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                  🔧 ТО/Сервис: -{summary.expensesByCategory.maintenance} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.salary > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                  💼 Зарплаты: -{summary.expensesByCategory.salary} {currencySymbol}
                </span>
              )}
              {summary.expensesByCategory?.other > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  📦 Прочее: -{summary.expensesByCategory.other} {currencySymbol}
                </span>
              )}
            </div>
          )}

          {/* Controls: Periods & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
            {/* Period buttons */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(
                [
                  { id: "all", label: "Всё время" },
                  { id: "today", label: "Сегодня" },
                  { id: "yesterday", label: "Вчера" },
                  { id: "month", label: "Этот месяц" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    period === p.id
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px] sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Поиск по авто, госномеру, брони..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition"
              />
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="px-4 sm:px-5 bg-slate-900/90 border-b border-slate-800 flex items-center space-x-2 shrink-0 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition whitespace-nowrap ${
              activeTab === "all"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Все операции ({rawEntries.length})
          </button>
          <button
            onClick={() => setActiveTab("inflow")}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === "inflow"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Поступления ({summary?.counts?.inflowCount || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("outflow")}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === "outflow"
                ? "border-rose-400 text-rose-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Расходы ({summary?.counts?.outflowCount || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("transfers")}
            className={`py-2.5 px-3 border-b-2 text-xs font-bold transition whitespace-nowrap flex items-center space-x-1.5 ${
              activeTab === "transfers"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Переводы ({summary?.counts?.transfersCount || 0})</span>
          </button>
        </div>

        {/* Transactions List (Feed) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">Загрузка выписки по счёту / кассе...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-bold text-slate-400">
                За выбранный период операций по данному счёту не найдено
              </p>
              <p className="text-[11px] text-slate-500">
                Попробуйте выбрать другой период («Всё время») или сбросить фильтр поиска.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isInflow = entry.direction === "INFLOW";
              const isOutflow = entry.direction === "OUTFLOW";
              const isTransferIn = entry.direction === "TRANSFER_IN";
              const isTransferOut = entry.direction === "TRANSFER_OUT";

              const d = new Date(entry.date);
              const dateStr = d.toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              const timeStr = d.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={entry.id}
                  className="bg-slate-950/80 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-3 sm:p-3.5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  {/* Left Column: Icon & Details */}
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
                        isInflow
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isOutflow
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : isTransferIn
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}
                    >
                      {isInflow && "+"}
                      {isOutflow && "-"}
                      {isTransferIn && "↙"}
                      {isTransferOut && "↗"}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${
                            isInflow
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                              : isOutflow
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                              : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                          }`}
                        >
                          {entry.category}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400">
                          {dateStr} в {timeStr}
                        </span>

                        {entry.booking && (
                          <span className="text-[10px] font-mono font-bold bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-slate-700">
                            № {entry.booking.bookingNumber}
                          </span>
                        )}
                      </div>

                      {/* Main Title & Car Info */}
                      <div className="text-xs font-bold text-white flex items-center space-x-1.5 flex-wrap">
                        {entry.car && (
                          <span className="flex items-center space-x-1 text-slate-200">
                            <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>
                              {entry.car.brand} {entry.car.model}
                            </span>
                            <span className="text-amber-400 font-mono text-[11px]">
                              ({entry.car.plateNumber})
                            </span>
                          </span>
                        )}

                        {entry.customer && (
                          <span className="text-slate-400 font-normal">
                            • Клиент: <strong className="text-slate-300">{entry.customer.fullName}</strong>
                            {entry.customer.phone && (
                              <span className="text-[10px] font-mono ml-1">({entry.customer.phone})</span>
                            )}
                          </span>
                        )}

                        {entry.owner && (
                          <span className="text-slate-400 font-normal">
                            • Инвестор: <strong className="text-slate-300">{entry.owner.fullName}</strong>
                          </span>
                        )}
                      </div>

                      {/* Description & Notes */}
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {entry.description}
                      </p>

                      {/* Manager info */}
                      <div className="text-[10px] text-slate-500 flex items-center space-x-1 font-mono pt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Менеджер: {entry.managerName || "—"}</span>
                        {entry.method && (
                          <span>• Способ: {entry.method}</span>
                        )}
                        {entry.changeOnReturn > 0 && (
                          <span className="text-amber-400 font-bold">
                            • Сдача при сдаче: {entry.changeOnReturn} ₾
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Amount */}
                  <div className="text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 flex sm:flex-col justify-between items-center sm:items-end">
                    <span className="text-[10px] text-slate-400 sm:hidden">Сумма:</span>
                    <div>
                      <span
                        className={`text-base sm:text-lg font-black font-mono ${
                          isInflow || isTransferIn ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isInflow || isTransferIn ? "+" : "-"}
                        {Number(entry.amount).toLocaleString()} {currencySymbol}
                      </span>
                      <span className="block text-[9px] text-slate-400 font-mono uppercase">
                        {entry.currency}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="font-mono text-[11px]">
            Всего записей: <strong className="text-white">{filteredEntries.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition active:scale-95 border border-slate-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
