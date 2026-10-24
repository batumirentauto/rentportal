import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Copy,
  Check,
  ExternalLink,
  Search,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Download,
  RotateCw,
  PlusCircle,
  X,
  Clock,
  Car,
  Camera,
  CheckCircle2,
  RefreshCw,
  Building2,
  Calendar,
  DollarSign,
  Info,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

export const TechPassportFinesRegistry: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Copy feedback toast
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Selected car for Quick Check Assistant
  const [assistantCarId, setAssistantCarId] = useState<string>("");

  // Modal for Viewing Tech Passport Photo in Fullscreen Zoom
  const [viewingPhotoCar, setViewingPhotoCar] = useState<any | null>(null);
  const [activePhotoSide, setActivePhotoSide] = useState<"front" | "back">("front");
  const [photoRotation, setPhotoRotation] = useState<number>(0);

  // Modal for Recording a Detected Fine
  const [isRecordFineOpen, setIsRecordFineOpen] = useState<boolean>(false);
  const [fineCarId, setFineCarId] = useState<string>("");
  const [protocolNumber, setProtocolNumber] = useState<string>("");
  const [fineAmountGEL, setFineAmountGEL] = useState<number>(50);
  const [violationDate, setViolationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [articleName, setArticleName] = useState<string>(
    "Превышение скорости на 15-40 км/ч (Радар МВД)"
  );
  const [fineNotes, setFineNotes] = useState<string>("");
  const [isSubmittingFine, setIsSubmittingFine] = useState<boolean>(false);

  const fetchFinesData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fines?city=${cityFilter}&status=${statusFilter}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (!assistantCarId && json.cars?.length > 0) {
          setAssistantCarId(json.cars[0].id);
        }
      }
    } catch (e) {
      console.error("Error loading fines and tech passports:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinesData();
  }, [cityFilter, statusFilter]);

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Mark vehicle as verified clean in 1-click
  const handleMarkClean = async (carId: string) => {
    try {
      const res = await fetch("/api/fines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "VERIFIED_CLEAN",
          carId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchFinesData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open protocol.ge or videos.police.ge and copy plate number automatically
  const handleOpenProtocolPortal = (car: any) => {
    const rawPlate = car.plateNumber.replace(/-/g, "").toUpperCase();
    handleCopy(rawPlate, `plate-${car.id}`);
    window.open("https://police.ge/protocol", "_blank");
  };

  const handleOpenVideosPolicePortal = (car: any) => {
    handleCopy(`${car.plateNumber} | ${car.techPassportNumber || ""}`, `combo-${car.id}`);
    window.open("https://videos.police.ge", "_blank");
  };

  const handleSaveFine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineCarId || !protocolNumber || !fineAmountGEL) return;
    setIsSubmittingFine(true);
    try {
      const res = await fetch("/api/fines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: fineCarId,
          protocolNumber,
          amountGEL: fineAmountGEL,
          violationDate,
          articleName,
          notes: fineNotes,
          managerName: "Менеджер смены",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsRecordFineOpen(false);
        setProtocolNumber("");
        setFineNotes("");
        await fetchFinesData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingFine(false);
    }
  };

  const filteredCars = useMemo(() => {
    if (!data?.cars) return [];
    return data.cars.filter((c: any) => {
      const matchesSearch =
        c.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.techPassportNumber && c.techPassportNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [data?.cars, searchQuery]);

  const selectedAssistantCar = useMemo(() => {
    return data?.cars?.find((c: any) => c.id === assistantCarId) || filteredCars[0];
  }, [data?.cars, assistantCarId, filteredCars]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. TOP HEADER & SEARCH CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black uppercase tracking-wider bg-gradient-to-r from-red-500 to-amber-500 text-slate-950 px-2.5 py-0.5 rounded shadow">
                protocol.ge & videos.police.ge
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Реестр техпаспортов и контроль штрафов МВД Грузии
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1 tracking-tight flex items-center space-x-2">
              <span>База техпаспортов & Проверка штрафов ПДД</span>
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (filteredCars.length > 0) setFineCarId(filteredCars[0].id);
                setIsRecordFineOpen(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Внести штраф</span>
            </button>
            <button
              onClick={fetchFinesData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по госномеру (TB-742-GE) или техпаспорту..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* City Selector */}
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Все города (Все филиалы)</option>
              <option value="TBS">🏛️ Тбилиси</option>
              <option value="BUS">🌊 Батуми</option>
              <option value="KUT">🌿 Кутаиси</option>
            </select>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium"
            >
              <option value="ALL">Все статусы</option>
              <option value="CLEAN">🟢 Чисто (Штрафов нет)</option>
              <option value="FINE_DETECTED">🔴 Обнаружен штраф</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. STATS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Всего машин с техпаспортами
            </span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">
              {data?.stats?.totalCars || 0} авто
            </span>
          </div>
          <div className="p-2.5 bg-slate-800 text-amber-400 rounded-xl">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Проверено (Штрафов нет)
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">
              {data?.stats?.cleanCarsCount || 0} авто
            </span>
          </div>
          <div className="p-2.5 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-xl">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Требуют внимания (Штраф)
            </span>
            <span className="text-xl font-black text-red-400 font-mono mt-0.5 block">
              {data?.stats?.fineDetectedCarsCount || 0} авто
            </span>
          </div>
          <div className="p-2.5 bg-red-950 text-red-400 border border-red-500/30 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">
              Неоплаченные штрафы к удержанию
            </span>
            <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">
              {data?.stats?.totalUnpaidAmountGEL || 0} GEL
            </span>
            <span className="text-[10px] text-emerald-400">
              Со скидкой 20%: {data?.stats?.totalDiscountAmountGEL || 0} GEL
            </span>
          </div>
          <div className="p-2.5 bg-amber-950 text-amber-400 border border-amber-500/30 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEMI-AUTOMATED VERIFICATION ASSISTANT (Интерактивный помощник проверки) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border-2 border-indigo-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Хаб полуавтоматической проверки штрафов на protocol.ge & videos.police.ge
              </h3>
              <p className="text-xs text-slate-300">
                1-клик копирование госномера и техпаспорта с моментальным переходом на порталы МВД Грузии
              </p>
            </div>
          </div>

          {/* Quick Car Selector for Assistant */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 hidden sm:inline">Выберите машину:</span>
            <select
              value={selectedAssistantCar?.id || ""}
              onChange={(e) => setAssistantCarId(e.target.value)}
              className="bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500"
            >
              {filteredCars.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.brand} {c.model} ({c.plateNumber}) • {c.city.nameRu}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedAssistantCar && (
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            {/* Left: Car & Tech Passport Data ready to copy */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white text-sm">
                  {selectedAssistantCar.brand} {selectedAssistantCar.model}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                  {selectedAssistantCar.city.nameRu}
                </span>
              </div>

              {/* Plate with copy */}
              <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">Госномер:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {selectedAssistantCar.plateNumber}
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        selectedAssistantCar.plateNumber.replace(/-/g, "").toUpperCase(),
                        `raw-plate-${selectedAssistantCar.id}`
                      )
                    }
                    className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                    title="Скопировать без дефисов (для формы protocol.ge)"
                  >
                    {copiedKey === `raw-plate-${selectedAssistantCar.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Tech Passport Number with copy */}
              <div className="flex items-center justify-between bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-400">№ Техпаспорта:</span>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-cyan-300 text-sm">
                    {selectedAssistantCar.techPassportNumber || "Не указан"}
                  </span>
                  {selectedAssistantCar.techPassportNumber && (
                    <button
                      onClick={() =>
                        handleCopy(
                          selectedAssistantCar.techPassportNumber,
                          `tp-${selectedAssistantCar.id}`
                        )
                      }
                      className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                      title="Скопировать номер техпаспорта"
                    >
                      {copiedKey === `tp-${selectedAssistantCar.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Actions on Official Portals */}
            <div className="space-y-2">
              <button
                onClick={() => handleOpenProtocolPortal(selectedAssistantCar)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>1. Открыть police.ge/protocol (Реестр)</span>
                </div>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono">
                  копирует госномер
                </span>
              </button>

              <button
                onClick={() => handleOpenVideosPolicePortal(selectedAssistantCar)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
              >
                <div className="flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4" />
                  <span>2. Открыть videos.police.ge (Камеры)</span>
                </div>
                <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded font-mono">
                  госномер + техпаспорт
                </span>
              </button>
            </div>

            {/* Right: Record Verification Result */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-400 block text-[11px] font-semibold">
                Зафиксировать итог проверки:
              </span>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleMarkClean(selectedAssistantCar.id)}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow"
                  title="Отметить, что штрафов нет (актуализировать дату)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Чисто (Штрафов нет)</span>
                </button>

                <button
                  onClick={() => {
                    setFineCarId(selectedAssistantCar.id);
                    setIsRecordFineOpen(true);
                  }}
                  className="flex-1 flex items-center justify-center space-x-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition shadow"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Обнаружен штраф</span>
                </button>
              </div>

              {selectedAssistantCar.lastFineCheckAt && (
                <div className="text-[10px] text-slate-500 flex items-center space-x-1 pt-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    Посл. проверка:{" "}
                    {new Date(selectedAssistantCar.lastFineCheckAt).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. CARDS REGISTRY: TECH PASSPORTS & FINES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
            <span>Картотека автомобилей и документов</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-normal">
              {filteredCars.length} авто
            </span>
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Кликните на фото техпаспорта для полноразмерного просмотра и зума
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCars.map((car: any) => {
            const cityTheme = getCityTheme(car.city.code);
            const isClean = car.fineStatus === "CLEAN";
            const rawPlate = car.plateNumber.replace(/-/g, "").toUpperCase();

            return (
              <div
                key={car.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-xl space-y-4 relative overflow-hidden ${
                  !isClean
                    ? "border-red-500/70 bg-red-950/10"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`w-2.5 h-10 rounded-full ${cityTheme.borderL}`} />
                    <div>
                      <h4 className="font-bold text-white text-base">
                        {car.brand} {car.model}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {car.year} г. • {car.color} • {car.fuelType}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isClean ? (
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Штрафов нет</span>
                      </span>
                    ) : (
                      <span className="bg-red-950 text-red-300 border border-red-500/50 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span>Штраф обнаружен</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Plates & Document Numbers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Plate number */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Госномер авто:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {car.plateNumber}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleCopy(rawPlate, `raw-${car.id}`)}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px] font-mono transition"
                        title="Скопировать без дефисов"
                      >
                        {copiedKey === `raw-${car.id}` ? "✓" : rawPlate}
                      </button>
                      <button
                        onClick={() => handleCopy(car.plateNumber, `norm-${car.id}`)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        title="Скопировать госномер"
                      >
                        {copiedKey === `norm-${car.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tech Passport Number */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">№ Техпаспорта:</span>
                      <span className="font-mono font-bold text-cyan-300 text-sm">
                        {car.techPassportNumber || "Не указан"}
                      </span>
                    </div>
                    {car.techPassportNumber && (
                      <button
                        onClick={() => handleCopy(car.techPassportNumber, `tp-num-${car.id}`)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        title="Скопировать номер техпаспорта"
                      >
                        {copiedKey === `tp-num-${car.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Tech Passport Photos Thumbnails */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Скан / Фото техпаспорта:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Front */}
                    <div
                      onClick={() => {
                        setViewingPhotoCar(car);
                        setActivePhotoSide("front");
                        setPhotoRotation(0);
                      }}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-xl p-2 cursor-pointer transition group flex items-center space-x-2"
                    >
                      {car.techPassportFrontUrl ? (
                        <img
                          src={car.techPassportFrontUrl}
                          alt="Лицевая сторона"
                          className="w-12 h-8 object-cover rounded bg-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-amber-400">
                          Лицевая сторона
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>Просмотр</span>
                        </span>
                      </div>
                    </div>

                    {/* Back */}
                    <div
                      onClick={() => {
                        setViewingPhotoCar(car);
                        setActivePhotoSide("back");
                        setPhotoRotation(0);
                      }}
                      className="bg-slate-950 border border-slate-800 hover:border-amber-500/60 rounded-xl p-2 cursor-pointer transition group flex items-center space-x-2"
                    >
                      {car.techPassportBackUrl ? (
                        <img
                          src={car.techPassportBackUrl}
                          alt="Оборотная сторона"
                          className="w-12 h-8 object-cover rounded bg-slate-800"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                          <Camera className="w-4 h-4" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-amber-400">
                          Оборотная сторона
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                          <Eye className="w-3 h-3" />
                          <span>Просмотр</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detected Fines List on this Car */}
                {car.trafficFines && car.trafficFines.length > 0 && (
                  <div className="bg-red-950/30 border border-red-500/40 rounded-xl p-3 space-y-2">
                    <span className="text-xs font-bold text-red-300 block flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span>Обнаруженные штрафы ({car.trafficFines.length}):</span>
                      </span>
                      <span className="font-mono text-red-400">
                        {car.trafficFines.reduce((s: number, f: any) => s + f.amountGEL, 0)} GEL
                      </span>
                    </span>

                    <div className="space-y-1.5 text-xs">
                      {car.trafficFines.map((fine: any) => (
                        <div
                          key={fine.id}
                          className="bg-slate-950/80 p-2 rounded-lg border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-white text-xs block">
                              № {fine.protocolNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block">{fine.articleName}</span>
                            <span className="text-[10px] text-slate-500">
                              Дата: {new Date(fine.violationDate).toLocaleDateString("ru-RU")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-black text-red-400 font-mono block">
                              {fine.amountGEL} GEL
                            </span>
                            <span className="text-[10px] text-emerald-400 font-medium">
                              (скидка: {fine.discountAmountGEL || Math.round(fine.amountGEL * 0.8)} GEL)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Quick Verification Toolbar */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {car.lastFineCheckAt
                        ? `Проверено ${new Date(car.lastFineCheckAt).toLocaleDateString("ru-RU")}`
                        : "Не проверялось"}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenProtocolPortal(car)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                      title="Открыть protocol.ge со скопированным номером"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                      <span>protocol.ge</span>
                    </button>

                    <button
                      onClick={() => handleMarkClean(car.id)}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                      title="Отметить: Штрафов нет"
                    >
                      <Check className="w-3 h-3" />
                      <span>Чисто</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. MODAL: FULLSCREEN PHOTO VIEWER WITH ZOOM & ROTATION */}
      {viewingPhotoCar && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  Техпаспорт {viewingPhotoCar.brand} {viewingPhotoCar.model} ({viewingPhotoCar.plateNumber})
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  № свидетельства: {viewingPhotoCar.techPassportNumber || "Не указан"}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPhotoRotation((prev) => (prev + 90) % 360)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition"
                  title="Повернуть на 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewingPhotoCar(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Side Switcher */}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setActivePhotoSide("front");
                  setPhotoRotation(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activePhotoSide === "front"
                    ? "bg-amber-500 text-slate-950 font-black shadow"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                Лицевая сторона
              </button>
              <button
                onClick={() => {
                  setActivePhotoSide("back");
                  setPhotoRotation(0);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  activePhotoSide === "back"
                    ? "bg-amber-500 text-slate-950 font-black shadow"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                Оборотная сторона
              </button>
            </div>

            {/* Photo Container with Rotation */}
            <div className="bg-slate-950 rounded-2xl p-4 flex items-center justify-center min-h-[380px] overflow-hidden border border-slate-800">
              {activePhotoSide === "front" ? (
                viewingPhotoCar.techPassportFrontUrl ? (
                  <img
                    src={viewingPhotoCar.techPassportFrontUrl}
                    alt="Техпаспорт Лицевая"
                    style={{ transform: `rotate(${photoRotation}deg)` }}
                    className="max-h-[500px] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
                  />
                ) : (
                  <span className="text-slate-500 text-sm">Фото лицевой стороны еще не загружено</span>
                )
              ) : viewingPhotoCar.techPassportBackUrl ? (
                <img
                  src={viewingPhotoCar.techPassportBackUrl}
                  alt="Техпаспорт Оборотная"
                  style={{ transform: `rotate(${photoRotation}deg)` }}
                  className="max-h-[500px] w-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
                />
              ) : (
                <span className="text-slate-500 text-sm">Фото оборотной стороны еще не загружено</span>
              )}
            </div>

            {/* Copy numbers footer */}
            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">Быстрое копирование:</span>
                <button
                  onClick={() =>
                    handleCopy(
                      viewingPhotoCar.plateNumber.replace(/-/g, "").toUpperCase(),
                      "modal-plate"
                    )
                  }
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded font-mono font-bold"
                >
                  {copiedKey === "modal-plate" ? "✓ Скопировано" : `Госномер: ${viewingPhotoCar.plateNumber}`}
                </button>
                {viewingPhotoCar.techPassportNumber && (
                  <button
                    onClick={() =>
                      handleCopy(viewingPhotoCar.techPassportNumber, "modal-tp")
                    }
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded font-mono font-bold"
                  >
                    {copiedKey === "modal-tp" ? "✓ Скопировано" : `Техпаспорт: ${viewingPhotoCar.techPassportNumber}`}
                  </button>
                )}
              </div>

              <button
                onClick={() => handleOpenProtocolPortal(viewingPhotoCar)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Проверить на protocol.ge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: RECORD TRAFFIC FINE */}
      {isRecordFineOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded font-bold uppercase">
                  Фиксация нарушения
                </span>
                <h3 className="font-extrabold text-base text-white mt-1">
                  Внесение штрафа с камер / protocol.ge
                </h3>
              </div>
              <button
                onClick={() => setIsRecordFineOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFine} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Автомобиль нарушителя:
                </label>
                <select
                  value={fineCarId}
                  onChange={(e) => setFineCarId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
                >
                  {data?.cars?.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} ({c.plateNumber}) • {c.city.nameRu}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    № Постановления / Квитанции:
                  </label>
                  <input
                    type="text"
                    value={protocolNumber}
                    onChange={(e) => setProtocolNumber(e.target.value)}
                    placeholder="Например: GEO-VID-99214"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Дата нарушения:
                  </label>
                  <input
                    type="date"
                    value={violationDate}
                    onChange={(e) => setViolationDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Сумма штрафа (GEL):
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={fineAmountGEL}
                    onChange={(e) => setFineAmountGEL(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Со скидкой 20% (до 10 дней):
                  </label>
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 text-emerald-400 font-mono font-bold">
                    {Math.round(fineAmountGEL * 0.8)} GEL
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Статья / Характер нарушения:
                </label>
                <input
                  type="text"
                  value={articleName}
                  onChange={(e) => setArticleName(e.target.value)}
                  placeholder="Превышение скорости, парковка под знаком, выделенная полоса BUS..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Примечание менеджера:
                </label>
                <textarea
                  value={fineNotes}
                  onChange={(e) => setFineNotes(e.target.value)}
                  placeholder="Удержать из депозита клиента, дата отправки квитанции в WhatsApp..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordFineOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFine}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {isSubmittingFine ? "Сохранение..." : "Зафиксировать штраф"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
