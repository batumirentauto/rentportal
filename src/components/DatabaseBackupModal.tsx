"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  X,
  ShieldCheck,
  FileText,
  Video,
  Trash2,
  Loader2,
} from "lucide-react";

interface DatabaseBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const DatabaseBackupModal: React.FC<DatabaseBackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [statusData, setStatusData] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCleaningVideos, setIsCleaningVideos] = useState<boolean>(false);
  const [cleanupVideosResult, setCleanupVideosResult] = useState<any>(null);

  const handleCleanVideos = async () => {
    try {
      setIsCleaningVideos(true);
      setCleanupVideosResult(null);
      const res = await fetch("/api/admin/database/cleanup-videos", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCleanupVideosResult(data);
      } else {
        setErrorMessage(data.error || "Ошибка очистки видео");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка соединения");
    } finally {
      setIsCleaningVideos(false);
    }
  };

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/admin/database");
      const data = await res.json();
      if (data.success) {
        setStatusData(data);
      } else {
        setErrorMessage(data.error || "Не удалось получить статус базы данных");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setRestoreMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    window.location.href = "/api/admin/database?download=1";
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".db")) {
      setErrorMessage("Пожалуйста, выберите файл резервной копии с расширением .db");
      return;
    }

    if (!confirm(`Вы действительно хотите восстановить базу из файла "${file.name}"? Текущие данные будут заменены данными из копии.`)) {
      e.target.value = "";
      return;
    }

    try {
      setIsRestoring(true);
      setErrorMessage(null);
      setRestoreMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/database", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setRestoreMessage("✅ База данных успешно восстановлена из резервной копии!");
        fetchStatus();
        if (onDataRestored) onDataRestored();
      } else {
        setErrorMessage(data.error || "Ошибка восстановления базы данных");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка отправки файла на сервер");
    } finally {
      setIsRestoring(false);
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Сохранность данных и бэкапы</h3>
              <p className="text-xs text-slate-400">Управление базой данных, резервными копиями и диском</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Alert */}
          {loading ? (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-3">
              <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
              <span className="text-sm text-slate-300">Опрашиваем файловую систему...</span>
            </div>
          ) : statusData?.storage?.isPersistent ? (
            <div className="p-4 bg-emerald-950/50 border border-emerald-500/50 rounded-xl flex items-start space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-300">Постоянный диск активен (Railway Volume)</h4>
                <p className="text-xs text-emerald-200/80 mt-1">
                  Все автомобили, города, клиенты и брони хранятся на выделенном постоянном диске (<code className="font-mono bg-emerald-950 px-1 rounded">{statusData.storage.path}</code>) и гарантированно сохраняются при любых обновлениях кода и перезапусках.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">Режим прямого хранилища</h4>
                <p className="text-xs text-amber-200/80 mt-1">
                  Текущий файл базы: <code className="font-mono bg-slate-950 px-1 rounded">{statusData?.storage?.path}</code>. Чтобы данные на Railway никогда не сбрасывались при новых деплоях, подключите Volume к сервису (инструкция ниже).
                </p>
              </div>
            </div>
          )}

          {/* Counts overview */}
          {statusData?.counts && (
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-xs text-slate-400">Автопарк</div>
                <div className="text-lg font-black text-cyan-400">{statusData.counts.cars}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-xs text-slate-400">Брони</div>
                <div className="text-lg font-black text-amber-400">{statusData.counts.bookings}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-xs text-slate-400">Клиенты</div>
                <div className="text-lg font-black text-emerald-400">{statusData.counts.customers}</div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl">
                <div className="text-xs text-slate-400">Размер БД</div>
                <div className="text-lg font-black text-slate-300">{statusData.sizeKb} КБ</div>
              </div>
            </div>
          )}

          {/* Action Buttons: Download & Upload */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Скачать бэкап базы (.db)</span>
            </button>

            <label className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700 shadow transition active:scale-95 text-xs sm:text-sm cursor-pointer">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>{isRestoring ? "Восстановление..." : "Восстановить из .db"}</span>
              <input
                type="file"
                accept=".db"
                onChange={handleFileSelect}
                disabled={isRestoring}
                className="hidden"
              />
            </label>
          </div>

          {/* Notifications */}
          {restoreMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{restoreMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/60 border border-red-500/60 text-red-300 rounded-xl text-xs font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Video Retention Policy (4 Months) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Автоочистка видео фиксации авто (&gt; 4 месяцев):</span>
              </h4>
              <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                120 дней
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Видеозаписи кругового осмотра при выдаче и возврате авто автоматически удаляются через 4 месяца, предотвращая перегрузку диска сервера.
            </p>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCleanVideos}
                disabled={isCleaningVideos}
                className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50"
              >
                {isCleaningVideos ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Очистка диска...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>Проверить и удалить видео старше 4 мес.</span>
                  </>
                )}
              </button>

              {cleanupVideosResult && (
                <span className="text-[11px] text-emerald-400 font-semibold">
                  ✓ Удалено файлов: {cleanupVideosResult.deletedFilesCount} (освобождено: {cleanupVideosResult.freedMB} МБ)
                </span>
              )}
            </div>
          </div>

          {/* Railway 3-step Instructions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Как закрепить данные навсегда на Railway (1 минута):</span>
            </h4>
            <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4">
              <li>
                Откройте проект на <a href="https://railway.app" target="_blank" rel="noreferrer" className="text-cyan-400 underline">railway.app</a> и кликните на ваш сервис.
              </li>
              <li>
                Перейдите во вкладку <strong className="text-white">Volumes</strong> (или нажмите <strong className="text-white">+ New → Volume</strong>).
              </li>
              <li>
                Укажите путь монтирования (Mount Path): <code className="text-amber-400 font-mono font-bold bg-slate-900 px-1 py-0.5 rounded">/data</code> и нажмите <strong className="text-white">Add Volume</strong>.
              </li>
            </ol>
            <p className="text-[10px] text-slate-500 pt-1">
              После добавления Volume Railway автоматически перезапустит контейнер с подключенным постоянным диском, и база больше никогда не сбросится при обновлениях кода.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <span>Резервные копии совместимы со стандартом SQLite 3</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
