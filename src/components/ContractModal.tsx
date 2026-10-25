import React from "react";
import { X, Printer, CheckCircle, FileText, ShieldCheck } from "lucide-react";

interface ContractModalProps {
  booking: any;
  onClose: () => void;
}

export const ContractModal: React.FC<ContractModalProps> = ({ booking, onClose }) => {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const startDateFormatted = new Date(booking.startDate).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const endDateFormatted = new Date(booking.endDate).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:rounded-none">
        {/* Modal Top Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold">
              Договор аренды авто № {booking.bookingNumber}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs shadow transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Печать (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Contract Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm font-sans print:p-4 print:text-[11px] leading-relaxed">
          {/* Header of Contract */}
          <div className="border-b pb-4 text-center">
            <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900">
              ДОГОВОР АРЕНДЫ ТРАНСПОРТНОГО СРЕДСТВА / VEHICLE RENTAL AGREEMENT
            </h1>
            <p className="text-slate-500 mt-1">
              г. {booking.car.city.nameRu} (Грузия) • Дата заключения: {new Date().toLocaleDateString("ru-RU")}
            </p>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-amber-700">
                1. АРЕНДОДАТЕЛЬ (КОМПАНИЯ)
              </h3>
              <p><strong>ООО «VSL GEORGIA»</strong></p>
              <p>Код компании (Tax ID): 405991823</p>
              <p>Юр. адрес: Грузия, г. Тбилиси, ул. Руставели 24</p>
              <p>Филиалы: Тбилиси • Батуми • Кутаиси</p>
              <p>Телефон диспетчерской: +995 (599) 00-11-22</p>
            </div>
            <div>
              <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-amber-700">
                2. АРЕНДАТОР (КЛИЕНТ)
              </h3>
              <p><strong>ФИО:</strong> {booking.customer.fullName}</p>
              <p><strong>Паспорт:</strong> {booking.customer.passportNumber} ({booking.customer.passportCountry || "Международный"})</p>
              <p><strong>Водительское удостоверение:</strong> {booking.customer.driverLicenseNumber}</p>
              <p><strong>Телефон:</strong> {booking.customer.phone}</p>
              {booking.customer.whatsapp && <p><strong>WhatsApp:</strong> {booking.customer.whatsapp}</p>}
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              3. ПРЕДМЕТ ДОГОВОРА (ДАННЫЕ АВТОМОБИЛЯ)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white text-xs">
              <div>
                <span className="text-slate-500 block">Марка и Модель:</span>
                <span className="font-bold">{booking.car.brand} {booking.car.model} ({booking.car.year})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Гос. номер Грузии:</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{booking.car.plateNumber}</span>
              </div>
              <div>
                <span className="text-slate-500 block">VIN-номер:</span>
                <span className="font-mono">{booking.car.vin || "Проверен"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Цвет / Топливо:</span>
                <span>{booking.car.color || "Белый"} / {booking.car.fuelType}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Текущий одометр:</span>
                <span className="font-bold">{booking.car.currentMileage.toLocaleString()} км</span>
              </div>
              <div>
                <span className="text-slate-500 block">Уровень топлива:</span>
                <span className="font-bold">{booking.car.currentFuelPerc}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Техпаспорт в салоне:</span>
                <span className="text-emerald-700 font-semibold">Имеется в оригинале</span>
              </div>
              <div>
                <span className="text-slate-500 block">Город приписки:</span>
                <span className="font-semibold">{booking.car.city.nameRu}</span>
              </div>
            </div>
          </div>

          {/* Rental Period & Conditions */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              4. СРОКИ И ЛОКАЦИИ АРЕНДЫ
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 text-xs">
              <div>
                <span className="text-slate-500 block">Начало аренды (Выдача):</span>
                <p className="font-bold text-slate-900">{startDateFormatted}</p>
                <p className="text-slate-600">{booking.pickupLocation.name} ({booking.pickupAddress || "Адрес по заявке"})</p>
              </div>
              <div>
                <span className="text-slate-500 block">Окончание аренды (Возврат):</span>
                <p className="font-bold text-slate-900">{endDateFormatted}</p>
                <p className="text-slate-600">{booking.returnLocation.name} ({booking.returnAddress || "Офис возврата"})</p>
              </div>
            </div>
          </div>

          {/* Financial Calculation */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
              5. РАСЧЁТ СТОИМОСТИ И ДЕПОЗИТ (ТАРИФ)
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b">
                <span>Арендная плата за {booking.rentalDays} дн. (по ${booking.dailyRate}/день):</span>
                <span className="font-semibold">${booking.rentalTotal}</span>
              </div>
              {booking.deliveryFee > 0 && (
                <div className="flex justify-between py-1 border-b">
                  <span>Доставка автомобиля / Междугородний сбор:</span>
                  <span className="font-semibold">${booking.deliveryFee}</span>
                </div>
              )}
              {booking.extrasTotal > 0 && (
                <div className="flex justify-between py-1 border-b">
                  <span>Дополнительное оборудование (кресло, держатель, кабели):</span>
                  <span className="font-semibold">${booking.extrasTotal}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 font-bold text-sm text-slate-900 border-b-2 border-slate-900">
                <span>ИТОГО К ОПЛАТЕ:</span>
                <span>${booking.totalAmount} ({booking.currency})</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700 bg-amber-50 px-2 rounded">
                <span className="font-semibold">СУММА ГАРАНТИЙНОГО ДЕПОЗИТА (ЗАЛОГ):</span>
                <span className="font-bold">${booking.depositAmount} USD / эквивалент в GEL</span>
              </div>
            </div>
          </div>

          {/* Rules in Georgia */}
          <div className="space-y-2 text-[11px] text-slate-600">
            <h4 className="font-bold text-slate-800 uppercase">6. ВАЖНЫЕ УСЛОВИЯ ЭКСПЛУАТАЦИИ В ГРУЗИИ:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li>Разрешенное передвижение: по всем дорогам общего пользования Грузии. Запрещен выезд на оккупированные территории (Абхазия, Цхинвальский регион), а также перевал в Тушети (Омало) без отдельного согласования.</li>
              <li>Топливо: автомобиль выдается с уровнем {booking.car.currentFuelPerc}% и возвращается с аналогичным уровнем топлива.</li>
              <li>Чистота: авто возвращается в чистом виде либо оплачивается мойка (25 GEL).</li>
              <li>Все штрафы видеофиксации (патентная полиция МВД Грузии) и платные муниципальные парковки оплачиваются Арендатором.</li>
              <li>Депозит возвращается в полном объеме при возврате автомобиля в исходном состоянии.</li>
            </ul>
          </div>

          {/* Signatures */}
          <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-300">
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold">АРЕНДОДАТЕЛЬ (VSL):</p>
              <p className="text-[10px] text-slate-500 mt-6">М.П. / Подпись менеджера</p>
            </div>
            <div className="border-t border-slate-400 pt-2 text-center">
              <p className="font-bold">АРЕНДАТОР (КЛИЕНТ):</p>
              <p className="text-[10px] text-slate-500 mt-6">{booking.customer.fullName} / Подпись</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t flex justify-end space-x-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Закрыть
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Печать договора</span>
          </button>
        </div>
      </div>
    </div>
  );
};
