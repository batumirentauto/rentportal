import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Calendar,
  Car,
  User,
  MapPin,
  Clock,
  Wallet,
  Repeat,
  Check,
  CheckCircle2,
  Compass,
  ShieldAlert,
  Crown,
  UserPlus,
  Sparkles,
  Upload,
  Loader2,
  FileText,
  CreditCard,
  Trash2,
  ExternalLink,
  Users,
  Plus,
  Copy,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

const DEFAULT_LOCATIONS = [
  // Tbilisi
  { id: "cmvm9rndl0003987mlxa6fb1n", name: "🏢 Офис Тбилиси (пр. Руставели, 24)", type: "OFFICE", address: "пр. Руставели, 24", city: { code: "TBS", nameRu: "Тбилиси" } },
  { id: "cmvm9rndm0004987m53jzk5i5", name: "✈️ Аэропорт Тбилиси (TBS им. Шота Руставели)", type: "AIRPORT", address: "Аэропорт Тбилиси", city: { code: "TBS", nameRu: "Тбилиси" } },
  { id: "cmvotfpkj00041d7mc1ric1y8", name: "🏨 Доставка по адресу / Отель (Тбилиси)", type: "CUSTOM", address: "Адрес в Тбилиси", city: { code: "TBS", nameRu: "Тбилиси" } },
  { id: "cmvotfpkm00051d7mt29ztmdh", name: "🚆 Ж/д вокзал Тбилиси (Центральный)", type: "OFFICE", address: "Вокзальная пл., 1", city: { code: "TBS", nameRu: "Тбилиси" } },

  // Batumi
  { id: "cmvm9rndo0005987m86bj6j2j", name: "🏢 Офис Батуми (ул. Зураба Горгиладзе, 54)", type: "OFFICE", address: "ул. Горгиладзе, 54", city: { code: "BUS", nameRu: "Батуми" } },
  { id: "cmvm9rndq0006987mek4queb1", name: "✈️ Аэропорт Батуми (BUS Александр Картвели)", type: "AIRPORT", address: "Аэропорт Батуми", city: { code: "BUS", nameRu: "Батуми" } },
  { id: "cmvotfpk400001d7mgiom5uu3", name: "🏨 Доставка по адресу / Отель (Батуми)", type: "CUSTOM", address: "Адрес в Батуми", city: { code: "BUS", nameRu: "Батуми" } },
  { id: "cmvotfpkb00011d7m0rf1tl5j", name: "🚆 Ж/д вокзал Батуми (Центральный)", type: "OFFICE", address: "шоссе Маяковского, 1", city: { code: "BUS", nameRu: "Батуми" } },

  // Kutaisi
  { id: "cmvm9rndt0007987mgofng31w", name: "🏢 Офис Кутаиси (ул. Церетели, 12 / Центр)", type: "OFFICE", address: "ул. Церетели, 12", city: { code: "KUT", nameRu: "Кутаиси" } },
  { id: "cmvm9rndv0008987mma17vehw", name: "✈️ Аэропорт Кутаиси (KUT Давид Строитель / Копитнари)", type: "AIRPORT", address: "Аэропорт Кутаиси", city: { code: "KUT", nameRu: "Кутаиси" } },
  { id: "cmvotfpkd00021d7m2jbe3tne", name: "🏨 Доставка по адресу / Отель (Кутаиси)", type: "CUSTOM", address: "Адрес в Кутаиси", city: { code: "KUT", nameRu: "Кутаиси" } },
  { id: "cmvotfpkg00031d7mcyl0etew", name: "🚆 Ж/д вокзал Кутаиси", type: "OFFICE", address: "пр. Ильи Чавчавадзе", city: { code: "KUT", nameRu: "Кутаиси" } },
];

