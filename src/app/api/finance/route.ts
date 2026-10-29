import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        account: true,
        booking: {
          include: {
            car: true,
            customer: true,
            pickupLocation: {
              include: {
                city: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Агрегация по валютам и методам оплаты
    const summary = {
      totalUSD: 0,
      totalGEL: 0,
      totalEUR: 0,
      depositsUSD: 0,
      depositsGEL: 0,
      pendingRefundsUSD: 0,
      byMethod: {
        CASH: 0,
        CARD_POS: 0,
        TBC_BANK: 0,
        BOG_BANK: 0,
        CREDO_BANK: 0,
        CRYPTO: 0,
      } as Record<string, number>,
    };

    payments.forEach((p) => {
      if (p.currency === "USD") {
        if (p.type === "DEPOSIT") {
          summary.depositsUSD += p.amount;
        } else {
          summary.totalUSD += p.amount;
        }
      } else if (p.currency === "GEL") {
        if (p.type === "DEPOSIT") {
          summary.depositsGEL += p.amount;
        } else {
          summary.totalGEL += p.amount;
        }
      } else if (p.currency === "EUR") {
        summary.totalEUR += p.amount;
      }

      if (p.changeOnReturn && p.changeOnReturn > 0) {
        summary.pendingRefundsUSD += p.changeOnReturn;
      }

      if (summary.byMethod[p.method] !== undefined) {
        summary.byMethod[p.method] += p.amount;
      }
    });

    return NextResponse.json({
      success: true,
      summary,
      payments,
    });
  } catch (error) {
    console.error("Error fetching financial data:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch financial data" },
      { status: 500 }
    );
  }
}
