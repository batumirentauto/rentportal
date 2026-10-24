import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Car,
  PieChart,
  Calendar,
  Filter,
  RefreshCw,
  Printer,
  Download,
  Building2,
  Users,
  Wallet,
  ArrowRight,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Percent,
  Clock,
  Gauge,
  Sparkles,
  ChevronDown,
  Activity,
  Layers,
  Fuel,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const ReportingAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [period, setPeriod] = useState<string>("30days");
  const [selectedCity, setSelectedCity] = useState<string>("ALL");
  const [tripType, setTripType] = useState<string>("ALL");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomDates, setShowCustomDates] = useState<boolean>(false);

  // Inner sub-tab
  const [activeSubTab, setActiveSubTab] = useState<
    "overview" | "pnl" | "fleet" | "cities" | "cashflow" | "managers"
  >("overview");

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/analytics?period=${period}&city=${selectedCity}&tripType=${tripType}`;
      if (period === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error("Error loading reporting analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, selectedCity, tripType]);

  const handleApplyCustomDates = () => {
    if (customStart && customEnd) {
      setPeriod("custom");
      fetchReports();
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  if (loading && !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-white text-base">Генерация управленческой и финансовой отчетности...</p>
        <p className="text-xs text-slate-500 mt-1">Консолидация данных по филиалам Тбилиси, Батуми и Кутаиси</p>
      </div>
    );
  }

  const { summary, pnl, cashFlow, citiesSummary, unitEconomics, managerPerformance, dailyTimeline } = data || {};

  return (
    <div className="space-y-6 text-slate-100 print:text-black">
      {/* 1. TOP HEADER & MULTI-DIMENSIONAL CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
                BI & Analytics
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Система управленческого и финансового учета
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
              <span>Сводная отчетность GEODRIVE (Грузия)</span>
            </h2>
          </div>

          {/* Export & Refresh buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-center">
            <button
              onClick={handlePrintReport}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
              title="Печать полного отчета на A4 / Экспорт в PDF"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Печать / PDF</span>
            </button>
            <button
              onClick={fetchReports}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition border border-slate-700"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Обновить</span>
            </button>
          </div>
        </div>

        {/* Multi-dimensional Slicers (Разрезы аналитики) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Dimension 1: Time Period */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Временной срез (Период):</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "today", label: "Сегодня" },
                { id: "yesterday", label: "Вчера" },
                { id: "7days", label: "7 дней" },
                { id: "30days", label: "30 дней" },
                { id: "thisMonth", label: "Этот месяц" },
                { id: "custom", label: "Свой диапазон" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPeriod(p.id);
                    if (p.id === "custom") setShowCustomDates(true);
                    else setShowCustomDates(false);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    period === p.id
                      ? "bg-amber-500 text-slate-950 font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {showCustomDates && (
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-800 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white font-mono text-[11px]"
                />
                <button
                  onClick={handleApplyCustomDates}
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded font-bold text-[11px]"
                >
                  Применить
                </button>
              </div>
            )}
          </div>

          {/* Dimension 2: City / Branch */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Географический разрез (Филиалы):</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL", label: "Все города" },
                { id: "TBS", label: "🏛️ Тбилиси" },
                { id: "BUS", label: "🌊 Батуми" },
                { id: "KUT", label: "🌿 Кутаиси" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCity(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedCity === c.id
                      ? "bg-cyan-500 text-slate-950 font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension 3: Trip Type (Local vs One-Way) */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1">
              <Repeat className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Тип поездки:</span>
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "ALL", label: "Все поездки" },
                { id: "LOCAL", label: "Локальные городские" },
                { id: "ONE_WAY", label: "⇄ One-Way (междугородние)" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTripType(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    tripType === t.id
                      ? "bg-purple-600 text-white font-black shadow"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE TOPLINE METRIC CARDS (SCORECARD) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Gross Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Валовая выручка
            </span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
              ${summary?.grossRevenueUSD.toLocaleString()} USD
            </span>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
              <span>Аренда: ${summary?.rentalRevenueUSD}</span>
              <span>•</span>
              <span className="text-purple-300 font-semibold">One-Way: ${summary?.oneWayRevenueUSD}</span>
            </div>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Расходы OPEX
            </span>
            <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-red-400 font-mono tracking-tight">
              {summary?.totalExpensesGEL.toLocaleString()} GEL
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              ≈ ${summary?.totalExpensesUSD.toLocaleString()} USD (мойка, топливо, ТО, зарплаты)
            </div>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Чистая прибыль (EBITDA)
            </span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
              ${summary?.netOperatingProfitUSD.toLocaleString()} USD
            </span>
            <div className="text-[11px] text-emerald-400/90 font-bold mt-1 flex items-center space-x-1">
              <span>Маржинальность:</span>
              <span className="bg-emerald-950 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono">
                {summary?.operatingMargin}%
              </span>
            </div>
          </div>
        </div>

        {/* Fleet Utilization Rate */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Загрузка автопарка
            </span>
            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl">
              <Gauge className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
              {summary?.fleetUtilizationRate}%
            </span>
            <div className="text-[11px] text-slate-400 mt-1">
              {summary?.totalPaidDays} оплаченных дней из {summary?.availableVehicleDays} доступных
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY FLEET EFFICIENCY INDICATORS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            RevPAC (Выручка на 1 авто)
          </span>
          <span className="text-lg font-black text-white font-mono mt-0.5 block">
            ${summary?.revPAC} USD
          </span>
          <span className="text-[10px] text-slate-500">по всему парку ({summary?.totalFleetCount} авто)</span>
        </div>

        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            ADR (Среднесуточный тариф)
          </span>
          <span className="text-lg font-black text-amber-300 font-mono mt-0.5 block">
            ${summary?.adrUSD} USD/день
          </span>
          <span className="text-[10px] text-slate-500">средний чек за 1 сутки</span>
        </div>

        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            AOV (Средний чек брони)
          </span>
          <span className="text-lg font-black text-white font-mono mt-0.5 block">
            ${summary?.aovUSD} USD
          </span>
          <span className="text-[10px] text-slate-500">срок: ~{summary?.alosDays} дн. на поездку</span>
        </div>

        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            ⇄ One-Way доля поездок
          </span>
          <span className="text-lg font-black text-purple-300 font-mono mt-0.5 block">
            {summary?.oneWayShare}%
          </span>
          <span className="text-[10px] text-slate-500">{summary?.oneWayCount} из {summary?.bookingsCount} броней</span>
        </div>
      </div>

      {/* 4. REPORT SUB-NAVIGATION TABS */}
      <div className="border-b border-slate-800 flex space-x-2 overflow-x-auto text-xs font-bold pt-2 print:hidden">
        {[
          { id: "overview", label: "📊 Сводный обзор & P&L", icon: PieChart },
          { id: "fleet", label: "🚗 Юнит-экономика автопарка", icon: Car },
          { id: "cities", label: "🗺️ Разрез по городам Грузии", icon: Building2 },
          { id: "cashflow", label: "💰 Кассы, счета и ДДС", icon: Wallet },
          { id: "managers", label: "👔 Результаты менеджеров", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl transition-all flex items-center space-x-2 whitespace-nowrap border-b-2 ${
                isActive
                  ? "bg-slate-900 border-amber-500 text-amber-400"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 5. SUB-TAB CONTENT */}

      {/* SUB-TAB 1: P&L & OVERVIEW */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* P&L Statement Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Structure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center justify-between">
                <span>1. Структура доходов (Выручка)</span>
                <span className="text-amber-400 font-mono">${pnl?.revenue?.total.toLocaleString()} USD</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Rental */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Базовый тариф аренды автомобилей:</span>
                    <span className="font-mono font-bold text-white">${pnl?.revenue?.rental} USD</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{
                        width: `${(pnl?.revenue?.rental / Math.max(1, pnl?.revenue?.total)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* One-Way Fees */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="flex items-center space-x-1">
                      <Repeat className="w-3.5 h-3.5 text-purple-400" />
                      <span>Сбор за междугороднюю сдачу (One-Way):</span>
                    </span>
                    <span className="font-mono font-bold text-purple-300">${pnl?.revenue?.oneWay} USD</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{
                        width: `${(pnl?.revenue?.oneWay / Math.max(1, pnl?.revenue?.total)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Extras */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Дополнительное оборудование (кресла, роутеры):</span>
                    <span className="font-mono font-bold text-emerald-300">${pnl?.revenue?.extras} USD</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full"
                      style={{
                        width: `${(pnl?.revenue?.extras / Math.max(1, pnl?.revenue?.total)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Gross Margin Note */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Валовая прибыль (выручка минус прямые расходы):</span>
                <span className="font-black text-emerald-400 font-mono text-sm">
                  ${pnl?.grossProfitUSD.toLocaleString()} USD
                </span>
              </div>
            </div>

            {/* OPEX Structure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-base font-extrabold text-white flex items-center justify-between">
                <span>2. Структура операционных расходов (OPEX)</span>
                <span className="text-red-400 font-mono">{pnl?.opex?.totalGEL.toLocaleString()} GEL</span>
              </h3>

              <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto pr-1">
                {pnl?.opex?.categories.map((cat: any) => {
                  const share =
                    pnl?.opex?.totalGEL > 0 ? ((cat.amountGEL / pnl?.opex?.totalGEL) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat.key} className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-slate-200">{cat.label}</span>
                        <div className="text-right font-mono">
                          <span className="text-white font-bold">{cat.amountGEL.toLocaleString()} GEL</span>
                          <span className="text-slate-500 text-[10px] ml-1.5">(~${cat.amountUSD})</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-red-500/80 h-full rounded-full"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* EBITDA / Net Profit */}
              <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/30 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-emerald-300 block">ИТОГ: ЧИСТАЯ ОПЕРАЦИОННАЯ ПРИБЫЛЬ:</span>
                  <span className="text-[10px] text-emerald-400/80">Рентабельность бизнеса: {pnl?.marginPercent}%</span>
                </div>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ${pnl?.netProfitUSD.toLocaleString()} USD
                </span>
              </div>
            </div>
          </div>

          {/* Daily Trend Chart (Bar-based visualization) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Динамика выручки и расходов по дням
                </h3>
                <span className="text-xs text-slate-400">
                  Поступления ($ USD) против расходов ($ USD)
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs">
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  <span className="text-slate-300">Выручка</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-3 h-3 rounded bg-red-500" />
                  <span className="text-slate-300">Расходы</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 pt-4 items-end min-h-[140px]">
              {dailyTimeline?.map((item: any) => {
                const maxVal = Math.max(1, ...dailyTimeline.map((d: any) => Math.max(d.revenueUSD, d.expensesUSD)));
                const revHeight = Math.round((item.revenueUSD / maxVal) * 90);
                const expHeight = Math.round((item.expensesUSD / maxVal) * 90);

                return (
                  <div key={item.date} className="flex flex-col items-center space-y-1 group">
                    <div className="text-[9px] font-mono text-slate-400 group-hover:text-amber-400 transition truncate max-w-full">
                      ${item.revenueUSD}
                    </div>
                    <div className="flex space-x-0.5 items-end h-24">
                      {/* Revenue Bar */}
                      <div
                        style={{ height: `${Math.max(4, revHeight)}%` }}
                        className="w-3 bg-amber-500 rounded-t transition-all group-hover:bg-amber-400 shadow"
                        title={`Выручка: $${item.revenueUSD}`}
                      />
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${Math.max(4, expHeight)}%` }}
                        className="w-3 bg-red-500 rounded-t transition-all group-hover:bg-red-400"
                        title={`Расходы: $${item.expensesUSD}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium truncate w-full text-center">
                      {item.dateFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: FLEET UNIT ECONOMICS */}
      {activeSubTab === "fleet" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <h3 className="font-extrabold text-base text-white">
                Юнит-экономика автопарка по каждой машине
              </h3>
              <p className="text-xs text-slate-400">
                Детальный P&L, загрузка, пробег и маржинальность каждого автомобиля
              </p>
            </div>
            <div className="text-xs text-slate-400">
              Всего в парке: <strong className="text-white">{unitEconomics?.length} авто</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Автомобиль / Госномер</th>
                  <th className="py-3 px-3 font-bold">Город</th>
                  <th className="py-3 px-3 font-bold text-center">Дней в аренде</th>
                  <th className="py-3 px-3 font-bold text-center">% Загрузки</th>
                  <th className="py-3 px-3 font-bold text-right">Выручка</th>
                  <th className="py-3 px-3 font-bold text-right">Расходы</th>
                  <th className="py-3 px-3 font-bold text-right">Чистая прибыль</th>
                  <th className="py-3 px-3 font-bold text-center">Маржа</th>
                  <th className="py-3 px-3 font-bold text-right">$/км</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {unitEconomics?.map((car: any) => {
                  const cityTheme = getCityTheme(car.cityCode);
                  return (
                    <tr key={car.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-2 h-7 rounded-full ${cityTheme.borderL}`} />
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {car.brand} {car.model}
                            </span>
                            <span className="font-mono text-[11px] text-amber-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                              {car.plateNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 ml-1.5">{car.year} г.</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${cityTheme.badgeBg}`}>
                          {cityTheme.name}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span className="font-bold text-white">{car.daysRented} дн.</span>
                        <span className="text-slate-500 text-[10px] block">
                          (простой: {car.idleDays} дн)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className="font-mono font-bold text-cyan-300">{car.utilizationRate}%</span>
                        </div>
                        <div className="w-16 bg-slate-950 h-1.5 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className="bg-cyan-500 h-full rounded-full"
                            style={{ width: `${car.utilizationRate}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-amber-400">
                        ${car.revenueUSD}
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-red-400">
                        ${car.expensesUSD}
                        <span className="text-[10px] text-slate-500 block">({car.expensesGEL} GEL)</span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={car.netProfitUSD >= 0 ? "text-emerald-400" : "text-red-400"}>
                          ${car.netProfitUSD}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            car.marginPercent > 60
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {car.marginPercent}%
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        ${car.revenuePerKm}
                        <span className="text-[10px] text-slate-500 block">~{car.estimatedKm} км</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CITIES & BRANCHES COMPARISON */}
      {activeSubTab === "cities" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {citiesSummary?.map((city: any) => {
              const theme = getCityTheme(city.code);
              return (
                <div
                  key={city.code}
                  className={`bg-slate-900 border rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden ${
                    city.code === "TBS"
                      ? "border-amber-500/60"
                      : city.code === "BUS"
                      ? "border-cyan-400/60"
                      : "border-emerald-500/60"
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{city.icon}</span>
                      <div>
                        <h4 className="font-black text-white text-base">Филиал {city.name}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Код: {city.code}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-black border ${theme.badgeBg}`}>
                      {city.revenueShare}% выручки
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Выручка филиала:</span>
                      <span className="text-xl font-black text-amber-400 font-mono">
                        ${city.revenueUSD} USD
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Расходы филиала:</span>
                      <span className="font-mono text-red-400 font-bold">
                        {city.expensesGEL} GEL (~${city.expensesUSD})
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Чистая прибыль филиала:</span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        ${city.netProfitUSD} USD
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                      <span className="text-slate-400">Парк машин:</span>
                      <span className="font-bold text-white">{city.fleetCount} автомобилей</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-400">Загрузка парка филиала:</span>
                      <span className="font-mono font-bold text-cyan-300">{city.utilizationRate}%</span>
                    </div>

                    {/* One-Way Inbound vs Outbound Logistics Balance */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                      <span className="font-bold text-slate-300 block flex items-center space-x-1">
                        <Repeat className="w-3.5 h-3.5 text-purple-400" />
                        <span>Логистика One-Way перемещений:</span>
                      </span>
                      <div className="flex justify-between text-slate-400">
                        <span>Уехало в другие города:</span>
                        <span className="text-red-400 font-mono font-bold">-{city.outboundOneWay} авто</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Приехало из других городов:</span>
                        <span className="text-emerald-400 font-mono font-bold">+{city.inboundOneWay} авто</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                        <span>Сальдо дислокации:</span>
                        <span
                          className={`font-mono ${
                            city.netRelocationBalance >= 0 ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {city.netRelocationBalance >= 0 ? `+${city.netRelocationBalance}` : city.netRelocationBalance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CASH FLOW & MULTI-ACCOUNTS */}
      {activeSubTab === "cashflow" && (
        <div className="space-y-6">
          {/* Liquid Balances Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Общая ликвидность компании
              </span>
              <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                ${cashFlow?.totalLiquidUSD.toLocaleString()} USD
              </span>
              <span className="text-xs text-slate-500">по всем кассам и счетам</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Физические наличные кассы
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                ${cashFlow?.totalCashInRegistersUSD.toLocaleString()} USD
              </span>
              <span className="text-xs text-slate-500">Тбилиси, Батуми, Кутаиси</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Банковские счета (BOG, TBC, Credo)
              </span>
              <span className="text-2xl font-black text-cyan-400 font-mono mt-1 block">
                ${cashFlow?.totalBankAccountsUSD.toLocaleString()} USD
              </span>
              <span className="text-xs text-slate-500">безналичные переводы & эквайринг</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Криптовалютный кошелек
              </span>
              <span className="text-2xl font-black text-indigo-400 font-mono mt-1 block">
                ${cashFlow?.totalCryptoUSD.toLocaleString()} USDT
              </span>
              <span className="text-xs text-slate-500">USDT TRC20</span>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800">
              <h3 className="font-extrabold text-base text-white">
                Детализация счетов и касс автопроката
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">Счет / Касса</th>
                    <th className="py-3 px-3 font-bold">Тип</th>
                    <th className="py-3 px-3 font-bold">Локация / Филиал</th>
                    <th className="py-3 px-3 font-bold text-right">Текущий остаток</th>
                    <th className="py-3 px-4 font-bold text-right">Остаток в USD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {cashFlow?.accounts.map((acc: any) => (
                    <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-bold text-white">
                        {acc.name}
                        {acc.accountNumber && (
                          <span className="block text-[10px] font-mono text-slate-500 font-normal">
                            {acc.accountNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                          {acc.type === "CASH"
                            ? "💵 Наличная касса"
                            : acc.type === "BANK_ACCOUNT"
                            ? "🏦 Банковский счет"
                            : "🪙 Криптокошелек"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{acc.cityName}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {acc.currentBalance.toLocaleString()} {acc.currency}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-amber-400">
                        ${acc.balanceUSD.toLocaleString()} USD
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MANAGERS PERFORMANCE */}
      {activeSubTab === "managers" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-white">
              Рейтинг и операционные показатели менеджеров выдачи
            </h3>
            <p className="text-xs text-slate-400">
              Выдачи, собранная выручка и продажи дополнительного оборудования
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {managerPerformance?.map((mgr: any, idx: number) => (
              <div
                key={mgr.name}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-white text-sm">{mgr.name}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {mgr.city}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Выдано автомобилей:</span>
                    <span className="font-bold font-mono text-white">{mgr.bookingsCount}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Собранная выручка:</span>
                    <span className="font-bold font-mono text-amber-400">${mgr.revenueUSD} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Допродажи аксессуаров:</span>
                    <span className="font-bold font-mono text-emerald-300">${mgr.extrasTotalUSD} USD</span>
                  </div>
                  <div className="flex justify-between text-slate-300 pt-1.5 border-t border-slate-800">
                    <span>Средний чек выдачи:</span>
                    <span className="font-bold font-mono text-white">
                      ${Math.round(mgr.revenueUSD / Math.max(1, mgr.bookingsCount))} USD
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
