import React, { useEffect, useState, useMemo } from "react";
import {
  DollarSign,
  Landmark,
  CreditCard,
  Coins,
  CheckCircle,
  ArrowDownRight,
  RefreshCcw,
  Receipt,
  Fuel,
  Sparkles,
  Wrench,
  ParkingMeter,
  Package,
  PlusCircle,
  User,
  Building2,
  Calendar,
  Filter,
  Clock,
} from "lucide-react";
import { RecordExpenseModal } from "./RecordExpenseModal";
import { GoogleSheetsBackupBanner } from "./GoogleSheetsBackupBanner";
import { useLanguage } from "@/contexts/LanguageContext";

type PeriodPreset = "today" | "yesterday" | "day_before" | "week" | "month" | "all" | "custom";

export const FinanceView: React.FC = () => {
  const { language, t } = useLanguage();
  const [activeFinanceTab, setActiveFinanceTab] = useState<"payments" | "expenses" | "manager_cash">("payments");
  const [financeData, setFinanceData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [managerCashAccounts, setManagerCashAccounts] = useState<any[]>([]);
  const [managerCashByCity, setManagerCashByCity] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseInitialCategory, setExpenseInitialCategory] = useState<string | undefined>(undefined);

  // Фильтр по дате / периоду
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("today");
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [finRes, expRes, execRes] = await Promise.all([
        fetch("/api/finance"),
        fetch("/api/expenses"),
        fetch("/api/executive/analytics"),
      ]);

      const finJson = await finRes.json();
      const expJson = await expRes.json();
      const execJson = await execRes.json();

      if (finJson.success) setFinanceData(finJson);
      if (expJson.success) setExpenses(expJson.expenses || []);
      if (execJson.success) {
        setManagerCashAccounts(execJson.managerCashAccounts || []);
        setManagerCashByCity(execJson.managerCashByCity || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Расчет границ выбранного периода
  const periodBounds = useMemo(() => {
    const now = new Date();

    if (periodPreset === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Сегодня (${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`,
        shortLabel: "Сегодня",
      };
    }

    if (periodPreset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Вчера (${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`,
        shortLabel: "Вчера",
      };
    }

    if (periodPreset === "day_before") {
      const db = new Date(now);
      db.setDate(db.getDate() - 2);
      const start = new Date(db.getFullYear(), db.getMonth(), db.getDate(), 0, 0, 0, 0);
      const end = new Date(db.getFullYear(), db.getMonth(), db.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Позавчера (${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`,
        shortLabel: "Позавчера",
      };
    }

    if (periodPreset === "week") {
      const w = new Date(now);
      w.setDate(w.getDate() - 6);
      const start = new Date(w.getFullYear(), w.getMonth(), w.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Последние 7 дней (${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`,
        shortLabel: "7 дней",
      };
    }

    if (periodPreset === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start,
        end,
        label: `Этот месяц (${start.toLocaleDateString("ru-RU", { month: "long" })})`,
        shortLabel: "Этот месяц",
      };
    }

    if (periodPreset === "custom" && customStartDate) {
      const start = new Date(`${customStartDate}T00:00:00`);
      const endStr = customEndDate || customStartDate;
      const end = new Date(`${endStr}T23:59:59.999`);
      const isSingleDay = customStartDate === endStr;
      return {
        start,
        end,
        label: isSingleDay
          ? `Дата: ${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`
          : `Период: ${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`,
        shortLabel: isSingleDay
          ? start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
          : `${start.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}—${end.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`,
      };
    }

    return {
      start: null,
      end: null,
      label: "Всё время",
      shortLabel: "Всё время",
    };
  }, [periodPreset, customStartDate, customEndDate]);

  const allPayments = financeData?.payments || [];
  const allExpenses = expenses || [];

  // Фильтрованные транзакции и расходы по выбранному периоду
  const payments = useMemo(() => {
    if (!periodBounds.start || !periodBounds.end) return allPayments;
    return allPayments.filter((p: any) => {
      const d = new Date(p.createdAt);
      return d >= periodBounds.start! && d <= periodBounds.end!;
    });
  }, [allPayments, periodBounds]);

  const filteredExpenses = useMemo(() => {
    if (!periodBounds.start || !periodBounds.end) return allExpenses;
    return allExpenses.filter((e: any) => {
      const d = new Date(e.date || e.createdAt);
      return d >= periodBounds.start! && d <= periodBounds.end!;
    });
  }, [allExpenses, periodBounds]);

  // Динамическая сводка поступлений и залогов за выбранный период
  const summary = useMemo(() => {
    const s = {
      totalUSD: 0,
      totalGEL: 0,
      totalEUR: 0,
      depositsUSD: 0,
      depositsGEL: 0,
      pendingRefundsUSD: 0,
      pendingRefundsGEL: 0,
      byMethod: {
        CASH: 0,
        CARD_POS: 0,
        TBC_BANK: 0,
        BOG_BANK: 0,
        CREDO_BANK: 0,
        BANK_TRANSFER: 0,
        CRYPTO: 0,
      } as Record<string, number>,
    };

    payments.forEach((p: any) => {
      const amt = Number(p.amount) || 0;
      if (p.currency === "USD") {
        if (p.type === "DEPOSIT") {
          s.depositsUSD += amt;
        } else {
          s.totalUSD += amt;
        }
      } else if (p.currency === "GEL") {
        if (p.type === "DEPOSIT") {
          s.depositsGEL += amt;
        } else {
          s.totalGEL += amt;
        }
      } else if (p.currency === "EUR") {
        s.totalEUR += amt;
      }

      if (p.changeOnReturn && Number(p.changeOnReturn) > 0) {
        if (p.currency === "GEL") s.pendingRefundsGEL += Number(p.changeOnReturn);
        else s.pendingRefundsUSD += Number(p.changeOnReturn);
      }

      const methodKey = p.method || "CASH";
      if (s.byMethod[methodKey] !== undefined) {
        s.byMethod[methodKey] += amt;
      } else {
        s.byMethod[methodKey] = amt;
      }
    });

    return s;
  }, [payments]);

  // Expenses calculations за выбранный период
  const totalExpensesGEL = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.currency === "GEL")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const totalExpensesUSD = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.currency === "USD")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const fuelExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.category === "FUEL")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const washExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.category === "WASHING")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const maintExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.category === "MAINTENANCE")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  const ownerPayoutExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.category === "OWNER_PAYOUT")
      .reduce((acc, e) => acc + (e.amount || 0), 0);
  }, [filteredExpenses]);

  // ВАЖНО: ранний return только ПОСЛЕ всех хуков (правила React Hooks)
  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
        <p>Загрузка кассы и расходов...</p>
      </div>
    );
  }

  const getPaymentMethodInfo = (method: string) => {
    switch (method) {
      case "CASH":
        return { label: "💵 Наличные (CASH)", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "CARD_POS":
        return { label: "💳 Терминал / Карта", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
      case "BOG_BANK":
        return { label: "🏦 Bank of Georgia", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      case "TBC_BANK":
        return { label: "🏦 TBC Bank", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
      case "CREDO_BANK":
        return { label: "🏦 Credo Bank", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
      case "BANK_TRANSFER":
        return { label: "🏦 Банковский перевод", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" };
      case "CRYPTO":
        return { label: "💎 Криптовалюта (USDT)", color: "text-teal-400 bg-teal-500/10 border-teal-500/30" };
      default:
        return { label: method || "Не указан", color: "text-slate-300 bg-slate-800 border-slate-700" };
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "FUEL":
        return { label: "Заправка / Топливо", icon: Fuel, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
      case "WASHING":
        return { label: "Мойка / Химчистка", icon: Sparkles, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
      case "MAINTENANCE":
        return { label: "ТО / Ремонт", icon: Wrench, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" };
      case "OWNER_PAYOUT":
        return { label: "Выплата инвестору", icon: Landmark, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
      case "PARKING_FINES":
        return { label: "Парковка / Штраф", icon: ParkingMeter, color: "text-blue-400 bg-blue-500/10 border-blue-500/30" };
      case "OFFICE_RENT":
        return { label: "Офис / Связь", icon: Building2, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" };
      default:
        return { label: "Прочее", icon: Package, color: "text-slate-300 bg-slate-800 border-slate-700" };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Касса смены & Учёт расходов</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Прием оплат за аренду, залоги клиентов и операционные расходы сотрудников (топливо, мойка, ТО, выплаты инвесторам)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Action: Record Owner Payout Button */}
          <button
            onClick={() => {
              setExpenseInitialCategory("OWNER_PAYOUT");
              setIsExpenseModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-950 transition active:scale-95 flex items-center space-x-1.5"
            title="Выплатить доход владельцу автомобиля (инвестору)"
          >
            <Coins className="w-4 h-4" />
            <span>{language === "ka" ? "+ ინვესტორის გაცემა" : "+ Выплата инвестору"}</span>
          </button>

          {/* Action: Record Expense Button */}
          <button
            onClick={() => {
              setExpenseInitialCategory(undefined);
              setIsExpenseModalOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-950 transition active:scale-95 flex items-center space-x-1.5"
          >
            <Receipt className="w-4 h-4" />
            <span>{language === "ka" ? "+ ხარჯის ჩაწერა" : "+ Записать расход"}</span>
          </button>

          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Обновить данные"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Sheets Backup & Reporting Banner */}
      <GoogleSheetsBackupBanner onSyncComplete={fetchData} />

      {/* Панель выбора даты и периода для кассы смены */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {language === "ka" ? "სალაროს ანგარიშის პერიოდი:" : "Период отчёта кассы:"}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700 font-mono">
                  {periodPreset === "today" 
                    ? (language === "ka" ? "ნაგულისხმევი" : "по умолчанию") 
                    : (language === "ka" ? "ფილტრი აქტიურია" : "фильтр активен")}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-amber-400 mt-0.5 flex items-center space-x-1.5">
                <span>{periodBounds.label}</span>
              </h3>
            </div>
          </div>

          {/* Кнопки быстрого выбора дат */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => {
                setPeriodPreset("today");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "today"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("today")}
            </button>
            <button
              onClick={() => {
                setPeriodPreset("yesterday");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "yesterday"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("yesterday")}
            </button>
            <button
              onClick={() => {
                setPeriodPreset("day_before");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "day_before"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("dayBeforeYesterday")}
            </button>
            <button
              onClick={() => {
                setPeriodPreset("week");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "week"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("week")}
            </button>
            <button
              onClick={() => {
                setPeriodPreset("month");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "month"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("month")}
            </button>
            <button
              onClick={() => {
                setPeriodPreset("custom");
                setShowCustomRangeInputs(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                periodPreset === "custom"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t("selectDate")}</span>
            </button>
            <button
              onClick={() => {
                setPeriodPreset("all");
                setShowCustomRangeInputs(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                periodPreset === "all"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20 scale-105"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("allTime")}
            </button>
          </div>
        </div>

        {/* Раскрывающийся блок точного выбора даты или интервала */}
        {(showCustomRangeInputs || periodPreset === "custom") && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-300 font-bold flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Укажите точную дату или диапазон:</span>
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-semibold">С:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => {
                  setCustomStartDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400 font-semibold">По:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => {
                  setCustomEndDate(e.target.value);
                  setPeriodPreset("custom");
                }}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              onClick={() => {
                const todayStr = new Date().toISOString().split("T")[0];
                setCustomStartDate(todayStr);
                setCustomEndDate(todayStr);
                setPeriodPreset("custom");
              }}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold border border-slate-700"
            >
              Сбросить на сегодня
            </button>
          </div>
        )}
      </div>

      {/* Main Switcher: Payments vs Expenses vs Manager Cash */}
      <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 max-w-xl">
        <button
          onClick={() => setActiveFinanceTab("payments")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeFinanceTab === "payments"
              ? "bg-amber-500 text-slate-950 shadow-md font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{language === "ka" ? "შემოსავლები & დეპოზიტები" : "Поступления & Залоги"} ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveFinanceTab("expenses")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeFinanceTab === "expenses"
              ? "bg-rose-600 text-white shadow-md font-black"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{language === "ka" ? "ხარჯების ჟურნალი" : "Журнал расходов"} ({filteredExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveFinanceTab("manager_cash")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeFinanceTab === "manager_cash"
              ? "bg-emerald-600 text-white shadow-md font-black"
              : "text-emerald-400 hover:text-white"
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>{language === "ka" ? "მენეჯერების სალაროები" : "Кассы менеджеров"} ({managerCashAccounts.length})</span>
        </button>
      </div>

      {/* TAB 1: PAYMENTS */}
      {activeFinanceTab === "payments" && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Поступления за аренду:
              </span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                {summary.totalGEL || 0} ₾
              </div>
              <span className="text-xs text-slate-500 mt-1 block">
                {summary.totalUSD > 0 ? `+ $${summary.totalUSD} USD` : "Основная валюта: GEL (₾)"}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Депозиты (Залоги на удержании):
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                {summary.depositsGEL || 0} ₾
              </div>
              <span className="text-xs text-emerald-500/80 mt-1 block">
                {summary.depositsUSD > 0 ? `+ $${summary.depositsUSD} USD • ` : ""}Подлежат возврату при приёмке авто
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Сдача к возврату клиентам:
              </span>
              <div className="text-3xl font-black text-rose-400 font-mono mt-1">
                {summary.pendingRefundsGEL || summary.pendingRefundsUSD || 0} ₾
              </div>
              <span className="text-xs text-rose-400/80 mt-1 block">
                Сумма сдачи при возврате машины
              </span>
            </div>
          </div>

          {/* Breakdown by Payment Channels */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider text-slate-300">
              Разбивка поступлений по каналам оплат:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">💵 Наличные</span>
                <span className="text-base font-bold text-white font-mono">
                  {summary.byMethod?.CASH || 0} ₾
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">💳 Терминал</span>
                <span className="text-base font-bold text-white font-mono">
                  {summary.byMethod?.CARD_POS || 0} ₾
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">🏦 Bank of Georgia</span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {summary.byMethod?.BOG_BANK || 0} ₾
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">🏦 TBC Bank</span>
                <span className="text-base font-bold text-blue-400 font-mono">
                  {summary.byMethod?.TBC_BANK || 0} ₾
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">🏦 Credo Bank</span>
                <span className="text-base font-bold text-rose-400 font-mono">
                  {summary.byMethod?.CREDO_BANK || 0} ₾
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">💎 Крипто (USDT)</span>
                <span className="text-base font-bold text-emerald-400 font-mono">
                  ${summary.byMethod?.CRYPTO || 0}
                </span>
              </div>
            </div>

            {/* Дополнительно: Банковский перевод (если есть) */}
            {Boolean(summary.byMethod?.BANK_TRANSFER) && (
              <div className="mt-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">🏦 Банковский перевод (счёт):</span>
                <span className="font-bold font-mono text-indigo-400">{summary.byMethod?.BANK_TRANSFER} ₾</span>
              </div>
            )}
          </div>

          {/* Transactions List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-white text-base">
                  Журнал финансовых операций по выдачам
                </h3>
                <span className="text-xs text-amber-400 font-semibold block mt-0.5">
                  Период: {periodBounds.label}
                </span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-mono w-max">
                Транзакций: <strong className="text-white">{payments.length}</strong>
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                За выбранный период ({periodBounds.shortLabel}) транзакций нет. Выберите другой период или проведите выдачу авто через «План выдач».
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Время</th>
                      <th className="py-3 px-4">Бронь / Авто</th>
                      <th className="py-3 px-4">Клиент</th>
                      <th className="py-3 px-4">Тип</th>
                      <th className="py-3 px-4">Способ</th>
                      <th className="py-3 px-4">Сумма</th>
                      <th className="py-3 px-4">Сдача при сдаче</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {payments.map((p: any) => {
                      const methodInfo = getPaymentMethodInfo(p.method);
                      const isGEL = p.currency === "GEL";
                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {new Date(p.createdAt).toLocaleTimeString("ru-RU", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-white block">
                              {p.booking?.car?.brand} {p.booking?.car?.model}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {p.booking?.car?.plateNumber} • {p.booking?.bookingNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {p.booking?.customer?.fullName || "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                p.type === "DEPOSIT"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {p.type === "DEPOSIT" ? "ДЕПОЗИТ" : "АРЕНДА"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${methodInfo.color}`}>
                              {methodInfo.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                            {p.amount} {isGEL ? "₾" : p.currency === "USD" ? "$" : p.currency}
                          </td>
                          <td className="py-3 px-4">
                            {p.changeOnReturn && p.changeOnReturn > 0 ? (
                              <span className="text-rose-400 font-mono font-bold">
                                {p.changeOnReturn} {isGEL ? "₾" : "$"}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EXPENSES JOURNAL */}
      {activeFinanceTab === "expenses" && (
        <div className="space-y-6">
          {/* Expenses KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Всего расходов:
              </span>
              <div className="text-2xl font-black text-rose-400 font-mono mt-1">
                {totalExpensesGEL} ₾
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                + ${totalExpensesUSD} USD
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Выплаты инвесторам:
              </span>
              <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                {ownerPayoutExpenses} ₾
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Доход владельцев авто
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Заправка топлива:
              </span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-1">
                {fuelExpenses} ₾
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Бензин / дизель
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Мойки и химчистки:
              </span>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
                {washExpenses} ₾
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Начислено в реестр
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                ТО, масло и шины:
              </span>
              <div className="text-2xl font-black text-purple-400 font-mono mt-1">
                {maintExpenses} ₾
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Сервисные расходы
              </span>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-white text-base">
                  Журнал операционных расходов сотрудников
                </h3>
                <span className="text-xs text-amber-400 font-semibold block mt-0.5">
                  Период: {periodBounds.label}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  Все зафиксированные траты с указанием ответственного, автомобиля и счёта списания
                </p>
              </div>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Добавить расход</span>
              </button>
            </div>

            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                За выбранный период ({periodBounds.shortLabel}) расходов не найдено. Нажмите кнопку «Добавить расход» или выберите другой период.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Дата / Время</th>
                      <th className="py-3 px-4">Категория</th>
                      <th className="py-3 px-4">Назначение / Описание</th>
                      <th className="py-3 px-4">Автомобиль</th>
                      <th className="py-3 px-4">Касса / Счёт</th>
                      <th className="py-3 px-4">Сотрудник</th>
                      <th className="py-3 px-4 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredExpenses.map((exp: any) => {
                      const badge = getCategoryBadge(exp.category);
                      const Icon = badge.icon;
                      return (
                        <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {new Date(exp.date || exp.createdAt).toLocaleDateString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold w-max ${badge.color}`}>
                                <Icon className="w-3 h-3 shrink-0" />
                                <span>{badge.label}</span>
                              </span>
                              {exp.status === "ACCRUED" && (
                                <span className="text-[9px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded w-max font-medium">
                                  Начислено (оплата раз в месяц)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-medium max-w-xs">
                            {exp.description}
                          </td>
                          <td className="py-3 px-4">
                            {exp.owner ? (
                              <div>
                                <span className="font-bold text-emerald-400 block">
                                  {exp.owner.fullName}
                                </span>
                                <span className="text-[10px] text-emerald-500/80 font-mono">
                                  Инвестор
                                </span>
                              </div>
                            ) : exp.car ? (
                              <div>
                                <span className="font-bold text-white block">
                                  {exp.car.brand} {exp.car.model}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400">
                                  {exp.car.plateNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {exp.account?.name || "Касса"}
                          </td>
                          <td className="py-3 px-4 text-slate-300 flex items-center space-x-1.5">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{exp.managerName || "Менеджер"}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                            -{exp.amount} {exp.currency}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MANAGER CASH REGISTERS (НАЛИЧНЫЕ КАССЫ МЕНЕДЖЕРОВ ПО ГОРОДАМ) */}
      {activeFinanceTab === "manager_cash" && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black px-2.5 py-0.5 rounded uppercase">
                    Децентрализованные кассы
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Раздельные кассы для каждого менеджера в городе
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>Балансы наличных касс менеджеров (Грузия)</span>
                </h3>
              </div>

              <div className="flex items-center space-x-2 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Всего у менеджеров:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {managerCashAccounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0)} ₾
                </span>
              </div>
            </div>

            {/* City Groups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { city: "Батуми", code: "BUS", icon: "🌊", desc: "Батуми (Офис & Аэропорт)" },
                { city: "Тбилиси", code: "TBS", icon: "🏛️", desc: "Тбилиси (Офис & Аэропорт)" },
                { city: "Кутаиси", code: "KUT", icon: "🌿", desc: "Кутаиси (Копитнари)" },
              ].map((grp) => {
                const cityAccounts = managerCashByCity?.[grp.city] || [];
                const citySum = cityAccounts.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);

                return (
                  <div key={grp.code} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{grp.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{grp.city}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{grp.desc}</span>
                        </div>
                      </div>
                      <span className="font-mono font-black text-amber-400 text-xs">
                        {citySum} ₾
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {cityAccounts.length === 0 ? (
                        <p className="text-xs text-slate-500 italic py-2 text-center">Нет открытых касс</p>
                      ) : (
                        cityAccounts.map((acc: any) => {
                          const accFilteredPayments = payments.filter((p: any) => {
                            if (p.accountId === acc.id) return true;
                            const pMgr = (p.managerName || "").toLowerCase();
                            const accMgr = (acc.managerName || "").toLowerCase();
                            const accName = (acc.name || "").toLowerCase();
                            return (accMgr && pMgr.includes(accMgr)) || (accName && pMgr.includes(accName));
                          });

                          const accFilteredExpenses = filteredExpenses.filter((e: any) => {
                            if (e.accountId === acc.id) return true;
                            const eMgr = (e.managerName || "").toLowerCase();
                            const accMgr = (acc.managerName || "").toLowerCase();
                            const accName = (acc.name || "").toLowerCase();
                            return (accMgr && eMgr.includes(accMgr)) || (accName && eMgr.includes(accName));
                          });

                          const periodIncome = accFilteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0);
                          const periodExpense = accFilteredExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);

                          return (
                            <div
                              key={acc.id}
                              className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 space-y-1.5 shadow"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-white flex items-center space-x-1">
                                  <User className="w-3.5 h-3.5 text-slate-400" />
                                  <span>{acc.managerName}</span>
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ₾ GEL
                                </span>
                              </div>

                              <div className="flex justify-between items-baseline pt-1">
                                <span className="text-[10px] text-slate-400">
                                  {language === "ka" ? "ხელზე სალაროში:" : "На руках в кассе:"}
                                </span>
                                <span className="font-mono font-black text-emerald-400 text-sm">
                                  {acc.currentBalance} ₾
                                </span>
                              </div>

                              <div className="flex justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/60 font-mono">
                                <span className="text-amber-400 font-semibold">{periodBounds.shortLabel}:</span>
                                <span className="font-bold">
                                  <span className={periodIncome > 0 ? "text-emerald-400" : "text-slate-400"}>+{periodIncome} ₾</span>
                                  <span className="text-slate-600"> / </span>
                                  <span className={periodExpense > 0 ? "text-rose-400" : "text-slate-400"}>-{periodExpense} ₾</span>
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      <RecordExpenseModal
        isOpen={isExpenseModalOpen}
        initialCategory={expenseInitialCategory}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseInitialCategory(undefined);
        }}
        onExpenseCreated={fetchData}
      />
    </div>
  );
};
