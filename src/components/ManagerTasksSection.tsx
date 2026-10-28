import React, { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlusCircle,
  X,
  Check,
  Car,
  User,
  MapPin,
  Calendar,
  FileText,
  Filter,
  Trash2,
  Eye,
  Send,
  Sparkles,
  Flame,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export interface ManagerTaskItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  assignedToName?: string | null;
  cityId?: string | null;
  city?: { id: string; nameRu: string; code: string } | null;
  carId?: string | null;
  car?: {
    id: string;
    brand: string;
    model: string;
    plateNumber: string;
    city: { nameRu: string; code: string };
  } | null;
  dueDateTime?: string | null;
  createdByName: string;
  completedByName?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  verifiedAt?: string | null;
  verifiedByName?: string | null;
  createdAt: string;
}

interface ManagerTasksSectionProps {
  role?: "EXECUTIVE" | "MANAGER";
  selectedCity?: string;
  onRefreshParent?: () => void;
}

export const ManagerTasksSection: React.FC<ManagerTasksSectionProps> = ({
  role = "EXECUTIVE",
  selectedCity = "ALL",
  onRefreshParent,
}) => {
  const [tasks, setTasks] = useState<ManagerTaskItem[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Create Task Modal state (for Executive)
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [cars, setCars] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  // Form Fields
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<string>("RELOCATION");
  const [priority, setPriority] = useState<string>("HIGH");
  const [assignedToName, setAssignedToName] = useState<string>("Менеджер смены");
  const [taskCityId, setTaskCityId] = useState<string>("");
  const [taskCarId, setTaskCarId] = useState<string>("");
  const [dueDateTime, setDueDateTime] = useState<string>("");
  const [createdByName, setCreatedByName] = useState<string>("Руководитель");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Complete Task Modal state (for Manager)
  const [completingTask, setCompletingTask] = useState<ManagerTaskItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  const [managerName, setManagerName] = useState<string>("Менеджер смены");
  const [isSubmittingComplete, setIsSubmittingComplete] = useState<boolean>(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const cityParam = selectedCity && selectedCity !== "ALL" ? `city=${selectedCity}` : "";
      const res = await fetch(`/api/tasks?${cityParam}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
        setSummary(data.summary);
      }
    } catch (e) {
      console.error("Error loading tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  // Load cars and cities for creation form
  useEffect(() => {
    const loadFleet = async () => {
      try {
        const res = await fetch("/api/fleet/timeline?days=1");
        const data = await res.json();
        if (data.success && data.cars) {
          setCars(data.cars);
          // Extract cities
          const cityMap = new Map();
          data.cars.forEach((c: any) => {
            if (c.city) cityMap.set(c.city.id, c.city);
          });
          setCities(Array.from(cityMap.values()));
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchTasks();
    if (role === "EXECUTIVE") {
      loadFleet();
    }
  }, [selectedCity, role]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          assignedToName,
          cityId: taskCityId || undefined,
          carId: taskCarId || undefined,
          dueDateTime: dueDateTime || undefined,
          createdByName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsCreateOpen(false);
        setTitle("");
        setDescription("");
        setTaskCarId("");
        setDueDateTime("");
        await fetchTasks();
        if (onRefreshParent) onRefreshParent();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось поставить задачу менеджеру");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (taskId: string, action: "ACCEPT" | "COMPLETE" | "VERIFY" | "CANCEL", payload?: any) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
        if (onRefreshParent) onRefreshParent();
      } else {
        alert("Ошибка: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Ошибка при обновлении задачи");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Вы уверены, что хотите удалить эту задачу?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        await fetchTasks();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchCategory = categoryFilter === "ALL" || t.category === categoryFilter;
      return matchStatus && matchCategory;
    });
  }, [tasks, statusFilter, categoryFilter]);

  const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
    RELOCATION: { label: "🚗 Перегон авто", icon: "🚗", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
    MAINTENANCE: { label: "🛠️ Сервис / ТО", icon: "🛠️", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
    DOCUMENTS: { label: "📑 Техосмотр / Страховка", icon: "📑", color: "text-blue-400 border-blue-500/30 bg-blue-500/10" },
    CLIENT_DELIVERY: { label: "👥 Встреча / Доставка", icon: "👥", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
    CLEANING: { label: "🧼 Мойка / Детейлинг", icon: "🧼", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
    FINANCE: { label: "💰 Финансы / Штрафы", icon: "💰", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
    GENERAL: { label: "📝 Поручение", icon: "📝", color: "text-slate-300 border-slate-700 bg-slate-800/40" },
  };

  const priorityLabels: Record<string, { label: string; badge: string }> = {
    URGENT: { label: "🔴 СРОЧНО", badge: "bg-red-600 text-white animate-pulse shadow-red-900/50" },
    HIGH: { label: "🟡 Высокий", badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40" },
    MEDIUM: { label: "🟢 Обычный", badge: "bg-slate-800 text-slate-300 border border-slate-700" },
    LOW: { label: "⚪ Низкий", badge: "bg-slate-900 text-slate-400 border border-slate-800" },
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Ожидает принятия", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
    IN_PROGRESS: { label: "В работе у менеджера", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
    COMPLETED: { label: "Выполнено (отчет готов)", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
    VERIFIED: { label: "Принято руководителем", color: "bg-emerald-950 text-emerald-400 border-emerald-500/60" },
    CANCELLED: { label: "Отменено", color: "bg-slate-800 text-slate-500 border-slate-700" },
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Контроль исполнения</span>
            </span>
            <span className="text-xs text-slate-400">
              Постановка задач от руководителя менеджеру
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
            {role === "EXECUTIVE" ? "Поручения руководителя менеджерам смен" : "Задачи от руководства на смену"}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Постановка задач на перегоны, техосмотр, обслуживание на СТО, мойку и подготовку авто к выдачам с контролем дедлайнов и отчетами.
          </p>
        </div>

        {/* Action Button: Executive can create new task */}
        {role === "EXECUTIVE" && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:from-indigo-500 hover:to-amber-400 text-white rounded-2xl text-xs font-black shadow-xl shadow-indigo-950/50 transition active:scale-95 flex items-center justify-center space-x-2 flex-shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Поставить задачу менеджеру</span>
          </button>
        )}
      </div>

      {/* Stats Counter Row */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Всего поручений:</span>
            <div className="text-xl font-black text-white mt-0.5">{summary.totalCount}</div>
            <span className="text-[10px] text-slate-500">В системе</span>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 p-3.5 rounded-2xl">
            <span className="text-amber-300 block text-[11px]">Ожидают принятия:</span>
            <div className="text-xl font-black text-amber-400 mt-0.5">{summary.pendingCount}</div>
            <span className="text-[10px] text-amber-400/80">Не взяты в работу</span>
          </div>

          <div className="bg-slate-900 border border-blue-500/30 p-3.5 rounded-2xl">
            <span className="text-blue-300 block text-[11px]">В процессе (в работе):</span>
            <div className="text-xl font-black text-blue-400 mt-0.5">{summary.inProgressCount}</div>
            <span className="text-[10px] text-blue-400/80">Выполняются</span>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 p-3.5 rounded-2xl">
            <span className="text-emerald-300 block text-[11px]">Выполнено менеджером:</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5">{summary.completedCount}</div>
            <span className="text-[10px] text-emerald-400/80">Требуют подтверждения</span>
          </div>

          <div className="bg-slate-900 border border-rose-500/40 p-3.5 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-rose-300 block text-[11px]">Срочных (Urgent):</span>
            <div className="text-xl font-black text-rose-400 mt-0.5">{summary.urgentCount}</div>
            <span className="text-[10px] text-rose-400/80">Высокий приоритет</span>
          </div>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 font-bold mr-1 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Статус:</span>
          </span>
          {[
            { id: "ALL", label: "Все" },
            { id: "PENDING", label: "Ожидают" },
            { id: "IN_PROGRESS", label: "В работе" },
            { id: "COMPLETED", label: "Выполненные" },
            { id: "VERIFIED", label: "Принятые" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-2.5 py-1 rounded-xl font-bold transition ${
                statusFilter === s.id
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-800 text-slate-300 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1 text-white font-medium focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Все категории</option>
            <option value="RELOCATION">🚗 Перегон авто</option>
            <option value="MAINTENANCE">🛠️ Сервис / ТО</option>
            <option value="DOCUMENTS">📑 Техосмотр / Страховка</option>
            <option value="CLIENT_DELIVERY">👥 Встреча / Доставка</option>
            <option value="CLEANING">🧼 Мойка</option>
            <option value="FINANCE">💰 Финансы</option>
            <option value="GENERAL">📝 Поручения</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            <span>Загрузка задач...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-slate-900/40 rounded-3xl border border-slate-800">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-bold text-white text-sm">Нет активных задач в этом фильтре</p>
            <p className="text-slate-400 text-xs mt-0.5">Все поручения выполнены или еще не созданы</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cat = categoryLabels[task.category] || categoryLabels.GENERAL;
            const prio = priorityLabels[task.priority] || priorityLabels.MEDIUM;
            const stat = statusLabels[task.status] || statusLabels.PENDING;

            const isUrgent = task.priority === "URGENT";
            const isCompleted = task.status === "COMPLETED";
            const isVerified = task.status === "VERIFIED";

            return (
              <div
                key={task.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 transition-all shadow-lg space-y-3 ${
                  isUrgent && !isVerified
                    ? "border-rose-500/80 bg-rose-950/15 ring-1 ring-rose-500/50"
                    : isCompleted
                    ? "border-emerald-500/60 bg-emerald-950/10"
                    : isVerified
                    ? "border-slate-800/80 opacity-75"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Header row: Badges, Priority, Due Date */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Priority */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase ${prio.badge}`}>
                      {prio.label}
                    </span>

                    {/* Category */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${cat.color}`}>
                      {cat.label}
                    </span>

                    {/* Status */}
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold border ${stat.color}`}>
                      {stat.label}
                    </span>
                  </div>

                  {/* Due Date */}
                  {task.dueDateTime && (
                    <div className="flex items-center space-x-1.5 text-xs text-amber-300 font-mono font-bold bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Срок: {new Date(task.dueDateTime).toLocaleDateString("ru-RU")}{" "}
                        {new Date(task.dueDateTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Task Title & Description */}
                <div>
                  <h3 className="text-base font-extrabold text-white leading-snug">
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/70 whitespace-pre-wrap">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Metadata: Linked Car, City, Assignee */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  {task.car && (
                    <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <Car className="w-3.5 h-3.5 text-amber-400" />
                      <strong className="text-white">{task.car.brand} {task.car.model}</strong>
                      <span className="font-mono text-amber-400">({task.car.plateNumber})</span>
                    </div>
                  )}

                  {task.city && (
                    <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Город: <strong>{task.city.nameRu} ({task.city.code})</strong></span>
                    </div>
                  )}

                  <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Исполнитель: <strong>{task.assignedToName || "Менеджер"}</strong></span>
                  </div>

                  <span className="text-[10px] text-slate-500">
                    Поставил: {task.createdByName} • {new Date(task.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>

                {/* Completion Report if done */}
                {task.completionNotes && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between text-emerald-300 font-bold">
                      <span className="flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Отчет менеджера о выполнении ({task.completedByName || "Менеджер"}):</span>
                      </span>
                      {task.completedAt && (
                        <span className="font-mono text-[11px] text-emerald-400/80">
                          {new Date(task.completedAt).toLocaleDateString("ru-RU")}{" "}
                          {new Date(task.completedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-100 italic pl-4">
                      «{task.completionNotes}»
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  {/* Executive verification or Manager actions */}
                  <div className="flex items-center space-x-2">
                    {/* Manager actions */}
                    {task.status === "PENDING" && (
                      <button
                        onClick={() => handleAction(task.id, "ACCEPT")}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center space-x-1 shadow"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Принять в работу</span>
                      </button>
                    )}

                    {(task.status === "PENDING" || task.status === "IN_PROGRESS") && (
                      <button
                        onClick={() => {
                          setCompletingTask(task);
                          setCompletionNotes("");
                        }}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-bold transition active:scale-95 flex items-center space-x-1 shadow"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Отчитаться о выполнении</span>
                      </button>
                    )}

                    {/* Executive: verify completed task */}
                    {role === "EXECUTIVE" && task.status === "COMPLETED" && (
                      <button
                        onClick={() => handleAction(task.id, "VERIFY", { verifiedByName: "Руководитель" })}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg transition active:scale-95 flex items-center space-x-1.5"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Подтвердить и закрыть задачу</span>
                      </button>
                    )}
                  </div>

                  {/* Executive cancel/delete */}
                  {role === "EXECUTIVE" && (
                    <div className="flex items-center space-x-2">
                      {task.status !== "CANCELLED" && task.status !== "VERIFIED" && (
                        <button
                          onClick={() => handleAction(task.id, "CANCEL")}
                          className="text-slate-400 hover:text-rose-400 text-xs px-2 py-1 transition"
                        >
                          Отменить
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                        title="Удалить задачу"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Executive Creates New Task */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border-2 border-indigo-500 text-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    Постановка задачи менеджеру
                  </h3>
                  <span className="text-xs text-slate-400">
                    Поручение от руководителя автопроката
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Название задачи (кратко)*:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Например: Перегнать Toyota RAV4 из Тбилиси в Батуми к 19:00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Категория задачи:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="RELOCATION">🚗 Перегон между городами</option>
                    <option value="MAINTENANCE">🛠️ Сервис / Замена масла / ТО</option>
                    <option value="DOCUMENTS">📑 Техосмотр (PTI) / Страховка</option>
                    <option value="CLIENT_DELIVERY">👥 Встреча в аэропорту / Доставка</option>
                    <option value="CLEANING">🧼 Мойка / Подготовка к VIP</option>
                    <option value="FINANCE">💰 Финансы / Инкассация / Штраф</option>
                    <option value="GENERAL">📝 Общее поручение</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Срочность (Приоритет):
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="URGENT">🔴 СРОЧНО (Urgent)</option>
                    <option value="HIGH">🟡 Высокий</option>
                    <option value="MEDIUM">🟢 Обычный</option>
                    <option value="LOW">⚪ Низкий</option>
                  </select>
                </div>
              </div>

              {/* Linked Car & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Связанный автомобиль (опционально):
                  </label>
                  <select
                    value={taskCarId}
                    onChange={(e) => setTaskCarId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Без привязки к авто</option>
                    {cars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.brand} {c.model} ({c.plateNumber}) • {c.city?.nameRu}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Город выполнения:
                  </label>
                  <select
                    value={taskCityId}
                    onChange={(e) => setTaskCityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Все города / Не имеет значения</option>
                    {cities.map((ct) => (
                      <option key={ct.id} value={ct.id}>
                        {ct.nameRu} ({ct.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee & Deadline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Кому назначено:
                  </label>
                  <input
                    type="text"
                    value={assignedToName}
                    onChange={(e) => setAssignedToName(e.target.value)}
                    placeholder="Менеджер Тбилиси, Батуми, Георгий..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">
                    Срок выполнения (Дедлайн):
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDateTime}
                    onChange={(e) => setDueDateTime(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Instructions / Description */}
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Подробные указания и требования:
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите детали: где забрать ключи, сколько топлива залить, куда припарковать, какие документы оформить..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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
                  <span>{isSubmitting ? "Отправка..." : "Поставить задачу"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Manager Completes Task with Report */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="bg-slate-900 border-2 border-emerald-500 text-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[92dvh] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-600 rounded-xl text-white">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Отчет о выполнении задачи
                  </h3>
                  <span className="text-xs text-slate-400 truncate max-w-xs block">
                    {completingTask.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCompletingTask(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmittingComplete(true);
                await handleAction(completingTask.id, "COMPLETE", {
                  completionNotes,
                  completedByName: managerName,
                });
                setIsSubmittingComplete(false);
                setCompletingTask(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Имя выполнившего менеджера:
                </label>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Отчет о выполнении (комментарий для руководителя)*:
                </label>
                <textarea
                  rows={4}
                  required
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Например: Автомобиль перегнан из Батуми в Тбилиси, припаркован у офиса, бак 100%, помыт. Чек на топливо передан в кассу."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingComplete}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black rounded-xl shadow-lg transition active:scale-95 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmittingComplete ? "Сохранение..." : "Сдать задачу руководителю"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
