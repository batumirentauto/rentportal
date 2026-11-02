"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Key,
  Upload,
  X,
  Check,
  HelpCircle,
} from "lucide-react";

interface GoogleSheetsBackupBannerProps {
  onSyncComplete?: () => void;
  className?: string;
}

export const GoogleSheetsBackupBanner: React.FC<GoogleSheetsBackupBannerProps> = ({
  onSyncComplete,
  className = "",
}) => {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(
    "https://docs.google.com/spreadsheets/d/1W2HNSR1WDi74R55VXTk9QSRQXYXBPAsoGsXGsINqK9k/edit"
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Key configuration state
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [clientEmail, setClientEmail] = useState<string | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);
  const [keySaveError, setKeySaveError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStatus = async () => {
    try {
      const [finRes, credRes] = await Promise.all([
        fetch("/api/finance/sync-google-sheets"),
        fetch("/api/finance/sync-google-sheets/credentials"),
      ]);

      const finData = await finRes.json();
      const credData = await credRes.json();

      if (finData.success) {
        if (finData.spreadsheetUrl) setSpreadsheetUrl(finData.spreadsheetUrl);
        if (finData.lastSync?.syncedAt) setLastSyncTime(finData.lastSync.syncedAt);
      }

      if (credData.success) {
        setIsConfigured(credData.configured);
        setClientEmail(credData.clientEmail);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setStatusNotice(null);
      setErrorNotice(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("/api/finance/sync-google-sheets", {
        method: "POST",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

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
      if (err.name === "AbortError") {
        setErrorNotice("Таймаут синхронизации с Google Таблицей. Попробуйте еще раз.");
      } else {
        setErrorNotice(err.message || "Не удалось связаться с Google Sheets API");
      }
      setTimeout(() => setErrorNotice(null), 8000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonInput(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveCredentials = async () => {
    if (!jsonInput.trim()) {
      setKeySaveError("Вставьте содержимое JSON ключа или выберите файл");
      return;
    }

    setIsSavingKey(true);
    setKeySaveError(null);
    setKeySaveMessage(null);

    try {
      const res = await fetch("/api/finance/sync-google-sheets/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAccountJson: jsonInput }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Ошибка проверки ключа");
      }

      setKeySaveMessage("✓ Ключ успешно подключен! Запускаем первую синхронизацию...");
      setIsConfigured(true);
      setClientEmail(data.clientEmail);
      setErrorNotice(null);

      setTimeout(() => {
        setIsKeyModalOpen(false);
        setKeySaveMessage(null);
        setJsonInput("");
        handleSyncNow();
      }, 1500);
    } catch (err: any) {
      setKeySaveError(err.message || "Ошибка сохранения ключа");
    } finally {
      setIsSavingKey(false);
    }
  };

  const keyModalContent = isKeyModalOpen && mounted ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Подключение Google Service Account
              </h3>
              <p className="text-[11px] text-slate-400">
                Ключ доступа для автоматической записи в Google Таблицу
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsKeyModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {clientEmail && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block">Текущий аккаунт:</span>
              <span className="font-mono text-[11px] truncate block text-white">{clientEmail}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              1. Загрузите файл ключа (например, <span className="font-mono text-amber-300">vsl-car-rental-3fbffe7e9494.json</span>):
            </label>
            <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-slate-700 hover:border-amber-400/80 rounded-2xl cursor-pointer bg-slate-950 hover:bg-slate-900/60 transition group">
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-amber-400 mr-2" />
              <span className="text-slate-300 group-hover:text-white font-medium">
                Выбрать файл .json с компьютера
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Или вставьте содержимое JSON ключа:
            </label>
            <textarea
              rows={5}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"type": "service_account", "project_id": "vsl-car-rental", "client_email": "vsl-car-rental@...", "private_key": "-----BEGIN PRIVATE KEY-----..."}'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-300">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Где взять этот ключ?</span>
            </div>
            <p>
              Файл ключа был сгенерирован в Google Cloud Console и сохранён в Загрузках под именем <strong className="text-amber-300">vsl-car-rental-*.json</strong>. Также его можно передать в переменные окружения Railway как <strong className="text-white font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</strong>.
            </p>
          </div>

          {keySaveError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{keySaveError}</span>
            </div>
          )}

          {keySaveMessage && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{keySaveMessage}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setIsKeyModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSaveCredentials}
            disabled={isSavingKey || !jsonInput.trim()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5 shadow"
          >
            {isSavingKey ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Сохранить и подключить</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
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
                {clientEmail && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Аккаунт: {clientEmail.split("@")[0]}
                  </span>
                )}
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
                <div className="text-xs text-rose-300 font-bold bg-rose-950/80 border border-rose-500/50 rounded-lg px-2.5 py-1 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>{errorNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(true)}
                    className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded text-[10px] transition shrink-0"
                  >
                    🔑 Подключить ключ
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="px-3 py-2 bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow"
              title="Настроить сервисный аккаунт Google Sheets"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{isConfigured ? "Ключ настроен" : "Подключить ключ"}</span>
            </button>

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

      {keyModalContent}
    </>
  );
};
