import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database for Georgia Car Rental...");

  // Clean up
  await prisma.expense.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.financialAccount.deleteMany();
  await prisma.handoverReport.deleteMany();
  await prisma.bookingExtra.deleteMany();
  await prisma.carWashTask.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.car.deleteMany();
  await prisma.location.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.city.deleteMany();

  // 1. Cities
  const tbilisi = await prisma.city.create({
    data: {
      name: "Tbilisi",
      nameRu: "Тбилиси",
      nameKa: "თბილისი",
      code: "TBS",
    },
  });

  const batumi = await prisma.city.create({
    data: {
      name: "Batumi",
      nameRu: "Батуми",
      nameKa: "ბათუმი",
      code: "BUS",
    },
  });

  const kutaisi = await prisma.city.create({
    data: {
      name: "Kutaisi",
      nameRu: "Кутаиси",
      nameKa: "ქუთაისი",
      code: "KUT",
    },
  });

  // 2. Locations
  const tbsOffice = await prisma.location.create({
    data: {
      cityId: tbilisi.id,
      name: "Офис Тбилиси (пр. Руставели, 24)",
      type: "OFFICE",
      address: "Тбилиси, проспект Руставели, 24",
    },
  });

  const tbsAirport = await prisma.location.create({
    data: {
      cityId: tbilisi.id,
      name: "Аэропорт Тбилиси (TBS им. Шота Руставели)",
      type: "AIRPORT",
      address: "Международный аэропорт Тбилиси",
    },
  });

  const busOffice = await prisma.location.create({
    data: {
      cityId: batumi.id,
      name: "Офис Батуми (ул. Зураба Горгиладзе, 54)",
      type: "OFFICE",
      address: "Батуми, ул. Горгиладзе, 54",
    },
  });

  const busAirport = await prisma.location.create({
    data: {
      cityId: batumi.id,
      name: "Аэропорт Батуми (BUS Александр Картвели)",
      type: "AIRPORT",
      address: "Международный аэропорт Батуми",
    },
  });

  const kutOffice = await prisma.location.create({
    data: {
      cityId: kutaisi.id,
      name: "Офис Кутаиси (ул. Церетели, 12)",
      type: "OFFICE",
      address: "Кутаиси, ул. Церетели, 12",
    },
  });

  const kutAirport = await prisma.location.create({
    data: {
      cityId: kutaisi.id,
      name: "Аэропорт Кутаиси (KUT Давид Строитель)",
      type: "AIRPORT",
      address: "Международный аэропорт Кутаиси",
    },
  });

  // 3. Cars
  const rav4 = await prisma.car.create({
    data: {
      plateNumber: "TB-742-GE",
      vin: "JTMBFREV2MD129841",
      brand: "Toyota",
      model: "RAV4 4x4",
      year: 2022,
      color: "Белый перламутр",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L",
      currentMileage: 48200,
      currentFuelPerc: 100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: tbilisi.id,
    },
  });

  const tucson = await prisma.car.create({
    data: {
      plateNumber: "BA-918-GE",
      vin: "KM8J33A46NU918234",
      brand: "Hyundai",
      model: "Tucson",
      year: 2023,
      color: "Темно-серый",
      transmission: "AUTOMATIC",
      fuelType: "HYBRID",
      engineVolume: "1.6T Hybrid",
      currentMileage: 29500,
      currentFuelPerc: 85,
      status: "AVAILABLE",
      washStatus: "NEEDS_WASH",
      hasTechPassport: true,
      cityId: batumi.id,
    },
  });

  const camry = await prisma.car.create({
    data: {
      plateNumber: "TB-305-GE",
      vin: "4T1B11HK5MU305882",
      brand: "Toyota",
      model: "Camry SE",
      year: 2021,
      color: "Черный",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L",
      currentMileage: 64100,
      currentFuelPerc: 100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: tbilisi.id,
    },
  });

  const sportage = await prisma.car.create({
    data: {
      plateNumber: "KU-551-GE",
      vin: "KNDPB3A84M7551092",
      brand: "Kia",
      model: "Sportage",
      year: 2022,
      color: "Серебристый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.0L",
      currentMileage: 38700,
      currentFuelPerc: 90,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: kutaisi.id,
    },
  });

  // 4. Customers
  const customer1 = await prisma.customer.create({
    data: {
      fullName: "Алексей Смирнов",
      phone: "+995 599 123 456",
      whatsapp: "+7 916 555 0192",
      telegram: "@alex_smirnov",
      email: "alex.smirnov@example.com",
      passportNumber: "75 14 982143",
      passportCountry: "Kazakhstan / International",
      driverLicenseNumber: "99 23 881204",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      fullName: "David Melikadze",
      phone: "+995 577 987 654",
      whatsapp: "+995 577 987 654",
      email: "david.m@tbc.ge",
      passportNumber: "01024089912",
      passportCountry: "Georgia",
      driverLicenseNumber: "GEO-DL-984210",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      fullName: "Elena Hoffmann",
      phone: "+49 170 882 1944",
      whatsapp: "+49 170 882 1944",
      telegram: "@elena_de",
      email: "elena.hoffmann@berlin.de",
      passportNumber: "C39811200",
      passportCountry: "Germany",
      driverLicenseNumber: "B072R8991X",
    },
  });

  // 5. Bookings
  const today = new Date();
  
  const booking1Start = new Date(today);
  booking1Start.setHours(8, 30, 0, 0);
  const booking1End = new Date(today);
  booking1End.setDate(today.getDate() + 5);

  const b1 = await prisma.booking.create({
    data: {
      bookingNumber: "GEO-2026-001",
      carId: rav4.id,
      customerId: customer1.id,
      startDate: booking1Start,
      endDate: booking1End,
      rentalDays: 5,
      pickupLocationId: tbsAirport.id,
      pickupType: "AIRPORT",
      pickupAddress: "Терминал прилёта TBS, рейс из Астаны",
      returnLocationId: tbsAirport.id,
      returnType: "AIRPORT",
      dailyRate: 65,
      rentalTotal: 325,
      deliveryFee: 25,
      extrasTotal: 25,
      totalAmount: 375,
      depositAmount: 300,
      currency: "USD",
      status: "CONFIRMED",
      notifiedManager: true,
      isAddedDuringDay: false,
      extras: {
        create: [
          {
            type: "CHILD_SEAT",
            name: "Детское автокресло (9-36 кг)",
            quantity: 1,
            price: 20,
            isIssued: false,
          },
          {
            type: "PHONE_HOLDER",
            name: "Магнитный держатель для смартфона",
            quantity: 1,
            price: 5,
            isIssued: false,
          },
        ],
      },
    },
  });

  const booking2Start = new Date(today);
  booking2Start.setHours(11, 0, 0, 0);
  const booking2End = new Date(today);
  booking2End.setDate(today.getDate() + 3);

  const b2 = await prisma.booking.create({
    data: {
      bookingNumber: "GEO-2026-002",
      carId: tucson.id,
      customerId: customer2.id,
      startDate: booking2Start,
      endDate: booking2End,
      rentalDays: 3,
      pickupLocationId: busOffice.id,
      pickupType: "OFFICE",
      pickupAddress: "Офис Батуми, ул. Горгиладзе, 54",
      returnLocationId: busOffice.id,
      returnType: "OFFICE",
      dailyRate: 70,
      rentalTotal: 210,
      deliveryFee: 0,
      extrasTotal: 0,
      totalAmount: 210,
      depositAmount: 300,
      currency: "USD",
      status: "PREPARING",
      notifiedManager: true,
      isAddedDuringDay: false,
      washTasks: {
        create: {
          carId: tucson.id,
          status: "PENDING",
          priority: "URGENT",
          washType: "FULL",
          cost: 25,
          notes: "Выдача в 11:00, успеть помыть до 10:30!",
        },
      },
    },
  });

  const booking3Start = new Date(today);
  booking3Start.setHours(14, 0, 0, 0);
  const booking3End = new Date(today);
  booking3End.setDate(today.getDate() + 7);

  const b3 = await prisma.booking.create({
    data: {
      bookingNumber: "GEO-2026-003",
      carId: sportage.id,
      customerId: customer3.id,
      startDate: booking3Start,
      endDate: booking3End,
      rentalDays: 7,
      pickupLocationId: kutAirport.id,
      pickupType: "AIRPORT",
      pickupAddress: "Аэропорт KUT, рейс WizzAir из Мюнхена",
      returnLocationId: busAirport.id,
      returnType: "AIRPORT",
      dailyRate: 55,
      rentalTotal: 385,
      deliveryFee: 40,
      extrasTotal: 10,
      totalAmount: 435,
      depositAmount: 300,
      currency: "USD",
      status: "CONFIRMED",
      notifiedManager: true,
      isAddedDuringDay: false,
    },
  });

  // 6. Financial Accounts (Мультикасса: счета и кассы)
  console.log("Seeding financial accounts & expenses...");
  const cashTbilisi = await prisma.financialAccount.create({
    data: {
      name: "Касса Наличные Тбилиси (Офис)",
      type: "CASH",
      bankName: "NONE",
      currency: "USD",
      cityId: tbilisi.id,
      initialBalance: 500,
      currentBalance: 875,
      managerResponsible: "Георгий (Тбилиси)",
    },
  });

  const cashBatumi = await prisma.financialAccount.create({
    data: {
      name: "Касса Наличные Батуми (Офис)",
      type: "CASH",
      bankName: "NONE",
      currency: "USD",
      cityId: batumi.id,
      initialBalance: 300,
      currentBalance: 510,
      managerResponsible: "Николоз (Батуми)",
    },
  });

  const cashKutaisi = await prisma.financialAccount.create({
    data: {
      name: "Касса Наличные Кутаиси",
      type: "CASH",
      bankName: "NONE",
      currency: "USD",
      cityId: kutaisi.id,
      initialBalance: 200,
      currentBalance: 635,
      managerResponsible: "Леван (Кутаиси)",
    },
  });

  const bogAccount = await prisma.financialAccount.create({
    data: {
      name: "Bank of Georgia (BOG) GEL Расчетный",
      type: "BANK_ACCOUNT",
      bankName: "BOG",
      accountNumber: "GE29BG0000000123456789",
      currency: "GEL",
      initialBalance: 4500,
      currentBalance: 7800,
      managerResponsible: "Бухгалтерия",
    },
  });

  const tbcAccount = await prisma.financialAccount.create({
    data: {
      name: "TBC Bank USD Мультивалютный",
      type: "BANK_ACCOUNT",
      bankName: "TBC",
      accountNumber: "GE79TB7777777890123456",
      currency: "USD",
      initialBalance: 3200,
      currentBalance: 4650,
      managerResponsible: "Руководство",
    },
  });

  const credoAccount = await prisma.financialAccount.create({
    data: {
      name: "Credo Bank GEL",
      type: "BANK_ACCOUNT",
      bankName: "CREDO",
      accountNumber: "GE12CR0000000987654321",
      currency: "GEL",
      initialBalance: 1200,
      currentBalance: 2150,
      managerResponsible: "Руководство",
    },
  });

  const cryptoWallet = await prisma.financialAccount.create({
    data: {
      name: "Криптокошелек USDT (TRC20)",
      type: "CRYPTO_WALLET",
      bankName: "NONE",
      accountNumber: "TX8kL...92zP",
      currency: "USD",
      initialBalance: 1500,
      currentBalance: 2400,
      managerResponsible: "Руководство",
    },
  });

  // 7. Seed Past & Today Payments into accounts
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.payment.create({
    data: {
      bookingId: b1.id,
      accountId: cashTbilisi.id,
      type: "RENTAL",
      amount: 375,
      currency: "USD",
      method: "CASH",
      status: "PAID",
      amountExpected: 375,
      amountReceived: 375,
      managerName: "Георгий",
      notes: "Выдача в аэропорту Тбилиси (Наличные)",
      createdAt: today,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: b2.id,
      accountId: tbcAccount.id,
      type: "RENTAL",
      amount: 210,
      currency: "USD",
      method: "TBC_BANK",
      status: "PAID",
      amountExpected: 210,
      amountReceived: 210,
      managerName: "Николоз",
      notes: "Оплата аренды через TBC перевод",
      createdAt: today,
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: b3.id,
      accountId: credoAccount.id,
      type: "RENTAL",
      amount: 435,
      currency: "USD",
      method: "CREDO_BANK",
      status: "PAID",
      amountExpected: 435,
      amountReceived: 435,
      managerName: "Леван",
      notes: "Перевод на Credo Bank",
      createdAt: yesterday,
    },
  });

  // 8. Seed Expenses (Расходы компании)
  await prisma.expense.create({
    data: {
      accountId: cashBatumi.id,
      category: "WASHING",
      amount: 25,
      currency: "GEL",
      description: "Комплексная мойка Hyundai Tucson перед выдачей",
      cityId: batumi.id,
      carId: tucson.id,
      managerName: "Николоз",
      date: today,
    },
  });

  await prisma.expense.create({
    data: {
      accountId: cashTbilisi.id,
      category: "FUEL",
      amount: 60,
      currency: "GEL",
      description: "Заправка Toyota RAV4 до полного бака (Wissol)",
      cityId: tbilisi.id,
      carId: rav4.id,
      managerName: "Георгий",
      date: today,
    },
  });

  await prisma.expense.create({
    data: {
      accountId: bogAccount.id,
      category: "OFFICE_RENT",
      amount: 1500,
      currency: "GEL",
      description: "Оплата аренды офиса Тбилиси (пр. Руставели)",
      cityId: tbilisi.id,
      managerName: "Руководитель",
      date: yesterday,
    },
  });

  await prisma.expense.create({
    data: {
      accountId: tbcAccount.id,
      category: "MAINTENANCE",
      amount: 280,
      currency: "GEL",
      description: "Замена масла и фильтров Toyota Camry (Tegeta Motors)",
      cityId: tbilisi.id,
      carId: camry.id,
      managerName: "Георгий",
      date: yesterday,
    },
  });

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
