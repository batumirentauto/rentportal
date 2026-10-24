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
} from "lucide-react";
import { ManagerTasksSection } from "./ManagerTasksSection";

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

  if (loading || !data) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCcw className="w-10 h-10 animate-spin text-amber-500 mx-auto mb-3" />
        <p className="font-bold text-white text-base">Загрузка сводки руководителя и мультикасс...</p>
      </div>
    );
  }

  const { kpi, balances, accounts, revenueByCategory, revenueByCity, expensesByCategory, dailyInflow, recentExpenses } = data;

  const categoryLabels: Record<string, string> = {
    WASHING: "🧼 Мойка автомобилей",
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
            Сводка по филиалам (Тбилиси, Батуми, Кутаиси), кассам менеджеров, банковским счетам BOG, TBC, Credo и расходам
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

      {/* Subtab Navigation: Finance vs Tasks */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setExecutiveTab("finance")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            executiveTab === "finance"
              ? "bg-amber-500 text-slate-950 shadow"
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
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
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
              <ArrowUpRight className="w-3.5 h-3.5" /> +${kpi.revenueTodayUSD}
            </span>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1">
            ${kpi.revenueTodayUSD} <span className="text-sm font-normal text-slate-400">USD</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span>Вчера выручка:</span>
            <span className="font-bold text-white font-mono">${kpi.revenueYesterdayUSD}</span>
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
            {kpi.expensesTodayGEL} <span className="text-sm font-normal text-slate-400">GEL</span>
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
            ${kpi.revenueTotalUSD}
          </div>
          <div className="flex justify-between text-[11px] text-emerald-400 font-medium mt-2 pt-2 border-t border-slate-800/80">
            <span>Расчетная прибыль:</span>
            <span className="font-bold font-mono">+${kpi.netProfitEstimateUSD} USD</span>
          </div>
        </div>

        {/* Total Cash in hands */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-slate-400 text-xs font-semibold block">В наличных кассах:</span>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
            ${balances.totalCashUSD}
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/80">
            <span>На банковских счетах:</span>
            <span className="font-bold text-white font-mono">{balances.totalBankGEL} ₾ / ${balances.totalBankUSD}</span>
          </div>
        </div>
      </div>

      {/* MULTI-CASH & BANK ACCOUNTS (Мультикасса по городам и банкам) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-amber-400" />
              <span>Мультикасса & Счета компании (Остатки на сейчас)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Физические кассы менеджеров в филиалах, расчетные счета в банках Грузии и криптокошелек
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.map((acc: any) => {
            const isCash = acc.type === "CASH";
            const isCrypto = acc.type === "CRYPTO_WALLET";
            const isBank = acc.type === "BANK_ACCOUNT";

            return (
              <div
                key={acc.id}
                className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {isCash ? "💵 Касса Наличные" : isCrypto ? "💎 Крипта" : `🏦 ${acc.bankName} Bank`}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {acc.currency}
                    </span>
                  </div>

                  <h4 className="font-bold text-white text-sm leading-tight">
                    {acc.name}
                  </h4>

                  {acc.managerResponsible && (
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>{acc.managerResponsible}</span>
                    </div>
                  )}

                  {acc.accountNumber && (
                    <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate">
                      {acc.accountNumber}
                    </span>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-[11px] text-slate-400">Текущий остаток:</span>
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
            {Object.entries(revenueByCity).map(([city, amount]: any) => (
              <div key={city} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-200 font-semibold">{city}</span>
                  <span className="text-amber-400 font-mono font-bold">${amount} USD</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${kpi.revenueTotalUSD > 0 ? (amount / kpi.revenueTotalUSD) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              По видам услуг:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Аренда авто:</span>
                <span className="font-bold text-white font-mono">${revenueByCategory.RENTAL}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Доставка / Города:</span>
                <span className="font-bold text-white font-mono">${revenueByCategory.DELIVERY}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Доп. оборудование:</span>
                <span className="font-bold text-white font-mono">${revenueByCategory.EXTRA}</span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Залоги на удержании:</span>
                <span className="font-bold text-emerald-400 font-mono">${revenueByCategory.DEPOSIT}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses Structure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-rose-400" />
              <span>Структура расходов компании</span>
            </h3>
            <span className="text-xs text-rose-400 font-mono font-bold">
              Всего: {kpi.expensesTotalGEL} ₾
            </span>
          </div>

          <div className="space-y-2.5">
            {Object.entries(expensesByCategory).map(([catKey, amount]: any) => {
              if (amount === 0) return null;
              const perc = kpi.expensesTotalGEL > 0 ? Math.round((amount / kpi.expensesTotalGEL) * 100) : 0;
              return (
                <div key={catKey} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      {categoryLabels[catKey] || catKey}
                    </span>
                    <span className="text-[10px] text-slate-400">{perc}% от общих затрат</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-rose-400">
                    {amount} ₾
                  </span>
                </div>
              );
            })}
          </div>

          {/* Recent Expenses List */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Последние списания:
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs">
              {recentExpenses.map((e: any) => (
                <div key={e.id} className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/50 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="font-semibold text-slate-200 block">{e.description}</span>
                    <span className="text-[10px] text-slate-400">Счёт: {e.account?.name} • {e.managerName}</span>
                  </div>
                  <span className="font-mono font-bold text-rose-400 whitespace-nowrap ml-2">
                    -{e.amount} {e.currency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Day by Day Inflow (История кассы по дням: сколько вчера, сколько сегодня) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-extrabold text-base text-white flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-amber-400" />
          <span>Динамика сбора кассы по дням (Сколько поступило вчера, сегодня...)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {dailyInflow.map((day: any) => (
            <div
              key={day.date}
              className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center space-y-1"
            >
              <span className="text-[11px] font-bold text-slate-400 block">{day.date}</span>
              <div className="text-lg font-black text-amber-400 font-mono">
                ${day.amountUSD}
              </div>
              <span className="text-[10px] text-slate-500 block">
                {day.count} {day.count === 1 ? "выдача" : "выдач"}
              </span>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {/* Modal: Add Expense */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>Внести расход компании</span>
              </h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              {/* Account Selection */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Списать с кассы / счета:
                </label>
                <select
                  value={expenseAccountId}
                  onChange={(e) => setExpenseAccountId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Остаток: {a.currency === "GEL" ? `${a.currentBalance} ₾` : `$${a.currentBalance}`})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Категория расхода:
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="WASHING">🧼 Мойка автомобиля</option>
                  <option value="FUEL">⛽ Топливо / Заправка</option>
                  <option value="MAINTENANCE">🔧 ТО, масло, запчасти, шины</option>
                  <option value="OFFICE_RENT">🏢 Аренда офиса / стоянки</option>
                  <option value="SALARY">💼 Зарплата менеджера / перегонщика</option>
                  <option value="PARKING_FINES">🚨 Штрафы / муниципальная парковка</option>
                  <option value="MARKETING">📣 Реклама и продвижение</option>
                  <option value="OTHER">📦 Прочие операционные расходы</option>
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
    </div>
  );
};
