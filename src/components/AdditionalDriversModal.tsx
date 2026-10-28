"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  Plus,
  Trash2,
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileText,
  Phone,
  Calendar,
  Sparkles,
} from "lucide-react";

interface AdditionalDriver {
  id: string;
  fullName: string;
  licenseNumber?: string | null;
  licenseExpiryDate?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  licensePhotoUrl?: string | null;
  licenseBackPhotoUrl?: string | null;
  notes?: string | null;
}

interface AdditionalDriversModalProps {
  bookingId: string;
  bookingNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onDriversUpdated?: () => void;
}

export const AdditionalDriversModal: React.FC<AdditionalDriversModalProps> = ({
  bookingId,
  bookingNumber,
  isOpen,
  onClose,
  onDriversUpdated,
}) => {
  const [drivers, setDrivers] = useState<AdditionalDriver[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // New driver form state
  const [fullName, setFullName] = useState<string>("");
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [licensePhotoUrl, setLicensePhotoUrl] = useState<string>("");
  const [licenseBackPhotoUrl, setLicenseBackPhotoUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [uploadingFront, setUploadingFront] = useState<boolean>(false);
  const [uploadingBack, setUploadingBack] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const fetchDrivers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/bookings/${bookingId}/drivers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.drivers)) {
        setDrivers(data.drivers);
      }
    } catch (err) {
      console.error("Error loading drivers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingId) {
      fetchDrivers();
      setIsAdding(false);
      resetForm();
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [isOpen, bookingId]);

  const resetForm = () => {
    setFullName("");
    setLicenseNumber("");
    setLicenseExpiryDate("");
    setPhone("");
    setBirthDate("");
    setLicensePhotoUrl("");
    setLicenseBackPhotoUrl("");
    setNotes("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isBack) setUploadingBack(true);
    else setUploadingFront(true);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "driver-licenses");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        if (isBack) {
          setLicenseBackPhotoUrl(data.url);
        } else {
          setLicensePhotoUrl(data.url);
        }
      } else {
        throw new Error(data.error || "Ошибка загрузки файла");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка загрузки фотографии прав");
    } finally {
      if (isBack) setUploadingBack(false);
      else setUploadingFront(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!fullName.trim()) {
      setErrorMessage("Укажите ФИО дополнительного водителя");
      return;
    }

    if (drivers.length >= 4) {
      setErrorMessage("Максимально можно добавить до 4 дополнительных водителей");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/drivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          licenseNumber: licenseNumber.trim() || undefined,
          licenseExpiryDate: licenseExpiryDate.trim() || undefined,
          phone: phone.trim() || undefined,
          birthDate: birthDate.trim() || undefined,
          licensePhotoUrl: licensePhotoUrl || undefined,
          licenseBackPhotoUrl: licenseBackPhotoUrl || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Не удалось сохранить водителя");
      }

      setDrivers(data.drivers || []);
      setSuccessMessage(`Водитель ${fullName} успешно добавлен`);
      resetForm();
      setIsAdding(false);
      if (onDriversUpdated) onDriversUpdated();
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка сервера");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async (driverId: string, name: string) => {
    if (!confirm(`Удалить дополнительного водителя "${name}" из бронирования?`)) return;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/drivers?driverId=${driverId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        setDrivers(data.drivers || []);
        if (onDriversUpdated) onDriversUpdated();
      }
    } catch (err) {
      console.error("Error deleting driver:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 sm:p-5 md:p-6 text-white my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Дополнительные водители</h3>
              <p className="text-xs text-slate-400">
                Бронь № <strong className="text-amber-300 font-mono">{bookingNumber}</strong> • До 4-х
                водителей с фото прав
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter badge & Actions bar */}
        <div className="mt-4 flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-300">Внесено водителей:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-300 border border-blue-500/40">
              {drivers.length} / 4
            </span>
          </div>

          {!isAdding && drivers.length < 4 && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить водителя</span>
            </button>
          )}

          {drivers.length >= 4 && (
            <span className="text-[11px] text-amber-400 font-bold">Лимит 4 водителя исчерпан</span>
          )}
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-950/70 border border-rose-500/60 rounded-xl text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-950/70 border border-emerald-500/60 rounded-xl text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form to add a new driver */}
        {isAdding && (
          <form
            onSubmit={handleAddDriver}
            className="mt-4 p-4 bg-slate-950/90 rounded-2xl border-2 border-blue-500/50 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-black text-blue-300 uppercase tracking-wide">
                Новый дополнительный водитель (#{drivers.length + 1})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Отмена
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  ФИО водителя: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Иванов Иван Иванович"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Номер водительского удостоверения:
                </label>
                <input
                  type="text"
                  placeholder="№ прав (например: 99XX 123456)"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Срок действия прав:
                </label>
                <input
                  type="text"
                  placeholder="до 2030 г. (ДД.ММ.ГГГГ)"
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Телефон водителя:
                </label>
                <input
                  type="text"
                  placeholder="+995 ..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Дата рождения:
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Photos upload (Front & Back) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Front Photo */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Фото прав (лицевая сторона):</span>
                  {licensePhotoUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </label>

                {licensePhotoUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-700 h-28 bg-black flex items-center justify-center">
                    <img
                      src={licensePhotoUrl}
                      alt="Права (лицо)"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(licensePhotoUrl)}
                        className="p-1.5 bg-blue-600 rounded-lg text-white"
                        title="Увеличить"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicensePhotoUrl("")}
                        className="p-1.5 bg-rose-600 rounded-lg text-white"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer p-2 transition bg-slate-950/50">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-300 font-bold text-center">
                      {uploadingFront ? "Загрузка..." : "Загрузить фото лицевой стороны"}
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, PDF до 10MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, false)}
                      className="hidden"
                      disabled={uploadingFront}
                    />
                  </label>
                )}
              </div>

              {/* Back Photo */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Фото прав (оборотная сторона):</span>
                  {licenseBackPhotoUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </label>

                {licenseBackPhotoUrl ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-700 h-28 bg-black flex items-center justify-center">
                    <img
                      src={licenseBackPhotoUrl}
                      alt="Права (оборот)"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(licenseBackPhotoUrl)}
                        className="p-1.5 bg-blue-600 rounded-lg text-white"
                        title="Увеличить"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLicenseBackPhotoUrl("")}
                        className="p-1.5 bg-rose-600 rounded-lg text-white"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer p-2 transition bg-slate-950/50">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] text-slate-300 font-bold text-center">
                      {uploadingBack ? "Загрузка..." : "Загрузить фото обратной стороны"}
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, PDF до 10MB</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, true)}
                      className="hidden"
                      disabled={uploadingBack}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg text-xs"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting || uploadingFront || uploadingBack}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow disabled:opacity-50"
              >
                {isSubmitting ? "Сохранение..." : "Сохранить водителя"}
              </button>
            </div>
          </form>
        )}

        {/* Existing drivers list */}
        <div className="mt-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Загрузка списка водителей...</div>
          ) : drivers.length === 0 ? (
            <div className="text-center py-8 px-4 bg-slate-950/40 rounded-2xl border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400 font-medium">Дополнительные водители не добавлены</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Вы можете добавить до 4-х человек, разрешенных к управлению автомобилем
              </p>
            </div>
          ) : (
            drivers.map((d, index) => (
              <div
                key={d.id}
                className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xs font-mono font-bold text-blue-400 shrink-0">
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">{d.fullName}</h4>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
                      {d.licenseNumber && (
                        <span>
                          Удостоверение: <strong className="font-mono text-slate-300">{d.licenseNumber}</strong>
                        </span>
                      )}
                      {d.licenseExpiryDate && (
                        <span>
                          Срок: <strong className="font-mono text-slate-300">{d.licenseExpiryDate}</strong>
                        </span>
                      )}
                      {d.phone && <span>Тел: {d.phone}</span>}
                      {d.birthDate && <span>Д.р.: {d.birthDate}</span>}
                    </div>
                  </div>
                </div>

                {/* Right side: photos & actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  {d.licensePhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoUrl(d.licensePhotoUrl || null)}
                      className="flex items-center space-x-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-blue-300 font-bold transition"
                      title="Посмотреть фото прав (лицо)"
                    >
                      <Eye className="w-3 h-3 text-blue-400" />
                      <span>Права (лицо)</span>
                    </button>
                  )}

                  {d.licenseBackPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewPhotoUrl(d.licenseBackPhotoUrl || null)}
                      className="flex items-center space-x-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-blue-300 font-bold transition"
                      title="Посмотреть фото прав (оборот)"
                    >
                      <Eye className="w-3 h-3 text-blue-400" />
                      <span>Права (оборот)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteDriver(d.id, d.fullName)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    title="Удалить водителя"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewPhotoUrl}
              alt="Документ"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border border-slate-700 shadow-2xl"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
