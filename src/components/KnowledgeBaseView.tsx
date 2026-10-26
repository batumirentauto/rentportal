import React, { useState } from "react";
import {
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Phone,
  ExternalLink,
  Share2,
  Search,
  Copy,
  Check,
  Compass,
  Car,
  Droplet,
  Sparkles,
  MapPin,
  HelpCircle,
  Info,
  CreditCard,
  Clock,
  LifeBuoy,
  MessageCircle,
  Send,
  Camera,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: "rules" | "insurance" | "roads" | "fines" | "sos";
}

export const KnowledgeBaseView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // Copy helper
  const handleCopy = (text: string, sectionKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionKey);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Full client memo for WhatsApp/Telegram
  const fullClientMemo = `🇬🇪 ПАМЯТКА КЛИЕНТУ АВТОПРОКАТА VSL RENT (vslrentcar.com)

1. 📄 ДОКУМЕНТЫ ДЛЯ ВОЖДЕНИЯ В ГРУЗИИ:
• При себе всегда должен быть ФИЗИЧЕСКИЙ ОРИГИНАЛ водительского удостоверения (пластик с латиницей) и загранпаспорт.
• ⚠️ Внимание: Фото в телефоне или электронные права полицией Грузии НЕ принимаются (штраф до 1500 GEL)!

2. 💰 ЗАЛОГ И ОПЛАТА:
• Залог (депозит): 0 ₾ (БЕЗ ЗАЛОГА) на большинство автомобилей. Деньги на карте не замораживаются.
• Пробег: 100% безлимитный по всей Грузии без суточных ограничений.

3. ⏰ ВРЕМЯ И СУТКИ АРЕНДЫ:
• Сутки считаются ровно 24 часа с момента фактической выдачи.
• 1-й час задержки возврата — БЕСПЛАТНО.

4. ⛽ ТОПЛИВО И МОЙКА:
• Топливо: возвращайте с тем же уровнем, с каким приняли (как в акте).
• 🧼 Мыть машину перед сдачей НЕ НУЖНО — это бесплатно для вас!

5. 🚫 ЗАПРЕТНЫЕ ЗОНЫ:
• Выезд за пределы Грузии запрещён.
• Въезд в Абхазию и Южную Осетию запрещён.
• ⛔ Перевал Тушетия (Омало) СТРОГО ЗАПРЕЩЁН (опасность обвалов, страховка там не действует).

6. 📹 КАМЕРЫ И ШТРАФЫ:
• На дорогах работают секционные камеры замера средней скорости. Соблюдайте скоростной режим!
• Проверить штрафы можно на сайте: protocols.ge

7. 🚨 SOS / ПРИ ДТП ИЛИ ПОЛОМКЕ (24/7):
• Экстренная линия SOS: +995 591 181 430
• Менеджер / WhatsApp: +995 591 050 752
• Единая служба экстренной помощи: 112
• ⚠️ Не перемещайте авто с места ДТП без согласования с менеджером и полицией!

Приятных и безопасных поездок по живописной Грузии! 🏔️🌊`;

  const faqs: FAQItem[] = [
    {
      question: "Какой минимальный возраст и стаж требуются для аренды?",
      answer:
        "Минимальный возраст арендатора — от 21 года. Принимаются водители со стажем от 0 лет (включая новичков). Водители со стажем более 2 лет получают полное КАСКО с нулевой франшизой (0 GEL), для новичков действует прозрачная минимальная франшиза.",
      category: "rules",
    },
    {
      question: "Действительно ли аренда без залога (депозита)?",
      answer:
        "Да! На подавляющее большинство автомобилей в парке VSL Rent депозит составляет строго 0 ₾. Мы не блокируем средства на банковских картах и не требуем наличного залога при стандартной аренде.",
      category: "insurance",
    },
    {
      question: "Можно ли показать права на смартфоне или через 'Госуслуги'?",
      answer:
        "Категорически НЕТ! Патрульная полиция Грузии требует исключительно физический пластиковый оригинал водительского удостоверения с именем латиницей. Электронные документы или фото влекут штраф до 1500 лари и эвакуацию авто.",
      category: "rules",
    },
    {
      question: "Что делать, если задерживаюсь с возвратом авто?",
      answer:
        "Первый час опоздания предоставляется абсолютно бесплатно. До 6 часов задержки применяется умеренная почасовая тарификация, свыше 8 часов — считается как дополнительный полный день аренды.",
      category: "rules",
    },
    {
      question: "Нужно ли мыть машину перед возвратом?",
      answer:
        "Нет, мыть машину перед возвратом не нужно. Стандартная мойка кузова и чистка салона входит в сервис компании.",
      category: "rules",
    },
    {
      question: "Куда запрещено ездить на арендованном авто в Грузии?",
      answer:
        "Строго запрещён выезд за границу Грузии, въезд на территории Абхазии и Южной Осетии, а также подъём по Абанскому перевалу в Тушетию (Омало) из-за повышенного риска камнепадов и отсутствия действия страхового полиса на этой трассе.",
      category: "roads",
    },
    {
      question: "Как в Грузии работают дорожные камеры и где проверить штрафы?",
      answer:
        "На автобанах и трассах Грузии установлены парные камеры, фиксирующие среднюю скорость движения между контрольными точками. За превышение скорости на длинном участке может прийти несколько штрафов подряд. Проверить свои штрафы можно на государственном портале protocols.ge по номеру техпаспорта и госномеру.",
      category: "fines",
    },
    {
      question: "Что делать в случае ДТП или любой неисправности?",
      answer:
        "1) Немедленно остановитесь, включите аварийную сигнализацию и не двигайте автомобиль. 2) Позвоните менеджеру по экстренной линии +995 591 181 430 или в WhatsApp +995 591 050 752. 3) При необходимости вызовите полицию (112). Следование указаниям диспетчера гарантирует полное покрытие страховкой.",
      category: "sos",
    },
  ];

  const filteredFaqs = faqs.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" || item.category === selectedCategory;
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>База знаний & Регламенты</span>
              </span>
              <a
                href="https://vslrentcar.com"
                target="_blank"
                rel="noreferrer"
                className="bg-amber-500/20 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1 transition"
              >
                <span>vslrentcar.com (Официальный сайт)</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Правила аренды, памятки водителям и FAQ автопроката
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Единый справочник условий проката автомобилей по Грузии (Батуми, Тбилиси, Кутаиси).
              Все регламенты, тарифные принципы, памятки для быстрой отправки в мессенджеры и
              инструкции при ДТП собраны на основе официального сайта{" "}
              <strong className="text-white">vslrentcar.com</strong>.
            </p>
          </div>

          {/* Quick Action: Share Client Memo Button */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 flex-shrink-0">
            <button
              onClick={() => handleCopy(fullClientMemo, "memo-hero")}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center space-x-2"
            >
              {copiedSection === "memo-hero" ? (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Памятка скопирована!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-950" />
                  <span>Скопировать памятку для клиента</span>
                </>
              )}
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(fullClientMemo)}`}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl shadow transition flex items-center justify-center space-x-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Поделиться в WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4 Key Pillars of VSL Rent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Zero Deposit */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-emerald-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">0 ₾ Без залога</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Большинство авто сдаются без денежного залога и блокировок средств на банковских картах.
          </p>
          <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
            Zero Deposit
          </span>
        </div>

        {/* 100% Unlimited Mileage */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-cyan-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Compass className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">Безлимитный пробег</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            100% неограниченный километраж по всей территории Грузии. Никаких доплат за пробег.
          </p>
          <span className="inline-block text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
            Unlimited Km
          </span>
        </div>

        {/* Free First Extra Hour */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-amber-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">24 часа + 1 час бонус</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Счёт идёт сутками с момента выдачи. Первый час задержки возврата — бесплатно.
          </p>
          <span className="inline-block text-[10px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
            +1 час бесплатно
          </span>
        </div>

        {/* Full Insurance */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-2 hover:border-indigo-500/40 transition">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-black text-white">КАСКО + ОСАГО</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Для водителей со стажем от 2 лет — нулевая франшиза (zero-excess). Для новичков — минимум.
          </p>
          <span className="inline-block text-[10px] text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
            CASCO / CDW
          </span>
        </div>
      </div>

      {/* Main Knowledge Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Rules & Driver Requirements */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                1. Требования к водителю
              </h3>
              <span className="text-[11px] text-slate-400">
                Документы, возраст и стаж
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-amber-400 font-bold block">
                🪪 Оригинал водительского удостоверения:
              </span>
              <p className="text-slate-300 leading-relaxed">
                Полиция Грузии требует <strong className="text-white">только физический оригинал</strong> пластиковых прав (с латиницей или МВУ).
              </p>
              <div className="p-2 bg-red-950/50 border border-red-500/40 rounded-lg text-red-200 text-[11px]">
                ⛔ <strong>Штраф 1500 GEL</strong> за управление по фото в телефоне или цифровым правам приложения.
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">
                🎂 Возраст и стаж:
              </span>
              <p className="text-slate-300">
                • Возраст водителя: <strong>от 21 года</strong>.
              </p>
              <p className="text-slate-300">
                • Стаж вождения: <strong>от 0 лет</strong> (без ограничений).
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">
                🛂 Заграничный паспорт:
              </span>
              <p className="text-slate-300">
                Действительный загранпаспорт на весь период аренды в Грузии.
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-amber-400 font-bold block">
                🧼 Возврат и мойка:
              </span>
              <p className="text-slate-300">
                • <strong>Мыть автомобиль перед сдачей НЕ ТРЕБУЕТСЯ</strong> (мойка бесплатно).
              </p>
              <p className="text-slate-300">
                • Уровень топлива возвращается согласно акту выдачи.
              </p>
            </div>
          </div>
        </div>

        {/* Center Column: Restricted Areas & Road Guidelines */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
            <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                2. Запретные зоны & Дороги
              </h3>
              <span className="text-[11px] text-slate-400">
                Ограничения по передвижению
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            {/* Forbidden zones */}
            <div className="bg-red-950/30 border border-red-500/40 p-3.5 rounded-xl space-y-2">
              <span className="text-red-400 font-black block uppercase text-[11px]">
                🚫 Категорически запрещено:
              </span>
              <ul className="text-red-200 space-y-1.5 list-disc list-inside">
                <li>Выезд за пределы государственной границы Грузии.</li>
                <li>Въезд на территории Абхазии и Южной Осетии.</li>
                <li>
                  <strong>Перевал Тушетия (Омало / Абанский перевал):</strong> одна из самых опасных горных дорог мира, страховка там аннулируется.
                </li>
              </ul>
            </div>

            {/* Fines and Cameras in Georgia */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-amber-400 font-bold block">
                📹 Камеры средней скорости & protocols.ge:
              </span>
              <p className="text-slate-300 leading-relaxed">
                В Грузии действуют секционные камеры замера средней скорости. При превышении выписывается штраф за каждый сектор.
              </p>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                <span className="text-[11px] text-slate-300">Проверка штрафов:</span>
                <a
                  href="https://protocols.ge"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline font-bold text-xs flex items-center space-x-1"
                >
                  <span>protocols.ge</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Mountain road recommendations */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-emerald-400 font-bold block">
                🏔️ Горные маршруты (Сванетия, Казбеги, Местия):
              </span>
              <p className="text-slate-300">
                Поездки в Степанцминду (Казбеги) и Местию разрешены на всех авто. Поездки в Ушгули или перевал Годердзи рекомендуются только на полноприводных внедорожниках (4x4).
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: SOS, Emergency and Contacts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-800">
            <div className="p-2 bg-red-600/20 rounded-xl text-red-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                3. Протокол SOS при ДТП
              </h3>
              <span className="text-[11px] text-slate-400">
                Круглосуточная помощь 24/7
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <span className="text-white font-bold block">
                🚨 Алгоритм действий при ДТП или поломке:
              </span>
              <ol className="text-slate-300 space-y-1 list-decimal list-inside text-[11px]">
                <li>Остановиться, включить аварийную сигнализацию.</li>
                <li>
                  <strong className="text-amber-400">Не двигать автомобиль</strong> с места происшествия до фиксации полицией.
                </li>
                <li>
                  Сразу же связаться с круглосуточной службой поддержки VSL Rent.
                </li>
                <li>Вызвать экстренную службу при необходимости (112).</li>
              </ol>
            </div>

            {/* Direct Phone Numbers */}
            <div className="bg-gradient-to-r from-red-950/60 to-slate-950 border border-red-500/50 p-3.5 rounded-xl space-y-2.5">
              <span className="text-red-300 font-extrabold uppercase text-[10px] block tracking-wide">
                📞 Экстренные контакты (24/7):
              </span>

              <div className="space-y-1.5 font-mono text-xs">
                <a
                  href="tel:+995591181430"
                  className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 p-2 rounded-lg text-white font-bold transition border border-slate-800"
                >
                  <span className="flex items-center space-x-2 text-red-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span>SOS Линия ДТП:</span>
                  </span>
                  <span className="text-amber-400">+995 591 181 430</span>
                </a>

                <a
                  href="tel:+995591050752"
                  className="flex items-center justify-between bg-slate-900 hover:bg-slate-800 p-2 rounded-lg text-white font-bold transition border border-slate-800"
                >
                  <span className="flex items-center space-x-2 text-emerald-400">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp / Связь:</span>
                  </span>
                  <span className="text-emerald-400">+995 591 050 752</span>
                </a>

                <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg text-white font-bold border border-slate-800">
                  <span className="flex items-center space-x-2 text-blue-400">
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Экстренные службы Грузии:</span>
                  </span>
                  <span className="text-blue-300 font-bold">112</span>
                </div>
              </div>
            </div>

            {/* Official Web Reference */}
            <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <span>Сайт компании:</span>
              <a
                href="https://vslrentcar.com"
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:underline font-mono font-bold"
              >
                vslrentcar.com
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive FAQ Section with Search & Categories */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              <span>Часто задаваемые вопросы (FAQ & База знаний)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Быстрые ответы на типовые вопросы клиентов и менеджеров по правилам vslrentcar.com
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросам и правилам..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { id: "ALL", label: "Все вопросы" },
            { id: "rules", label: "📄 Требования и правила" },
            { id: "insurance", label: "🛡️ Залог и страховка" },
            { id: "roads", label: "🏔️ Дороги и перевал Тушетия" },
            { id: "fines", label: "📹 Штрафы и protocols.ge" },
            { id: "sos", label: "🚨 SOS и ДТП" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                selectedCategory === cat.id
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-950 text-slate-300 hover:text-white border border-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/60 rounded-2xl border border-slate-800">
              По вашему запросу вопросов не найдено.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isExpanded = expandedFAQ === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800/90 rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => setExpandedFAQ(isExpanded ? null : idx)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-slate-900/60 transition"
                  >
                    <span className="font-extrabold text-white text-xs sm:text-sm pr-4">
                      {faq.question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 text-xs text-slate-300 border-t border-slate-800/60 leading-relaxed bg-slate-900/30 flex items-start justify-between gap-4">
                      <div>{faq.answer}</div>
                      <button
                        onClick={() => handleCopy(`${faq.question}\n\n${faq.answer}`, `faq-${idx}`)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 whitespace-nowrap flex-shrink-0"
                        title="Скопировать ответ для отправки клиенту"
                      >
                        {copiedSection === `faq-${idx}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Скопировано!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Копировать</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};