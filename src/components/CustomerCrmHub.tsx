import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  MessageCircle,
  Send,
  Mail,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  DollarSign,
  Calendar,
  Car,
  Clock,
  Sparkles,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Check,
  Eye,
  AlertTriangle,
  MapPin,
  CreditCard,
  Award,
  Crown,
  Building,
  Copy,
} from "lucide-react";

export interface CustomerItem {
  id: string;
  fullName: string;
  phone: string;
  whatsapp?: string | null;
  telegram?: string | null;
  email?: string | null;
  passportNumber: string;
  passportCountry?: string | null;
  passportPhotoUrl?: string | null;
  driverLicenseNumber: string;
  driverLicensePhotoUrl?: string | null;
  isLoyalClient: boolean;
  discountPercent: number;
  loyaltyTier: string;
  city?: string | null;
  notes?: string | null;
  tags?: string | null;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  trustRating: number;
  bookings: any[];
  createdAt: string;
  updatedAt: string;
}

interface CustomerCrmHubProps {
  onOpenBookingForCustomer?: (customer: CustomerItem) => void;
}

export const CustomerCrmHub: React.FC<CustomerCrmHubProps> = ({
  onOpenBookingForCustomer,
}) => {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [blacklistedFilter, setBlacklistedFilter] = useState<string>("ALL");

  // Modals state
  const [selectedCustomerDossier, setSelectedCustomerDossier] = useState<CustomerItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  // Form State for Create/Edit
  const [formFullName, setFormFullName] = useState<string>("");
  const [formPhone, setFormPhone] = useState<string>("");
  const [formWhatsapp, setFormWhatsapp] = useState<string>("");
  const [formTelegram, setFormTelegram] = useState<string>("");
  const [formEmail, setFormEmail] = useState<string>("");
  const [formPassport, setFormPassport] = useState<string>("");
  const [formPassportCountry, setFormPassportCountry] = useState<string>("Грузия / Международный");
  const [formLicense, setFormLicense] = useState<string>("");
  const [formLoyaltyTier, setFormLoyaltyTier] = useState<string>("GOLD_VIP");
  const [formDiscount, setFormDiscount] = useState<number>(10);
  const [formCity, setFormCity] = useState<string>("");
  const [formTags, setFormTags] = useState<string>("Постоянный VIP");
  const [formNotes, setFormNotes] = useState<string>("");
  const [formIsBlacklisted, setFormIsBlacklisted] = useState<boolean>(false);
  const [formBlacklistReason, setFormBlacklistReason] = useState<string>("");
  const [formTrustRating, setFormTrustRating] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("query", searchQuery);
      if (selectedTier !== "ALL") params.set("tier", selectedTier);
      if (blacklistedFilter !== "ALL") params.set("blacklisted", blacklistedFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error("Error loading CRM customers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [selectedTier, blacklistedFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormFullName("");
    setFormPhone("+995 ");
    setFormWhatsapp("+995 ");
    setFormTelegram("@");
    setFormEmail("");
    setFormPassport("");
    setFormPassportCountry("Грузия / Международный");
    setFormLicense("");
    setFormLoyaltyTier("GOLD_VIP");
    setFormDiscount(10);
    setFormCity("Тбилиси");
    setFormTags("Постоянный VIP, Проверен");
    setFormNotes("");
    setFormIsBlacklisted(false);
    setFormBlacklistReason("");
    setFormTrustRating(5);
    setIsEditModalOpen(true);
  };

  const openEditModal = (customer: CustomerItem) => {
    setEditingCustomer(customer);
    setFormFullName(customer.fullName);
    setFormPhone(customer.phone);
    setFormWhatsapp(customer.whatsapp || customer.phone);
    setFormTelegram(customer.telegram || "");
    setFormEmail(customer.email || "");
    setFormPassport(customer.passportNumber);
    setFormPassportCountry(customer.passportCountry || "Грузия");
    setFormLicense(customer.driverLicenseNumber);
    setFormLoyaltyTier(customer.loyaltyTier);
    setFormDiscount(customer.discountPercent);
    setFormCity(customer.city || "");
    setFormTags(customer.tags || "");
    setFormNotes(customer.notes || "");
    setFormIsBlacklisted(customer.isBlacklisted);
    setFormBlacklistReason(customer.blacklistReason || "");
    setFormTrustRating(customer.trustRating || 5);
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        fullName: formFullName,
        phone: formPhone,
        whatsapp: formWhatsapp,
        telegram: formTelegram,
        email: formEmail,
        passportNumber: formPassport,
        passportCountry: formPassportCountry,
        driverLicenseNumber: formLicense,
        loyaltyTier: formLoyaltyTier,
        discountPercent: formDiscount,
        city: formCity,
        tags: formTags,
        notes: formNotes,
        isBlacklisted: formIsBlacklisted,
        blacklistReason: formBlacklistReason,
        trustRating: formTrustRating,
      };

      let res;
      if (editingCustomer) {
        res = await fetch(`/api/customers/${editingCustomer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (data.success) {
        setIsEditModalOpen(false);
        fetchCustomers();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось сохранить профиль клиента");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlacklist = async (customer: CustomerItem) => {
    if (!customer.isBlacklisted) {
      const reason = prompt(
        `Укажите причину внесения клиента ${customer.fullName} в ЧЁРНЫЙ СПИСОК (например: 'Отказ оплатить штрафы за превышение', 'Повреждение авто в нетрезвом виде'):`,
        "Грубое нарушение условий аренды"
      );
      if (!reason) return;

      try {
        const res = await fetch(`/api/customers/${customer.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBlacklisted: true, blacklistReason: reason }),
        });
        const data = await res.json();
        if (data.success) fetchCustomers();
      } catch (err) {
        console.error(err);
      }
    } else {
      if (
        confirm(
          `Снять клиента ${customer.fullName} из ЧЁРНОГО СПИСКА и восстановить доступ к бронированию?`
        )
      ) {
        try {
          const res = await fetch(`/api/customers/${customer.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isBlacklisted: false, blacklistReason: null }),
          });
          const data = await res.json();
          if (data.success) fetchCustomers();
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "PLATINUM_VIP":
        return {
          label: "💎 PLATINUM VIP",
          badge: "bg-purple-950/80 text-purple-300 border-purple-500/60 shadow-purple-950",
          icon: <Crown className="w-3.5 h-3.5 text-purple-400" />,
        };
      case "GOLD_VIP":
        return {
          label: "👑 GOLD VIP",
          badge: "bg-amber-950/80 text-amber-300 border-amber-500/60 shadow-amber-950",
          icon: <Award className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "CORPORATE":
        return {
          label: "🏢 CORPORATE",
          badge: "bg-blue-950/80 text-blue-300 border-blue-500/60 shadow-blue-950",
          icon: <Building className="w-3.5 h-3.5 text-blue-400" />,
        };
      default:
        return {
          label: "STANDARD",
          badge: "bg-slate-800 text-slate-300 border-slate-700",
          icon: <Users className="w-3.5 h-3.5 text-slate-400" />,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>CRM Система & База клиентов</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Тбилиси • Батуми • Кутаиси
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Учёт клиентов, VIP-программа и история поездок
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Централизованная CRM-система автопроката: досье водителей, персональные скидки,
              паспортные данные, прямой контакт в WhatsApp/Telegram, история LTV и защита от неблагонадёжных арендаторов.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-indigo-950/60 transition active:scale-95 flex items-center justify-center space-x-2 flex-shrink-0"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Добавить клиента в CRM</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow">
            <span className="text-slate-400 block text-[11px] font-semibold">Всего в базе CRM:</span>
            <div className="text-2xl font-black text-white mt-1">{summary.totalCount}</div>
            <span className="text-[10px] text-slate-500">Уникальных водителей</span>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl shadow">
            <span className="text-amber-300 block text-[11px] font-semibold">VIP постоянных:</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{summary.vipCount}</div>
            <span className="text-[10px] text-amber-400/80">Platinum & Gold VIP</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl shadow">
            <span className="text-emerald-300 block text-[11px] font-semibold">Совокупный LTV:</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {summary.totalRevenueUSD.toLocaleString()} ₾
            </div>
            <span className="text-[10px] text-emerald-400/80">Оплачено за аренду (GEL)</span>
          </div>

          <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow">
            <span className="text-blue-300 block text-[11px] font-semibold">Всего аренд (броней):</span>
            <div className="text-2xl font-black text-blue-400 mt-1">{summary.totalBookingsCount}</div>
            <span className="text-[10px] text-blue-400/80">Средний LTV: {summary.averageLTV} ₾</span>
          </div>

          <div className="bg-slate-900 border border-rose-500/40 p-4 rounded-2xl shadow col-span-2 sm:col-span-1">
            <span className="text-rose-300 block text-[11px] font-semibold">Чёрный список (STOP):</span>
            <div className="text-2xl font-black text-rose-400 mt-1">{summary.blacklistedCount}</div>
            <span className="text-[10px] text-rose-400/80">Запрет на выдачу авто</span>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по ФИО, телефону, номеру паспорта, правам, тегам..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "ALL", label: "Все клиенты" },
              { id: "PLATINUM_VIP", label: "💎 Platinum VIP (-15%)" },
              { id: "GOLD_VIP", label: "👑 Gold VIP (-10%)" },
              { id: "CORPORATE", label: "🏢 Корпоративные" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  selectedTier === t.id
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={() =>
                setBlacklistedFilter(blacklistedFilter === "YES" ? "ALL" : "YES")
              }
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 ${
                blacklistedFilter === "YES"
                  ? "bg-red-600 text-white shadow"
                  : "bg-red-950/40 text-red-400 hover:text-white border border-red-500/30"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>⛔ Чёрный список</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer List Cards */}
      <div className="space-y-3.5">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
            <p className="font-bold text-white">Загрузка базы клиентов CRM...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-white text-sm">Клиенты не найдены</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Попробуйте изменить поисковый запрос или сбросить фильтры
            </p>
          </div>
        ) : (
          customers.map((c) => {
            const tierBadge = getTierBadge(c.loyaltyTier);
            const totalSpent = c.bookings.reduce(
              (acc, b) => (b.status !== "CANCELLED" ? acc + (b.totalAmount || 0) : acc),
              0
            );
            const validBookingsCount = c.bookings.filter((b) => b.status !== "CANCELLED").length;

            return (
              <div
                key={c.id}
                className={`bg-slate-900 border rounded-2xl p-5 transition-all shadow-lg space-y-3 ${
                  c.isBlacklisted
                    ? "border-red-500/80 bg-red-950/15 ring-1 ring-red-500"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header row: Name, Tier, Blacklist */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center space-x-3">
                    {/* Avatar Initials */}
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-md flex-shrink-0 ${
                        c.isBlacklisted
                          ? "bg-red-600"
                          : c.loyaltyTier === "PLATINUM_VIP"
                          ? "bg-gradient-to-tr from-purple-600 to-indigo-600"
                          : "bg-gradient-to-tr from-amber-500 to-orange-600"
                      }`}
                    >
                      {c.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">
                          {c.fullName}
                        </h3>

                        {/* Tier Badge */}
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center space-x-1 border ${tierBadge.badge}`}
                        >
                          {tierBadge.icon}
                          <span>{tierBadge.label}</span>
                        </span>

                        {/* Discount badge */}
                        {c.discountPercent > 0 && (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-full">
                            Скидка {c.discountPercent}%
                          </span>
                        )}

                        {/* Blacklist badge */}
                        {c.isBlacklisted && (
                          <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>⛔ В ЧЁРНОМ СПИСКЕ</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        {c.city && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            <span>{c.city}</span>
                          </span>
                        )}
                        {c.passportCountry && (
                          <span>Гражданство: <strong className="text-slate-300">{c.passportCountry}</strong></span>
                        )}
                        <span className="flex items-center space-x-0.5 text-amber-400">
                          {Array.from({ length: c.trustRating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Stats / LTV */}
                  <div className="flex items-center space-x-4 self-end sm:self-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Поездок:</span>
                      <span className="font-bold text-white text-sm">
                        {validBookingsCount}
                      </span>
                    </div>
                    <div className="border-l border-slate-800 pl-4">
                      <span className="text-[10px] text-slate-500 block">LTV клиента:</span>
                      <span className="font-mono font-black text-amber-400 text-sm">
                        {totalSpent.toLocaleString()} ₾ (GEL)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Blacklist Reason Alert */}
                {c.isBlacklisted && c.blacklistReason && (
                  <div className="bg-red-950/60 border border-red-500/60 rounded-xl p-3 text-xs text-red-200 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-red-100 uppercase text-[10px] block">
                        Причина блокировки клиента:
                      </strong>
                      <p>{c.blacklistReason}</p>
                    </div>
                  </div>
                )}

                {/* Details Grid: Contacts & Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                  {/* Contacts */}
                  <div className="space-y-1.5">
                    <span className="text-slate-400 font-bold block text-[11px]">Контакты & Мессенджеры:</span>
                    <div className="flex items-center space-x-2 text-white font-mono">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <a href={`tel:${c.phone}`} className="hover:underline font-bold">
                        {c.phone}
                      </a>
                    </div>
                    <div className="flex items-center space-x-3 pt-0.5">
                      {c.whatsapp && (
                        <a
                          href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline flex items-center space-x-1 font-bold text-[11px]"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                      {c.telegram && (
                        <a
                          href={`https://t.me/${c.telegram.replace("@", "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline flex items-center space-x-1 font-bold text-[11px]"
                        >
                          <Send className="w-3 h-3" />
                          <span>{c.telegram}</span>
                        </a>
                      )}
                      {c.email && (
                        <span className="text-slate-400 truncate text-[11px]">
                          {c.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-1.5">
                    <span className="text-slate-400 font-bold block text-[11px]">Документы для договора:</span>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span>Паспорт: <strong className="text-white font-mono">{c.passportNumber}</strong></span>
                      <button
                        onClick={() => handleCopy(c.passportNumber, `pass-${c.id}`)}
                        className="text-slate-500 hover:text-white"
                        title="Скопировать"
                      >
                        {copiedId === `pass-${c.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-300">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Права: <strong className="text-white font-mono">{c.driverLicenseNumber}</strong></span>
                      <button
                        onClick={() => handleCopy(c.driverLicenseNumber, `dl-${c.id}`)}
                        className="text-slate-500 hover:text-white"
                        title="Скопировать"
                      >
                        {copiedId === `dl-${c.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Tags & Manager Notes */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                    <span className="text-slate-400 font-bold block text-[11px]">Теги и предпочтения:</span>
                    {c.tags && (
                      <div className="flex flex-wrap gap-1">
                        {c.tags.split(",").map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-medium"
                          >
                            #{t.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    {c.notes && (
                      <p className="text-[11px] text-amber-200/90 italic line-clamp-2">
                        💬 «{c.notes}»
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    {/* Dossier button */}
                    <button
                      onClick={() => setSelectedCustomerDossier(c)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Досье и все аренды ({c.bookings.length})</span>
                    </button>

                    {/* Quick Booking */}
                    {onOpenBookingForCustomer && !c.isBlacklisted && (
                      <button
                        onClick={() => onOpenBookingForCustomer(c)}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow transition active:scale-95 flex items-center space-x-1"
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Оформить бронь</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                      title="Редактировать данные"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {/* Blacklist toggle */}
                    <button
                      onClick={() => handleToggleBlacklist(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                        c.isBlacklisted
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-500/30"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{c.isBlacklisted ? "Снять из ЧС" : "В чёрный список"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Customer Dossier & Booking History */}
      {selectedCustomerDossier && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-white text-base">
                  {selectedCustomerDossier.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-white">
                      {selectedCustomerDossier.fullName}
                    </h3>
                    <span className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      {selectedCustomerDossier.loyaltyTier}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedCustomerDossier.phone} • {selectedCustomerDossier.city || "Грузия"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomerDossier(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Stats */}
            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Всего аренд:</span>
                <span className="text-lg font-black text-white">
                  {selectedCustomerDossier.bookings.length}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Потрачено (LTV):</span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  $
                  {selectedCustomerDossier.bookings
                    .reduce((acc, b) => (b.status !== "CANCELLED" ? acc + (b.totalAmount || 0) : acc), 0)
                    .toLocaleString()}{" "}
                  USD
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Персональная скидка:</span>
                <span className="text-lg font-black text-emerald-400">
                  {selectedCustomerDossier.discountPercent}%
                </span>
              </div>
            </div>

            {/* Rental History List */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                История бронирований и поездок:
              </span>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                {selectedCustomerDossier.bookings.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800">
                    История поездок пуста. Оформите первую бронь!
                  </div>
                ) : (
                  selectedCustomerDossier.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-amber-400 font-bold">
                            № {b.bookingNumber}
                          </span>
                          <span
                            className={`text-[9px] px-2 py-0.2 rounded-full font-bold ${
                              b.status === "ACTIVE"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                                : b.status === "COMPLETED"
                                ? "bg-slate-800 text-slate-300"
                                : "bg-red-950 text-red-400"
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="text-white font-medium">
                          {b.car?.brand} {b.car?.model}{" "}
                          <span className="font-mono text-slate-400">({b.car?.plateNumber})</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(b.startDate).toLocaleDateString("ru-RU")} —{" "}
                          {new Date(b.endDate).toLocaleDateString("ru-RU")} ({b.rentalDays} дн.)
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-amber-400 text-sm block">
                          {b.totalAmount} ₾ (GEL)
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Тариф: {b.dailyRate} ₾/день
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Manager Notes */}
            {selectedCustomerDossier.notes && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">
                  Внутренние заметки менеджера:
                </span>
                <p className="text-amber-100 italic">
                  {selectedCustomerDossier.notes}
                </p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedCustomerDossier(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Customer Profile */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-indigo-500 text-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingCustomer ? "Редактирование профиля клиента" : "Добавление клиента в CRM"}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Учетные данные, документы и VIP статус
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  ФИО клиента (полностью)*:
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="Например: Иван Иванов или John Doe"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Phones & Messengers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Основной телефон*:
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+995 599 000 000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    WhatsApp (номер с кодом):
                  </label>
                  <input
                    type="text"
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="+995 599 000 000"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Telegram (@username):
                  </label>
                  <input
                    type="text"
                    value={formTelegram}
                    onChange={(e) => setFormTelegram(e.target.value)}
                    placeholder="@alex_client"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Email адрес:
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Номер паспорта:
                  </label>
                  <input
                    type="text"
                    value={formPassport}
                    onChange={(e) => setFormPassport(e.target.value)}
                    placeholder="75 14 982143"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Гражданство:
                  </label>
                  <input
                    type="text"
                    value={formPassportCountry}
                    onChange={(e) => setFormPassportCountry(e.target.value)}
                    placeholder="Грузия / Казахстан / Германия..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Водительское удостоверение:
                  </label>
                  <input
                    type="text"
                    value={formLicense}
                    onChange={(e) => setFormLicense(e.target.value)}
                    placeholder="GEO-DL-984210"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* VIP Tier & Discount */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Статус лояльности:
                  </label>
                  <select
                    value={formLoyaltyTier}
                    onChange={(e) => setFormLoyaltyTier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PLATINUM_VIP">💎 PLATINUM VIP (-15%)</option>
                    <option value="GOLD_VIP">👑 GOLD VIP (-10%)</option>
                    <option value="CORPORATE">🏢 Корпоративный</option>
                    <option value="STANDARD">Обычный клиент</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Скидка клиента (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Рейтинг надёжности (1-5):
                  </label>
                  <select
                    value={formTrustRating}
                    onChange={(e) => setFormTrustRating(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500 font-bold text-amber-400"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ (5 - Отличный)</option>
                    <option value={4}>⭐⭐⭐⭐ (4 - Хороший)</option>
                    <option value={3}>⭐⭐⭐ (3 - Средний)</option>
                    <option value={2}>⭐⭐ (2 - Внимание)</option>
                    <option value={1}>⭐ (1 - Риск)</option>
                  </select>
                </div>
              </div>

              {/* City & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Город проживания / базирования:
                  </label>
                  <input
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Тбилиси, Батуми, Алматы, Берлин..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Теги (через запятую):
                  </label>
                  <input
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Постоянный, Кабриолеты, Без залога..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Внутренние заметки менеджера:
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Предпочтения, особенности общения, аккуратность вождения..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Blacklist toggle */}
              <div className="bg-red-950/30 border border-red-500/40 p-3 rounded-xl space-y-2">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsBlacklisted}
                    onChange={(e) => setFormIsBlacklisted(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                  <span className="font-bold text-red-300 text-xs">
                    Внести клиента в ЧЁРНЫЙ СПИСОК (Блокировка выдачи авто)
                  </span>
                </label>

                {formIsBlacklisted && (
                  <div>
                    <input
                      type="text"
                      required
                      value={formBlacklistReason}
                      onChange={(e) => setFormBlacklistReason(e.target.value)}
                      placeholder="Укажите точную причину (штрафы, ДТП, нетрезвое вождение, не оплатил аренду)..."
                      className="w-full bg-slate-950 border border-red-500/60 rounded-xl p-2 text-red-200 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 text-white font-black rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? "Сохранение..." : editingCustomer ? "Сохранить профиль" : "Добавить в CRM"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
