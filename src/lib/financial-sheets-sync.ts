import { JWT } from "google-auth-library";
import { getGoogleSheetsCredentials } from "./google-sheets";
import { prisma } from "./prisma";

export const FINANCIAL_SPREADSHEET_ID =
  process.env.FINANCIAL_SPREADSHEET_ID || "1W2HNSR1WDi74R55VXTk9QSRQXYXBPAsoGsXGsINqK9k";

export const FINANCIAL_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${FINANCIAL_SPREADSHEET_ID}/edit`;

export interface SyncResult {
  success: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  syncedAt: string;
  sheetsUpdated: {
    title: string;
    rowsCount: number;
  }[];
  summary: {
    totalCars: number;
    totalBookings: number;
    totalPayments: number;
    totalExpenses: number;
    totalDebts: number;
    totalCashBalancesGEL: number;
    totalCashBalancesUSD: number;
  };
  error?: string;
}

export async function getGoogleSheetsClient(): Promise<JWT | null> {
  const creds = getGoogleSheetsCredentials();
  if (!creds) return null;

  return new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

/**
 * Ensures all standard reporting sheets exist in the spreadsheet.
 */
async function ensureStandardSheets(client: JWT, spreadsheetId: string) {
  const meta = await client.request<any>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
  });
  const currentSheets: { title: string; sheetId: number }[] = (meta.data.sheets || []).map((s: any) => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
  }));

  const requiredSheets = [
    "📊 Сводка и Баланс",
    "🚗 Выдачи и Бронирования",
    "💵 Движение Денег",
    "🛠️ Расходы и Мойки",
    "📈 Показатели Автопарка",
    "⚠️ Долги Клиентов",
  ];

  const currentTitles = currentSheets.map((s) => s.title);
  const addRequests: any[] = [];

  for (const title of requiredSheets) {
    if (!currentTitles.includes(title)) {
      addRequests.push({
        addSheet: {
          properties: {
            title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 30,
            },
          },
        },
      });
    }
  }

  if (addRequests.length > 0) {
    await client.request({
      url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      method: "POST",
      data: { requests: addRequests },
    });
  }

  // Delete default empty "Лист1" or "Sheet1" if our sheets are in place
  const defaultSheet = currentSheets.find((s) => s.title === "Лист1" || s.title === "Sheet1");
  if (defaultSheet && currentTitles.length > 1) {
    try {
      await client.request({
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        method: "POST",
        data: {
          requests: [{ deleteSheet: { sheetId: defaultSheet.sheetId } }],
        },
      });
    } catch {
      // Ignore if cannot delete
    }
  }

  // Re-fetch to return map of titles to sheetIds
  const updatedMeta = await client.request<any>({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
  });
  const sheetMap: Record<string, number> = {};
  for (const s of updatedMeta.data.sheets || []) {
    sheetMap[s.properties.title] = s.properties.sheetId;
  }
  return sheetMap;
}

/**
 * Main synchronization engine: pulls all data from SQLite and pushes to Google Sheets.
 */
export async function syncAllFinancialDataToGoogleSheets(
  spreadsheetId: string = FINANCIAL_SPREADSHEET_ID
): Promise<SyncResult> {
  const client = await getGoogleSheetsClient();
  if (!client) {
    throw new Error(
      "Учетные данные сервисного аккаунта Google Sheets не найдены. Проверьте GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }

  const now = new Date();
  const syncTimestampStr = now.toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi" });

  // 1. Ensure sheets
  const sheetMap = await ensureStandardSheets(client, spreadsheetId);

  // 2. Query Prisma database in parallel
  const [cars, bookings, payments, expenses, debts, accounts] = await Promise.all([
    prisma.car.findMany({
      include: {
        city: true,
        owner: true,
      },
      orderBy: [{ city: { code: "asc" } }, { brand: "asc" }, { model: "asc" }],
    }),
    prisma.booking.findMany({
      include: {
        car: { include: { city: true, owner: true } },
        customer: true,
        pickupLocation: { include: { city: true } },
        returnLocation: { include: { city: true } },
        handoverReport: true,
        returnReport: true,
        payments: true,
        extensions: true,
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.payment.findMany({
      include: {
        booking: {
          include: {
            car: true,
            customer: true,
          },
        },
        account: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      include: {
        account: true,
        car: true,
        city: true,
        owner: true,
      },
      orderBy: { date: "desc" },
    }),
    prisma.customerDebt.findMany({
      include: {
        customer: true,
        booking: { include: { car: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.financialAccount.findMany({
      include: {
        city: true,
      },
      orderBy: [{ currency: "asc" }, { name: "asc" }],
    }),
  ]);

  // Aggregate Metrics
  let totalCashBalancesGEL = 0;
  let totalCashBalancesUSD = 0;
  for (const acc of accounts) {
    if (acc.currency === "USD") totalCashBalancesUSD += acc.currentBalance || 0;
    else totalCashBalancesGEL += acc.currentBalance || 0;
  }

  let totalRentalRevenueGEL = 0;
  let totalRentalRevenueUSD = 0;
  let totalOwnerPayouts = 0;
  for (const b of bookings) {
    if (b.currency === "USD") {
      totalRentalRevenueUSD += b.totalAmount || 0;
    } else {
      totalRentalRevenueGEL += b.totalAmount || 0;
    }
    if (b.status === "COMPLETED") {
      totalOwnerPayouts += b.ownerTotalPayout || (b.ownerDailyRate || 0) * (b.rentalDays || 0);
    }
  }

  let totalExpensesGEL = 0;
  let totalExpensesUSD = 0;
  let totalOwnerPayoutExpensesGEL = 0;
  let totalFuelExpensesGEL = 0;
  let totalWashExpensesGEL = 0;
  let totalMaintExpensesGEL = 0;
  let totalOfficeExpensesGEL = 0;
  let totalParkingFinesGEL = 0;

  for (const exp of expenses) {
    if (exp.currency === "USD") {
      totalExpensesUSD += exp.amount || 0;
    } else {
      totalExpensesGEL += exp.amount || 0;
      if (exp.category === "OWNER_PAYOUT") totalOwnerPayoutExpensesGEL += exp.amount || 0;
      else if (exp.category === "FUEL") totalFuelExpensesGEL += exp.amount || 0;
      else if (exp.category === "WASHING") totalWashExpensesGEL += exp.amount || 0;
      else if (exp.category === "MAINTENANCE") totalMaintExpensesGEL += exp.amount || 0;
      else if (exp.category === "OFFICE_RENT") totalOfficeExpensesGEL += exp.amount || 0;
      else if (exp.category === "PARKING_FINES") totalParkingFinesGEL += exp.amount || 0;
    }
  }

  let totalActiveDebtsGEL = 0;
  for (const d of debts) {
    if (d.status !== "PAID" && d.status !== "CANCELLED") {
      totalActiveDebtsGEL += (d.amount || 0) - (d.paidAmount || 0);
    }
  }

  const rentedCarsCount = cars.filter((c) => c.status === "RENTED").length;
  const availableCarsCount = cars.filter((c) => c.status === "AVAILABLE" && !c.isStopBlocked && !c.isArchived).length;
  const stopBlockedCarsCount = cars.filter((c) => c.isStopBlocked).length;
  const fleetUtilizationRate = cars.length > 0 ? Math.round((rentedCarsCount / cars.length) * 100) : 0;
  const netCompanyProfitGEL = totalRentalRevenueGEL - totalOwnerPayouts - (totalExpensesGEL - totalOwnerPayoutExpensesGEL);

  // ==========================================
  // SHEET 1: 📊 Сводка и Баланс
  // ==========================================
  const summaryValues: (string | number)[][] = [
    ["VSL АВТОПРОКАТ ГРУЗИЯ • ЕДИНЫЙ ФИНАНСОВЫЙ ОТЧЕТ И СВОДНЫЙ БАЛАНС"],
    [`Актуальность данных: ${syncTimestampStr} (Тбилиси/Батуми) • Автоматическая синхронизация RentPortal`],
    [],
    ["1. КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ (KPI)", "ЗНАЧЕНИЕ", "ВАЛЮТА / ЕД."],
    ["Всего автомобилей в автопарке", cars.length, "авто"],
    ["Автомобилей в аренде (занято)", rentedCarsCount, `авто (${fleetUtilizationRate}% утилизация)`],
    ["Свободно к выдаче", availableCarsCount, "авто"],
    ["На СТОПе / в ремонте / ТО", stopBlockedCarsCount, "авто"],
    ["Всего бронирований в системе", bookings.length, "заказов"],
    ["Суммарная выручка от аренды (GEL)", totalRentalRevenueGEL, "GEL"],
    ["Суммарная выручка от аренды (USD)", totalRentalRevenueUSD, "USD"],
    ["Начислено владельцам авто (инвесторам по завершённым арендам)", totalOwnerPayouts, "GEL"],
    ["Фактически выплачено владельцам авто (инвесторам)", totalOwnerPayoutExpensesGEL, "GEL"],
    ["Расходы: ТО, запчасти, аксессуары (люстра, балки, сервис)", totalMaintExpensesGEL, "GEL"],
    ["Расходы: Заправка топлива (бензин/дизель)", totalFuelExpensesGEL, "GEL"],
    ["Расходы: Мойки и детейлинг", totalWashExpensesGEL, "GEL"],
    ["Расходы: Офис, быт, связь", totalOfficeExpensesGEL, "GEL"],
    ["Расходы: Парковки и штрафы", totalParkingFinesGEL, "GEL"],
    ["Суммарные операционные расходы компании (без выплат инвесторам) GEL", totalExpensesGEL - totalOwnerPayoutExpensesGEL, "GEL"],
    ["Чистая операционная прибыль компании (VSL) GEL", netCompanyProfitGEL, "GEL"],
    ["Остаток средств во всех кассах и на счетах (GEL)", totalCashBalancesGEL, "GEL"],
    ["Остаток средств во всех кассах и на счетах (USD)", totalCashBalancesUSD, "USD"],
    ["Общая сумма активных долгов клиентов", totalActiveDebtsGEL, "GEL"],
    [],
    ["2. ОСТАТКИ ПО КАССАМ И БАНКОВСКИМ СЧЕТАМ КОМПАНИИ"],
    ["Счет / Касса", "Тип", "Город", "Ответственный менеджер", "Валюта", "Текущий баланс", "Номер счета / Примечание"],
  ];

  for (const acc of accounts) {
    summaryValues.push([
      acc.name,
      acc.type === "CASH" ? "Наличные (Касса)" : acc.type === "BANK_ACCOUNT" ? "Банковский счет" : acc.type === "CRYPTO_WALLET" ? "Криптокошелек" : "Эквайринг",
      acc.city?.nameRu || "Общий",
      acc.managerResponsible || "—",
      acc.currency,
      acc.currentBalance,
      acc.accountNumber || "—",
    ]);
  }

  // ==========================================
  // SHEET 2: 🚗 Выдачи и Бронирования
  // ==========================================
  const bookingsValues: (string | number)[][] = [
    [
      "№ Брони",
      "Статус",
      "Автомобиль",
      "Госномер",
      "Владелец",
      "Клиент (ФИО)",
      "Телефон",
      "Город / Точка выдачи",
      "Город / Точка возврата",
      "Дата/Время выдачи",
      "Дата/Время возврата",
      "Дней",
      "Суточный тариф",
      "Стоимость аренды",
      "Доставка/Допы",
      "Итого к оплате",
      "Валюта",
      "Залог (Депозит)",
      "Ставка владельца/день",
      "К выплате владельцу",
      "Маржа компании",
      "Пробег выдача (км)",
      "Пробег сдача (км)",
      "Топливо выдача (%)",
      "Топливо сдача (%)",
      "Менеджер выдачи",
      "Менеджер возврата",
      "Примечания",
    ],
  ];

  for (const b of bookings) {
    const ownerPayout = b.ownerTotalPayout || (b.ownerDailyRate || 0) * (b.rentalDays || 0);
    const companyMargin = (b.totalAmount || 0) - ownerPayout;

    bookingsValues.push([
      b.bookingNumber,
      b.status === "ACTIVE" ? "🚗 В аренде" : b.status === "COMPLETED" ? "✓ Завершено" : b.status === "CANCELLED" ? "✖ Отменено" : b.status,
      `${b.car.brand} ${b.car.model}`,
      b.car.plateNumber,
      b.car.owner?.fullName || "VSL Собственный",
      b.customer.fullName,
      b.customer.phone,
      `${b.pickupLocation.city.nameRu}: ${b.pickupLocation.name}`,
      `${b.returnLocation.city.nameRu}: ${b.returnLocation.name}`,
      new Date(b.startDate).toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi" }),
      new Date(b.endDate).toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi" }),
      b.rentalDays,
      b.dailyRate,
      b.rentalTotal,
      (b.deliveryFee || 0) + (b.extrasTotal || 0),
      b.totalAmount,
      b.currency,
      b.depositAmount,
      b.ownerDailyRate || b.car.defaultOwnerDailyRate || 0,
      ownerPayout,
      companyMargin,
      b.handoverReport?.mileageAtHandover || "—",
      b.returnReport?.mileageAtReturn || "—",
      b.handoverReport?.fuelLevelPercent !== undefined ? `${b.handoverReport.fuelLevelPercent}%` : "—",
      b.returnReport?.fuelLevelPercent !== undefined ? `${b.returnReport.fuelLevelPercent}%` : "—",
      b.handoverReport?.managerName || "—",
      b.returnReport?.managerName || "—",
      b.notes || "—",
    ]);
  }

  // ==========================================
  // SHEET 3: 💵 Движение Денег
  // ==========================================
  const paymentsValues: (string | number)[][] = [
    [
      "Дата и время",
      "Тип операции",
      "№ Брони",
      "Клиент (ФИО)",
      "Автомобиль",
      "Госномер",
      "Сумма",
      "Валюта",
      "Способ оплаты",
      "Касса / Счет зачисления",
      "Статус",
      "Менеджер",
      "Ожидалось",
      "Получено",
      "Сдача на возврат",
      "Примечания",
    ],
  ];

  for (const p of payments) {
    paymentsValues.push([
      new Date(p.createdAt).toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi" }),
      p.type === "RENTAL" ? "Оплата аренды" : p.type === "DEPOSIT" ? "Залог (Депозит)" : p.type === "DELIVERY" ? "Доставка авто" : p.type === "EXTRA" ? "Доп. услуги" : p.type,
      p.booking?.bookingNumber || "—",
      p.booking?.customer?.fullName || "—",
      p.booking?.car ? `${p.booking.car.brand} ${p.booking.car.model}` : "—",
      p.booking?.car?.plateNumber || "—",
      p.amount,
      p.currency,
      p.method === "CASH" ? "Наличные" : p.method === "CARD_POS" ? "Терминал POS" : p.method === "TBC_BANK" ? "TBC Bank" : p.method === "BOG_BANK" ? "Bank of Georgia" : p.method === "CRYPTO" ? "Криптовалюта USDT" : p.method,
      p.account?.name || "Основная касса",
      p.status === "PAID" ? "Оплачено" : p.status === "REFUNDED" ? "Возвращено" : p.status,
      p.managerName || "—",
      p.amountExpected || p.amount,
      p.amountReceived || p.amount,
      p.changeOnReturn || 0,
      p.notes || "—",
    ]);
  }

  // ==========================================
  // SHEET 4: 🛠️ Расходы и Мойки
  // ==========================================
  const expensesValues: (string | number)[][] = [
    [
      "Дата расхода",
      "Категория",
      "Автомобиль",
      "Госномер",
      "Город",
      "Описание расхода",
      "Сумма",
      "Валюта",
      "Касса / Счет списания",
      "На чьем балансе",
      "Менеджер",
      "Статус оплаты",
      "Чек / Квитанция",
    ],
  ];

  for (const exp of expenses) {
    const categoryName =
      exp.category === "OWNER_PAYOUT"
        ? "Выплата инвестору"
        : exp.category === "WASHING"
        ? "Мойка авто"
        : exp.category === "FUEL"
        ? "Бензин / Топливо"
        : exp.category === "MAINTENANCE"
        ? "ТО, запчасти и аксессуары"
        : exp.category === "SALARY"
        ? "Зарплата"
        : exp.category === "OFFICE_RENT"
        ? "Аренда офиса"
        : exp.category === "PARKING_FINES"
        ? "Штрафы и парковка"
        : exp.category === "MARKETING"
        ? "Реклама"
        : "Прочие расходы";

    let receiptDisplay = "—";
    if (exp.receiptPhotoUrl) {
      if (exp.receiptPhotoUrl.startsWith("http")) {
        receiptDisplay = `=HYPERLINK("${exp.receiptPhotoUrl}"; "Открыть чек ↗")`;
      } else {
        receiptDisplay = `=HYPERLINK("https://rentportal-production.up.railway.app${exp.receiptPhotoUrl}"; "Открыть чек ↗")`;
      }
    }

    expensesValues.push([
      new Date(exp.date).toLocaleDateString("ru-RU", { timeZone: "Asia/Tbilisi" }),
      categoryName,
      exp.car ? `${exp.car.brand} ${exp.car.model}` : "—",
      exp.car?.plateNumber || "—",
      exp.city?.nameRu || "—",
      exp.description,
      exp.amount,
      exp.currency,
      exp.account?.name || "Касса",
      exp.isOwnerExpense ? `Владелец (${exp.owner?.fullName || "Инвестор"})` : "Компания (VSL)",
      exp.managerName || "—",
      exp.status === "PAID" ? "Оплачено" : "Начислено",
      receiptDisplay,
    ]);
  }

  // ==========================================
  // SHEET 5: 📈 Показатели Автопарка
  // ==========================================
  const fleetValues: (string | number)[][] = [
    [
      "Госномер",
      "Марка и модель",
      "Год",
      "Цвет",
      "Город",
      "Владелец (Инвестор)",
      "Класс",
      "Текущий статус",
      "Тариф мин (GEL)",
      "Тариф станд (GEL)",
      "Тариф макс (GEL)",
      "Ставка владельца (USD)",
      "Текущий пробег (км)",
      "Интервал ТО (км)",
      "До следующего ТО (км)",
      "Техпаспорт (номер)",
      "Скан техпаспорта",
      "Техосмотр (PTI) до",
      "Статус техосмотра",
      "Страховка КАСКО до",
      "Парковка Батуми",
      "GPS абонплата (10 GEL)",
      "СТОП-блокировка",
      "Причина СТОПа",
    ],
  ];

  for (const car of cars) {
    const kmUntilOil = car.lastOilChangeMileage + car.oilChangeIntervalKm - car.currentMileage;
    fleetValues.push([
      car.plateNumber,
      `${car.brand} ${car.model}`,
      car.year,
      car.color || "—",
      car.city?.nameRu || "—",
      car.owner?.fullName || "VSL Собственный",
      car.carClass,
      car.isArchived
        ? "Архив"
        : car.isStopBlocked
        ? "⛔ СТОП"
        : car.status === "RENTED"
        ? "🚗 В аренде"
        : car.status === "AVAILABLE"
        ? "🟢 Свободен"
        : car.status,
      car.clientMinDailyRate,
      car.clientStandardDailyRate,
      car.clientMaxDailyRate,
      car.defaultOwnerDailyRate,
      car.currentMileage,
      car.oilChangeIntervalKm,
      kmUntilOil,
      car.techPassportNumber || (car.hasTechPassport ? "В наличии" : "Нет"),
      car.techPassportFrontUrl ? "Скан загружен" : "Нет скана",
      car.inspectionExpiryDate ? new Date(car.inspectionExpiryDate).toLocaleDateString("ru-RU") : "—",
      car.inspectionStatus === "VALID" ? "Действует" : car.inspectionStatus === "EXPIRED" ? "Истек" : "—",
      car.insuranceExpiryDate ? new Date(car.insuranceExpiryDate).toLocaleDateString("ru-RU") : "—",
      car.hasBatumiParking ? "Есть абонемент" : "Нет",
      car.hasGpsTracker ? "10 GEL / мес" : "Нет",
      car.isStopBlocked ? "Да (Заблокирован)" : "Нет",
      car.stopReason || "—",
    ]);
  }

  // ==========================================
  // SHEET 6: ⚠️ Долги Клиентов
  // ==========================================
  const debtsValues: (string | number)[][] = [
    [
      "Дата фиксации",
      "Клиент (ФИО)",
      "Телефон",
      "Автомобиль",
      "Госномер",
      "№ Брони",
      "Категория долга",
      "Описание задолженности",
      "Сумма долга",
      "Погашено",
      "Остаток задолженности",
      "Валюта",
      "Статус",
      "Обещанный срок",
      "Создал менеджер",
      "Примечания",
    ],
  ];

  for (const d of debts) {
    const categoryName =
      d.category === "FINES"
        ? "Штрафы ПДД"
        : d.category === "DAMAGE"
        ? "Повреждения / Царапины"
        : d.category === "FUEL"
        ? "Нехватка топлива"
        : d.category === "RENTAL"
        ? "Продление / Аренда"
        : d.category === "WASH"
        ? "Мойка авто"
        : "Общий долг";

    debtsValues.push([
      new Date(d.createdAt).toLocaleDateString("ru-RU", { timeZone: "Asia/Tbilisi" }),
      d.customer.fullName,
      d.customer.phone,
      d.booking?.car ? `${d.booking.car.brand} ${d.booking.car.model}` : "—",
      d.carPlate || d.booking?.car?.plateNumber || "—",
      d.booking?.bookingNumber || "—",
      categoryName,
      d.description,
      d.amount,
      d.paidAmount,
      d.amount - d.paidAmount,
      d.currency,
      d.status === "ACTIVE" ? "🔴 Не оплачен" : d.status === "PARTIALLY_PAID" ? "🟡 Частично" : "🟢 Погашен",
      d.dueDate ? new Date(d.dueDate).toLocaleDateString("ru-RU") : "—",
      d.createdByName,
      d.notes || "—",
    ]);
  }

  // 3. Batch clear & update all sheets values
  const payloadData = [
    { range: "'📊 Сводка и Баланс'!A1:Z500", values: summaryValues },
    { range: "'🚗 Выдачи и Бронирования'!A1:AC1000", values: bookingsValues },
    { range: "'💵 Движение Денег'!A1:P1000", values: paymentsValues },
    { range: "'🛠️ Расходы и Мойки'!A1:M1000", values: expensesValues },
    { range: "'📈 Показатели Автопарка'!A1:X500", values: fleetValues },
    { range: "'⚠️ Долги Клиентов'!A1:P500", values: debtsValues },
  ];

  // Clear previous ranges first to prevent ghost rows
  await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    method: "POST",
    data: {
      ranges: [
        "'📊 Сводка и Баланс'!A1:Z500",
        "'🚗 Выдачи и Бронирования'!A1:AC1000",
        "'💵 Движение Денег'!A1:P1000",
        "'🛠️ Расходы и Мойки'!A1:M1000",
        "'📈 Показатели Автопарка'!A1:X500",
        "'⚠️ Долги Клиентов'!A1:P500",
      ],
    },
  });

  // Write new data
  await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    method: "POST",
    data: {
      valueInputOption: "USER_ENTERED",
      data: payloadData,
    },
  });

  // 4. Apply beautiful header formatting & frozen rows
  const formatRequests: any[] = [];
  for (const [title, sheetId] of Object.entries(sheetMap)) {
    if (title === "📊 Сводка и Баланс") {
      // Freeze row 3
      formatRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 4 },
          },
          fields: "gridProperties.frozenRowCount",
        },
      });
    } else {
      // Freeze row 1 for tables
      formatRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: "gridProperties.frozenRowCount",
        },
      });
      // Bold and dark background for header row
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 30,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.08, green: 0.12, blue: 0.2 },
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true,
                fontSize: 10,
              },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      });
    }
  }

  if (formatRequests.length > 0) {
    try {
      await client.request({
        url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        method: "POST",
        data: { requests: formatRequests },
      });
    } catch (e: any) {
      console.warn("Formatting failed (non-critical):", e.message);
    }
  }

  return {
    success: true,
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    syncedAt: syncTimestampStr,
    sheetsUpdated: [
      { title: "📊 Сводка и Баланс", rowsCount: summaryValues.length },
      { title: "🚗 Выдачи и Бронирования", rowsCount: bookingsValues.length },
      { title: "💵 Движение Денег", rowsCount: paymentsValues.length },
      { title: "🛠️ Расходы и Мойки", rowsCount: expensesValues.length },
      { title: "📈 Показатели Автопарка", rowsCount: fleetValues.length },
      { title: "⚠️ Долги Клиентов", rowsCount: debtsValues.length },
    ],
    summary: {
      totalCars: cars.length,
      totalBookings: bookings.length,
      totalPayments: payments.length,
      totalExpenses: expenses.length,
      totalDebts: debts.length,
      totalCashBalancesGEL,
      totalCashBalancesUSD,
    },
  };
}

/**
 * Asynchronously triggers financial sheets sync in background without blocking API responses.
 */
export function triggerAsyncFinancialSheetsSync() {
  setImmediate(async () => {
    try {
      await syncAllFinancialDataToGoogleSheets();
      console.log("[Google Sheets Backup] Financial data synced successfully in background.");
    } catch (err: any) {
      console.error("[Google Sheets Backup] Background sync error:", err.message);
    }
  });
}
