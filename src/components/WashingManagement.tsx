import React, { useState } from "react";
import { Sparkles, Car, Check, Clock, AlertTriangle, RefreshCw } from "lucide-react";

interface WashingManagementProps {
  bookings: any[];
  onToggleWash: (bookingId: string, currentStatus: string) => void;
}

export const WashingManagement: React.FC<WashingManagementProps> = ({
  bookings,
  onToggleWash,
}) => {
  const needsWashList = bookings.filter((b) => b.car.washStatus === "NEEDS_WASH");
  const cleanList = bookings.filter((b) => b.car.washStatus === "CLEAN");
  const inProgressList = bookings.filter((b) => b.car.washStatus === "WASHING");

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2 mb-1">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Контроль чистоты и подготовка автомобилей</span>
        </h2>
        <p className="text-xs text-slate-400">
          Перед выдачей клиенту менеджер обязан проверить чистоту кузова и салона. При необходимости отправьте машину на автомойку и зафиксируйте готовность.
        </p>
      </div>

      {/* Grid of statuses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Needs Washing */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Требуют мойки перед выдачей ({needsWashList.length})</span>
            </h3>
            <span className="text-xs text-amber-400 font-medium">Срочный приоритет</span>
          </div>

          {needsWashList.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-white">Все автомобили чистые!</p>
              <p className="text-xs text-slate-500 mt-1">Нет машин, ожидающих мойки</p>
            </div>
          ) : (
            <div className="space-y-3">
              {needsWashList.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-slate-900 border border-amber-500/40 rounded-xl p-4 space-y-3 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-base">
                        {booking.car.brand} {booking.car.model}
                      </h4>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {booking.car.plateNumber}
                      </span>
                    </div>
                    <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
                      {booking.car.city.nameRu}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <p>
                      <strong>Выдача в:</strong>{" "}
                      {new Date(booking.startDate).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      ({booking.pickupLocation.name})
                    </p>
                    <p className="mt-0.5">
                      <strong>Клиент:</strong> {booking.customer.fullName}
                    </p>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => onToggleWash(booking.id, "CLEAN")}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow"
                    >
                      <Check className="w-4 h-4" />
                      <span>Помыта и готова</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clean and Ready Cars */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Чистые и готовые к аренде ({cleanList.length})</span>
            </h3>
            <span className="text-xs text-emerald-400 font-medium">Готовы к подаче</span>
          </div>

          <div className="space-y-3">
            {cleanList.map((booking) => (
              <div
                key={booking.id}
                className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-white">
                    {booking.car.brand} {booking.car.model}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    {booking.car.plateNumber} • {booking.car.city.nameRu}
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <span className="text-xs bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold px-2.5 py-1 rounded-lg">
                    Чистая ✓
                  </span>
                  <button
                    onClick={() => onToggleWash(booking.id, "NEEDS_WASH")}
                    title="Пометить грязной"
                    className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
