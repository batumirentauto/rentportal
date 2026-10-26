import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Calendar,
  Layers,
  ArrowUpDown,
  Building2,
  Phone,
  Save,
  PlusCircle,
  HelpCircle,
  Percent,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const FleetPricingRegistry: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [classFilter, setClassFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"margin" | "stdRate" | "ownerRate" | "brand">("margin");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Editing Modal State
  const [editingCar, setEditingCar] = useState<any | null>(null);
  const [editOwnerDailyRate, setEditOwnerDailyRate] = useState<number>(25);
  const [editClientMinRate, setEditClientMinRate] = useState<number>(35);
  const [editClientStandardRate, setEditClientStandardRate] = useState<number>(50);
  const [editClientMaxRate, setEditClientMaxRate] = useState<number>(75);
  const [editCarClass, setEditCarClass] = useState<string>("COMFORT");
  const [editPricingNotes, setEditPricingNotes] = useState<string>("");
  const [editOwnerId, setEditOwnerId] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Google Sheets Sync State
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [sheetsSyncResult, setSheetsSyncResult] = useState<any | null>(null);
  const [sheetsSyncError, setSheetsSyncError] = useState<string | null>(null);

  const handleSyncSheets = async () => {
    setIsSyncingSheets(true);
    setSheetsSyncError(null);
    setSheetsSyncResult(null);
    try {
      const res = await fetch("/api/fleet/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setSheetsSyncResult(json);
        await fetchPricing();
        setTimeout(() => setSheetsSyncResult(null), 8000);
      } else {
        setSheetsSyncError(json.error || "Ошибка синхронизации");
      }
    } catch (e: any) {
      setSheetsSyncError(e.message || "Сетевая ошибка при синхронизации");
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const fetchPricing = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/pricing?city=${cityFilter}&carClass=${classFilter}&search=${encodeURIComponent(
          search
        )}`
      );
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, [cityFilter, classFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPricing();
  };

  const openEditModal = (car: any) => {
    setEditingCar(car);
    setEditOwnerDailyRate(car.rates.ownerDailyRate);
    setEditClientMinRate(car.rates.clientMinRate);
    setEditClientStandardRate(car.rates.clientStandardRate);
    setEditClientMaxRate(car.rates.clientMaxRate);
    setEditCarClass(car.carClass);
    setEditPricingNotes(car.pricingNotes || "");
    setEditOwnerId(car.owner?.id || "");
    setSaveSuccessMsg(null);
  };

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCar) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const res = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: editingCar.id,
          ownerDailyRate: editOwnerDailyRate,
          clientMinRate: editClientMinRate,
          clientStandardRate: editClientStandardRate,
          clientMaxRate: editClientMaxRate,
          carClass: editCarClass,
          pricingNotes: editPricingNotes,
          ownerId: editOwnerId,
        }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        setSaveSuccessMsg(resJson.message);
        setTimeout(() => {
          setEditingCar(null);
          fetchPricing();
        }, 800);
      } else {
        alert("Ошибка: " + resJson.error);
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const sortedCars = useMemo(() => {
    if (!data?.cars) return [];
    return [...data.cars].sort((a: any, b: any) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortBy === "margin") {
        valA = a.rates.dailyMargin;
        valB = b.rates.dailyMargin;
      } else if (sortBy === "stdRate") {
        valA = a.rates.clientStandardRate;
        valB = b.rates.clientStandardRate;
      } else if (sortBy === "ownerRate") {
        valA = a.rates.ownerDailyRate;
        valB = b.rates.ownerDailyRate;
      } else if (sortBy === "brand") {
        return sortOrder === "asc"
          ? a.brand.localeCompare(b.brand)
          : b.brand.localeCompare(a.brand);
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [data?.cars, sortBy, sortOrder]);

  const toggleSort = (col: "margin" | "stdRate" | "ownerRate" | "brand") => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  const formatCarClass = (cls: string) => {
    switch (cls) {
      case "ECONOMY":
        return { label: "Эконом", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
      case "COMFORT":
        return { label: "Комфорт", color: "bg-teal-500/20 text-teal-300 border-teal-500/40" };
      case "CROSSOVER":
        return { label: "Кроссовер 4x4", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "SUV":
        return { label: "Внедорожник", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
      case "PREMIUM":
        return { label: "Премиум", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
      case "CABRIO":
        return { label: "Кабриолет", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
      case "MINIVAN":
        return { label: "Минивэн", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
      default:
        return { label: cls, color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black px-2.5 py-0.5 rounded-full uppercase">
                Тарифная матрица парка
              </span>
              <span className="text-xs text-slate-400">
                Фиксированные выплаты владельцам & Вилка цен клиентам
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
              <span>База цен & Тарифы всех автомобилей</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Централизованный реестр ценообразования автопарка в Грузии. При создании брони менеджер
              видит утвержденную ставку владельца и рекомендуемую вилку, но указывает точную сумму
              вручную в соответствии с договоренностями с клиентом.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://docs.google.com/spreadsheets/d/1ubi7CJ4PvUyN4rnZda5UfAiVJaVriOcLrqBMtwF-MNA/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700/80 transition active:scale-95 flex items-center space-x-1.5"
              title="Открыть Google Таблицу"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Таблица Google</span>
            </a>

            <button
              onClick={handleSyncSheets}
              disabled={isSyncingSheets}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center space-x-1.5 shadow-md shadow-emerald-950"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncingSheets ? "animate-spin" : ""}`} />
              <span>{isSyncingSheets ? "Синхронизация..." : "Синхронизировать с Google"}</span>
            </button>

            <button
              onClick={fetchPricing}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition active:scale-95 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span>Обновить</span>
            </button>
          </div>
        </div>

        {/* Sync Status Banners */}
        {sheetsSyncResult && (
          <div className="mt-4 p-3.5 bg-emerald-950/80 border border-emerald-500/40 rounded-xl flex items-center justify-between text-xs text-emerald-200 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Успешно синхронизировано:</strong> Обработано {sheetsSyncResult.totalRowsProcessed} строк. Добавлено новых авто: {sheetsSyncResult.createdCount}, обновлено: {sheetsSyncResult.updatedCount}.
              </span>
            </div>
            <button onClick={() => setSheetsSyncResult(null)} className="text-emerald-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sheetsSyncError && (
          <div className="mt-4 p-3.5 bg-rose-950/80 border border-rose-500/40 rounded-xl flex items-center justify-between text-xs text-rose-200 animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Ошибка синхронизации:</strong> {sheetsSyncError}
              </span>
            </div>
            <button onClick={() => setSheetsSyncError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Summary Metric Cards */}
        {data?.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800">
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Автомобилей в базе:</span>
              <div className="text-xl font-black text-white font-mono mt-0.5">
                {data.totalCars} <span className="text-xs text-slate-500 font-sans font-normal">машин</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Ср. выплата владельцам:</span>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                {data.summary.avgOwnerRate} ₾ <span className="text-xs text-emerald-500/70 font-sans font-normal">/ день</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Ср. тариф клиентам (стд):</span>
              <div className="text-xl font-black text-amber-400 font-mono mt-0.5">
                {data.summary.avgStdClientRate} ₾ <span className="text-xs text-amber-500/70 font-sans font-normal">/ день</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
              <span className="text-[11px] text-slate-400 block font-medium">Ср. маржа компании:</span>
              <div className="text-xl font-black text-cyan-400 font-mono mt-0.5">
                +{data.summary.avgMargin} ₾ <span className="text-xs text-cyan-500/70 font-sans font-normal">/ день</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* City Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setCityFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              cityFilter === "ALL"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            Все города
          </button>
          <button
            onClick={() => setCityFilter("TBS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
              cityFilter === "TBS"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "bg-slate-800 text-amber-300 hover:text-white"
            }`}
          >
            <span>🏛️</span>
            <span>Тбилиси</span>
          </button>
          <button
            onClick={() => setCityFilter("BUS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
              cityFilter === "BUS"
                ? "bg-cyan-400 text-slate-950 font-black shadow"
                : "bg-slate-800 text-cyan-300 hover:text-white"
            }`}
          >
            <span>🌊</span>
            <span>Батуми</span>
          </button>
          <button
            onClick={() => setCityFilter("KUT")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
              cityFilter === "KUT"
                ? "bg-emerald-500 text-slate-950 font-black shadow"
                : "bg-slate-800 text-emerald-300 hover:text-white"
            }`}
          >
            <span>🌿</span>
            <span>Кутаиси</span>
          </button>
        </div>

        {/* Class Filter & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 md:justify-end">
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 font-medium"
          >
            <option value="ALL">Все классы авто</option>
            <option value="ECONOMY">Эконом</option>
            <option value="COMFORT">Комфорт</option>
            <option value="CROSSOVER">Кроссовер 4x4</option>
            <option value="SUV">Внедорожник</option>
            <option value="PREMIUM">Премиум</option>
            <option value="CABRIO">Кабриолет</option>
            <option value="MINIVAN">Минивэн</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск марки, номера, владельца..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-amber-500"
            />
          </form>
        </div>
      </div>

      {/* Main Pricing Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th
                  onClick={() => toggleSort("brand")}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center space-x-1">
                    <span>Автомобиль / Госномер</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">Класс & Город</th>
                <th className="py-3.5 px-3">Владелец (Инвестор)</th>
                <th
                  onClick={() => toggleSort("ownerRate")}
                  className="py-3.5 px-3 cursor-pointer hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Выплата владельцу</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-center">
                  Вилка цен клиентам (Мин — Стандарт — Макс)
                </th>
                <th
                  onClick={() => toggleSort("margin")}
                  className="py-3.5 px-3 cursor-pointer hover:text-white transition text-right"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Маржа проката</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-3">Заметки / Условия</th>
                <th className="py-3.5 px-4 text-center">Действия</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Загрузка тарифной базы автомобилей...</span>
                    </div>
                  </td>
                </tr>
              ) : sortedCars.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Car className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-white">Автомобили по выбранным фильтрам не найдены</p>
                    <p className="text-xs text-slate-500 mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры</p>
                  </td>
                </tr>
              ) : (
                sortedCars.map((car: any) => {
                  const cityTheme = getCityTheme(car.cityCode);
                  const classInfo = formatCarClass(car.carClass);

                  return (
                    <tr
                      key={car.id}
                      className="hover:bg-slate-850/60 transition group"
                    >
                      {/* Car & Plate */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 flex-shrink-0">
                            <Car className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center space-x-1.5">
                              <span>{car.brand} {car.model}</span>
                              <span className="text-slate-400 font-normal text-xs">({car.year})</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-0.5">
                              <span className="font-mono text-[11px] font-bold text-amber-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700">
                                {car.plateNumber}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {car.color} • {car.transmission === "AUTOMATIC" ? "АКПП" : "МКПП"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & City */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border inline-block ${classInfo.color}`}>
                            {classInfo.label}
                          </span>
                          <div>
                            <span className="text-[11px] font-medium text-slate-300">
                              {cityTheme.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner info */}
                      <td className="py-3.5 px-3">
                        {car.owner ? (
                          <div>
                            <div className="font-semibold text-white truncate max-w-[150px]">
                              {car.owner.fullName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5 text-slate-500" />
                              <span>{car.owner.phone}</span>
                            </div>
                            {car.owner.bankName && (
                              <div className="text-[9px] text-slate-500 truncate max-w-[150px]">
                                {car.owner.bankName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Без владельца</span>
                        )}
                      </td>

                      {/* Owner daily rate */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-sm text-emerald-400">
                          {car.rates.ownerDailyRate} ₾
                        </div>
                        <div className="text-[10px] text-emerald-500/70">/ день</div>
                      </td>

                      {/* Price Fork: Min - Standard - Max */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          {/* Min */}
                          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-center min-w-[62px]">
                            <span className="text-[9px] text-slate-400 block leading-tight">Мин (15+ дн.)</span>
                            <span className="font-mono font-bold text-xs text-blue-400">
                              {car.rates.clientMinRate} ₾
                            </span>
                          </div>

                          <span className="text-slate-600 font-bold">—</span>

                          {/* Standard (Recommended) */}
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-1 text-center min-w-[70px] shadow-sm">
                            <span className="text-[9px] text-amber-300 block font-bold leading-tight">Стандарт</span>
                            <span className="font-mono font-black text-xs text-amber-400">
                              {car.rates.clientStandardRate} ₾
                            </span>
                          </div>

                          <span className="text-slate-600 font-bold">—</span>

                          {/* Max */}
                          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1 text-center min-w-[62px]">
                            <span className="text-[9px] text-slate-400 block leading-tight">Макс (1-3 дн.)</span>
                            <span className="font-mono font-bold text-xs text-orange-400">
                              {car.rates.clientMaxRate} ₾
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-black text-sm text-cyan-300">
                          +{car.rates.dailyMargin} ₾
                        </div>
                        <div className="text-[10px] text-cyan-400/80 font-semibold">
                          {car.rates.marginPercent}% маржа
                        </div>
                      </td>

                      {/* Pricing Notes / Bargaining Tips */}
                      <td className="py-3.5 px-3 max-w-xs">
                        {car.pricingNotes ? (
                          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed italic" title={car.pricingNotes}>
                            “{car.pricingNotes}”
                          </p>
                        ) : (
                          <span className="text-slate-600 text-[10px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openEditModal(car)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center space-x-1 mx-auto"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Тариф</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Car Pricing Matrix */}
      {editingCar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider block">
                  Редактирование тарифов
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {editingCar.brand} {editingCar.model} ({editingCar.plateNumber})
                </h3>
              </div>
              <button
                onClick={() => setEditingCar(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4 text-xs">
              {/* Owner Daily Rate */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5 space-y-2">
                <label className="text-emerald-300 font-bold block">
                  💵 Выплата владельцу автомобиля (₾ GEL / день):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-500 font-mono font-bold">₾</span>
                  <input
                    type="number"
                    min="1"
                    value={editOwnerDailyRate}
                    onChange={(e) => setEditOwnerDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl py-2 pl-7 pr-3 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
                <span className="text-[10px] text-emerald-400/80 block">
                  Фиксированная сумма, начисляемая владельцу за каждый отработанный день
                </span>
              </div>

              {/* Client Price Fork: Min, Standard, Max */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-slate-300 font-bold block">
                  🏷️ Вилка цен для клиентов (₾ GEL / день):
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">
                      🟢 Мин (15+ дн.):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₾</span>
                      <input
                        type="number"
                        min="1"
                        value={editClientMinRate}
                        onChange={(e) => setEditClientMinRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 pl-6 pr-2 text-blue-400 font-mono font-bold focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-amber-400 text-[10px] block mb-1 font-bold">
                      🟡 Стандарт (реком.):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-amber-500 font-mono">₾</span>
                      <input
                        type="number"
                        min="1"
                        value={editClientStandardRate}
                        onChange={(e) => setEditClientStandardRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-amber-500/50 rounded-xl py-1.5 pl-6 pr-2 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 text-[10px] block mb-1">
                      🔴 Макс (1-3 дн. / пик):
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-slate-500 font-mono">₾</span>
                      <input
                        type="number"
                        min="1"
                        value={editClientMaxRate}
                        onChange={(e) => setEditClientMaxRate(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 pl-6 pr-2 text-orange-400 font-mono font-bold focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Class & Owner selection */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Класс автомобиля:</label>
                  <select
                    value={editCarClass}
                    onChange={(e) => setEditCarClass(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ECONOMY">Эконом</option>
                    <option value="COMFORT">Комфорт</option>
                    <option value="CROSSOVER">Кроссовер 4x4</option>
                    <option value="SUV">Внедорожник</option>
                    <option value="PREMIUM">Премиум</option>
                    <option value="CABRIO">Кабриолет</option>
                    <option value="MINIVAN">Минивэн</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Владелец (Инвестор):</label>
                  <select
                    value={editOwnerId}
                    onChange={(e) => setEditOwnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Без владельца</option>
                    {data?.owners?.map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing notes */}
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Заметки по ценообразованию и торгу:
                </label>
                <textarea
                  rows={2}
                  value={editPricingNotes}
                  onChange={(e) => setEditPricingNotes(e.target.value)}
                  placeholder="Например: популярный для Казбеги, ниже 120 ₾ не торговаться, на 20+ дней отдаем за 100 ₾..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Calculated Margin summary */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Плановая маржа при стандарте:</span>
                <span className="font-mono font-black text-cyan-300">
                  +{Math.max(0, editClientStandardRate - editOwnerDailyRate)} ₾/день (
                  {editClientStandardRate > 0
                    ? Math.round(((editClientStandardRate - editOwnerDailyRate) / editClientStandardRate) * 100)
                    : 0}
                  %)
                </span>
              </div>

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-500 rounded-xl text-emerald-200 text-xs font-semibold flex items-center space-x-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingCar(null)}
                  disabled={isSaving}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Сохранение..." : "Сохранить тарифы"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
