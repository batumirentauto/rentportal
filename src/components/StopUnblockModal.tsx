import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  Calendar,
  Check,
  Car,
  FileText,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

interface StopUnblockModalProps {
  isOpen: boolean;
  onClose: () => void;
  car: any;
  onUnblocked: () => void;
}

export const StopUnblockModal: React.FC<StopUnblockModalProps> = ({
  isOpen,
  onClose,
  car,
  onUnblocked,
}) => {
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const defaultNextYearDate = nextYear.toISOString().split("T")[0];

  const [newInspectionDate, setNewInspectionDate] = useState<string>(defaultNextYearDate);
  const [newInspectionNumber, setNewInspectionNumber] = useState<string>(
    car?.inspectionNumber ? `${car.inspectionNumber}-REN` : `PTI-GEO-${new Date().getFullYear()}091`
  );
  const [newInsuranceDate, setNewInsuranceDate] = useState<string>(defaultNextYearDate);
  const [newInsurancePolicy, setNewInsurancePolicy] = useState<string>(
    car?.insurancePolicyNumber ? `${car.insurancePolicyNumber}-NEW` : `POL-ALD-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [unblockNotes, setUnblockNotes] = useState<string>(
    "Техосмотр пройден успешно, диагностическая карта получена. Страховой полис продлен."
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen || !car) return null;

  const handleUnblock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/fleet/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId: car.id,
          newInspectionExpiryDate: newInspectionDate,
          newInspectionNumber,
          newInsuranceExpiryDate: newInsuranceDate,
          newInsurancePolicyNumber: newInsurancePolicy,
          unblockNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onUnblocked();
        onClose();
      } else {
        alert("Ошибка: " + json.error);
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при снятии со СТОПа");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-red-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase">
                Автомобиль на СТОПе
              </span>
              <span className="font-mono text-xs text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-700">
                {car.plateNumber}
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-1">
              {car.brand} {car.model} ({car.year} г.)
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reason banner */}
        <div className="bg-red-950/40 border border-red-500/50 p-3.5 rounded-2xl flex items-start space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-bold text-red-300">Причина блокировки:</div>
            <div className="text-red-200 mt-0.5">{car.stopReason || "Истекли документы техосмотра/страховки"}</div>
            {car.stopNotes && (
              <div className="text-[11px] text-slate-400 italic mt-1">{car.stopNotes}</div>
            )}
          </div>
        </div>

        <form onSubmit={handleUnblock} className="space-y-3.5 text-xs">
          <div className="text-slate-300 font-bold">
            Внесите данные продленных документов для снятия со СТОПа:
          </div>

          {/* New PTI */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-purple-300 font-bold block">1. Гостехосмотр Грузии (PTI):</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Новый срок действия:</label>
                <input
                  type="date"
                  value={newInspectionDate}
                  onChange={(e) => setNewInspectionDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Номер карты ТО:</label>
                <input
                  type="text"
                  value={newInspectionNumber}
                  onChange={(e) => setNewInspectionNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* New Insurance */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <span className="text-blue-300 font-bold block">2. Страховой полис (КАСКО):</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Срок действия полиса:</label>
                <input
                  type="date"
                  value={newInsuranceDate}
                  onChange={(e) => setNewInsuranceDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 text-[10px] block mb-1">Номер полиса:</label>
                <input
                  type="text"
                  value={newInsurancePolicy}
                  onChange={(e) => setNewInsurancePolicy(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-400 text-[10px] block mb-1">Комментарий к продлению:</label>
            <input
              type="text"
              value={unblockNotes}
              onChange={(e) => setUnblockNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black rounded-xl shadow-lg transition active:scale-95 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? "Сохранение..." : "Снять со СТОПа и допустить"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
