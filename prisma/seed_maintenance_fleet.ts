import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Fleet Maintenance, Oil, PTI Inspections, Insurance & Checklists...");

  const cars = await prisma.car.findMany();
  console.log(`Found ${cars.length} cars to update.`);

  const now = new Date();

  // 1. Update each car with oil, inspection, insurance
  for (let i = 0; i < cars.length; i++) {
    const car = cars[i];
    const currentMileage = car.currentMileage || 50000;

    // Oil calculation:
    // A few overdue or almost due
    let lastOilMileage = currentMileage - 3500; // default 3500 km ago (reserve ~4500 km)
    if (i === 1) {
      lastOilMileage = currentMileage - 7600; // 400 km remaining (YELLOW)
    } else if (i === 4) {
      lastOilMileage = currentMileage - 8200; // -200 km (RED / OVERDUE)
    }

    const lastOilDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);

    // Inspection (PTI)
    let inspExpiry = new Date(now.getTime() + (180 + i * 15) * 24 * 60 * 60 * 1000);
    let inspStatus = "VALID";
    if (i === 2) {
      inspExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days remaining
      inspStatus = "EXPIRING_SOON";
    } else if (i === 6) {
      inspExpiry = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days overdue
      inspStatus = "EXPIRED";
    }

    // Insurance
    const insuranceCompanies = ["Aldagi", "TBC Insurance", "GPI Holding", "Ardi Insurance", "Irao"];
    const comp = insuranceCompanies[i % insuranceCompanies.length];
    let insExpiry = new Date(now.getTime() + (120 + i * 20) * 24 * 60 * 60 * 1000);
    let insStatus = "ACTIVE";
    if (i === 3) {
      insExpiry = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days
      insStatus = "EXPIRING_SOON";
    }

    await prisma.car.update({
      where: { id: car.id },
      data: {
        lastOilChangeMileage: lastOilMileage,
        lastOilChangeDate: lastOilDate,
        oilChangeIntervalKm: 8000,
        oilType: car.fuelType === "HYBRID" ? "0W-20 Full Synthetic" : "5W-30 Full Synthetic",
        
        inspectionDate: new Date(inspExpiry.getTime() - 365 * 24 * 60 * 60 * 1000),
        inspectionExpiryDate: inspExpiry,
        inspectionNumber: `PTI-GEO-${2025000 + i * 17}`,
        inspectionStatus: inspStatus,

        insuranceCompany: comp,
        insurancePolicyNumber: `POL-${comp.substring(0, 3).toUpperCase()}-${88200 + i * 43}`,
        insuranceType: "CASCO_CDW",
        insuranceExpiryDate: insExpiry,
        insuranceDeductible: 300,
        insuranceStatus: insStatus,
      },
    });

    // Seed Mileage Log
    await prisma.mileageLog.create({
      data: {
        carId: car.id,
        mileage: currentMileage,
        source: "HANDOVER",
        loggedBy: "Георгий Механик",
        notes: "Плановая фиксация пробега при осмотре смены",
      },
    });
  }

  // 2. Seed realistic issues for diagnostics and service
  const sampleIssues = [
    {
      carPlate: "TB-742-GE", // Toyota RAV4
      category: "SUSPENSION",
      title: "Стук в передней правой стойке стабилизатора",
      description: "На гравийных участках дороги в Казбеги слышен отчетливый глухой стук справа. Требуется замена втулок и стойки стабилизатора.",
      priority: "MEDIUM",
      status: "IN_SERVICE",
      detectedMileage: 53100,
      detectedBy: "Ираклий (Менеджер Тбилиси)",
      serviceStationName: "СТО Tegeta Motors Тбилиси",
      repairCost: 65,
      repairNotes: "Заказаны оригинальные стойки 48820-42030, замена назначена на завтра",
    },
    {
      carPlate: "BA-007-GE", // Mustang Cabrio
      category: "BRAKES",
      title: "Износ задних тормозных колодок (остаток 15%)",
      description: "При торможении на скорости появился легкий писк. Датчик износа близок к контакту с диском.",
      priority: "HIGH",
      status: "OPEN",
      detectedMileage: 32400,
      detectedBy: "Ника (Техник Батуми)",
      serviceStationName: "Brembo Service Батуми",
      repairCost: 90,
      repairNotes: "Замена колодок в круг Ceramic Performance",
    },
    {
      carPlate: "TB-999-GE", // Mercedes E 300
      category: "ELECTRICAL_CHECK_ENGINE",
      title: "Периодическая ошибка датчика давления шины (TPMS заднее правое)",
      description: "На приборной панели раз в два дня загорается предупреждение о потере сигнала с датчика колеса.",
      priority: "LOW",
      status: "MONITORING",
      detectedMileage: 41800,
      detectedBy: "Леван (Сервисмен)",
      serviceStationName: "Mercedes Центр Тбилиси",
      repairCost: 0,
      repairNotes: "Батарейка датчика садится, замена при сезонной переобувке шин",
    },
    {
      carPlate: "TB-448-GE", // Subaru Forester
      category: "ENGINE_TRANSMISSION",
      title: "Плановое ТО: Замена моторного масла 5W-30 и фильтров",
      description: "Пробег подошел к 8,000 км с прошлой замены. Промывка, замена масляного и воздушного фильтров.",
      priority: "MEDIUM",
      status: "RESOLVED",
      detectedMileage: 61200,
      detectedBy: "Давид Гоциридзе",
      serviceStationName: "Subaru Box Тбилиси",
      repairCost: 85,
      repairNotes: "Залито 5.1л Motul 8100 5W-30, установлен фильтр Mann W610/9. Все в идеале.",
      resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      carPlate: "BA-918-GE", // Hyundai Tucson
      category: "CLIMATE_AC",
      title: "Слабая эффективность охлаждения кондиционера",
      description: "В дневное время при +32°C салон охлаждается долго. Проверен фреон, давление в контуре низкое.",
      priority: "MEDIUM",
      status: "RESOLVED",
      detectedMileage: 49200,
      detectedBy: "Ника Кварацхелия",
      serviceStationName: "AutoClimat Батуми",
      repairCost: 45,
      repairNotes: "Произведена опрессовка и дозаправка 550г R134a + замена салонного угольного фильтра.",
      resolvedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      carPlate: "TB-800-GE", // Prado 150
      category: "TIRES",
      title: "Глубокий порез на переднем левом колесе All-Terrain",
      description: "После поездки в Верхнюю Сванетию на боковине шины обнаружен надрыв 1.5 см без выхода корда.",
      priority: "CRITICAL",
      status: "IN_SERVICE",
      detectedMileage: 71200,
      detectedBy: "Ираклий Беридзе",
      serviceStationName: "Шинный центр Tegeta",
      repairCost: 180,
      repairNotes: "Шина заменена на новую BFGoodrich KO2 265/65 R17",
    },
  ];

  for (const issue of sampleIssues) {
    const targetCar = await prisma.car.findUnique({ where: { plateNumber: issue.carPlate } });
    if (targetCar) {
      await prisma.carIssue.create({
        data: {
          carId: targetCar.id,
          category: issue.category,
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          detectedMileage: issue.detectedMileage,
          detectedBy: issue.detectedBy,
          serviceStationName: issue.serviceStationName,
          repairCost: issue.repairCost,
          repairNotes: issue.repairNotes,
          resolvedAt: issue.resolvedAt || null,
        },
      });
    }
  }

  // 3. Seed technical checklists
  const checklistSamples = [
    {
      carPlate: "TB-742-GE",
      inspectorName: "Механик Малхаз",
      overallCondition: "GOOD",
      engineOilLevel: "OK",
      brakeFluidLevel: "OK",
      coolantLevel: "OK",
      tireCondition: "GOOD",
      tirePressureBar: 2.3,
      brakePadsWearPerc: 40,
      notes: "Все уровни в норме, подвеску проверили на подъемнике, через 2000 км заменить втулки.",
    },
    {
      carPlate: "BA-007-GE",
      inspectorName: "Техник Резо (Батуми)",
      overallCondition: "NEEDS_ATTENTION",
      engineOilLevel: "OK",
      brakeFluidLevel: "OK",
      coolantLevel: "OK",
      tireCondition: "GOOD",
      tirePressureBar: 2.4,
      brakePadsWearPerc: 85,
      notes: "Задние колодки требуют срочной замены перед следующей арендой!",
    },
    {
      carPlate: "TB-001-GE",
      inspectorName: "Шеф-механик Георгий",
      overallCondition: "EXCELLENT",
      engineOilLevel: "OK",
      brakeFluidLevel: "OK",
      coolantLevel: "OK",
      tireCondition: "GOOD",
      tirePressureBar: 2.3,
      brakePadsWearPerc: 20,
      notes: "BMW X5 проверен по всем 12 пунктам. Состояние идеальное, готов к выдаче VIP клиенту.",
    },
  ];

  for (const chk of checklistSamples) {
    const car = await prisma.car.findUnique({ where: { plateNumber: chk.carPlate } });
    if (car) {
      await prisma.carTechnicalChecklist.create({
        data: {
          carId: car.id,
          inspectorName: chk.inspectorName,
          mileageAtCheck: car.currentMileage,
          overallCondition: chk.overallCondition,
          engineOilLevel: chk.engineOilLevel,
          brakeFluidLevel: chk.brakeFluidLevel,
          coolantLevel: chk.coolantLevel,
          tireCondition: chk.tireCondition,
          tirePressureBar: chk.tirePressureBar,
          brakePadsWearPerc: chk.brakePadsWearPerc,
          notes: chk.notes,
        },
      });
    }
  }

  console.log("✅ Fleet Maintenance database successfully seeded!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
