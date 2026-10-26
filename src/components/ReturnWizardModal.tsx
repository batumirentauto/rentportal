import React, { useState, useMemo, useEffect } from "react";
import { calculateExtraHoursFee } from "@/lib/extra-hours";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Car,
  Gauge,
  Droplet,
  DollarSign,
  ShieldAlert,
  Calendar,
  Check,
  FileText,
  User,
  Sparkles,
  HelpCircle,
  Video,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Camera,
  Coins,
  CreditCard,
  Banknote,
  AlertCircle,
  Clock,
  Printer,
  Copy,
  Wrench,
} from "lucide-react";

interface ReturnWizardModalProps {
  booking: any;
  onClose: () => void;
  onCompleted: (result: any) => void;
}

export const ReturnWizardModal: React.FC<ReturnWizardModalProps> = ({
  booking,
  onClose,
  onCompleted,
}) => {
  const car = booking.car;
  const handoverReport = booking.handoverReport;

  // 1. Пробег: исходный пробег при выдаче и текущий одометр
  const initialMileage = handoverReport?.mileageAtHandover || car.currentMileage || 50000;
  const [returnMileage, setReturnMileage] = useState<number>(
    Math.max(car.currentMileage, initialMileage + Math.round(Math.random() * 300 + 150))
  );
  const tripDistance = Math.max(0, returnMileage - initialMileage);

  // Контроль межсервисного интервала замены масла (СТОП по ТО)
  const lastOilMileage = car.lastOilChangeMileage || 0;
  const oilChangeInterval = car.oilChangeIntervalKm || 8000;
  const nextOilMileage = lastOilMileage + oilChangeInterval;
  const kmRemainingToOilChange = nextOilMileage - returnMileage;
  const isOilOverdue = kmRemainingToOilChange <= 0;
  const oilOverdueKm = Math.abs(kmRemainingToOilChange);

  // Чистота авто и необходимость мойки: "Не всегда авто возвращается грязным, поэтому мойка тоже не всегда нужна"
  const [needsWash, setNeedsWash] = useState<boolean>(false);
  const [cleanlinessState, setCleanlinessState] = useState<string>("CLEAN"); // "CLEAN" | "DIRTY_BODY" | "DIRTY_INTERIOR"

  // 2. Уровень топлива
  const fuelAtHandover = handoverReport?.fuelLevelPercent ?? 100;
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(fuelAtHandover);
  const fuelShortagePercent = Math.max(0, fuelAtHandover - returnFuelLevel);
  // Расчет стоимости топлива: 60 литров бак, 1% ~ 0.6 л. Цена за литр: 3.8 GEL (~ $1.40 USD)
  const defaultFuelCharge = fuelShortagePercent > 0
    ? Math.round((fuelShortagePercent * 0.6 * 1.4))
    : 0;
  const [fuelChargeAmount, setFuelChargeAmount] = useState<number>(defaultFuelCharge);

  // При изменении уровня топлива обновляем расчетное начисление
  useEffect(() => {
    const shortage = Math.max(0, fuelAtHandover - returnFuelLevel);
    if (shortage > 0) {
      setFuelChargeAmount(Math.round(shortage * 0.6 * 1.4));
    } else {
      setFuelChargeAmount(0);
    }
  }, [returnFuelLevel, fuelAtHandover]);

  // 3. Осмотр повреждений и сверка с видео выдачи
  const [videoVerified, setVideoVerified] = useState<boolean>(true);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [hasNewDamages, setHasNewDamages] = useState<boolean>(false);
  const [damagesDescription, setDamagesDescription] = useState<string>("");
  const [damageChargeAmount, setDamageChargeAmount] = useState<number>(0);
  const [damagePhotoUrl, setDamagePhotoUrl] = useState<string>("");

  // Чек-лист деталей кузова
  const [inspectedItems, setInspectedItems] = useState<{ [key: string]: boolean }>({
    frontBumper: true,
    windshield: true,
    sideMirrors: true,
    doorsAndFenders: true,
    rearBumper: true,
    tiresAndRims: true,
    interiorCleanliness: true,
  });

  const toggleInspectedItem = (key: string) => {
    setInspectedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 3.5. Проверка наличия оригинала техпаспорта в автомобиле
  const [techPassportReturned, setTechPassportReturned] = useState<boolean>(true);
  const [lostTechPassportCharge, setLostTechPassportCharge] = useState<number>(100); // 100 USD (270 GEL) за восстановление в Сервисном Агентстве МВД

  // 4. Штрафы ПДД (protocol.ge / Videos Police GE)
  const [trafficFines, setTrafficFines] = useState<any[]>(booking.trafficFines || []);
  const [selectedFineIds, setSelectedFineIds] = useState<string[]>([]);
  const [finesPaidByClientToCompany, setFinesPaidByClientToCompany] = useState<boolean>(true);
  const [loadingFines, setLoadingFines] = useState<boolean>(false);

  // Загрузка штрафов для автомобиля, если они не были вложены
  useEffect(() => {
    const fetchFinesForCar = async () => {
      try {
        setLoadingFines(true);
        const res = await fetch(`/api/fines?city=ALL`);
        const json = await res.json();
        if (json.success && json.fines) {
          const relevantFines = json.fines.filter(
            (f: any) => f.carId === car.id && (f.status === "UNPAID" || f.bookingId === booking.id)
          );
          setTrafficFines(relevantFines);
          // По умолчанию выбираем все неоплаченные штрафы за время аренды
          setSelectedFineIds(relevantFines.map((f: any) => f.id));
        }
      } catch (e) {
        console.error("Error loading fines:", e);
      } finally {
        setLoadingFines(false);
      }
    };

    if (!booking.trafficFines || booking.trafficFines.length === 0) {
      fetchFinesForCar();
    } else {
      setSelectedFineIds(booking.trafficFines.filter((f: any) => f.status === "UNPAID").map((f: any) => f.id));
    }
  }, [car.id, booking.id, booking.trafficFines]);

  const toggleFineSelection = (fineId: string) => {
    setSelectedFineIds((prev) =>
      prev.includes(fineId) ? prev.filter((id) => id !== fineId) : [...prev, fineId]
    );
  };

  // Сумма выбранных штрафов (в GEL и USD)
  const selectedFinesTotalGEL = useMemo(() => {
    return trafficFines
      .filter((f) => selectedFineIds.includes(f.id))
      .reduce((sum, f) => sum + (f.amountGEL || 0), 0);
  }, [trafficFines, selectedFineIds]);

  const selectedFinesTotalUSD = useMemo(() => {
    return Math.round(selectedFinesTotalGEL / 2.7);
  }, [selectedFinesTotalGEL]);

  // 5. Проверка сдачи (Change on Return)
  // Ищем в платежах сдачи или pendingChangeAmount
  const recordedChangePayment = booking.payments?.find(
    (p: any) => p.changeOnReturn && p.changeOnReturn > 0
  );
  const recordedChangeAmount = booking.pendingChangeAmount || recordedChangePayment?.changeOnReturn || 0;
  const [changeReturnedToClient, setChangeReturnedToClient] = useState<number>(recordedChangeAmount);

  // 6. Залог (Депозит): "В большинстве случаев залог отсутствует, но опция должна быть"
  const depositAmount = booking.depositAmount ?? 0;
  const hasDeposit = depositAmount > 0;

  // 6.5. Дополнительные часы (Extra hours) при задержке возврата
  const scheduledEndDate = new Date(booking.endDate);
  const delayMs = Date.now() - scheduledEndDate.getTime();
  const autoDetectedDelayHours = delayMs > 15 * 60 * 1000
    ? Math.ceil(delayMs / (60 * 60 * 1000))
    : 0;

  const [extraHours, setExtraHours] = useState<number>(
    booking.extraHoursCount || autoDetectedDelayHours
  );
  const [isExtraHoursPaid, setIsExtraHoursPaid] = useState<boolean>(
    booking.isExtraHoursPaid || false
  );

  const hoursCalc = calculateExtraHoursFee(extraHours, booking.dailyRate || 50);
  const extraHoursFee = hoursCalc.totalFee;
  const extraHoursToDeduct = !isExtraHoursPaid ? extraHoursFee : 0;

  // 7. Взаиморасчет
  const [managerName, setManagerName] = useState<string>("Менеджер смены (Грузия)");
  const [settlementMethod, setSettlementMethod] = useState<string>("CASH");
  const [extraWashFee, setExtraWashFee] = useState<number>(0);
  const [conditionNotes, setConditionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [returnResult, setReturnResult] = useState<any | null>(null);

  // Общие начисления/удержания:
  const finesToDeduct = finesPaidByClientToCompany ? selectedFinesTotalUSD : 0;
  const lostPassportFee = !techPassportReturned ? lostTechPassportCharge : 0;
  const deductionsTotal = fuelChargeAmount + (hasNewDamages ? damageChargeAmount : 0) + finesToDeduct + extraWashFee + lostPassportFee + extraHoursToDeduct;

  // Итоговый баланс:
  // Если есть залог: Баланс = (Залог + Сдача) - Удержания
  // Если без залога: Баланс = Сдача - Удержания
  // Если Баланс > 0: К возврату клиенту (REFUND_TO_CLIENT)
  // Если Баланс < 0: К доплате клиентом (PAYMENT_BY_CLIENT)
  // Если Баланс === 0: Взаиморасчет закрыт (ZERO_SETTLED)
  const rawBalance = (depositAmount + changeReturnedToClient) - deductionsTotal;

  const finalBalanceType: "REFUND_TO_CLIENT" | "PAYMENT_BY_CLIENT" | "ZERO_SETTLED" =
    rawBalance > 0 ? "REFUND_TO_CLIENT" : rawBalance < 0 ? "PAYMENT_BY_CLIENT" : "ZERO_SETTLED";

  const finalBalanceAmount = Math.abs(rawBalance);

  // Проверка окончания страховки, утери техпаспорта или просрочки ТО по маслу (Авто-СТОП)
  const now = new Date();
  const isInsuranceExpired = car.insuranceExpiryDate
    ? new Date(car.insuranceExpiryDate) <= now
    : false;
  const willStopBlock = isInsuranceExpired || !techPassportReturned || isOilOverdue;

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/bookings/${booking.id}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerName,
          returnMileage,
          returnFuelLevel,
          fuelDiscrepancyPerc: fuelShortagePercent,
          fuelChargeAmount,
          videoVerified,
          hasNewDamages,
          damagesDescription: hasNewDamages ? damagesDescription : null,
          damageChargeAmount: hasNewDamages ? damageChargeAmount : 0,
          damagePhotosJson: damagePhotoUrl ? JSON.stringify([damagePhotoUrl]) : null,
          techPassportReturned,
          lostTechPassportCharge: lostPassportFee,
          needsWash,
          cleanlinessState,
          finesChecked: true,
          finesDetectedCount: trafficFines.length,
          finesTotalAmountGEL: selectedFinesTotalGEL,
          finesTotalAmountUSD: selectedFinesTotalUSD,
          finesPaidByClientToCompany,
          selectedFineIds: finesPaidByClientToCompany ? selectedFineIds : [],
          depositAmount,
          changeReturnedToClient,
          extraHoursCount: extraHours,
          extraHoursFee,
          isExtraHoursPaid,
          deductionsTotal,
          finalBalanceType,
          finalBalanceAmount,
          settlementMethod,
          conditionNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setReturnResult(json);
        onCompleted(json);
      } else {
        alert("Ошибка при приеме авто: " + (json.error || "Неизвестная ошибка"));
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сетевого запроса при оформлении возврата");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Чек-лист возврата автомобиля
              </span>
              <span className="text-xs text-slate-400 font-mono">№ {booking.bookingNumber}</span>
              {hasDeposit ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
                  С залогом (${depositAmount})
                </span>
              ) : (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  Без залога ($0)
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-1">
              Осмотр, штрафы & окончательный взаиморасчет
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {returnResult ? (
          /* ================= SUCCESS SCREEN ================= */
          <div className="space-y-4 py-4 text-center overflow-y-auto">
            {returnResult.isStopBlocked ? (
              <div className="bg-red-950/40 border-2 border-red-500 rounded-2xl p-5 space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center mx-auto text-white shadow-lg animate-pulse">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-red-300">
                  АВТОМОБИЛЬ АВТОМАТИЧЕСКИ ПОСТАВЛЕН НА СТОП!
                </h3>
                <p className="text-xs text-red-200 leading-relaxed font-semibold">
                  {returnResult.stopReason}
                </p>
                <div className="text-[11px] text-slate-300 bg-black/60 p-3.5 rounded-xl border border-red-500/30 text-left space-y-1">
                  <div>🚗 Автомобиль: <strong>{car.brand} {car.model} ({car.plateNumber})</strong></div>
                  <div>⛔ Статус в системе: <span className="text-red-400 font-bold">СТОП (Блокировка выдачи)</span></div>
                  <div>🧼 Подготовка: <span className={needsWash ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                    {needsWash ? "Направлен на мойку" : "Чистый (мойка не требуется)"}
                  </span></div>
                  <div>📢 Уведомление разослано руководству и отображается в колокольчике.</div>
                  <div>💡 Новые бронирования заблокированы до устранения причины блокировки (ТО, страховка, техпаспорт).</div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-2xl p-5 space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center mx-auto text-white shadow-lg">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-emerald-300">
                  Автомобиль успешно принят из аренды!
                </h3>
                <p className="text-xs text-slate-300">
                  {!needsWash
                    ? "Автомобиль чистый, масло и документы в полном порядке. Машина сразу переведена в статус «Свободен» без задержки на мойку!"
                    : "Техосмотр, страховка и масло в порядке. Машина переведена в очередь на мойку."}
                </p>
              </div>
            )}

            {/* Финансовый итог в акте сдачи */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs">
              <span className="font-bold text-slate-300 block border-b border-slate-800 pb-1.5 flex items-center justify-between">
                <span>📄 Итог взаиморасчета при возврате:</span>
                <span className="text-slate-500 font-mono">Способ: {settlementMethod}</span>
              </span>

              <div className="flex justify-between py-0.5 text-slate-300">
                <span>Итоговый баланс:</span>
                <span className={`font-mono font-black text-sm ${
                  finalBalanceType === "REFUND_TO_CLIENT" ? "text-emerald-400" :
                  finalBalanceType === "PAYMENT_BY_CLIENT" ? "text-amber-400" : "text-slate-300"
                }`}>
                  {finalBalanceType === "REFUND_TO_CLIENT" && `Выдано клиенту: ${finalBalanceAmount} ₾ (GEL)`}
                  {finalBalanceType === "PAYMENT_BY_CLIENT" && `Получено с клиента: ${finalBalanceAmount} ₾ (GEL)`}
                  {finalBalanceType === "ZERO_SETTLED" && `Взаиморасчет закрыт в 0`}
                </span>
              </div>

              {changeReturnedToClient > 0 && (
                <div className="flex justify-between py-0.5 text-blue-300">
                  <span>Сдача клиенту (из переплаты при выдаче):</span>
                  <span className="font-mono font-bold">{changeReturnedToClient} ₾ (GEL)</span>
                </div>
              )}

              {selectedFinesTotalUSD > 0 && finesPaidByClientToCompany && (
                <div className="flex justify-between py-0.5 text-rose-300">
                  <span>Оплата штрафов ПДД (клиент ➔ компании):</span>
                  <span className="font-mono font-bold">{selectedFinesTotalGEL} ₾ (GEL)</span>
                </div>
              )}

              {fuelChargeAmount > 0 && (
                <div className="flex justify-between py-0.5 text-amber-300">
                  <span>Доплата за недостающее топливо ({fuelShortagePercent}%):</span>
                  <span className="font-mono font-bold">{fuelChargeAmount} ₾ (GEL)</span>
                </div>
              )}

              {hasNewDamages && damageChargeAmount > 0 && (
                <div className="flex justify-between py-0.5 text-red-300">
                  <span>Ущерб за повреждения кузова/салона:</span>
                  <span className="font-mono font-bold">{damageChargeAmount} ₾ (GEL)</span>
                </div>
              )}

              {!techPassportReturned && (
                <div className="flex justify-between py-0.5 text-rose-400 font-bold">
                  <span>Удержание за утерю техпаспорта:</span>
                  <span className="font-mono font-bold">-{lostTechPassportCharge} ₾ (GEL)</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition active:scale-95"
            >
              Закрыть окно возврата
            </button>
          </div>
        ) : (
          /* ================= MAIN RETURN FORM ================= */
          <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs overflow-y-auto pr-1">
            
            {/* 1. Блок авто и клиента */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-900 rounded-xl text-amber-400 border border-slate-800">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-white text-sm">
                    {car.brand} {car.model}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="font-mono text-xs text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-bold">
                      {car.plateNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Город: {car.city?.nameRu || "Грузия"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-white text-sm">{booking.customer?.fullName}</div>
                <div className="text-slate-400 text-[11px] font-mono">{booking.customer?.phone}</div>
                <div className="text-slate-500 text-[10px]">
                  Паспорт: {booking.customer?.passportNumber}
                </div>
              </div>
            </div>

            {/* 2. Блок сверки с видео выдачи автомобиля */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <Video className="w-4 h-4 text-purple-400" />
                  <span>Видео & Фото фиксация при выдаче авто:</span>
                </span>

                {handoverReport?.carBodyVideoUrl ? (
                  <button
                    type="button"
                    onClick={() => setShowVideoModal(true)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[11px] font-bold shadow transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Смотреть видео выдачи</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Видео выдачи подтверждено менеджером
                  </span>
                )}
              </div>

              {/* Информация об исходном состоянии при передаче */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-400 block text-[10px]">Пробег при выдаче:</span>
                  <span className="font-mono font-bold text-white">{initialMileage.toLocaleString()} км</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Бак при выдаче:</span>
                  <span className="font-bold text-emerald-400">{fuelAtHandover}% ({(fuelAtHandover / 12.5).toFixed(0)}/8)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Менеджер выдачи:</span>
                  <span className="font-medium text-slate-300 truncate block">
                    {handoverReport?.managerName || "Менеджер"}
                  </span>
                </div>
              </div>

              {/* Галочка подтверждения сверки с видео */}
              <label className="flex items-center space-x-2 bg-purple-950/30 border border-purple-500/40 p-2 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoVerified}
                  onChange={(e) => setVideoVerified(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                />
                <span className="text-xs text-purple-200 font-semibold">
                  Сверено с видеозаписью выдачи (сомнений в происхождении дефектов нет)
                </span>
              </label>
            </div>

            {/* 3. Осмотр на новые повреждения */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Осмотр кузова и салона на новые повреждения:</span>
                </span>

                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setHasNewDamages(false);
                      setDamageChargeAmount(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      !hasNewDamages
                        ? "bg-emerald-600 text-white border-emerald-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    ✓ Повреждений нет
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasNewDamages(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      hasNewDamages
                        ? "bg-red-600 text-white border-red-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    ⚠️ Есть повреждения
                  </button>
                </div>
              </div>

              {/* Быстрый чек-лист зон */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => toggleInspectedItem("frontBumper")}
                  className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition ${
                    inspectedItems.frontBumper
                      ? "bg-slate-900/80 border-slate-700 text-slate-300"
                      : "bg-red-950/40 border-red-500/50 text-red-300"
                  }`}
                >
                  <span className={inspectedItems.frontBumper ? "text-emerald-400" : "text-red-400"}>
                    {inspectedItems.frontBumper ? "✓" : "⚠️"}
                  </span>
                  <span>Перед / оптика</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleInspectedItem("windshield")}
                  className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition ${
                    inspectedItems.windshield
                      ? "bg-slate-900/80 border-slate-700 text-slate-300"
                      : "bg-red-950/40 border-red-500/50 text-red-300"
                  }`}
                >
                  <span className={inspectedItems.windshield ? "text-emerald-400" : "text-red-400"}>
                    {inspectedItems.windshield ? "✓" : "⚠️"}
                  </span>
                  <span>Лобовое стекло</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleInspectedItem("doorsAndFenders")}
                  className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition ${
                    inspectedItems.doorsAndFenders
                      ? "bg-slate-900/80 border-slate-700 text-slate-300"
                      : "bg-red-950/40 border-red-500/50 text-red-300"
                  }`}
                >
                  <span className={inspectedItems.doorsAndFenders ? "text-emerald-400" : "text-red-400"}>
                    {inspectedItems.doorsAndFenders ? "✓" : "⚠️"}
                  </span>
                  <span>Двери / борта</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleInspectedItem("rearBumper")}
                  className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition ${
                    inspectedItems.rearBumper
                      ? "bg-slate-900/80 border-slate-700 text-slate-300"
                      : "bg-red-950/40 border-red-500/50 text-red-300"
                  }`}
                >
                  <span className={inspectedItems.rearBumper ? "text-emerald-400" : "text-red-400"}>
                    {inspectedItems.rearBumper ? "✓" : "⚠️"}
                  </span>
                  <span>Задний бампер</span>
                </button>
              </div>

              {/* Блок ввода при обнаружении повреждений */}
              {hasNewDamages && (
                <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-1 text-red-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Фиксация новых повреждений:</span>
                  </div>

                  <input
                    type="text"
                    value={damagesDescription}
                    onChange={(e) => setDamagesDescription(e.target.value)}
                    placeholder="Описание дефекта: царапина 15 см на двери, притерт диск..."
                    className="w-full bg-slate-900 border border-red-500/40 rounded-xl p-2 text-white text-xs focus:outline-none"
                    required={hasNewDamages}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">
                        Сумма ущерба к оплате (₾ GEL):
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={damageChargeAmount}
                        onChange={(e) => setDamageChargeAmount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-red-500/40 rounded-xl p-2 text-white font-mono font-bold"
                        required={hasNewDamages}
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-[10px] block mb-0.5">
                        Ссылка на фото дефекта (необязательно):
                      </label>
                      <input
                        type="text"
                        value={damagePhotoUrl}
                        onChange={(e) => setDamagePhotoUrl(e.target.value)}
                        placeholder="https://... фото дефекта"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3.5. Проверка наличия оригинала техпаспорта в автомобиле */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              techPassportReturned
                ? "bg-slate-950 border-slate-800"
                : "bg-red-950/60 border-2 border-red-500 shadow-xl shadow-red-950/50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                  <FileText className={`w-4 h-4 ${techPassportReturned ? "text-amber-400" : "text-red-400"}`} />
                  <span>Проверка наличия оригинала техпаспорта:</span>
                </span>

                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setTechPassportReturned(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      techPassportReturned
                        ? "bg-emerald-600 text-white border-emerald-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    ✓ В наличии (В бардачке)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTechPassportReturned(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      !techPassportReturned
                        ? "bg-red-600 text-white border-red-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    ⛔ Утерян / Не сдан
                  </button>
                </div>
              </div>

              {techPassportReturned ? (
                <div className="mt-2 p-2 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Оригинал техпаспорта проверен менеджером и находится в автомобиле</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-bold">ОК ✓</span>
                </div>
              ) : (
                <div className="mt-2.5 p-3 bg-red-950/80 border border-red-500 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-red-200 font-black">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                    <span>ВНИМАНИЕ: ОРИГИНАЛ ТЕХПАСПОРТА НЕ СДАН КЛИЕНТОМ!</span>
                  </div>
                  <p className="text-[11px] text-red-300 leading-relaxed">
                    Без техпаспорта эксплуатация авто в Грузии запрещена. Автомобиль будет <strong>АВТОМАТИЧЕСКИ ПОСТАВЛЕН НА СТОП</strong> до восстановления дубликата в Сервисном Агентстве МВД (Рустави/Батуми).
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-red-500/40">
                    <span className="text-red-200 font-bold text-[11px]">
                      Удержание с клиента за восстановление техпаспорта:
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-white">₾</span>
                      <input
                        type="number"
                        min="0"
                        value={lostTechPassportCharge}
                        onChange={(e) => setLostTechPassportCharge(Number(e.target.value))}
                        className="w-24 bg-slate-900 border border-red-500 rounded-lg p-1 text-right text-white font-mono font-black"
                      />
                      <span className="text-slate-400 text-[10px]">GEL</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Пробег и сверка уровня топлива */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Пробег */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Gauge className="w-4 h-4 text-amber-400" />
                    <span>Пробег при возврате (км):</span>
                  </span>
                  <span className="text-[10px] text-slate-500">был: {initialMileage.toLocaleString()}</span>
                </label>
                <input
                  type="number"
                  min={initialMileage}
                  value={returnMileage}
                  onChange={(e) => setReturnMileage(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] text-emerald-400 block font-mono">
                  + Пробег за аренду: {tripDistance.toLocaleString()} км
                </span>

                {/* Межсервисный интервал ТО (масло) */}
                <div className={`mt-2 p-2 rounded-xl border text-[11px] flex items-center justify-between ${
                  isOilOverdue
                    ? "bg-red-950/80 border-red-500 text-red-200"
                    : kmRemainingToOilChange < 1000
                    ? "bg-amber-950/50 border-amber-500/50 text-amber-200"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}>
                  <div className="flex items-center space-x-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Интервал ТО (масло):</span>
                  </div>
                  <span className={`font-mono font-bold ${
                    isOilOverdue
                      ? "text-red-400 animate-pulse"
                      : kmRemainingToOilChange < 1000
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}>
                    {isOilOverdue
                      ? `⛔ Просрочено на +${oilOverdueKm.toLocaleString()} км!`
                      : `Осталось: ${kmRemainingToOilChange.toLocaleString()} км (лимит ${nextOilMileage.toLocaleString()})`}
                  </span>
                </div>
              </div>

              {/* Уровень топлива */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
                <label className="text-slate-200 font-bold block flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Droplet className="w-4 h-4 text-cyan-400" />
                    <span>Уровень топлива при сдаче:</span>
                  </span>
                  <span className="text-[10px] text-slate-400">выдан с {fuelAtHandover}%</span>
                </label>

                <select
                  value={returnFuelLevel}
                  onChange={(e) => setReturnFuelLevel(Number(e.target.value))}
                  className={`w-full bg-slate-900 border rounded-xl p-2 text-white font-medium focus:outline-none ${
                    fuelShortagePercent > 0 ? "border-amber-500/70 text-amber-300" : "border-slate-700"
                  }`}
                >
                  <option value={100}>Полный бак (100% / 8 делений) - ОК</option>
                  <option value={87.5}>7/8 бака (87.5%)</option>
                  <option value={75}>6/8 бака (75%)</option>
                  <option value={62.5}>5/8 бака (62.5%)</option>
                  <option value={50}>Половина бака (50% / 4 деления)</option>
                  <option value={37.5}>3/8 бака (37.5%)</option>
                  <option value={25}>Четверть бака (25% / 2 деления)</option>
                  <option value={12.5}>1/8 бака (12.5%)</option>
                  <option value={5}>Пустой бак (лампочка горит)</option>
                </select>

                {fuelShortagePercent > 0 ? (
                  <div className="flex items-center justify-between text-[11px] text-amber-300 pt-0.5">
                    <span>Нехватка: -{fuelShortagePercent}% (~{Math.round(fuelShortagePercent * 0.6)} л)</span>
                    <span className="font-mono font-bold">+{fuelChargeAmount} ₾ (GEL)</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400 block">
                    ✓ Уровень топлива в норме (соответствует выдаче)
                  </span>
                )}
              </div>
            </div>

            {/* 4.5. Чистота автомобиля и мойка */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Состояние чистоты и необходимость мойки:</span>
                </span>

                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNeedsWash(false);
                      setCleanlinessState("CLEAN");
                      setExtraWashFee(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      !needsWash
                        ? "bg-emerald-600 text-white border-emerald-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    ✨ Чистый (Мойка не нужна)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNeedsWash(true);
                      setCleanlinessState("DIRTY_BODY");
                      setExtraWashFee(0);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      needsWash && cleanlinessState === "DIRTY_BODY"
                        ? "bg-cyan-600 text-white border-cyan-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    🧼 Грязный кузов
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNeedsWash(true);
                      setCleanlinessState("DIRTY_INTERIOR");
                      setExtraWashFee(25);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                      needsWash && cleanlinessState === "DIRTY_INTERIOR"
                        ? "bg-amber-600 text-white border-amber-500 shadow"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    🫧 Химчистка салона
                  </button>
                </div>
              </div>

              {!needsWash ? (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Автомобиль чистый внутри и снаружи. Мойка не требуется — машина сразу готова к выдаче!</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-black">Готов к сдаче ✓</span>
                </div>
              ) : cleanlinessState === "DIRTY_BODY" ? (
                <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs text-cyan-300">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Обычная эксплуатационная пыль/грязь. Автомобиль после возврата будет направлен на мойку кузова.</span>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-400 font-bold">Очередь на мойку</span>
                </div>
              ) : (
                <div className="p-3 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2 text-xs text-amber-200">
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Сильное загрязнение салона / пятна на сиденьях (требуется химчистка):</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Требуется глубокая химчистка и сушка салона. Сумма списывается с клиента в счет затрат на клининг.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-500/30">
                    <span className="text-amber-200 font-semibold text-[11px]">
                      Стоимость химчистки к удержанию:
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-white">$</span>
                      <input
                        type="number"
                        min="0"
                        value={extraWashFee}
                        onChange={(e) => setExtraWashFee(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-amber-500 rounded-lg p-1 text-right text-white font-mono font-black"
                      />
                      <span className="text-slate-400 text-[10px]">USD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4.5. Дополнительные часы / Задержка возврата авто */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Дополнительные часы / Задержка возврата:</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Согласованный возврат:{" "}
                  <strong className="text-white">
                    {scheduledEndDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </strong>
                </span>
              </div>

              {/* Quick Hours Buttons */}
              <div>
                <label className="text-[11px] text-slate-400 block mb-1.5">
                  Часов задержки / продления:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setExtraHours(h)}
                      className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition text-center ${
                        extraHours === h
                          ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-400"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {h === 0 ? "Вовремя" : h === 1 ? "+1 ч (0 ₾)" : `+${h} ч`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Или указать точное число часов:</span>
                  <input
                    type="number"
                    min="0"
                    value={extraHours}
                    onChange={(e) => setExtraHours(Math.max(0, Number(e.target.value)))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-white text-xs"
                  />
                  <span className="text-slate-400 text-[11px]">ч.</span>
                </div>
              </div>

              {/* Extra Hours Rule & Calculation Box */}
              <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Тариф доп. часов:</span>
                  </span>
                  <span className="font-mono font-bold text-amber-300">
                    {hoursCalc.ratePerHour} ₾/ч (при цене авто {booking.dailyRate || 50} ₾/сутки)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  +1 час бесплатно • Следующие 6 часов (2-7 ч): 10/15/20 ₾/ч • Свыше 7 часов: полные сутки
                </p>

                <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Начислено:</span>
                  <span className="font-mono font-black text-amber-400">
                    {extraHoursFee > 0 ? `${extraHoursFee} ₾ (${hoursCalc.explanation})` : "0 ₾ (Без доплаты)"}
                  </span>
                </div>
                {extraHoursFee > 0 && (
                  <div className="mt-1 text-[10px] text-emerald-400 font-medium">
                    💰 Сумма за доп. часы поступает в кассу автопроката (не влияет на выплату владельцу).
                  </div>
                )}
              </div>

              {/* Paid earlier toggle */}
              {extraHoursFee > 0 && (
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <label htmlFor="hoursPaidEarlier" className="text-xs text-slate-300 cursor-pointer flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hoursPaidEarlier"
                      checked={isExtraHoursPaid}
                      onChange={(e) => setIsExtraHoursPaid(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <span>Оплачено ранее (при выдаче авто или продлении по звонку)</span>
                  </label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isExtraHoursPaid ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"
                  }`}>
                    {isExtraHoursPaid ? "Оплачено" : "К удержанию"}
                  </span>
                </div>
              )}
            </div>

            {/* 5. Проверка штрафов (protocol.ge) */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Штрафы с камер МВД (protocol.ge):</span>
                </span>

                <span className="text-[11px] font-mono text-slate-400">
                  Госномер: <strong className="text-white">{car.plateNumber}</strong>
                </span>
              </div>

              {trafficFines.length === 0 ? (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Штрафов за период поездки не обнаружено (protocol.ge чист) ✓</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-rose-300 font-bold">
                      <span className="flex items-center space-x-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Обнаружены штрафы за период аренды:</span>
                      </span>
                      <span className="font-mono">{trafficFines.length} шт.</span>
                    </div>

                    {trafficFines.map((fine) => {
                      const isSelected = selectedFineIds.includes(fine.id);
                      return (
                        <div
                          key={fine.id}
                          onClick={() => toggleFineSelection(fine.id)}
                          className={`p-2 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition ${
                            isSelected
                              ? "bg-slate-900 border-amber-500/60 text-white"
                              : "bg-slate-950/80 border-slate-800 text-slate-400 opacity-60"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleFineSelection(fine.id)}
                              className="rounded text-amber-500 focus:ring-amber-400 w-4 h-4"
                            />
                            <div>
                              <div className="font-bold text-slate-200">{fine.protocolNumber}</div>
                              <div className="text-[10px] text-slate-400">
                                {fine.articleName || "Превышение скорости"} • {new Date(fine.violationDate).toLocaleDateString("ru-RU")}
                              </div>
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-black text-rose-400">{fine.amountGEL} GEL</div>
                            <div className="text-[10px] text-slate-400">≈ ${Math.round(fine.amountGEL / 2.7)} USD</div>
                          </div>
                        </div>
                      );
                    })}

                    <label className="flex items-center space-x-2 pt-1.5 border-t border-rose-500/30 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={finesPaidByClientToCompany}
                        onChange={(e) => setFinesPaidByClientToCompany(e.target.checked)}
                        className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                      />
                      <span className="text-xs text-rose-200 font-bold">
                        Клиент оплачивает нам сумму штрафа на месте ({selectedFinesTotalGEL} GEL / ${selectedFinesTotalUSD}), а мы погашаем в полицию
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 6. Проверка сдачи (Change on Return) */}
            {recordedChangeAmount > 0 && (
              <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Coins className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-blue-200 text-xs uppercase">
                      Зафиксирована сдача клиенту при выдаче:
                    </h4>
                    <p className="text-[11px] text-blue-300/90">
                      Клиент передал круглую сумму при выдаче авто. Необходимо выдать сдачу при возврате.
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-blue-400 font-mono">
                    ${changeReturnedToClient} USD
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={changeReturnedToClient}
                    onChange={(e) => setChangeReturnedToClient(Number(e.target.value))}
                    className="w-20 bg-slate-900 border border-blue-500/40 rounded px-1.5 py-0.5 text-xs text-right text-white font-mono"
                    title="Скорректировать сдачу при необходимости"
                  />
                </div>
              </div>
            )}

            {/* 7. ⚠️ Авто-СТОП предупреждение */}
            {willStopBlock ? (
              <div className="bg-red-950/40 border-2 border-red-500 rounded-2xl p-3.5 shadow-xl space-y-1.5 animate-in slide-in-from-top-1">
                <div className="flex items-start space-x-2.5">
                  <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-red-300 text-xs uppercase">
                      Внимание: Автомобиль встанет на СТОП при возврате!
                    </h4>
                    <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
                      {isOilOverdue && (
                        <span>• 🛢️ <strong>Просрочен интервал замены масла:</strong> пробег {returnMileage.toLocaleString()} км превысил лимит ТО ({nextOilMileage.toLocaleString()} км) на +{oilOverdueKm.toLocaleString()} км. Требуется замена масла на СТО! </span>
                      )}
                      {!techPassportReturned && (
                        <span>• 📑 <strong>Не сдан техпаспорт:</strong> эксплуатация авто запрещена до восстановления дубликата в МВД. </span>
                      )}
                      {isInsuranceExpired && (
                        <span>• Истек полис КАСКО: {new Date(car.insuranceExpiryDate).toLocaleDateString("ru-RU")}. </span>
                      )}
                    </p>
                    <p className="text-[10px] text-red-300/80 font-medium italic">
                      Система автоматически заблокирует авто для новых броней до прохождения ТО или продления документов.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Техосмотр, страховка, техпаспорт и интервал ТО в норме.{" "}
                    {!needsWash
                      ? "Автомобиль чистый — готов к следующей сдаче без мойки!"
                      : "После мойки авто станет свободно для выдачи."}
                  </span>
                </div>
                {!needsWash && (
                  <span className="font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 text-[10px] shrink-0">
                    Сразу свободен ✓
                  </span>
                )}
              </div>
            )}

            {/* 8. ИТОГОВЫЙ СВОДНЫЙ БАЛАНС И ВЗАИМОРАСЧЕТ */}
            <div className="bg-slate-950 p-4 rounded-2xl border-2 border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-black text-white flex items-center space-x-1.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span>Итоговый взаиморасчет на руки:</span>
                </span>

                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="text-slate-400">Способ:</span>
                  <select
                    value={settlementMethod}
                    onChange={(e) => setSettlementMethod(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white font-medium focus:outline-none"
                  >
                    <option value="CASH">💵 Наличные (CASH)</option>
                    <option value="CARD_POS">💳 Терминал (POS)</option>
                    <option value="BOG_BANK">🏦 Bank of Georgia</option>
                    <option value="TBC_BANK">🏦 TBC Bank</option>
                  </select>
                </div>
              </div>

              {/* Детализация строк */}
              <div className="space-y-1.5 text-xs text-slate-300">
                {hasDeposit && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Депозит (залог по брони):</span>
                    <span className="font-mono text-emerald-400 font-bold">+${depositAmount} USD</span>
                  </div>
                )}

                {changeReturnedToClient > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-300">Сдача клиенту (из переплаты):</span>
                    <span className="font-mono text-blue-400 font-bold">+${changeReturnedToClient} USD</span>
                  </div>
                )}

                {fuelChargeAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Недостающее топливо ({fuelShortagePercent}%):</span>
                    <span className="font-mono font-bold">-${fuelChargeAmount} USD</span>
                  </div>
                )}

                {hasNewDamages && damageChargeAmount > 0 && (
                  <div className="flex justify-between text-red-300">
                    <span>Ущерб за повреждения ({damagesDescription || "кузов"}):</span>
                    <span className="font-mono font-bold">-${damageChargeAmount} USD</span>
                  </div>
                )}

                {!techPassportReturned && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Утеря техпаспорта (восстановление в МВД Грузии):</span>
                    <span className="font-mono">-${lostTechPassportCharge} USD</span>
                  </div>
                )}

                {finesToDeduct > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Штрафы ПДД (клиент оплачивает компании):</span>
                    <span className="font-mono font-bold">-${finesToDeduct} USD ({selectedFinesTotalGEL} GEL)</span>
                  </div>
                )}

                {extraHoursFee > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Доп. часы (+{extraHours} ч{isExtraHoursPaid ? " — оплачено ранее" : ""}):</span>
                    <span className="font-mono font-bold">
                      {isExtraHoursPaid ? "0 ₾ (Оплачено)" : `-${extraHoursFee} ₾`}
                    </span>
                  </div>
                )}
              </div>

              {/* Главная плашка ИТОГО */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                finalBalanceType === "REFUND_TO_CLIENT"
                  ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200"
                  : finalBalanceType === "PAYMENT_BY_CLIENT"
                  ? "bg-amber-950/60 border-amber-500/80 text-amber-200"
                  : "bg-slate-900 border-slate-700 text-slate-200"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block opacity-80">
                    {finalBalanceType === "REFUND_TO_CLIENT" && "К возврату клиенту на руки:"}
                    {finalBalanceType === "PAYMENT_BY_CLIENT" && "К доплате клиентом:"}
                    {finalBalanceType === "ZERO_SETTLED" && "Взаиморасчет:"}
                  </span>
                  <span className="text-xs font-bold">
                    {finalBalanceType === "REFUND_TO_CLIENT" && (hasDeposit ? "Остаток залога + сдача" : "Сдача клиенту")}
                    {finalBalanceType === "PAYMENT_BY_CLIENT" && "Оплата штрафов, топлива и дефектов"}
                    {finalBalanceType === "ZERO_SETTLED" && "Все платежи закрыты в ноль"}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xl font-black">
                    ${finalBalanceAmount} USD
                  </div>
                  <div className="text-[10px] opacity-75">
                    ≈ {Math.round(finalBalanceAmount * 2.7)} GEL
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs font-bold"
              >
                Отмена
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex items-center space-x-2 px-6 py-2.5 font-black rounded-xl shadow-lg transition active:scale-95 ${
                  willStopBlock
                    ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white"
                    : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Сохранение..."
                    : willStopBlock
                    ? "Принять авто и поставить на СТОП"
                    : "Завершить возврат и закрыть бронь"}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* Modal: Просмотр видео кругового осмотра при выдаче */}
        {showVideoModal && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-sm flex items-center space-x-2">
                  <Video className="w-4 h-4 text-purple-400" />
                  <span>Видео кругового осмотра при выдаче авто</span>
                </span>
                <button onClick={() => setShowVideoModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                {handoverReport?.carBodyVideoUrl?.startsWith("http") ? (
                  <video
                    src={handoverReport.carBodyVideoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Video className="w-10 h-10 mx-auto text-purple-400 animate-pulse" />
                    <p className="text-xs">
                      Видеофиксация кузова: <strong>{handoverReport?.carBodyVideoUrl || "Круговой осмотр (видеофайл)"}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Менеджер {handoverReport?.managerName} зафиксировал отсутствие внешних дефектов при передаче клиенту.
                    </p>
                  </div>
                )}
              </div>

              {handoverReport?.dashboardPhotoUrl && (
                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span>Фото щитка приборов при выдаче:</span>
                  <a
                    href={handoverReport.dashboardPhotoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center space-x-1 font-bold"
                  >
                    <span>Открыть фото одометра</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowVideoModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                Закрыть видео
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};