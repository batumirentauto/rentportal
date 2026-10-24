import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Fleet Pricing & Price Fork Database...");

  // 1. Get or create cities
  const tbs = await prisma.city.findFirst({ where: { code: "TBS" } });
  const bus = await prisma.city.findFirst({ where: { code: "BUS" } });
  const kut = await prisma.city.findFirst({ where: { code: "KUT" } });

  if (!tbs || !bus || !kut) {
    throw new Error("Cities not found");
  }

  // 2. Get or create owners
  let george = await prisma.carOwner.findFirst({ where: { fullName: "Георгий Церетели" } });
  if (!george) {
    george = await prisma.carOwner.create({
      data: {
        fullName: "Георгий Церетели",
        phone: "+995 595 778 899",
        email: "g.tsereteli@geocars.ge",
        whatsapp: "+995 595 778 899",
        bankName: "TBC Bank",
        bankIban: "GE89TB7744332211009988",
        payoutCurrency: "USD",
      },
    });
  }

  let zurab = await prisma.carOwner.findFirst({ where: { fullName: "Зураб Абашидзе" } });
  if (!zurab) {
    zurab = await prisma.carOwner.create({
      data: {
        fullName: "Зураб Абашидзе",
        phone: "+995 599 443 322",
        email: "z.abashidze@investor.ge",
        whatsapp: "+995 599 443 322",
        bankName: "Bank of Georgia",
        bankIban: "GE12BG0000000445566778",
        payoutCurrency: "USD",
      },
    });
  }

  const irakli = await prisma.carOwner.findFirst({ where: { fullName: { contains: "Ираклий" } } });
  const nika = await prisma.carOwner.findFirst({ where: { fullName: { contains: "Ника" } } });
  const david = await prisma.carOwner.findFirst({ where: { fullName: { contains: "Давид" } } });
  const levan = await prisma.carOwner.findFirst({ where: { fullName: { contains: "Леван" } } });

  // 3. Update existing 10 cars with their exact pricing matrix
  const existingCarsUpdates: Record<string, any> = {
    "TB-742-GE": {
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 30,
      clientMinDailyRate: 50,
      clientStandardDailyRate: 65,
      clientMaxDailyRate: 85,
      pricingNotes: "Очень популярен для поездок в Казбеги и Сванетию. Минимальный торг — не ниже $48.",
    },
    "BA-918-GE": {
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 30,
      clientMinDailyRate: 50,
      clientStandardDailyRate: 65,
      clientMaxDailyRate: 80,
      pricingNotes: "Экономичный дизель, популярен на длинные маршруты Батуми–Тбилиси.",
    },
    "TB-305-GE": {
      carClass: "COMFORT",
      defaultOwnerDailyRate: 25,
      clientMinDailyRate: 40,
      clientStandardDailyRate: 55,
      clientMaxDailyRate: 70,
      pricingNotes: "На длительные брони от 20 дней отдаем за $40/день, владельцу снижаем до $20.",
    },
    "KU-551-GE": {
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 26,
      clientMinDailyRate: 45,
      clientStandardDailyRate: 60,
      clientMaxDailyRate: 75,
      pricingNotes: "Базируется в аэропорту Кутаиси. Отлично разбирают европейские туристы WizzAir.",
    },
    "BA-007-GE": {
      carClass: "CABRIO",
      defaultOwnerDailyRate: 50,
      clientMinDailyRate: 85,
      clientStandardDailyRate: 110,
      clientMaxDailyRate: 140,
      pricingNotes: "Хит Батуми и побережья. В июле-августе держать не менее $120/день.",
    },
    "TB-448-GE": {
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 28,
      clientMinDailyRate: 45,
      clientStandardDailyRate: 60,
      clientMaxDailyRate: 75,
      pricingNotes: "Постоянный симметричный полный привод AWD, разрешен подъем в Гергети.",
    },
    "KU-230-GE": {
      carClass: "ECONOMY",
      defaultOwnerDailyRate: 22,
      clientMinDailyRate: 32,
      clientStandardDailyRate: 42,
      clientMaxDailyRate: 55,
      pricingNotes: "Эконом-седан для города и трансферов. Залог снижен до $200.",
    },
    "TB-999-GE": {
      carClass: "PREMIUM",
      defaultOwnerDailyRate: 60,
      clientMinDailyRate: 100,
      clientStandardDailyRate: 130,
      clientMaxDailyRate: 165,
      pricingNotes: "Премиум-класс. Залог $500, только клиентам старше 24 лет со стажем от 3 лет.",
    },
    "BA-332-GE": {
      carClass: "SUV",
      defaultOwnerDailyRate: 35,
      clientMinDailyRate: 55,
      clientStandardDailyRate: 75,
      clientMaxDailyRate: 95,
      pricingNotes: "7 мест, отлично для больших семей и групп с багажом.",
    },
    "TB-800-GE": {
      carClass: "SUV",
      defaultOwnerDailyRate: 65,
      clientMinDailyRate: 115,
      clientStandardDailyRate: 145,
      clientMaxDailyRate: 180,
      pricingNotes: "Флагманский рамный внедорожник для Тушетии и Омало. Залог $600.",
    },
  };

  for (const [plate, data] of Object.entries(existingCarsUpdates)) {
    await prisma.car.updateMany({
      where: { plateNumber: plate },
      data,
    });
  }

  // 4. Seed additional popular fleet vehicles to represent a realistic full rental lineup
  const additionalCars = [
    {
      plateNumber: "TB-112-GE",
      vin: "JTDKN3DU9J1112440",
      brand: "Toyota",
      model: "Prius Hybrid",
      year: 2019,
      color: "Серебристый",
      transmission: "AUTOMATIC",
      fuelType: "HYBRID",
      engineVolume: "1.8L Hybrid",
      currentMileage: 85200,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: tbs.id,
      ownerId: irakli?.id,
      carClass: "ECONOMY",
      defaultOwnerDailyRate: 18,
      clientMinDailyRate: 28,
      clientStandardDailyRate: 38,
      clientMaxDailyRate: 48,
      pricingNotes: "Расход 4.3л/100км. Самый частый запрос на бюджетный прокат.",
      techPassportNumber: "AA1124401",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "BA-555-GE",
      vin: "1G1FB1RX5M0555812",
      brand: "Chevrolet",
      model: "Camaro Cabrio",
      year: 2021,
      color: "Желтый (Bumblebee)",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.0L Turbo",
      currentMileage: 41200,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: bus.id,
      ownerId: nika?.id,
      carClass: "CABRIO",
      defaultOwnerDailyRate: 50,
      clientMinDailyRate: 85,
      clientStandardDailyRate: 110,
      clientMaxDailyRate: 135,
      pricingNotes: "Яркий кабриолет для фотосессий на закате в Батуми. Залог $400.",
      techPassportNumber: "BC5558123",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "TB-777-GE",
      vin: "2T2HZMCA3MC777931",
      brand: "Lexus",
      model: "RX 350 AWD",
      year: 2021,
      color: "Белый перламутр",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "3.5L V6",
      currentMileage: 52400,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: tbs.id,
      ownerId: levan?.id,
      carClass: "PREMIUM",
      defaultOwnerDailyRate: 55,
      clientMinDailyRate: 90,
      clientStandardDailyRate: 120,
      clientMaxDailyRate: 150,
      pricingNotes: "Максимальный комфорт и шумоизоляция. Залог $500.",
      techPassportNumber: "AA7779310",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "KU-888-GE",
      vin: "KNAGU4L27N5888192",
      brand: "Kia",
      model: "K5 GT-Line",
      year: 2022,
      color: "Серый графит",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L",
      currentMileage: 38900,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: kut.id,
      ownerId: david?.id,
      carClass: "COMFORT",
      defaultOwnerDailyRate: 28,
      clientMinDailyRate: 45,
      clientStandardDailyRate: 60,
      clientMaxDailyRate: 75,
      pricingNotes: "Панорамная крыша, цифровая приборка, спортивный экстерьер.",
      techPassportNumber: "CC8881924",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "TB-404-GE",
      vin: "1C4HJXDG8MW404552",
      brand: "Jeep",
      model: "Wrangler Unlimited 4x4",
      year: 2021,
      color: "Милитари зеленый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.0L Turbo",
      currentMileage: 46100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: tbs.id,
      ownerId: george?.id,
      carClass: "SUV",
      defaultOwnerDailyRate: 60,
      clientMinDailyRate: 95,
      clientStandardDailyRate: 130,
      clientMaxDailyRate: 160,
      pricingNotes: "Съемные панели крыши, грязевая резина All-Terrain, подготовлен для гор.",
      techPassportNumber: "AA4045529",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "TB-630-GE",
      vin: "5TDYZ3DC2LS630419",
      brand: "Toyota",
      model: "Sienna XLE (7 мест)",
      year: 2020,
      color: "Темно-синий",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "3.5L V6",
      currentMileage: 74200,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: tbs.id,
      ownerId: zurab?.id,
      carClass: "MINIVAN",
      defaultOwnerDailyRate: 40,
      clientMinDailyRate: 65,
      clientStandardDailyRate: 85,
      clientMaxDailyRate: 110,
      pricingNotes: "Большой туристический минивэн с автоматическими сдвижными дверями.",
      techPassportNumber: "AA6304193",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "KU-109-GE",
      vin: "4S4BTANC7N3109281",
      brand: "Subaru",
      model: "Outback Touring AWD",
      year: 2022,
      color: "Бронзовый металлик",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L Boxer",
      currentMileage: 42100,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: kut.id,
      ownerId: david?.id,
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 30,
      clientMinDailyRate: 50,
      clientStandardDailyRate: 68,
      clientMaxDailyRate: 85,
      pricingNotes: "Клиренс 220 мм, вместительный багажник, система безопасности EyeSight.",
      techPassportNumber: "CC1092812",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "BA-419-GE",
      vin: "JN8AT2MV4MW419082",
      brand: "Nissan",
      model: "Rogue SL AWD",
      year: 2021,
      color: "Белый",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "2.5L",
      currentMileage: 58000,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: bus.id,
      ownerId: nika?.id,
      carClass: "CROSSOVER",
      defaultOwnerDailyRate: 28,
      clientMinDailyRate: 45,
      clientStandardDailyRate: 60,
      clientMaxDailyRate: 75,
      pricingNotes: "Кожаный салон, камеры 360°, очень мягкий ход по побережью.",
      techPassportNumber: "BC4190825",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "TB-001-GE",
      vin: "5UXCR6C08M9001942",
      brand: "BMW",
      model: "X5 xDrive40i",
      year: 2021,
      color: "Черный Carbon Black",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "3.0L TwinPower Turbo",
      currentMileage: 39500,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: tbs.id,
      ownerId: levan?.id,
      carClass: "PREMIUM",
      defaultOwnerDailyRate: 75,
      clientMinDailyRate: 130,
      clientStandardDailyRate: 165,
      clientMaxDailyRate: 200,
      pricingNotes: "M Sport Package, лазерные фары, аудиосистема Harman Kardon. Залог $700.",
      techPassportNumber: "AA0019421",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
    {
      plateNumber: "BA-202-GE",
      vin: "JTDECMAE4N0202819",
      brand: "Toyota",
      model: "Corolla LE",
      year: 2022,
      color: "Серый металлик",
      transmission: "AUTOMATIC",
      fuelType: "PETROL",
      engineVolume: "1.8L",
      currentMileage: 36200,
      status: "AVAILABLE",
      washStatus: "CLEAN",
      cityId: bus.id,
      ownerId: nika?.id,
      carClass: "ECONOMY",
      defaultOwnerDailyRate: 22,
      clientMinDailyRate: 35,
      clientStandardDailyRate: 45,
      clientMaxDailyRate: 58,
      pricingNotes: "Свежая машина с низким расходом, популярна у командировочных.",
      techPassportNumber: "BC2028199",
      techPassportFrontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      techPassportBackUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
    },
  ];

  for (const car of additionalCars) {
    const existing = await prisma.car.findUnique({ where: { plateNumber: car.plateNumber } });
    if (!existing) {
      await prisma.car.create({ data: car });
      console.log(`Created car: ${car.plateNumber} ${car.brand} ${car.model}`);
    } else {
      await prisma.car.update({
        where: { plateNumber: car.plateNumber },
        data: {
          carClass: car.carClass,
          defaultOwnerDailyRate: car.defaultOwnerDailyRate,
          clientMinDailyRate: car.clientMinDailyRate,
          clientStandardDailyRate: car.clientStandardDailyRate,
          clientMaxDailyRate: car.clientMaxDailyRate,
          pricingNotes: car.pricingNotes,
          ownerId: car.ownerId,
        },
      });
      console.log(`Updated car pricing: ${car.plateNumber}`);
    }
  }

  const allCars = await prisma.car.count();
  console.log(`✅ Fleet Pricing DB synced successfully! Total fleet count: ${allCars} cars.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
