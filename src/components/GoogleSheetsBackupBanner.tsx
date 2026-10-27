import React, { useState, useEffect } from "react";
import { FileSpreadsheet, RefreshCw, ExternalLink, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";

interface GoogleSheetsBackupBannerProps {
  onSyncComplete?: () => void;
  className?: string;
}

export const GoogleSheetsBackupBanner: React.FC<GoogleSheetsBackupBannerProps> = ({
  onSyncComplete,
  className = "",
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(
    "https://docs.google.com/spreadsheets/d/1W2HNSR1WDi74R55VXTk9QSRQXYXBPAsoGsXGsINqK9k/edit"
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Load initial status
  useEffect(() => {
    fetch("/api/finance/sync-google-sheets")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (data.spreadsheetUrl) setSpreadsheetUrl(data.spreadsheetUrl);
          if (data.lastSync?.syncedAt) setLastSyncTime(data.lastSync.syncedAt);
        }
      })
      .catch(() => {});
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setStatusNotice(null);
      setErrorNotice(null);

      const res = await fetch("/api/finance/sync-google-sheets", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ошибка синхронизации с Google Таблицей");
      }

      setLastSyncTime(data.result?.syncedAt || new Date().toLocaleTimeString("ru-RU"));
      setStatusNotice("✓ Все финансовые данные, выдачи, дни и расходы успешно выгружены в Google Таблицу!");
      if (data.spreadsheetUrl) setSpreadsheetUrl(data.spreadsheetUrl);

      if (onSyncComplete) onSyncComplete();

      setTimeout(() => setStatusNotice(null), 6000);
    } catch (err: any) {
      console.error(err);
      setErrorNotice(err.message || "Не удалось связаться с Google Sheets API");
      setTimeout(() => setErrorNotice(null), 8000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      className={`bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-xl transition-all ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Info & description */}
        <div className="flex items-start space-x-3.5">
          <div className="p-2.5 sm:p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 shrink-0 mt-0.5">
            <FileSpreadsheet className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-white flex items-center space-x-1.5">
                <span>Google Таблица «Финансы и показатели»</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Резервное дублирование активно</span>
              </span>
            </div>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Все деньги, выдачи, дни аренды, остатки в кассах, расходы и долги автоматически дублируются в вашу Google Таблицу. Полный отчётный документ сохраняется независимо от работы серверов.
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>6 вкладок: Сводка, Брони, Касса, Расходы, Автопарк, Долги</span>
              </span>
              {lastSyncTime && (
                <span className="text-emerald-300 font-mono">
                  Синхронизировано: {lastSyncTime}
                </span>
              )}
            </div>

            {statusNotice && (
              <div className="text-xs text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-2.5 py-1 animate-in fade-in">
                {statusNotice}
              </div>
            )}

            {errorNotice && (
              <div className="text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-500/50 rounded-lg px-2.5 py-1 flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{errorNotice}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow ${
              isSyncing
                ? "bg-slate-800 text-slate-400 cursor-wait border border-slate-700"
                : "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 border border-emerald-400/50"
            }`}
            title="Принудительно выгрузить все актуальные данные в Google Таблицу прямо сейчас"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-emerald-300" : ""}`} />
            <span>{isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
          </button>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
            title="Открыть таблицу «Финансы и показатели» в Google Таблицах"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Открыть Google Таблицу</span>
          </a>
        </div>
      </div>
    </div>
  );
};
