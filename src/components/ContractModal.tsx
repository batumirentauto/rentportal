"use client";

import React, { useState } from "react";
import { X, Printer, FileText, Globe, Check, Edit3 } from "lucide-react";

interface ContractModalProps {
  booking: any;
  onClose: () => void;
  initialLang?: "RU" | "GE" | "EN";
}

type Language = "RU" | "GE" | "EN";

export const ContractModal: React.FC<ContractModalProps> = ({ booking, onClose, initialLang }) => {
  const [lang, setLang] = useState<Language>(
    initialLang || booking?.contractLanguage || "RU"
  );
  const [paymentType, setPaymentType] = useState<"CASH" | "CARD" | "MIXED">("CASH");
  const [editableDeposit, setEditableDeposit] = useState<number>(
    booking?.depositAmount !== undefined ? Number(booking.depositAmount) : 300
  );
  const [editableDailyRate, setEditableDailyRate] = useState<number>(
    booking?.dailyRate || 100
  );
  const [editableTotalCost, setEditableTotalCost] = useState<number>(
    booking?.totalAmount || 300
  );
  const [secondDriverName, setSecondDriverName] = useState<string>("");
  const [secondDriverLicense, setSecondDriverLicense] = useState<string>("");
  const [showEditControls, setShowEditControls] = useState<boolean>(false);

  const handleSelectLanguage = (newLang: Language) => {
    setLang(newLang);
    if (booking?.id) {
      fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractLanguage: newLang }),
      }).catch((e) => console.warn("Failed to persist contract language:", e));
    }
  };

  const additionalDriversList: any[] = booking?.additionalDrivers || [];
  const getExtraDriver = (idx: number) => {
    if (additionalDriversList[idx]) {
      return {
        name: additionalDriversList[idx].fullName,
        license: additionalDriversList[idx].licenseNumber || "—",
        expiry: additionalDriversList[idx].licenseExpiryDate || "",
      };
    }
    if (idx === 0 && secondDriverName) {
      return { name: secondDriverName, license: secondDriverLicense || "—", expiry: "" };
    }
    return null;
  };

  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper for City names
  const getCityName = (language: Language) => {
    const code = booking.car?.city?.code || "TBS";
    if (code === "BUS") {
      return language === "GE" ? "ქ. ბათუმი" : language === "EN" ? "Batumi" : "г. Батуми";
    }
    if (code === "KUT") {
      return language === "GE" ? "ქ. ქუთაისი" : language === "EN" ? "Kutaisi" : "г. Кутаиси";
    }
    return language === "GE" ? "ქ. თბილისი" : language === "EN" ? "Tbilisi" : "г. Тбилиси";
  };

  // Date formatters
  const formatDate = (dateStr: string, language: Language) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const monthIndex = d.getMonth();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const ruMonths = [
      "января", "февраля", "марта", "апреля", "мая", "июня",
      "июля", "августа", "сентября", "октября", "ноября", "декабря"
    ];
    const geMonths = [
      "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
      "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
    ];
    const enMonths = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    if (language === "GE") {
      return `${day} ${geMonths[monthIndex]} ${year} წ., ${time}`;
    }
    if (language === "EN") {
      return `${enMonths[monthIndex]} ${day}, ${year} at ${time}`;
    }
    return `«${day}» ${ruMonths[monthIndex]} ${year} г., ${time}`;
  };

  const getContractDateStr = (language: Language) => {
    const d = new Date(booking.startDate || Date.now());
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    if (language === "GE") return `«${day}» . ${month} . ${year} წელი`;
    if (language === "EN") return `${day}/${month}/${year}`;
    return `«${day}» ${month} ${year} года`;
  };

  const getPaymentMethodText = (language: Language) => {
    if (paymentType === "CASH") {
      return language === "GE" ? "ნაღდი ანგარიშსწორება (ნაღდი)" : language === "EN" ? "Cash payment" : "Наличными";
    }
    if (paymentType === "CARD") {
      return language === "GE" ? "უნაღდო ანგარიშსწორება (ბარათი/გადარიცხვა)" : language === "EN" ? "Bank card / wire transfer" : "Безналично (банковская карта / счет)";
    }
    return language === "GE" ? "შერეული (ნაღდი/უნაღდო)" : language === "EN" ? "Mixed payment" : "Смешанная (наличные + безнал)";
  };

  const carTitle = `${booking.car.brand} ${booking.car.model}`;
  const plateNumber = booking.car.plateNumber;
  const customerName = booking.customer.fullName || "—";
  const customerPassport = `${booking.customer.passportNumber || "—"} (${booking.customer.passportCountry || "Международный"})`;
  const customerLicense = booking.customer.driverLicenseNumber || "—";
  const customerExpiry = booking?.customer?.driverLicenseExpiry || "";
  const customerPhone = booking.customer.phone || booking.customer.whatsapp || "—";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:overflow-visible">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:w-full print:m-0">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight">
                Договор аренды авто № {booking.bookingNumber}
              </h2>
              <p className="text-[11px] text-slate-400">
                ИП Колесников Андрей (ИН: 306401934) • {carTitle} ({plateNumber})
              </p>
            </div>
          </div>

          {/* Language Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => handleSelectLanguage("RU")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                lang === "RU"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇷🇺 Русский</span>
            </button>
            <button
              onClick={() => handleSelectLanguage("GE")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                lang === "GE"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇬🇪 ქართული</span>
            </button>
            <button
              onClick={() => handleSelectLanguage("EN")}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
                lang === "EN"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇬🇧 English</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditControls(!showEditControls)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>{showEditControls ? "Скрыть параметры" : "Параметры договора"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-1.5 rounded-lg text-xs shadow-lg transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Печать (A4 / PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Edit Parameters Drawer (Hidden on print) */}
        {showEditControls && (
          <div className="bg-slate-800/90 border-b border-slate-700 p-3 sm:px-6 text-xs text-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 print:hidden animate-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Способ оплаты:</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              >
                <option value="CASH">Наличными (GEL)</option>
                <option value="CARD">Безналично / Карта</option>
                <option value="MIXED">Смешанная</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Сумма аренды (₾ GEL):</label>
              <input
                type="number"
                value={editableTotalCost}
                onChange={(e) => setEditableTotalCost(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Тариф/сутки (₾ GEL):</label>
              <input
                type="number"
                value={editableDailyRate}
                onChange={(e) => setEditableDailyRate(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Залог (₾ GEL):</label>
              <input
                type="number"
                value={editableDeposit}
                onChange={(e) => setEditableDeposit(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">2-й водитель (ФИО + ВУ):</label>
              <input
                type="text"
                placeholder="ФИО и номер прав"
                value={secondDriverName}
                onChange={(e) => setSecondDriverName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
              />
            </div>
          </div>
        )}

        {/* Printable Contract Sheet */}
        <div className="printable-contract p-6 sm:p-10 overflow-y-auto space-y-4 text-[11px] sm:text-[12px] font-sans text-slate-900 leading-snug print:p-0 print:text-[10px] print:leading-tight">
          
          {/* ========================================================
              RUSSIAN CONTRACT VERSION (Exact Match to Legal Form)
             ======================================================== */}
          {lang === "RU" && (
            <div className="space-y-3.5">
              {/* Title & Preamble */}
              <div className="text-center pb-2">
                <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  ДОГОВОР АРЕНДЫ АВТОМОБИЛЯ (ПОСУТОЧНАЯ АРЕНДА) Б/Н
                </h1>
                <div className="flex justify-between items-center text-xs mt-2 border-b border-slate-300 pb-1.5">
                  <span className="font-semibold">{getCityName("RU")}</span>
                  <span className="font-semibold">{getContractDateStr("RU")}</span>
                </div>
              </div>

              <p className="text-justify indent-4 leading-relaxed">
                Индивидуальный предприниматель <strong>Колесников Андрей</strong>, именуемый в дальнейшем <strong>«Арендодатель»</strong> с одной стороны, и{" "}
                <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, именуемый(ая) в дальнейшем <strong>«Арендатор»</strong>, с другой стороны, заключили настоящий договор (далее — «Договор») о нижеследующем:
              </p>

              {/* 1. ПРЕДМЕТ ДОГОВОРА */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  1. ПРЕДМЕТ ДОГОВОРА
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>1.1. Арендодатель предоставляет Арендатору во временное пользование автомобиль:</p>
                  <p className="pl-4">• Марка, модель: <strong className="underline">{carTitle} ({booking.car.year} г.)</strong></p>
                  <p className="pl-4">• Госномер: <strong className="underline font-mono">{plateNumber}</strong></p>
                  <p>1.2. Аренда предоставляется на условиях посуточной оплаты.</p>
                </div>
              </div>

              {/* 2. СРОК АРЕНДЫ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  2. СРОК АРЕНДЫ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    2.1. Автомобиль передаётся в аренду с <strong className="underline">{formatDate(booking.startDate, "RU")}</strong> до <strong className="underline">{formatDate(booking.endDate, "RU")}</strong>.
                  </p>
                  <p>2.2. Срок аренды может быть продлён по согласованию сторон.</p>
                </div>
              </div>

              {/* 3. ПЛАТА ЗА АРЕНДУ И ЗАЛОГ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  3. ПЛАТА ЗА АРЕНДУ И ЗАЛОГ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    3.1. Стоимость аренды составляет <strong className="underline">{editableTotalCost} лари</strong> (тариф {editableDailyRate} лари/сутки за {booking.rentalDays || 1} сут.).
                  </p>
                  <p>
                    3.2. Залог составляет <strong className="underline">{editableDeposit} лари</strong> и возвращается после окончания аренды при отсутствии повреждений и нарушений условий Договора.
                  </p>
                  <p>
                    3.3. Оплата производится: <strong className="underline">{getPaymentMethodText("RU")}</strong>.
                  </p>
                </div>
              </div>

              {/* 4. ОБЯЗАННОСТИ СТОРОН */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  4. ОБЯЗАННОСТИ СТОРОН
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>4.1. ОБЯЗАННОСТИ АРЕНДОДАТЕЛЯ</strong></p>
                  <p className="pl-3">4.1.1. Передать автомобиль Арендатору в исправном техническом состоянии.</p>
                  <p className="pl-3">
                    4.1.2. В случае возникновения неисправностей автомобиля в процессе аренды по вине Арендодателя оказать необходимую помощь Арендатору в части устранения неисправностей или заменить автомобиль.
                  </p>
                  <p><strong>4.2. ОБЯЗАННОСТИ АРЕНДАТОРА</strong></p>
                  <p className="pl-3">4.2.1. Использовать автомобиль исключительно по назначению, соблюдать ПДД Грузии.</p>
                  <p className="pl-3">4.2.2. Не передавать управление автомобилем третьим лицам без письменного согласия Арендодателя.</p>
                  <p className="pl-3">4.2.3. Возвратить автомобиль в том же состоянии, в котором он был получен, с тем же уровнем топлива.</p>
                  <p className="pl-3">4.2.4. В случае ДТП или других происшествий незамедлительно уведомить Арендодателя и соответствующие службы.</p>
                  <p className="pl-3">
                    4.2.5. Арендатор обязуется не управлять автомобилем в состоянии алкогольного, наркотического или другого опьянения, а также в случае усталости, при котором управление автомобилем может быть небезопасным.
                  </p>
                </div>
              </div>

              {/* 5. ОТВЕТСТВЕННОСТЬ СТОРОН */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  5. ОТВЕТСТВЕННОСТЬ СТОРОН
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>5.1. ОТВЕТСТВЕННОСТЬ АРЕНДАТОРА</strong></p>
                  <p className="pl-3">5.1.1. Арендатор несёт ответственность за: повреждения шин, днища автомобиля, а также неисправности, возникшие по его вине; утерю документов, ключей, аксессуаров.</p>
                  <p className="pl-3">
                    5.1.2. Арендатор несёт ответственность за сохранность элементов салона автомобиля. В случае повреждения, сильного загрязнения или утраты элементов салона автомобиля Арендатор обязуется уплатить штраф в размере <strong>500 (пятисот) лари</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.3. Арендатор не несёт ответственность за неисправности автомобиля, возникшие по вине Арендодателя или в результате естественного износа.
                  </p>
                  <p className="pl-3">
                    5.1.4. Курение в салоне автомобиля строго запрещено. В случае нарушения данного условия Арендатор обязуется уплатить штраф в размере <strong>300 (трехсот) лари</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.5. Арендатору запрещается использовать автомобиль для дрифта, уличных гонок или других экстремальных манёвров. В случае нарушения данного пункта Арендатор обязуется уплатить штраф в размере <strong>1500 (одной тысячи пятисот) лари</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.6. В случае, если автомобиль попадает на штрафстоянку по вине Арендатора, все расходы, связанные с эвакуацией и пребыванием автомобиля на штрафстоянке, оплачиваются Арендатором.
                  </p>
                  <p className="pl-3">
                    5.1.7. Арендатор также обязуется оплачивать стоимость аренды автомобиля за каждый день простоя на штрафстоянке до момента его возврата Арендодателю.
                  </p>
                  <p className="pl-3">
                    5.1.8. Арендатору запрещается посещать <strong>Тушети и Гергети</strong> на арендованном автомобиле, а также <strong>выезжать за пределы Грузии</strong>. В случае нарушения данного условия Арендатор обязуется уплатить штраф в размере <strong>1000 (одной тысячи) лари</strong>.
                  </p>
                  <p><strong>5.2. ОТВЕТСТВЕННОСТЬ АРЕНДОДАТЕЛЯ</strong></p>
                  <p className="pl-3">5.2.1. Арендодатель не несёт ответственности за штрафы, выписанные Арендатору во время аренды.</p>
                </div>
              </div>

              {/* 6. СТРАХОВАНИЕ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  6. СТРАХОВАНИЕ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>6.1. Страховка автомобиля покрывает исключительно ущерб, причинённый в результате дорожно-транспортного происшествия (ДТП).</p>
                  <p>6.2. Страховка не покрывает: повреждения днища автомобиля; повреждения шин, колёс и дисков; неисправности, возникшие по вине Арендатора при нарушении правил эксплуатации автомобиля; ущерб, возникший в результате управления автомобилем в нетрезвом состоянии, при проезде на красный сигнал светофора и при пересечении сплошной линии разметки встречного направления.</p>
                  <p>6.3. Все расходы, возникшие в результате событий, указанных в п.6.2. полностью возлагаются на Арендатора.</p>
                </div>
              </div>

              {/* 7. ПРОЦЕДУРА ВОЗВРАТА АВТОМОБИЛЯ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  7. ПРОЦЕДУРА ВОЗВРАТА АВТОМОБИЛЯ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>7.1. Арендатор обязуется вернуть автомобиль в срок, указанный в разделе 2 настоящего Договора.</p>
                  <p>7.2. В случае задержки возврата автомобиля Арендатор обязан заранее уведомить Арендодателя.</p>
                  <p>7.3. Если уведомление о задержке возврата поступило менее чем за 4 часа до истечения срока аренды, Арендатор оплачивает дополнительный день аренды согласно установленной стоимости.</p>
                </div>
              </div>

              {/* 8. ПОРЯДОК ПРОВЕДЕНИЯ ФИКСАЦИИ СОСТОЯНИЯ АВТОМОБИЛЯ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  8. ПОРЯДОК ПРОВЕДЕНИЯ ФИКСАЦИИ СОСТОЯНИЯ АВТОМОБИЛЯ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>8.1. Перед передачей автомобиля Арендатору состояние кузова и салона, наличие аксессуаров и уровень топлива фиксируются на видео с согласия обеих сторон.</p>
                  <p>8.2. Видеофиксация является основанием для определения состояния автомобиля при возврате.</p>
                  <p>8.3. Видео хранится у обеих сторон и может быть предоставлено по запросу в случае возникновения споров.</p>
                </div>
              </div>

              {/* 9. ТРЕБОВАНИЯ К ВОДИТЕЛЮ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  9. ТРЕБОВАНИЯ К ВОДИТЕЛЮ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>9.1. Водитель, управляющий арендованным автомобилем, должен иметь при себе действующее водительское удостоверение со стажем вождения более двух лет.</p>
                  <p>9.2. Водитель должен быть старше 21 года.</p>
                  <p>9.3. В случае несоответствия этим требованиям, Арендатор несёт полную ответственность за все последствия, включая штрафы и ущерб, и может быть лишён права на аренду автомобиля. Страховка при несоответствии требованиям п.9.1 и п.9.2 не действует.</p>
                </div>
              </div>

              {/* 10. ФОРС-МАЖОР */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  10. ФОРС-МАЖОР
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>10.1. Стороны освобождаются от ответственности за полное или частичное неисполнение обязательств по договору в случае если неисполнение обязательств явилось следствием действий непреодолимой силы, а именно: пожара, наводнения, землетрясения, забастовки, войны, действий органов государственной власти или других независящих от Сторон обстоятельств.</p>
                  <p>10.2. Сторона, которая не может выполнить обязательства по договору, должна своевременно, но не позднее одного календарного дня после наступления обстоятельств непреодолимой силы, письменно или устно известить другую Сторону, предоставлением обосновывающих документов, выданных компетентными органами.</p>
                  <p>10.3. Стороны признают, что неплатежеспособность не является форс-мажорным обстоятельством.</p>
                </div>
              </div>

              {/* 11. ПРОЧИЕ УСЛОВИЯ */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  11. ПРОЧИЕ УСЛОВИЯ
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>11.1. Настоящий договор вступает в силу с момента его подписания и действует до момента полного исполнения Сторонами всех его условий.</p>
                  <p>11.2. В случае нарушения Арендатором любого из положений настоящего договора, Арендодатель вправе в одностороннем порядке расторгнуть настоящий договор с возможным последующим изъятием Автомобиля без выплаты депозита. В случае, если размера Депозита недостаточно для покрытия ущерба, причинённого Арендодателю, Арендатор обязуется оплатить недостающую сумму Арендодателю в течение 1 (одного) календарного дня с момента возврата автомобиля.</p>
                  <p>11.3. Настоящий договор составлен в двух экземплярах, по одному для каждой из сторон, имеющих одинаковую юридическую силу.</p>
                  <p>11.4. Все споры и разногласия, которые могут возникнуть из настоящего договора или в связи с ним, будут по возможности решаться путем переговоров. В случае если стороны не придут к согласию, то дело подлежит рассмотрению в судебном порядке по месту нахождения Арендодателя на территории Грузии.</p>
                  <p>11.5. Надлежащим способом уведомления сторонами друг друга признается письменное уведомление, отправленное с помощью CMC, WhatsApp, Telegram, e-mail, указанные в Договоре.</p>
                </div>
              </div>

              {/* 12. ДОПУЩЕННЫЕ К УПРАВЛЕНИЮ ВОДИТЕЛИ */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  12. ДОПУЩЕННЫЕ К УПРАВЛЕНИЮ АВТОМОБИЛЕМ ВОДИТЕЛИ
                </h2>
                <table className="w-full mt-1.5 border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1 w-8 text-center">№</th>
                      <th className="border border-slate-300 p-1 text-left">ФИО</th>
                      <th className="border border-slate-300 p-1 text-left">Номер водительского удостоверения</th>
                      <th className="border border-slate-300 p-1 text-left w-32">Срок действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1 text-center font-bold">1.</td>
                      <td className="border border-slate-300 p-1 font-semibold">{customerName}</td>
                      <td className="border border-slate-300 p-1 font-mono">{customerLicense}</td>
                      <td className="border border-slate-300 p-1">
                        {customerExpiry ? (customerExpiry.toLowerCase().startsWith("до") ? customerExpiry : `до ${customerExpiry}`) : "Действительно"}
                      </td>
                    </tr>
                    {[0, 1, 2, 3].map((idx) => {
                      const d = getExtraDriver(idx);
                      const dExpiry = d?.expiry
                        ? (d.expiry.toLowerCase().startsWith("до") ? d.expiry : `до ${d.expiry}`)
                        : (d ? "Действительно" : (idx === 0 ? "—" : "\u00A0"));
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-1 text-center font-bold">{idx + 2}.</td>
                          <td className="border border-slate-300 p-1">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1">{dExpiry}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 13. РЕКВИЗИТЫ СТОРОН */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  13. РЕКВИЗИТЫ СТОРОН
                </h2>
                <div className="grid grid-cols-2 gap-3 mt-1.5 border border-slate-300 p-2.5 rounded text-[11px] bg-slate-50/50">
                  <div className="space-y-0.5 border-r border-slate-200 pr-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">Арендодатель:</p>
                    <p className="font-bold">Индивидуальный предприниматель Колесников Андрей</p>
                    <p>Идентификационный номер: <strong className="font-mono">306401934</strong></p>
                    <p>Телефон: <strong className="font-mono">+995591181430</strong></p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">Арендатор:</p>
                    <p>Фамилия, Имя: <strong className="underline">{customerName}</strong></p>
                    <p>Паспорт: <strong>{customerPassport}</strong></p>
                    {customerLicense && customerLicense !== "—" && (
                      <p>Водительское удостоверение: <strong className="font-mono">{customerLicense}</strong></p>
                    )}
                    <p>Контактный телефон: <strong className="font-mono">{customerPhone}</strong></p>
                  </div>
                </div>
              </div>

              {/* 14. ПОДПИСИ СТОРОН */}
              <div className="pt-2">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  14. ПОДПИСИ СТОРОН
                </h2>
                <div className="grid grid-cols-2 gap-6 mt-3 text-center">
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">Арендодатель: Колесников А. / Подпись</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">Арендатор: {customerName} / Подпись</p>
                  </div>
                </div>
              </div>

              {/* 15. ПЕРЕДАЧА АВТОМОБИЛЯ АРЕНДАТОРУ */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  15. ПЕРЕДАЧА АВТОМОБИЛЯ АРЕНДАТОРУ
                </h2>
                <div className="mt-1 space-y-1">
                  <p>Дата передачи: <strong className="underline font-mono">{formatDate(booking.startDate, "RU")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Автомобиль передал Арендодатель (подпись)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Автомобиль принял Арендатор (подпись)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 16. ВОЗВРАТ АВТОМОБИЛЯ АРЕНДОДАТЕЛЮ */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  16. ВОЗВРАТ АВТОМОБИЛЯ АРЕНДОДАТЕЛЮ
                </h2>
                <div className="mt-1 space-y-1">
                  <p className="font-semibold text-slate-800">
                    Стороны подтверждают, что не имеют претензий друг к другу.
                  </p>
                  <p>Дата возврата: <strong className="underline font-mono">{formatDate(booking.endDate, "RU")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Арендодатель: принял (подпись)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Арендатор: сдал (подпись)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              GEORGIAN CONTRACT VERSION (Exact Match to Legal Form)
             ======================================================== */}
          {lang === "GE" && (
            <div className="space-y-3.5">
              {/* Title & Preamble */}
              <div className="text-center pb-2">
                <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  ავტომობილის იჯარის ხელშეკრულება (დღიური გაქირავება)
                </h1>
                <div className="flex justify-between items-center text-xs mt-2 border-b border-slate-300 pb-1.5">
                  <span className="font-semibold">{getCityName("GE")}</span>
                  <span className="font-semibold">{getContractDateStr("GE")}</span>
                </div>
              </div>

              <p className="text-justify indent-4 leading-relaxed">
                ერთის მხრივ ინდივიდუალური მეწარმე <strong>ანდრეი კოლესნიკოვ</strong>, შემდგომში წოდებული <strong>„მოიჯარედ“</strong> და მეორეს მხრივ{" "}
                <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, შემდგომში წოდებული <strong>„მეიჯარედ“</strong>, დავდეთ წინამდებარე ხელშეკრულება (შემდეგში -„ხელშეკრულება“) შემდეგზე:
              </p>

              {/* 1. ხელშეკრულების საგანი */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  1. ხელშეკრულების საგანი
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>1.1. მოიჯარე გადასცემს მეიჯარე დროებით სარგებლობაში ავტომობილს:</p>
                  <p className="pl-4">• მარკა, მოდელი: <strong className="underline">{carTitle} ({booking.car.year} წ.)</strong></p>
                  <p className="pl-4">• სახელმწიფო ნომერი: <strong className="underline font-mono">{plateNumber}</strong></p>
                  <p>1.2. იჯარა ხორციელდება დღიური გადახდის პირობებზე.</p>
                </div>
              </div>

              {/* 2. იჯარის ვადა */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  2. იჯარის ვადა
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    2.1. ავტომობილი გადაეცემა იჯარით <strong className="underline">{formatDate(booking.startDate, "GE")}</strong> დან <strong className="underline">{formatDate(booking.endDate, "GE")}</strong> მდე.
                  </p>
                  <p>2.2. იჯარის ვადა შეიძლება გახანგრძლივდეს მხარეთა შეთანხმებით.</p>
                </div>
              </div>

              {/* 3. იჯარის გადასახადი და გირაო */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  3. იჯარის გადასახადი და გირაო
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    3.1. იჯარის გადასახადი შეადგენს <strong className="underline">{editableTotalCost} ლარს</strong> (დღიური ტარიფი {editableDailyRate} ლარი დღე-ღამეში).
                  </p>
                  <p>
                    3.2. გირაო შეადგენს <strong className="underline">{editableDeposit} ლარს</strong> და ბრუნდება იჯარის დასრულების შემდეგ დაზიანებების და ხელშეკრულების პირობების დაურღვევლობის შემთხვევაში.
                  </p>
                  <p>
                    3.3. გადახდა ხორციელდება: <strong className="underline">{getPaymentMethodText("GE")}</strong>.
                  </p>
                </div>
              </div>

              {/* 4. მხარეთა ვალდებულებები */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  4. მხარეთა ვალდებულებები
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>4.1. მოიჯარის პასუხისმგებლობა</strong></p>
                  <p className="pl-3">4.1.1. გადასცეს ავტომობილი მეიჯარეს ტექნიკურად გამართულ მდგომარეობაში.</p>
                  <p className="pl-3">
                    4.1.2. მოიჯარის ბრალეულობით გაქირავების პროცესში ავტომობილის გაუმართაობის შემთხვევაში, გაუწიეთ დამქირავებელს საჭირო დახმარება გაუმართაობის აღმოფხვრის ან სატრანსპორტო საშუალების გამოცვლის კუთხით.
                  </p>
                  <p><strong>4.2. მეიჯარის პასუხისმგებლობა</strong></p>
                  <p className="pl-3">4.2.1. გამოიყენოს ავტომობილი მხოლოდ დანიშნულებისამებრ და დაიცვას საქართველოს საგზაო მოძრაობის წესები.</p>
                  <p className="pl-3">4.2.2. არ გადასცეს ავტომობილი სამართავად მესამე პირებს მოიჯარის წერილობითი თანხმობის გარეშე.</p>
                  <p className="pl-3">4.2.3. დააბრუნოს მანქანა იმავე მდგომარეობაში, როგორიც მიიღო, საწვავის იმავე რაოდენობით.</p>
                  <p className="pl-3">4.2.4. უბედური შემთხვევის ან სხვა შემთხვევის შემთხვევაში დაუყოვნებლივ აცნობოს მოიჯარეს და შესაბამის სამსახურებს.</p>
                  <p className="pl-3">
                    4.2.5. მეიჯარე იღებს ვალდებულებას არ მართოს სატრანსპორტო საშუალება ალკოჰოლის, ნარკოტიკების ან სხვა ინტოქსიკაციის ზემოქმედების ქვეშ, ან დაღლილობის შემთხვევაში, რამაც შესაძლოა სატრანსპორტო საშუალების მართვა სახიფათო გახადოს.
                  </p>
                </div>
              </div>

              {/* 5. მხარეთა პასუხისმგებლობა */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  5. მხარეთა პასუხისმგებლობა
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>5.1. მოიჯარის პასუხისმგებლობა</strong></p>
                  <p className="pl-3">5.1.1. მეიჯარე პასუხისმგებელია: საბურავების, ავტომობილის ძირის დაზიანება, აგრეთვე მისი ბრალეულობით გამოწვეული ავტომობილის გაუმართაობაზე; დოკუმენტების, გასაღებების, აქსესუარების დაკარგვაზე.</p>
                  <p className="pl-3">
                    5.1.2. მეიჯარე პასუხისმგებელია ავტომობილის სალონის ელემენტების უსაფრთხოებაზე. მანქანის ინტერიერის ელემენტების დაზიანების, მძიმე დაბინძურების ან დაკარგვის შემთხვევაში მეიჯარე იღებს ვალდებულებას გადაიხადოს ჯარიმა <strong>500 (ხუთასი) ლარის</strong> ოდენობით.
                  </p>
                  <p className="pl-3">
                    5.1.3. მეიჯარე არ არის პასუხისმგებელი სატრანსპორტო საშუალების გაუმართაობაზე, რომელიც წარმოიქმნება მოიჯარის ბრალით ან ბუნებრივი ცვეთა და გაფუჭების შედეგად.
                  </p>
                  <p className="pl-3">
                    5.1.4. ავტომობილის შიგნით მოწევა კატეგორიულად აკრძალულია. ამ პირობის დარღვევის შემთხვევაში მეიჯარე იღებს ვალდებულებას გადაიხადოს ჯარიმა ოდენობით <strong>300 (სამასი) ლარი</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.5. დამქირავებელს ეკრძალება მანქანის გამოყენება დრიფტის, ქუჩის რბოლისთვის ან სხვა ექსტრემალური მანევრებისთვის. ამ მუხლის დარღვევის შემთხვევაში მეიჯარე იღებს ვალდებულებას გადაიხადოს ჯარიმა <strong>1500 (ათას ხუთასი) ლარის</strong> ოდენობით.
                  </p>
                  <p className="pl-3">
                    5.1.6. იმ შემთხვევაში, თუ მანქანა მოხვდება საჯარიმო სადგომამდე მეიჯარის ბრალეულობით, ყველა ხარჯს, რომელიც დაკავშირებულია მანქანის ბუქსირებასთან და გაჩერებასთან დარჩენასთან, იხდის მეიჯარე.
                  </p>
                  <p className="pl-3">
                    5.1.7. მეიჯარე ასევე იღებს ვალდებულებას, გადაიხადოს მანქანის დაქირავების ღირებულება საჯარიმო სადგომზე ყოფნისას ყოველი დაყოვნებული დღისთვის, მოიჯარესთან დაბრუნების მომენტამდე.
                  </p>
                  <p className="pl-3">
                    5.1.8. დამქირავებელს ეკრძალება ნაქირავებ მანქანით <strong>თუშეთში და გერგეთში ჩასვლა</strong>, ასევე <strong>საქართველოდან გასვლა</strong>. ამ პირობის დარღვევის შემთხვევაში მეიჯარე იღებს ვალდებულებას გადაიხადოს ჯარიმა <strong>1000 (ერთი ათასი) ლარის</strong> ოდენობით.
                  </p>
                  <p><strong>5.2. მოიჯარის პასუხისმგებლობა</strong></p>
                  <p className="pl-3">5.2.1. მოიჯარე არ არის პასუხისმგებელი იჯარის პერიოდში მეიჯარეზე დარიცხულ ჯარიმებზე.</p>
                </div>
              </div>

              {/* 6. დაზღვევა */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  6. დაზღვევა
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>6.1. მანქანის დაზღვევა ფარავს მხოლოდ ავტოსაგზაო სატრანსპორტო შემთხვევის (ასს) შედეგად მიყენებულ ზიანს.</p>
                  <p>6.2. დაზღვევა არ ფარავს: მანქანის ძირის დაზიანებას; საბურავების, დისკების და ბორბლების დაზიანებას; გაუმართაობა, რომელიც წარმოიშვა მეიჯარის ბრალეულობით, ავტომობილის ექსპლუატაციის წესების დარღვევის გამო; ნასვამ მდგომარეობაში სატრანსპორტო საშუალების მართვის, წითელ შუქნიშანზე ან უწყვეტი ხაზის, საპირისპირო მიმართულებით გადაკვეთის შედეგად გამოწვეული დაზიანებას.</p>
                  <p>6.3. 6.2 პუნქტში მითითებული მოვლენების შედეგად გაწეული ყველა ხარჯზე მთლიანად ეკისრება მეიჯარეს პასუხისმგებლობა.</p>
                </div>
              </div>

              {/* 7. ავტომობილის დაბრუნების პროცედურა */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  7. ავტომობილის დაბრუნების პროცედურა
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>7.1. მეიჯარე იღებს ვალდებულებას დააბრუნოს მანქანა წინამდებარე ხელშეკრულების მე-2 ნაწილში მითითებულ ვადაში.</p>
                  <p>7.2. სატრანსპორტო საშუალების დაბრუნების დაგვიანების შემთხვევაში მეიჯარე ვალდებულია წინასწარ აცნობოს მოიჯარეს.</p>
                  <p>7.3. თუ დაბრუნების დაგვიანების შესახებ შეტყობინება მიიღება იჯარის პერიოდის დასრულებამდე 4 საათზე ნაკლებ დროში, მეიჯარე გადაიხდის ქირის დამატებით დღეს დადგენილი ღირებულებით.</p>
                </div>
              </div>

              {/* 8. ავტომობილის მდგომარეობის ფიქსაციის ჩატარების წესი */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  8. ავტომობილის მდგომარეობის ფიქსაციის ჩატარების წესი
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>8.1. მანქანის მოიჯარისადმი გადაცემამდე, ორივე მხარის თანხმობით ვიდეოზე ფიქსირდება ძარის და სალონის მდგომარეობა, აქსესუარების არსებობა და საწვავის დონე.</p>
                  <p>8.2. ავტომობილის დაბრუნებისას მდგომარეობის დადგენის საფუძველია ვიდეოფიქსაცია.</p>
                  <p>8.3. ვიდეო ინახება ორივე მხარის მიერ და შესაძლებელია მოთხოვნის შემთხვევაში წარდგენილი იყოს დავის შემთხვევაში.</p>
                </div>
              </div>

              {/* 9. მძღოლისადმი მოთხოვნები */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  9. მძღოლისადმი მოთხოვნები
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>9.1. მძღოლს, რომელიც მართავს იჯარით აღებულ მანქანას, უნდა ჰქონდეს მოქმედი მართვის მოწმობა მართვის მინიმუმ ორ წლიანი გამოცდილებით.</p>
                  <p>9.2. მძღოლი უნდა იყოს 21 წელზე მეტი ასაკის.</p>
                  <p>9.3. ამ მოთხოვნების შეუსრულებლობის შემთხვევაში, მეიჯარეს ეკისრება სრულ პასუხისმგებლობას ყველა შედეგებზე, მათ შორის ჯარიმებსა და ზარალზე და შეიძლება ჩამოერთვას მანქანის იჯარის უფლება. დაზღვევა არ მოქმედებს 9.1 პუნქტისა და 9.2 პუნქტის მოთხოვნების შეუსრულებლობის შემთხვევაში.</p>
                </div>
              </div>

              {/* 10. ფორს- მაჟორი */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  10. ფორს- მაჟორი
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>10.1. მხარეები თავისუფლდებიან პასუხისმგებლობისგან ხელშეკრულებით ნაკისრი ვალდებულებების სრულად ან ნაწილობრივ შეუსრულებლობისთვის, თუ ვალდებულებების შეუსრულებლობა იყო ფორსმაჟორული გარემოების შედეგი, კერძოდ: ხანძარი, წყალდიდობა, მიწისძვრა, გაფიცვა, ომი, სამთავრობო ხელისუფლების მოქმედებები ან მხარეთა კონტროლის მიღმა სხვა გარემოებები.</p>
                  <p>10.2. მხარემ, რომელიც ვერ ასრულებს ხელშეკრულებით ნაკისრ ვალდებულებებს, დაუყოვნებლივ, მაგრამ არა უგვიანეს ერთი კალენდარული დღისა ფორსმაჟორული გარემოებების დადგომიდან, უნდა აცნობოს მეორე მხარეს წერილობით ან ზეპირად, კომპეტენტური ორგანოების მიერ გაცემული დამადასტურებელი დოკუმენტებით.</p>
                  <p>10.3. მხარეები აღიარებენ, რომ გადახდისუუნარობა არ არის ფორსმაჟორული მოვლენა.</p>
                </div>
              </div>

              {/* 11. სხვა პირობები */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  11. სხვა პირობები
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>11.1. წინამდებარე ხელშეკრულება ძალაში შედის ხელმოწერის მომენტიდან და ძალაში იქნება მანამ, სანამ მხარეები სრულად არ შეასრულებენ მის ყველა პირობას.</p>
                  <p>11.2. მეიჯარის მიერ წინამდებარე ხელშეკრულების რომელიმე დებულების დარღვევის შემთხვევაში მოიჯარეს უფლება აქვს ცალმხრივად შეწყვიტოს ეს ხელშეკრულება მანქანის შესაძლო შემდგომი ჩამორთმევით დეპოზიტის გადახდის გარეშე. თუ დეპოზიტის ოდენობა არასაკმარისია მოიჯარისთვის მიყენებული ზიანის დასაფარად, მეიჯარე იღებს ვალდებულებას დარჩენილი თანხა გადაუხადოს მოიჯარეს მანქანის დაბრუნების მომენტიდან 1 (ერთი) კალენდარული დღის განმავლობაში.</p>
                  <p>11.3. ეს ხელშეკრულება შედგენილია ორ ეგზემპლარად, თითო თითოეული მხარისთვის, თითოეულს აქვს თანაბარი იურიდიული ძალა.</p>
                  <p>11.4. ყველა დავა და უთანხმოება, რომელიც შეიძლება წარმოიშვას ამ შეთანხმებიდან ან მასთან დაკავშირებით, მოგვარდება მოლაპარაკებების გზით. თუ მხარეები ვერ მიაღწევენ შეთანხმებას, საქმე განიხილება სასამართლოში მოიჯარის ადგილმდებარეობით საქართველოს ტერიტორიაზე.</p>
                  <p>11.5. მხარეთა მიერ ერთმანეთის მიმართ შეტყობინების სათანადო მეთოდი აღიარებულია როგორც წერილობითი შეტყობინება, რომელიც გაგზავნილია ხელშეკრულებაში მითითებულ მისამართზე SMS-ით, WhatsApp-ით, Telegram-ით, ელექტრონული ფოსტით.</p>
                </div>
              </div>

              {/* 12. ავტომობილის სამართავად დაშვებული მძღოლები */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  12. ავტომობილის სამართავად დაშვებული მძღოლები
                </h2>
                <table className="w-full mt-1.5 border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1 w-8 text-center">№</th>
                      <th className="border border-slate-300 p-1 text-left">გვარი, სახელი, მამის სახელი</th>
                      <th className="border border-slate-300 p-1 text-left">მართვის მოწმობის ნომერი</th>
                      <th className="border border-slate-300 p-1 text-left w-32">მოქმედების ვადა</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1 text-center font-bold">1.</td>
                      <td className="border border-slate-300 p-1 font-semibold">{customerName}</td>
                      <td className="border border-slate-300 p-1 font-mono">{customerLicense}</td>
                      <td className="border border-slate-300 p-1">
                        {customerExpiry ? `${customerExpiry}-მდე` : "მოქმედი"}
                      </td>
                    </tr>
                    {[0, 1, 2, 3].map((idx) => {
                      const d = getExtraDriver(idx);
                      const dExpiry = d?.expiry
                        ? `${d.expiry}-მდე`
                        : (d ? "მოქმედი" : (idx === 0 ? "—" : "\u00A0"));
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-1 text-center font-bold">{idx + 2}.</td>
                          <td className="border border-slate-300 p-1">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1">{dExpiry}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 13. მხარეთა რეკვიზიტები */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  13. მხარეთა რეკვიზიტები
                </h2>
                <div className="grid grid-cols-2 gap-3 mt-1.5 border border-slate-300 p-2.5 rounded text-[11px] bg-slate-50/50">
                  <div className="space-y-0.5 border-r border-slate-200 pr-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">მოიჯარე:</p>
                    <p className="font-bold">ინდივიდუალური მეწარმე ანდრეი კოლესნიკოვ</p>
                    <p>საიდენტიფიკაციო ნომერი: <strong className="font-mono">306401934</strong></p>
                    <p>ტელეფონი: <strong className="font-mono">+995591181430</strong></p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">მეიჯარე:</p>
                    <p>გვარი, სახელი: <strong className="underline">{customerName}</strong></p>
                    <p>პასპორტი: <strong>{customerPassport}</strong></p>
                    {customerLicense && customerLicense !== "—" && (
                      <p>მართვის მოწმობა: <strong className="font-mono">{customerLicense}</strong></p>
                    )}
                    <p>საკონტაქტო ტელეფონი: <strong className="font-mono">{customerPhone}</strong></p>
                  </div>
                </div>
              </div>

              {/* 14. მხარეთა ხელმოწერები */}
              <div className="pt-2">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  14. მხარეთა ხელმოწერები
                </h2>
                <div className="grid grid-cols-2 gap-6 mt-3 text-center">
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">მოიჯარე: ა. კოლესნიკოვი / ხელმოწერა</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">მეიჯარე: {customerName} / ხელმოწერა</p>
                  </div>
                </div>
              </div>

              {/* 15. ავტომობილის გადაცემა მეიჯარისთვის */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  15. ავტომობილის გადაცემა მეიჯარისთვის
                </h2>
                <div className="mt-1 space-y-1">
                  <p>გადაცემის თარიღი: <strong className="underline font-mono">{formatDate(booking.startDate, "GE")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">ავტომობილი გადასცა მოიჯარემ (ხელმოწერა)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">ავტომობილი მიიღო მეიჯარემ (ხელმოწერა)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 16. მოიჯარისთვის ავტომობილის დაბრუნება */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  16. მოიჯარისთვის ავტომობილის დაბრუნება
                </h2>
                <div className="mt-1 space-y-1">
                  <p className="font-semibold text-slate-800">
                    მხარეები ადასტურებენ, რომ ერთმანეთის მიმართ პრეტენზიები არ აქვთ.
                  </p>
                  <p>დაბრუნების თარიღი: <strong className="underline font-mono">{formatDate(booking.endDate, "GE")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">მოიჯარე: მიიღო (ხელმოწერა)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">მეიჯარე: ჩააბარა (ხელმოწერა)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================
              ENGLISH CONTRACT VERSION (Professional Translation)
             ======================================================== */}
          {lang === "EN" && (
            <div className="space-y-3.5">
              {/* Title & Preamble */}
              <div className="text-center pb-2">
                <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-wide">
                  VEHICLE RENTAL AGREEMENT (DAILY RENTAL) W/N
                </h1>
                <div className="flex justify-between items-center text-xs mt-2 border-b border-slate-300 pb-1.5">
                  <span className="font-semibold">{getCityName("EN")}</span>
                  <span className="font-semibold">{getContractDateStr("EN")}</span>
                </div>
              </div>

              <p className="text-justify indent-4 leading-relaxed">
                Individual Entrepreneur <strong>Andrei Kolesnikov</strong>, hereinafter referred to as the <strong>"Lessor"</strong>, on the one part, and{" "}
                <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, hereinafter referred to as the <strong>"Renter"</strong>, on the other part, have entered into this Agreement (hereinafter referred to as the "Agreement") as follows:
              </p>

              {/* 1. SUBJECT OF THE AGREEMENT */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  1. SUBJECT OF THE AGREEMENT
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>1.1. The Lessor provides the Renter with temporary use of the vehicle:</p>
                  <p className="pl-4">• Make, model: <strong className="underline">{carTitle} ({booking.car.year})</strong></p>
                  <p className="pl-4">• License plate: <strong className="underline font-mono">{plateNumber}</strong></p>
                  <p>1.2. The rental is provided on a daily payment basis.</p>
                </div>
              </div>

              {/* 2. RENTAL PERIOD */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  2. RENTAL PERIOD
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    2.1. The vehicle is rented from <strong className="underline">{formatDate(booking.startDate, "EN")}</strong> until <strong className="underline">{formatDate(booking.endDate, "EN")}</strong>.
                  </p>
                  <p>2.2. The rental period may be extended by mutual agreement of the parties.</p>
                </div>
              </div>

              {/* 3. RENTAL FEE AND DEPOSIT */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  3. RENTAL FEE AND SECURITY DEPOSIT
                </h2>
                <div className="mt-1 space-y-0.5 pl-3">
                  <p>
                    3.1. The total rental cost is <strong className="underline">{editableTotalCost} GEL</strong> (daily rate {editableDailyRate} GEL/day for {booking.rentalDays || 1} days).
                  </p>
                  <p>
                    3.2. The security deposit is <strong className="underline">{editableDeposit} GEL</strong> and will be refunded upon completion of the rental in the absence of damage and violations of this Agreement.
                  </p>
                  <p>
                    3.3. Payment is made: <strong className="underline">{getPaymentMethodText("EN")}</strong>.
                  </p>
                </div>
              </div>

              {/* 4. OBLIGATIONS OF THE PARTIES */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  4. OBLIGATIONS OF THE PARTIES
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>4.1. OBLIGATIONS OF THE LESSOR</strong></p>
                  <p className="pl-3">4.1.1. Provide the vehicle to the Renter in good mechanical and operational condition.</p>
                  <p className="pl-3">
                    4.1.2. In the event of a vehicle breakdown during rental due to the fault of the Lessor, provide necessary assistance to repair the fault or replace the vehicle.
                  </p>
                  <p><strong>4.2. OBLIGATIONS OF THE RENTER</strong></p>
                  <p className="pl-3">4.2.1. Use the vehicle strictly for its intended purpose and comply with Georgian traffic regulations.</p>
                  <p className="pl-3">4.2.2. Do not transfer vehicle operation to third parties without prior written consent of the Lessor.</p>
                  <p className="pl-3">4.2.3. Return the vehicle in the same condition as received, with the same fuel level.</p>
                  <p className="pl-3">4.2.4. In the event of an accident or other incident, immediately notify the Lessor and relevant authorities.</p>
                  <p className="pl-3">
                    4.2.5. The Renter agrees not to drive under the influence of alcohol, drugs, or under extreme fatigue.
                  </p>
                </div>
              </div>

              {/* 5. LIABILITY OF THE PARTIES */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  5. LIABILITY OF THE PARTIES
                </h2>
                <div className="mt-1 space-y-1 pl-3 text-justify">
                  <p><strong>5.1. LIABILITY OF THE RENTER</strong></p>
                  <p className="pl-3">5.1.1. The Renter is liable for: tire/wheel damage, undercarriage damage, loss of documents/keys/accessories, or faults arising through Renter's fault.</p>
                  <p className="pl-3">
                    5.1.2. The Renter is liable for the interior condition. In case of damage, severe contamination, or loss of interior parts, the Renter pays a fine of <strong>500 GEL</strong>.
                  </p>
                  <p className="pl-3">5.1.3. The Renter is not liable for faults resulting from fair wear and tear or Lessor's fault.</p>
                  <p className="pl-3">
                    5.1.4. Smoking in the vehicle is strictly prohibited. Violation penalty: <strong>300 GEL</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.5. Drifting, street racing, or extreme maneuvers are prohibited. Penalty: <strong>1,500 GEL</strong>.
                  </p>
                  <p className="pl-3">
                    5.1.6. If the car is impounded due to Renter's fault, all evacuation and parking fees are borne by the Renter.
                  </p>
                  <p className="pl-3">
                    5.1.7. The Renter also pays the daily rental rate for every day of vehicle impoundment until return to the Lessor.
                  </p>
                  <p className="pl-3">
                    5.1.8. It is strictly prohibited to visit <strong>Tusheti and Gergeti</strong>, or to <strong>cross Georgian borders</strong>. Penalty: <strong>1,000 GEL</strong>.
                  </p>
                  <p><strong>5.2. LIABILITY OF THE LESSOR</strong></p>
                  <p className="pl-3">5.2.1. The Lessor is not liable for traffic fines issued to the Renter during the rental period.</p>
                </div>
              </div>

              {/* 6. INSURANCE */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  6. INSURANCE
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>6.1. Vehicle insurance covers strictly damage resulting from traffic accidents (collisions).</p>
                  <p>6.2. Insurance does NOT cover: undercarriage damage; tire and rim damage; faults caused by violation of operational rules; damage resulting from driving while intoxicated, running red lights, or crossing solid center lines into oncoming traffic.</p>
                  <p>6.3. All expenses arising from events in clause 6.2 are borne entirely by the Renter.</p>
                </div>
              </div>

              {/* 7. VEHICLE RETURN PROCEDURE */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  7. VEHICLE RETURN PROCEDURE
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>7.1. The Renter agrees to return the vehicle within the timeframe specified in Section 2.</p>
                  <p>7.2. In case of delay, the Renter must notify the Lessor in advance.</p>
                  <p>7.3. If notification is provided less than 4 hours before expiration, the Renter pays for an additional rental day.</p>
                </div>
              </div>

              {/* 8. CONDITION INSPECTION & VIDEO RECORDING */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  8. VEHICLE CONDITION INSPECTION PROCEDURE
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>8.1. Prior to handover, body, interior, accessories, and fuel level are recorded on video with mutual consent.</p>
                  <p>8.2. Video recording serves as the authoritative evidence for condition upon return.</p>
                  <p>8.3. The video is retained by both parties and presented upon request in case of dispute.</p>
                </div>
              </div>

              {/* 9. DRIVER REQUIREMENTS */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  9. DRIVER REQUIREMENTS
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>9.1. The driver must hold a valid driver's license with at least two years of driving experience.</p>
                  <p>9.2. The driver must be at least 21 years of age.</p>
                  <p>9.3. In case of non-compliance, insurance is void and the Renter assumes full liability for all consequences and damages.</p>
                </div>
              </div>

              {/* 10. FORCE MAJEURE */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  10. FORCE MAJEURE
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>10.1. Parties are exempt from liability for failure to fulfill obligations due to force majeure events (fire, flood, earthquake, war, government actions, etc.).</p>
                  <p>10.2. The affected party must notify the other party within 1 calendar day with official certification.</p>
                  <p>10.3. Inability to pay is not considered a force majeure event.</p>
                </div>
              </div>

              {/* 11. MISCELLANEOUS */}
              <div>
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  11. OTHER CONDITIONS
                </h2>
                <div className="mt-1 space-y-0.5 pl-3 text-justify">
                  <p>11.1. This Agreement takes effect upon signing and remains in force until full execution by both parties.</p>
                  <p>11.2. In case of breach, the Lessor may unilaterally terminate the Agreement and repossess the vehicle without deposit refund.</p>
                  <p>11.3. Prepared in two copies with equal legal force.</p>
                  <p>11.4. Disputes shall be resolved through negotiation, or under Georgian court jurisdiction at the Lessor's location.</p>
                  <p>11.5. Legitimate notification includes SMS, WhatsApp, Telegram, or email addresses specified herein.</p>
                </div>
              </div>

              {/* 12. AUTHORIZED DRIVERS */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  12. AUTHORIZED DRIVERS
                </h2>
                <table className="w-full mt-1.5 border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1 w-8 text-center">№</th>
                      <th className="border border-slate-300 p-1 text-left">Full Name</th>
                      <th className="border border-slate-300 p-1 text-left">Driver License Number</th>
                      <th className="border border-slate-300 p-1 text-left w-32">Validity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1 text-center font-bold">1.</td>
                      <td className="border border-slate-300 p-1 font-semibold">{customerName}</td>
                      <td className="border border-slate-300 p-1 font-mono">{customerLicense}</td>
                      <td className="border border-slate-300 p-1">
                        {customerExpiry ? `Until ${customerExpiry}` : "Valid"}
                      </td>
                    </tr>
                    {[0, 1, 2, 3].map((idx) => {
                      const d = getExtraDriver(idx);
                      const dExpiry = d?.expiry
                        ? `Until ${d.expiry}`
                        : (d ? "Valid" : (idx === 0 ? "—" : "\u00A0"));
                      return (
                        <tr key={idx}>
                          <td className="border border-slate-300 p-1 text-center font-bold">{idx + 2}.</td>
                          <td className="border border-slate-300 p-1">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                          <td className="border border-slate-300 p-1">{dExpiry}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 13. DETAILS OF PARTIES */}
              <div className="pt-1">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  13. DETAILS OF PARTIES
                </h2>
                <div className="grid grid-cols-2 gap-3 mt-1.5 border border-slate-300 p-2.5 rounded text-[11px] bg-slate-50/50">
                  <div className="space-y-0.5 border-r border-slate-200 pr-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">Lessor:</p>
                    <p className="font-bold">Individual Entrepreneur Andrei Kolesnikov</p>
                    <p>Tax Identification Number: <strong className="font-mono">306401934</strong></p>
                    <p>Phone: <strong className="font-mono">+995591181430</strong></p>
                  </div>
                  <div className="space-y-0.5 pl-2">
                    <p className="font-bold text-slate-800 uppercase text-[10px]">Renter:</p>
                    <p>Full Name: <strong className="underline">{customerName}</strong></p>
                    <p>Passport / ID: <strong>{customerPassport}</strong></p>
                    {customerLicense && customerLicense !== "—" && (
                      <p>Driver License: <strong className="font-mono">{customerLicense}</strong></p>
                    )}
                    <p>Contacts: <strong className="font-mono">{customerPhone}</strong></p>
                  </div>
                </div>
              </div>

              {/* 14. SIGNATURES */}
              <div className="pt-2">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  14. SIGNATURES OF THE PARTIES
                </h2>
                <div className="grid grid-cols-2 gap-6 mt-3 text-center">
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">Lessor: Kolesnikov A. / Signature</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-5"></div>
                    <p className="text-[10px] text-slate-500 mt-1">Renter: {customerName} / Signature</p>
                  </div>
                </div>
              </div>

              {/* 15. HANDOVER ACT */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  15. VEHICLE HANDOVER ACT
                </h2>
                <div className="mt-1 space-y-1">
                  <p>Handover Date: <strong className="underline font-mono">{formatDate(booking.startDate, "EN")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Handed over by Lessor (Signature)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Received by Renter (Signature)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 16. RETURN ACT */}
              <div className="pt-2 border-t border-slate-300">
                <h2 className="font-bold uppercase text-[11px] border-b border-slate-200 pb-0.5">
                  16. VEHICLE RETURN ACT
                </h2>
                <div className="mt-1 space-y-1">
                  <p className="font-semibold text-slate-800">
                    The parties confirm that they have no mutual claims against each other.
                  </p>
                  <p>Return Date: <strong className="underline font-mono">{formatDate(booking.endDate, "EN")}</strong></p>
                  <div className="grid grid-cols-2 gap-6 pt-2 text-center">
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Lessor: Received (Signature)</p>
                    </div>
                    <div>
                      <div className="border-b border-slate-400 pb-4"></div>
                      <p className="text-[10px] text-slate-500 mt-1">Renter: Returned (Signature)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Action Bar (Hidden on print) */}
        <div className="bg-slate-100 px-6 py-3 border-t flex items-center justify-between print:hidden shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <span className="font-bold text-slate-700">Форма договора:</span>
            <span>ИП Колесников Андрей (ИН: 306401934)</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
            >
              Закрыть
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs shadow-lg transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Распечатать договор</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
