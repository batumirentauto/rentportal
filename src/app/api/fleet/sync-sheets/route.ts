import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchSpreadsheetRows } from "@/lib/google-sheets";

const DEFAULT_SPREADSHEET_ID = "1ubi7CJ4PvUyN4rnZda5UfAiVJaVriOcLrqBMtwF-MNA";

function parseCarTitle(title: string) {
  let brand = "Toyota";
  let model = "Car";
  let carClass = "COMFORT";
  let defaultPrice = 50;
  let color = "Белый";
  let year = 2020;
  let ownerName: string | null = null;

  const t = title.toLowerCase();

  // Owners
  if (t.includes("илья")) ownerName = "Илья";
  else if (t.includes("давид")) ownerName = "Давид";
  else if (t.includes("жорин") || t.includes("жора")) ownerName = "Жора";
  else if (t.includes("герман")) ownerName = "Герман";
  else if (t.includes("вахо")) ownerName = "Вахо";

  // Colors
  if (t.includes("бел")) color = "Белый";
  else if (t.includes("голуб")) color = "Голубой";
  else if (t.includes("желт")) color = "Желтый";
  else if (t.includes("изумруд")) color = "Изумрудный";
  else if (t.includes("черн")) color = "Черный";
  else if (t.includes("серебр")) color = "Серебристый";
  else if (t.includes("красн")) color = "Красный";
  else if (t.includes("син")) color = "Синий";
  else if (t.includes("сер")) color = "Серый";

  // Year detection
  const yearMatch = title.match(/(201\d|202\d)/) || title.match(/'(\d{2})/);
  if (yearMatch) {
    year = yearMatch[1].length === 2 ? 2000 + parseInt(yearMatch[1], 10) : parseInt(yearMatch[1], 10);
  }

  // Model & Brand
  if (t.includes("эскейп") || t.includes("escape")) {
    brand = "Ford"; model = "Escape"; carClass = "CROSSOVER"; defaultPrice = 45;
  } else if (t.includes("prius") || t.includes("приус")) {
    brand = "Toyota"; model = t.includes(" v") ? "Prius V" : "Prius"; carClass = "ECONOMY"; defaultPrice = 35;
  } else if (t.includes("corolla") || t.includes("королла")) {
    brand = "Toyota"; model = "Corolla"; carClass = "ECONOMY"; defaultPrice = 40;
  } else if (t.includes("renegade")) {
    brand = "Jeep"; model = "Renegade"; carClass = "CROSSOVER"; defaultPrice = 50;
  } else if (t.includes("lexus es")) {
    brand = "Lexus"; model = "ES 300h"; carClass = "PREMIUM"; defaultPrice = 75;
  } else if (t.includes("lexus rx")) {
    brand = "Lexus"; model = "RX 350"; carClass = "PREMIUM"; defaultPrice = 85;
  } else if (t.includes("outlander")) {
    brand = "Mitsubishi"; model = "Outlander"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("highlander")) {
    brand = "Toyota"; model = "Highlander"; carClass = "SUV"; defaultPrice = 80;
  } else if (t.includes("bmw 325")) {
    brand = "BMW"; model = "325d"; carClass = "PREMIUM"; defaultPrice = 65;
  } else if (t.includes("bmw x3")) {
    brand = "BMW"; model = "X3"; carClass = "PREMIUM"; defaultPrice = 85;
  } else if (t.includes("bmw x5")) {
    brand = "BMW"; model = "X5"; carClass = "PREMIUM"; defaultPrice = 110;
  } else if (t.includes("fusion") || t.includes("фьюжн")) {
    brand = "Ford"; model = "Fusion"; carClass = "COMFORT"; defaultPrice = 40;
  } else if (t.includes("compass")) {
    brand = "Jeep"; model = "Compass"; carClass = "CROSSOVER"; defaultPrice = 48;
  } else if (t.includes("patriot")) {
    brand = "Jeep"; model = "Patriot"; carClass = "CROSSOVER"; defaultPrice = 42;
  } else if (t.includes("tiguan")) {
    brand = "Volkswagen"; model = "Tiguan"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("palisade")) {
    brand = "Hyundai"; model = "Palisade"; carClass = "SUV"; defaultPrice = 95;
  } else if (t.includes("crosstrek")) {
    brand = "Subaru"; model = "Crosstrek"; carClass = "CROSSOVER"; defaultPrice = 50;
  } else if (t.includes("touareg")) {
    brand = "Volkswagen"; model = "Touareg"; carClass = "SUV"; defaultPrice = 85;
  } else if (t.includes("velar")) {
    brand = "Land Rover"; model = "Range Rover Velar"; carClass = "PREMIUM"; defaultPrice = 120;
  } else if (t.includes("range rover")) {
    brand = "Land Rover"; model = "Range Rover Sport"; carClass = "PREMIUM"; defaultPrice = 110;
  } else if (t.includes("cx5") || t.includes("cx-5")) {
    brand = "Mazda"; model = "CX-5"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("авалон") || t.includes("avalon")) {
    brand = "Toyota"; model = "Avalon"; carClass = "COMFORT"; defaultPrice = 55;
  } else if (t.includes("forester")) {
    brand = "Subaru"; model = "Forester"; carClass = "CROSSOVER"; defaultPrice = 50;
  } else if (t.includes("jetta")) {
    brand = "Volkswagen"; model = "Jetta"; carClass = "ECONOMY"; defaultPrice = 40;
  } else if (t.includes("c350") || t.includes("mercedes")) {
    brand = "Mercedes-Benz"; model = "C 350"; carClass = "PREMIUM"; defaultPrice = 65;
  } else if (t.includes("fiat 500")) {
    brand = "Fiat"; model = "500 Cabrio"; carClass = "CABRIO"; defaultPrice = 50;
  } else if (t.includes("wrangler")) {
    brand = "Jeep"; model = "Wrangler"; carClass = "SUV"; defaultPrice = 90;
  } else if (t.includes("audi a4")) {
    brand = "Audi"; model = "A4"; carClass = "COMFORT"; defaultPrice = 55;
  } else if (t.includes("audi q7")) {
    brand = "Audi"; model = "Q7"; carClass = "PREMIUM"; defaultPrice = 95;
  } else if (t.includes("audi tt")) {
    brand = "Audi"; model = "TT"; carClass = "CABRIO"; defaultPrice = 65;
  } else if (t.includes("accord")) {
    brand = "Honda"; model = "Accord"; carClass = "COMFORT"; defaultPrice = 48;
  } else if (t.includes("accent")) {
    brand = "Hyundai"; model = "Accent"; carClass = "ECONOMY"; defaultPrice = 35;
  } else if (t.includes("cooper")) {
    brand = "Mini"; model = "Cooper S"; carClass = "COMFORT"; defaultPrice = 55;
  } else if (t.includes("giulia")) {
    brand = "Alfa Romeo"; model = "Giulia"; carClass = "PREMIUM"; defaultPrice = 75;
  } else if (t.includes("outback")) {
    brand = "Subaru"; model = "Outback"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("maserati")) {
    brand = "Maserati"; model = "Ghibli"; carClass = "PREMIUM"; defaultPrice = 130;
  } else if (t.includes("rav4")) {
    brand = "Toyota"; model = "RAV4"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("venza")) {
    brand = "Toyota"; model = "Venza"; carClass = "CROSSOVER"; defaultPrice = 60;
  } else if (t.includes("sienna")) {
    brand = "Toyota"; model = "Sienna"; carClass = "MINIVAN"; defaultPrice = 75;
  } else if (t.includes("mazda 6")) {
    brand = "Mazda"; model = "6"; carClass = "COMFORT"; defaultPrice = 48;
  } else if (t.includes("mazda 3")) {
    brand = "Mazda"; model = "3"; carClass = "ECONOMY"; defaultPrice = 42;
  } else if (t.includes("passat")) {
    brand = "Volkswagen"; model = "Passat"; carClass = "COMFORT"; defaultPrice = 45;
  } else if (t.includes("elantra")) {
    brand = "Hyundai"; model = "Elantra"; carClass = "ECONOMY"; defaultPrice = 40;
  } else if (t.includes("trailblazer")) {
    brand = "Chevrolet"; model = "Trailblazer"; carClass = "CROSSOVER"; defaultPrice = 55;
  } else if (t.includes("tesla")) {
    brand = "Tesla"; model = "Model 3"; carClass = "PREMIUM"; defaultPrice = 85;
  } else if (t.includes("caravan")) {
    brand = "Dodge"; model = "Grand Caravan"; carClass = "MINIVAN"; defaultPrice = 65;
  }

  return { brand, model, year, color, carClass, defaultPrice, ownerName };
}

function cleanPlate(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // If standard 2-letters 3-digits 2-letters (e.g. YY779NN)
  if (/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(clean)) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}`;
  }
  return clean;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get("spreadsheetId") || DEFAULT_SPREADSHEET_ID;
    const range = searchParams.get("range") || "Брони!A1:Z100";

    const result = await fetchSpreadsheetRows(spreadsheetId, range);
    return NextResponse.json({
      success: true,
      source: result.source,
      serviceAccount: result.serviceAccountEmail,
      rowCount: result.rows.length,
      sampleRows: result.rows.slice(0, 8),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to fetch spreadsheet",
      },
      { status: 400 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const spreadsheetId = body.spreadsheetId || DEFAULT_SPREADSHEET_ID;
    const range = body.range || "Брони!A1:Z150";

    const { rows } = await fetchSpreadsheetRows(spreadsheetId, range);

    if (!rows || rows.length < 2) {
      return NextResponse.json({
        success: false,
        error: "Таблица пуста или содержит только строку заголовков.",
      });
    }

    // Find header row (either row 0 or row 1)
    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
      const joined = (rows[r] || []).join(" ").toLowerCase();
      if (joined.includes("авто") || joined.includes("госномер") || joined.includes("номер")) {
        headerRowIdx = r;
        break;
      }
    }

    const headers = rows[headerRowIdx].map((h: string) => h.toLowerCase().trim());

    const findCol = (...keywords: string[]): number => {
      return headers.findIndex((h: string) =>
        keywords.some((kw) => h === kw || h.includes(kw))
      );
    };

    const colCarTitle = findCol("авто", "машина", "автомобиль", "car");
    const colPlate = findCol("госномер", "гос номер", "гос. номер", "номер авто", "номер", "plate");
    const colTechPass = findCol("техпаспорт", "тп", "techpassport", "номер тп", "номер техпаспорта");
    const colMileage = findCol("пробег", "км", "mileage", "km");
    const colVin = findCol("vin", "вин", "номер кузова");
    const colYear = findCol("год", "year", "выпуск", "uj", "год выпуска");
    const colColor = findCol("цвет", "color");
    const colCity = findCol("город", "city", "локация");
    const colPriceStd = findCol("цена", "тариф", "сутки", "стандарт", "standard rate", "цена в сутки");
    const colOwner = findCol("владелец", "хозяин", "инвестор", "owner", "собственник");
    const colOwnerRate = findCol("ставка владельца", "ставка инвестора", "выплата владельцу", "owner rate");

    // Fetch existing cities
    const cities = await prisma.city.findMany();
    const defaultCityId = cities[0]?.id || "BUS";

    const syncedCars: any[] = [];
    let createdCount = 0;
    let updatedCount = 0;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const rawPlate = colPlate !== -1 ? row[colPlate]?.trim() : "";
      if (!rawPlate) continue;

      const plateNumber = cleanPlate(rawPlate);
      const rawTitle = colCarTitle !== -1 ? row[colCarTitle]?.trim() : "";
      const techPassportNumber = colTechPass !== -1 ? row[colTechPass]?.trim().toUpperCase() : null;
      const rawMileage = colMileage !== -1 && row[colMileage] ? parseInt(row[colMileage].replace(/\D/g, ""), 10) : null;
      const vin = colVin !== -1 && row[colVin] ? row[colVin].trim().toUpperCase() : null;
      const rawYear = colYear !== -1 && row[colYear] ? parseInt(row[colYear].replace(/\D/g, ""), 10) : null;
      const rawColor = colColor !== -1 && row[colColor] ? row[colColor].trim() : null;

      const parsed = parseCarTitle(rawTitle);

      const brand = parsed.brand;
      const model = parsed.model;
      const year = (rawYear && rawYear > 1990 && rawYear < 2030) ? rawYear : parsed.year;
      const color = rawColor || parsed.color;
      const carClass = parsed.carClass;
      const currentMileage = rawMileage && rawMileage > 0 ? rawMileage : 45000;
      
      const priceStd = colPriceStd !== -1 && row[colPriceStd]
        ? parseFloat(row[colPriceStd].replace(/[^0-9.]/g, "")) || parsed.defaultPrice
        : parsed.defaultPrice;
      const priceMin = Math.round(priceStd * 0.8);
      const priceMax = Math.round(priceStd * 1.3);

      const ownerRate = colOwnerRate !== -1 && row[colOwnerRate]
        ? parseFloat(row[colOwnerRate].replace(/[^0-9.]/g, "")) || Math.round(priceStd * 0.5)
        : Math.round(priceStd * 0.5);

      const ownerName = (colOwner !== -1 && row[colOwner]?.trim()) || parsed.ownerName;

      // Handle owner relation
      let ownerId: string | null = null;
      if (ownerName) {
        let owner = await prisma.carOwner.findFirst({
          where: { fullName: ownerName },
        });
        if (!owner) {
          owner = await prisma.carOwner.create({
            data: {
              fullName: ownerName,
              phone: "+995-500-00-00",
              payoutCurrency: "USD",
            },
          });
        }
        ownerId = owner.id;
      }

      // City matching
      let cityId = defaultCityId;
      if (colCity !== -1 && row[colCity]) {
        const cityName = row[colCity].trim().toLowerCase();
        const found = cities.find(
          (c) =>
            c.name.toLowerCase().includes(cityName) ||
            c.nameRu.toLowerCase().includes(cityName) ||
            c.code.toLowerCase() === cityName
        );
        if (found) cityId = found.id;
      }

      // Upsert car in database
      const existing = await prisma.car.findFirst({
        where: {
          OR: [
            { plateNumber },
            { plateNumber: rawPlate.toUpperCase().replace(/\s+/g, "") },
          ],
        },
      });

      if (existing) {
        const updated = await prisma.car.update({
          where: { id: existing.id },
          data: {
            plateNumber, // normalize
            brand,
            model,
            year,
            color,
            carClass,
            hasTechPassport: !!techPassportNumber,
            ...(techPassportNumber ? { techPassportNumber } : {}),
            ...(vin ? { vin } : {}),
            ...(rawMileage ? { currentMileage } : {}),
            clientStandardDailyRate: priceStd,
            clientMinDailyRate: priceMin,
            clientMaxDailyRate: priceMax,
            defaultOwnerDailyRate: ownerRate,
            ...(ownerId ? { ownerId } : {}),
            pricingNotes: rawTitle !== `${brand} ${model}` ? rawTitle : existing.pricingNotes,
          },
        });
        updatedCount++;
        syncedCars.push(updated);
      } else {
        const created = await prisma.car.create({
          data: {
            plateNumber,
            brand,
            model,
            year,
            color,
            carClass,
            currentMileage,
            vin,
            status: "AVAILABLE",
            washStatus: "CLEAN",
            hasTechPassport: !!techPassportNumber,
            techPassportNumber,
            clientStandardDailyRate: priceStd,
            clientMinDailyRate: priceMin,
            clientMaxDailyRate: priceMax,
            defaultOwnerDailyRate: ownerRate,
            ownerId,
            cityId,
            pricingNotes: rawTitle,
          },
        });
        createdCount++;
        syncedCars.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      totalRowsProcessed: rows.length - (headerRowIdx + 1),
      createdCount,
      updatedCount,
      totalSynced: syncedCars.length,
      syncedCars: syncedCars.map((c) => ({
        id: c.id,
        plateNumber: c.plateNumber,
        car: `${c.brand} ${c.model} (${c.year})`,
        techPassport: c.techPassportNumber || "—",
        rate: c.clientStandardDailyRate,
      })),
    });
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Ошибка при синхронизации с Google Таблицей",
      },
      { status: 500 }
    );
  }
}
