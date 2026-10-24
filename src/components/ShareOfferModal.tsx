import React, { useState, useMemo } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Download,
  Phone,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Calendar,
  Clock,
  Car,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { getCityTheme } from "./FleetTimelineGrid";

interface ShareOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCars: any[];
}

export const ShareOfferModal: React.FC<ShareOfferModalProps> = ({
  isOpen,
  onClose,
  selectedCars,
}) => {
  const [clientName, setClientName] = useState<string>("Уважаемый клиент");
  const [clientPhone, setClientPhone] = useState<string>("");
  const [rentalPeriod, setRentalPeriod] = useState<string>("3 дня");
  const [customRates, setCustomRates] = useState<Record<string, number>>({});
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<"whatsapp" | "telegram" | "instagram">("whatsapp");

  // Format shareable text offer
  const offerText = useMemo(() => {
    let text = `🚗 *GEODRIVE Georgia | Персональная подборка автомобилей*\n\n`;
    text += `Здравствуйте, ${clientName}! Мы подобрали для вас отличные свободные автомобили в идеальном техническом состоянии:\n\n`;

    selectedCars.forEach((car, idx) => {
      const cityTheme = getCityTheme(car.city?.code || car.cityCode);
      const rate = customRates[car.id] || car.clientStandardDailyRate || car.rates?.clientStandardRate || 65;
      const rateGel = Math.round(rate * 2.7);

      text += `━━━━━━━━━━━━━━━━━━━\n`;
      text += `✨ *${idx + 1}. ${car.brand} ${car.model} (${car.year} г.)*\n`;
      text += `📍 Город: ${cityTheme.name} (${car.city?.code || car.cityCode})\n`;
      text += `⚙️ Характеристики: ${car.transmission === "AUTOMATIC" ? "Автомат" : "Механика"} • ${car.fuelType} • ${car.engineVolume || "2.5L"}\n`;
      text += `💰 Стоимость: *$${rate} USD / день* (~${rateGel} GEL)\n`;
      text += `🛡️ Залог: $${car.depositAmount || 300} USD (возвратный)\n`;
      text += `✅ *Включено бесплатно:*\n`;
      text += `   • Страховка КАСКО + ОСАГО (0% франшиза)\n`;
      text += `   • Безлимитный пробег по всей Грузии\n`;
      text += `   • Второй водитель в договоре бесплатно\n`;
      text += `   • Чистый автомобиль с полным баком\n`;
      if (car.imageUrl) {
        text += `📸 Фото карточки: ${car.imageUrl}\n`;
      }
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━\n`;
    text += `📞 Для быстрого бронирования ответьте на это сообщение или позвоните нам:\n`;
    text += `📱 WhatsApp / Телефон: +995 599 123 456\n`;
    text += `🌐 Офисы: Тбилиси (Руставели, 24) • Батуми (Горгиладзе, 54) • Аэропорт Кутаиси\n`;
    text += `GEODRIVE — надежный автопрокат в Грузии 🇬🇪`;

    return text;
  }, [clientName, selectedCars, customRates]);

  if (!isOpen) return null;

  // Handle WhatsApp
  const handleShareWhatsApp = () => {
    const cleanPhone = clientPhone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(offerText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Handle Telegram
  const handleShareTelegram = () => {
    const encodedText = encodeURIComponent(offerText);
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://geodrive.ge")}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  // Handle Instagram Direct
  const handleShareInstagram = () => {
    navigator.clipboard.writeText(offerText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
    // Open Instagram Direct
    window.open("https://ig.me/m/", "_blank");
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(offerText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black px-2.5 py-0.5 rounded-full uppercase shadow">
                Маркетинговые товарные карточки
              </span>
              <span className="text-xs text-slate-400">
                Выбрано автомобилей: {selectedCars.length}
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1 flex items-center space-x-2">
              <span>Отправка подборки автомобилей клиенту</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client quick settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Имя клиента:</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Например: Давид, Анна..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Телефон клиента (WhatsApp):</label>
            <input
              type="text"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="+995 599... / +7 9..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Срок аренды (в тексте):</label>
            <input
              type="text"
              value={rentalPeriod}
              onChange={(e) => setRentalPeriod(e.target.value)}
              placeholder="3 дня / 1 неделя..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>
        </div>

        {/* Visual Cards Gallery (Grid of marketing posters) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center space-x-1.5">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span>Товарные карточки для отправки клиенту:</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Цены можно скорректировать индивидуально под клиента
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-1">
            {selectedCars.map((car, idx) => {
              const cityTheme = getCityTheme(car.city?.code || car.cityCode);
              const currentRate =
                customRates[car.id] !== undefined
                  ? customRates[car.id]
                  : car.clientStandardDailyRate || car.rates?.clientStandardRate || 65;

              return (
                <div
                  key={car.id}
                  className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group hover:border-purple-500/60 transition"
                >
                  {/* Photo & Badge */}
                  <div className="relative h-44 bg-slate-800 overflow-hidden">
                    <img
                      src={
                        car.imageUrl ||
                        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={`${car.brand} ${car.model}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

                    {/* Logo & City Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                      <span className="bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-black px-2 py-0.5 rounded-lg border border-slate-700/80">
                        GEODRIVE
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center space-x-1 ${cityTheme.badgeBg}`}
                      >
                        <span>{cityTheme.icon}</span>
                        <span>{cityTheme.name}</span>
                      </span>
                    </div>

                    {/* Plate */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-700 backdrop-blur-xs">
                        {car.plateNumber}
                      </span>
                    </div>

                    {/* Price Tag Badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 px-2.5 py-1 rounded-xl shadow-lg font-black font-mono text-xs">
                      ${currentRate} / день
                    </div>
                  </div>

                  {/* Card Content & Features */}
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-extrabold text-white text-sm">
                        {car.brand} {car.model} ({car.year})
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {car.color} • {car.transmission === "AUTOMATIC" ? "Автомат" : "Механика"} • {car.fuelType}
                      </p>
                    </div>

                    {/* Perks */}
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-300 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <Check className="w-3 h-3" />
                        <span>КАСКО включено</span>
                      </span>
                      <span className="flex items-center space-x-1 text-emerald-400">
                        <Check className="w-3 h-3" />
                        <span>Безлимит пробег</span>
                      </span>
                      <span className="flex items-center space-x-1 text-slate-300">
                        <span>Залог: ${car.depositAmount || 300}</span>
                      </span>
                      <span className="flex items-center space-x-1 text-cyan-300">
                        <span>~{Math.round(currentRate * 2.7)} GEL</span>
                      </span>
                    </div>

                    {/* Custom rate inline edit */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px]">Тариф клиенту:</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-500 font-mono font-bold">$</span>
                        <input
                          type="number"
                          value={currentRate}
                          onChange={(e) =>
                            setCustomRates({
                              ...customRates,
                              [car.id]: Number(e.target.value),
                            })
                          }
                          className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-slate-500 text-[10px]">/ день</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1-Click Sending Channel Buttons */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Выберите канал для мгновенной отправки клиенту:
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center space-x-1"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? "Скопировано!" : "Скопировать текст"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* WhatsApp */}
            <button
              onClick={handleShareWhatsApp}
              className="p-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-2xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center space-x-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black">
                💬
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Отправить в WhatsApp</div>
                <div className="text-[10px] text-emerald-100 font-normal">Прямое сообщение с карточками</div>
              </div>
            </button>

            {/* Telegram */}
            <button
              onClick={handleShareTelegram}
              className="p-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-2xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center space-x-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black">
                ✈️
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Отправить в Telegram</div>
                <div className="text-[10px] text-sky-100 font-normal">В чат клиенту или канал</div>
              </div>
            </button>

            {/* Instagram */}
            <button
              onClick={handleShareInstagram}
              className="p-3.5 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:opacity-95 text-white rounded-2xl font-bold shadow-lg transition active:scale-95 flex items-center justify-center space-x-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-black">
                📸
              </div>
              <div className="text-left">
                <div className="text-xs font-black">Instagram Direct</div>
                <div className="text-[10px] text-pink-100 font-normal">Копирует оффер и открывает Direct</div>
              </div>
            </button>
          </div>
        </div>

        {/* Message preview snippet */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 font-mono space-y-1">
          <div className="text-slate-500 text-[10px] font-sans font-bold uppercase">Превью текста сообщения клиенту:</div>
          <p className="line-clamp-2 italic text-slate-300">
            {offerText.substring(0, 160)}...
          </p>
        </div>
      </div>
    </div>
  );
};
