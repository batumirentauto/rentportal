import React, { useState, useMemo, useEffect } from "react";
import { calculateExtraHoursFee } from "@/lib/extra-hours";
import { getCarTankVolume, FUEL_PRICE_95_GEL, getFuelRate, calculateFuelShortage } from "@/lib/fuelSpecs";
import { MileageInput } from "./MileageInput";
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
  Loader2,
  Trash2,
  Upload,
  Download,
} from "lucide-react";

interface ReturnWizardModalProps {
  booking: any;
  currentUserName?: string;
  onClose: () => void;
  onCompleted: (result: any) => void;
}

export const ReturnWizardModal: React.FC<ReturnWizardModalProps> = ({
  booking,
  currentUserName,
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

  // 2. Уровень топлива и расчет недостачи по фактическому объему бака
  const tankCapacity = getCarTankVolume(car);
  const isElectric = car?.fuelType === "ELECTRIC" || tankCapacity === 0;
  const isDiesel = car?.fuelType === "DIESEL";
  const fuelRate = getFuelRate(car);
  const fuelTypeLabel = isDiesel ? "Дизель" : "95-й бензин";
  const fuelAtHandover = handoverReport?.fuelLevelPercent ?? 100;
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(fuelAtHandover);
  const fuelShortagePercent = Math.max(0, fuelAtHandover - returnFuelLevel);

  // Расчет недостачи на основе реального объема бака автомобиля
  const initialFuelCalc = calculateFuelShortage(fuelShortagePercent, tankCapacity, fuelRate);
  const [fuelChargeAmount, setFuelChargeAmount] = useState<number>(initialFuelCalc.chargeAmount);

  // При изменении уровня топлива обновляем расчетное начисление
  useEffect(() => {
    const shortage = Math.max(0, fuelAtHandover - returnFuelLevel);
    const calc = calculateFuelShortage(shortage, tankCapacity, fuelRate);
    setFuelChargeAmount(calc.chargeAmount);
  }, [returnFuelLevel, fuelAtHandover, tankCapacity, fuelRate]);

  const shortageLiters = isElectric ? 0 : Math.round((fuelShortagePercent / 100) * tankCapacity * 10) / 10;

  // 3. Осмотр повреждений и сверка с видео выдачи
  const [videoVerified, setVideoVerified] = useState<boolean>(true);
  const [showVideoModal, setShowVideoModal] = useState<boolean>(false);
  const [returnVideoUrl, setReturnVideoUrl] = useState<string>("");
  const [isUploadingReturnVideo, setIsUploadingReturnVideo] = useState<boolean>(false);
  const [hasNewDamages, setHasNewDamages] = useState<boolean>(false);
  const [damagesDescription, setDamagesDescription] = useState<string>("");
  const [damageChargeAmount, setDamageChargeAmount] = useState<number>(0);
  const [damagePhotoUrl, setDamagePhotoUrl] = useState<string>("");
  const [isUploadingDamagePhoto, setIsUploadingDamagePhoto] = useState<boolean>(false);

  const handleReturnVideoUpload = async (file: File) => {
    try {
      setIsUploadingReturnVideo(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "inspections_video");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка загрузки видео возврата");
      }
      setReturnVideoUrl(data.url);
    } catch (err: any) {
      alert("Не удалось загрузить видео возврата: " + (err.message || "Ошибка"));
    } finally {
      setIsUploadingReturnVideo(false);
    }
  };

  const handleDamagePhotoUpload = async (file: File) => {
    try {
      setIsUploadingDamagePhoto(true);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "damages");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка загрузки фото");
      }
      setDamagePhotoUrl(data.url);
    } catch (err: any) {
      alert("Не удалось загрузить фото: " + (err.message || "Ошибка"));
    } finally {
      setIsUploadingDamagePhoto(false);
    }
  };

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
  const [lostTechPassportCharge, setLostTechPassportCharge] = useState<number>(250); // 250 GEL за восстановление в Сервисном Агентстве МВД Грузии

  // 4. Штрафы ПДД (protocols.ge / Videos Police GE)
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

  // Copy to clipboard helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
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
  const [customExtraHoursFee, setCustomExtraHoursFee] = useState<number | null>(
    booking.extraHoursFee ? Number(booking.extraHoursFee) : null
  );

  // Если менеджер указал сумму продления вручную (договорились с клиентом) — используем её, иначе расчет по тарифу
  const extraHoursFee = customExtraHoursFee !== null ? customExtraHoursFee : hoursCalc.totalFee;
  const extraHoursToDeduct = !isExtraHoursPaid ? extraHoursFee : 0;

  // 6.7. Неоплаченные продления аренды (Booking Extensions with PENDING or ON_RETURN status)
  const [extensions, setExtensions] = useState<any[]>(booking.extensions || []);

  useEffect(() => {
    const fetchLatestBooking = async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`);
        const data = await res.json();
        if (data.success && data.booking?.extensions) {
          setExtensions(data.booking.extensions);
        }
      } catch (e) {
        console.error("Error fetching booking extensions:", e);
      }
    };
    if (booking?.id) {
      fetchLatestBooking();
    }
  }, [booking?.id]);

  const unpaidExtensions = useMemo(() => {
    return (extensions || []).filter(
      (ext: any) => ext.paymentStatus === "PENDING" || (ext.paymentTiming === "ON_RETURN" && ext.paymentStatus !== "PAID")
    );
  }, [extensions]);

  const unpaidExtensionsTotalAmount = useMemo(() => {
    return unpaidExtensions.reduce((sum: number, ext: any) => sum + (Number(ext.amount) || 0), 0);
  }, [unpaidExtensions]);

  const unpaidExtensionsTotalDays = useMemo(() => {
    return unpaidExtensions.reduce((sum: number, ext: any) => sum + (Number(ext.extraDays) || 0), 0);
  }, [unpaidExtensions]);

  const unpaidExtensionsTotalHours = useMemo(() => {
    return unpaidExtensions.reduce((sum: number, ext: any) => sum + (Number(ext.extraHours) || 0), 0);
  }, [unpaidExtensions]);

  const [includeUnpaidExtensions, setIncludeUnpaidExtensions] = useState<boolean>(true);
  const unpaidExtensionsToDeduct = (includeUnpaidExtensions && unpaidExtensionsTotalAmount > 0) ? unpaidExtensionsTotalAmount : 0;

  // 7. Взаиморасчет
  const [managerName, setManagerName] = useState<string>(() => {
    if (currentUserName && currentUserName !== "Менеджер смены") return currentUserName;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rentportal_manager_name");
      if (stored) return stored;
    }
    return "Менеджер смены";
  });
  const [settlementMethod, setSettlementMethod] = useState<string>("CASH");
  const [extraWashFee, setExtraWashFee] = useState<number>(0);
  const [conditionNotes, setConditionNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [returnResult, setReturnResult] = useState<any | null>(null);

  // 8. Навешивание долга на клиента при возврате
  const [recordAsDebt, setRecordAsDebt] = useState<boolean>(false);
  const [debtAmount, setDebtAmount] = useState<number | "">("");
  const [debtCategory, setDebtCategory] = useState<string>("GENERAL");
  const [debtDescription, setDebtDescription] = useState<string>("");
  const [debtDueDate, setDebtDueDate] = useState<string>("");
  const [debtNotes, setDebtNotes] = useState<string>("");

  // Общие начисления/удержания:
  const finesToDeduct = finesPaidByClientToCompany ? selectedFinesTotalGEL : 0;
  const lostPassportFee = !techPassportReturned ? lostTechPassportCharge : 0;
  const deductionsTotal = fuelChargeAmount + (hasNewDamages ? damageChargeAmount : 0) + finesToDeduct + extraWashFee + lostPassportFee + extraHoursToDeduct + unpaidExtensionsToDeduct;

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

  const handleSubmitReturn = async (e?: React.FormEvent, forceSkipStop: boolean = false) => {
    if (e) e.preventDefault();
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
          returnVideoUrl: returnVideoUrl || null,
          hasNewDamages,
          damagesDescription: hasNewDamages ? damagesDescription : null,
          damageChargeAmount: hasNewDamages ? damageChargeAmount : 0,
          damagePhotosJson: damagePhotoUrl ? JSON.stringify([damagePhotoUrl]) : null,
          techPassportReturned,
          lostTechPassportCharge: lostPassportFee,
          needsWash,
          cleanlinessState,
          extraWashFee,
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
          unpaidExtensionsAmount: unpaidExtensionsToDeduct,
          unpaidExtensionsDays: unpaidExtensionsTotalDays,
          deductionsTotal,
          finalBalanceType,
          finalBalanceAmount,
          settlementMethod,
          conditionNotes,
          skipStopBlock: forceSkipStop,
          recordAsDebt,
          debtAmount: Number(debtAmount !== "" ? debtAmount : finalBalanceAmount),
          debtCategory,
          debtDescription: debtDescription || "Задолженность при возврате автомобиля",
          debtDueDate: debtDueDate || null,
          debtNotes,
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
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
                  С залогом ({depositAmount} ₾)
                </span>
              ) : (
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-bold">
                  Без залога (0 ₾)
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

              {selectedFinesTotalGEL > 0 && finesPaidByClientToCompany && (
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

              {extraWashFee > 0 && (
                <div className="flex justify-between py-0.5 text-cyan-300">
                  <span>
                    {cleanlinessState === "DIRTY_INTERIOR_CLEAN"
                      ? "Только салон (уборка):"
                      : cleanlinessState === "DIRTY_BODY"
                      ? "Только кузов (мойка):"
                      : cleanlinessState === "FULL_WASH"
                      ? "Полная мойка (кузов + салон):"
                      : "Химчистка салона:"}
                  </span>
                  <span className="font-mono font-bold">{extraWashFee} ₾ (GEL)</span>
                </div>
              )}

              {extraHoursFee > 0 && (
                <div className="flex justify-between py-0.5 text-amber-300">
                  <span>Доплата за продление / задержку ({extraHours} ч):</span>
                  <span className="font-mono font-bold">{extraHoursFee} ₾ (GEL)</span>
                </div>
              )}

              {unpaidExtensionsToDeduct > 0 && (
                <div className="flex justify-between py-1 px-2.5 bg-rose-950/70 border border-red-500/50 rounded-lg text-rose-300 font-bold">
                  <span className="flex items-center space-x-1.5">
                    <span>🚨</span>
                    <span>Задолженность за продление ({unpaidExtensionsTotalDays > 0 ? `${unpaidExtensionsTotalDays} сут.` : ""}{unpaidExtensionsTotalHours > 0 ? ` +${unpaidExtensionsTotalHours} ч.` : ""}):</span>
                  </span>
                  <span className="font-mono font-black text-rose-200">+{unpaidExtensionsToDeduct} ₾ (GEL)</span>
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
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center space-x-3">
                <div className="p-2.5 bg-slate-900 rounded-xl text-amber-400 border border-slate-800 shrink-0">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-white text-sm flex items-center space-x-2 flex-wrap">
                    <span>{car.brand} {car.model}</span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-normal">
                      {car.city?.nameRu || "Грузия"}
                    </span>
                  </div>

                  {/* Номер машины и номер техпаспорта с кнопками копирования */}
                  <div className="flex items-center space-x-2.5 mt-1.5 flex-wrap gap-y-1">
                    {/* Номер машины (госномер) */}
                    <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Госномер:</span>
                      <span className="font-mono text-xs text-amber-400 font-bold">
                        {car.plateNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(car.plateNumber, `plate-header-${car.id}`)}
                        className={`p-1 rounded transition ${
                          copiedKey === `plate-header-${car.id}`
                            ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                            : "hover:bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                        title="Скопировать госномер авто"
                      >
                        {copiedKey === `plate-header-${car.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Номер техпаспорта */}
                    <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-0.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Техпаспорт:</span>
                      <span className="font-mono text-xs text-cyan-300 font-bold">
                        {car.techPassportNumber || "Не указан"}
                      </span>
                      {car.techPassportNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopy(car.techPassportNumber, `tp-header-${car.id}`)}
                          className={`p-1 rounded transition ${
                            copiedKey === `tp-header-${car.id}`
                              ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                              : "hover:bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                          title="Скопировать номер техпаспорта"
                        >
                          {copiedKey === `tp-header-${car.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-900">
                <div className="font-bold text-white text-sm">{booking.customer?.fullName}</div>
                <div className="text-slate-400 text-[11px] font-mono flex items-center sm:justify-end space-x-1">
                  <span>{booking.customer?.phone}</span>
                  {booking.customer?.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.customer.phone, `phone-header-${booking.id}`)}
                      className={`p-0.5 rounded transition ${
                        copiedKey === `phone-header-${booking.id}`
                          ? "text-emerald-400"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                      title="Скопировать телефон клиента"
                    >
                      {copiedKey === `phone-header-${booking.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
                <div className="text-slate-500 text-[10px]">
                  Паспорт: {booking.customer?.passportNumber || "Не указан"}
                </div>
              </div>
            </div>

            {/* 🚨 КРАСНЫЙ БЛОК: НЕОПЛАЧЕННОЕ ПРОДЛЕНИЕ АРЕНДЫ (ЗАДОЛЖЕННОСТЬ ЗА ПРОДЛЕНИЕ) */}
            {unpaidExtensions.length > 0 && (
              <div className="bg-gradient-to-r from-red-950 via-rose-950 to-slate-950 border-2 border-red-500 rounded-2xl p-4 space-y-3 shadow-2xl shadow-red-950/70 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 bg-red-600/30 border border-red-400 rounded-xl text-red-300 shrink-0 mt-0.5 animate-pulse">
                      <AlertTriangle className="w-5 h-5 text-red-300" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="text-sm font-black text-white">
                          🚨 ВИСИТ ЗАДОЛЖЕННОСТЬ ЗА ПРОДЛЕНИЕ АРЕНДЫ!
                        </span>
                        <span className="bg-red-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Не оплачено в моменте
                        </span>
                      </div>
                      <p className="text-xs text-red-200 mt-1 font-medium">
                        Клиент продлевал автомобиль, оплата не была внесена сразу (согласовано к удержанию при возврате).
                      </p>
                      <div className="mt-2 inline-flex items-center space-x-2 bg-red-900/60 border border-red-400/60 rounded-xl px-3 py-1.5">
                        <span className="text-xs text-red-200 font-bold">Сумма задолженности:</span>
                        <span className="font-mono text-base font-black text-white">
                          {unpaidExtensionsTotalAmount} ₾
                        </span>
                        <span className="text-red-300 text-xs font-semibold">
                          ({unpaidExtensionsTotalDays > 0 ? `за ${unpaidExtensionsTotalDays} сут.` : ""}{unpaidExtensionsTotalHours > 0 ? ` +${unpaidExtensionsTotalHours} ч.` : ""})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black font-mono text-red-400 block">
                      +{unpaidExtensionsTotalAmount} ₾
                    </span>
                    <label className="flex items-center space-x-1.5 text-[10px] text-red-300 font-bold cursor-pointer mt-1 justify-end">
                      <input
                        type="checkbox"
                        checked={includeUnpaidExtensions}
                        onChange={(e) => setIncludeUnpaidExtensions(e.target.checked)}
                        className="rounded bg-slate-900 border-red-500 text-red-600 focus:ring-0"
                      />
                      <span>Учесть в расчете</span>
                    </label>
                  </div>
                </div>

                {/* Детализация неоплаченных продлений */}
                <div className="space-y-1.5 pt-2 border-t border-red-500/30">
                  <span className="text-[10px] uppercase font-bold text-red-300 block tracking-wider">
                    Детализация неоплаченных продлений:
                  </span>
                  {unpaidExtensions.map((ext: any, idx: number) => (
                    <div
                      key={ext.id || idx}
                      className="bg-black/50 rounded-xl p-2.5 flex items-center justify-between text-xs border border-red-500/20 flex-wrap gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-black text-white">
                          Продление #{idx + 1}: {ext.extraDays > 0 ? `+${ext.extraDays} дн.` : ""}{ext.extraHours > 0 ? ` +${ext.extraHours} ч.` : ""}
                          <span className="text-slate-400 font-normal ml-1">
                            (до {new Date(ext.newEndDate).toLocaleDateString("ru-RU")} {new Date(ext.newEndDate).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })})
                          </span>
                        </span>
                        {ext.notes && <p className="text-[11px] text-slate-300 italic">«{ext.notes}»</p>}
                        {ext.managerName && <p className="text-[10px] text-slate-400">Оформил менеджер: {ext.managerName}</p>}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-amber-300 text-sm">+{ext.amount} ₾</span>
                        <span className="text-[10px] text-rose-300 font-bold block">Оплата при возврате</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <span className="font-bold text-emerald-400">
                    {fuelAtHandover === 100
                      ? "1 (100%)"
                      : fuelAtHandover === 75
                      ? "3/4 (75%)"
                      : fuelAtHandover === 50
                      ? "1/2 (50%)"
                      : fuelAtHandover === 25
                      ? "1/4 (25%)"
                      : fuelAtHandover === 0
                      ? "0 (0%)"
                      : `${fuelAtHandover}%`}
                  </span>
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

              {/* Видеофиксация кругового осмотра при возврате авто */}
              <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>Видеофиксация кузова при возврате (360°):</span>
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    хранение 4 мес.
                  </span>
                </div>

                {isUploadingReturnVideo ? (
                  <div className="py-4 flex flex-col items-center justify-center space-y-1 bg-slate-950/60 rounded-xl border border-slate-800">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                    <span className="text-xs text-purple-300 font-medium">Загрузка видео возврата...</span>
                    <span className="text-[9px] text-slate-400">Пожалуйста, подождите</span>
                  </div>
                ) : returnVideoUrl ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden border border-slate-700 bg-black max-h-32">
                      <video
                        src={returnVideoUrl}
                        controls
                        playsInline
                        className="w-full h-28 object-contain"
                      />
                    </div>
                    <div className="w-full bg-emerald-950/60 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-emerald-400 text-xs font-semibold">
                      <div className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Круговое видео возврата сохранено</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={`${returnVideoUrl}${returnVideoUrl.includes("?") ? "&" : "?"}download=1`}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-purple-300 hover:text-white hover:bg-purple-500/20 rounded-md transition"
                          title="Скачать видео возврата"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <div className="relative overflow-hidden cursor-pointer text-[10px] text-purple-300 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 px-2 py-1 rounded-md transition flex items-center">
                          <input
                            type="file"
                            accept="video/*,video/mp4,video/quicktime,video/mov"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleReturnVideoUpload(file);
                            }}
                          />
                          <span>Сменить</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReturnVideoUrl("")}
                          className="p-1 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-md transition"
                          title="Удалить видео"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden cursor-pointer w-full py-2.5 px-3 bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 shadow-sm">
                    <input
                      type="file"
                      accept="video/*,video/mp4,video/quicktime,video/mov"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleReturnVideoUpload(file);
                      }}
                    />
                    <Video className="w-4 h-4 text-purple-400" />
                    <span>Снять на камеру / Загрузить видео возврата</span>
                  </div>
                )}
              </div>
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
                        Фото дефекта / повреждения:
                      </label>
                      <div className="space-y-1.5">
                        {damagePhotoUrl ? (
                          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 p-2 rounded-xl">
                            <img
                              src={damagePhotoUrl}
                              alt="Повреждение"
                              className="w-12 h-12 object-cover rounded-lg border border-slate-700"
                            />
                            <div className="flex-1 truncate">
                              <span className="text-xs text-emerald-400 font-semibold block">✓ Фото загружено</span>
                              <a
                                href={damagePhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-sky-400 hover:underline block truncate"
                              >
                                {damagePhotoUrl}
                              </a>
                            </div>
                            <a
                              href={`${damagePhotoUrl}${damagePhotoUrl.includes("?") ? "&" : "?"}download=1`}
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition"
                              title="Скачать фото дефекта"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => setDamagePhotoUrl("")}
                              className="p-1.5 text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 rounded-lg"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <div className="relative overflow-hidden cursor-pointer flex-1 py-2 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition active:scale-95">
                              <input
                                type="file"
                                accept="image/*"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleDamagePhotoUpload(file);
                                }}
                              />
                              {isUploadingDamagePhoto ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Загрузка...</span>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-3.5 h-3.5 text-red-400" />
                                  <span>Снять на камеру / Загрузить фото</span>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        <input
                          type="text"
                          value={damagePhotoUrl}
                          onChange={(e) => setDamagePhotoUrl(e.target.value)}
                          placeholder="Или вставьте прямую ссылку https://..."
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white text-[11px]"
                        />
                      </div>
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
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                    <FileText className={`w-4 h-4 ${techPassportReturned ? "text-amber-400" : "text-red-400"}`} />
                    <span>Проверка наличия оригинала техпаспорта:</span>
                  </span>
                  {car.techPassportNumber && (
                    <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono">
                      <span className="text-slate-400">№</span>
                      <strong className="text-cyan-300">{car.techPassportNumber}</strong>
                      <button
                        type="button"
                        onClick={() => handleCopy(car.techPassportNumber, `tp-bar-${car.id}`)}
                        className={`p-0.5 rounded transition ${
                          copiedKey === `tp-bar-${car.id}`
                            ? "text-emerald-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Скопировать номер техпаспорта"
                      >
                        {copiedKey === `tp-bar-${car.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

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
              {/* Пробег с калькулятором Мили / Км */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                <MileageInput
                  valueKm={returnMileage}
                  onChangeKm={(km) => setReturnMileage(km)}
                  label="Пробег при возврате"
                  minKm={initialMileage}
                  previousKm={initialMileage}
                  required
                  subNote={
                    <span className="text-[10px] text-emerald-400 block font-mono pt-1">
                      + Пробег за аренду: {tripDistance.toLocaleString("ru-RU")} км
                    </span>
                  }
                />

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
                    {!isElectric && (
                      <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/50">
                        бак {tankCapacity} л
                      </span>
                    )}
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
                  <option value={100}>1 - Полный бак (100%) - ОК</option>
                  <option value={75}>3/4 бака (75%)</option>
                  <option value={50}>1/2 бака (50%)</option>
                  <option value={25}>1/4 бака (25%)</option>
                  <option value={0}>0 - Пустой бак (0%)</option>
                </select>

                {/* Quick preset buttons: 0, 1/4, 1/2, 3/4, 1 */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { label: "0", pct: "0%", val: 0 },
                    { label: "1/4", pct: "25%", val: 25 },
                    { label: "1/2", pct: "50%", val: 50 },
                    { label: "3/4", pct: "75%", val: 75 },
                    { label: "1", pct: "100%", val: 100 },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      type="button"
                      onClick={() => setReturnFuelLevel(btn.val)}
                      className={`py-1 px-1 rounded-lg border text-center transition active:scale-95 ${
                        returnFuelLevel === btn.val
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-black shadow"
                          : "bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white"
                      }`}
                    >
                      <span className="block text-xs font-bold leading-tight">{btn.label}</span>
                      <span className={`block text-[9px] ${returnFuelLevel === btn.val ? "text-slate-950 font-bold" : "text-slate-400"}`}>
                        {btn.pct}
                      </span>
                    </button>
                  ))}
                </div>

                {isElectric ? (
                  <span className="text-[10px] text-cyan-400 block">
                    ⚡ Электромобиль (топливный бак отсутствует)
                  </span>
                ) : fuelShortagePercent > 0 ? (
                  <div className="flex items-center justify-between text-[11px] text-amber-300 pt-0.5">
                    <span>
                      Нехватка: -{fuelShortagePercent}% (~{shortageLiters} л из {tankCapacity} л по {fuelRate.toFixed(2)} ₾/л • {fuelTypeLabel})
                    </span>
                    <span className="font-mono font-bold">+{fuelChargeAmount} ₾ (GEL)</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400 block">
                    ✓ Уровень топлива в норме (соответствует выдаче • бак {tankCapacity} л • {fuelTypeLabel})
                  </span>
                )}
              </div>
            </div>

            {/* 4.5. Чистота автомобиля и мойка */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Состояние чистоты и необходимость мойки / уборки:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {extraWashFee > 0 ? `К удержанию: ${extraWashFee} ₾` : "Без удержания"}
                </span>
              </div>

              {/* Responsive 5-column cleanliness presets */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNeedsWash(false);
                    setCleanlinessState("CLEAN");
                    setExtraWashFee(0);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center space-y-1 ${
                    !needsWash
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">✨</span>
                  <span className="leading-tight">Чистый</span>
                  <span className={`text-[10px] font-normal ${!needsWash ? "text-emerald-100" : "text-slate-500"}`}>
                    Без мойки (0 ₾)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNeedsWash(true);
                    setCleanlinessState("DIRTY_BODY");
                    setExtraWashFee(10);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center space-y-1 ${
                    needsWash && cleanlinessState === "DIRTY_BODY"
                      ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-cyan-300"
                  }`}
                >
                  <span className="text-base">🚗</span>
                  <span className="leading-tight">Только кузов</span>
                  <span className={`text-[10px] font-normal ${needsWash && cleanlinessState === "DIRTY_BODY" ? "text-cyan-100" : "text-slate-500"}`}>
                    Снаружи (10 ₾)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNeedsWash(true);
                    setCleanlinessState("DIRTY_INTERIOR_CLEAN");
                    setExtraWashFee(10);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center space-y-1 ${
                    needsWash && cleanlinessState === "DIRTY_INTERIOR_CLEAN"
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-blue-300"
                  }`}
                >
                  <span className="text-base">💺</span>
                  <span className="leading-tight">Только салон</span>
                  <span className={`text-[10px] font-normal ${needsWash && cleanlinessState === "DIRTY_INTERIOR_CLEAN" ? "text-blue-100" : "text-slate-500"}`}>
                    Внутри (10 ₾)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNeedsWash(true);
                    setCleanlinessState("FULL_WASH");
                    setExtraWashFee(20);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center space-y-1 ${
                    needsWash && cleanlinessState === "FULL_WASH"
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-indigo-300"
                  }`}
                >
                  <span className="text-base">🧼</span>
                  <span className="leading-tight">Полная мойка</span>
                  <span className={`text-[10px] font-normal ${needsWash && cleanlinessState === "FULL_WASH" ? "text-indigo-100" : "text-slate-500"}`}>
                    Комплекс (20 ₾)
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNeedsWash(true);
                    setCleanlinessState("DIRTY_INTERIOR");
                    setExtraWashFee(70);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center justify-center space-y-1 ${
                    needsWash && cleanlinessState === "DIRTY_INTERIOR"
                      ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-950/50"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-300"
                  }`}
                >
                  <span className="text-base">🫧</span>
                  <span className="leading-tight">Химчистка</span>
                  <span className={`text-[10px] font-normal ${needsWash && cleanlinessState === "DIRTY_INTERIOR" ? "text-amber-100" : "text-slate-500"}`}>
                    Пятна (~70 ₾)
                  </span>
                </button>
              </div>

              {!needsWash ? (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Автомобиль чистый внутри и снаружи. Мойка не требуется — сразу готов к следующей сдаче!</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-black">Готов ✓</span>
                </div>
              ) : cleanlinessState === "DIRTY_BODY" ? (
                <div className="p-2.5 bg-cyan-950/20 border border-cyan-500/30 rounded-xl space-y-2 text-xs text-cyan-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Мойка только кузова снаружи (экспресс-смыв пыли и грязи).</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-cyan-500/20">
                    <span className="text-cyan-200 text-[11px]">Стоимость мойки кузова к удержанию:</span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-cyan-400">₾</span>
                      <input
                        type="number"
                        min="0"
                        value={extraWashFee}
                        onChange={(e) => setExtraWashFee(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-cyan-500 rounded-lg p-1 text-right text-white font-mono font-bold"
                      />
                      <span className="text-slate-400 text-[10px]">GEL</span>
                    </div>
                  </div>
                </div>
              ) : cleanlinessState === "DIRTY_INTERIOR_CLEAN" ? (
                <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-xl space-y-2 text-xs text-blue-200">
                  <div className="flex items-center justify-between font-bold text-blue-300">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                      <span>Уборка только салона (пылесос, песок, коврики, мусор):</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-300/90 leading-relaxed">
                    Обычная уборка салона пылесосом и влажная протирка панелей.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-blue-500/30">
                    <span className="text-blue-200 font-semibold text-[11px]">
                      Стоимость уборки салона к удержанию:
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-blue-400">₾</span>
                      <input
                        type="number"
                        min="0"
                        value={extraWashFee}
                        onChange={(e) => setExtraWashFee(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-blue-500 rounded-lg p-1 text-right text-white font-mono font-bold"
                      />
                      <span className="text-slate-400 text-[10px]">GEL</span>
                    </div>
                  </div>
                </div>
              ) : cleanlinessState === "FULL_WASH" ? (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/50 rounded-xl space-y-2 text-xs text-indigo-200">
                  <div className="flex items-center justify-between font-bold text-indigo-300">
                    <span className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Полная комплексная мойка (кузов снаружи + уборка салона):</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-300/90 leading-relaxed">
                    Полный комплекс: мойка кузова пеной, сушка, пылесос салона и влажная протирка.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-indigo-500/30">
                    <span className="text-indigo-200 font-semibold text-[11px]">
                      Стоимость полной мойки к удержанию:
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-indigo-400">₾</span>
                      <input
                        type="number"
                        min="0"
                        value={extraWashFee}
                        onChange={(e) => setExtraWashFee(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-indigo-500 rounded-lg p-1 text-right text-white font-mono font-bold"
                      />
                      <span className="text-slate-400 text-[10px]">GEL</span>
                    </div>
                  </div>
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
                    Требуется глубокая химчистка с нанесением химии и сушка салона. Сумма удерживается с клиента в счет клининга.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-amber-500/30">
                    <span className="text-amber-200 font-semibold text-[11px]">
                      Стоимость химчистки к удержанию:
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono font-bold text-amber-400">₾</span>
                      <input
                        type="number"
                        min="0"
                        value={extraWashFee}
                        onChange={(e) => setExtraWashFee(Number(e.target.value))}
                        className="w-20 bg-slate-900 border border-amber-500 rounded-lg p-1 text-right text-white font-mono font-black"
                      />
                      <span className="text-slate-400 text-[10px]">GEL</span>
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
                      onClick={() => {
                        setExtraHours(h);
                        setCustomExtraHoursFee(null);
                      }}
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
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setExtraHours(val);
                      setCustomExtraHoursFee(null);
                    }}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-white text-xs"
                  />
                  <span className="text-slate-400 text-[11px]">ч.</span>
                </div>
              </div>

              {/* Extra Hours Rule & Calculation Box with direct agreed sum input */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-2.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Тариф по регламенту:</span>
                  </span>
                  <span className="font-mono text-amber-300 font-bold">
                    {hoursCalc.ratePerHour} ₾/ч (расчёт за {extraHours} ч: {hoursCalc.totalFee} ₾)
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  +1 час бесплатно • Следующие 6 часов (2-7 ч): 10/15/20 ₾/ч • Свыше 7 часов: полные сутки ({booking.dailyRate || 50} ₾)
                </p>

                {/* Direct sum input */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Сумма к оплате за продление:
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {customExtraHoursFee !== null && customExtraHoursFee !== hoursCalc.totalFee
                        ? "Введена согласованная с клиентом сумма"
                        : "Рассчитано по регламенту, можно изменить вручную"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-mono font-bold text-amber-400 text-sm">₾</span>
                    <input
                      type="number"
                      min="0"
                      value={extraHoursFee}
                      onChange={(e) => setCustomExtraHoursFee(Math.max(0, Number(e.target.value)))}
                      className="w-24 bg-slate-950 border-2 border-amber-500 rounded-lg py-1 px-2 text-right font-mono font-black text-amber-300 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                    <span className="text-slate-400 text-xs font-medium">GEL</span>
                  </div>
                </div>

                {customExtraHoursFee !== null && customExtraHoursFee !== hoursCalc.totalFee && (
                  <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/15 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                    <span>
                      Договорная сумма: <strong>{customExtraHoursFee} ₾</strong> (по тарифу было бы {hoursCalc.totalFee} ₾)
                    </span>
                    <button
                      type="button"
                      onClick={() => setCustomExtraHoursFee(null)}
                      className="text-[10px] text-amber-200 underline hover:text-white ml-2"
                    >
                      Сбросить к тарифу
                    </button>
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

            {/* 5. Проверка штрафов (protocols.ge) */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Штрафы с камер МВД (protocols.ge):</span>
                </span>

                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <a
                    href="https://protocols.ge"
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-300 border border-blue-500/30 rounded text-[11px] font-bold flex items-center space-x-1 transition"
                    title="Открыть портал protocols.ge"
                  >
                    <span>protocols.ge</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {/* Госномер с кнопкой копирования */}
                  <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono">
                    <span className="text-slate-400">Госномер:</span>
                    <strong className="text-amber-400">{car.plateNumber}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(car.plateNumber, `plate-fines-${car.id}`)}
                      className={`p-0.5 rounded transition ${
                        copiedKey === `plate-fines-${car.id}`
                          ? "text-emerald-400"
                          : "text-slate-400 hover:text-white"
                      }`}
                      title="Скопировать госномер машины"
                    >
                      {copiedKey === `plate-fines-${car.id}` ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Техпаспорт с кнопкой копирования */}
                  <div className="flex items-center space-x-1 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px] font-mono">
                    <span className="text-slate-400">Техпаспорт:</span>
                    <strong className="text-cyan-300">{car.techPassportNumber || "—"}</strong>
                    {car.techPassportNumber && (
                      <button
                        type="button"
                        onClick={() => handleCopy(car.techPassportNumber, `tp-fines-${car.id}`)}
                        className={`p-0.5 rounded transition ${
                          copiedKey === `tp-fines-${car.id}`
                            ? "text-emerald-400"
                            : "text-slate-400 hover:text-white"
                        }`}
                        title="Скопировать номер техпаспорта"
                      >
                        {copiedKey === `tp-fines-${car.id}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {trafficFines.length === 0 ? (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Штрафов за период поездки не обнаружено (protocols.ge чист) ✓</span>
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
                            <div className="font-black text-rose-400">{fine.amountGEL} ₾</div>
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
                        Клиент оплачивает нам сумму штрафа на месте ({selectedFinesTotalGEL} ₾), а мы погашаем в полицию
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
                    {changeReturnedToClient} ₾
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
                      Система рекомендует заблокировать авто на СТОП до прохождения ТО или продления документов. Вы можете принять авто со СТОПом или нажать «Принять БЕЗ СТОПа».
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
                    <span className="font-mono text-emerald-400 font-bold">+{depositAmount} ₾</span>
                  </div>
                )}

                {changeReturnedToClient > 0 && (
                  <div className="flex justify-between">
                    <span className="text-blue-300">Сдача клиенту (из переплаты):</span>
                    <span className="font-mono text-blue-400 font-bold">+{changeReturnedToClient} ₾</span>
                  </div>
                )}

                {fuelChargeAmount > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Недостающее топливо ({fuelShortagePercent}%):</span>
                    <span className="font-mono font-bold">-{fuelChargeAmount} ₾</span>
                  </div>
                )}

                {extraWashFee > 0 && (
                  <div className="flex justify-between text-cyan-300">
                    <span>
                      {cleanlinessState === "DIRTY_INTERIOR_CLEAN"
                        ? "Только салон (уборка):"
                        : cleanlinessState === "DIRTY_BODY"
                        ? "Только кузов (мойка):"
                        : cleanlinessState === "FULL_WASH"
                        ? "Полная мойка (кузов + салон):"
                        : "Химчистка салона:"}
                    </span>
                    <span className="font-mono font-bold">-{extraWashFee} ₾</span>
                  </div>
                )}

                {hasNewDamages && damageChargeAmount > 0 && (
                  <div className="flex justify-between text-red-300">
                    <span>Ущерб за повреждения ({damagesDescription || "кузов"}):</span>
                    <span className="font-mono font-bold">-{damageChargeAmount} ₾</span>
                  </div>
                )}

                {!techPassportReturned && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Утеря техпаспорта (восстановление в МВД Грузии):</span>
                    <span className="font-mono">-{lostTechPassportCharge} ₾</span>
                  </div>
                )}

                {finesToDeduct > 0 && (
                  <div className="flex justify-between text-rose-300">
                    <span>Штрафы ПДД (клиент оплачивает компании):</span>
                    <span className="font-mono font-bold">-{finesToDeduct} ₾</span>
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

                {unpaidExtensionsToDeduct > 0 && (
                  <div className="flex justify-between py-1.5 px-2.5 bg-rose-950/80 border border-red-500/60 rounded-xl text-rose-200 font-bold animate-pulse">
                    <span className="flex items-center space-x-1.5">
                      <span className="text-base">🚨</span>
                      <span>Задолженность за продление ({unpaidExtensionsTotalDays > 0 ? `${unpaidExtensionsTotalDays} сут.` : ""}{unpaidExtensionsTotalHours > 0 ? ` +${unpaidExtensionsTotalHours} ч.` : ""}):</span>
                    </span>
                    <span className="font-mono font-black text-rose-300 text-sm">
                      -{unpaidExtensionsToDeduct} ₾
                    </span>
                  </div>
                )}
              </div>

              {/* Главная плашка ИТОГО */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                recordAsDebt
                  ? "bg-amber-950/70 border-amber-500 text-amber-200"
                  : finalBalanceType === "REFUND_TO_CLIENT"
                  ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-200"
                  : finalBalanceType === "PAYMENT_BY_CLIENT"
                  ? "bg-amber-950/60 border-amber-500/80 text-amber-200"
                  : "bg-slate-900 border-slate-700 text-slate-200"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-black tracking-wider block opacity-80">
                    {recordAsDebt && "Зафиксировано в личный долг клиента:"}
                    {!recordAsDebt && finalBalanceType === "REFUND_TO_CLIENT" && "К возврату клиенту на руки:"}
                    {!recordAsDebt && finalBalanceType === "PAYMENT_BY_CLIENT" && "К доплате клиентом:"}
                    {!recordAsDebt && finalBalanceType === "ZERO_SETTLED" && "Взаиморасчет:"}
                  </span>
                  <span className="text-xs font-bold">
                    {recordAsDebt && `Отложено на клиента ${booking.customer?.fullName || ""}`}
                    {!recordAsDebt && finalBalanceType === "REFUND_TO_CLIENT" && (hasDeposit ? "Остаток залога + сдача" : "Сдача клиенту")}
                    {!recordAsDebt && finalBalanceType === "PAYMENT_BY_CLIENT" && "Оплата штрафов, топлива и дефектов"}
                    {!recordAsDebt && finalBalanceType === "ZERO_SETTLED" && "Все платежи закрыты в ноль"}
                  </span>
                </div>

                <div className="text-right font-mono">
                  <div className="text-2xl font-black text-white">
                    {recordAsDebt ? (debtAmount !== "" ? debtAmount : finalBalanceAmount) : finalBalanceAmount} ₾
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">
                    {recordAsDebt ? "ДОЛГ (GEL)" : "GEL (Лари)"}
                  </div>
                </div>
              </div>

              {/* Блок переключения: Оплата на месте vs Навешивание долга на клиента */}
              {(finalBalanceType === "PAYMENT_BY_CLIENT" || deductionsTotal > 0) && (
                <div className="p-3 bg-slate-900/90 border border-slate-750 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Формат расчета доплаты / штрафов:</span>
                    </span>

                    <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setRecordAsDebt(false)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                          !recordAsDebt ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
                        }`}
                      >
                        💵 Оплата на месте
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecordAsDebt(true);
                          if (debtAmount === "") setDebtAmount(finalBalanceAmount);
                          if (!debtDescription) {
                            const parts = [];
                            if (unpaidExtensionsToDeduct > 0) parts.push(`Продление аренды (${unpaidExtensionsToDeduct} ₾ за ${unpaidExtensionsTotalDays} сут.)`);
                            if (finesToDeduct > 0) parts.push(`Штрафы ПДД (${finesToDeduct} ₾)`);
                            if (hasNewDamages && damageChargeAmount > 0) parts.push(`Повреждения (${damageChargeAmount} ₾)`);
                            if (fuelChargeAmount > 0) parts.push(`Топливо (${fuelChargeAmount} ₾)`);
                            if (extraHoursFee > 0 && !isExtraHoursPaid) parts.push(`Доп. часы (${extraHoursFee} ₾)`);
                            if (extraWashFee > 0) parts.push(`Мойка (${extraWashFee} ₾)`);
                            setDebtDescription(parts.length > 0 ? parts.join(", ") : "Задолженность при возврате");
                          }
                          if (!debtDueDate) {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            setDebtDueDate(d.toISOString().split("T")[0]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition flex items-center space-x-1 ${
                          recordAsDebt ? "bg-amber-600 text-white shadow" : "text-amber-400 hover:text-amber-300"
                        }`}
                      >
                        <span>⚠️ В долг клиента</span>
                      </button>
                    </div>
                  </div>

                  {recordAsDebt && (
                    <div className="pt-2 border-t border-amber-900/40 space-y-2.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          <span>Навешивание задолженности на клиента:</span>
                        </span>
                        <span className="text-[10px] bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded font-mono">
                          {booking.customer?.isLoyalClient ? "⭐ Постоянный клиент" : "Клиент"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Сумма долга (₾ GEL):</label>
                          <input
                            type="number"
                            value={debtAmount !== "" ? debtAmount : finalBalanceAmount}
                            onChange={(e) => setDebtAmount(Number(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-amber-500/70 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none"
                          />
                          {unpaidExtensionsToDeduct > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setDebtAmount(unpaidExtensionsToDeduct);
                                setDebtCategory("RENTAL");
                                setDebtDescription(`Задолженность за продление аренды на ${unpaidExtensionsTotalDays} сут. (${unpaidExtensionsToDeduct} ₾)`);
                              }}
                              className="mt-1.5 px-2 py-1 bg-red-950/80 hover:bg-red-900 border border-red-500/50 text-red-200 text-[10px] font-bold rounded-lg transition flex items-center space-x-1"
                            >
                              <span>🚨 Долг за продление ({unpaidExtensionsToDeduct} ₾ за {unpaidExtensionsTotalDays} сут.)</span>
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Обещанный срок оплаты:</label>
                          <div className="flex space-x-1.5">
                            <input
                              type="date"
                              value={debtDueDate}
                              onChange={(e) => setDebtDueDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const d = new Date();
                                d.setDate(d.getDate() + 7);
                                setDebtDueDate(d.toISOString().split("T")[0]);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded whitespace-nowrap"
                              title="+7 дней"
                            >
                              +7 дн
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Категория задолженности:</label>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {[
                            { id: "FINES", label: "🚨 Штрафы ПДД" },
                            { id: "DAMAGE", label: "🔨 Повреждения/ущерб" },
                            { id: "FUEL", label: "⛽ Нехватка топлива" },
                            { id: "RENTAL", label: "⏱️ Продление аренды" },
                            { id: "WASH", label: "🧼 Мойка" },
                            { id: "GENERAL", label: "📋 Общий долг" },
                          ].map((cat) => (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setDebtCategory(cat.id)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition ${
                                debtCategory === cat.id
                                  ? "bg-amber-600 border-amber-400 text-white"
                                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                              }`}
                            >
                              {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Причина / Описание долга:</label>
                        <input
                          type="text"
                          value={debtDescription}
                          onChange={(e) => setDebtDescription(e.target.value)}
                          placeholder="Например: Штрафы с камер и повреждение бампера"
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Договоренности / примечание менеджера:</label>
                        <input
                          type="text"
                          value={debtNotes}
                          onChange={(e) => setDebtNotes(e.target.value)}
                          placeholder="Например: Постоянный клиент, переведет на TBC до конца недели"
                          className="w-full bg-slate-950 border border-slate-750 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2.5 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3.5 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs font-bold"
              >
                Отмена
              </button>

              {willStopBlock ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSubmitReturn(undefined, true)}
                    disabled={isSubmitting}
                    className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600/90 hover:bg-emerald-500 text-white border border-emerald-400/50 rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95"
                    title="Принять автомобиль без блокировки в статус 'Свободен / Доступен'"
                  >
                    <Check className="w-4 h-4 text-white" />
                    <span>
                      {recordAsDebt ? "Принять БЕЗ СТОПа (с долгом)" : "Принять БЕЗ СТОПа"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmitReturn(undefined, false)}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 text-white font-black rounded-xl shadow-lg shadow-red-950/60 transition active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? "Сохранение..."
                        : recordAsDebt
                        ? `Принять авто со СТОПом (долг ${debtAmount !== "" ? debtAmount : finalBalanceAmount} ₾)`
                        : "Принять авто и поставить на СТОП"}
                    </span>
                  </button>
                </>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center space-x-2 px-6 py-2.5 font-black rounded-xl shadow-lg transition active:scale-95 text-white ${
                    recordAsDebt
                      ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmitting
                      ? "Сохранение..."
                      : recordAsDebt
                      ? `Завершить возврат с навешиванием долга (${debtAmount !== "" ? debtAmount : finalBalanceAmount} ₾)`
                      : "Завершить возврат и закрыть бронь"}
                  </span>
                </button>
              )}
            </div>
          </form>
        )}

        {/* Modal: Просмотр видео кругового осмотра при выдаче */}
        {showVideoModal && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-3 my-auto max-h-[92dvh] overflow-y-auto">
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
                {handoverReport?.carBodyVideoUrl ? (
                  <video
                    src={handoverReport.carBodyVideoUrl}
                    controls
                    playsInline
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-2">
                    <Video className="w-10 h-10 mx-auto text-purple-400" />
                    <p className="text-xs">
                      Видеофиксация кузова не найдена
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Видеофайл отсутствует или был удалён по истечении срока хранения (4 мес.)
                    </p>
                  </div>
                )}
              </div>

              {/* Download and view actions for video */}
              {handoverReport?.carBodyVideoUrl && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <a
                    href={`${handoverReport.carBodyVideoUrl}${handoverReport.carBodyVideoUrl.includes("?") ? "&" : "?"}download=1`}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition shadow active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать видео осмотра</span>
                  </a>
                  <a
                    href={handoverReport.carBodyVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
                    title="Открыть в новой вкладке"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}

              {handoverReport?.dashboardPhotoUrl && (
                <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Фото щитка приборов (выдача):</span>
                  <div className="flex items-center space-x-2">
                    <a
                      href={`${handoverReport.dashboardPhotoUrl}${handoverReport.dashboardPhotoUrl.includes("?") ? "&" : "?"}download=1`}
                      download
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center space-x-1 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Скачать фото</span>
                    </a>
                    <a
                      href={handoverReport.dashboardPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-slate-400 hover:text-white p-1"
                      title="Открыть в новой вкладке"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
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