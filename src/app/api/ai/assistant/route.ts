import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const AI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
];

// Tools declarations for Gemini
const assistantTools = [
  {
    name: "search_cars",
    description: "Search cars in the fleet by criteria: brand, model, plate, class, city, price range, or status.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Search query (brand, model, plate or color), e.g. 'Escape' or 'Prius' or 'черный'" },
        carClass: { type: "STRING", description: "Car segment: ECONOMY, COMFORT, CROSSOVER, SUV, PREMIUM, CABRIO, MINIVAN" },
        cityCode: { type: "STRING", description: "City code: BUS (Batumi), TBS (Tbilisi), KUT (Kutaisi)" },
        maxDailyRate: { type: "NUMBER", description: "Maximum standard daily rate in USD" },
        status: { type: "STRING", description: "Status: AVAILABLE, RENTED, WASHING, MAINTENANCE" },
      },
    },
  },
  {
    name: "check_maintenance_and_oil",
    description: "Find all cars that have overdue oil changes, are near the service interval (<1000 km), or are blocked for maintenance.",
    parameters: {
      type: "OBJECT",
      properties: {
        onlyOverdue: { type: "BOOLEAN", description: "If true, only returns cars that have strictly exceeded the service interval" },
      },
    },
  },
  {
    name: "create_manager_task",
    description: "Create an operational task for rental managers in Tbilisi, Batumi, or Kutaisi.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Short descriptive title of the task" },
        description: { type: "STRING", description: "Detailed instructions for the manager" },
        category: {
          type: "STRING",
          description: "Task category: CLEANING (мойка), MAINTENANCE (сервис/масло), CLIENT_DELIVERY (выдача клиенту), RELOCATION (перегон), DOCUMENTS (техпаспорт/документы), FINANCE, GENERAL",
        },
        priority: {
          type: "STRING",
          description: "Priority level: URGENT, HIGH, MEDIUM, LOW",
        },
        cityCode: { type: "STRING", description: "City code where the task must be done: BUS (Batumi), TBS (Tbilisi), KUT (Kutaisi)" },
        carPlate: { type: "STRING", description: "Plate number of the car if task is car-specific, e.g. 'YY-779-NN'" },
        assignedToName: { type: "STRING", description: "Name of manager or role, e.g. 'Менеджер смены Батуми'" },
        dueInHours: { type: "NUMBER", description: "Hours from now until deadline" },
      },
      required: ["title"],
    },
  },
  {
    name: "get_fleet_analytics",
    description: "Get general fleet metrics: total cars, available vs rented, average daily rates, company margin.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "check_traffic_fines",
    description: "Check detected or unpaid traffic police fines (MVD Georgia) across the fleet or for a specific car.",
    parameters: {
      type: "OBJECT",
      properties: {
        carPlate: { type: "STRING", description: "Specific plate number to check fines for" },
      },
    },
  },
  {
    name: "get_owners_summary",
    description: "Get summary of car owners/investors (Илья, Давид, Жора, Герман и др.), their cars and daily rates.",
    parameters: {
      type: "OBJECT",
      properties: {
        ownerName: { type: "STRING", description: "Specific owner name to search" },
      },
    },
  },
  {
    name: "record_expense",
    description: "Record an operational expense (fuel, wash, maintenance, parking, fine, office, other) spent by a manager or director.",
    parameters: {
      type: "OBJECT",
      properties: {
        amount: { type: "NUMBER", description: "Expense amount" },
        currency: { type: "STRING", description: "Currency: GEL or USD (default GEL)" },
        category: {
          type: "STRING",
          description: "Category: FUEL (топливо/заправка), WASHING (мойка), MAINTENANCE (ТО/ремонт/масло), PARKING_FINES (парковка/штраф), OFFICE_RENT (офис), OTHER (прочее)",
        },
        description: { type: "STRING", description: "Purpose or details of the expense" },
        carPlate: { type: "STRING", description: "Plate number of car if expense is vehicle-related (e.g. 'YY-779-NN')" },
        managerName: { type: "STRING", description: "Employee who spent the money" },
      },
      required: ["amount", "description"],
    },
  },
];

