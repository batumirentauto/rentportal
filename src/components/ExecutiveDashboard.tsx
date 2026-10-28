import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  Wallet,
  Landmark,
  Coins,
  Receipt,
  PieChart,
  Calendar,
  PlusCircle,
  X,
  Check,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  CheckSquare,
  ArrowRightLeft,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { ManagerTasksSection } from "./ManagerTasksSection";
import { GoogleSheetsBackupBanner } from "./GoogleSheetsBackupBanner";

export const ExecutiveDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [executiveTab, setExecutiveTab] = useState<"finance" | "tasks">("finance");

  // New Expense form state
  const [expenseAccountId, setExpenseAccountId] = useState<string>("");
  const [expenseCategory, setExpenseCategory] = useState<string>("FUEL");
  const [expenseAmount, setExpenseAmount] = useState<number>(50);
  const [expenseCurrency, setExpenseCurrency] = useState<string>("GEL");
  const [expenseDesc, setExpenseDesc] = useState<string>("");
  const [expenseManager, setExpenseManager] = useState<string>("Менеджер");
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);

  // Cash Collection / Transfer Modal (Инкассация из кассы менеджера в банк или главную кассу)
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [transferFromAccount, setTransferFromAccount] = useState<any>(null);
  const [transferToAccountId, setTransferToAccountId] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(300);
  const [transferNotes, setTransferNotes] = useState<string>("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  // Car Wash Monthly Settlement (Оплата задолженности перед автомойкой по реестру раз в месяц)
  const [isSettleWashOpen, setIsSettleWashOpen] = useState<boolean>(false);
  const [settleWashAccountId, setSettleWashAccountId] = useState<string>("");
  const [isSubmittingWashSettlement, setIsSubmittingWashSettlement] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/executive/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.accounts && json.accounts.length > 0 && !expenseAccountId) {
          setExpenseAccountId(json.accounts[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAccountId || !expenseAmount || !expenseDesc) return;
    setIsSubmittingExpense(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: expenseAccountId,
          category: expenseCategory,
          amount: expenseAmount,
          currency: expenseCurrency,
          description: expenseDesc,
          managerName: expenseManager,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setIsAddExpenseOpen(false);
        setExpenseDesc("");
        await fetchAnalytics();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleTransferCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFromAccount?.id || !transferToAccountId || !transferAmount) return;
    setIsSubmittingTransfer(true);
    try {
      const res = await fetch("/api/executive/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "TRANSFER_CASH",
          fromAccountId: transferFromAccount.id,
          toAccountId: transferToAccountId,
          amount: transferAmount,
          notes: transferNotes,
          managerName: transferFromAccount.managerName || "Менеджер",
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setIsTransferOpen(false);
        setTransferNotes("");
        await fetchAnalytics();
      } else {
        alert(resData.error || "Ошибка проведения инкассации");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сети при проведении инкассации");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleSettleWash = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWashSettlement(true);
    try {
      const res = await fetch("/api/executive/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SETTLE_MONTHLY_WASH",
          toAccountId: settleWashAccountId || undefined,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        setIsSettleWashOpen(false);
        alert(resData.message || "Расчёт с автомойкой успешно закрыт!");
        await fetchAnalytics();
      } else {
        alert(resData.error || "Ошибка закрытия расчёта с автомойкой");
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка сети при закрытии расчётов");
    } finally {
      setIsSubmittingWashSettlement(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCcw className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-white text-base">Загрузка сводки руководителя и мультикасс...</p>
      </div>
    );
  }

  const {
    kpi,
    washSummary,
    balances,
    accounts,
    managerCashAccounts,
    managerCashByCity,
    companyBankAccounts,
    revenueByCategory,
    revenueByCity,
    expensesByCategory,
    dailyInflow,
    recentExpenses,
  } = data;

  const categoryLabels: Record<string, string> = {
    WASHING: "🧼 Мойка авто (расчёт раз в месяц)",
    FUEL: "⛽ Топливо и заправка",
    MAINTENANCE: "🔧 ТО и запчасти",
    SALARY: "💼 Зарплаты персонала",
    OFFICE_RENT: "🏢 Аренда офисов",
    PARKING_FINES: "🚨 Штрафы и парковки",
    MARKETING: "📣 Реклама и маркетинг",
    OTHER: "📦 Прочие расходы",
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Кабинет Владельца / Руководителя
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Обновлено только что
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            Управленческий учёт, Выручка & Мультикасса Грузии
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Раздельный учёт касс нескольких менеджеров по городам, расчётные счета Bank of Georgia, TBC, Credo и расходы
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Внести расход компании</span>
          </button>

          <button
            onClick={fetchAnalytics}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Sheets Backup & Live Reporting */}
      <GoogleSheetsBackupBanner onSyncComplete={fetchAnalytics} />

      {/* Subtab Navigation: Finance vs Tasks */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setExecutiveTab("finance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            executiveTab === "finance"
              ? "bg-amber-500 text-slate-950 shadow font-black"
              : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>💰 Финансовая сводка & Мультикасса</span>
        </button>

        <button
          onClick={() => setExecutiveTab("tasks")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            executiveTab === "tasks"
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg font-black"
              : "text-indigo-300 hover:text-white bg-indigo-950/40 border border-indigo-500/30"
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>📋 Постановка задач менеджерам</span>
        </button>
      </div>

      {executiveTab === "tasks" ? (
        <ManagerTasksSection role="EXECUTIVE" onRefreshParent={fetchAnalytics} />
      ) : (
        <>
          {/* KPI Cards (Сегодня vs Вчера vs Всего) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue Today */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Выручка Сегодня:</span>
                <span className="flex items-center text-emerald-400 text-xs font-bold">
                  <ArrowUpRight className="w-3.5 h-3.5" /> +{kpi.revenueTodayUSD} ₾
                </span>
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono mt-1">
                {kpi.revenueTodayUSD} <span className="text-sm font-normal text-slate-400">GEL (₾)</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                <span>Вчера выручка:</span>
                <span className="font-bold text-white font-mono">{kpi.revenueYesterdayUSD} ₾</span>
              </div>
            </div>

            {/* Expenses Today */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
                <span>Расходы Сегодня:</span>
                <span className="flex items-center text-rose-400 text-xs font-bold">
                  <ArrowDownRight className="w-3.5 h-3.5" /> {kpi.expensesTodayGEL} ₾
                </span>
              </div>
              <div className="text-3xl font-black text-rose-400 font-mono mt-1">
                {kpi.expensesTodayGEL} <span className="text-sm font-normal text-slate-400">GEL (₾)</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
                <span>Вчера расходы:</span>
                <span className="font-bold text-white font-mono">{kpi.expensesYesterdayGEL} ₾</span>
              </div>
            </div>

            {/* Total Period Revenue */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-slate-400 text-xs font-semibold block">Всего выручка (Период):</span>
              <div className="text-3xl font-black text-white font-mono mt-1">
                {kpi.revenueTotalUSD} ₾
              </div>
              <div className="flex justify-between text-[11px] text-emerald-400 font-medium mt-2 pt-2 border-t border-slate-800/80">
                <span>Расчетная прибыль:</span>
                <span className="font-bold font-mono">+{kpi.netProfitEstimateUSD} ₾ (GEL)</span>
              </div>
            </div>

            {/* Total Cash in managers hands */}
            <div className="bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 p-5 rounded-2xl">
              <div className="flex justify-between items-center text-xs text-emerald-400 font-bold uppercase tracking-wider">
                <span>В кассах менеджеров:</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
                {kpi.totalManagerCashGEL || balances.totalCashUSD} ₾
              </div>
              <div className="flex justify-between text-[11px] text-slate-300 mt-2 pt-2 border-t border-slate-800/80">
                <span>На счетах в банках:</span>
                <span className="font-bold text-white font-mono">{balances.totalBankGEL} ₾ (GEL)</span>
              </div>
            </div>
          </div>

          {/* 1. НАЛИЧНЫЕ КАССЫ МЕНЕДЖЕРОВ ПО ГОРОДАМ (ДЕЦЕНТРАЛИЗОВАННЫЙ УЧЕТ) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black px-2.5 py-0.5 rounded uppercase">
                    Децентрализованная касса
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Несколько менеджеров в городе = у каждого своя персональная касса
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1 flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-amber-400" />
                  <span>Наличные кассы менеджеров по городам</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3 bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                <span className="text-xs text-slate-400">Всего у менеджеров на руках:</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  {kpi.totalManagerCashGEL} ₾
                </span>
              </div>
            </div>

            {/* City Groups */}
            <div className="space-y-6">
              {[
                { city: "Батуми", code: "BUS", icon: "🌊", desc: "Филиал Батуми (Аэропорт & Офис)" },
                { city: "Тбилиси", code: "TBS", icon: "🏛️", desc: "Филиал Тбилиси (Аэропорт & Центр)" },
                { city: "Кутаиси", code: "KUT", icon: "🌿", desc: "Филиал Кутаиси (Аэропорт Копитнари)" },
              ].map((grp) => {
                const accountsInCity = managerCashByCity?.[grp.city] || [];
                const cityCashSum = accountsInCity.reduce((sum: number, a: any) => sum + (a.currentBalance || 0), 0);

                return (
                  <div key={grp.code} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{grp.icon}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white flex items-center space-x-2">
                            <span>{grp.city}</span>
                            <span className="text-[11px] text-slate-500 font-normal">({accountsInCity.length} менеджера с кассами)</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">{grp.desc}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Остаток по городу:</span>
                        <span className="font-mono font-black text-amber-400 text-sm">
                          {cityCashSum} ₾ (GEL)
                        </span>
                      </div>
                    </div>

                    {/* Manager Cards in this city */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                      {accountsInCity.map((acc: any) => (
                        <div
                          key={acc.id}
                          className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 space-y-2.5 transition shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-300">
                                💵
                              </div>
                              <div>
                                <h5 className="font-bold text-white text-xs leading-tight">
                                  {acc.managerName}
                                </h5>
                                <span className="text-[10px] text-slate-400 font-mono block">
                                  {acc.name}
                                </span>
                              </div>
                            </div>
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[9px] px-1.5 py-0.5 rounded font-black">
                              Активна
                            </span>
                          </div>

                          {/* Balance Display */}
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-baseline">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Остаток на руках:</span>
                            <span className="font-mono font-black text-emerald-400 text-base">
                              {acc.currentBalance} ₾
                            </span>
                          </div>

                          {/* Activity: Today In / Out */}
                          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 font-mono">
                            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                              <span className="block text-slate-500">Принято сегодня:</span>
                              <span className="font-bold text-white">+{acc.todayIncome || 0} ₾</span>
                            </div>
                            <div className="bg-slate-950/80 p-1.5 rounded border border-slate-800/80">
                              <span className="block text-slate-500">Расходы сегодня:</span>
                              <span className="font-bold text-rose-400">-{acc.todayExpense || 0} ₾</span>
                            </div>
                          </div>

                          {/* Action Button: Cash Collection / Transfer to Bank */}
                          <button
                            onClick={() => {
                              setTransferFromAccount(acc);
                              setTransferAmount(Math.min(acc.currentBalance, 500) || 100);
                              const defaultTarget = companyBankAccounts?.[0]?.id || "";
                              setTransferToAccountId(defaultTarget);
                              setIsTransferOpen(true);
                            }}
                            className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1.5 active:scale-95"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                            <span>Инкассация / Сдать в банк</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. РАСЧЕТНЫЕ БАНКОВСКИЕ СЧЕТА И КРИПТА КОМПАНИИ */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Landmark className="w-5 h-5 text-indigo-400" />
                  <span>Банковские расчетные счета компании & Криптокошелек</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Официальные счета для безналичных оплат клиентов, депозитов и приема инкассаций
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {companyBankAccounts.map((acc: any) => {
                const isCrypto = acc.type === "CRYPTO_WALLET";

                return (
                  <div
                    key={acc.id}
                    className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {isCrypto ? "💎 Крипта" : `🏦 ${acc.bankName} Bank`}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {acc.currency}
                        </span>
                      </div>

                      <h4 className="font-bold text-white text-sm leading-tight">
                        {acc.name}
                      </h4>

                      {acc.accountNumber && (
                        <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate">
                          {acc.accountNumber}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-400">Остаток:</span>
                      <span className="text-xl font-black text-amber-400 font-mono">
                        {acc.currency === "GEL" ? `${acc.currentBalance} ₾` : `$${acc.currentBalance}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue Structure vs Expenses Structure */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Structure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Структура выручки (по городам и типам)</span>
              </h3>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  По городам проката:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(revenueByCity).map(([city, amt]) => (
                    <div key={city} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">{city}</span>
                      <span className="font-mono font-black text-amber-400 text-base mt-1 block">
                        {Number(amt)} ₾
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                    По категориям дохода:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Аренда авто:</span>
                      <span className="font-mono font-bold text-emerald-400">{revenueByCategory.RENTAL || 0} ₾</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Доставка авто:</span>
                      <span className="font-mono font-bold text-cyan-400">{revenueByCategory.DELIVERY || 0} ₾</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Доп. услуги:</span>
                      <span className="font-mono font-bold text-purple-400">{revenueByCategory.EXTRA || 0} ₾</span>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                      <span className="text-slate-400">Залоги (депозиты):</span>
                      <span className="font-mono font-bold text-amber-300">{revenueByCategory.DEPOSIT || 0} ₾</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expenses Structure */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
                <TrendingDown className="w-5 h-5 text-rose-400" />
                <span>Структура расходов компании (GEL ₾)</span>
              </h3>

              <div className="space-y-2">
                {Object.entries(expensesByCategory).map(([cat, amt]) => {
                  const numAmt = Number(amt) || 0;
                  const total = kpi.expensesTotalGEL || 1;
                  const perc = Math.round((numAmt / total) * 100);

                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">{categoryLabels[cat] || cat}</span>
                        <span className="font-mono font-bold text-white">
                          {numAmt} ₾ ({perc}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-rose-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(perc, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Car Wash Monthly Accruals & Settlement Card */}
            <div className="bg-gradient-to-br from-slate-900 via-cyan-950/20 to-slate-900 border border-cyan-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Ежемесячный реестр расчётов с автомойкой
                    </h3>
                    <p className="text-xs text-slate-400">
                      Мойки начисляются автоматически при выдаче и приёмке, оплата производится раз в месяц
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-300 border border-cyan-500/30 self-start sm:self-auto">
                  Тариф партнера: 20 ₾ полная / 10 ₾ кузов
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Начислено за период:</span>
                  <div className="text-xl font-black text-white font-mono">
                    {washSummary?.totalAccruedGEL || 0} ₾
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Всего зафиксировано: {washSummary?.totalCount || 0} моек
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-cyan-500/40 space-y-1">
                  <span className="text-[10px] text-cyan-400 block uppercase font-bold">К оплате (задолженность):</span>
                  <div className="text-xl font-black text-cyan-300 font-mono">
                    {washSummary?.pendingSettlementGEL || 0} ₾
                  </div>
                  <span className="text-[10px] text-amber-400/90 block">
                    {washSummary?.pendingCount || 0} моек ожидает закрытия
                  </span>
                </div>

                <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Оплачено ранее:</span>
                  <div className="text-xl font-black text-emerald-400 font-mono">
                    {washSummary?.settledGEL || 0} ₾
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Закрытые реестры
                  </span>
                </div>
              </div>

              {(washSummary?.pendingSettlementGEL || 0) > 0 ? (
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-950/40 p-3 rounded-xl border border-cyan-500/30">
                  <span className="text-xs text-slate-300">
                    Начислено к ежемесячному расчету: <strong className="text-white font-mono">{washSummary?.pendingSettlementGEL} ₾</strong>. Вы можете оплатить реестр с расчетного счета компании.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultBank = companyBankAccounts?.[0]?.id || "";
                      setSettleWashAccountId(defaultBank);
                      setIsSettleWashOpen(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-950 flex items-center justify-center space-x-1.5 whitespace-nowrap active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Закрыть реестр & Оплатить автомойке</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-400 flex items-center space-x-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Все начисления за мойку закрыты и оплачены по реестру. Задолженность отсутствует.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL: CASH COLLECTION / TRANSFER (ИНКАССАЦИЯ ИЗ КАССЫ МЕНЕДЖЕРА В БАНК) */}
      {isTransferOpen && transferFromAccount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-600 flex items-center justify-center shadow">
                  <ArrowRightLeft className="w-5 h-5 text-slate-950 font-black" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Инкассация кассы менеджера
                  </h3>
                  <span className="text-xs text-slate-400">
                    Передача наличных в банк или главную кассу
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsTransferOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransferCash} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Касса списания (Менеджер):</span>
                <span className="font-bold text-white block text-sm">
                  {transferFromAccount.name}
                </span>
                <span className="text-emerald-400 font-mono font-bold block text-xs">
                  Текущий остаток в кассе: {transferFromAccount.currentBalance} ₾ (GEL)
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Куда передаются средства (Целевой счёт / Банк):
                </label>
                <select
                  value={transferToAccountId}
                  onChange={(e) => setTransferToAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- Выберите расчетный счет или банк --</option>
                  {companyBankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} • {acc.currency} (Остаток: {acc.currentBalance})
                    </option>
                  ))}
                  {managerCashAccounts
                    .filter((a: any) => a.id !== transferFromAccount.id)
                    .map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        💵 Передача менеджеру: {acc.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Сумма инкассации (₾ GEL):
                </label>
                <input
                  type="number"
                  min="1"
                  max={transferFromAccount.currentBalance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-emerald-400 font-mono font-black text-xl focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Примечание / Номер инкассационной квитанции:
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Взнос выручки за смену в терминал BOG / передача старшему менеджеру..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-black shadow-lg transition"
                >
                  {isSubmittingTransfer ? "Инкассация..." : "Подтвердить инкассацию"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD EXPENSE */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <h3 className="font-extrabold text-base text-white">Внести расход компании</h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Account */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  С какой кассы / счета списать:
                </label>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <optgroup label="💵 Кассы менеджеров по городам">
                    {managerCashAccounts?.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Остаток: {acc.currentBalance} ₾)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🏦 Банковские счета компании">
                    {companyBankAccounts?.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">Категория расхода:</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="FUEL">⛽ Топливо и заправка</option>
                  <option value="WASHING">🧼 Мойка автомобилей</option>
                  <option value="MAINTENANCE">🔧 ТО и запчасти</option>
                  <option value="SALARY">💼 Зарплата / Аванс</option>
                  <option value="OFFICE_RENT">🏢 Аренда офиса / Связь</option>
                  <option value="PARKING_FINES">🚨 Штрафы и парковки</option>
                  <option value="MARKETING">📣 Маркетинг и реклама</option>
                  <option value="OTHER">📦 Прочие расходы</option>
                </select>
              </div>

              {/* Amount & Currency */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Сумма:</label>
                  <input
                    type="number"
                    min="1"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Валюта:</label>
                  <select
                    value={expenseCurrency}
                    onChange={(e) => setExpenseCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="GEL">GEL (Лари ₾)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Назначение платежа / Описание:
                </label>
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Например: Заправка Toyota RAV4, чек Wissol"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Manager */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Кто провел расход (Менеджер / Руководитель):
                </label>
                <input
                  type="text"
                  value={expenseManager}
                  onChange={(e) => setExpenseManager(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExpense}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingExpense ? "Списание..." : "Провести расход"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE MONTHLY CAR WASH BILL */}
      {isSettleWashOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-4 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm -mx-1 px-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow">
                  <Sparkles className="w-5 h-5 text-white font-black" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Оплата счёта автомойки
                  </h3>
                  <span className="text-xs text-slate-400">
                    Закрытие ежемесячного реестра
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSettleWashOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleWash} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Сумма к оплате по реестру:</span>
                <span className="font-mono font-black text-cyan-300 block text-2xl">
                  {washSummary?.pendingSettlementGEL || 0} ₾ (GEL)
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Количество моек в реестре: <strong>{washSummary?.pendingCount || 0} шт.</strong>
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Счёт компании для списания средств (Банк / Касса):
                </label>
                <select
                  value={settleWashAccountId}
                  onChange={(e) => setSettleWashAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-cyan-500"
                  required
                >
                  <option value="">-- Выберите расчетный счёт --</option>
                  {companyBankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName || acc.type}) — Остаток: {acc.currentBalance} {acc.currency}
                    </option>
                  ))}
                  {accounts.filter((a: any) => a.type === "CASH").map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — Остаток: {acc.currentBalance} {acc.currency}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                ℹ️ После подтверждения все открытые мойки будут помечены как оплаченные, а с выбранного счета спишется итоговая сумма.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettleWashOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWashSettlement}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold transition shadow-lg disabled:opacity-50"
                >
                  {isSubmittingWashSettlement ? "Проведение..." : "Подтвердить оплату"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
