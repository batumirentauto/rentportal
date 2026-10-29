"use client";

import React, { useState } from "react";
import { X, Download, FileText, Edit3, Loader2 } from "lucide-react";

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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

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

  // Direct 2-Page PDF Download Handler
  const handleDownloadPdf = async () => {
    if (typeof window === "undefined") return;
    const page1El = document.getElementById("contract-page-1");
    const page2El = document.getElementById("contract-page-2");
    if (!page1El || !page2El) {
      alert("Элементы договора не найдены на странице");
      return;
    }

    setIsDownloading(true);
    try {
      // Use html2canvas-pro for full Tailwind v4 OKLCH color support
      const html2canvasPro = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const cleanCustomer = (customerName || "клиент")
        .trim()
        .replace(/[^\wа-яА-ЯёЁა-ჰ-]/g, "_");
      const filename = `Договор_${booking.bookingNumber}_${cleanCustomer}_${lang}.pdf`;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pdfWidth = 210;
      const pdfHeight = 297;

      const renderOptions = {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1000,
        onclone: (clonedDoc: Document) => {
          const p1 = clonedDoc.getElementById("contract-page-1");
          const p2 = clonedDoc.getElementById("contract-page-2");
          [p1, p2].forEach((el) => {
            if (el) {
              el.style.width = "794px";
              el.style.minWidth = "794px";
              el.style.maxWidth = "794px";
              if (el.parentElement) {
                el.parentElement.style.width = "820px";
                el.parentElement.style.minWidth = "820px";
              }
            }
          });
        },
      };

      // 1. Render Page 1
      const canvas1 = await html2canvasPro(page1El, renderOptions);
      const img1 = canvas1.toDataURL("image/jpeg", 0.98);
      pdf.addImage(img1, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      // 2. Render Page 2
      pdf.addPage();
      const canvas2 = await html2canvasPro(page2El, renderOptions);
      const img2 = canvas2.toDataURL("image/jpeg", 0.98);
      pdf.addImage(img2, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      // 3. Generate blob & trigger reliable mobile/desktop download
      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);

      // Check for mobile iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

      // Check if Web Share API with Files is supported (ideal for mobile iOS / Android)
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });
      if (
        isIOS &&
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        try {
          await navigator.share({
            files: [pdfFile],
            title: filename,
          });
          return;
        } catch (shareErr: any) {
          // If user cancelled the share sheet, do nothing; otherwise fallback to link download
          if (shareErr.name === "AbortError") {
            return;
          }
        }
      }

      // Standard / fallback download via anchor tag
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      if (isIOS) {
        link.target = "_blank";
      }
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 2000);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert(`Не удалось сформировать PDF: ${err?.message || err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Top Control Bar */}
        <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-extrabold tracking-tight">
                Договор аренды № {booking.bookingNumber}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                ИП Колесников Андрей (ИН: 306401934) • {carTitle} ({plateNumber})
              </p>
            </div>
          </div>

          {/* Language Switcher Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => handleSelectLanguage("RU")}
              className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 ${
                lang === "RU"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇷🇺 RU</span>
            </button>
            <button
              onClick={() => handleSelectLanguage("GE")}
              className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 ${
                lang === "GE"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇬🇪 GE</span>
            </button>
            <button
              onClick={() => handleSelectLanguage("EN")}
              className={`px-2.5 py-1 rounded-lg transition flex items-center space-x-1 ${
                lang === "EN"
                  ? "bg-amber-500 text-slate-950 font-black shadow"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <span>🇬🇧 EN</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowEditControls(!showEditControls)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center space-x-1"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{showEditControls ? "Скрыть" : "Параметры"}</span>
            </button>

            {/* Direct PDF Download Button (no print dialog needed) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black px-3.5 py-1.5 sm:py-2 rounded-xl text-xs shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Скачать отдельным файлом PDF ровно на 2-х страницах"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
                  <span>Формирование...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-slate-950" />
                  <span>Скачать PDF (2 стр.)</span>
                </>
              )}
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

        {/* Quick Edit Parameters Drawer */}
        {showEditControls && (
          <div className="bg-slate-800/90 border-b border-slate-700 p-3 sm:px-6 text-xs text-slate-200 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0 animate-in slide-in-from-top-2">
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
              <label className="text-[10px] text-slate-400 block mb-1">2-й водитель (ФИО):</label>
              <input
                type="text"
                placeholder="Имя Фамилия"
                value={secondDriverName}
                onChange={(e) => setSecondDriverName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs"
              />
            </div>
          </div>
        )}

        {/* Scrollable Preview Canvas with 2 Distinct A4 Pages */}
        <div className="overflow-y-auto bg-slate-950/70 p-3 sm:p-6 flex flex-col items-center space-y-5">
          
          {/* ========================================================
              PAGE 1 (SECTIONS 1 TO 6) - GUARANTEED EXACT A4 FIT
             ======================================================== */}
          <div
            id="contract-page-1"
            className="w-full bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-200"
            style={{
              maxWidth: "794px",
              minHeight: "1123px",
              padding: "24px 34px 16px 34px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            <div className="space-y-2 text-[9pt] leading-[1.24]">
              {/* RUSSIAN PAGE 1 */}
              {lang === "RU" && (
                <>
                  <div className="text-center pb-1">
                    <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      ДОГОВОР АРЕНДЫ АВТОМОБИЛЯ (ПОСУТОЧНАЯ АРЕНДА) Б/Н
                    </h1>
                    <div className="flex justify-between items-center text-[8.5pt] mt-1 border-b border-slate-300 pb-1">
                      <span className="font-semibold">{getCityName("RU")}</span>
                      <span className="font-semibold">{getContractDateStr("RU")}</span>
                    </div>
                  </div>

                  <p className="text-justify indent-3">
                    Индивидуальный предприниматель <strong>Колесников Андрей</strong>, именуемый в дальнейшем <strong>«Арендодатель»</strong> с одной стороны, и{" "}
                    <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, именуемый(ая) в дальнейшем <strong>«Арендатор»</strong>, с другой стороны, заключили настоящий договор (далее — «Договор») о нижеследующем:
                  </p>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">1. ПРЕДМЕТ ДОГОВОРА</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>1.1. Арендодатель предоставляет Арендатору во временное пользование автомобиль:</p>
                      <p className="pl-3">• Марка, модель: <strong className="underline">{carTitle} ({booking.car.year} г.)</strong>, Госномер: <strong className="underline font-mono">{plateNumber}</strong></p>
                      <p>1.2. Аренда предоставляется на условиях посуточной оплаты.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">2. СРОК АРЕНДЫ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>2.1. Автомобиль передаётся в аренду с <strong className="underline">{formatDate(booking.startDate, "RU")}</strong> до <strong className="underline">{formatDate(booking.endDate, "RU")}</strong>.</p>
                      <p>2.2. Срок аренды может быть продлён по согласованию сторон.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">3. ПЛАТА ЗА АРЕНДУ И ЗАЛОГ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>3.1. Стоимость аренды составляет <strong className="underline">{editableTotalCost} лари</strong> (тариф {editableDailyRate} лари/сутки за {booking.rentalDays || 1} сут.).</p>
                      <p>3.2. Залог составляет <strong className="underline">{editableDeposit} лари</strong> и возвращается после окончания аренды при отсутствии повреждений и нарушений условий Договора.</p>
                      <p>3.3. Оплата производится: <strong className="underline">{getPaymentMethodText("RU")}</strong>.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">4. ОБЯЗАННОСТИ СТОРОН</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p><strong>4.1. ОБЯЗАННОСТИ АРЕНДОДАТЕЛЯ:</strong> 4.1.1. Передать автомобиль в исправном техническом состоянии. 4.1.2. При возникновении неисправностей по вине Арендодателя оказать помощь в устранении или заменить автомобиль.</p>
                      <p><strong>4.2. ОБЯЗАННОСТИ АРЕНДАТОРА:</strong> 4.2.1. Использовать автомобиль по назначению, соблюдать ПДД Грузии. 4.2.2. Не передавать управление третьим лицам без согласия Арендодателя. 4.2.3. Возвратить автомобиль в том же состоянии с тем же уровнем топлива. 4.2.4. При ДТП незамедлительно уведомить Арендодателя и полицию. 4.2.5. Не управлять автомобилем в состоянии алкогольного или наркотического опьянения.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">5. ОТВЕТСТВЕННОСТЬ СТОРОН</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.5pt] leading-tight">
                      <p><strong>5.1. ОТВЕТСТВЕННОСТЬ АРЕНДАТОРА:</strong></p>
                      <p>5.1.1. Арендатор отвечает за повреждения шин, днища, утрату документов/ключей.</p>
                      <p>5.1.2. При сильном загрязнении, повреждении элементов салона штраф составляет <strong>500 (пятьсот) лари</strong>.</p>
                      <p>5.1.3. Арендатор не несёт ответственности за естественный износ деталей автомобиля.</p>
                      <p>5.1.4. Курение в салоне строго запрещено. Штраф составляет <strong>300 (триста) лари</strong>.</p>
                      <p>5.1.5. Дрифт, уличные гонки и экстремальные манёвры запрещены. Штраф: <strong>1500 (одна тысяча пятьсот) лари</strong>.</p>
                      <p>5.1.6. При попадании на штрафстоянку по вине Арендатора все расходы и простой оплачиваются Арендатором.</p>
                      <p>5.1.7. Арендатор оплачивает стоимость аренды за каждый день простоя автомобиля на штрафстоянке.</p>
                      <p>5.1.8. Запрещается посещать <strong>Тушети и Гергети</strong> и <strong>выезжать за пределы Грузии</strong>. Штраф: <strong>1000 (одна тысяча) лари</strong>.</p>
                      <p><strong>5.2. ОТВЕТСТВЕННОСТЬ АРЕНДОДАТЕЛЯ:</strong> 5.2.1. Арендодатель не несёт ответственности за штрафы, выписанные Арендатору во время аренды.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">6. СТРАХОВАНИЕ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p>6.1. Страховка автомобиля покрывает исключительно ущерб при ДТП.</p>
                      <p>6.2. Страховка не покрывает: днище, шины, диски, нетрезвое вождение, проезд на красный сигнал и пересечение сплошной линии встречного направления.</p>
                      <p>6.3. Все расходы по случаям п.6.2 полностью возлагаются на Арендатора.</p>
                    </div>
                  </div>
                </>
              )}

              {/* GEORGIAN PAGE 1 */}
              {lang === "GE" && (
                <>
                  <div className="text-center pb-1">
                    <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      ავტომობილის იჯარის ხელშეკრულება (დღიური გაქირავება)
                    </h1>
                    <div className="flex justify-between items-center text-[8.5pt] mt-1 border-b border-slate-300 pb-1">
                      <span className="font-semibold">{getCityName("GE")}</span>
                      <span className="font-semibold">{getContractDateStr("GE")}</span>
                    </div>
                  </div>

                  <p className="text-justify indent-3">
                    ერთის მხრივ ინდივიდუალური მეწარმე <strong>ანდრეი კოლესნიკოვ</strong>, შემდგომში წოდებული <strong>„მოიჯარედ“</strong> და მეორეს მხრივ{" "}
                    <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, შემდგომში წოდებული <strong>„მეიჯარედ“</strong>, დავდეთ წინამდებარე ხელშეკრულება შემდეგზე:
                  </p>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">1. ხელშეკრულების საგანი</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>1.1. მოიჯარე გადასცემს მეიჯარე დროებით სარგებლობაში ავტომობილს:</p>
                      <p className="pl-3">• მარკა, მოდელი: <strong className="underline">{carTitle} ({booking.car.year} წ.)</strong>, სახელმწიფო ნომერი: <strong className="underline font-mono">{plateNumber}</strong></p>
                      <p>1.2. იჯარა ხორციელდება დღიური გადახდის პირობებზე.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">2. იჯარის ვადა</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>2.1. ავტომობილი გადაეცემა იჯარით <strong className="underline">{formatDate(booking.startDate, "GE")}</strong> დან <strong className="underline">{formatDate(booking.endDate, "GE")}</strong> მდე.</p>
                      <p>2.2. იჯარის ვადა შეიძლება გახანგრძლივდეს მხარეთა შეთანხმებით.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">3. იჯარის გადასახადი და გირაო</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>3.1. იჯარის გადასახადი შეადგენს <strong className="underline">{editableTotalCost} ლარს</strong> (დღიური ტარიფი {editableDailyRate} ლარი).</p>
                      <p>3.2. გირაო შეადგენს <strong className="underline">{editableDeposit} ლარს</strong> და ბრუნდება იჯარის დასრულების შემდეგ დაზიანებების არარსებობისას.</p>
                      <p>3.3. გადახდა ხორციელდება: <strong className="underline">{getPaymentMethodText("GE")}</strong>.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">4. მხარეთა ვალდებულებები</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p><strong>4.1. მოიჯარის ვალდებულებები:</strong> 4.1.1. გადასცეს ავტომობილი გამართულ მდგომარეობაში. 4.1.2. გაუმართაობისას აღმოფხვრას დაზიანება ან შეცვალოს ავტომობილი.</p>
                      <p><strong>4.2. მეიჯარის ვალდებულებები:</strong> 4.2.1. გამოიყენოს ავტომობილი დანიშნულებისამებრ, დაიცვას მოძრაობის წესები. 4.2.2. არ გადასცეს მართვა მესამე პირებს. 4.2.3. დააბრუნოს ავტომობილი იმავე მდგომარეობაში და საწვავით. 4.2.4. საგზაო შემთხვევისას დაუყოვნებლივ აცნობოს მოიჯარეს.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">5. მხარეთა პასუხისმგებლობა</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.5pt] leading-tight">
                      <p>5.1.1. მეიჯარე პასუხისმგებელია საბურავების, ძირის, დოკუმენტების და გასაღების დაზიანებაზე.</p>
                      <p>5.1.2. სალონის დაზიანების ან ძლიერი დაბინძურებისას ჯარიმა: <strong>500 ლარი</strong>.</p>
                      <p>5.1.4. სალონში მოწევა მკაცრად აკრძალულია. ჯარიმა: <strong>300 ლარი</strong>.</p>
                      <p>5.1.5. დრიფტი და ექსტრემალური მანევრები აკრძალულია. ჯარიმა: <strong>1500 ლარი</strong>.</p>
                      <p>5.1.6. საჯარიმო სადგომზე მოხვედრისას ყველა ხარჯს იხდის მეიჯარე.</p>
                      <p>5.1.8. აკრძალულია <strong>თუშეთსა და გერგეთში</strong> ვიზიტი და <strong>საქართველოს საზღვრებს გარეთ გასვლა</strong>. ჯარიმა: <strong>1000 ლარი</strong>.</p>
                      <p>5.2.1. მოიჯარე არ აგებს პასუხს იჯარის დროს გამოწერილ ჯარიმებზე.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">6. დაზღვევა</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p>6.1. დაზღვევა ფარავს მხოლოდ ავტოსაგზაო შემთხვევის შედეგად მიყენებულ ზიანს.</p>
                      <p>6.2. არ იფარება: ძირის, საბურავების დაზიანება, ნასვამ მდგომარეობაში მართვა, წითელზე გავლა და უწყვეტი ხაზის გადაკვეთა.</p>
                      <p>6.3. აღნიშნული ხარჯები მთლიანად ეკისრება მეიჯარეს.</p>
                    </div>
                  </div>
                </>
              )}

              {/* ENGLISH PAGE 1 */}
              {lang === "EN" && (
                <>
                  <div className="text-center pb-1">
                    <h1 className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                      VEHICLE RENTAL AGREEMENT (DAILY RENTAL) W/N
                    </h1>
                    <div className="flex justify-between items-center text-[8.5pt] mt-1 border-b border-slate-300 pb-1">
                      <span className="font-semibold">{getCityName("EN")}</span>
                      <span className="font-semibold">{getContractDateStr("EN")}</span>
                    </div>
                  </div>

                  <p className="text-justify indent-3">
                    Individual Entrepreneur <strong>Andrei Kolesnikov</strong>, hereinafter referred to as the <strong>"Lessor"</strong>, on the one part, and{" "}
                    <span className="font-bold underline decoration-slate-400 px-1">{customerName}</span>, hereinafter referred to as the <strong>"Renter"</strong>, on the other part, have entered into this Agreement as follows:
                  </p>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">1. SUBJECT OF THE AGREEMENT</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>1.1. The Lessor provides the Renter with temporary use of the vehicle:</p>
                      <p className="pl-3">• Make, model: <strong className="underline">{carTitle} ({booking.car.year})</strong>, Plate: <strong className="underline font-mono">{plateNumber}</strong></p>
                      <p>1.2. The rental is provided on a daily payment basis.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">2. RENTAL PERIOD</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>2.1. The vehicle is rented from <strong className="underline">{formatDate(booking.startDate, "EN")}</strong> until <strong className="underline">{formatDate(booking.endDate, "EN")}</strong>.</p>
                      <p>2.2. The rental period may be extended by mutual agreement.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">3. RENTAL FEE AND SECURITY DEPOSIT</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5">
                      <p>3.1. Total rental cost is <strong className="underline">{editableTotalCost} GEL</strong> (rate {editableDailyRate} GEL/day for {booking.rentalDays || 1} days).</p>
                      <p>3.2. Security deposit is <strong className="underline">{editableDeposit} GEL</strong> and will be refunded upon return without damage.</p>
                      <p>3.3. Payment is made: <strong className="underline">{getPaymentMethodText("EN")}</strong>.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">4. OBLIGATIONS OF THE PARTIES</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p><strong>4.1. LESSOR:</strong> 4.1.1. Deliver the vehicle in good working condition. 4.1.2. Repair or replace the vehicle in case of Lessor's fault.</p>
                      <p><strong>4.2. RENTER:</strong> 4.2.1. Comply with Georgian traffic regulations. 4.2.2. Do not transfer control to third parties without consent. 4.2.3. Return in same condition and fuel level. 4.2.4. Immediately report accidents to Lessor and police. 4.2.5. Do not drive intoxicated.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">5. LIABILITY OF THE PARTIES</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.5pt] leading-tight">
                      <p>5.1.1. Renter is liable for tire/undercarriage damage, loss of documents/keys.</p>
                      <p>5.1.2. Cabin damage or severe soiling penalty: <strong>500 GEL</strong>.</p>
                      <p>5.1.4. Smoking in vehicle is strictly prohibited. Penalty: <strong>300 GEL</strong>.</p>
                      <p>5.1.5. Drifting and extreme maneuvers are prohibited. Penalty: <strong>1,500 GEL</strong>.</p>
                      <p>5.1.6. Impoundment evacuation and daily storage fees are paid by Renter.</p>
                      <p>5.1.8. Trips to <strong>Tusheti and Gergeti</strong> and <strong>crossing Georgian borders</strong> are prohibited. Penalty: <strong>1,000 GEL</strong>.</p>
                      <p>5.2.1. Lessor is not liable for traffic fines incurred by Renter.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">6. INSURANCE</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2.5 text-justify text-[8.8pt] leading-tight">
                      <p>6.1. Insurance strictly covers damage resulting from traffic collisions.</p>
                      <p>6.2. NOT covered: undercarriage, tires/rims, driving intoxicated, red lights, crossing solid center line.</p>
                      <p>6.3. All expenses under clause 6.2 are borne entirely by Renter.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Page 1 Footer */}
            <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-[7.5pt] text-slate-500 font-mono">
              <span>Договор аренды автомобиля № {booking.bookingNumber} • {carTitle} ({plateNumber})</span>
              <span className="font-bold text-slate-700">Страница 1 из 2</span>
            </div>
          </div>

          {/* Visual Divider in Modal */}
          <div className="w-full max-w-[794px] py-1.5 flex items-center justify-center space-x-2 text-[10px] sm:text-[11px] font-bold text-slate-400 bg-slate-900/90 rounded-lg border border-slate-800">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Конец страницы 1 • Страница 2 начинается ниже</span>
          </div>

          {/* ========================================================
              PAGE 2 (SECTIONS 7 TO 16) - GUARANTEED EXACT A4 FIT
             ======================================================== */}
          <div
            id="contract-page-2"
            className="w-full bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-200"
            style={{
              maxWidth: "794px",
              minHeight: "1123px",
              padding: "22px 34px 16px 34px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            }}
          >
            <div className="space-y-1.5 text-[8.6pt] leading-[1.2]">
              {/* RUSSIAN PAGE 2 */}
              {lang === "RU" && (
                <>
                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">7. ПРОЦЕДУРА ВОЗВРАТА АВТОМОБИЛЯ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>7.1. Арендатор обязуется вернуть автомобиль в срок, указанный в разделе 2 настоящего Договора.</p>
                      <p>7.2. В случае задержки возврата Арендатор обязан заранее уведомить Арендодателя.</p>
                      <p>7.3. При задержке уведомления менее чем за 4 часа оплачивается дополнительный день аренды.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">8. ФИКСАЦИЯ СОСТОЯНИЯ АВТОМОБИЛЯ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>8.1. Состояние кузова, салона, уровень топлива фиксируются на видео/фото перед передачей автомобиля.</p>
                      <p>8.2. Видеофиксация является основанием для определения состояния автомобиля при его возврате.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">9. ТРЕБОВАНИЯ К ВОДИТЕЛЮ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>9.1. Водитель должен иметь стаж более 2 лет и быть старше 21 года.</p>
                      <p>9.2. При несоответствии этим требованиям страховка не действует, ответственность несет Арендатор.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">10. ФОРС-МАЖОР И 11. ПРОЧИЕ УСЛОВИЯ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify text-[8.2pt] leading-tight">
                      <p>10.1. Стороны освобождаются от ответственности при действиях непреодолимой силы (пожар, землетрясение, война).</p>
                      <p>11.1. Договор действует до полного исполнения Сторонами обязательств. 11.2. Споры решаются в суде по месту нахождения Арендодателя в Грузии. 11.3. Уведомления по SMS, WhatsApp, Telegram, e-mail признаются надлежащими.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">12. ДОПУЩЕННЫЕ К УПРАВЛЕНИЮ ВОДИТЕЛИ</h2>
                    <table className="w-full mt-1 border-collapse border border-slate-300 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-slate-300 p-0.5 w-6 text-center">№</th>
                          <th className="border border-slate-300 p-0.5 text-left">ФИО</th>
                          <th className="border border-slate-300 p-0.5 text-left">Номер ВУ</th>
                          <th className="border border-slate-300 p-0.5 text-left w-24">Срок действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-0.5 text-center font-bold">1.</td>
                          <td className="border border-slate-300 p-0.5 font-semibold">{customerName}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{customerLicense}</td>
                          <td className="border border-slate-300 p-0.5">{customerExpiry || "Действительно"}</td>
                        </tr>
                        {[0, 1].map((idx) => {
                          const d = getExtraDriver(idx);
                          return (
                            <tr key={idx}>
                              <td className="border border-slate-300 p-0.5 text-center font-bold">{idx + 2}.</td>
                              <td className="border border-slate-300 p-0.5">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5">{d?.expiry || (d ? "Действительно" : (idx === 0 ? "—" : "\u00A0"))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">13. РЕКВИЗИТЫ СТОРОН</h2>
                    <div className="grid grid-cols-2 gap-2 mt-1 border border-slate-300 p-2 rounded text-[8.2pt] bg-slate-50/60 leading-tight">
                      <div className="space-y-0.5 border-r border-slate-200 pr-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">Арендодатель:</p>
                        <p className="font-bold">ИП Колесников Андрей</p>
                        <p>ИН: <strong className="font-mono">306401934</strong> | Тел: <strong className="font-mono">+995591181430</strong></p>
                      </div>
                      <div className="space-y-0.5 pl-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">Арендатор:</p>
                        <p>ФИО: <strong className="underline">{customerName}</strong></p>
                        <p>Паспорт: <strong>{customerPassport}</strong> | ВУ: <strong className="font-mono">{customerLicense}</strong></p>
                        <p>Телефон: <strong className="font-mono">{customerPhone}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">14. ПОДПИСИ СТОРОН</h2>
                    <div className="grid grid-cols-2 gap-6 mt-1.5 text-center text-[8pt]">
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">Арендодатель: Колесников А. / Подпись</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">Арендатор: {customerName} / Подпись</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">15. ПЕРЕДАЧА АВТОМОБИЛЯ АРЕНДАТОРУ (АКТ ВЫДАЧИ)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt]">Дата передачи: <strong className="underline font-mono">{formatDate(booking.startDate, "RU")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Автомобиль передал Арендодатель (подпись)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Автомобиль принял Арендатор (подпись)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">16. ВОЗВРАТ АВТОМОБИЛЯ АРЕНДОДАТЕЛЮ (АКТ ВОЗВРАТА)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt] text-slate-700">Стороны подтверждают, что не имеют взаимных претензий. Дата возврата: <strong className="underline font-mono">{formatDate(booking.endDate, "RU")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Арендодатель: принял (подпись)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Арендатор: сдал (подпись)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* GEORGIAN PAGE 2 */}
              {lang === "GE" && (
                <>
                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">7. ავტომობილის დაბრუნების პროცედურა</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>7.1. მეიჯარე იღებს ვალდებულებას დააბრუნოს მანქანა მე-2 ნაწილში მითითებულ ვადაში.</p>
                      <p>7.2. დაბრუნების დაგვიანებისას მეიჯარე ვალდებულია წინასწარ აცნობოს მოიჯარეს.</p>
                      <p>7.3. 4 საათზე ნაკლებ დროში შეტყობინებისას გადაიხდება ქირის დამატებითი დღე.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">8. ავტომობილის მდგომარეობის დაფიქსირება</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>8.1. ძარის, სალონის მდგომარეობა და საწვავი ფიქსირდება ვიდეოთი გადაცემამდე.</p>
                      <p>8.2. ვიდეოფიქსაცია არის საფუძველი ავტომობილის მდგომარეობის განსაზღვრისთვის.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">9. მოთხოვნები მძღოლის მიმართ</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>9.1. მძღოლს უნდა ჰქონდეს 2 წელზე მეტი მართვის გამოცდილება და იყოს 21 წელზე მეტის.</p>
                      <p>9.2. შეუსაბამობისას დაზღვევა არ მოქმედებს და პასუხისმგებელია მეიჯარე.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">10. ფორს-მაჟორი და 11. სხვა პირობები</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify text-[8.2pt] leading-tight">
                      <p>10.1. მხარეები თავისუფლდებიან პასუხისმგებლობისგან დაუძლეველი ძალის მოქმედებისას.</p>
                      <p>11.1. ხელშეკრულება ძალაშია ვალდებულებების სრულ შესრულებამდე. 11.2. დავები განიხილება საქართველოს სასამართლოში. 11.3. შეტყობინება SMS, WhatsApp, Telegram, e-mail-ით ითვლება სათანადოდ.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">12. ავტომობილის მართვაზე დაშვებული მძღოლები</h2>
                    <table className="w-full mt-1 border-collapse border border-slate-300 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-slate-300 p-0.5 w-6 text-center">№</th>
                          <th className="border border-slate-300 p-0.5 text-left">სახელი, გვარი</th>
                          <th className="border border-slate-300 p-0.5 text-left">მართვის მოწმობის №</th>
                          <th className="border border-slate-300 p-0.5 text-left w-24">მოქმედების ვადა</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-0.5 text-center font-bold">1.</td>
                          <td className="border border-slate-300 p-0.5 font-semibold">{customerName}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{customerLicense}</td>
                          <td className="border border-slate-300 p-0.5">{customerExpiry || "მოქმედი"}</td>
                        </tr>
                        {[0, 1].map((idx) => {
                          const d = getExtraDriver(idx);
                          return (
                            <tr key={idx}>
                              <td className="border border-slate-300 p-0.5 text-center font-bold">{idx + 2}.</td>
                              <td className="border border-slate-300 p-0.5">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5">{d?.expiry || (d ? "მოქმედი" : (idx === 0 ? "—" : "\u00A0"))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">13. მხარეთა რეკვიზიტები</h2>
                    <div className="grid grid-cols-2 gap-2 mt-1 border border-slate-300 p-2 rounded text-[8.2pt] bg-slate-50/60 leading-tight">
                      <div className="space-y-0.5 border-r border-slate-200 pr-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">მოიჯარე:</p>
                        <p className="font-bold">ინდ. მეწარმე ანდრეი კოლესნიკოვ</p>
                        <p>საიდენტ. კოდი: <strong className="font-mono">306401934</strong> | ტელ: <strong className="font-mono">+995591181430</strong></p>
                      </div>
                      <div className="space-y-0.5 pl-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">მეიჯარე:</p>
                        <p>სახელი, გვარი: <strong className="underline">{customerName}</strong></p>
                        <p>პასპორტი: <strong>{customerPassport}</strong> | მართვის მოწმ.: <strong className="font-mono">{customerLicense}</strong></p>
                        <p>ტელეფონი: <strong className="font-mono">{customerPhone}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">14. მხარეთა ხელმოწერები</h2>
                    <div className="grid grid-cols-2 gap-6 mt-1.5 text-center text-[8pt]">
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">მოიჯარე: კოლესნიკოვ ა. / ხელმოწერა</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">მეიჯარე: {customerName} / ხელმოწერა</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">15. ავტომობილის გადაცემა მეიჯარესთვის (გაცემის აქტი)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt]">გადაცემის თარიღი: <strong className="underline font-mono">{formatDate(booking.startDate, "GE")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">ავტომობილი გადასცა მოიჯარემ (ხელმოწერა)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">ავტომობილი მიიღო მეიჯარემ (ხელმოწერა)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">16. ავტომობილის დაბრუნება მოიჯარესთვის (დაბრუნების აქტი)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt] text-slate-700">მხარეები ადასტურებენ ურთიერთპრეტენზიების არარსებობას. დაბრუნების თარიღი: <strong className="underline font-mono">{formatDate(booking.endDate, "GE")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">მოიჯარე: ჩაიბარა (ხელმოწერა)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">მეიჯარე: ჩააბარა (ხელმოწერა)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ENGLISH PAGE 2 */}
              {lang === "EN" && (
                <>
                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">7. VEHICLE RETURN PROCEDURE</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>7.1. The Renter agrees to return the vehicle within the timeframe specified in Section 2.</p>
                      <p>7.2. In case of delay, the Renter must notify the Lessor in advance.</p>
                      <p>7.3. If notification is under 4 hours before expiration, an additional rental day is charged.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">8. PROCEDURE FOR RECORDING VEHICLE CONDITION</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>8.1. Body/interior condition and fuel level are recorded via video/photo before handover.</p>
                      <p>8.2. Video inspection serves as the legal basis for assessing condition upon return.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">9. DRIVER REQUIREMENTS</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify">
                      <p>9.1. The driver must have over 2 years of driving experience and be over 21 years old.</p>
                      <p>9.2. In case of non-compliance, insurance is void and Renter bears full liability.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">10. FORCE MAJEURE & 11. MISCELLANEOUS</h2>
                    <div className="mt-0.5 space-y-0.5 pl-2 text-justify text-[8.2pt] leading-tight">
                      <p>10.1. Parties are released from liability in events of force majeure (fire, earthquake, war).</p>
                      <p>11.1. Valid until full performance. 11.2. Disputes resolved in Georgian courts. 11.3. Notices via SMS, WhatsApp, Telegram, email are legally valid.</p>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">12. AUTHORIZED DRIVERS</h2>
                    <table className="w-full mt-1 border-collapse border border-slate-300 text-[8pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-slate-300 p-0.5 w-6 text-center">№</th>
                          <th className="border border-slate-300 p-0.5 text-left">Full Name</th>
                          <th className="border border-slate-300 p-0.5 text-left">License Number</th>
                          <th className="border border-slate-300 p-0.5 text-left w-24">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-slate-300 p-0.5 text-center font-bold">1.</td>
                          <td className="border border-slate-300 p-0.5 font-semibold">{customerName}</td>
                          <td className="border border-slate-300 p-0.5 font-mono">{customerLicense}</td>
                          <td className="border border-slate-300 p-0.5">{customerExpiry || "Valid"}</td>
                        </tr>
                        {[0, 1].map((idx) => {
                          const d = getExtraDriver(idx);
                          return (
                            <tr key={idx}>
                              <td className="border border-slate-300 p-0.5 text-center font-bold">{idx + 2}.</td>
                              <td className="border border-slate-300 p-0.5">{d?.name || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5 font-mono">{d?.license || (idx === 0 ? "—" : "\u00A0")}</td>
                              <td className="border border-slate-300 p-0.5">{d?.expiry || (d ? "Valid" : (idx === 0 ? "—" : "\u00A0"))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">13. DETAILS OF THE PARTIES</h2>
                    <div className="grid grid-cols-2 gap-2 mt-1 border border-slate-300 p-2 rounded text-[8.2pt] bg-slate-50/60 leading-tight">
                      <div className="space-y-0.5 border-r border-slate-200 pr-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">Lessor:</p>
                        <p className="font-bold">IE Andrei Kolesnikov</p>
                        <p>ID: <strong className="font-mono">306401934</strong> | Phone: <strong className="font-mono">+995591181430</strong></p>
                      </div>
                      <div className="space-y-0.5 pl-2">
                        <p className="font-bold text-slate-800 uppercase text-[7.5pt]">Renter:</p>
                        <p>Name: <strong className="underline">{customerName}</strong></p>
                        <p>Passport: <strong>{customerPassport}</strong> | License: <strong className="font-mono">{customerLicense}</strong></p>
                        <p>Phone: <strong className="font-mono">{customerPhone}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold uppercase text-[9.5pt] border-b border-slate-200 pb-0.5">14. SIGNATURES OF THE PARTIES</h2>
                    <div className="grid grid-cols-2 gap-6 mt-1.5 text-center text-[8pt]">
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">Lessor: Kolesnikov A. / Signature</p>
                      </div>
                      <div>
                        <div className="border-b border-slate-400 pb-3"></div>
                        <p className="text-[7.5pt] text-slate-500 mt-0.5">Renter: {customerName} / Signature</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">15. VEHICLE HANDOVER TO RENTER (HANDOVER ACT)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt]">Handover Date: <strong className="underline font-mono">{formatDate(booking.startDate, "EN")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Vehicle handed over by Lessor (signature)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Vehicle accepted by Renter (signature)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-1">
                    <h2 className="font-bold uppercase text-[9pt] border-b border-slate-200 pb-0.5">16. VEHICLE RETURN TO LESSOR (RETURN ACT)</h2>
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[8pt] text-slate-700">The Parties confirm that they have no mutual claims. Return Date: <strong className="underline font-mono">{formatDate(booking.endDate, "EN")}</strong></p>
                      <div className="grid grid-cols-2 gap-6 pt-1 text-center text-[7.5pt]">
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Lessor: received (signature)</p>
                        </div>
                        <div>
                          <div className="border-b border-slate-400 pb-2.5"></div>
                          <p className="text-slate-500 mt-0.5">Renter: surrendered (signature)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Page 2 Footer */}
            <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-[7.5pt] text-slate-500 font-mono">
              <span>Договор аренды авто № {booking.bookingNumber} • {carTitle} ({plateNumber})</span>
              <span className="font-bold text-slate-700">Страница 2 из 2</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
