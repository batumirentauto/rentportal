import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  CreditCard,
  Crown,
  Sparkles,
  Upload,
  Loader2,
  ExternalLink,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Car,
} from "lucide-react";

interface CustomerDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  bookingId?: string;
  onCustomerUpdated?: (updatedCustomer: any) => void;
}

export const CustomerDossierModal: React.FC<CustomerDossierModalProps> = ({
  isOpen,
  onClose,
  customerId,
  bookingId,
  onCustomerUpdated,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [customer, setCustomer] = useState<any | null>(null);

  // Form states
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [whatsapp, setWhatsapp] = useState<string>("");
  const [telegram, setTelegram] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [passportNumber, setPassportNumber] = useState<string>("");
  const [passportCountry, setPassportCountry] = useState<string>("Грузия / Международный");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState<string>("");
  const [birthDate, setBirthDate] = useState<string>("");
  const [driverLicenseExpiry, setDriverLicenseExpiry] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Document photo URLs
  const [passportPhotoUrl, setPassportPhotoUrl] = useState<string | null>(null);
  const [driverLicensePhotoUrl, setDriverLicensePhotoUrl] = useState<string | null>(null);
  const [driverLicenseBackPhotoUrl, setDriverLicenseBackPhotoUrl] = useState<string | null>(null);

  // Upload & OCR states
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);

  // Saving states
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch full customer details
  const fetchCustomer = async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      const json = await res.json();
      if (json.success && json.customer) {
        const c = json.customer;
        setCustomer(c);
        setFullName(c.fullName || "");
        setPhone(c.phone || "");
        setWhatsapp(c.whatsapp || c.phone || "");
        setTelegram(c.telegram || "");
        setEmail(c.email || "");
        setCity(c.city || "");
        setPassportNumber(c.passportNumber || "");
        setPassportCountry(c.passportCountry || "Грузия / Международный");
        setDriverLicenseNumber(c.driverLicenseNumber || "");
        setBirthDate(c.birthDate ? c.birthDate.split("T")[0] : "");
        setDriverLicenseExpiry(c.driverLicenseExpiry ? c.driverLicenseExpiry.split("T")[0] : "");
        setNotes(c.notes || "");
        setPassportPhotoUrl(c.passportPhotoUrl || null);
        setDriverLicensePhotoUrl(c.driverLicensePhotoUrl || null);
        setDriverLicenseBackPhotoUrl(c.driverLicenseBackPhotoUrl || null);
      }
    } catch (e) {
      console.error("Error fetching customer:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomer();
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Upload photo handler
  const handleUploadFile = async (
    file: File,
    slot: "passport" | "licenseFront" | "licenseBack"
  ) => {
    try {
      setUploadingSlot(slot);
      setErrorMsg(null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "customer_docs");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!json.success || !json.url) {
        throw new Error(json.error || "Не удалось загрузить фото");
      }

      if (slot === "passport") setPassportPhotoUrl(json.url);
      if (slot === "licenseFront") setDriverLicensePhotoUrl(json.url);
      if (slot === "licenseBack") setDriverLicenseBackPhotoUrl(json.url);
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка загрузки файла");
    } finally {
      setUploadingSlot(null);
    }
  };

  // Run AI recognition on documents
  const handleRunAiOcr = async () => {
    if (!passportPhotoUrl && !driverLicensePhotoUrl && !driverLicenseBackPhotoUrl) {
      setErrorMsg("Сначала загрузите хотя бы один скан или фото документа (паспорт или права)!");
      return;
    }

    try {
      setIsRecognizing(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/ai/recognize-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          bookingId: bookingId || null,
          passportPhotoUrl,
          driverLicensePhotoUrl,
          driverLicenseBackPhotoUrl,
        }),
      });

      const json = await res.json();
      if (!json.success || !json.extractedData) {
        throw new Error(json.error || "ИИ не смог считать данные на фото");
      }

      const d = json.extractedData;
      if (d.confidence) setOcrConfidence(d.confidence);
      if (d.fullName) setFullName(d.fullName);
      if (d.passportNumber) setPassportNumber(d.passportNumber);
      if (d.passportCountry) setPassportCountry(d.passportCountry);
      if (d.driverLicenseNumber) setDriverLicenseNumber(d.driverLicenseNumber);
      if (d.birthDate) setBirthDate(d.birthDate);
      if (d.driverLicenseExpiry) setDriverLicenseExpiry(d.driverLicenseExpiry);
      if (d.notes && !notes) setNotes(d.notes);

      setSuccessMsg("✓ Данные с документов успешно считаны нейросетью! Проверьте поля и нажмите «Сохранить».");
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка распознавания");
    } finally {
      setIsRecognizing(false);
    }
  };

  // Save changes to CRM and Booking
  const handleSaveCustomer = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        telegram: telegram.trim() || null,
        email: email.trim() || null,
        city: city.trim() || null,
        passportNumber: passportNumber.trim(),
        passportCountry: passportCountry.trim(),
        driverLicenseNumber: driverLicenseNumber.trim(),
        birthDate: birthDate || null,
        driverLicenseExpiry: driverLicenseExpiry || null,
        notes: notes.trim() || null,
        passportPhotoUrl: passportPhotoUrl || null,
        driverLicensePhotoUrl: driverLicensePhotoUrl || null,
        driverLicenseBackPhotoUrl: driverLicenseBackPhotoUrl || null,
      };

      // 1. Update customer profile
      const custRes = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const custJson = await custRes.json();
      if (!custJson.success) {
        throw new Error(custJson.error || "Не удалось сохранить данные клиента");
      }

      // 2. If bookingId is present, sync with booking endpoint too
      if (bookingId) {
        await fetch(`/api/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: payload }),
        });
      }

      setSuccessMsg("Данные клиента и фото документов успешно сохранены в CRM!");
      setCustomer((prev: any) => ({ ...prev, ...payload }));

      if (onCustomerUpdated) {
        onCustomerUpdated(custJson.customer || { ...customer, ...payload });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg">
              {fullName
                ? fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                : "КЛ"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-white">{fullName || "Карточка клиента"}</h3>
                {customer?.loyaltyTier && (
                  <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold flex items-center space-x-1 border border-slate-700">
                    <Crown className="w-3 h-3 text-amber-400" />
                    <span>{customer.loyaltyTier}</span>
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {phone || "Телефон не указан"} • {city || "Грузия"}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl flex items-center space-x-2 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl flex items-center space-x-2 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs">Загрузка досье клиента...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* 3 DOCUMENT SLOTS WITH AI RECOGNITION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Документы клиента (Паспорт и Права с двух сторон)</span>
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Загрузка опциональна. Прикрепите фото или скан — нейросеть автоматически считает данные.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isRecognizing || (!passportPhotoUrl && !driverLicensePhotoUrl && !driverLicenseBackPhotoUrl)}
                  onClick={handleRunAiOcr}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition shrink-0 ${
                    isRecognizing
                      ? "bg-amber-600 text-white cursor-wait"
                      : !passportPhotoUrl && !driverLicensePhotoUrl && !driverLicenseBackPhotoUrl
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-md active:scale-95"
                  }`}
                >
                  {isRecognizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Считывание ИИ...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>✨ Считать через ИИ</span>
                    </>
                  )}
                </button>
              </div>

              {/* Grid of 3 document slots */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {/* 1. Passport */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span>Паспорт (разворот)</span>
                      </span>
                      {passportPhotoUrl ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Загружен</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Нет фото</span>
                      )}
                    </div>
                  </div>

                  {passportPhotoUrl ? (
                    <div className="space-y-2">
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                        <img
                          src={passportPhotoUrl}
                          alt="Паспорт"
                          className="object-cover w-full h-full"
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <a
                          href={passportPhotoUrl}
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
                              const f = e.target.files?.[0];
                              if (f) handleUploadFile(f, "passport");
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setPassportPhotoUrl(null)}
                          className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 hover:bg-slate-950 text-center space-y-1 min-h-[90px]">
                      {uploadingSlot === "passport" ? (
                        <div className="flex items-center space-x-1 text-blue-400 text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Загрузка...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-300">+ Фото паспорта</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploadingSlot === "passport"}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFile(f, "passport");
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 2. License Front */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                        <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                        <span>Права (Лицевая)</span>
                      </span>
                      {driverLicensePhotoUrl ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Загружена</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Нет фото</span>
                      )}
                    </div>
                  </div>

                  {driverLicensePhotoUrl ? (
                    <div className="space-y-2">
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                        <img
                          src={driverLicensePhotoUrl}
                          alt="ВУ Лицевая"
                          className="object-cover w-full h-full"
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <a
                          href={driverLicensePhotoUrl}
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
                              const f = e.target.files?.[0];
                              if (f) handleUploadFile(f, "licenseFront");
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setDriverLicensePhotoUrl(null)}
                          className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-700 hover:border-purple-500/70 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 hover:bg-slate-950 text-center space-y-1 min-h-[90px]">
                      {uploadingSlot === "licenseFront" ? (
                        <div className="flex items-center space-x-1 text-purple-400 text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Загрузка...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-300">+ Фото прав (лицо)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploadingSlot === "licenseFront"}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFile(f, "licenseFront");
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* 3. License Back */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                        <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Права (Оборотная)</span>
                      </span>
                      {driverLicenseBackPhotoUrl ? (
                        <span className="text-[10px] text-emerald-400 font-bold">✓ Загружена</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">Нет фото</span>
                      )}
                    </div>
                  </div>

                  {driverLicenseBackPhotoUrl ? (
                    <div className="space-y-2">
                      <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                        <img
                          src={driverLicenseBackPhotoUrl}
                          alt="ВУ Оборотная"
                          className="object-cover w-full h-full"
                          onError={(e: any) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <a
                          href={driverLicenseBackPhotoUrl}
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
                              const f = e.target.files?.[0];
                              if (f) handleUploadFile(f, "licenseBack");
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setDriverLicenseBackPhotoUrl(null)}
                          className="text-red-400 hover:text-red-300 flex items-center space-x-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Удалить</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/70 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 hover:bg-slate-950 text-center space-y-1 min-h-[90px]">
                      {uploadingSlot === "licenseBack" ? (
                        <div className="flex items-center space-x-1 text-cyan-400 text-xs font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Загрузка...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-[11px] font-bold text-slate-300">+ Фото прав (оборот)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={uploadingSlot === "licenseBack"}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFile(f, "licenseBack");
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* EDITABLE PERSONAL INFORMATION FORM */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-amber-400" />
                  <span>Персональные данные клиента (CRM):</span>
                </span>
                {ocrConfidence && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Точность распознавания: {ocrConfidence}%
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                    ФИО клиента:
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Иван Петров / GIORGI BERIDZE"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                    Телефон (основной):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+995 599 000 000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(phone, "phone")}
                      className="absolute right-2 top-2.5 text-slate-500 hover:text-white"
                      title="Скопировать телефон"
                    >
                      {copiedKey === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                    WhatsApp:
                  </label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+995 599 000 000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                    Номер водительских прав:
                  </label>
                  <input
                    type="text"
                    value={driverLicenseNumber}
                    onChange={(e) => setDriverLicenseNumber(e.target.value)}
                    placeholder="01 AA 123456"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                    Город проживания / нахождения:
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Тбилиси / Батуми"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-[10px] block mb-1 font-semibold">
                  Внутренние заметки менеджера о клиенте:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Особые предпочтения, отель, аккуратность вождения, скидки..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-amber-500"
                />
              </div>
            </div>

            {/* RENTAL HISTORY LIST */}
            {customer?.bookings && customer.bookings.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  История поездок ({customer.bookings.length}):
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {customer.bookings.map((b: any) => (
                    <div
                      key={b.id}
                      className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-amber-400 font-bold">
                            {b.bookingNumber}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              b.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                                : b.status === "COMPLETED"
                                ? "bg-slate-800 text-slate-300"
                                : "bg-red-950 text-red-400"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="text-white text-[11px]">
                          {b.car ? `${b.car.brand} ${b.car.model} (${b.car.plateNumber})` : "Автомобиль"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.startDate).toLocaleDateString("ru-RU")} —{" "}
                          {new Date(b.endDate).toLocaleDateString("ru-RU")} ({b.rentalDays} дн.)
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-amber-400 text-xs block">
                          {b.totalAmount} ₾
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-800 sticky bottom-0 bg-slate-900/95 backdrop-blur-md">
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
            onClick={handleSaveCustomer}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Сохранение...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>💾 Сохранить данные клиента</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
