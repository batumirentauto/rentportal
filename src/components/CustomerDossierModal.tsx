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
  Coins,
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

  // Debts state
  const [debts, setDebts] = useState<any[]>([]);
  const [totalActiveDebt, setTotalActiveDebt] = useState<number>(0);
  const [isAddingDebt, setIsAddingDebt] = useState<boolean>(false);
  const [newDebtAmount, setNewDebtAmount] = useState<string>("");
  const [newDebtCategory, setNewDebtCategory] = useState<string>("FINES");
  const [newDebtDescription, setNewDebtDescription] = useState<string>("");
  const [newDebtCarPlate, setNewDebtCarPlate] = useState<string>("");
  const [newDebtDueDate, setNewDebtDueDate] = useState<string>("");
  const [newDebtNotes, setNewDebtNotes] = useState<string>("");
  const [isSubmittingDebt, setIsSubmittingDebt] = useState<boolean>(false);

  // Pay debt modal state
  const [payingDebt, setPayingDebt] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>("CASH");
  const [payManagerName, setPayManagerName] = useState<string>("Менеджер смены");
  const [payNotes, setPayNotes] = useState<string>("");
  const [isSubmittingPay, setIsSubmittingPay] = useState<boolean>(false);

  const fetchDebts = async () => {
    if (!customerId) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/debts`);
      const json = await res.json();
      if (json.success) {
        setDebts(json.debts || []);
        setTotalActiveDebt(json.totalActiveDebt || 0);
      }
    } catch (e) {
      console.error("Error fetching customer debts:", e);
    }
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDebtAmount || Number(newDebtAmount) <= 0) {
      alert("Укажите сумму долга");
      return;
    }
    if (!newDebtDescription.trim()) {
      alert("Укажите описание долга");
      return;
    }

    try {
      setIsSubmittingDebt(true);
      const res = await fetch(`/api/customers/${customerId}/debts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(newDebtAmount),
          category: newDebtCategory,
          description: newDebtDescription.trim(),
          carPlate: newDebtCarPlate.trim() || null,
          dueDate: newDebtDueDate || null,
          notes: newDebtNotes.trim() || null,
          createdByName: "Менеджер смены",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Долг ${newDebtAmount} ₾ успешно записан на клиента!`);
        setIsAddingDebt(false);
        setNewDebtAmount("");
        setNewDebtDescription("");
        setNewDebtCarPlate("");
        setNewDebtDueDate("");
        setNewDebtNotes("");
        fetchDebts();
      } else {
        alert(json.error || "Ошибка создания долга");
      }
    } catch (err: any) {
      alert("Ошибка сети при сохранении долга: " + err.message);
    } finally {
      setIsSubmittingDebt(false);
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt) return;
    const val = Number(payAmount);
    if (!val || val <= 0) {
      alert("Укажите сумму платежа");
      return;
    }

    try {
      setIsSubmittingPay(true);
      const res = await fetch(`/api/customers/${customerId}/debts/${payingDebt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentAmount: val,
          paymentMethod: payMethod,
          managerName: payManagerName,
          notes: payNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(json.message || "Оплата долга успешно принята!");
        setPayingDebt(null);
        setPayAmount("");
        setPayNotes("");
        fetchDebts();
      } else {
        alert(json.error || "Ошибка проведения платежа");
      }
    } catch (err: any) {
      alert("Ошибка сети при проведении платежа: " + err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleCancelDebt = async (debtId: string) => {
    if (!confirm("Вы уверены, что хотите списать / аннулировать этот долг?")) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/debts/${debtId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg("Долг списан");
        fetchDebts();
      } else {
        alert(json.error || "Ошибка списания долга");
      }
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    }
  };

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
      fetchDebts();
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
                {totalActiveDebt > 0 && (
                  <span className="text-xs bg-rose-950/90 text-rose-300 px-2.5 py-0.5 rounded-full font-mono font-black flex items-center space-x-1 border border-rose-500/50 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>ДОЛГ: {totalActiveDebt} ₾</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 font-mono flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                <span className="text-white font-bold">{phone || "Телефон не указан"}</span>
                {phone && (
                  <button
                    type="button"
                    onClick={() => handleCopy(phone, "header-phone")}
                    className={`px-1.5 py-0.5 rounded transition flex items-center space-x-1 text-[10px] font-sans font-bold shadow-sm ${
                      copiedKey === "header-phone"
                        ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                    }`}
                    title="Скопировать телефон"
                  >
                    {copiedKey === "header-phone" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-amber-400" />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                )}
                <span>• {city || "Грузия"}</span>
              </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-[10px] block font-semibold">
                      Телефон (основной):
                    </label>
                    {phone && (
                      <button
                        type="button"
                        onClick={() => handleCopy(phone, "phone")}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-bold"
                        title="Скопировать телефон"
                      >
                        {copiedKey === "phone" ? (
                          <span className="text-emerald-400 flex items-center space-x-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>Скопировано!</span>
                          </span>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+995 599 000 000"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono focus:border-amber-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 text-[10px] block font-semibold">
                      WhatsApp:
                    </label>
                    {whatsapp && (
                      <button
                        type="button"
                        onClick={() => handleCopy(whatsapp, "whatsapp")}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-1 font-bold"
                        title="Скопировать WhatsApp"
                      >
                        {copiedKey === "whatsapp" ? (
                          <span className="text-emerald-400 flex items-center space-x-0.5">
                            <Check className="w-2.5 h-2.5" />
                            <span>Скопировано!</span>
                          </span>
                        ) : (
                          <>
                            <Copy className="w-2.5 h-2.5" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
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

            {/* СЕКЦИЯ: ДОЛГИ И ОБЯЗАТЕЛЬСТВА КЛИЕНТА */}
            <div className={`p-4 rounded-2xl border space-y-3 transition ${
              totalActiveDebt > 0
                ? "bg-rose-950/20 border-rose-500/40"
                : "bg-slate-950 border-slate-800"
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <Coins className={`w-4 h-4 ${totalActiveDebt > 0 ? "text-rose-400" : "text-slate-400"}`} />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    Задолженности и штрафы клиента
                  </span>
                  {totalActiveDebt > 0 ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-black bg-rose-600 text-white animate-pulse">
                      Непогашено: {totalActiveDebt} ₾
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      ✓ Задолженностей нет
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingDebt(!isAddingDebt)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1 border border-slate-700 self-start sm:self-auto"
                >
                  <span>{isAddingDebt ? "✕ Отмена" : "+ Навесить долг"}</span>
                </button>
              </div>

              {/* Форма навешивания долга вручную */}
              {isAddingDebt && (
                <form onSubmit={handleCreateDebt} className="p-3 bg-slate-900 border border-amber-600/40 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-amber-300 flex items-center space-x-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Фиксация нового долга за клиентом:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Сумма долга (₾ GEL): *</label>
                      <input
                        type="number"
                        required
                        value={newDebtAmount}
                        onChange={(e) => setNewDebtAmount(e.target.value)}
                        placeholder="150"
                        className="w-full bg-slate-950 border border-amber-500/60 rounded-lg p-1.5 text-white font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Категория:</label>
                      <select
                        value={newDebtCategory}
                        onChange={(e) => setNewDebtCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none"
                      >
                        <option value="FINES">🚨 Штрафы ПДД</option>
                        <option value="DAMAGE">🔨 Повреждения / ущерб</option>
                        <option value="FUEL">⛽ Нехватка топлива</option>
                        <option value="RENTAL">⏱️ Аренда / продление</option>
                        <option value="WASH">🧼 Мойка</option>
                        <option value="GENERAL">📋 Другое / общий долг</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Госномер авто (если известно):</label>
                      <input
                        type="text"
                        value={newDebtCarPlate}
                        onChange={(e) => setNewDebtCarPlate(e.target.value)}
                        placeholder="AA-123-BB"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Причина / Описание долга: *</label>
                      <input
                        type="text"
                        required
                        value={newDebtDescription}
                        onChange={(e) => setNewDebtDescription(e.target.value)}
                        placeholder="Например: Штраф за превышение скорости (протокол VID-89412)"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Обещанный срок оплаты:</label>
                      <input
                        type="date"
                        value={newDebtDueDate}
                        onChange={(e) => setNewDebtDueDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Заметка менеджера / договоренности:</label>
                    <input
                      type="text"
                      value={newDebtNotes}
                      onChange={(e) => setNewDebtNotes(e.target.value)}
                      placeholder="Например: Обещал оплатить переводом на карту TBC в четверг"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingDebt(false)}
                      className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingDebt}
                      className="px-4 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow"
                    >
                      {isSubmittingDebt ? "Запись..." : "Сохранить долг в CRM"}
                    </button>
                  </div>
                </form>
              )}

              {/* Список долгов */}
              {debts.length === 0 ? (
                <div className="text-center py-3 text-slate-500 text-xs">
                  У данного клиента нет зафиксированных задолженностей.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {debts.map((d: any) => {
                    const remaining = Math.max(0, d.amount - (d.paidAmount || 0));
                    const isClosed = d.status === "PAID" || d.status === "CANCELLED";
                    return (
                      <div
                        key={d.id}
                        className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          d.status === "ACTIVE"
                            ? "bg-slate-900 border-rose-500/30"
                            : d.status === "PARTIALLY_PAID"
                            ? "bg-slate-900 border-amber-500/30"
                            : "bg-slate-900/60 border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase ${
                              d.category === "FINES"
                                ? "bg-red-950 text-red-300 border border-red-500/30"
                                : d.category === "DAMAGE"
                                ? "bg-purple-950 text-purple-300 border border-purple-500/30"
                                : d.category === "FUEL"
                                ? "bg-amber-950 text-amber-300 border border-amber-500/30"
                                : "bg-blue-950 text-blue-300 border border-blue-500/30"
                            }`}>
                              {d.category === "FINES" && "🚨 Штрафы"}
                              {d.category === "DAMAGE" && "🔨 Ущерб"}
                              {d.category === "FUEL" && "⛽ Бензин"}
                              {d.category === "RENTAL" && "⏱️ Аренда"}
                              {d.category === "WASH" && "🧼 Мойка"}
                              {d.category === "GENERAL" && "📋 Долг"}
                            </span>

                            <span className="font-bold text-white">{d.description}</span>

                            {d.carPlate && (
                              <span className="font-mono text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                                🚗 {d.carPlate}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-400 flex items-center space-x-3 flex-wrap gap-y-0.5">
                            <span>Дата: {new Date(d.createdAt).toLocaleDateString("ru-RU")}</span>
                            {d.dueDate && (
                              <span className="text-amber-400">
                                Срок: {new Date(d.dueDate).toLocaleDateString("ru-RU")}
                              </span>
                            )}
                            {d.createdByName && <span>Менеджер: {d.createdByName}</span>}
                          </div>

                          {d.notes && (
                            <div className="text-[10px] text-slate-400 italic bg-slate-950/60 px-2 py-1 rounded">
                              💬 {d.notes}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-white">
                              {remaining} ₾ <span className="text-[10px] font-normal text-slate-400 font-sans">к оплате</span>
                            </div>
                            {d.paidAmount > 0 && (
                              <div className="text-[10px] text-emerald-400 font-mono">
                                Оплачено: {d.paidAmount} ₾ (из {d.amount} ₾)
                              </div>
                            )}
                            <div className="text-[9px] uppercase font-bold mt-0.5">
                              {d.status === "ACTIVE" && <span className="text-rose-400">● Не оплачен</span>}
                              {d.status === "PARTIALLY_PAID" && <span className="text-amber-400">● Частично</span>}
                              {d.status === "PAID" && <span className="text-emerald-400">✓ Погашен</span>}
                              {d.status === "CANCELLED" && <span className="text-slate-400">Списан</span>}
                            </div>
                          </div>

                          {!isClosed && (
                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingDebt(d);
                                  setPayAmount(String(remaining));
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow"
                              >
                                <span>💰 Погасить</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelDebt(d.id)}
                                className="p-1 hover:bg-red-950/60 text-slate-500 hover:text-red-400 rounded-lg transition"
                                title="Списать долг"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

        {/* Modal: Прием оплаты долга */}
        {payingDebt && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
            <form
              onSubmit={handlePayDebt}
              className="bg-slate-900 border border-emerald-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-white text-sm flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Погашение долга клиента</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl space-y-1 text-xs">
                <div className="text-slate-400">Долг: <span className="text-white font-bold">{payingDebt.description}</span></div>
                <div className="text-slate-400">Сумма долга: <span className="font-mono text-white font-bold">{payingDebt.amount} ₾</span></div>
                <div className="text-slate-400">
                  Остаток к оплате: <span className="font-mono text-rose-400 font-black">{Math.max(0, payingDebt.amount - (payingDebt.paidAmount || 0))} ₾</span>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Сумма вносимого платежа (₾ GEL): *</label>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-500/60 rounded-xl p-2.5 text-white font-mono font-bold text-base focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Способ оплаты:</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none"
                  >
                    <option value="CASH">💵 Наличные (CASH)</option>
                    <option value="CARD_POS">💳 Банковская карта / POS-терминал</option>
                    <option value="TBC_BANK">🏦 Перевод на счет TBC Bank</option>
                    <option value="BOG_BANK">🏦 Перевод на счет Bank of Georgia</option>
                    <option value="CRYPTO">🪙 Криптовалюта (USDT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-bold">Менеджер, принявший оплату:</label>
                  <input
                    type="text"
                    value={payManagerName}
                    onChange={(e) => setPayManagerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 block mb-1">Комментарий / квитанция:</label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="Например: Перевод получен на TBC в 14:30"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPay}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40"
                >
                  {isSubmittingPay ? "Проведение..." : "Принять оплату в кассу"}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
