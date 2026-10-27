import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers/[id]/debts - Получение всех долгов клиента
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await props.params;

    const debts = await prisma.customerDebt.findMany({
      where: { customerId },
      include: {
        booking: {
          select: {
            id: true,
            bookingNumber: true,
            startDate: true,
            endDate: true,
            car: {
              select: {
                id: true,
                brand: true,
                model: true,
                plateNumber: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let totalActiveDebt = 0;
    debts.forEach((d) => {
      if (d.status === "ACTIVE" || d.status === "PARTIALLY_PAID") {
        totalActiveDebt += Math.max(0, d.amount - (d.paidAmount || 0));
      }
    });

    return NextResponse.json({
      success: true,
      debts,
      totalActiveDebt,
    });
  } catch (error) {
    console.error("GET /api/customers/[id]/debts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer debts" },
      { status: 500 }
    );
  }
}

// POST /api/customers/[id]/debts - Навешивание долга на клиента вручную
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await props.params;
    const body = await request.json();

    const {
      amount,
      category = "GENERAL", // "FINES" | "DAMAGE" | "FUEL" | "RENTAL" | "WASH" | "GENERAL"
      description,
      dueDate = null,
      bookingId = null,
      carPlate = null,
      notes = null,
      createdByName = "Менеджер смены",
    } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Укажите корректную сумму долга" },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { success: false, error: "Укажите описание / причину долга" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Клиент не найден" },
        { status: 404 }
      );
    }

    const debt = await prisma.customerDebt.create({
      data: {
        customerId,
        bookingId: bookingId || null,
        carPlate: carPlate || null,
        amount: Number(amount),
        paidAmount: 0,
        currency: "GEL",
        category,
        description: description.trim(),
        status: "ACTIVE",
        dueDate: dueDate ? new Date(dueDate) : null,
        createdByName,
        notes: notes ? notes.trim() : null,
      },
    });

    return NextResponse.json({
      success: true,
      debt,
      message: `Долг в размере ${debt.amount} ₾ успешно записан на клиента ${customer.fullName}`,
    });
  } catch (error) {
    console.error("POST /api/customers/[id]/debts error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create customer debt" },
      { status: 500 }
    );
  }
}
