"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Car,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Minimize2,
  DollarSign,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: string;
    task?: {
      id: string;
      title: string;
      category: string;
      priority: string;
      city?: string;
      car?: string;
      deadline?: string;
    };
  };
  timestamp: string;
}

const QUICK_PROMPTS = [
  { icon: Car, label: "Свободные кроссоверы", prompt: "Какие кроссоверы сейчас свободны и по каким ценам?" },
  { icon: Wrench, label: "Контроль ТО и масел", prompt: "Каким машинам в ближайшее время требуется замена масла или ТО?" },
  { icon: ClipboardList, label: "Поставить задачу", prompt: "Поставь задачу менеджеру в Батуми подготовить Ford Escape YY-779-NN к выдаче сегодня к 18:00" },
  { icon: DollarSign, label: "Аналитика и маржа", prompt: "Покажи сводку по автопарку: сколько машин свободно, средняя ставка клиентам и средняя маржа компании" },
  { icon: ShieldAlert, label: "Штрафы MVD", prompt: "Есть ли неоплаченные штрафы патрульной полиции по автомобилям парка?" },
];

export const AiAssistantModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "👋 Здравствуйте! Я ваш **ИИ-Копилот автопроката** на базе Google Gemini 🇬🇪.\n\nЯ подключен к базе из **65+ автомобилей** парка и могу:\n• 🚗 Подобрать свободное авто клиенту по бюджету и классу\n• 🔧 Проверить межсервисные интервалы и замену масел\n• 📋 Создать задачу менеджеру смены прямо из чата\n• 💰 Рассчитать стоимость аренды и доход инвесторов\n• 🚦 Проверить штрафы патрульной полиции\n\nЧем я могу помочь прямо сейчас?",
      timestamp: "Онлайн",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: "user-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      const data = await res.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          role: "assistant",
          content: data.answer || "Ответ получен.",
          action: data.action,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: "err-" + Date.now(),
            role: "assistant",
            content: `⚠️ ${data.error || "Не удалось получить ответ от ассистента."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          role: "assistant",
          content: `⚠️ Ошибка соединения с ИИ: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: "assistant",
        content: "Чат очищен. Я готов ответить на ваши новые вопросы по автопарку, клиентам и задачам! 🚗",
        timestamp: "Онлайн",
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-40 group flex items-center space-x-2 px-3 sm:px-4 py-2 sm:py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white rounded-full shadow-xl shadow-purple-900/50 hover:shadow-purple-700/60 transition-all duration-300 transform hover:scale-105 active:scale-95 border border-purple-400/30 text-xs sm:text-sm"
          title="Открыть ИИ-Ассистент (⌘K)"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-amber-200" />
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
          </div>
          <span className="font-bold tracking-wide">ИИ Ассистент</span>
          <span className="hidden sm:inline-block text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono text-purple-100">
            ⌘K
          </span>
        </button>
      )}

      {/* Slide-out / Modal Container */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ease-out flex flex-col bg-slate-900/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden ${
            isExpanded
              ? "inset-4 sm:inset-10"
              : "bottom-5 right-5 w-[92vw] sm:w-[460px] h-[650px] max-h-[88vh]"
          }`}
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/60 to-slate-900 border-b border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative p-2 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-md shadow-purple-950">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center space-x-1.5">
                  <span>ИИ-Копилот Автопроката</span>
                  <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.2 rounded uppercase font-mono">
                    Gemini
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  База 65+ авто • ТО • Штрафы • Задачи
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-slate-400">
              <button
                onClick={clearChat}
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title="Очистить переписку"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition hidden sm:block"
                title={isExpanded ? "Свернуть" : "Развернуть на весь экран"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Закрыть (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-950/50 border-b border-slate-800/80 flex items-center space-x-1.5 overflow-x-auto scrollbar-thin">
            {QUICK_PROMPTS.map((qp, idx) => {
              const Icon = qp.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={loading}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-purple-950/60 text-slate-300 hover:text-purple-200 border border-slate-800 hover:border-purple-500/40 rounded-xl text-[11px] font-medium whitespace-nowrap transition active:scale-95 flex items-center space-x-1.5 shrink-0"
                >
                  <Icon className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>{qp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-start space-x-2.5 ${
                    isUser ? "flex-row-reverse space-x-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white shadow-sm ${
                      isUser
                        ? "bg-slate-800 text-slate-300"
                        : "bg-gradient-to-tr from-indigo-600 to-purple-600"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div className="max-w-[85%] space-y-1.5">
                    <div
                      className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap break-words ${
                        isUser
                          ? "bg-purple-600 text-white rounded-tr-none shadow-md shadow-purple-950/30"
                          : "bg-slate-800/90 text-slate-200 rounded-tl-none border border-slate-700/60 shadow-md"
                      }`}
                    >
                      {m.content}
                    </div>

                    {/* Action Card Badge (e.g. Task Created) */}
                    {m.action?.type === "TASK_CREATED" && m.action.task && (
                      <div className="p-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-emerald-200 space-y-1 shadow-md">
                        <div className="flex items-center space-x-1.5 font-bold text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Задача зарегистрирована в CRM</span>
                        </div>
                        <div className="text-[11px] font-semibold text-white">
                          {m.action.task.title}
                        </div>
                        <div className="text-[10px] text-emerald-300/80 flex flex-wrap gap-2 pt-0.5">
                          {m.action.task.city && <span>📍 {m.action.task.city}</span>}
                          {m.action.task.priority && (
                            <span className="font-mono uppercase font-bold text-amber-300">
                              ⚡ {m.action.task.priority}
                            </span>
                          )}
                          {m.action.task.deadline && <span>⏱️ Дедлайн: {m.action.task.deadline}</span>}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[10px] text-slate-500 px-1 ${
                        isUser ? "text-right" : "text-left"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 text-white shadow-sm">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-3 bg-slate-800/80 rounded-2xl rounded-tl-none border border-slate-700/60 flex items-center space-x-2 text-slate-400">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                  </div>
                  <span className="text-[11px]">ИИ анализирует парк и формирует ответ...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-slate-950/70 border-t border-slate-800/80">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спросите об авто, ТО, ценах или дайте задачу..."
                disabled={loading}
                className="flex-1 bg-slate-900 border border-slate-700/80 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-md transition active:scale-95"
                title="Отправить сообщение"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
