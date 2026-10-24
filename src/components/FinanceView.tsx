import React, { useEffect, useState } from "react";
import { DollarSign, Landmark, CreditCard, Coins, CheckCircle, ArrowDownRight, RefreshCcw } from "lucide-react";

export const FinanceView: React.FC = () => {
  const [financeData, setFinanceData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchFinance = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance");
      const data = await res.json();
      if (data.success) {
        setFinanceData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <RefreshCcw className="w-8 h-8 animate-spin mx-auto mb-2 text-amber-400" />
        <p>Загрузка кассы смены...</p>
      </div>
    );
  }

  const summary = financeData?.summary || {};
  const payments = financeData?.payments || [];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <span>Финансовый отчёт и касса менеджера</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Все платежи за аренду, полученные залоги и учет сдачи при возврате авто
          </p>
        </div>
        <button
          onClick={fetchFinance}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
        >
          <RefreshCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Поступления за аренду:
          </span>
          <div className="text-3xl font-black text-amber-400 font-mono mt-1">
            ${summary.totalUSD || 0}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            + {summary.totalGEL || 0} GEL
          </span>
        </div>

        {/* Deposits Held */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Депозиты (Залоги на удержании):
          </span>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-1">
            ${summary.depositsUSD || 0}
          </div>
          <span className="text-xs text-emerald-500/80 mt-1 block">
            Подлежат возврату при приёмке авто
          </span>
        </div>

        {/* Change on Return */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
            Сдача к возврату клиентам:
          </span>
          <div className="text-3xl font-black text-rose-400 font-mono mt-1">
            ${summary.pendingRefundsUSD || 0}
          </div>
          <span className="text-xs text-rose-400/80 mt-1 block">
            Сумма сдачи при возврате машины
          </span>
        </div>
      </div>

      {/* Breakdown by Payment Channels */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider text-slate-300">
          Разбивка по каналам оплат:
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">💵 Наличные</span>
            <span className="text-base font-bold text-white font-mono">
              ${summary.byMethod?.CASH || 0}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">💳 Терминал</span>
            <span className="text-base font-bold text-white font-mono">
              ${summary.byMethod?.CARD_POS || 0}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">🏦 Bank of Georgia</span>
            <span className="text-base font-bold text-amber-400 font-mono">
              ${summary.byMethod?.BOG_BANK || 0}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">🏦 TBC Bank</span>
            <span className="text-base font-bold text-blue-400 font-mono">
              ${summary.byMethod?.TBC_BANK || 0}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">🏦 Credo Bank</span>
            <span className="text-base font-bold text-red-400 font-mono">
              ${summary.byMethod?.CREDO_BANK || 0}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">💎 Крипто (USDT)</span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              ${summary.byMethod?.CRYPTO || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base">
          Журнал финансовых операций по выдачам
        </h3>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Транзакций пока нет. Проведите выдачу авто через вкладку «План выдач», чтобы появилась первая проводка.
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
                {payments.map((p: any) => (
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
                      {p.booking?.customer?.fullName}
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
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {p.method}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-400 text-sm">
                      ${p.amount} {p.currency}
                    </td>
                    <td className="py-3 px-4">
                      {p.changeOnReturn && p.changeOnReturn > 0 ? (
                        <span className="text-rose-400 font-mono font-bold">
                          ${p.changeOnReturn} {p.currency}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
