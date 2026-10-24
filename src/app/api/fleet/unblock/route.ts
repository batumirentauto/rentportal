import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      carId,
      newInspectionExpiryDate,
      newInspectionNumber,
      newInsuranceExpiryDate,
      newInsurancePolicyNumber,
      unblockNotes,
    } = body;

    if (!carId) {
      return NextResponse.json({ success: false, error: "carId is required" }, { status: 400 });
    }

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: { city: true },
    });

    if (!car) {
      return NextResponse.json({ success: false, error: "Car not found" }, { status: 404 });
    }

    const updateData: any = {
      isStopBlocked: false,
      stopReason: null,
      status: "AVAILABLE",
    };

    if (newInspectionExpiryDate) {
      updateData.inspectionExpiryDate = new Date(newInspectionExpiryDate);
      updateData.inspectionStatus = "VALID";
      if (newInspectionNumber) updateData.inspectionNumber = newInspectionNumber;
    }

    if (newInsuranceExpiryDate) {
      updateData.insuranceExpiryDate = new Date(newInsuranceExpiryDate);
      updateData.insuranceStatus = "ACTIVE";
      if (newInsurancePolicyNumber) updateData.insurancePolicyNumber = newInsurancePolicyNumber;
    }

    if (unblockNotes) {
      updateData.stopNotes = unblockNotes;
    }

    const updatedCar = await prisma.car.update({
      where: { id: carId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Автомобиль ${updatedCar.brand} ${updatedCar.model} (${updatedCar.plateNumber}) успешно снят со СТОПа и доступен для бронирования!`,
      car: updatedCar,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) throw error;
    console.error("POST /api/fleet/unblock error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to unblock car" },
      { status: 500 }
    );
  }
}
