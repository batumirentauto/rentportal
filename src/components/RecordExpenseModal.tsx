"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  DollarSign,
  Fuel,
  Sparkles,
  Wrench,
  Car,
  ParkingMeter,
  AlertCircle,
  Building2,
  Package,
  CheckCircle2,
  Loader2,
  Calendar,
  Wallet,
  Receipt,
  User,
  Landmark,
  Briefcase,
} from "lucide-react";

interface RecordExpenseModalProps {
  isOpen: boolean;
  currentUserName?: string;
  initialCategory?: string;
  initialOwnerId?: string;
  onClose: () => void;
  onExpenseCreated?: () => void;
  preselectedCarId?: string;
  preselectedCityId?: string;
}

const EXPENSE_CATEGORIES = [
  { id: "FUEL", label: "Заправка / Топливо", icon: Fuel, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "WASHING", label: "Мойка / Химчистка", icon: Sparkles, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  { id: "MAINTENANCE", label: "ТО / Масло / Шины", icon: Wrench, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "SALARY", label: "Заработная плата", icon: Briefcase, color: "text-violet-400 bg-violet-500/10 border-violet-500/30" },
  { id: "OWNER_PAYOUT", label: "Выплата инвестору", icon: Landmark, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { id: "PARKING_FINES", label: "Парковка / Аэропорт", icon: ParkingMeter, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { id: "OFFICE_RENT", label: "Офис / Связь / Быт", icon: Building2, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { id: "OTHER", label: "Прочее (комментарий)", icon: Package, color: "text-slate-300 bg-slate-800 border-slate-700" },
];

export const RecordExpenseModal: React.FC<RecordExpenseModalProps> = ({
  isOpen,
  currentUserName,
  initialCategory,
  initialOwnerId,
  onClose,
  onExpenseCreated,
  preselectedCarId,
  preselectedCityId,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<"GEL" | "USD">("GEL");
  const [category, setCategory] = useState<string>(initialCategory || "FUEL");
  const [description, setDescription] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [carId, setCarId] = useState<string>(preselectedCarId || "");
  const [ownerId, setOwnerId] = useState<string>(initialOwnerId || "");
  const [paymentMethod, setPaymentMethod] = useState<string>("BANK_TRANSFER");
  const [managerName, setManagerName] = useState<string>(() => {
    if (currentUserName && currentUserName !== "Менеджер смены") return currentUserName;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rentportal_manager_name");
      if (stored) return stored;
    }
    return "Менеджер смены";
  });
  const [cityId, setCityId] = useState<string>(preselectedCityId || "");
  const [recipientUserId, setRecipientUserId] = useState<string>("");
  const [salaryType, setSalaryType] = useState<string>("MONTHLY");

  const [accounts, setAccounts] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [carSearch, setCarSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [pricingRes, timelineRes, teamRes] = await Promise.all([
        fetch("/api/pricing"),
        fetch("/api/fleet/timeline"),
        fetch("/api/team"),
      ]);

      const pricingData = await pricingRes.json();
      const timelineData = await timelineRes.json();
      const teamData = await teamRes.json();

      if (pricingData.cars) {
        setCars(pricingData.cars);
      }
      if (timelineData.cities) {
        setCities(timelineData.cities);
      }
      if (teamData.owners) {
        setOwners(teamData.owners);
      }
      if (teamData.users) {
        setUsers(teamData.users);
      }
      if (initialCategory) {
        setCategory(initialCategory);
      }
      if (initialOwnerId) {
        setOwnerId(initialOwnerId);
      }
      if (teamData.accounts && teamData.accounts.length > 0) {
        setAccounts(teamData.accounts);
        if (!accountId) {
          setAccountId(teamData.accounts[0].id);
        }
      } else if (timelineData.financialAccounts) {
        setAccounts(timelineData.financialAccounts);
        if (timelineData.financialAccounts.length > 0 && !accountId) {
          setAccountId(timelineData.financialAccounts[0].id);
        }
      }
    } catch (e: any) {
      console.error("Error loading accounts:", e);
    } finally {
      setLoading(false);
    }
  };

  const eligibleEmployees = useMemo(() => {
    return users.filter(
      (u) =>
        u.role === "MANAGER" ||
        u.role === "EXECUTIVE" ||
        u.role === "ADMIN" ||
        u.role === "SUPER_ADMIN" ||
        Boolean(u.cashAccountId) ||
        !u.ownerId
    );
  }, [users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg("Укажите корректную сумму расхода больше 0");
      return;
    }
    if (category === "OWNER_PAYOUT" && !ownerId) {
      setErrorMsg("Пожалуйста, выберите инвестора (владельца авто), которому производится выплата");
      return;
    }
    if (category === "SALARY" && !recipientUserId) {
      setErrorMsg("Пожалуйста, выберите менеджера или сотрудника, которому выплачивается заработная плата");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Укажите краткое описание или назначение расхода");
      return;
    }
    if (!accountId) {
      setErrorMsg("Выберите счёт или кассу списания");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const selectedRecipient = users.find((u) => u.id === recipientUserId);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          currency,
          category,
          description: description.trim(),
          accountId,
          ownerId: ownerId || undefined,
          isOwnerExpense: Boolean(ownerId || carId),
          paymentMethod: (category === "OWNER_PAYOUT" || category === "SALARY") ? paymentMethod : undefined,
          carId: carId || undefined,
          cityId: cityId || undefined,
          managerName: managerName.trim() || "Менеджер",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(`Расход ${numAmount} ${currency} успешно зафиксирован!`);
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
          if (onExpenseCreated) onExpenseCreated();
        }, 1200);
      } else {
        setErrorMsg(data.error || "Не удалось сохранить расход");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ошибка сети при отправке");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCars = cars.filter(
    (c) =>
      c.brand.toLowerCase().includes(carSearch.toLowerCase()) ||
      c.model.toLowerCase().includes(carSearch.toLowerCase()) ||
      c.plateNumber.toLowerCase().includes(carSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[92dvh] shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center shadow-lg shadow-rose-950">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center space-x-2">
                <span>Зафиксировать расход</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full uppercase font-mono">
                  Касса & Траты
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Заправка, мойка, ТО, парковки и операционные расходы сотрудников
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Amount & Currency */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              Сумма расхода *
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-xl font-mono font-black text-white placeholder-slate-600 focus:outline-none transition shadow-inner"
                />
              </div>

              {/* Currency Selector Pills */}
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrency("GEL")}
                  className={`px-3 py-2 text-xs font-black rounded-lg transition ${
                    currency === "GEL"
                      ? "bg-rose-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  ₾ GEL
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={`px-3 py-2 text-xs font-black rounded-lg transition ${
                    currency === "USD"
                      ? "bg-rose-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              Категория расхода *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id);
                      if (cat.id === "FUEL" && !description) setDescription("Заправка топлива");
                      if (cat.id === "WASHING") {
                        if (!amount) setAmount("20");
                        setCurrency("GEL");
                        if (!description) setDescription("Полная мойка авто");
                      }
                      if (cat.id === "SALARY") {
                        const u = users.find((x) => x.id === recipientUserId);
                        if (u) {
                          setDescription(`Заработная плата: ${u.fullName}`);
                        } else if (!description) {
                          setDescription("Заработная плата сотрудника");
                        }
                      }
                      if (cat.id === "OWNER_PAYOUT") {
                        if (!description) setDescription("Выплата дохода инвестору");
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex items-center space-x-2 transition-all active:scale-95 text-left ${
                      isSelected
                        ? "bg-rose-950/80 border-rose-500 text-white ring-2 ring-rose-500/40 shadow-lg"
                        : `${cat.color} hover:brightness-125`
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="font-bold text-[11px] leading-tight truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick wash presets if category is WASHING */}
          {category === "WASHING" && (
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5 space-y-1.5 animate-fadeIn">
              <span className="text-[10px] text-cyan-300 font-bold block">
                ⚡ Быстрый выбор типа мойки (начисляется в отчёт партнеру, оплата раз в месяц):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAmount("20");
                    setCurrency("GEL");
                    setDescription("Полная мойка (кузов + салон)");
                  }}
                  className="py-2 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-center font-bold text-xs transition"
                >
                  <span className="block text-xs font-semibold">✨ Полная мойка</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAmount("10");
                    setCurrency("GEL");
                    setDescription("Мойка кузова");
                  }}
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-center font-bold text-xs transition"
                >
                  <span className="block text-xs font-semibold">🚗 Кузов</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAmount("10");
                    setCurrency("GEL");
                    setDescription("Мойка / чистка салона");
                  }}
                  className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-center font-bold text-xs transition"
                >
                  <span className="block text-xs font-semibold">💺 Салон</span>
                </button>
              </div>
            </div>
          )}

          {/* Dedicated Staff Salary selection block if category is SALARY */}
          {category === "SALARY" && (
            <div className="bg-violet-950/40 border border-violet-500/40 rounded-xl p-3 sm:p-3.5 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 flex items-center space-x-1.5 uppercase tracking-wider">
                  <Briefcase className="w-4 h-4 text-violet-400" />
                  <span>Кому выплата (Менеджер / Сотрудник) *</span>
                </span>
                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded font-mono font-bold">
                  Зарплата & Бонусы
                </span>
              </div>

              <select
                value={recipientUserId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setRecipientUserId(uid);
                  const u = users.find((x) => x.id === uid);
                  if (u) {
                    const typeLabel =
                      salaryType === "ADVANCE" ? "Аванс" :
                      salaryType === "BONUS" ? "Премия" :
                      salaryType === "COMMISSION" ? "Процент от выдач" : "Заработная плата";
                    setDescription(`${typeLabel}: ${u.fullName}`);
                  }
                }}
                required
                className="w-full bg-slate-900 border border-violet-500/50 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-violet-400"
              >
                <option value="">-- Выберите сотрудника / менеджера из списка ({eligibleEmployees.length}) --</option>
                {eligibleEmployees.map((emp: any) => {
                  const roleBadge =
                    emp.role === "EXECUTIVE" ? "Руководство" :
                    emp.role === "ADMIN" ? "Администратор" : "Менеджер";
                  return (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} • {roleBadge} ({emp.cityName || "Все филиалы"}) {emp.phone ? `• ${emp.phone}` : ""}
                    </option>
                  );
                })}
              </select>

              <div>
                <label className="text-[10px] text-slate-300 font-bold block mb-1 uppercase tracking-wider">
                  Тип начисления:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: "MONTHLY", label: "Зарплата", icon: "💼" },
                    { id: "ADVANCE", label: "Аванс", icon: "🪙" },
                    { id: "BONUS", label: "Премия", icon: "⭐" },
                    { id: "COMMISSION", label: "% от выдач", icon: "📈" },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => {
                        setSalaryType(t.id);
                        const u = users.find((x) => x.id === recipientUserId);
                        const name = u ? u.fullName : "";
                        const typeLabel =
                          t.id === "ADVANCE" ? "Аванс" :
                          t.id === "BONUS" ? "Премия" :
                          t.id === "COMMISSION" ? "Процент от выдач" : "Заработная плата";
                        setDescription(name ? `${typeLabel}: ${name}` : typeLabel);
                      }}
                      className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] border transition ${
                        salaryType === t.id
                          ? "bg-violet-600 text-white border-violet-400 shadow"
                          : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <span>{t.icon} {t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-300 font-bold block mb-1 uppercase tracking-wider">
                  Способ выплаты сотруднику:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="CASH">💵 Выдача наличных из кассы</option>
                  <option value="BANK_TRANSFER">🏦 Перевод на банковскую карту (BOG / TBC / Credo)</option>
                  <option value="CRYPTO">🪙 Криптовалютный перевод (USDT)</option>
                </select>
              </div>

              <p className="text-[10px] text-violet-300/80">
                ✅ Сумма спишется с выбранной кассы или счёта компании и отобразится в журнале и финансовом отчете как выплата заработной платы.
              </p>
            </div>
          )}

          {/* Dedicated Investor selection block if category is OWNER_PAYOUT */}
          {category === "OWNER_PAYOUT" && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center space-x-1.5 uppercase tracking-wider">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span>Кому выплата (Инвестор / Владелец авто) *</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  Учёт баланса
                </span>
              </div>

              <select
                value={ownerId}
                onChange={(e) => {
                  setOwnerId(e.target.value);
                  const o = owners.find((x) => x.id === e.target.value);
                  if (o) {
                    setDescription(`Выплата дохода инвестору: ${o.fullName}`);
                  }
                }}
                required
                className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl p-2.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-400"
              >
                <option value="">-- Выберите инвестора из списка ({owners.length}) --</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.fullName} ({o.carsCount} авто) {o.phone ? `• ${o.phone}` : ""}
                  </option>
                ))}
              </select>

              <div>
                <label className="text-[10px] text-slate-300 font-bold block mb-1 uppercase tracking-wider">
                  Способ перевода инвестору:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK_TRANSFER">🏦 Банковский перевод на IBAN (TBC / BOG)</option>
                  <option value="CASH">💵 Выдача наличных из кассы</option>
                  <option value="CRYPTO">🪙 Криптовалютный перевод (USDT / Crypto)</option>
                </select>
              </div>

              <p className="text-[10px] text-emerald-300/80">
                ✅ Сумма будет автоматически зачтена в историю выплат в кабинете инвестора и спишется с выбранного счёта компании.
              </p>
            </div>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 block uppercase tracking-wider">
              Назначение / Комментарий *
            </label>
            <input
              type="text"
              required
              placeholder="Например: Заправка 20л перед выдачей в аэропорту TBS..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Two Columns: Car & Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5 uppercase tracking-wider">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span>Счёт / Касса списания *</span>
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currentBalance} {acc.currency === "GEL" ? "₾" : "$"})
                  </option>
                ))}
              </select>
            </div>

            {/* Manager Name */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Кто оплатил (Сотрудник)</span>
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Имя менеджера"
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition"
              />
            </div>
          </div>

          {/* Car Link (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between uppercase tracking-wider">
              <span className="flex items-center space-x-1.5">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                <span>Связанный автомобиль (опционально)</span>
              </span>
              {carId && (
                <button
                  type="button"
                  onClick={() => setCarId("")}
                  className="text-[10px] text-rose-400 hover:text-white"
                >
                  Снять выбор
                </button>
              )}
            </label>
            <select
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-white focus:outline-none transition"
            >
              <option value="">— Без привязки к конкретному авто —</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.plateNumber} • {car.brand} {car.model} ({car.year})
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-950 transition active:scale-95 flex items-center space-x-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Сохранение...</span>
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  <span>Записать расход ({currency})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
