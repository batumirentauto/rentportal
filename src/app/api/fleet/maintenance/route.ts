import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "ALL";
    const filter = searchParams.get("filter") || "ALL"; // "ALL", "OIL_ALERT", "INSPECTION_ALERT", "INSURANCE_ALERT", "OPEN_ISSUES"
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (city !== "ALL") {
      where.city = { code: city };
    }
    if (search.trim()) {
      where.OR = [
        { brand: { contains: search } },
        { model: { contains: search } },
        { plateNumber: { contains: search } },
      ];
    }

    const cars = await prisma.car.findMany({
      where,
      include: {
        city: true,
        owner: true,
        issues: {
          orderBy: { createdAt: "desc" },
        },
        checklists: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
        mileageLogs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ city: { nameRu: "asc" } }, { brand: "asc" }],
    });

    const now = new Date();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    let totalOilDue = 0;
    let totalWithoutTechPassport = 0;
    let totalInsuranceExpiring = 0;
    let totalOpenIssues = 0;
    let totalCriticalIssues = 0;

    const enrichedCars = cars.map((car) => {
      const currentMileage = car.currentMileage || 0;
      const lastOilMileage = car.lastOilChangeMileage || 0;
      const oilInterval = car.oilChangeIntervalKm || 8000;
      const nextOilMileage = lastOilMileage + oilInterval;
      const kmUntilOilChange = nextOilMileage - currentMileage;

      let oilStatus: "OK" | "DUE_SOON" | "OVERDUE" = "OK";
      if (kmUntilOilChange <= 0) {
        oilStatus = "OVERDUE";
        totalOilDue++;
      } else if (kmUntilOilChange <= 1200) {
        oilStatus = "DUE_SOON";
        totalOilDue++;
      }

      // Tech Passport status
      const hasTechPassportPhotos = Boolean(car.techPassportFrontUrl && car.techPassportBackUrl);
      const isTechPassportMissing = !car.techPassportFrontUrl || !car.techPassportNumber;
      if (isTechPassportMissing) {
        totalWithoutTechPassport++;
      }

      // Insurance
      let insuranceDaysRemaining: number | null = null;
      let insuranceStatus: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" = "ACTIVE";
      if (car.insuranceExpiryDate) {
        const diffMs = new Date(car.insuranceExpiryDate).getTime() - now.getTime();
        insuranceDaysRemaining = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (insuranceDaysRemaining <= 0) {
          insuranceStatus = "EXPIRED";
          totalInsuranceExpiring++;
        } else if (insuranceDaysRemaining <= 30) {
          insuranceStatus = "EXPIRING_SOON";
          totalInsuranceExpiring++;
        }
      }

      // Issues breakdown
      const activeIssues = car.issues.filter((i) => i.status !== "RESOLVED");
      const criticalCount = activeIssues.filter((i) => i.priority === "CRITICAL").length;
      totalOpenIssues += activeIssues.length;
      totalCriticalIssues += criticalCount;

      const lastChecklist = car.checklists[0] || null;

      return {
        id: car.id,
        plateNumber: car.plateNumber,
        vin: car.vin,
        brand: car.brand,
        model: car.model,
        year: car.year,
        color: car.color,
        transmission: car.transmission,
        carClass: car.carClass,
        cityCode: car.city.code,
        cityName: car.city.nameRu,
        currentMileage,
        owner: car.owner
          ? {
              id: car.owner.id,
              fullName: car.owner.fullName,
              phone: car.owner.phone,
            }
          : null,
        oil: {
          lastOilChangeMileage: lastOilMileage,
          lastOilChangeDate: car.lastOilChangeDate,
          oilInterval,
          nextOilMileage,
          kmUntilOilChange,
          oilStatus,
          oilType: car.oilType || "5W-30 Full Synthetic",
        },
        techPassport: {
          number: car.techPassportNumber || "",
          frontUrl: car.techPassportFrontUrl || null,
          backUrl: car.techPassportBackUrl || null,
          hasPhotos: hasTechPassportPhotos,
          isMissing: isTechPassportMissing,
        },
        insurance: {
          company: car.insuranceCompany || "Aldagi",
          policyNumber: car.insurancePolicyNumber || "POL-GEO-88120",
          type: car.insuranceType || "CASCO_CDW",
          expiryDate: car.insuranceExpiryDate,
          deductible: car.insuranceDeductible || 300,
          status: insuranceStatus,
          daysRemaining: insuranceDaysRemaining,
          photoUrl: car.insurancePolicyPhotoUrl || null,
        },
        batumiParking: {
          hasParking: car.hasBatumiParking,
          permitNumber: car.batumiParkingPermitNumber,
          expiresAt: car.batumiParkingExpiresAt,
          cost: car.batumiParkingCost || 40,
          daysRemaining: car.batumiParkingExpiresAt
            ? Math.ceil((new Date(car.batumiParkingExpiresAt).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
            : null,
          isValid: Boolean(car.hasBatumiParking && (!car.batumiParkingExpiresAt || new Date(car.batumiParkingExpiresAt) > now)),
        },
        gps: {
          hasGps: car.hasGpsTracker,
          monthlyFee: car.gpsMonthlyFee || 10,
          isChargedToOwner: car.isGpsFeeChargedToOwner,
        },
        issues: {
          all: car.issues,
          active: activeIssues,
          activeCount: activeIssues.length,
          hasCritical: criticalCount > 0,
        },
        lastChecklist,
        mileageLogs: car.mileageLogs,
      };
    });

    // Apply alert filter if specified
    let filteredCars = enrichedCars;
    if (filter === "OIL_ALERT") {
      filteredCars = enrichedCars.filter((c) => c.oil.oilStatus !== "OK");
    } else if (filter === "TECH_PASSPORT_ALERT" || filter === "INSPECTION_ALERT") {
      filteredCars = enrichedCars.filter((c) => c.techPassport.isMissing);
    } else if (filter === "INSURANCE_ALERT") {
      filteredCars = enrichedCars.filter((c) => c.insurance.status !== "ACTIVE");
    } else if (filter === "OPEN_ISSUES") {
      filteredCars = enrichedCars.filter((c) => c.issues.activeCount > 0);
    }

    return NextResponse.json({
      success: true,
      totalCars: enrichedCars.length,
      summary: {
        totalOilDue,
        totalWithoutTechPassport,
        totalInsuranceExpiring,
        totalOpenIssues,
        totalCriticalIssues,
      },
      cars: filteredCars,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("GET /api/fleet/maintenance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fleet maintenance data" },
      { status: 500 }
    );
  }
}

// POST: Register New Issue, Oil Change, Checklist, or Mileage Update
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    // 1. Log an Oil Change
    if (action === "OIL_CHANGE") {
      const { carId, currentMileage, oilType, cost = 65, notes, technicianName } = body;
      if (!carId || !currentMileage) {
        return NextResponse.json({ success: false, error: "carId and currentMileage required" }, { status: 400 });
      }

      const updatedCar = await prisma.car.update({
        where: { id: carId },
        data: {
          currentMileage: Number(currentMileage),
          lastOilChangeMileage: Number(currentMileage),
          lastOilChangeDate: new Date(),
          oilType: oilType || undefined,
        },
      });

      await prisma.mileageLog.create({
        data: {
          carId,
          mileage: Number(currentMileage),
          source: "OIL_CHANGE",
          loggedBy: technicianName || "Техник проката",
          notes: notes || `Замена моторного масла ${oilType || "5W-30"}. Затраты: $${cost}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Замена масла для ${updatedCar.brand} ${updatedCar.model} на пробеге ${currentMileage} км зафиксирована!`,
      });
    }

    // 2. Register Technical Fault / Malfunction (Issue)
    if (action === "REPORT_ISSUE") {
      const {
        carId,
        category,
        title,
        description,
        priority = "MEDIUM",
        detectedBy,
        detectedMileage,
        serviceStationName,
      } = body;

      if (!carId || !category || !title) {
        return NextResponse.json({ success: false, error: "carId, category, and title are required" }, { status: 400 });
      }

      const issue = await prisma.carIssue.create({
        data: {
          carId,
          category,
          title,
          description,
          priority,
          status: "OPEN",
          detectedBy,
          detectedMileage: detectedMileage ? Number(detectedMileage) : undefined,
          serviceStationName,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Неисправность успешно зафиксирована и передана в автосервис!",
        issue,
      });
    }

    // 3. Technical Condition Checklist Submission
    if (action === "SUBMIT_CHECKLIST") {
      const {
        carId,
        inspectorName,
        mileageAtCheck,
        overallCondition = "GOOD",
        engineOilLevel = "OK",
        brakeFluidLevel = "OK",
        coolantLevel = "OK",
        tireCondition = "GOOD",
        tirePressureBar = 2.2,
        brakePadsWearPerc = 30,
        exteriorLightsOk = true,
        wipersAndWashOk = true,
        airConditioningOk = true,
        suspensionNoiseOk = true,
        emergencyKitOk = true,
        notes,
      } = body;

      if (!carId || !inspectorName || !mileageAtCheck) {
        return NextResponse.json({ success: false, error: "carId, inspectorName, and mileageAtCheck are required" }, { status: 400 });
      }

      // Update car mileage if higher
      await prisma.car.update({
        where: { id: carId },
        data: { currentMileage: Number(mileageAtCheck) },
      });

      const checklist = await prisma.carTechnicalChecklist.create({
        data: {
          carId,
          inspectorName,
          mileageAtCheck: Number(mileageAtCheck),
          overallCondition,
          engineOilLevel,
          brakeFluidLevel,
          coolantLevel,
          tireCondition,
          tirePressureBar: Number(tirePressureBar),
          brakePadsWearPerc: Number(brakePadsWearPerc),
          exteriorLightsOk: Boolean(exteriorLightsOk),
          wipersAndWashOk: Boolean(wipersAndWashOk),
          airConditioningOk: Boolean(airConditioningOk),
          suspensionNoiseOk: Boolean(suspensionNoiseOk),
          emergencyKitOk: Boolean(emergencyKitOk),
          notes,
        },
      });

      await prisma.mileageLog.create({
        data: {
          carId,
          mileage: Number(mileageAtCheck),
          source: "CHECKLIST",
          loggedBy: inspectorName,
          notes: `Проверка по тех. чек-листу. Статус: ${overallCondition}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Технический осмотр по чек-листу успешно сохранен!`,
        checklist,
      });
    }

    // 4. Update Tech Passport, Insurance, Batumi Parking, and GPS details
    if (action === "UPDATE_DOCS") {
      const {
        carId,
        techPassportNumber,
        techPassportFrontUrl,
        techPassportBackUrl,
        insuranceCompany,
        insurancePolicyNumber,
        insuranceExpiryDate,
        insuranceDeductible,
        insurancePolicyPhotoUrl,
        hasBatumiParking,
        batumiParkingPermitNumber,
        batumiParkingExpiresAt,
        batumiParkingCost,
        recordParkingExpense,
        hasGpsTracker,
        gpsMonthlyFee,
        isGpsFeeChargedToOwner,
      } = body;

      if (!carId) {
        return NextResponse.json({ success: false, error: "carId is required" }, { status: 400 });
      }

      const updateData: any = {};
      if (techPassportNumber !== undefined) updateData.techPassportNumber = techPassportNumber;
      if (techPassportFrontUrl !== undefined) updateData.techPassportFrontUrl = techPassportFrontUrl || null;
      if (techPassportBackUrl !== undefined) updateData.techPassportBackUrl = techPassportBackUrl || null;
      if (insurancePolicyPhotoUrl !== undefined) updateData.insurancePolicyPhotoUrl = insurancePolicyPhotoUrl || null;
      if (insuranceCompany) updateData.insuranceCompany = insuranceCompany;
      if (insurancePolicyNumber) updateData.insurancePolicyNumber = insurancePolicyNumber;
      if (insuranceExpiryDate) {
        updateData.insuranceExpiryDate = new Date(insuranceExpiryDate);
        updateData.insuranceStatus = "ACTIVE";
      }
      if (insuranceDeductible !== undefined) updateData.insuranceDeductible = Number(insuranceDeductible);

      if (hasBatumiParking !== undefined) updateData.hasBatumiParking = Boolean(hasBatumiParking);
      if (batumiParkingPermitNumber !== undefined) updateData.batumiParkingPermitNumber = batumiParkingPermitNumber;
      if (batumiParkingExpiresAt) updateData.batumiParkingExpiresAt = new Date(batumiParkingExpiresAt);
      if (batumiParkingCost !== undefined) updateData.batumiParkingCost = Number(batumiParkingCost);

      if (hasGpsTracker !== undefined) updateData.hasGpsTracker = Boolean(hasGpsTracker);
      if (gpsMonthlyFee !== undefined) updateData.gpsMonthlyFee = Number(gpsMonthlyFee);
      if (isGpsFeeChargedToOwner !== undefined) updateData.isGpsFeeChargedToOwner = Boolean(isGpsFeeChargedToOwner);

      const updatedCar = await prisma.car.update({
        where: { id: carId },
        data: updateData,
        include: { owner: true },
      });

      // Зафиксировать расход на парковочное разрешение для владельца, если запрошено
      if (recordParkingExpense && updatedCar.ownerId) {
        const defaultAcc = await prisma.financialAccount.findFirst({ where: { currency: "GEL" } }) || await prisma.financialAccount.findFirst();
        if (defaultAcc) {
          const cost = Number(batumiParkingCost || 40);
          await prisma.expense.create({
            data: {
              accountId: defaultAcc.id,
              ownerId: updatedCar.ownerId,
              carId: updatedCar.id,
              category: "BATUMI_PARKING",
              amount: cost,
              currency: "GEL",
              description: `Парковочный абонемент Батуми (Batumi Parking) на ${updatedCar.brand} ${updatedCar.model} (${updatedCar.plateNumber})`,
              isOwnerExpense: true,
              managerName: "Менеджер автопарка",
              date: new Date(),
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Параметры документов, парковки Батуми и GPS для ${updatedCar.brand} ${updatedCar.model} обновлены!`,
        car: updatedCar,
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("POST /api/fleet/maintenance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process maintenance action" },
      { status: 500 }
    );
  }
}

// PATCH: Resolve or Update Issue Status
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { issueId, status, repairCost, repairNotes, serviceStationName } = body;

    if (!issueId || !status) {
      return NextResponse.json({ success: false, error: "issueId and status required" }, { status: 400 });
    }

    const updateData: any = { status };
    if (status === "RESOLVED") {
      updateData.resolvedAt = new Date();
    }
    if (repairCost !== undefined) updateData.repairCost = Number(repairCost);
    if (repairNotes !== undefined) updateData.repairNotes = repairNotes;
    if (serviceStationName !== undefined) updateData.serviceStationName = serviceStationName;

    const issue = await prisma.carIssue.update({
      where: { id: issueId },
      data: updateData,
      include: { car: true },
    });

    return NextResponse.json({
      success: true,
      message: `Статус неисправности по ${issue.car.brand} ${issue.car.model} изменен на: ${status}!`,
      issue,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("PATCH /api/fleet/maintenance error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update issue" },
      { status: 500 }
    );
  }
}
