import React, { useState, useEffect, useRef } from "react";
import {
  X,
  FileDown,
  Printer,
  Calendar,
  Loader2,
  RefreshCcw,
} from "lucide-react";

interface FinancialReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Наличные",
  CARD_POS: "Терминал / Карта",
  BOG_BANK: "Bank of Georgia",
  TBC_BANK: "TBC Bank",
  CREDO_BANK: "Credo Bank",
  BANK_TRANSFER: "Банковский перевод",
  CRYPTO: "Криптовалюта (USDT)",
};

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "Топливо",
  WASHING: "Мойка / Химчистка",
  MAINTENANCE: "ТО / Ремонт",
  SALARY: "Зарплата",
  OWNER_PAYOUT: "Выплата инвестору",
  PARKING_FINES: "Парковка / Штраф",
  OFFICE_RENT: "Офис / Связь",
  MARKETING: "Маркетинг",
  OTHER: "Прочее",
};

function getTbilisiDateOffset(daysOffset: number): string {
  const nowTbilisi = new Date(Date.now() + 4 * 60 * 60 * 1000);
  nowTbilisi.setUTCDate(nowTbilisi.getUTCDate() + daysOffset);
  return nowTbilisi.toISOString().split("T")[0];
}

function formatDateRu(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

function formatDateTimeTbilisi(dateVal: string | Date): string {
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ru-RU", {
    timeZone: "Asia/Tbilisi",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoneyMap(map: Record<string, number> | undefined): string {
  if (!map) return "0 ₾";
  const entries = Object.entries(map).filter(([, val]) => Math.abs(val) > 0.001);
  if (entries.length === 0) return "0 ₾";
  return entries
    .map(([cur, val]) => {
      const sym = cur === "GEL" ? "₾" : cur === "USD" ? "$" : cur === "EUR" ? "€" : cur;
      return `${Math.round(val * 100) / 100} ${sym}`;
    })
    .join(" · ");
}

function getCurrencySymbol(cur: string): string {
  if (cur === "GEL") return "₾";
  if (cur === "USD") return "$";
  if (cur === "EUR") return "€";
  return cur;
}

export const FinancialReportPdfModal: React.FC<FinancialReportPdfModalProps> = ({
  isOpen,
  onClose,
  initialStartDate,
  initialEndDate,
}) => {
  const todayStr = getTbilisiDateOffset(0);
  const [startDate, setStartDate] = useState<string>(initialStartDate || todayStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || initialStartDate || todayStr);
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadReport = async (sDate: string, eDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const effectiveEnd = eDate < sDate ? sDate : eDate;
      const res = await fetch(
        `/api/finance/daily-report?startDate=${encodeURIComponent(sDate)}&endDate=${encodeURIComponent(effectiveEnd)}`
      );
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Ошибка формирования отчёта");
      }
      setReport(json);
    } catch (err: any) {
      setError(err.message || "Не удалось загрузить отчёт");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReport(startDate, endDate);
    }
  }, [isOpen, startDate, endDate]);

  if (!isOpen) return null;

  const isSingleDay = startDate === endDate;
  const periodLabel = isSingleDay
    ? `за ${formatDateRu(startDate)}`
    : `за период с ${formatDateRu(startDate)} по ${formatDateRu(endDate)}`;

  const applyPreset = (type: "today" | "yesterday" | "week" | "month") => {
    if (type === "today") {
      const t = getTbilisiDateOffset(0);
      setStartDate(t);
      setEndDate(t);
    } else if (type === "yesterday") {
      const y = getTbilisiDateOffset(-1);
      setStartDate(y);
      setEndDate(y);
    } else if (type === "week") {
      setStartDate(getTbilisiDateOffset(-6));
      setEndDate(getTbilisiDateOffset(0));
    } else if (type === "month") {
      const t = getTbilisiDateOffset(0);
      const [year, month] = t.split("-");
      setStartDate(`${year}-${month}-01`);
      setEndDate(t);
    }
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setExportingPdf(true);
    let wrapper: HTMLDivElement | null = null;
    try {
      const html2canvasPro = (await import("html2canvas-pro")).default;
      const { jsPDF } = await import("jspdf");

      const fileName = isSingleDay
        ? `Otchet_Kassy_${startDate}.pdf`
        : `Otchet_Kassy_${startDate}_${endDate}.pdf`;

      // Clone into an isolated off-screen container so modal scroll / fixed positioning never clips canvas
      wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-10000px";
      wrapper.style.top = "0";
      wrapper.style.width = "794px";
      wrapper.style.backgroundColor = "#ffffff";
      wrapper.style.zIndex = "-1";

      const clone = reportRef.current.cloneNode(true) as HTMLElement;
      clone.style.width = "794px";
      clone.style.maxWidth = "794px";
      clone.style.margin = "0";
      clone.style.borderRadius = "0";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const canvas = await html2canvasPro(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 900,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const marginMm = 8;
      const contentWidthMm = 210 - marginMm * 2; // 194mm
      const contentHeightMm = 297 - marginMm * 2; // 281mm

      const pxPerMm = canvas.width / contentWidthMm;
      const pageSliceHeightPx = Math.floor(contentHeightMm * pxPerMm);

      let offsetY = 0;
      let pageIndex = 0;

      while (offsetY < canvas.height) {
        const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - offsetY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;

        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            offsetY,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );
        }

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.96);
        const sliceHeightMm = sliceHeightPx / pxPerMm;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(
          imgData,
          "JPEG",
          marginMm,
          marginMm,
          contentWidthMm,
          sliceHeightMm,
          undefined,
          "FAST"
        );

        offsetY += sliceHeightPx;
        pageIndex += 1;
      }

      const pdfBlob = pdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    } catch (err: any) {
      console.error("PDF export error:", err);
      alert("Не удалось сохранить PDF: " + (err?.message || "Ошибка"));
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
      setExportingPdf(false);
    }
  };

  const handlePrint = () => {
    if (!reportRef.current) return;
    const printWin = window.open("", "_blank", "width=900,height=700");
    if (!printWin) {
      window.print();
      return;
    }
    printWin.document.write(`
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8" />
          <title>Финансовый отчёт ${periodLabel}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            table { border-collapse: collapse; width: 100%; }
            tr { page-break-inside: avoid; }
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Modal Header */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <FileDown className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">PDF-отчёт по выдачам, расходам и кассам</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Выберите одну дату или период для формирования печатного отчёта
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={loading || exportingPdf || !report}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition"
            >
              {exportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{exportingPdf ? "Генерация..." : "Скачать PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !report}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Печать</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Закрыть"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => applyPreset("yesterday")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Вчера
            </button>
            <button
              type="button"
              onClick={() => applyPreset("week")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              7 дней
            </button>
            <button
              type="button"
              onClick={() => applyPreset("month")}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              Этот месяц
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">С:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  if (val > endDate) setEndDate(val);
                }}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">По:</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={() => loadReport(startDate, endDate)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
              title="Обновить отчёт"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Printable Report Preview Area */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-950">
          {loading && !report ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs">Формирование отчёта...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs">
              {error}
            </div>
          ) : report ? (
            <div className="overflow-x-auto">
              {/* Isolated pure-hex light A4 sheet for html2pdf.js & print */}
              <div
                ref={reportRef}
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  padding: "20px",
                  borderRadius: "8px",
                  maxWidth: "820px",
                  margin: "0 auto",
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
                  fontSize: "11px",
                  lineHeight: 1.4,
                }}
              >
                {/* Report Header */}
                <div
                  style={{
                    borderBottom: "2px solid #0f172a",
                    paddingBottom: "10px",
                    marginBottom: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      ФИНАНСОВЫЙ ОТЧЁТ ПО КАССАМ И ВЫДАЧАМ
                    </div>
                    <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                      Период: <strong>{periodLabel}</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "10px", color: "#64748b" }}>
                    <div>Сформирован: {formatDateTimeTbilisi(new Date())}</div>
                    <div>Время: Asia/Tbilisi (UTC+4)</div>
                  </div>
                </div>

                {/* KPI Summary Cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "#64748b", textTransform: "uppercase" }}>
                      Выдано авто
                    </div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
                      {report.totals.issuedCount} шт ({report.totals.totalRentalDays} дн.)
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "#166534", textTransform: "uppercase" }}>
                      Приход за период
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#15803d" }}>
                      {formatMoneyMap(report.totals.periodIncomeByCurrency)}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#fff1f2",
                      border: "1px solid #fecdd3",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "#9f1239", textTransform: "uppercase" }}>
                      Расходы за период
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#be123c" }}>
                      {formatMoneyMap(report.totals.periodExpenseByCurrency)}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "8px",
                    }}
                  >
                    <div style={{ fontSize: "9px", color: "#92400e", textTransform: "uppercase" }}>
                      Остаток в кассах
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#b45309" }}>
                      {formatMoneyMap(report.totals.balanceByCurrency)}
                    </div>
                  </div>
                </div>

                {/* Section 1: Issued Cars */}
                <div style={{ marginBottom: "18px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginBottom: "6px",
                      borderLeft: "3px solid #f59e0b",
                      paddingLeft: "6px",
                    }}
                  >
                    1. Выданные автомобили ({report.issuedCars.length})
                  </div>

                  {report.issuedCars.length === 0 ? (
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      За выбранные даты выдач автомобилей не зафиксировано.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "10px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Дата / Бронь
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Автомобиль
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Клиент
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "center" }}>
                            Дней
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                            Оплачено
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Куда оплачено
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Кто выдавал
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.issuedCars.map((item: any) => {
                          const paidSummary =
                            item.payments.length > 0
                              ? item.payments
                                  .map(
                                    (p: any) =>
                                      `${p.amount} ${getCurrencySymbol(p.currency)}`
                                  )
                                  .join(" + ")
                              : `0 ${getCurrencySymbol(item.currency)} (не оплачено)`;

                          const paidWhere =
                            item.payments.length > 0
                              ? item.payments
                                  .map(
                                    (p: any) =>
                                      `${p.accountName || METHOD_LABELS[p.method] || p.method} (${p.amount} ${getCurrencySymbol(p.currency)})`
                                  )
                                  .join("; ")
                              : "—";

                          return (
                            <tr key={item.bookingId}>
                              <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                                <div style={{ fontWeight: 700 }}>
                                  {formatDateTimeTbilisi(item.issuedAt)}
                                </div>
                                <div style={{ color: "#64748b", fontSize: "9px" }}>
                                  #{item.bookingNumber}
                                  {item.cityName ? ` · ${item.cityName}` : ""}
                                </div>
                              </td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                                <div style={{ fontWeight: 700 }}>{item.carName}</div>
                                <div style={{ color: "#475569", fontSize: "9px" }}>
                                  {item.plateNumber}
                                </div>
                              </td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                                {item.customerName}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #cbd5e1",
                                  padding: "5px 6px",
                                  textAlign: "center",
                                  fontWeight: 700,
                                }}
                              >
                                {item.rentalDays}
                              </td>
                              <td
                                style={{
                                  border: "1px solid #cbd5e1",
                                  padding: "5px 6px",
                                  textAlign: "right",
                                  fontWeight: 700,
                                }}
                              >
                                <div>{paidSummary}</div>
                                <div style={{ color: "#64748b", fontSize: "9px", fontWeight: 400 }}>
                                  договор: {item.totalAmount} {getCurrencySymbol(item.currency)}
                                </div>
                              </td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                                {paidWhere}
                              </td>
                              <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                                {item.managerName}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 2: Cash & Account Balances */}
                <div style={{ marginBottom: "18px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginBottom: "6px",
                      borderLeft: "3px solid #10b981",
                      paddingLeft: "6px",
                    }}
                  >
                    2. Баланс по кассам и счетам (с движением за период)
                  </div>

                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "10px",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                          Касса / Счёт
                        </th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                          Ответственный
                        </th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                          Приход
                        </th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                          Расход
                        </th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                          Переводы (+/-)
                        </th>
                        <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                          Текущий остаток
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.accounts.map((acc: any) => {
                        const sym = getCurrencySymbol(acc.currency);
                        const transferNet =
                          (acc.periodTransfersIn || 0) - (acc.periodTransfersOut || 0);
                        return (
                          <tr key={acc.id}>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              <div style={{ fontWeight: 700 }}>{acc.name}</div>
                              <div style={{ fontSize: "9px", color: "#64748b" }}>
                                {acc.currency}
                                {acc.cityName ? ` · ${acc.cityName}` : ""}
                              </div>
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {acc.managerResponsible || "—"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                color: acc.periodIncome > 0 ? "#15803d" : "#64748b",
                                fontWeight: acc.periodIncome > 0 ? 700 : 400,
                              }}
                            >
                              {acc.periodIncome > 0 ? `+${acc.periodIncome} ${sym}` : "0"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                color: acc.periodExpense > 0 ? "#be123c" : "#64748b",
                                fontWeight: acc.periodExpense > 0 ? 700 : 400,
                              }}
                            >
                              {acc.periodExpense > 0 ? `-${acc.periodExpense} ${sym}` : "0"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                color: transferNet !== 0 ? "#0369a1" : "#64748b",
                              }}
                            >
                              {transferNet > 0
                                ? `+${transferNet} ${sym}`
                                : transferNet < 0
                                ? `${transferNet} ${sym}`
                                : "0"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                fontWeight: 800,
                                color: "#0f172a",
                                backgroundColor: "#f8fafc",
                              }}
                            >
                              {Math.round(acc.currentBalance * 100) / 100} {sym}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Expenses */}
                <div style={{ marginBottom: "18px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#0f172a",
                      marginBottom: "6px",
                      borderLeft: "3px solid #e11d48",
                      paddingLeft: "6px",
                    }}
                  >
                    3. Расходы за период ({report.expenses.length})
                  </div>

                  {report.expenses.length === 0 ? (
                    <div
                      style={{
                        padding: "10px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      За выбранные даты расходов не зафиксировано.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "10px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Дата
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Категория
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Описание / Авто
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Касса списания
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Кто провёл
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                            Сумма
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.expenses.map((exp: any) => (
                          <tr key={exp.id}>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {formatDateTimeTbilisi(exp.date)}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {CATEGORY_LABELS[exp.category] || exp.category}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              <div>{exp.description}</div>
                              {exp.carName && (
                                <div style={{ fontSize: "9px", color: "#64748b" }}>
                                  Авто: {exp.carName}
                                </div>
                              )}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {exp.accountName || "—"}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {exp.managerName}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "#be123c",
                              }}
                            >
                              -{exp.amount} {getCurrencySymbol(exp.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Section 4: Transfers between accounts (if any) */}
                {report.transfers && report.transfers.length > 0 && (
                  <div style={{ marginBottom: "18px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "#0f172a",
                        marginBottom: "6px",
                        borderLeft: "3px solid #0284c7",
                        paddingLeft: "6px",
                      }}
                    >
                      4. Переводы между кассами ({report.transfers.length})
                    </div>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "10px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Дата
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Откуда → Куда
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Отправил / Принял
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Комментарий
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                            Сумма
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.transfers.map((tr: any) => (
                          <tr key={tr.id}>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {formatDateTimeTbilisi(tr.date)}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {tr.fromAccountName} → <strong>{tr.toAccountName}</strong>
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {tr.senderName} → {tr.recipientName}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {tr.notes || "—"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                fontWeight: 700,
                              }}
                            >
                              {tr.amount} {getCurrencySymbol(tr.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Section 5: All Payments received in period (for full reconciliation) */}
                {report.payments && report.payments.length > 0 && (
                  <div style={{ marginBottom: "8px" }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        color: "#0f172a",
                        marginBottom: "6px",
                        borderLeft: "3px solid #6366f1",
                        paddingLeft: "6px",
                      }}
                    >
                      5. Расшифровка всех поступлений за период ({report.payments.length})
                    </div>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "10px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", color: "#334155" }}>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Дата
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Бронь / Авто
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Клиент
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Касса / Метод
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "left" }}>
                            Принял
                          </th>
                          <th style={{ border: "1px solid #cbd5e1", padding: "5px 6px", textAlign: "right" }}>
                            Сумма
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.payments.map((p: any) => (
                          <tr key={p.id}>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {formatDateTimeTbilisi(p.createdAt)}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              #{p.bookingNumber} · {p.carName}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {p.customerName}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {p.accountName || METHOD_LABELS[p.method] || p.method}
                            </td>
                            <td style={{ border: "1px solid #cbd5e1", padding: "5px 6px" }}>
                              {p.managerName || "—"}
                            </td>
                            <td
                              style={{
                                border: "1px solid #cbd5e1",
                                padding: "5px 6px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "#15803d",
                              }}
                            >
                              +{p.amount} {getCurrencySymbol(p.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
