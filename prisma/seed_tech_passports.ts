import { prisma } from "../src/lib/prisma";

async function seedTechPassports() {
  console.log("Seeding tech passport numbers, photos, and fine records...");

  const cars = await prisma.car.findMany({
    include: { city: true },
  });

  const passportData: Record<string, { tpNumber: string; front: string; back: string; fineStatus: string }> = {
    "TB-742-GE": {
      tpNumber: "AA1298412",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "BA-918-GE": {
      tpNumber: "BC9182341",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "FINE_DETECTED",
    },
    "TB-305-GE": {
      tpNumber: "AB3058820",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "KU-551-GE": {
      tpNumber: "CK5510924",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "BA-007-GE": {
      tpNumber: "BC0072911",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "TB-448-GE": {
      tpNumber: "AA4489105",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "KU-230-GE": {
      tpNumber: "CK2301948",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "FINE_DETECTED",
    },
    "TB-999-GE": {
      tpNumber: "AA9992017",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "BA-332-GE": {
      tpNumber: "BC3328402",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
    "TB-800-GE": {
      tpNumber: "AA8009123",
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    },
  };

  const now = new Date();

  for (const car of cars) {
    const data = passportData[car.plateNumber] || {
      tpNumber: `AA${Math.floor(1000000 + Math.random() * 9000000)}`,
      front: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80",
      back: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80",
      fineStatus: "CLEAN",
    };

    const checkDate = new Date(now);
    checkDate.setHours(checkDate.getHours() - Math.floor(Math.random() * 48));

    await prisma.car.update({
      where: { id: car.id },
      data: {
        techPassportNumber: data.tpNumber,
        techPassportFrontUrl: data.front,
        techPassportBackUrl: data.back,
        lastFineCheckAt: checkDate,
        fineStatus: data.fineStatus,
      },
    });

    // If fine detected, create sample traffic fine
    if (data.fineStatus === "FINE_DETECTED") {
      const fineCount = await prisma.trafficFine.count({ where: { carId: car.id } });
      if (fineCount === 0) {
        const violationDate = new Date(now);
        violationDate.setDate(violationDate.getDate() - 3);

        await prisma.trafficFine.create({
          data: {
            carId: car.id,
            protocolNumber: `GEO-VID-${Math.floor(100000 + Math.random() * 900000)}`,
            violationDate,
            amountGEL: 50,
            discountAmountGEL: 40,
            articleName: "Превышение скорости на 15-40 км/ч (Радар МВД, трасса Рикоти)",
            sourcePortal: "POLICE_GE",
            status: "UNPAID",
            deductedFromDeposit: false,
            checkedByManager: "Георгий",
            notes: "Зафиксировано камерой видеофиксации. Действует скидка 20% (40 GEL) при оплате в течение 10 дней.",
          },
        });
      }
    }
  }

  console.log("Tech passport and fines seeded successfully!");
}

seedTechPassports()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
