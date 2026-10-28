import React from "react";
import { Car, Building2, Bell, RefreshCw, PlusCircle, CheckCircle2, Receipt, MessageSquare, Database } from "lucide-react";

interface HeaderProps {
  selectedCity: string;
  onSelectCity: (city: string) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onSimulateNewBooking: () => void;
  onOpenRecordExpense?: () => void;
  onOpenNewBooking?: () => void;
  onOpenBackup?: () => void;
  activeTab: "timeline" | "catalog" | "pricing" | "maintenance" | "handover" | "mobileapp" | "techpassports" | "owners" | "washing" | "finance" | "reports" | "executive" | "knowledge" | "crm" | "team" | "chats";
  setActiveTab: (tab: "timeline" | "catalog" | "pricing" | "maintenance" | "handover" | "mobileapp" | "techpassports" | "owners" | "washing" | "finance" | "reports" | "executive" | "knowledge" | "crm" | "team" | "chats") => void;
  isSimulating: boolean;
  userRole?: "EXECUTIVE" | "MANAGER" | "OWNER";
  onSwitchRole?: (role: "EXECUTIVE" | "MANAGER" | "OWNER") => void;
}

export const Header: React.FC<HeaderProps> = ({
  selectedCity,
  onSelectCity,
  unreadCount,
  onOpenNotifications,
  onSimulateNewBooking,
  onOpenRecordExpense,
  onOpenNewBooking,
  onOpenBackup,
  activeTab,
  setActiveTab,
  isSimulating,
  userRole = "EXECUTIVE",
  onSwitchRole,
}) => {
  React.useEffect(() => {
    const updateHeaderHeight = () => {
      const el = document.getElementById("main-app-header");
      if (el) {
        document.documentElement.style.setProperty("--app-header-height", `${el.offsetHeight}px`);
      }
    };
    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);
    return () => window.removeEventListener("resize", updateHeaderHeight);
  }, [selectedCity, activeTab]);

  return (
    <header id="main-app-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-lg">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 lg:gap-4 h-14 sm:h-20">
          {/* Logo & Subtitle - Hidden on mobile, visible on desktop */}
          <div className="hidden md:flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <span className="font-extrabold text-slate-950 text-sm sm:text-base">VSL</span>
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  Автопрокат
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden xl:block">
                Батуми • Тбилиси • Кутаиси | Рабочее место менеджера
              </p>
            </div>
          </div>

          {/* Desktop City Selector */}
          {userRole !== "OWNER" && (
            <div className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700 shrink-0">
              <button
                onClick={() => onSelectCity("ALL")}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  selectedCity === "ALL"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <span className="hidden xl:inline">Все города</span>
                <span className="xl:hidden">Все</span>
              </button>
              <button
                onClick={() => onSelectCity("TBS")}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  selectedCity === "TBS"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-amber-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>🏛️</span>
                <span>Тбилиси</span>
                <span className="hidden xl:inline text-[10px] opacity-75">(TBS)</span>
              </button>
              <button
                onClick={() => onSelectCity("BUS")}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  selectedCity === "BUS"
                    ? "bg-cyan-400 text-slate-950 font-bold shadow"
                    : "text-cyan-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>🌊</span>
                <span>Батуми</span>
                <span className="hidden xl:inline text-[10px] opacity-75">(BUS)</span>
              </button>
              <button
                onClick={() => onSelectCity("KUT")}
                className={`px-2 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 ${
                  selectedCity === "KUT"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow"
                    : "text-emerald-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>🌿</span>
                <span>Кутаиси</span>
                <span className="hidden xl:inline text-[10px] opacity-75">(KUT)</span>
              </button>
            </div>
          )}

          {/* Actions: New Booking, Record Expense, Chat, Backup, Notifications */}
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-1.5 sm:gap-2 shrink-0">
            {/* Real New Booking Button - Sticky in Header */}
            {userRole !== "OWNER" && (
              <button
                onClick={onOpenNewBooking}
                title="Создать новую бронь автомобиля"
                className="flex items-center space-x-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-black shadow-md border border-amber-300/40 shrink-0 active:scale-95 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-950" />
                <span>+ Бронь</span>
              </button>
            )}

            {/* Record Expense Button */}
            {userRole !== "OWNER" && (
              <button
                onClick={onOpenRecordExpense}
                title="Зафиксировать расход (топливо, мойка, ТО, парковка)"
                className="flex items-center space-x-1 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold shadow-md shrink-0 active:scale-95 transition-all"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Расход</span>
              </button>
            )}

            {/* Simulation button (desktop only on extra wide screens) */}
            {userRole !== "OWNER" && (
              <button
                onClick={onSimulateNewBooking}
                disabled={isSimulating}
                title="Тестовая эмуляция: появление новой брони в течение дня"
                className="hidden 2xl:flex items-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] px-2 py-1.5 rounded-lg font-medium border border-slate-700 transition-all active:scale-95 disabled:opacity-50 shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${isSimulating ? "animate-spin" : ""}`} />
                <span>{isSimulating ? "..." : "Тест"}</span>
              </button>
            )}

            {/* Team Chat Quick Launcher */}
            {userRole !== "OWNER" && (
              <button
                onClick={() => setActiveTab("chats")}
                className={`relative p-2 rounded-xl transition-colors shrink-0 ${
                  activeTab === "chats"
                    ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                }`}
                title="Внутренние чаты команды"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900 animate-pulse" />
              </button>
            )}

            {/* Database & Backup Button - hidden for manager */}
            {userRole !== "MANAGER" && onOpenBackup && (
              <button
                onClick={onOpenBackup}
                title="Сохранность данных, статус постоянного диска и бэкап базы данных"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-slate-700 transition-colors shadow-sm shrink-0"
              >
                <Database className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors shrink-0"
              title="Уведомления"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-600 text-[9px] sm:text-[10px] font-bold text-white ring-2 ring-slate-900 animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Role Persona Badge / Switcher */}
            <div className="flex items-center shrink-0">
              {userRole === "MANAGER" ? (
                <button
                  onClick={() => {
                    const pin = prompt("Введите PIN-код руководителя для входа в полный режим (по умолчанию 7777):");
                    if (pin === "7777" || pin === "admin") {
                      if (onSwitchRole) onSwitchRole("EXECUTIVE");
                    } else if (pin !== null) {
                      alert("Неверный PIN-код доступа");
                    }
                  }}
                  title="Режим менеджера выдачи (ограничен). Нажмите для входа руководителя"
                  className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl bg-blue-950/90 border border-blue-500/50 text-blue-300 hover:bg-blue-900/80 transition text-xs font-bold"
                >
                  <span>💼</span>
                  <span className="hidden sm:inline">Менеджер выдачи</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-mono">
                    Ограничен
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (confirm("Переключить интерфейс в режим 'Менеджер выдачи' (с ограниченными правами без VIP-приложения, инвесторов, руководства и отчетов)?")) {
                      if (onSwitchRole) onSwitchRole("MANAGER");
                    }
                  }}
                  title="Режим руководителя (полный доступ). Нажмите, чтобы протестировать режим менеджера"
                  className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/60 transition text-xs font-bold"
                >
                  <span>👔</span>
                  <span className="hidden sm:inline">Руководитель</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile City Selector (4-button grid: fits 100% on any screen without horizontal cutoff) */}
        {userRole !== "OWNER" && (
          <div className="md:hidden grid grid-cols-4 gap-1 py-1.5 border-t border-slate-800/80">
            <button
              onClick={() => onSelectCity("ALL")}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                selectedCity === "ALL"
                  ? "bg-amber-500 text-slate-950 shadow font-black"
                  : "bg-slate-800/90 text-slate-300 hover:text-white border border-slate-700/60"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => onSelectCity("TBS")}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-0.5 ${
                selectedCity === "TBS"
                  ? "bg-amber-500 text-slate-950 shadow font-black"
                  : "bg-slate-800/90 text-amber-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <span>🏛️</span>
              <span>Тбилиси</span>
            </button>
            <button
              onClick={() => onSelectCity("BUS")}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-0.5 ${
                selectedCity === "BUS"
                  ? "bg-cyan-400 text-slate-950 shadow font-black"
                  : "bg-slate-800/90 text-cyan-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <span>🌊</span>
              <span>Батуми</span>
            </button>
            <button
              onClick={() => onSelectCity("KUT")}
              className={`py-1 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center space-x-0.5 ${
                selectedCity === "KUT"
                  ? "bg-emerald-500 text-slate-950 shadow font-black"
                  : "bg-slate-800/90 text-emerald-300 hover:text-white border border-slate-700/60"
              }`}
            >
              <span>🌿</span>
              <span>Кутаиси</span>
            </button>
          </div>
        )}

        {/* Tab Navigation (Clean compact horizontal scroll with momentum) */}
        {userRole === "OWNER" ? (
          <div className="flex items-center justify-between pt-1 pb-2 border-t border-slate-800/60 mt-0.5">
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold flex items-center space-x-2">
              <span>💼</span>
              <span>Личный кабинет инвестора — Ваши автомобили, доходы и выплаты</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Доступ ограничен: только ваши автомобили
            </span>
          </div>
        ) : (
          <div className="flex space-x-1.5 pt-1 pb-2 overflow-x-auto no-scrollbar text-xs sm:text-sm border-t border-slate-800/60 mt-0.5">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "timeline"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-amber-400 hover:text-amber-300 hover:bg-slate-800/50 border border-amber-500/20"
              }`}
            >
              <span>📅 Шахматка</span>
              <span className="hidden sm:inline">занятости</span>
            </button>

            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "catalog"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg"
                  : "text-amber-400 hover:text-amber-300 hover:bg-slate-800/50 border border-amber-500/20"
              }`}
            >
              <span>🚗 Автопарк</span>
              <span className="hidden sm:inline">(Каталог)</span>
            </button>

            <button
              onClick={() => setActiveTab("pricing")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "pricing"
                  ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-slate-950 font-black shadow-lg"
                  : "text-amber-300 hover:text-white hover:bg-amber-950/40 border border-amber-500/40"
              }`}
            >
              <span>🏷️ Тарифы & Цены</span>
            </button>

            <button
              onClick={() => setActiveTab("handover")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "handover"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>📋 Выдачи</span>
              <span className="hidden sm:inline">(утро & день)</span>
            </button>

            {/* VIP Mobile App - hidden for manager */}
            {userRole !== "MANAGER" && (
              <button
                onClick={() => setActiveTab("mobileapp")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                  activeTab === "mobileapp"
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-black shadow-lg"
                    : "text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/30"
                }`}
              >
                <span>📱 VIP Приложение</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("techpassports")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "techpassports"
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-md font-black"
                  : "text-red-400 hover:text-red-300 hover:bg-slate-800/50 border border-red-500/20"
              }`}
            >
              <span>📑 Техпаспорта & Штрафы</span>
            </button>

            {/* Owners / Investors Cabinet - hidden for manager */}
            {userRole !== "MANAGER" && (
              <button
                onClick={() => setActiveTab("owners")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                  activeTab === "owners"
                    ? "bg-emerald-500 text-slate-950 font-black shadow-lg"
                    : "text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/50 border border-emerald-500/20"
                }`}
              >
                <span>💼 Кабинет инвесторов</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("crm")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "crm"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black shadow-lg"
                  : "text-purple-400 hover:text-purple-200 hover:bg-purple-950/40 border border-purple-500/30"
              }`}
            >
              <span>👥 Клиенты (CRM)</span>
            </button>

            <button
              onClick={() => setActiveTab("maintenance")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "maintenance"
                  ? "bg-gradient-to-r from-red-600 to-rose-600 text-white font-black shadow-lg"
                  : "text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-500/30"
              }`}
            >
              <span>🛠️ ТО & Сервис</span>
            </button>

            <button
              onClick={() => setActiveTab("washing")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "washing"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>🧼 Мойка</span>
            </button>

            <button
              onClick={() => setActiveTab("finance")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "finance"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <span>💰 Касса смены</span>
            </button>

            {/* Reports - hidden for manager */}
            {userRole !== "MANAGER" && (
              <button
                onClick={() => setActiveTab("reports")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                  activeTab === "reports"
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg"
                    : "text-amber-400 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/30"
                }`}
              >
                <span>📊 Отчетность</span>
              </button>
            )}

            {/* Executive - hidden for manager */}
            {userRole !== "MANAGER" && (
              <button
                onClick={() => setActiveTab("executive")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                  activeTab === "executive"
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-md"
                    : "text-indigo-400 hover:text-indigo-200 hover:bg-indigo-950/40 border border-indigo-500/20"
                }`}
              >
                <span>👔 Руководство</span>
              </button>
            )}

            {/* Team access management - hidden for manager */}
            {userRole !== "MANAGER" && (
              <button
                onClick={() => setActiveTab("team")}
                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                  activeTab === "team"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-lg"
                    : "text-purple-300 hover:text-white hover:bg-purple-950/40 border border-purple-500/30"
                }`}
              >
                <span>👥 Команда</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("chats")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "chats"
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black shadow-lg"
                  : "text-indigo-300 hover:text-white hover:bg-indigo-950/40 border border-indigo-500/30"
              }`}
            >
              <span>💬 Мессенджер</span>
            </button>

            <button
              onClick={() => setActiveTab("knowledge")}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg font-bold flex items-center space-x-1.5 whitespace-nowrap transition-all shrink-0 ${
                activeTab === "knowledge"
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg"
                  : "text-blue-300 hover:text-white hover:bg-blue-950/40 border border-blue-500/30"
              }`}
            >
              <span>📚 База знаний</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
