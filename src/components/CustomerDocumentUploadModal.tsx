import React, { useState } from "react";
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  ExternalLink,
  Trash2,
  User,
  Calendar,
  Globe,
  CreditCard,
  Save,
} from "lucide-react";

interface CustomerDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
  bookingId?: string;
  bookingNumber?: string;
  onCustomerUpdated?: (updatedCustomer: any) => void;
}

export const CustomerDocumentUploadModal: React.FC<CustomerDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  customer,
  bookingId,
  bookingNumber,
  onCustomerUpdated,
}) => {
  // URLs of documents
  const [passportUrl, setPassportUrl] = useState<string | null>(
    customer?.passportPhotoUrl || null
  );
  const [licenseFrontUrl, setLicenseFrontUrl] = useState<string | null>(
    customer?.driverLicensePhotoUrl || null
  );
  const [licenseBackUrl, setLicenseBackUrl] = useState<string | null>(
    customer?.driverLicenseBackPhotoUrl || null
  );

  // Uploading state
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // AI Recognition state
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [recognizedData, setRecognizedData] = useState<any | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Editable customer fields
  const [fullName, setFullName] = useState<string>(customer?.fullName || "");
  const [passportNumber, setPassportNumber] = useState<string>(
    customer?.passportNumber || ""
  );
  const [passportCountry, setPassportCountry] = useState<string>(
    customer?.passportCountry || "Грузия / Международный"
  );
  const [driverLicenseNumber, setDriverLicenseNumber] = useState<string>(
    customer?.driverLicenseNumber || ""
  );
  const [birthDate, setBirthDate] = useState<string>(customer?.birthDate || "");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState<string>(
    customer?.driverLicenseExpiry || ""
  );

  // Saving state
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  // Single slot upload handler
  const handleUploadFile = async (
    file: File,
    slot: "passport" | "licenseFront" | "licenseBack"
  ) => {
    try {
      setUploadingSlot(slot);
      setErrorMessage(null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "customer_docs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.success || !json.url) {
        throw new Error(json.error || "Не удалось загрузить файл");
      }

      if (slot === "passport") setPassportUrl(json.url);
      if (slot === "licenseFront") setLicenseFrontUrl(json.url);
      if (slot === "licenseBack") setLicenseBackUrl(json.url);
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при загрузке документа");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Run AI recognition on attached documents
  const handleRunAiRecognition = async () => {
    if (!passportUrl && !licenseFrontUrl && !licenseBackUrl) {
      setErrorMessage("Сначала загрузите хотя бы один документ (паспорт или водительские права)!");
      return;
    }

    try {
      setIsRecognizing(true);
      setErrorMessage(null);
      setSaveSuccessMessage(null);

      const res = await fetch("/api/ai/recognize-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer?.id || null,
          bookingId: bookingId || null,
          passportPhotoUrl: passportUrl,
          driverLicensePhotoUrl: licenseFrontUrl,
          driverLicenseBackPhotoUrl: licenseBackUrl,
          autoSave: false, // will review before final save
        }),
      });

      const json = await res.json();

      if (!json.success || !json.extractedData) {
        throw new Error(json.error || "Не удалось распознать данные на документах");
      }

      const data = json.extractedData;
      setRecognizedData(data);
      if (data.confidence) setOcrConfidence(data.confidence);

      // Auto-fill fields if extracted
      if (data.fullName) setFullName(data.fullName);
      if (data.passportNumber) setPassportNumber(data.passportNumber);
      if (data.passportCountry) setPassportCountry(data.passportCountry);
      if (data.driverLicenseNumber) setDriverLicenseNumber(data.driverLicenseNumber);
      if (data.birthDate) setBirthDate(data.birthDate);
      if (data.driverLicenseExpiry) setDriverLicenseExpiry(data.driverLicenseExpiry);

      setSaveSuccessMessage("Данные успешно считаны ИИ! Проверьте поля и нажмите «Сохранить в CRM».");
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при обращении к сервису распознавания");
    } finally {
      setIsRecognizing(false);
    }
  };

  // Save all customer details and document links to database
  const handleSaveToCrm = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSaveSuccessMessage(null);

      const payload = {
        fullName,
        passportNumber,
        passportCountry,
        driverLicenseNumber,
        birthDate: birthDate || null,
        driverLicenseExpiry: driverLicenseExpiry || null,
        passportPhotoUrl: passportUrl || null,
        driverLicensePhotoUrl: licenseFrontUrl || null,
        driverLicenseBackPhotoUrl: licenseBackUrl || null,
      };

      // 1. Update customer profile
      const custRes = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const custJson = await custRes.json();
      if (!custJson.success) {
        throw new Error(custJson.error || "Не удалось обновить профиль клиента в базе");
      }

      // 2. If bookingId is present, sync with booking endpoint too
      if (bookingId) {
        await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: payload }),
        });
      }

      setSaveSuccessMessage("Документы и данные клиента успешно сохранены в CRM!");
      if (onCustomerUpdated) {
        onCustomerUpdated(custJson.customer || { ...customer, ...payload });
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ошибка при сохранении данных");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ОПЦИОНАЛЬНО
              </span>
              {bookingNumber && (
                <span className="font-mono text-xs text-slate-400">
                  Бронь: <strong className="text-white">{bookingNumber}</strong>
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
              <span>🪪 Документы клиента:</span>
              <span className="text-amber-400">{customer?.fullName || fullName || "Клиент"}</span>
            </h2>
            <p className="text-xs text-slate-400">
              Загрузите фото паспорта и водительских прав с 2-х сторон. ИИ автоматически распознает данные и внесёт их в CRM.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-center space-x-2 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {saveSuccessMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center space-x-2 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {/* 3 Upload Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* SLOT 1: PASSPORT */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Фото паспорта</span>
                </span>
                {passportUrl ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Есть</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Не загружен</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Главный разворот с фото и номером
              </p>
            </div>

            {passportUrl ? (
              <div className="space-y-2">
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                  <img
                    src={passportUrl}
                    alt="Паспорт"
                    className="object-cover w-full h-full"
                    onError={(e: any) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <a
                    href={passportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Открыть</span>
                  </a>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-blue-400 hover:text-blue-300 font-bold cursor-pointer">
                    <span>Заменить</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingSlot === "passport"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file, "passport");
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setPassportUrl(null)}
                    className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/50 hover:bg-slate-900 text-center space-y-1.5 min-h-[110px]">
                {uploadingSlot === "passport" ? (
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
                    <span className="text-[11px] font-bold text-slate-300">
                      Загрузить фото
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, PDF</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploadingSlot === "passport"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file, "passport");
                  }}
                />
              </label>
            )}
          </div>

          {/* SLOT 2: LICENSE FRONT */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Права: Лицевая сторона</span>
                </span>
                {licenseFrontUrl ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Есть</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Не загружена</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Лицевая сторона (фото и номер ВУ)
              </p>
            </div>

            {licenseFrontUrl ? (
              <div className="space-y-2">
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                  <img
                    src={licenseFrontUrl}
                    alt="ВУ Лицевая"
                    className="object-cover w-full h-full"
                    onError={(e: any) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <a
                    href={licenseFrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Открыть</span>
                  </a>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-purple-400 hover:text-purple-300 font-bold cursor-pointer">
                    <span>Заменить</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingSlot === "licenseFront"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file, "licenseFront");
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLicenseFrontUrl(null)}
                    className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-purple-500/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/50 hover:bg-slate-900 text-center space-y-1.5 min-h-[110px]">
                {uploadingSlot === "licenseFront" ? (
                  <div className="flex items-center space-x-1.5 text-purple-400 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-purple-400" />
                    <span className="text-[11px] font-bold text-slate-300">
                      Загрузить Лицевую
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, PDF</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploadingSlot === "licenseFront"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file, "licenseFront");
                  }}
                />
              </label>
            )}
          </div>

          {/* SLOT 3: LICENSE BACK */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Права: Оборотная сторона</span>
                </span>
                {licenseBackUrl ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-0.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Есть</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Не загружена</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Оборотная сторона (категории и срок)
              </p>
            </div>

            {licenseBackUrl ? (
              <div className="space-y-2">
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900 aspect-video flex items-center justify-center">
                  <img
                    src={licenseBackUrl}
                    alt="ВУ Оборотная"
                    className="object-cover w-full h-full"
                    onError={(e: any) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <a
                    href={licenseBackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-bold text-white space-x-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Открыть</span>
                  </a>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <label className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer">
                    <span>Заменить</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingSlot === "licenseBack"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadFile(file, "licenseBack");
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setLicenseBackUrl(null)}
                    className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-900/50 hover:bg-slate-900 text-center space-y-1.5 min-h-[110px]">
                {uploadingSlot === "licenseBack" ? (
                  <div className="flex items-center space-x-1.5 text-cyan-400 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Загрузка...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                    <span className="text-[11px] font-bold text-slate-300">
                      Загрузить Оборот
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, PDF</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  disabled={uploadingSlot === "licenseBack"}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadFile(file, "licenseBack");
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {/* AI Action Trigger Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="space-y-0.5 text-center sm:text-left">
            <div className="text-xs font-black text-amber-300 flex items-center justify-center sm:justify-start space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Автоматическое распознавание документов (OCR / AI)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Нейросеть считает ФИО, номер паспорта, дату рождения и номер водительских прав с фото.
            </p>
          </div>

          <button
            type="button"
            disabled={isRecognizing || (!passportUrl && !licenseFrontUrl && !licenseBackUrl)}
            onClick={handleRunAiRecognition}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition shrink-0 ${
              isRecognizing
                ? "bg-amber-600 text-white cursor-wait"
                : !passportUrl && !licenseFrontUrl && !licenseBackUrl
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95"
            }`}
          >
            {isRecognizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ИИ распознаёт...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Распознать через ИИ</span>
              </>
            )}
          </button>
        </div>

        {/* Editable Fields Section (Synchronized with CRM) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-amber-400" />
              <span>Данные клиента для CRM:</span>
            </span>
            {ocrConfidence !== null && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ✓ Точность ИИ: {ocrConfidence}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                ФИО клиента (как в документе):
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Например: GIORGI BERIDZE / ИВАН ПЕТРОВ"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                Дата рождения:
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                Номер загранпаспорта / ID:
              </label>
              <input
                type="text"
                value={passportNumber}
                onChange={(e) => setPassportNumber(e.target.value)}
                placeholder="75 1234567"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                Гражданство / Страна:
              </label>
              <input
                type="text"
                value={passportCountry}
                onChange={(e) => setPassportCountry(e.target.value)}
                placeholder="Грузия / Россия / Казахстан"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                Номер водительского удостоверения:
              </label>
              <input
                type="text"
                value={driverLicenseNumber}
                onChange={(e) => setDriverLicenseNumber(e.target.value)}
                placeholder="01 AA 123456"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                Срок окончания действия прав:
              </label>
              <input
                type="date"
                value={driverLicenseExpiry}
                onChange={(e) => setDriverLicenseExpiry(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Закрыть
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveToCrm}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить в CRM</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