// Tool execution logic
async function executeAssistantTool(name: string, args: any) {
  try {
    if (name === "search_cars") {
      const where: any = {};
      if (args.cityCode) {
        where.city = { code: args.cityCode.toUpperCase() };
      }
      if (args.carClass) {
        where.carClass = args.carClass.toUpperCase();
      }
      if (args.status) {
        where.status = args.status.toUpperCase();
      }
      if (args.maxDailyRate) {
        where.clientStandardDailyRate = { lte: Number(args.maxDailyRate) };
      }
      if (args.query) {
        const q = String(args.query).trim();
        where.OR = [
          { brand: { contains: q } },
          { model: { contains: q } },
          { plateNumber: { contains: q } },
          { color: { contains: q } },
        ];
      }

      const cars = await prisma.car.findMany({
        where,
        take: 15,
        include: { city: true, owner: true },
        orderBy: { clientStandardDailyRate: "asc" },
      });

      return {
        count: cars.length,
        cars: cars.map((c) => ({
          id: c.id,
          plate: c.plateNumber,
          car: `${c.brand} ${c.model} (${c.year})`,
          color: c.color,
          class: c.carClass,
          city: c.city.nameRu,
          status: c.status,
          washStatus: c.washStatus,
          rates: {
            standardUSD: c.clientStandardDailyRate,
            minUSD: c.clientMinDailyRate,
            maxUSD: c.clientMaxDailyRate,
          },
          techPassport: c.techPassportNumber || (c.hasTechPassport ? "Есть" : "Отсутствует"),
          owner: c.owner ? c.owner.fullName : "Собственный парк",
        })),
      };
    }

    if (name === "check_maintenance_and_oil") {
      const cars = await prisma.car.findMany({
        include: { city: true },
      });

      const alerts: any[] = [];
      for (const car of cars) {
        const nextOilChangeMileage = car.lastOilChangeMileage + car.oilChangeIntervalKm;
        const kmUntilOil = nextOilChangeMileage - car.currentMileage;
        const isOverdue = kmUntilOil <= 0;
        const isNear = kmUntilOil > 0 && kmUntilOil <= 1000;

        if (isOverdue || (!args.onlyOverdue && isNear) || car.status === "MAINTENANCE") {
          alerts.push({
            plate: car.plateNumber,
            car: `${car.brand} ${car.model} (${car.year})`,
            city: car.city.nameRu,
            status: car.status,
            currentMileage: car.currentMileage,
            lastOilChangeMileage: car.lastOilChangeMileage,
            kmUntilOil,
            isOverdue,
            severity: isOverdue ? "КРИТИЧНО (ПРОСРОЧЕНО)" : "СКОРО ТО",
          });
        }
      }

      return {
        totalAlerts: alerts.length,
        overdueCount: alerts.filter((a) => a.isOverdue).length,
        cars: alerts,
      };
    }

    if (name === "create_manager_task") {
      let cityId: string | undefined;
      if (args.cityCode) {
        const city = await prisma.city.findFirst({
          where: { code: args.cityCode.toUpperCase() },
        });
        if (city) cityId = city.id;
      }
      if (!cityId) {
        const defaultCity = await prisma.city.findFirst();
        cityId = defaultCity?.id;
      }

      let carId: string | undefined;
      if (args.carPlate) {
        const cleanPlate = String(args.carPlate).toUpperCase().replace(/\s+/g, "");
        const car = await prisma.car.findFirst({
          where: {
            OR: [
              { plateNumber: cleanPlate },
              { plateNumber: { contains: cleanPlate } },
            ],
          },
        });
        if (car) carId = car.id;
      }

      const dueDateTime = args.dueInHours
        ? new Date(Date.now() + Number(args.dueInHours) * 3600 * 1000)
        : new Date(Date.now() + 6 * 3600 * 1000);

      const task = await prisma.managerTask.create({
        data: {
          title: args.title,
          description: args.description || `Создано через ИИ-Ассистент для автомобиля ${args.carPlate || ""}`,
          category: args.category || "GENERAL",
          priority: args.priority || "MEDIUM",
          status: "PENDING",
          assignedToName: args.assignedToName || "Менеджер смены",
          cityId,
          carId,
          dueDateTime,
          createdByName: "ИИ-Ассистент (Руководитель)",
        },
        include: { city: true, car: true },
      });

      return {
        success: true,
        message: "Задача успешно создана в базе CRM!",
        task: {
          id: task.id,
          title: task.title,
          category: task.category,
          priority: task.priority,
          city: task.city?.nameRu,
          car: task.car ? `${task.car.brand} ${task.car.model} (${task.car.plateNumber})` : null,
          deadline: task.dueDateTime?.toLocaleString("ru-RU"),
        },
      };
    }

    if (name === "get_fleet_analytics") {
      const totalCars = await prisma.car.count();
      const available = await prisma.car.count({ where: { status: "AVAILABLE" } });
      const rented = await prisma.car.count({ where: { status: "RENTED" } });
      const maintenance = await prisma.car.count({ where: { status: "MAINTENANCE" } });
      const washing = await prisma.car.count({ where: { status: "WASHING" } });

      const cars = await prisma.car.findMany({
        select: { clientStandardDailyRate: true, defaultOwnerDailyRate: true },
      });
      const avgStdRate = totalCars > 0
        ? Math.round(cars.reduce((acc, c) => acc + c.clientStandardDailyRate, 0) / totalCars)
        : 0;
      const avgOwnerRate = totalCars > 0
        ? Math.round(cars.reduce((acc, c) => acc + c.defaultOwnerDailyRate, 0) / totalCars)
        : 0;
      const avgMargin = avgStdRate - avgOwnerRate;

      return {
        totalCars,
        statuses: { available, rented, maintenance, washing },
        financials: {
          avgStandardClientRateUSD: avgStdRate,
          avgOwnerRateUSD: avgOwnerRate,
          avgDailyMarginUSD: avgMargin,
        },
      };
    }

    if (name === "check_traffic_fines") {
      const where: any = {};
      if (args.carPlate) {
        where.car = { plateNumber: { contains: String(args.carPlate).trim().toUpperCase() } };
      }
      const fines = await prisma.trafficFine.findMany({
        where,
        take: 10,
        include: { car: true },
        orderBy: { violationDate: "desc" },
      });

      return {
        totalFound: fines.length,
        fines: fines.map((f) => ({
          protocolNumber: f.protocolNumber,
          car: f.car ? `${f.car.brand} ${f.car.model} (${f.car.plateNumber})` : "Не указан",
          amountGEL: f.amountGEL,
          amountUSD: Math.round(f.amountGEL / 2.7),
          status: f.status,
          date: f.violationDate.toISOString().split("T")[0],
          description: f.articleName || f.notes || "Нарушение ПДД",
        })),
      };
    }

    if (name === "get_owners_summary") {
      const owners = await prisma.carOwner.findMany({
        include: { cars: true },
        take: 15,
      });

      return {
        count: owners.length,
        owners: owners.map((o) => ({
          id: o.id,
          name: o.fullName,
          phone: o.phone,
          carsCount: o.cars.length,
          cars: o.cars.map((c) => `${c.brand} ${c.model} (${c.plateNumber}) [Ставка: $${c.defaultOwnerDailyRate}/д]`),
        })),
      };
    }

    if (name === "record_expense") {
      const numAmount = Number(args.amount);
      const currency = args.currency?.toUpperCase() === "USD" ? "USD" : "GEL";
      const category = args.category || "OTHER";

      let carId: string | undefined;
      let cityId: string | undefined;
      if (args.carPlate) {
        const clean = String(args.carPlate).toUpperCase().replace(/\s+/g, "");
        const car = await prisma.car.findFirst({
          where: {
            OR: [{ plateNumber: clean }, { plateNumber: { contains: clean } }],
          },
        });
        if (car) {
          carId = car.id;
          cityId = car.cityId;
        }
      }

      // Default account
      const account = (await prisma.financialAccount.findFirst({
        where: { currency },
      })) || (await prisma.financialAccount.findFirst());

      if (!account) {
        return { error: "Не найден финансовый счёт для списания" };
      }

      const expense = await prisma.expense.create({
        data: {
          accountId: account.id,
          amount: numAmount,
          currency,
          category,
          description: args.description,
          carId,
          cityId,
          managerName: args.managerName || "Менеджер",
        },
        include: { car: true, account: true },
      });

      // Decrement account balance
      await prisma.financialAccount.update({
        where: { id: account.id },
        data: { currentBalance: { decrement: numAmount } },
      });

      return {
        success: true,
        message: `Расход ${numAmount} ${currency} успешно зафиксирован и списан со счёта ${account.name}!`,
        expense: {
          id: expense.id,
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          description: expense.description,
          car: expense.car ? `${expense.car.brand} ${expense.car.model} (${expense.car.plateNumber})` : null,
          account: expense.account.name,
        },
      };
    }

    return { error: `Неизвестный инструмент: ${name}` };
  } catch (err: any) {
    console.error(`Tool ${name} execution error:`, err);
    return { error: `Ошибка при выполнении: ${err.message}` };
  }
}

