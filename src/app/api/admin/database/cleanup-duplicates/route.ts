import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePlateKey, formatGeorgianPlate } from "@/lib/car-utils";
import { triggerAsyncFinancialSheetsSync } from "@/lib/financial-sheets-sync";

export async function POST() {
  try {
    const allCars = await prisma.car.findMany({
      include: {
        bookings: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const groups = new Map<string, typeof allCars>();
    for (const car of allCars) {
      const key = normalizePlateKey(car.plateNumber);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(car);
    }

    let mergedCount = 0;
    const details: any[] = [];

    for (const [key, carList] of groups.entries()) {
      if (carList.length > 1) {
        // Pick primary: one with bookings, tech passport, VIN, or photos
        let primary = carList[0];
        let maxScore = -1;

        for (const c of carList) {
          let score = c.bookings.length * 100;
          if (c.techPassportFrontUrl) score += 20;
          if (c.vin) score += 10;
          if (c.imageUrl) score += 5;
          if (c.ownerId) score += 5;
          if (score > maxScore) {
            maxScore = score;
            primary = c;
          }
        }

        const duplicates = carList.filter((c) => c.id !== primary.id);
        for (const dup of duplicates) {
          // 1. Move bookings
          if (dup.bookings.length > 0) {
            await prisma.booking.updateMany({
              where: { carId: dup.id },
              data: { carId: primary.id },
            });
          }
          // 2. Move availability blocks
          await prisma.carAvailabilityBlock.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          // 3. Move mileage logs
          await prisma.mileageLog.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          // 4. Move expenses
          await prisma.expense.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          // 5. Move fines
          await prisma.trafficFine.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          // 6. Move wash tasks, inspections & reports
          await prisma.carWashTask.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          await prisma.handoverReport.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          await prisma.returnReport.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          await prisma.carIssue.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});
          await prisma.carTechnicalChecklist.updateMany({
            where: { carId: dup.id },
            data: { carId: primary.id },
          }).catch(() => {});

          // 7. Merge missing fields into primary
          const updateData: any = {};
          if (!primary.ownerId && dup.ownerId) updateData.ownerId = dup.ownerId;
          if (!primary.imageUrl && dup.imageUrl) updateData.imageUrl = dup.imageUrl;
          if (!primary.techPassportFrontUrl && dup.techPassportFrontUrl) {
            updateData.techPassportFrontUrl = dup.techPassportFrontUrl;
            updateData.hasTechPassport = true;
          }
          if (!primary.vin && dup.vin) updateData.vin = dup.vin;
          if (!primary.techPassportNumber && dup.techPassportNumber) {
            updateData.techPassportNumber = dup.techPassportNumber;
          }

          // 8. Safely delete duplicate car first so unique plate constraint is freed
          try {
            await prisma.car.delete({ where: { id: dup.id } });
          } catch {
            // If foreign key constraint still blocks, rename plate so primary can take standard format
            await prisma.car.update({
              where: { id: dup.id },
              data: { plateNumber: `${dup.plateNumber}_DUP_${dup.id.slice(0, 6)}` },
            }).catch(() => {});
            await prisma.car.delete({ where: { id: dup.id } }).catch(() => {});
          }

          // 9. Standardize primary plate format
          const stdPlate = formatGeorgianPlate(primary.plateNumber);
          if (stdPlate && stdPlate !== primary.plateNumber) {
            updateData.plateNumber = stdPlate;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.car.update({
              where: { id: primary.id },
              data: updateData,
            });
            // Update in-memory primary plate in case next duplicate is merged
            if (updateData.plateNumber) primary.plateNumber = updateData.plateNumber;
          }

          mergedCount++;
          details.push({
            plateKey: key,
            primaryId: primary.id,
            deletedDuplicateId: dup.id,
            car: `${primary.brand} ${primary.model}`,
          });
        }
      }
    }

    if (mergedCount > 0) {
      triggerAsyncFinancialSheetsSync();
    }

    return NextResponse.json({
      success: true,
      message: `Успешно объединено и удалено дубликатов: ${mergedCount}`,
      mergedCount,
      details,
    });
  } catch (error: any) {
    console.error("Cleanup duplicates error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
