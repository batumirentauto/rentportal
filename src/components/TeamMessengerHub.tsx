import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Plus,
  Users,
  Search,
  Sparkles,
  Car,
  AlertTriangle,
  Wrench,
  Fuel,
  RefreshCw,
  Building2,
  X,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Pin,
  ChevronRight,
  Hash,
} from "lucide-react";

interface ChatRoom {
  id: string;
  name: string;
  icon: string;
  type: string;
  description?: string;
  cityName: string;
  cityCode: string;
  membersCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
    carPlate?: string;
  } | null;
}

interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  senderRole: string;
  content: string;
  carPlate?: string;
  bookingId?: string;
  createdAt: string;
}

interface RoomDetails {
  id: string;
  name: string;
  icon: string;
  type: string;
  description?: string;
  cityName: string;
  cityCode: string;
  members: {
    id: string;
    fullName: string;
    role: string;
    phone?: string;
  }[];
  messages: ChatMessage[];
}

export const TeamMessengerHub: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("");
  const [roomDetails, setRoomDetails] = useState<RoomDetails | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("ALL");

  // Message input
  const [messageText, setMessageText] = useState<string>("");
  const [selectedCarPlate, setSelectedCarPlate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Active persona (от чьего лица писать)
  const [currentSenderName, setCurrentSenderName] = useState<string>("Георгий Беридзе");
  const [currentSenderRole, setCurrentSenderRole] = useState<string>("MANAGER");

  // Modal: Create room
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [newRoomIcon, setNewRoomIcon] = useState<string>("💬");
  const [newRoomType, setNewRoomType] = useState<string>("GROUP");
  const [newRoomDesc, setNewRoomDesc] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch rooms list
  const fetchRooms = async (selectFirst = false) => {
    try {
      const res = await fetch("/api/chats");
      const json = await res.json();
      if (json.success) {
        setRooms(json.rooms || []);
        setAllUsers(json.users || []);
        setCars(json.cars || []);

        if (selectFirst && json.rooms?.length > 0 && !activeRoomId) {
          setActiveRoomId(json.rooms[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch active room messages
  const fetchRoomMessages = async (roomId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/chats?roomId=${roomId}`);
      const json = await res.json();
      if (json.success) {
        setRoomDetails(json.room);
        setTimeout(scrollToBottom, 100);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchRooms(true);
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      fetchRoomMessages(activeRoomId);
    }
  }, [activeRoomId]);

  // Polling for live messages in active room every 4 seconds
  useEffect(() => {
    if (!activeRoomId) return;
    const interval = setInterval(() => {
      fetch(`/api/chats?roomId=${activeRoomId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setRoomDetails((prev) => {
              if (json.room.messages.length !== prev?.messages.length) {
                setTimeout(scrollToBottom, 100);
              }
              return json.room;
            });
          }
        })
        .catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [activeRoomId]);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !activeRoomId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SEND_MESSAGE",
          roomId: activeRoomId,
          content: messageText,
          senderName: currentSenderName,
          senderRole: currentSenderRole,
          carPlate: selectedCarPlate || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessageText("");
        setSelectedCarPlate("");
        await fetchRoomMessages(activeRoomId);
        fetchRooms(); // refresh last message snippets
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create new room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_ROOM",
          name: newRoomName,
          icon: newRoomIcon,
          type: newRoomType,
          description: newRoomDesc,
          memberUserIds: selectedMemberIds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setNewRoomName("");
        setNewRoomDesc("");
        setSelectedMemberIds([]);
        await fetchRooms();
        if (json.room?.id) {
          setActiveRoomId(json.room.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick tag insertion
  const addQuickTag = (tagText: string) => {
    setMessageText((prev) => (prev ? `${prev} ${tagText}` : tagText));
  };

  // Filtered rooms
  const filteredRooms = rooms.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType =
      filterType === "ALL"
        ? true
        : filterType === "BRANCH"
        ? r.type === "BRANCH"
        : filterType === "GROUP"
        ? r.type === "GROUP"
        : true;
    return matchesSearch && matchesType;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "EXECUTIVE":
        return { label: "👔 Руководитель", color: "text-indigo-400 bg-indigo-950/60 border-indigo-500/30" };
      case "MANAGER":
        return { label: "💼 Менеджер", color: "text-blue-400 bg-blue-950/60 border-blue-500/30" };
      case "TECHNICIAN":
        return { label: "🔧 Механик", color: "text-amber-400 bg-amber-950/60 border-amber-500/30" };
      default:
        return { label: "Сотрудник", color: "text-slate-400 bg-slate-800" };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[780px]">
      {/* 1. LEFT SIDEBAR: CHAT ROOMS & CHANNELS */}
      <div className="w-full md:w-80 md:min-w-[320px] bg-slate-950/90 border-r border-slate-800 flex flex-col h-full shrink-0">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-sm text-white">Чат команды VSL</h3>
            </div>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition active:scale-95"
              title="Создать тематический чат или группу"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Чат</span>
            </button>
          </div>

          {/* Persona selector (от чьего имени писать) */}
          <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Писать от имени:
            </span>
            <select
              value={currentSenderName}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentSenderName(val);
                if (val.includes("Руководитель")) setCurrentSenderRole("EXECUTIVE");
                else if (val.includes("Механик") || val.includes("СТО")) setCurrentSenderRole("TECHNICIAN");
                else setCurrentSenderRole("MANAGER");
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
            >
              <option value="Георгий Беридзе">💼 Георгий Беридзе (Батуми)</option>
              <option value="Зураб Абашидзе (Менеджер 2)">💼 Зураб Абашидзе (Батуми 2)</option>
              <option value="Николоз Мамулашвили">💼 Николоз Мамулашвили (Тбилиси)</option>
              <option value="Ираклий Чавчавадзе (Менеджер 2)">💼 Ираклий Чавчавадзе (Тбилиси 2)</option>
              <option value="Леван Гаприндашвили">💼 Леван Гаприндашвили (Кутаиси)</option>
              <option value="Руководитель VSL">👔 Руководитель VSL (Директор)</option>
            </select>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск чата..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex space-x-1.5 text-[11px] font-bold">
            {[
              { id: "ALL", label: "Все" },
              { id: "BRANCH", label: "Филиалы" },
              { id: "GROUP", label: "Группы" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={`flex-1 py-1 px-2 rounded-lg transition ${
                  filterType === f.id
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
          {filteredRooms.map((r) => {
            const isActive = r.id === activeRoomId;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoomId(r.id)}
                className={`w-full p-3 rounded-2xl text-left transition flex items-start space-x-3 ${
                  isActive
                    ? "bg-indigo-950/70 border border-indigo-500/40 shadow-lg"
                    : "hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shrink-0 shadow">
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white truncate">{r.name}</h4>
                    {r.lastMessage && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                        {new Date(r.lastMessage.createdAt).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    {r.lastMessage ? (
                      <>
                        <span className="text-slate-300 font-semibold">{r.lastMessage.senderName.split(" ")[0]}: </span>
                        {r.lastMessage.content}
                      </>
                    ) : (
                      <span className="italic text-slate-600">Нет сообщений</span>
                    )}
                  </p>

                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                      {r.cityName}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      👥 {r.membersCount} уч.
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. RIGHT AREA: ACTIVE CHAT CONVERSATION */}
      <div className="flex-1 flex flex-col h-full bg-slate-900">
        {roomDetails ? (
          <>
            {/* Chat Room Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
                  {roomDetails.icon}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-base text-white">
                      {roomDetails.name}
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono font-bold">
                      {roomDetails.cityName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                    {roomDetails.description || "Корпоративный канал связи команды VSL"}
                  </p>
                </div>
              </div>

              {/* Members Pill */}
              <div className="flex items-center space-x-2 self-start sm:self-center">
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {roomDetails.members.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      title={`${m.fullName} (${m.role})`}
                      className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] text-amber-300"
                    >
                      {m.fullName.charAt(0)}
                    </div>
                  ))}
                  {roomDetails.members.length > 4 && (
                    <div className="w-7 h-7 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center font-bold text-[10px] text-slate-400">
                      +{roomDetails.members.length - 4}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => fetchRoomMessages(roomDetails.id)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                  title="Обновить сообщения"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {roomDetails.messages.length === 0 ? (
                <div className="py-20 text-center text-slate-500 space-y-2">
                  <div className="text-3xl">{roomDetails.icon}</div>
                  <p className="font-bold text-white text-sm">В этом чате пока нет сообщений</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Напишите первое сообщение команде, упомяните автомобиль или задайте вопрос коллегам.
                  </p>
                </div>
              ) : (
                roomDetails.messages.map((msg) => {
                  const isMe = msg.senderName === currentSenderName;
                  const roleInfo = getRoleBadge(msg.senderRole);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 px-1">
                        <span className="font-bold text-xs text-slate-300">
                          {msg.senderName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${roleInfo.color}`}
                        >
                          {roleInfo.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-md p-3.5 rounded-2xl text-xs space-y-1.5 shadow-md ${
                          isMe
                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-tr-none"
                            : "bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-none"
                        }`}
                      >
                        {/* Car reference badge */}
                        {msg.carPlate && (
                          <div className="inline-flex items-center space-x-1 bg-black/30 border border-white/20 px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold text-amber-300">
                            <Car className="w-3 h-3" />
                            <span>Авто: {msg.carPlate}</span>
                          </div>
                        )}

                        <p className="leading-relaxed whitespace-pre-wrap text-[13px]">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Area */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
              {/* Quick Tags & Car Selector */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Быстрые теги:</span>
                <button
                  type="button"
                  onClick={() => addQuickTag("🚨 СРОЧНО:")}
                  className="px-2 py-0.5 bg-red-950 text-red-300 border border-red-500/40 rounded-lg text-[10px] font-bold hover:bg-red-900 transition"
                >
                  🚨 Срочно
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTag("🧼 Автомобиль помыт")}
                  className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold hover:bg-cyan-900 transition"
                >
                  🧼 Мойка выполнена
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTag("⛽ Заправлен полный бак")}
                  className="px-2 py-0.5 bg-amber-950 text-amber-300 border border-amber-500/40 rounded-lg text-[10px] font-bold hover:bg-amber-900 transition"
                >
                  ⛽ Заправка
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTag("🏁 Авто успешно выдан клиенту")}
                  className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold hover:bg-emerald-900 transition"
                >
                  🏁 Выдача
                </button>
                <button
                  type="button"
                  onClick={() => addQuickTag("🔧 Требуется замена масла / ТО")}
                  className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-500/40 rounded-lg text-[10px] font-bold hover:bg-rose-900 transition"
                >
                  🔧 На сервис
                </button>

                {/* Car Selector */}
                <div className="ml-auto flex items-center space-x-1">
                  <span className="text-[10px] text-slate-500">Привязать авто:</span>
                  <select
                    value={selectedCarPlate}
                    onChange={(e) => setSelectedCarPlate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-amber-300 font-mono text-[11px] rounded-lg px-2 py-0.5 focus:outline-none"
                  >
                    <option value="">-- Без авто --</option>
                    {cars.map((c) => (
                      <option key={c.id} value={c.plateNumber}>
                        {c.brand} {c.model} ({c.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Input & Submit Button */}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder={`Написать в «${roomDetails.name}»... (Enter для отправки)`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !messageText.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-40 flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Отправить</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <p>Выберите чат слева для начала переписки</p>
          </div>
        )}
      </div>

      {/* 3. MODAL: CREATE NEW ROOM */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-white">
                  Создать новый чат
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="text-slate-300 font-bold block mb-1">Иконка:</label>
                  <select
                    value={newRoomIcon}
                    onChange={(e) => setNewRoomIcon(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-center text-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="💬">💬</option>
                    <option value="📢">📢</option>
                    <option value="🌊">🌊</option>
                    <option value="🏛️">🏛️</option>
                    <option value="🌿">🌿</option>
                    <option value="🛠️">🛠️</option>
                    <option value="🚨">🚨</option>
                    <option value="🚘">🚘</option>
                    <option value="💰">💰</option>
                  </select>
                </div>

                <div className="col-span-3">
                  <label className="text-slate-300 font-bold block mb-1">
                    Название чата:
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Например: Выдачи аэропорт Батуми..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Тип чата:
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="GROUP">Тематическая рабочая группа</option>
                  <option value="BRANCH">Филиальный чат города</option>
                  <option value="GENERAL">Общий канал компании</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">
                  Описание / Тема чата:
                </label>
                <input
                  type="text"
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  placeholder="Для чего предназначен этот чат..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Members selection */}
              <div>
                <label className="text-slate-300 font-bold block mb-1.5">
                  Кого добавить в чат ({allUsers.length} сотрудников):
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-2.5 max-h-36 overflow-y-auto space-y-1.5">
                  {allUsers.map((u) => {
                    const isSelected = selectedMemberIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center space-x-2 text-[11px] text-slate-300 hover:text-white cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMemberIds([...selectedMemberIds, u.id]);
                            } else {
                              setSelectedMemberIds(selectedMemberIds.filter((id) => id !== u.id));
                            }
                          }}
                          className="rounded accent-indigo-500"
                        />
                        <span className="font-semibold">{u.fullName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({u.role})</span>
                      </label>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">
                  💡 Если никого не выбрать, чат будет доступен всем сотрудникам.
                </span>
              </div>

              <div className="pt-2 flex justify-end space-x-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg transition"
                >
                  Создать чат
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