const SYSTEM_PROMPT = `Ты — встроенный интеллектуальный ИИ-Ассистент (Copilot) для управляющих и менеджеров автопроката в Грузии (VSL: Тбилиси, Батуми, Кутаиси).

Твоя цель — мгновенно помогать руководителю и менеджерам с:
1. Поиском и подбором автомобилей под запросы клиентов (марки, классы, бюджет в $USD, наличие свободных машин).
2. Контролем технического состояния (межсервисные интервалы, просроченная замена масла, необходимость ТО).
3. Постановкой и контролем операционных задач для менеджеров (мойка, выдача в аэропорту, перегон авто, документы).
4. Проверкой штрафов патрульной полиции Грузии (MVD / protocol.ge).
5. Аналитикой автопарка и расчетами с владельцами (Илья, Давид, Жора, Герман и др.).

ПРАВИЛА ОТВЕТА:
- Отвечай дружелюбно, профессионально и структурированно на русском языке.
- Всегда используй подходящие эмодзи (🚗, 🔧, ✅, ⚠️, 💰, 📍).
- Выделяй госномера авто (например **YY-779-NN**) и суммы в долларах (**$50/день**) жирным шрифтом.
- Если тебя просят поставить задачу менеджеру (например "поставь задачу помыть Escape"), ОБЯЗАТЕЛЬНО вызови инструмент create_manager_task и подтверди создание задачи с указанием времени и исполнителя!
- Если тебя спрашивают о свободных авто, наличии машин или ТО — вызови соответствующий инструмент и используй реальные данные из базы.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message?.trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "Сообщение не может быть пустым" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY не задан в переменных окружения" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format conversation history
    const contents: any[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    let selectedModel = AI_MODELS[0];
    let finalAnswer = "";
    let actionResult: any = null;

    // Multi-turn tool execution loop
    for (const model of AI_MODELS) {
      try {
        let turns = 0;
        const maxTurns = 4;

        while (turns < maxTurns) {
          turns++;

          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_PROMPT,
              tools: [{ functionDeclarations: assistantTools as any }],
            },
          });

          const candidate = response.candidates?.[0];
          const modelContent = candidate?.content;

          if (!modelContent) {
            finalAnswer = response.text || "Готово.";
            break;
          }

          const functionCalls = modelContent.parts?.filter((p: any) => p.functionCall);

          if (!functionCalls || functionCalls.length === 0) {
            finalAnswer = response.text || "Ответ сформирован.";
            break;
          }

          // Push model's tool calls
          contents.push(modelContent);

          // Execute tools and push responses
          const toolResponseParts: any[] = [];
          for (const callPart of functionCalls) {
            const fn = callPart.functionCall!;
            const fnName = fn.name || "unknown";
            const result = await executeAssistantTool(fnName, fn.args);

            if (fnName === "create_manager_task" && result?.task) {
              actionResult = {
                type: "TASK_CREATED",
                task: result.task,
              };
            }

            toolResponseParts.push({
              functionResponse: {
                name: fnName,
                response: { result },
              },
            });
          }

          contents.push({
            role: "user",
            parts: toolResponseParts,
          });
        }

        selectedModel = model;
        break; // Successfully handled with this model
      } catch (modelErr: any) {
        console.warn(`Model ${model} error:`, modelErr.message);
        if (model === AI_MODELS[AI_MODELS.length - 1]) {
          throw modelErr;
        }
      }
    }

    return NextResponse.json({
      success: true,
      answer: finalAnswer,
      modelUsed: selectedModel,
      action: actionResult,
    });
  } catch (err: any) {
    console.error("AI Assistant API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Ошибка при обработке запроса ИИ-ассистентом",
      },
      { status: 500 }
    );
  }
}
