import { prisma } from "../src/lib/prisma";

async function seedOwners() {
  console.log("Seeding car owners and investor payout rates...");

  // 1. Create Owners
  const owner1 = await prisma.carOwner.create({
    data: {
      fullName: "Ираклий Беридзе",
      phone: "+995 599 334 455",
      email: "irakli.beridze@gmail.com",
      whatsapp: "+995599334455",
      passportNumber: "01024089123",
      bankName: "Bank of Georgia",
      bankIban: "GE29BG0000000123456789",
      payoutCurrency: "USD",
      notes: "Инвестор 3 кроссоверов в Тбилиси. Выплаты 1-го и 15-го числа.",
    },
  });

  const owner2 = await prisma.carOwner.create({
    data: {
      fullName: "Ника Кварацхелия",
      phone: "+995 577 889 900",
      email: "nika.kvara@gmail.com",
      whatsapp: "+995577889900",
      passportNumber: "61001045982",
      bankName: "TBC Bank",
      bankIban: "GE88TB7700000098765432",
      payoutCurrency: "USD",
      notes: "Парк в Батуми (Мустанг, Туссан, Аутлендер).",
    },
  });

  const owner3 = await prisma.carOwner.create({
    data: {
      fullName: "Давид Гоциридзе",
      phone: "+995 555 443 322",
      email: "davit.gotsiridze@mail.ge",
      whatsapp: "+995555443322",
      passportNumber: "21002034871",
      bankName: "Credo Bank",
      bankIban: "GE44CR5500000011223344",
      payoutCurrency: "USD",
      notes: "Парк в Кутаиси (Спортейдж, Элантра).",
    },
  });

  const owner4 = await prisma.carOwner.create({
    data: {
      fullName: "Леван Махарадзе",
      phone: "+995 591 776 655",
      email: "levan.makharadze@invest.ge",
      whatsapp: "+995591776655",
      passportNumber: "01009012784",
      bankName: "Bank of Georgia (USD)",
      bankIban: "GE11BG8800000055667788",
      payoutCurrency: "USD",
      notes: "Премиум сегмент (Мерседес Е-класс и Прадо 150).",
    },
  });

  // 2. Link Cars to Owners and set default daily rates
  const carOwnerAssignments: Record<string, { ownerId: string; rate: number }> = {
    "TB-742-GE": { ownerId: owner1.id, rate: 30 }, // RAV4
    "TB-305-GE": { ownerId: owner1.id, rate: 25 }, // Camry
    "TB-448-GE": { ownerId: owner1.id, rate: 28 }, // Forester

    "BA-918-GE": { ownerId: owner2.id, rate: 30 }, // Tucson
    "BA-007-GE": { ownerId: owner2.id, rate: 50 }, // Mustang Cabrio
    "BA-332-GE": { ownerId: owner2.id, rate: 35 }, // Outlander 7 мест

    "KU-551-GE": { ownerId: owner3.id, rate: 26 }, // Sportage
    "KU-230-GE": { ownerId: owner3.id, rate: 22 }, // Elantra

    "TB-999-GE": { ownerId: owner4.id, rate: 60 }, // Mercedes E
    "TB-800-GE": { ownerId: owner4.id, rate: 65 }, // Prado 150
  };

  for (const [plate, info] of Object.entries(carOwnerAssignments)) {
    await prisma.car.update({
      where: { plateNumber: plate },
      data: {
        ownerId: info.ownerId,
        defaultOwnerDailyRate: info.rate,
      },
    });
  }

  // 3. Update bookings with ownerDailyRate and ownerTotalPayout
  const bookings = await prisma.booking.findMany({
    include: { car: true },
  });

  for (const b of bookings) {
    const defaultRate = b.car.defaultOwnerDailyRate || 25;
    // For long rentals (>5 days), simulate adjusted rate
    const adjustedRate = b.rentalDays >= 6 ? Math.round(defaultRate * 0.9) : defaultRate;
    const totalPayout = adjustedRate * b.rentalDays;

    await prisma.booking.update({
      where: { id: b.id },
      data: {
        ownerDailyRate: adjustedRate,
        ownerTotalPayout: totalPayout,
      },
    });
  }

  // 4. Create sample past payouts
  await prisma.ownerPayout.create({
    data: {
      ownerId: owner1.id,
      amount: 450,
      currency: "USD",
      periodMonth: "2026-09",
      status: "PAID",
      paymentMethod: "BANK_TRANSFER",
      notes: "Выплата за сентябрь 2026 (RAV4, Camry, Forester)",
    },
  });

  await prisma.ownerPayout.create({
    data: {
      ownerId: owner2.id,
      amount: 520,
      currency: "USD",
      periodMonth: "2026-09",
      status: "PAID",
      paymentMethod: "BANK_TRANSFER",
      notes: "Выплата за сентябрь 2026 (Mustang, Tucson, Outlander)",
    },
  });

  console.log("Car owners seeded and linked to fleet successfully!");
}

seedOwners()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
