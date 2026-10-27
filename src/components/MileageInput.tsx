"use client";

import React, { useState, useEffect } from "react";
import { Gauge, Calculator } from "lucide-react";
import { milesToKm, kmToMiles } from "@/lib/mileageUtils";

export interface MileageInputProps {
  valueKm: number;
  onChangeKm: (km: number) => void;
  label?: string;
  minKm?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  previousKm?: number;
  subNote?: React.ReactNode;
}

export const MileageInput: React.FC<MileageInputProps> = ({
  valueKm,
  onChangeKm,
  label = "Пробег автомобиля",
  minKm,
  required = false,
  disabled = false,
  className = "",
  previousKm,
  subNote,
}) => {
  const [unit, setUnit] = useState<"KM" | "MILES">("KM");
  // Локальное строковое значение поля ввода (чтобы можно было вводить и стирать цифры без сброса в 0)
  const [displayValue, setDisplayValue] = useState<string>(String(valueKm || ""));

  // При изменении внешнего valueKm из пропсов синхронизируем displayValue
  useEffect(() => {
    if (unit === "KM") {
      setDisplayValue(String(valueKm || ""));
    } else {
      setDisplayValue(String(kmToMiles(valueKm) || ""));
    }
  }, [valueKm, unit]);

  const handleUnitToggle = (newUnit: "KM" | "MILES") => {
    if (newUnit === unit) return;
    setUnit(newUnit);
    if (newUnit === "MILES") {
      const miles = kmToMiles(valueKm);
      setDisplayValue(String(miles || ""));
    } else {
      setDisplayValue(String(valueKm || ""));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);

    const num = Number(raw);
    if (isNaN(num)) return;

    if (unit === "KM") {
      onChangeKm(num);
    } else {
      // Пользователь вводит мили -> пересчитываем в км для базы и отчетов
      const convertedKm = milesToKm(num);
      onChangeKm(convertedKm);
    }
  };

  const currentMiles = kmToMiles(valueKm);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with Unit Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-1">
        <label className="text-slate-200 font-bold text-xs flex items-center space-x-1.5">
          <Gauge className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{label}:</span>
        </label>

        {/* Unit Switcher: КМ vs МИЛИ */}
        <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => handleUnitToggle("KM")}
            className={`px-2 py-0.5 rounded-md font-black transition ${
              unit === "KM"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
            title="Одометр автомобиля показывает километры (Европа, Грузия)"
          >
            Км (KM)
          </button>
          <button
            type="button"
            onClick={() => handleUnitToggle("MILES")}
            className={`px-2 py-0.5 rounded-md font-black transition flex items-center space-x-0.5 ${
              unit === "MILES"
                ? "bg-indigo-600 text-white shadow border border-indigo-400/50"
                : "text-slate-400 hover:text-white"
            }`}
            title="Одометр автомобиля показывает мили (автомобили из США)"
          >
            <span>🇺🇸 Мили (MI)</span>
          </button>
        </div>
      </div>

      {/* Input Field with Unit Label */}
      <div className="relative">
        <input
          type="number"
          min={unit === "KM" ? minKm : minKm ? kmToMiles(minKm) : 0}
          value={displayValue}
          onChange={handleInputChange}
          disabled={disabled}
          required={required}
          placeholder={unit === "KM" ? "50000" : "31000"}
          className={`w-full bg-slate-900 border rounded-xl p-2 pr-16 text-white font-mono font-bold text-sm focus:outline-none transition ${
            unit === "MILES"
              ? "border-indigo-500/80 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              : "border-slate-700 focus:border-emerald-500"
          }`}
        />
        <div className="absolute right-2.5 top-2 pointer-events-none flex items-center space-x-1">
          <span className={`text-xs font-black font-mono ${
            unit === "MILES" ? "text-indigo-300" : "text-emerald-400"
          }`}>
            {unit === "KM" ? "км" : "миль"}
          </span>
        </div>
      </div>

      {/* Internal Live Conversion Calculator Badge */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 flex-wrap gap-1">
        {unit === "MILES" ? (
          <div className="flex items-center space-x-1.5 text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 rounded-lg px-2 py-1 w-full animate-in fade-in">
            <Calculator className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="font-mono font-bold">
              {Number(displayValue) || 0} mi × 1.609 ={" "}
              <strong className="text-white font-black underline">
                {(valueKm || 0).toLocaleString("ru-RU")} км
              </strong>
            </span>
            <span className="text-[9px] text-indigo-300/80 ml-auto font-sans font-medium">
              (в отчёты идёт в км)
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-slate-400">
            <span>Эквивалент:</span>
            <span className="font-mono text-slate-300 font-semibold">
              {(currentMiles || 0).toLocaleString("ru-RU")} mi
            </span>
            {previousKm !== undefined && (
              <span className="text-slate-500 ml-2">
                (исходный: {previousKm.toLocaleString("ru-RU")} км)
              </span>
            )}
          </div>
        )}
      </div>

      {subNote && <div>{subNote}</div>}
    </div>
  );
};
