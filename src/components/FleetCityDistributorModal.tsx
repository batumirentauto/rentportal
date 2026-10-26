"use client";

import React, { useState, useEffect, useMemo } from "react";
import { MapPin, Search, CheckCircle2, Car, RefreshCw, X, Building2, Save } from "lucide-react";

interface FleetCityDistributorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCitiesUpdated: () => void;
}

export const FleetCityDistributorModal: React.FC<FleetCityDistributorModalProps> = ({
  isOpen,
  onClose,
  onCitiesUpdated,
}) => {
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [updatingCarId, setUpdatingCarId] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const fetchCars = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/fleet/cars");
      const data = await res.json();
      if (data.success && data.cars) {
        setCars(data.cars);
      }
    } catch (e) {
      console.error("Error fetching fleet for city distribution:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCars();
      setSavedNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCityChange = async (carId: string, cityCode: "TBS" | "BUS" | "KUT", carTitle: string) => {
    try {
      setUpdatingCarId(carId);
      const res = await fetch("/api/fleet/cars/bulk-city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carId, cityCode }),
      });
      const data = await res.json();
      if (data.success) {
        setCars((prev) =>
          prev.map((c) =>
            c.id === carId
              ? {
                  ...c,
                  city: {
                    ...c.city,
                    code: cityCode,
                    nameRu:
                      cityCode === "TBS"
                        ? "Тбилиси"
                        : cityCode === "BUS"
                        ? "Батуми"
                        : "Кутаиси",
                  },
                }
              : c
          )
        );
        setSavedNotice(`Город для ${carTitle} изменен на ${cityCode === "TBS" ? "Тбилиси" : cityCode === "BUS" ? "Батуми" : "Кутаиси"}`);
        setTimeout(() => setSavedNotice(null), 2500);
        onCitiesUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingCarId(null);
    }
  };

  const filteredCars = cars.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.brand.toLowerCase().includes(q) ||
      c.model.toLowerCase().includes(q) ||
      c.plateNumber.toLowerCase().includes(q) ||
      (c.vin && c.vin.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (selectedFilter !== "ALL" && c.city?.code !== selectedFilter) return false;
    return true;
  });

  const cityCounts = {
    total: cars.length,
    TBS: cars.filter((c) => c.city?.code === "TBS").length,
    BUS: cars.filter((c) => c.city?.code === "BUS").length,
    KUT: cars.filter((c) => c.city?.code === "KUT").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <MapPin className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Быстрое распределение авто по городам (дислокация)
              </h3>
              <p className="text-xs text-slate-400">
                Кликайте по городу в 1 клик — изменение сразу сохраняется в базе
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

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3">
          {/* Quick city filter pills */}
          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedFilter === "ALL"
                  ? "bg-slate-700 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Все авто ({cityCounts.total})
            </button>
            <button
              onClick={() => setSelectedFilter("BUS")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                selectedFilter === "BUS"
                  ? "bg-cyan-500 text-slate-950 shadow"
                  : "text-cyan-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span>🌊 Батуми</span>
              <span className="font-mono">({cityCounts.BUS})</span>
            </button>
            <button
              onClick={() => setSelectedFilter("TBS")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                selectedFilter === "TBS"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "text-amber-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span>🏛️ Тбилиси</span>
              <span className="font-mono">({cityCounts.TBS})</span>
            </button>
            <button
              onClick={() => setSelectedFilter("KUT")}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1 ${
                selectedFilter === "KUT"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-emerald-400 hover:text-white hover:bg-slate-900"
              }`}
            >
              <span>🌿 Кутаиси</span>
              <span className="font-mono">({cityCounts.KUT})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по марке, модели, номеру..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Notice Bar */}
        {savedNotice && (
          <div className="px-6 py-2 bg-emerald-950/90 border-b border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Cars List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
              <p className="font-bold text-white text-sm">Загружаем список автопарка...</p>
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              Автомобили по заданному фильтру не найдены.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredCars.map((car) => {
                const currentCityCode = car.city?.code || "TBS";
                const isUpdating = updatingCarId === car.id;

                return (
                  <div
                    key={car.id}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition flex items-center justify-between gap-2 shadow-sm"
                  >
                    {/* Car info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-white text-xs truncate">
                          {car.brand} {car.model}
                        </span>
                        {car.year && (
                          <span className="text-[10px] text-slate-400">({car.year})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="font-mono text-[11px] font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {car.plateNumber}
                        </span>
                        {car.color && (
                          <span className="text-[10px] text-slate-500 truncate">{car.color}</span>
                        )}
                      </div>
                    </div>

                    {/* 1-Click City Selectors */}
                    <div className="flex items-center space-x-1 shrink-0">
                      {/* Batumi */}
                      <button
                        onClick={() => handleCityChange(car.id, "BUS", `${car.brand} ${car.model}`)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                          currentCityCode === "BUS"
                            ? "bg-cyan-500 text-slate-950 font-black ring-2 ring-cyan-300 shadow-md"
                            : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/50"
                        }`}
                        title="Назначить дислокацию: Батуми"
                      >
                        <span>🌊</span>
                        <span>Батуми</span>
                      </button>

                      {/* Tbilisi */}
                      <button
                        onClick={() => handleCityChange(car.id, "TBS", `${car.brand} ${car.model}`)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                          currentCityCode === "TBS"
                            ? "bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 shadow-md"
                            : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-500/50"
                        }`}
                        title="Назначить дислокацию: Тбилиси"
                      >
                        <span>🏛️</span>
                        <span>Тбилиси</span>
                      </button>

                      {/* Kutaisi */}
                      <button
                        onClick={() => handleCityChange(car.id, "KUT", `${car.brand} ${car.model}`)}
                        disabled={isUpdating}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                          currentCityCode === "KUT"
                            ? "bg-emerald-500 text-slate-950 font-black ring-2 ring-emerald-300 shadow-md"
                            : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-emerald-300 hover:border-emerald-500/50"
                        }`}
                        title="Назначить дислокацию: Кутаиси"
                      >
                        <span>🌿</span>
                        <span>Кутаиси</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span>Показано <strong className="text-white">{filteredCars.length}</strong> из <strong className="text-white">{cars.length}</strong> авто</span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-emerald-400 font-medium">✓ Все города авто сохраняются в базе данных</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                window.location.href = "/api/admin/database?download=1";
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 rounded-xl font-bold transition flex items-center space-x-1.5 active:scale-95"
              title="Скачать резервную копию базы данных SQLite со всеми распределениями городов"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>Скачать бэкап базы</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-slate-950 font-black rounded-xl shadow transition active:scale-95"
            >
              Готово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