const getBaseLocationForCity = (cityCode: string, list: any[]) => {
  const cityLocs = list.filter((l: any) => l.city?.code === cityCode);
  return (
    cityLocs.find((l: any) => l.type === "OFFICE" && (l.name?.toLowerCase().includes("офис") || l.name?.toLowerCase().includes("база"))) ||
    cityLocs.find((l: any) => l.type === "OFFICE") ||
    cityLocs[0]
  );
};

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCreated: () => void;
  initialCarId?: string;
  initialDate?: string;
  initialDays?: number;
}

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
  initialCarId,
  initialDate,
  initialDays,
}) => {
  const [cars, setCars] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>(DEFAULT_LOCATIONS);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [carId, setCarId] = useState<string>(initialCarId || "");
  const [customerId, setCustomerId] = useState<string>("");
  
  // New Customer creation mode
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(false);
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [newCustomerPhone, setNewCustomerPhone] = useState<string>("");
  const [newCustomerPassport, setNewCustomerPassport] = useState<string>("");
  const [newCustomerLicense, setNewCustomerLicense] = useState<string>("");
  const [newCustomerCountry, setNewCustomerCountry] = useState<string>("Грузия / Международный");
  const [newCustomerNotes, setNewCustomerNotes] = useState<string>("");

  // Customer document uploads (Optional) & AI OCR
  const [newCustomerPassportUrl, setNewCustomerPassportUrl] = useState<string | null>(null);
  const [newCustomerLicenseFrontUrl, setNewCustomerLicenseFrontUrl] = useState<string | null>(null);
  const [newCustomerLicenseBackUrl, setNewCustomerLicenseBackUrl] = useState<string | null>(null);
  const [newCustomerBirthDate, setNewCustomerBirthDate] = useState<string>("");
  const [newCustomerLicenseExpiry, setNewCustomerLicenseExpiry] = useState<string>("");
  const [isUploadingDocSlot, setIsUploadingDocSlot] = useState<string | null>(null);
  const [isRecognizingDocs, setIsRecognizingDocs] = useState<boolean>(false);
  const [docAiNotice, setDocAiNotice] = useState<string | null>(null);

  const handleUploadDoc = async (file: File, slot: "passport" | "licenseFront" | "licenseBack") => {
    try {
      setIsUploadingDocSlot(slot);
      setDocAiNotice(null);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "customer_docs");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.success && json.url) {
        if (slot === "passport") setNewCustomerPassportUrl(json.url);
        if (slot === "licenseFront") setNewCustomerLicenseFrontUrl(json.url);
        if (slot === "licenseBack") setNewCustomerLicenseBackUrl(json.url);
      } else {
        alert(json.error || "Не удалось загрузить фото");
      }
    } catch (e: any) {
      alert("Ошибка при загрузке: " + e.message);
    } finally {
      setIsUploadingDocSlot(null);
    }
  };

  const handleRecognizeDocs = async () => {
    if (!newCustomerPassportUrl && !newCustomerLicenseFrontUrl && !newCustomerLicenseBackUrl) {
      alert("Сначала прикрепите фото паспорта или водительского удостоверения!");
      return;
    }
    try {
      setIsRecognizingDocs(true);
      setDocAiNotice(null);
      const res = await fetch("/api/ai/recognize-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passportPhotoUrl: newCustomerPassportUrl,
          driverLicensePhotoUrl: newCustomerLicenseFrontUrl,
          driverLicenseBackPhotoUrl: newCustomerLicenseBackUrl,
        }),
      });
      const json = await res.json();
      if (json.success && json.extractedData) {
        const d = json.extractedData;
        if (d.fullName) setNewCustomerName(d.fullName);
        if (d.passportNumber) setNewCustomerPassport(d.passportNumber);
        if (d.passportCountry) setNewCustomerCountry(d.passportCountry);
        if (d.driverLicenseNumber) setNewCustomerLicense(d.driverLicenseNumber);
        if (d.birthDate) setNewCustomerBirthDate(d.birthDate);
        if (d.driverLicenseExpiry) setNewCustomerLicenseExpiry(d.driverLicenseExpiry);
        if (d.notes && !newCustomerNotes) setNewCustomerNotes(d.notes);
        setIsNewCustomerMode(true);
        setDocAiNotice("✓ Данные успешно распознаны нейросетью и подставлены в поля!");
      } else {
        alert(json.error || "Не удалось распознать данные на фото");
      }
    } catch (e: any) {
      alert("Ошибка распознавания: " + (e.message || "Сбой"));
    } finally {
      setIsRecognizingDocs(false);
    }
  };

  const [startDate, setStartDate] = useState<string>(
    initialDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<string>("10:00");
  const [returnTime, setReturnTime] = useState<string>("10:00");
  
  const [rentalDays, setRentalDays] = useState<number>(initialDays || 1);

  // Source & Channel of customer contact
  const [bookingSource, setBookingSource] = useState<"WHATSAPP" | "TELEGRAM" | "INSTAGRAM">("WHATSAPP");
  const [newCustomerInstagram, setNewCustomerInstagram] = useState<string>("");
  const [newCustomerTelegram, setNewCustomerTelegram] = useState<string>("");

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    setReturnTime(val); // Автоматически выставляем время возврата равным времени выдачи
  };

  const computedEndDate = useMemo(() => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + rentalDays);
    return d.toISOString().split("T")[0];
  }, [startDate, rentalDays]);

  const [pickupCityCode, setPickupCityCode] = useState<string>("TBS");
  const [pickupLocationId, setPickupLocationId] = useState<string>("");
  const [pickupType, setPickupType] = useState<string>("OFFICE");
  const [pickupAddress, setPickupAddress] = useState<string>("");

  const [returnCityCode, setReturnCityCode] = useState<string>("TBS");
  const [returnLocationId, setReturnLocationId] = useState<string>("");
  const [returnType, setReturnType] = useState<string>("OFFICE");
  const [returnAddress, setReturnAddress] = useState<string>("");

  const [dailyRate, setDailyRate] = useState<number>(65);
  const [rentalTotal, setRentalTotal] = useState<number>(65);
  const [ownerDailyRate, setOwnerDailyRate] = useState<number>(25);
  const [copiedCustomerPhone, setCopiedCustomerPhone] = useState<boolean>(false);

  const handleCopyPhone = (text: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedCustomerPhone(true);
      setTimeout(() => setCopiedCustomerPhone(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDailyRateChange = (val: number | string) => {
    const rate = val === "" ? 0 : Number(val);
    setDailyRate(rate);
    setRentalTotal(Math.round(rate * rentalDays));
  };

  const handleRentalTotalChange = (val: number | string) => {
    const total = val === "" ? 0 : Number(val);
    setRentalTotal(total);
    if (rentalDays > 0) {
      const calculatedRate = Math.round((total / rentalDays) * 10) / 10;
      setDailyRate(calculatedRate);
    }
  };

  const handleRentalDaysChange = (newDays: number) => {
    setRentalDays(newDays);
    setRentalTotal(Math.round(dailyRate * newDays));
  };

  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [acknowledgedRelocation, setAcknowledgedRelocation] = useState<boolean>(false);
  const [acknowledgedStopBlock, setAcknowledgedStopBlock] = useState<boolean>(false);
  const [acknowledgedBlacklist, setAcknowledgedBlacklist] = useState<boolean>(false);

  // Additional Drivers (до 4х с фото прав)
  const [additionalDrivers, setAdditionalDrivers] = useState<Array<{
    fullName: string;
    licenseNumber: string;
    phone: string;
    licensePhotoUrl: string;
    licenseBackPhotoUrl: string;
  }>>([]);

  const handleAddAdditionalDriver = () => {
    if (additionalDrivers.length >= 4) return;
    setAdditionalDrivers((prev) => [
      ...prev,
      { fullName: "", licenseNumber: "", phone: "", licensePhotoUrl: "", licenseBackPhotoUrl: "" },
    ]);
  };

  const handleUpdateAdditionalDriver = (index: number, field: string, val: string) => {
    setAdditionalDrivers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveAdditionalDriver = (index: number) => {
    setAdditionalDrivers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadDriverPhoto = async (index: number, file: File, isBack = false) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "driver-licenses");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        handleUpdateAdditionalDriver(index, isBack ? "licenseBackPhotoUrl" : "licensePhotoUrl", data.url);
      }
    } catch (err) {
      console.error("Upload driver license photo error:", err);
    }
  };

  // Load cars, locations, customers
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [carsRes, custRes, locRes] = await Promise.all([
          fetch("/api/fleet/timeline?days=30"),
          fetch("/api/customers"),
          fetch("/api/locations"),
        ]);

        const [carsJson, custJson, locJson] = await Promise.all([
          carsRes.json(),
          custRes.json(),
          locRes.json(),
        ]);

        const availableCars = carsJson.success ? (carsJson.cars || []) : [];
        if (carsJson.success) {
          setCars(availableCars);
        }

        const effectiveCarId = initialCarId || (availableCars.length > 0 ? availableCars[0].id : "");
        if (effectiveCarId && !carId) {
          setCarId(effectiveCarId);
        }

        if (custJson.success && custJson.customers) {
          setCustomers(custJson.customers);
          if (custJson.customers.length > 0 && !customerId) {
            setCustomerId(custJson.customers[0].id);
          }
        }

        const locList = locJson.success && locJson.locations?.length > 0 ? locJson.locations : DEFAULT_LOCATIONS;
        setLocations(locList);

        const carObj = availableCars.find((c: any) => c.id === effectiveCarId);
        const initialCity = carObj?.city?.code || "TBS";

        setPickupCityCode(initialCity);
        setReturnCityCode(initialCity);

        const baseLoc = getBaseLocationForCity(initialCity, locList);
        if (baseLoc) {
          setPickupLocationId(baseLoc.id);
          setReturnLocationId(baseLoc.id);
          setPickupType(baseLoc.type || "OFFICE");
          setReturnType("OFFICE");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    // Полная очистка полей от предыдущих броней при каждом открытии модального окна
    setIsNewCustomerMode(false);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerPassport("");
    setNewCustomerLicense("");
    setNewCustomerCountry("Грузия / Международный");
    setNewCustomerNotes("");
    setNewCustomerPassportUrl(null);
    setNewCustomerLicenseFrontUrl(null);
    setNewCustomerLicenseBackUrl(null);
    setNewCustomerBirthDate("");
    setNewCustomerLicenseExpiry("");
    setDocAiNotice(null);

    setStartDate(initialDate || new Date().toISOString().split("T")[0]);
    setStartTime("10:00");
    setReturnTime("10:00");
    const initDays = initialDays || 1;
    setRentalDays(initDays);
    setDailyRate(65);
    setRentalTotal(65 * initDays);
    setDepositAmount(0);
    setBookingSource("WHATSAPP");
    setNewCustomerInstagram("");
    setNewCustomerTelegram("");
    setAdditionalDrivers([]);

    setPickupType("OFFICE");
    setPickupAddress("");
    setReturnType("OFFICE");
    setReturnAddress("");

    setAcknowledgedRelocation(false);
    setAcknowledgedStopBlock(false);
    setAcknowledgedBlacklist(false);

    if (initialCarId) setCarId(initialCarId);
    loadData();
  }, [isOpen, initialCarId, initialDate, initialDays]);

  // Selected Car object
  const selectedCar = useMemo(() => {
    return cars.find((c) => c.id === carId);
  }, [cars, carId]);

  // Selected Customer object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === customerId);
  }, [customers, customerId]);

  // Reset blacklist acknowledgment when customer changes
  useEffect(() => {
    setAcknowledgedBlacklist(false);
  }, [customerId]);

  // Auto-set pricing and default locations when car changes
  useEffect(() => {
    if (selectedCar) {
      if (selectedCar.clientStandardDailyRate) {
        const rate = selectedCar.clientStandardDailyRate;
        setDailyRate(rate);
        setRentalTotal(Math.round(rate * rentalDays));
      }
      if (selectedCar.defaultOwnerDailyRate) {
        setOwnerDailyRate(selectedCar.defaultOwnerDailyRate);
      }
      const carCity = selectedCar.city?.code;
      if (carCity) {
        setPickupCityCode(carCity);
        setReturnCityCode(carCity);
        const baseLoc = getBaseLocationForCity(carCity, locations);
        if (baseLoc) {
          setPickupLocationId(baseLoc.id);
          setReturnLocationId(baseLoc.id);
          setPickupType(baseLoc.type || "OFFICE");
          setReturnType("OFFICE");
        }
      }
    }
  }, [selectedCar, locations]);

  // Determine car's projected city on the chosen startDate
  const projectedCityOnStartDate = useMemo(() => {
    if (!selectedCar) return null;

    const targetDate = new Date(`${startDate}T${startTime}:00`);

    // Сортируем все брони этого автомобиля по дате окончания
    const sortedBookings = [...(selectedCar.bookings || [])].sort(
      (a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    );

    // Ищем последнюю One-Way бронь, которая завершится ДО или В ДЕНЬ нашей даты
    let currentCity = selectedCar.city;

    for (const b of sortedBookings) {
      const bEnd = new Date(b.endDate);
      if (b.isOneWay && bEnd <= targetDate) {
        currentCity = b.returnLocation.city;
      }
    }

    return currentCity;
  }, [selectedCar, startDate, startTime]);

  // Relocation Warning detection:
  // Is car's projected city DIFFERENT from the manager's chosen pickupCityCode?
  const isCityMismatch = useMemo(() => {
    if (!projectedCityOnStartDate) return false;
    return projectedCityOnStartDate.code !== pickupCityCode;
  }, [projectedCityOnStartDate, pickupCityCode]);

  // One-way drop-off detection & Pricing calculations
  const isOneWay = pickupCityCode !== returnCityCode;
  const oneWayFee = isOneWay ? 50 : 0;
  const totalAmount = rentalTotal + oneWayFee;
  const ownerTotalPayout = ownerDailyRate * rentalDays;
  const companyMargin = totalAmount - ownerTotalPayout;
  const marginPercent = totalAmount > 0 ? Math.round((companyMargin / totalAmount) * 100) : 0;
  const isLossMaking = dailyRate < ownerDailyRate;

  // Filter locations by city
  const pickupLocationsForCity = useMemo(() => {
    return locations.filter((l) => l.city?.code === pickupCityCode);
  }, [locations, pickupCityCode]);

  const returnLocationsForCity = useMemo(() => {
    return locations.filter((l) => l.city?.code === returnCityCode);
  }, [locations, returnCityCode]);

  // Handlers for switching cities & locations with default to base office
  const handleSelectPickupCity = (newCity: string) => {
    setPickupCityCode(newCity);
    const baseLoc = getBaseLocationForCity(newCity, locations);
    if (baseLoc) {
      setPickupLocationId(baseLoc.id);
      setPickupType(baseLoc.type || "OFFICE");
    }
    // По умолчанию возврат авто должен быть в том же городе на базе
    setReturnCityCode(newCity);
    if (baseLoc) {
      setReturnLocationId(baseLoc.id);
      setReturnType("OFFICE");
    }
  };

  const handleSelectReturnCity = (newCity: string) => {
    setReturnCityCode(newCity);
    const baseLoc = getBaseLocationForCity(newCity, locations);
    if (baseLoc) {
      setReturnLocationId(baseLoc.id);
      setReturnType("OFFICE");
    }
  };

  const handlePickupLocationChange = (locId: string) => {
    setPickupLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    const isDeliv =
      loc?.type === "CUSTOM" ||
      loc?.type === "DELIVERY" ||
      loc?.id?.includes("delivery") ||
      loc?.name?.toLowerCase().includes("доставк") ||
      loc?.name?.toLowerCase().includes("отель") ||
      loc?.name?.toLowerCase().includes("адрес");

    if (isDeliv) {
      setPickupType("DELIVERY");
    } else {
      setPickupType(loc?.type || "OFFICE");
    }
  };

  const handleReturnLocationChange = (locId: string) => {
    setReturnLocationId(locId);
    const loc = locations.find((l) => l.id === locId);
    const isDeliv =
      loc?.type === "CUSTOM" ||
      loc?.type === "DELIVERY" ||
      loc?.id?.includes("delivery") ||
      loc?.name?.toLowerCase().includes("доставк") ||
      loc?.name?.toLowerCase().includes("отель") ||
      loc?.name?.toLowerCase().includes("адрес");

    if (isDeliv) {
      setReturnType("DELIVERY");
    } else {
      setReturnType(loc?.type || "OFFICE");
    }
  };

  const isPickupDelivery = useMemo(() => {
    const loc = locations.find((l) => l.id === pickupLocationId);
    return (
      pickupType === "DELIVERY" ||
      loc?.type === "CUSTOM" ||
      loc?.type === "DELIVERY" ||
      loc?.id?.includes("delivery") ||
      loc?.name?.toLowerCase().includes("доставк") ||
      loc?.name?.toLowerCase().includes("отель") ||
      loc?.name?.toLowerCase().includes("адрес")
    );
  }, [pickupLocationId, pickupType, locations]);

  const isReturnDelivery = useMemo(() => {
    const loc = locations.find((l) => l.id === returnLocationId);
    return (
      returnType === "DELIVERY" ||
      loc?.type === "CUSTOM" ||
      loc?.type === "DELIVERY" ||
      loc?.id?.includes("delivery") ||
      loc?.name?.toLowerCase().includes("доставк") ||
      loc?.name?.toLowerCase().includes("отель") ||
      loc?.name?.toLowerCase().includes("адрес")
    );
  }, [returnLocationId, returnType, locations]);

  // Update default locations on city change if current location is invalid
  useEffect(() => {
    if (pickupLocationsForCity.length > 0) {
      const isValid = pickupLocationsForCity.some((l) => l.id === pickupLocationId);
      if (!isValid) {
        const baseLoc = getBaseLocationForCity(pickupCityCode, pickupLocationsForCity);
        if (baseLoc) {
          setPickupLocationId(baseLoc.id);
          setPickupType(baseLoc.type || "OFFICE");
        }
      }
    }
  }, [pickupCityCode, pickupLocationsForCity, pickupLocationId]);

  useEffect(() => {
    if (returnLocationsForCity.length > 0) {
      const isValid = returnLocationsForCity.some((l) => l.id === returnLocationId);
      if (!isValid) {
        const baseLoc = getBaseLocationForCity(returnCityCode, returnLocationsForCity);
        if (baseLoc) {
          setReturnLocationId(baseLoc.id);
          setReturnType("OFFICE");
        }
      }
    }
  }, [returnCityCode, returnLocationsForCity, returnLocationId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedCar?.isStopBlocked && !acknowledgedStopBlock) {
      alert("Внимание! Этот автомобиль находится на СТОПе (истек техосмотр или страховка). Подтвердите ознакомление в блоке предупреждения перед оформлением брони.");
      return;
    }

    if (selectedCustomer?.isBlacklisted && !acknowledgedBlacklist) {
      alert(`⛔ БРОНИРОВАНИЕ ЗАБЛОКИРОВАНО!\n\nКлиент "${selectedCustomer.fullName}" находится в ЧЁРНОМ СПИСКЕ компании.\nПричина: ${selectedCustomer.blacklistReason || "Не указана"}\n\nЕсли выдача согласована с генеральным директором, отметьте галочку подтверждения согласования.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`);
      const returnDateObj = new Date(startDate);
      returnDateObj.setDate(returnDateObj.getDate() + rentalDays);
      const returnDateStr = returnDateObj.toISOString().split("T")[0];
      const endDateTime = new Date(`${returnDateStr}T${returnTime || startTime}:00`);

      let targetCustomerId = customerId;

      // Если выбран режим создания нового клиента
      if (isNewCustomerMode || customerId === "NEW_CUSTOMER") {
        if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
          alert("Пожалуйста, заполните обязательные поля: ФИО и телефон нового клиента!");
          setIsSubmitting(false);
          return;
        }

        const custRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: newCustomerName.trim(),
            phone: newCustomerPhone.trim(),
            whatsapp: newCustomerPhone.trim(),
            telegram: newCustomerTelegram.trim() || null,
            instagram: newCustomerInstagram.trim() || null,
            source: bookingSource,
            passportNumber: newCustomerPassport.trim() || "Не указан",
            driverLicenseNumber: newCustomerLicense.trim() || "Не указаны",
            passportCountry: newCustomerCountry.trim() || "Грузия / Международный",
            passportPhotoUrl: newCustomerPassportUrl || null,
            driverLicensePhotoUrl: newCustomerLicenseFrontUrl || null,
            driverLicenseBackPhotoUrl: newCustomerLicenseBackUrl || null,
            birthDate: newCustomerBirthDate || null,
            driverLicenseExpiry: newCustomerLicenseExpiry || null,
            notes: newCustomerNotes.trim() || "Создан из формы бронирования",
            isLoyalClient: true,
            discountPercent: 10,
            loyaltyTier: "GOLD_VIP",
          }),
        });

        const custJson = await custRes.json();
        if (custJson.success && custJson.customer) {
          targetCustomerId = custJson.customer.id;
          // Добавляем в локальный стейт
          setCustomers((prev) => [custJson.customer, ...prev]);
        } else {
          alert("Ошибка при сохранении клиента: " + (custJson.error || "Проверьте данные"));
          setIsSubmitting(false);
          return;
        }
      }

      if (!targetCustomerId && customers.length > 0) {
        targetCustomerId = customers[0].id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carId,
          customerId: targetCustomerId,
          startDate: startDateTime,
          endDate: endDateTime,
          rentalDays,
          pickupLocationId,
          pickupType,
          pickupAddress: pickupAddress || undefined,
          returnLocationId,
          returnType,
          returnAddress: returnAddress || undefined,
          dailyRate,
          rentalTotal,
          deliveryFee: oneWayFee,
          extrasTotal: 0,
          totalAmount,
          depositAmount: Number(depositAmount),
          source: bookingSource,
          currency: "GEL",
          ownerDailyRate,
          isAddedDuringDay: true,
          additionalDrivers: additionalDrivers.filter((d) => d.fullName.trim()),
        }),
      });

      const resJson = await res.json();
      if (resJson.success) {
        onBookingCreated();
        onClose();
      } else {
        alert("Ошибка создания брони: " + resJson.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Ошибка сети при создании бронирования");
    } finally {
      setIsSubmitting(false);
    }
  };

  const carCityTheme = projectedCityOnStartDate ? getCityTheme(projectedCityOnStartDate.code) : null;
  const chosenPickupTheme = getCityTheme(pickupCityCode);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-2 py-0.5 rounded uppercase">
                Новое бронирование
              </span>
              <span className="text-xs text-slate-400">
                Создание брони в системе
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              Оформление аренды автомобиля
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. Car selection & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">
                Выберите автомобиль:
              </label>
              <select
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
              >
                {cars.map((c: any) => (
                  <option
                    key={c.id}
                    value={c.id}
                    className={c.isStopBlocked ? "text-red-400 font-bold" : ""}
                  >
                    {c.isStopBlocked ? "⛔ [НА СТОПЕ] " : ""}
                    {c.brand} {c.model} ({c.plateNumber}) • {c.city.nameRu}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-bold block">
                  Клиент:
                </label>
                <div className="flex space-x-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomerMode(false);
                      if (customerId === "NEW_CUSTOMER" && customers.length > 0) {
                        setCustomerId(customers[0].id);
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      !isNewCustomerMode
                        ? "bg-amber-500 text-slate-950 font-black shadow"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    👥 Из базы ({customers.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomerMode(true);
                      setCustomerId("NEW_CUSTOMER");
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center space-x-1 ${
                      isNewCustomerMode
                        ? "bg-emerald-500 text-slate-950 font-black shadow"
                        : "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900"
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Новый клиент</span>
                  </button>
                </div>
              </div>

              {!isNewCustomerMode ? (
                <div>
                  <select
                    value={customerId}
                    onChange={(e) => {
                      if (e.target.value === "NEW_CUSTOMER") {
                        setIsNewCustomerMode(true);
                        setCustomerId("NEW_CUSTOMER");
                      } else {
                        setCustomerId(e.target.value);
                      }
                    }}
                    className={`w-full bg-slate-950 border rounded-xl p-2.5 text-white font-medium focus:outline-none ${
                      selectedCustomer?.isBlacklisted
                        ? "border-red-500 bg-red-950/30 text-red-200"
                        : "border-slate-700 focus:border-amber-500"
                    }`}
                  >
                    <option value="NEW_CUSTOMER">➕ Добавить нового клиента...</option>
                    {customers.map((cust: any) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.isBlacklisted
                          ? `⛔ [ЧЁРНЫЙ СПИСОК] ${cust.fullName} (${cust.phone})`
                          : cust.loyaltyTier && cust.loyaltyTier !== "STANDARD"
                          ? `👑 [${cust.loyaltyTier}] ${cust.fullName} (${cust.phone})`
                          : `${cust.fullName} (${cust.phone})`}
                      </option>
                    ))}
                  </select>

                  {/* Customer Warning or Loyalty Banner */}
                  {selectedCustomer?.isBlacklisted && (
                    <div className="mt-2.5 p-3 bg-red-950/90 border-2 border-red-500 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-red-300 font-black text-sm">
                        <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
                        <span>ВНИМАНИЕ: КЛИЕНТ В ЧЁРНОМ СПИСКЕ!</span>
                      </div>
                      <p className="text-xs text-red-200 leading-relaxed">
                        <strong>Причина блокировки:</strong>{" "}
                        {selectedCustomer.blacklistReason || "Грубое нарушение договора / повреждение авто / задолженность."}
                      </p>
                      <label className="flex items-start space-x-2 pt-1.5 border-t border-red-800/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={acknowledgedBlacklist}
                          onChange={(e) => setAcknowledgedBlacklist(e.target.checked)}
                          className="mt-0.5 rounded text-red-600 focus:ring-red-500"
                        />
                        <span className="text-xs text-red-300 font-semibold">
                          Подтверждаю согласование брони для черного списка с генеральным директором / СБ
                        </span>
                      </label>
                    </div>
                  )}

                  {selectedCustomer && !selectedCustomer.isBlacklisted && selectedCustomer.loyaltyTier && selectedCustomer.loyaltyTier !== "STANDARD" && (
                    <div className="mt-2 px-3 py-1.5 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5 text-purple-300 font-bold">
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>Статус: {selectedCustomer.loyaltyTier}</span>
                      </div>
                      <span className="text-amber-300 font-extrabold">
                        Скидка клиента: {selectedCustomer.discountPercent}%
                      </span>
                    </div>
                  )}

                  {/* Customer Contact & Source Selector */}
                  {selectedCustomer && (
                    <div className="mt-2.5 p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="text-slate-400">Контакты клиента:</span>
                        <div className="flex items-center space-x-2 font-mono text-white text-xs flex-wrap gap-y-1">
                          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                            <span>📞 {selectedCustomer.phone}</span>
                            {selectedCustomer.phone && (
                              <button
                                type="button"
                                onClick={() => handleCopyPhone(selectedCustomer.phone)}
                                className={`px-1.5 py-0.5 rounded transition flex items-center space-x-1 text-[10px] font-sans font-bold shadow-sm ${
                                  copiedCustomerPhone
                                    ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/50"
                                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                                }`}
                                title="Скопировать номер телефона"
                              >
                                {copiedCustomerPhone ? (
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
                          </div>
                          {selectedCustomer.telegram && <span className="text-sky-400">@{selectedCustomer.telegram}</span>}
                          {selectedCustomer.instagram && <span className="text-pink-400">@{selectedCustomer.instagram}</span>}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                          Канал обращения (источник):
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setBookingSource("WHATSAPP")}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                              bookingSource === "WHATSAPP"
                                ? "bg-emerald-600 text-white border-emerald-400 shadow"
                                : "bg-slate-950 text-slate-300 border-slate-700 hover:border-emerald-500"
                            }`}
                          >
                            <span>🟢</span>
                            <span>WhatsApp</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookingSource("TELEGRAM")}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                              bookingSource === "TELEGRAM"
                                ? "bg-sky-600 text-white border-sky-400 shadow"
                                : "bg-slate-950 text-slate-300 border-slate-700 hover:border-sky-500"
                            }`}
                          >
                            <span>🔷</span>
                            <span>Telegram</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookingSource("INSTAGRAM")}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                              bookingSource === "INSTAGRAM"
                                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 shadow"
                                : "bg-slate-950 text-slate-300 border-slate-700 hover:border-pink-500"
                            }`}
                          >
                            <span>📸</span>
                            <span>Instagram</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* NEW CUSTOMER INPUT FORM */
                <div className="bg-slate-950 p-3 rounded-2xl border border-emerald-500/40 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Быстрое добавление нового клиента в CRM:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNewCustomerMode(false)}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      ✕ Отмена
                    </button>
                  </div>

                  {/* Optional Document Upload & AI OCR */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Документы клиента (Паспорт и Права с 2-х сторон) — Опционально:</span>
                      </span>
                      <span className="text-[9px] text-slate-400">ИИ распознает данные с фото</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Slot 1: Passport */}
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center space-y-1">
                        <span className="text-[10px] text-slate-300 font-semibold block truncate">Паспорт</span>
                        {newCustomerPassportUrl ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-[9px] text-emerald-400 font-bold">✓ Загружен</span>
                            <button
                              type="button"
                              onClick={() => setNewCustomerPassportUrl(null)}
                              className="text-[9px] text-red-400 hover:underline"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="text-[10px] text-blue-400 hover:text-blue-300 font-bold cursor-pointer block truncate">
                            {isUploadingDocSlot === "passport" ? "..." : "+ Фото паспорта"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={Boolean(isUploadingDocSlot)}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDoc(f, "passport");
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Slot 2: License Front */}
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center space-y-1">
                        <span className="text-[10px] text-slate-300 font-semibold block truncate">Права (Лицевая)</span>
                        {newCustomerLicenseFrontUrl ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-[9px] text-emerald-400 font-bold">✓ Загружена</span>
                            <button
                              type="button"
                              onClick={() => setNewCustomerLicenseFrontUrl(null)}
                              className="text-[9px] text-red-400 hover:underline"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="text-[10px] text-purple-400 hover:text-purple-300 font-bold cursor-pointer block truncate">
                            {isUploadingDocSlot === "licenseFront" ? "..." : "+ Фото лица ВУ"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={Boolean(isUploadingDocSlot)}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDoc(f, "licenseFront");
                              }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Slot 3: License Back */}
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center space-y-1">
                        <span className="text-[10px] text-slate-300 font-semibold block truncate">Права (Оборот)</span>
                        {newCustomerLicenseBackUrl ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-[9px] text-emerald-400 font-bold">✓ Загружена</span>
                            <button
                              type="button"
                              onClick={() => setNewCustomerLicenseBackUrl(null)}
                              className="text-[9px] text-red-400 hover:underline"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer block truncate">
                            {isUploadingDocSlot === "licenseBack" ? "..." : "+ Фото оборота"}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={Boolean(isUploadingDocSlot)}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDoc(f, "licenseBack");
                              }}
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    {/* AI OCR button if any doc is attached */}
                    {(newCustomerPassportUrl || newCustomerLicenseFrontUrl || newCustomerLicenseBackUrl) && (
                      <div className="pt-1 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleRecognizeDocs}
                          disabled={isRecognizingDocs}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center space-x-1 transition active:scale-95"
                        >
                          {isRecognizingDocs ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>ИИ распознаёт...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>✨ Распознать ИИ и заполнить поля</span>
                            </>
                          )}
                        </button>
                        {docAiNotice && (
                          <span className="text-[10px] text-emerald-400 font-bold">
                            {docAiNotice}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        ФИО клиента <span className="text-red-400">*</span>:
                      </label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Например: Иван Петров"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500 font-medium"
                        required={isNewCustomerMode}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-slate-400 font-semibold block">
                          Телефон клиента <span className="text-red-400">*</span>:
                        </label>
                        {newCustomerPhone && (
                          <button
                            type="button"
                            onClick={() => handleCopyPhone(newCustomerPhone)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 font-bold"
                            title="Скопировать телефон"
                          >
                            {copiedCustomerPhone ? (
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
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="+995 599 000 000"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono font-medium"
                        required={isNewCustomerMode}
                      />
                    </div>
                  </div>

                  {/* Channel / Source Selector for New Customer */}
                  <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                        Канал обращения (источник):
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBookingSource("WHATSAPP")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                            bookingSource === "WHATSAPP"
                              ? "bg-emerald-600 text-white border-emerald-400 shadow"
                              : "bg-slate-950 text-slate-300 border-slate-700 hover:border-emerald-500"
                          }`}
                        >
                          <span>🟢</span>
                          <span>WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingSource("TELEGRAM")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                            bookingSource === "TELEGRAM"
                              ? "bg-sky-600 text-white border-sky-400 shadow"
                              : "bg-slate-950 text-slate-300 border-slate-700 hover:border-sky-500"
                          }`}
                        >
                          <span>🔷</span>
                          <span>Telegram</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookingSource("INSTAGRAM")}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1 border ${
                            bookingSource === "INSTAGRAM"
                              ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 shadow"
                              : "bg-slate-950 text-slate-300 border-slate-700 hover:border-pink-500"
                          }`}
                        >
                          <span>📸</span>
                          <span>Instagram</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        Загранпаспорт / ID:
                      </label>
                      <input
                        type="text"
                        value={newCustomerPassport}
                        onChange={(e) => setNewCustomerPassport(e.target.value)}
                        placeholder="Серия и номер"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        Водительские права:
                      </label>
                      <input
                        type="text"
                        value={newCustomerLicense}
                        onChange={(e) => setNewCustomerLicense(e.target.value)}
                        placeholder="Номер ВУ"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                        Гражданство:
                      </label>
                      <input
                        type="text"
                        value={newCustomerCountry}
                        onChange={(e) => setNewCustomerCountry(e.target.value)}
                        placeholder="Страна"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                      Заметка (отель, рейс, пожелания):
                    </label>
                    <input
                      type="text"
                      value={newCustomerNotes}
                      onChange={(e) => setNewCustomerNotes(e.target.value)}
                      placeholder="Рейс прибытия, особые условия и т.д."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Additional Drivers Section (до 4х с фото прав) */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 flex items-center space-x-1.5 text-xs">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Дополнительные водители (до 4-х):</span>
                {additionalDrivers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    {additionalDrivers.length} / 4
                  </span>
                )}
              </span>

              {additionalDrivers.length < 4 && (
                <button
                  type="button"
                  onClick={handleAddAdditionalDriver}
                  className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Добавить водителя</span>
                </button>
              )}
            </div>

            {additionalDrivers.length === 0 ? (
              <p className="text-[11px] text-slate-500 italic">
                Нет дополнительных водителей. Можно добавить до 4 человек с фото прав при необходимости.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {additionalDrivers.map((driver, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300 text-xs">
                        Водитель #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalDriver(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Удалить водителя"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">ФИО водителя *:</label>
                        <input
                          type="text"
                          required
                          value={driver.fullName}
                          onChange={(e) => handleUpdateAdditionalDriver(idx, "fullName", e.target.value)}
                          placeholder="Иванов Иван"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Номер прав:</label>
                        <input
                          type="text"
                          value={driver.licenseNumber}
                          onChange={(e) => handleUpdateAdditionalDriver(idx, "licenseNumber", e.target.value)}
                          placeholder="99XX 123456"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">Телефон:</label>
                        <input
                          type="tel"
                          value={driver.phone}
                          onChange={(e) => handleUpdateAdditionalDriver(idx, "phone", e.target.value)}
                          placeholder="+995 ..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* License Photos Upload */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Фото прав (лицевая сторона):
                        </label>
                        {driver.licensePhotoUrl ? (
                          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <a
                              href={driver.licensePhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-300 truncate hover:underline flex-1"
                            >
                              Фото загружено ✓
                            </a>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdditionalDriver(idx, "licensePhotoUrl", "")}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-1.5 flex items-center justify-center space-x-1 cursor-pointer bg-slate-950 text-[10px] text-slate-400 hover:text-white transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Загрузить фото (лицо)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDriverPhoto(idx, f, false);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Фото прав (оборотная сторона):
                        </label>
                        {driver.licenseBackPhotoUrl ? (
                          <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <a
                              href={driver.licenseBackPhotoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-cyan-300 truncate hover:underline flex-1"
                            >
                              Фото загружено ✓
                            </a>
                            <button
                              type="button"
                              onClick={() => handleUpdateAdditionalDriver(idx, "licenseBackPhotoUrl", "")}
                              className="text-slate-500 hover:text-rose-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="border border-dashed border-slate-700 hover:border-blue-500 rounded-lg p-1.5 flex items-center justify-center space-x-1 cursor-pointer bg-slate-950 text-[10px] text-slate-400 hover:text-white transition">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Загрузить фото (оборот)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadDriverPhoto(idx, f, true);
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dates & Duration & Times */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">📅 Дата выдачи:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1 flex items-center justify-between">
                  <span>⏰ Время выдачи:</span>
                  <span className="text-[10px] text-amber-400 font-normal">в брони</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1">⏳ Дней аренды:</label>
                <select
                  value={rentalDays}
                  onChange={(e) => handleRentalDaysChange(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {[
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
                    35, 40, 45, 50, 60, 90,
                  ].map((d) => {
                    let label = `${d} дн.`;
                    if (d === 1) label = "1 день (сутки)";
                    else if (d >= 2 && d <= 4) label = `${d} дня`;
                    else if (d % 10 === 1 && d !== 11) label = `${d} день`;
                    else if (d % 10 >= 2 && d % 10 <= 4 && (d < 10 || d > 20)) label = `${d} дня`;
                    else label = `${d} дней`;

                    if (d === 7) label += " (1 неделя)";
                    if (d === 14) label += " (2 недели)";
                    if (d === 21) label += " (3 недели)";
                    if (d === 30) label += " (1 месяц)";
                    if (d === 60) label += " (2 месяца)";
                    if (d === 90) label += " (3 месяца)";

                    return (
                      <option key={d} value={d} className="bg-slate-900 text-white">
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">🏁 Дата возврата (расчёт):</label>
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-2 text-slate-300 font-mono font-medium flex items-center justify-between">
                  <span>{new Date(computedEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="text-[10px] text-slate-500 font-sans">автоматически</span>
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-semibold block mb-1 flex items-center justify-between">
                  <span>🕒 Время возврата:</span>
                  <span className="text-[10px] text-slate-400 font-normal">необязательно</span>
                </label>
                <input
                  type="time"
                  value={returnTime}
                  onChange={(e) => setReturnTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-amber-500"
                  title="Время возврата (по умолчанию равно времени выдачи, можно изменить при согласовании)"
                />
              </div>
            </div>
          </div>

          {/* Pickup & Return Locations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pickup */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Локация выдачи:</span>
              
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => handleSelectPickupCity("TBS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "TBS"
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🏛️ Тбилиси
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPickupCity("BUS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "BUS"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌊 Батуми
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPickupCity("KUT")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    pickupCityCode === "KUT"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌿 Кутаиси
                </button>
              </div>

              <select
                value={pickupLocationId}
                onChange={(e) => handlePickupLocationChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
              >
                {pickupLocationsForCity.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              {/* Delivery Address or Link input (opens when delivery location is chosen) */}
              {isPickupDelivery && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Адрес доставки или ссылка на локацию: <span className="text-red-400">*</span></span>
                    </span>
                    <span className="text-[9px] text-amber-400/80">Google Maps / Яндекс / адрес</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required={isPickupDelivery}
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      placeholder="Например: ул. Пушкина 10, отель Rooms или https://maps.app.goo.gl/..."
                      className="w-full bg-slate-900 border border-amber-500/60 rounded-xl py-2 pl-2.5 pr-20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                    />
                    {pickupAddress && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {pickupAddress.startsWith("http") ? (
                          <a
                            href={pickupAddress}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded flex items-center space-x-1"
                          >
                            <span>Проверить</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded flex items-center space-x-1 border border-slate-700"
                          >
                            <span>Карта ↗</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    💡 При выдаче менеджер и водитель смогут открыть маршрут в Google Maps в 1 клик.
                  </p>
                </div>
              )}
            </div>

            {/* Return */}
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-bold text-slate-300">Локация сдачи:</span>
                  {returnCityCode === pickupCityCode && (
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-semibold">
                      🏢 На базе ({returnCityCode})
                    </span>
                  )}
                </div>
                {isOneWay && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 rounded font-bold">
                    ⇄ One-Way (+{oneWayFee} ₾)
                  </span>
                )}
              </div>

              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => handleSelectReturnCity("TBS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "TBS"
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🏛️ Тбилиси
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectReturnCity("BUS")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "BUS"
                      ? "bg-cyan-400 text-slate-950 border-cyan-300 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌊 Батуми
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectReturnCity("KUT")}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold border transition ${
                    returnCityCode === "KUT"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                      : "bg-slate-900 text-slate-300 border-slate-700"
                  }`}
                >
                  🌿 Кутаиси
                </button>
              </div>

              <select
                value={returnLocationId}
                onChange={(e) => handleReturnLocationChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-amber-500"
              >
                {returnLocationsForCity.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>

              {/* Return Delivery Address or Link input */}
              {isReturnDelivery && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Адрес возврата / забора авто или ссылка на карту:</span>
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={returnAddress}
                      onChange={(e) => setReturnAddress(e.target.value)}
                      placeholder="Адрес забора авто или ссылка на геопозицию"
                      className="w-full bg-slate-900 border border-amber-500/60 rounded-xl py-2 pl-2.5 pr-20 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-medium"
                    />
                    {returnAddress && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {returnAddress.startsWith("http") ? (
                          <a
                            href={returnAddress}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded flex items-center space-x-1"
                          >
                            <span>Проверить</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(returnAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 px-2 py-0.5 rounded flex items-center space-x-1 border border-slate-700"
                          >
                            <span>Карта ↗</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ⛔ HIGH VISIBILITY WARNING: CAR IS ON STOP-BLOCK! */}
          {selectedCar?.isStopBlocked && (
            <div className="bg-gradient-to-r from-red-950 via-rose-950/95 to-red-900 border-2 border-red-500 rounded-2xl p-4 shadow-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-600 rounded-xl text-white flex-shrink-0 mt-0.5 animate-pulse">
                  <AlertTriangle className="w-5 h-5 font-black" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="bg-red-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                      Блокировка СТОП
                    </span>
                    <h4 className="font-extrabold text-red-200 text-sm">
                      ВНИМАНИЕ МЕНЕДЖЕРУ: АВТОМОБИЛЬ НАХОДИТСЯ НА СТОПЕ!
                    </h4>
                  </div>
                  <p className="text-red-100 text-xs leading-relaxed font-semibold">
                    Причина: {selectedCar.stopReason || "Ручная блокировка доступности / ТО / страховка"}.
                  </p>
                  {selectedCar.stopNotes && (
                    <p className="text-[11px] text-red-200 bg-red-950/60 p-1.5 rounded border border-red-500/30">
                      📝 Комментарий: {selectedCar.stopNotes}
                    </p>
                  )}
                  <p className="text-[11px] text-red-200/80 italic">
                    ⚠️ Автомобиль временно недоступен или находится на обслуживании. Выдача возможна только после снятия блокировки.
                  </p>
                </div>
              </div>

              {/* Acknowledgment checkbox */}
              <div className="pt-2 border-t border-red-500/40">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={acknowledgedStopBlock}
                    onChange={(e) => setAcknowledgedStopBlock(e.target.checked)}
                    className="w-4 h-4 accent-red-500 rounded cursor-pointer"
                  />
                  <span>
                    Я подтверждаю, что авто на СТОПе и гарантирую прохождение техосмотра / оформление полиса до момента передачи клиенту
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ⚠️ HIGH VISIBILITY WARNING: CAR WILL BE IN ANOTHER CITY! */}
          {/* (Предупреждение менеджера без жесткого запрета) */}
          {isCityMismatch && carCityTheme && (
            <div className="bg-gradient-to-r from-amber-950 via-amber-900/90 to-orange-950 border-2 border-amber-500 rounded-2xl p-4 shadow-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-500 rounded-xl text-slate-950 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5 font-black" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-amber-300 text-sm flex items-center space-x-1.5">
                    <span>ВНИМАНИЕ МЕНЕДЖЕРУ: АВТОМОБИЛЬ БУДЕТ В ДРУГОМ ГОРОДЕ!</span>
                  </h4>
                  <p className="text-amber-100 text-xs leading-relaxed">
                    На выбранную дату (<strong>{new Date(startDate).toLocaleDateString("ru-RU")}</strong>) автомобиль{" "}
                    <strong>{selectedCar?.brand} {selectedCar?.model} ({selectedCar?.plateNumber})</strong> будет фактически находиться в городе{" "}
                    <span className="underline font-bold text-amber-200">{projectedCityOnStartDate?.nameRu} ({projectedCityOnStartDate?.code})</span>, а вы оформляете выдачу в{" "}
                    <span className="underline font-bold text-white">{chosenPickupTheme.name} ({chosenPickupTheme.tag})</span>.
                  </p>
                  <p className="text-[11px] text-amber-200/90 italic">
                    💡 Бронирование разрешено (запрет не накладывается), но потребуется согласовать перегон автомобиля между городами (~370 км / 5-6 часов в пути).
                  </p>
                </div>
              </div>

              {/* Acknowledgment checkbox */}
              <div className="pt-2 border-t border-amber-500/40">
                <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={acknowledgedRelocation}
                    onChange={(e) => setAcknowledgedRelocation(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span>
                    Я подтверждаю, что ознакомлен с предупреждением и организую перегон авто к моменту выдачи
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* 🏷️ БАЗА ЦЕН & РУЧНОЙ ВВОД СТОИМОСТИ АРЕНДЫ */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wide">
                  Тарифная сетка & Стоимость аренды (GEL ₾)
                </span>
              </div>
              <span className="text-[11px] text-amber-300 font-medium">
                Ручное указание суммы менеджером
              </span>
            </div>

            {/* Price Fork Recommendations & Owner Rate from DB */}
            {selectedCar && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Владельцу авто:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                      {ownerDailyRate} ₾/день ({ownerTotalPayout} ₾ за {rentalDays} дн.)
                    </span>
                  </div>

                  {selectedCar.pricingNotes && (
                    <span className="text-[10px] text-amber-300/90 italic truncate max-w-xs">
                      💬 {selectedCar.pricingNotes}
                    </span>
                  )}
                </div>

                {/* Price Fork Buttons */}
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Вилка цен для клиентов по базе (нажмите для быстрой установки тарифа):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDailyRateChange(selectedCar.clientMinDailyRate || 35)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientMinDailyRate || 35)
                          ? "bg-blue-600/30 border-blue-400 text-blue-200 font-bold ring-1 ring-blue-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-slate-400">🟢 Мин (15+ дн.):</div>
                      <div className="font-mono font-bold text-xs text-blue-400">
                        {selectedCar.clientMinDailyRate || 35} ₾/дн
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDailyRateChange(selectedCar.clientStandardDailyRate || 50)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientStandardDailyRate || 50)
                          ? "bg-amber-500/30 border-amber-400 text-amber-200 font-bold ring-1 ring-amber-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-amber-400/80">🟡 Стандарт (реком.):</div>
                      <div className="font-mono font-bold text-xs text-amber-300">
                        {selectedCar.clientStandardDailyRate || 50} ₾/дн
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDailyRateChange(selectedCar.clientMaxDailyRate || 75)}
                      className={`py-1.5 px-2 rounded-lg border text-left transition ${
                        dailyRate === (selectedCar.clientMaxDailyRate || 75)
                          ? "bg-orange-600/30 border-orange-400 text-orange-200 font-bold ring-1 ring-orange-400"
                          : "bg-slate-950/70 border-slate-700 text-slate-300 hover:border-slate-500"
                      }`}
                    >
                      <div className="text-[9px] text-orange-400/80">🔴 Макс (1-3 дн. / пик):</div>
                      <div className="font-mono font-bold text-xs text-orange-400">
                        {selectedCar.clientMaxDailyRate || 75} ₾/дн
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Price Inputs (Interchangeable: Daily Rate or Total Amount) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Суточный тариф (₾/день):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">₾</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={dailyRate === 0 ? "" : dailyRate}
                    onChange={(e) => handleDailyRateChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">За 1 день аренды</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Итого за аренду (₾ за {rentalDays} дн.):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">₾</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={rentalTotal === 0 ? "" : rentalTotal}
                    onChange={(e) => handleRentalTotalChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-900 border-2 border-amber-500/50 rounded-xl py-2 pl-7 pr-3 text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Вся сумма (автопересчет)</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Ставка владельцу (₾/день):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-500 font-mono font-bold">₾</span>
                  <input
                    type="number"
                    min="0"
                    value={ownerDailyRate}
                    onChange={(e) => setOwnerDailyRate(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-7 pr-3 text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Корректировка инвестору</span>
              </div>
            </div>

            {/* Warning if loss-making */}
            {isLossMaking && (
              <div className="p-2.5 bg-red-950/80 border border-red-500 rounded-xl text-red-200 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>
                  <strong>Внимание:</strong> Вы указали суточный тариф ({dailyRate} ₾), который ниже выплаты владельцу авто ({ownerDailyRate} ₾)! Сделка убыточна на {ownerDailyRate - dailyRate} ₾/день.
                </span>
              </div>
            )}

            {/* Live Financial Breakdown & Margin */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Клиент платит (с доставкой):</span>
                <span className="font-mono text-lg font-black text-amber-400">
                  {totalAmount} ₾ (GEL)
                </span>
                {oneWayFee > 0 && (
                  <span className="text-[10px] text-purple-300 block">
                    (включая One-Way: +{oneWayFee} ₾)
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Выплата владельцу:</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {ownerTotalPayout} ₾ (GEL)
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Маржа компании:</span>
                <span className={`font-mono text-base font-black px-2 py-0.5 rounded ${
                  companyMargin >= 0
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                    : "bg-red-950/80 text-red-300 border border-red-500/40"
                }`}>
                  {companyMargin >= 0 ? `+` : ``}{companyMargin} ₾ ({marginPercent}%)
                </span>
              </div>

              <div className="border-l border-slate-800 pl-3">
                <span className="text-slate-400 block text-[10px]">Залог с клиента:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs font-mono text-slate-500">₾</span>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-20 bg-slate-950 border border-slate-700 rounded-lg p-1 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Отмена
            </button>

            <button
              type="submit"
              disabled={isSubmitting || (isCityMismatch && !acknowledgedRelocation)}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Сохранение...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Подтвердить и создать бронь</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
