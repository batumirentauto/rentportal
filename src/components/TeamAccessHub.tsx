import React, { useState, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  Shield,
  Briefcase,
  Car,
  Wrench,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Edit3,
  RefreshCw,
  Phone,
  Send,
  Building2,
  X,
  Search,
  Check,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface TeamUser {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  telegram?: string;
  role: "EXECUTIVE" | "MANAGER" | "OWNER" | "TECHNICIAN" | string;
  status: string;
  cityName: string;
  cityCode: string;
  cityId?: string;
  ownerId?: string;
  ownerName?: string;
  carsCount: number;
  cars: string[];
  createdAt: string;
}

interface TeamAccessHubProps {
  onSwitchToOwner?: (ownerId: string) => void;
  onSwitchToRoleTab?: (tab: string) => void;
}

export const TeamAccessHub: React.FC<TeamAccessHubProps> = ({
  onSwitchToOwner,
  onSwitchToRoleTab,
}) => {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [owners, setOwners] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal: Add user
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>("");
  const [newPhone, setNewPhone] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newTelegram, setNewTelegram] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("MANAGER");
  const [newCityId, setNewCityId] = useState<string>("");
  const [newOwnerId, setNewOwnerId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active Simulated Persona
  const [simulatedPersona, setSimulatedPersona] = useState<string>("EXECUTIVE");

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
        setOwners(json.owners || []);
        setCities(json.cities || []);
      }
    } catch (e) {
      console.error("Error loading team:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newFullName,
          phone: newPhone,
          email: newEmail,
          telegram: newTelegram,
          role: newRole,
          cityId: newCityId || undefined,
          ownerId: newRole === "OWNER" ? newOwnerId || undefined : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddUserOpen(false);
        setNewFullName("");
        setNewPhone("");
        setNewEmail("");
        setNewTelegram("");
        await fetchTeamData();
      } else {
        alert(json.error || "Ошибка создания пользователя");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении пользователя");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Удалить доступ для «${name}»?`)) return;
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DELETE", userId }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchTeamData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const nextRole =
      currentRole === "MANAGER"
        ? "EXECUTIVE"
        : currentRole === "EXECUTIVE"
        ? "TECHNICIAN"
        : "MANAGER";
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "UPDATE_ROLE", userId, role: nextRole }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchTeamData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.cityName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "EXECUTIVE":
        return {
          label: "👔 Руководитель",
          bg: "bg-indigo-950 text-indigo-300 border-indigo-500/40",
          desc: "Полный доступ, кассы, отчеты",
        };
      case "MANAGER":
        return {
          label: "💼 Менеджер филиала",
          bg: "bg-blue-950 text-blue-300 border-blue-500/40",
          desc: "Выдача, возврат, мойки, касса смены",
        };
      case "OWNER":
        return {
          label: "🚗 Владелец авто (Инвестор)",
          bg: "bg-emerald-950 text-emerald-300 border-emerald-500/40",
          desc: "Личный кабинет, учет расходов и начислений",
        };
      case "TECHNICIAN":
        return {
          label: "🔧 Механик / СТО",
          bg: "bg-amber-950 text-amber-300 border-amber-500/40",
          desc: "Журнал ТО, мойки, подготовка авто",
        };
      default:
        return {
          label: role,
          bg: "bg-slate-800 text-slate-300 border-slate-700",
          desc: "Базовый доступ",
        };
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* 1. HEADER & SIMULATOR BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded shadow">
                  Team & Access Control Hub
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Личные кабинеты участников & Права доступа
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
                Команда, роли и личные кабинеты участников
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Добавить участника</span>
            </button>
            <button
              onClick={fetchTeamData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title="Обновить список"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. ROLE PERSONA SIMULATOR (ПЕРЕКЛЮЧЕНИЕ ТЕСТОВОГО РЕЖИМА) */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                Тестирование интерфейса от лица разных ролей (Role Persona Switcher):
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Нажмите, чтобы моментально переключить фокус системы на нужный личный кабинет
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Executive */}
            <button
              onClick={() => {
                setSimulatedPersona("EXECUTIVE");
                if (onSwitchToRoleTab) onSwitchToRoleTab("executive");
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center space-x-3 ${
                simulatedPersona === "EXECUTIVE"
                  ? "bg-indigo-950/70 border-indigo-500 shadow-md ring-1 ring-indigo-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-2xl">👔</span>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-xs text-white">Руководитель</span>
                  {simulatedPersona === "EXECUTIVE" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Кабинет руководителя & Мультикасса
                </span>
              </div>
            </button>

            {/* Manager */}
            <button
              onClick={() => {
                setSimulatedPersona("MANAGER");
                if (onSwitchToRoleTab) onSwitchToRoleTab("handover");
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center space-x-3 ${
                simulatedPersona === "MANAGER"
                  ? "bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-2xl">💼</span>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-xs text-white">Менеджер выдачи</span>
                  {simulatedPersona === "MANAGER" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  План выдач, прием, мойки 20/10₾
                </span>
              </div>
            </button>

            {/* Car Owner */}
            <button
              onClick={() => {
                setSimulatedPersona("OWNER");
                if (onSwitchToRoleTab) onSwitchToRoleTab("owners");
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center space-x-3 ${
                simulatedPersona === "OWNER"
                  ? "bg-emerald-950/70 border-emerald-500 shadow-md ring-1 ring-emerald-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-2xl">🚗</span>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-xs text-white">Владелец авто</span>
                  {simulatedPersona === "OWNER" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Личный кабинет, учет ТО и начислений
                </span>
              </div>
            </button>

            {/* Technician */}
            <button
              onClick={() => {
                setSimulatedPersona("TECHNICIAN");
                if (onSwitchToRoleTab) onSwitchToRoleTab("maintenance");
              }}
              className={`p-3 rounded-xl border text-left transition flex items-center space-x-3 ${
                simulatedPersona === "TECHNICIAN"
                  ? "bg-amber-950/70 border-amber-500 shadow-md ring-1 ring-amber-500"
                  : "bg-slate-900 border-slate-800 hover:border-slate-700"
              }`}
            >
              <span className="text-2xl">🔧</span>
              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-xs text-white">Механик / Техник</span>
                  {simulatedPersona === "TECHNICIAN" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Журнал ТО, масло, готовность авто
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. ROLE ACCESS MATRIX SUMMARY (ТАБЛИЦА ПРАВ И ВОЗМОЖНОСТЕЙ) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
            <span>👔 Руководитель</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Видит все 3 филиала (Батуми, Тбилиси, Кутаиси), мультикассу, все финансовые отчеты, может управлять тарифами и подтверждать выплаты владельцам.
          </p>
          <div className="text-[11px] text-indigo-300 font-mono bg-indigo-950/40 p-2 rounded-lg border border-indigo-500/20">
            ✓ Кабинет Руководителя<br />
            ✓ Отчеты и Мультикасса<br />
            ✓ Управление доступом
          </div>
        </div>

        <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
            <span>💼 Менеджер филиала</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ведет операционную работу: план выдач, прием авто, отметки о мойке (20 ₾ полная / 10 ₾ кузов), касса смены и быстрая запись операционных расходов.
          </p>
          <div className="text-[11px] text-blue-300 font-mono bg-blue-950/40 p-2 rounded-lg border border-blue-500/20">
            ✓ Шахматка & Выдачи<br />
            ✓ Учет моек (20/10 ₾)<br />
            ✓ Касса текущей смены
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
            <span>🚗 Владелец авто (Инвестор)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Изолированный личный кабинет: видит только свои автомобили, их статус, начисления посуточно, и ведет собственный учет расходов (ТО, КАСКО, резина) без Excel.
          </p>
          <div className="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/20">
            ✓ Изолированный доступ<br />
            ✓ Учет личных расходов на авто<br />
            ✓ Чистая прибыль инвестора
          </div>
        </div>

        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
            <span>🔧 Механик / СТО</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Сервисный блок: контроль пробегов до замены масла, журнал ТО и ремонтов, проверка техпаспортов и фиксация готовности автомобилей к поездке.
          </p>
          <div className="text-[11px] text-amber-300 font-mono bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
            ✓ Реестр ТО & Масло<br />
            ✓ Техпаспорта & Техосмотр<br />
            ✓ Мойка & Подготовка авто
          </div>
        </div>
      </div>

      {/* 4. TEAM DIRECTORY TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center space-x-3">
            <h3 className="font-extrabold text-base text-white">
              Реестр участников команды и владельцев ({filteredUsers.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Поиск по имени, тел, городу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Filter by Role */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">Все роли</option>
              <option value="EXECUTIVE">👔 Руководители</option>
              <option value="MANAGER">💼 Менеджеры</option>
              <option value="OWNER">🚗 Владельцы авто (Инвесторы)</option>
              <option value="TECHNICIAN">🔧 Механики</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-bold">Участник / Контакты</th>
                <th className="py-3 px-3 font-bold">Роль в системе</th>
                <th className="py-3 px-3 font-bold">Филиал / Город</th>
                <th className="py-3 px-3 font-bold">Автомобили в управлении</th>
                <th className="py-3 px-3 font-bold text-center">Статус</th>
                <th className="py-3 px-4 font-bold text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & Contacts */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center font-black text-white text-xs border border-slate-700">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {u.fullName}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {u.phone || "Без телефона"} {u.telegram && `• @${u.telegram}`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${roleBadge.bg}`}
                        >
                          {roleBadge.label}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {roleBadge.desc}
                        </span>
                      </td>

                      {/* City */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-300">
                          {u.cityName}
                        </span>
                      </td>

                      {/* Cars */}
                      <td className="py-3 px-3">
                        {u.role === "OWNER" ? (
                          u.carsCount > 0 ? (
                            <div>
                              <span className="font-bold text-emerald-400 font-mono">
                                {u.carsCount} авто
                              </span>
                              <span className="text-[10px] text-slate-400 block line-clamp-1 max-w-[200px]">
                                {u.cars.slice(0, 2).join(", ")}
                                {u.cars.length > 2 ? ` и еще ${u.cars.length - 2}` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Авто не привязаны</span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          ✓ Активен
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {u.role === "OWNER" && u.ownerId && onSwitchToOwner && (
                            <button
                              onClick={() => {
                                onSwitchToOwner(u.ownerId!);
                              }}
                              className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                              title="Войти в личный кабинет этого владельца"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Кабинет</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleUpdateRole(u.id, u.role)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                            title="Сменить роль"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id, u.fullName)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-red-400 rounded-lg transition"
                            title="Удалить доступ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL: ADD NEW USER */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Добавить участника команды
                  </h3>
                  <span className="text-xs text-slate-400">
                    Настройка доступа и создание личного кабинета
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  ФИО сотрудника или владельца:
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Георгий Беридзе / Давид..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Телефон (WhatsApp):
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+995 5..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Telegram username:
                  </label>
                  <input
                    type="text"
                    value={newTelegram}
                    onChange={(e) => setNewTelegram(e.target.value)}
                    placeholder="@username"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Назначаемая роль:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "EXECUTIVE", label: "👔 Руководитель", desc: "Все города, мультикасса" },
                    { id: "MANAGER", label: "💼 Менеджер филиала", desc: "Выдача, возврат, мойки" },
                    { id: "OWNER", label: "🚗 Владелец авто", desc: "Личный кабинет инвестора" },
                    { id: "TECHNICIAN", label: "🔧 Механик / СТО", desc: "Журнал ТО и сервис" },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewRole(r.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        newRole === r.id
                          ? "bg-indigo-950/70 border-indigo-500 text-white shadow"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className="font-bold text-xs block text-slate-200">
                        {r.label}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {r.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* City or Owner linking */}
              {newRole === "OWNER" ? (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Привязать к существующему инвестору (реестр авто):
                  </label>
                  <select
                    value={newOwnerId}
                    onChange={(e) => setNewOwnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Выберите профиль владельца --</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.fullName} ({o.carsCount} авто) • {o.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Основной филиал / Город работы:
                  </label>
                  <select
                    value={newCityId}
                    onChange={(e) => setNewCityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Все филиалы (Грузия)</option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameRu} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  {isSubmitting ? "Создание..." : "Создать участника"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
