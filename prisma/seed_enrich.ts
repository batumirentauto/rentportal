import { prisma } from "../src/lib/prisma";

async function enrich() {
  console.log("Enriching database with fleet, historical bookings, payments, and expenses...");

  // Check cities
  const tbilisi = await prisma.city.findUnique({ where: { code: "TBS" } });
  const batumi = await prisma.city.findUnique({ where: { code: "BUS" } });
  const kutaisi = await prisma.city.findUnique({ where: { code: "KUT" } });

  if (!tbilisi || !batumi || !kutaisi) {
    console.error("Cities not found. Please run main seed first.");
    return;
  }

  // Get locations
  const tbsOffice = await prisma.location.findFirst({ where: { cityId: tbilisi.id, type: "OFFICE" } });
  const tbsAirport = await prisma.location.findFirst({ where: { cityId: tbilisi.id, type: "AIRPORT" } });
  const busOffice = await prisma.location.findFirst({ where: { cityId: batumi.id, type: "OFFICE" } });
  const busAirport = await prisma.location.findFirst({ where: { cityId: batumi.id, type: "AIRPORT" } });
  const kutOffice = await prisma.location.findFirst({ where: { cityId: kutaisi.id, type: "OFFICE" } });
  const kutAirport = await prisma.location.findFirst({ where: { cityId: kutaisi.id, type: "AIRPORT" } });

  // Get accounts
  const cashTbs = await prisma.financialAccount.findFirst({ where: { name: { contains: "Тбилиси" } } });
  const cashBus = await prisma.financialAccount.findFirst({ where: { name: { contains: "Батуми" } } });
  const cashKut = await prisma.financialAccount.findFirst({ where: { name: { contains: "Кутаиси" } } });
  const bogAcc = await prisma.financialAccount.findFirst({ where: { name: { contains: "BOG" } } });
  const tbcAcc = await prisma.financialAccount.findFirst({ where: { name: { contains: "TBC" } } });
  const credoAcc = await prisma.financialAccount.findFirst({ where: { name: { contains: "Credo" } } });
  const usdtAcc = await prisma.financialAccount.findFirst({ where: { name: { contains: "USDT" } } });

  // Add more cars if needed
  const additionalCars = [
    {
      plateNumber: "BA-007-GE",
      vin: "1FA6P8CF4M5100729",
      brand: "Ford",
      model: "Mustang Cabrio",
      year: 2022,
      color: "Красный",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.3L EcoBoost",
      currentMileage: 32400,
      currentFuelPerc: 90,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: batumi.id,
    },
    {
      plateNumber: "TB-448-GE",
      vin: "JF2SKARC7LH448910",
      brand: "Subaru",
      model: "Forester AWD",
      year: 2021,
      color: "Темно-зеленый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L Boxer",
      currentMileage: 58900,
      currentFuelPerc: 95,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: tbilisi.id,
    },
    {
      plateNumber: "KU-230-GE",
      vin: "KMHD84LF8NU230194",
      brand: "Hyundai",
      model: "Elantra",
      year: 2023,
      color: "Белый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.0L",
      currentMileage: 21300,
      currentFuelPerc: 100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: kutaisi.id,
    },
    {
      plateNumber: "TB-999-GE",
      vin: "W1KZF4GB8MA999201",
      brand: "Mercedes-Benz",
      model: "E 300 4MATIC",
      year: 2022,
      color: "Черный металлик",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.0L Turbo",
      currentMileage: 41200,
      currentFuelPerc: 100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: tbilisi.id,
    },
    {
      plateNumber: "BA-332-GE",
      vin: "JA4AZ2A35NZ332840",
      brand: "Mitsubishi",
      model: "Outlander (7 мест)",
      year: 2022,
      color: "Серебристый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L",
      currentMileage: 49800,
      currentFuelPerc: 85,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: batumi.id,
    },
    {
      plateNumber: "TB-800-GE",
      vin: "JTEBX3FJ8MK800912",
      brand: "Toyota",
      model: "Land Cruiser Prado 4x4",
      year: 2021,
      color: "Белый жемчуг",
      transmission: "AUTOMATIC",
      fuelType: "DIESEL",
      engineVolume: "2.8L D-4D",
      currentMileage: 74500,
      currentFuelPerc: 100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      hasTechPassport: true,
      cityId: tbilisi.id,
    },
  ];

  for (const carData of additionalCars) {
    const existing = await prisma.car.findUnique({ where: { plateNumber: carData.plateNumber } });
    if (!existing) {
      await prisma.car.create({ data: carData });
    }
  }

  // Add more customers
  const moreCustomers = [
    {
      fullName: "Guram Kalandadze",
      phone: "+995 595 112 233",
      passportNumber: "11BA99824",
      driverLicenseNumber: "DL-GEO-8821",
    },
    {
      fullName: "Michael Vance",
      phone: "+1 415 892 1104",
      passportNumber: "US98234810",
      driverLicenseNumber: "CA-889104",
    },
    {
      fullName: "Piotr Kowalski",
      phone: "+48 601 223 994",
      passportNumber: "PL67823901",
      driverLicenseNumber: "PL-092384",
    },
    {
      fullName: "Ольга Воронова",
      phone: "+995 558 776 543",
      passportNumber: "51 18 902144",
      driverLicenseNumber: "77 12 884102",
    },
  ];

  for (const c of moreCustomers) {
    const existing = await prisma.customer.findFirst({ where: { phone: c.phone } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }

  // Get all cars & customers now
  const allCars = await prisma.car.findMany();
  const allCust = await prisma.customer.findMany();

  // Create historical and recent bookings for rich analytics over the last 30 days
  const now = new Date();
  
  // 1. Completed historical bookings
  const pastBookings = [
    {
      carPlate: "TB-742-GE", // RAV4
      custPhone: allCust[0]?.phone,
      daysAgoStart: 25,
      rentalDays: 5,
      pickupLoc: tbsOffice?.id,
      returnLoc: busOffice?.id, // One-Way!
      dailyRate: 75,
      isOneWay: true,
      status: "COMPLETED",
      manager: "Георгий",
      account: cashTbs?.id,
    },
    {
      carPlate: "BA-918-GE", // Tucson
      custPhone: allCust[1]?.phone,
      daysAgoStart: 20,
      rentalDays: 4,
      pickupLoc: busAirport?.id,
      returnLoc: busOffice?.id,
      dailyRate: 70,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Николоз",
      account: tbcAcc?.id,
    },
    {
      carPlate: "TB-305-GE", // Camry
      custPhone: allCust[2]?.phone,
      daysAgoStart: 18,
      rentalDays: 6,
      pickupLoc: tbsAirport?.id,
      returnLoc: tbsOffice?.id,
      dailyRate: 65,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Георгий",
      account: bogAcc?.id,
    },
    {
      carPlate: "KU-551-GE", // Sportage
      custPhone: allCust[3]?.phone,
      daysAgoStart: 15,
      rentalDays: 3,
      pickupLoc: kutAirport?.id,
      returnLoc: tbsOffice?.id, // One-Way!
      dailyRate: 65,
      isOneWay: true,
      status: "COMPLETED",
      manager: "Леван",
      account: cashKut?.id,
    },
    {
      carPlate: "BA-007-GE", // Mustang
      custPhone: allCust[1]?.phone,
      daysAgoStart: 12,
      rentalDays: 4,
      pickupLoc: busOffice?.id,
      returnLoc: busAirport?.id,
      dailyRate: 110,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Николоз",
      account: usdtAcc?.id,
    },
    {
      carPlate: "TB-448-GE", // Forester
      custPhone: allCust[0]?.phone,
      daysAgoStart: 10,
      rentalDays: 5,
      pickupLoc: tbsOffice?.id,
      returnLoc: kutAirport?.id, // One-Way!
      dailyRate: 70,
      isOneWay: true,
      status: "COMPLETED",
      manager: "Георгий",
      account: bogAcc?.id,
    },
    {
      carPlate: "TB-999-GE", // Mercedes E
      custPhone: allCust[2]?.phone,
      daysAgoStart: 8,
      rentalDays: 4,
      pickupLoc: tbsAirport?.id,
      returnLoc: tbsOffice?.id,
      dailyRate: 140,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Георгий",
      account: tbcAcc?.id,
    },
    {
      carPlate: "TB-800-GE", // Prado
      custPhone: allCust[3]?.phone,
      daysAgoStart: 7,
      rentalDays: 5,
      pickupLoc: tbsOffice?.id,
      returnLoc: tbsOffice?.id,
      dailyRate: 150,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Георгий",
      account: cashTbs?.id,
    },
    {
      carPlate: "BA-332-GE", // Outlander
      custPhone: allCust[0]?.phone,
      daysAgoStart: 4,
      rentalDays: 3,
      pickupLoc: busOffice?.id,
      returnLoc: busOffice?.id,
      dailyRate: 80,
      isOneWay: false,
      status: "COMPLETED",
      manager: "Николоз",
      account: cashBus?.id,
    },
    {
      carPlate: "KU-230-GE", // Elantra
      custPhone: allCust[1]?.phone,
      daysAgoStart: 3,
      rentalDays: 3,
      pickupLoc: kutAirport?.id,
      returnLoc: busOffice?.id, // One-Way!
      dailyRate: 55,
      isOneWay: true,
      status: "COMPLETED",
      manager: "Леван",
      account: credoAcc?.id,
    },
  ];

  let bookingNumIndex = 100;
  for (const b of pastBookings) {
    const car = allCars.find((c) => c.plateNumber === b.carPlate);
    const cust = allCust.find((c) => c.phone === b.custPhone) || allCust[0];
    if (!car || !cust) continue;

    bookingNumIndex++;
    const bNumber = `GEO-2026-${bookingNumIndex}`;

    const existing = await prisma.booking.findUnique({ where: { bookingNumber: bNumber } });
    if (existing) continue;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - b.daysAgoStart);
    startDate.setHours(10, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + b.rentalDays);
    endDate.setHours(12, 0, 0, 0);

    const rentalTotal = b.dailyRate * b.rentalDays;
    const deliveryFee = b.isOneWay ? 50 : 0;
    const extrasTotal = 25; // baby seat or wifi
    const totalAmount = rentalTotal + deliveryFee + extrasTotal;

    const createdBooking = await prisma.booking.create({
      data: {
        bookingNumber: bNumber,
        carId: car.id,
        customerId: cust.id,
        startDate,
        endDate,
        rentalDays: b.rentalDays,
        pickupLocationId: b.pickupLoc || tbsOffice!.id,
        pickupType: "OFFICE",
        returnLocationId: b.returnLoc || tbsOffice!.id,
        returnType: "OFFICE",
        dailyRate: b.dailyRate,
        rentalTotal,
        deliveryFee,
        extrasTotal,
        totalAmount,
        depositAmount: 300,
        currency: "USD",
        status: b.status,
        notifiedManager: true,
        actualHandoverAt: startDate,
      },
    });

    // Create payment
    await prisma.payment.create({
      data: {
        bookingId: createdBooking.id,
        accountId: b.account || cashTbs!.id,
        type: "RENTAL",
        amount: totalAmount,
        currency: "USD",
        method: b.account === cashTbs?.id || b.account === cashBus?.id || b.account === cashKut?.id ? "CASH" : "BANK_ACCOUNT",
        status: "PAID",
        amountExpected: totalAmount,
        amountReceived: totalAmount,
        managerName: b.manager,
        notes: `Оплата аренды ${bNumber} (${car.brand} ${car.model})`,
        createdAt: startDate,
      },
    });

    // Handover report
    await prisma.handoverReport.create({
      data: {
        bookingId: createdBooking.id,
        carId: car.id,
        managerName: b.manager,
        mileageAtHandover: car.currentMileage - (b.daysAgoStart * 120),
        fuelLevelPercent: 100,
        techPassportVerified: true,
        clientBriefed: true,
        actualHandoverTime: "10:00",
        expectedReturnTime: "12:00",
        expectedReturnDate: endDate,
        handedOverAt: startDate,
      },
    });
  }

  // Realistic operational expenses across the cities
  const sampleExpenses = [
    {
      category: "WASHING",
      amount: 30,
      currency: "GEL",
      desc: "Мойка люкс + полировка салона Ford Mustang",
      cityId: batumi.id,
      accId: cashBus?.id,
      manager: "Николоз",
      daysAgo: 11,
    },
    {
      category: "FUEL",
      amount: 140,
      currency: "GEL",
      desc: "Топливо для междугороднего перегона авто Кутаиси - Тбилиси (Wissol)",
      cityId: kutaisi.id,
      accId: cashKut?.id,
      manager: "Леван",
      daysAgo: 9,
    },
    {
      category: "MAINTENANCE",
      amount: 450,
      currency: "GEL",
      desc: "Плановое ТО-60000 Subaru Forester (Tegeta Motors, масло Motul, фильтры)",
      cityId: tbilisi.id,
      accId: tbcAcc?.id,
      manager: "Георгий",
      daysAgo: 8,
    },
    {
      category: "PARKING_FINES",
      amount: 80,
      currency: "GEL",
      desc: "Оплата муниципальной парковки в аэропорту Тбилиси за парковочные места",
      cityId: tbilisi.id,
      accId: bogAcc?.id,
      manager: "Георгий",
      daysAgo: 6,
    },
    {
      category: "SALARY",
      amount: 1200,
      currency: "GEL",
      desc: "Аванс зарплаты менеджеров филиала Батуми (Николоз)",
      cityId: batumi.id,
      accId: tbcAcc?.id,
      manager: "Руководитель",
      daysAgo: 5,
    },
    {
      category: "MARKETING",
      amount: 350,
      currency: "GEL",
      desc: "Таргетированная реклама Google Ads & Instagram (прокат авто Грузия)",
      cityId: tbilisi.id,
      accId: usdtAcc?.id,
      manager: "Руководитель",
      daysAgo: 3,
    },
    {
      category: "WASHING",
      amount: 25,
      currency: "GEL",
      desc: "Комплексная мойка Toyota Prado 150 перед передачей клиенту",
      cityId: tbilisi.id,
      accId: cashTbs?.id,
      manager: "Георгий",
      daysAgo: 2,
    },
    {
      category: "FUEL",
      amount: 95,
      currency: "GEL",
      desc: "Заправка дизелем Toyota Prado (Gulf)",
      cityId: tbilisi.id,
      accId: cashTbs?.id,
      manager: "Георгий",
      daysAgo: 1,
    },
  ];

  for (const ex of sampleExpenses) {
    const exDate = new Date(now);
    exDate.setDate(exDate.getDate() - ex.daysAgo);

    await prisma.expense.create({
      data: {
        accountId: ex.accId || cashTbs!.id,
        category: ex.category,
        amount: ex.amount,
        currency: ex.currency,
        description: ex.desc,
        cityId: ex.cityId,
        managerName: ex.manager,
        date: exDate,
      },
    });
  }

  console.log("Enrichment complete! Fleet, Bookings, Payments, and Expenses are seeded.");
}

enrich()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
