import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await connection();
  try {
    const users = await prisma.user.findMany({
      include: {
        city: true,
        financialAccounts: true,
        owner: {
          include: {
            cars: {
              include: { city: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const owners = await prisma.carOwner.findMany({
      include: {
        cars: true,
      },
      orderBy: { fullName: "asc" },
    });

    const cities = await prisma.city.findMany({
      orderBy: { nameRu: "asc" },
    });

    const accounts = await prisma.financialAccount.findMany({
      include: { city: true, user: true },
      orderBy: { type: "asc" },
    });

    return NextResponse.json({
      success: true,
      users: users.map((u) => {
        const cashAcc = u.financialAccounts?.find((a) => a.type === "CASH") || u.financialAccounts?.[0];
        return {
          id: u.id,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          telegram: u.telegram,
          role: u.role,
          status: u.status,
          cityName: u.city?.nameRu || "Все филиалы",
          cityCode: u.city?.code || "ALL",
          cityId: u.cityId,
          cashAccountId: cashAcc?.id || null,
          cashAccountName: cashAcc?.name || null,
          cashBalanceGEL: cashAcc?.currentBalance || 0,
          ownerId: u.ownerId,
          ownerName: u.owner?.fullName,
          carsCount: u.owner?.cars?.length || 0,
          cars: u.owner?.cars?.map((c) => `${c.brand} ${c.model} (${c.plateNumber})`) || [],
          createdAt: u.createdAt,
        };
      }),
      owners: owners.map((o) => ({
        id: o.id,
        fullName: o.fullName,
        phone: o.phone,
        carsCount: o.cars.length,
      })),
      cities: cities.map((c) => ({
        id: c.id,
        nameRu: c.nameRu,
        code: c.code,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currency: a.currency,
        currentBalance: a.currentBalance,
        managerResponsible: a.managerResponsible,
        userId: a.userId,
        cityName: a.city?.nameRu || "Центральный",
      })),
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/team error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch team users" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action,
      userId,
      fullName,
      phone,
      email,
      telegram,
      role = "MANAGER",
      cityId,
      ownerId,
      status = "ACTIVE",
      // Cash Transfer / Collection (Инкассация)
      fromAccountId,
      toAccountId,
      amount,
      notes,
      managerName,
    } = body;

    // 1. Инкассация / Передача денег из кассы менеджера в центральную кассу или на банковский счет (BOG, TBC)
    if (action === "TRANSFER_CASH") {
      if (!fromAccountId || !toAccountId || !amount) {
        return NextResponse.json(
          { success: false, error: "Укажите кассу списания, целевой счёт и сумму инкассации" },
          { status: 400 }
        );
      }

      const numAmount = Number(amount);
      if (numAmount <= 0) {
        return NextResponse.json({ success: false, error: "Сумма должна быть больше 0" }, { status: 400 });
      }

      // Списываем из кассы менеджера
      const fromAcc = await prisma.financialAccount.update({
        where: { id: fromAccountId },
        data: { currentBalance: { decrement: numAmount } },
      });

      // Пополняем целевой счет / кассу
      const toAcc = await prisma.financialAccount.update({
        where: { id: toAccountId },
        data: { currentBalance: { increment: numAmount } },
      });

      // Фиксируем расход в кассе менеджера
      await prisma.expense.create({
        data: {
          accountId: fromAccountId,
          category: "OTHER",
          amount: numAmount,
          currency: fromAcc.currency || "GEL",
          description: `Инкассация: передача наличных в «${toAcc.name}» (${notes || "сдача выручки"})`,
          cityId: fromAcc.cityId || undefined,
          managerName: managerName || fromAcc.managerResponsible || "Менеджер",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Инкассация успешно проведена! ${numAmount} ₾ передано из «${fromAcc.name}» в «${toAcc.name}»`,
        fromBalance: fromAcc.currentBalance,
        toBalance: toAcc.currentBalance,
      });
    }

    // 2. Удаление пользователя
    if (action === "DELETE" && userId) {
      const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
      if (userToDelete) {
        // Удаляем или отвязываем связанные наличные кассы сотрудника
        await prisma.financialAccount.deleteMany({
          where: {
            OR: [
              { userId: userToDelete.id },
              { managerResponsible: userToDelete.fullName },
            ],
          },
        }).catch((e) => console.warn("Notice: could not delete financial accounts for user:", e));
      }
      await prisma.user.delete({ where: { id: userId } });
      return NextResponse.json({ success: true, message: "Пользователь и его касса успешно удалены" });
    }

    // 2.5. Полное редактирование карточки сотрудника
    if (action === "UPDATE_USER" && userId) {
      if (!fullName || !fullName.trim()) {
        return NextResponse.json(
          { success: false, error: "Имя сотрудника / владельца обязательно" },
          { status: 400 }
        );
      }

      let finalOwnerId = ownerId || null;
      if (role === "OWNER") {
        let co = null;
        if (finalOwnerId) {
          co = await prisma.carOwner.findUnique({ where: { id: finalOwnerId } });
        }
        if (!co) {
          co = await prisma.carOwner.findFirst({ where: { fullName: fullName.trim() } });
        }
        if (!co) {
          co = await prisma.carOwner.create({
            data: {
              fullName: fullName.trim(),
              phone: phone ? phone.trim() : "+995-500-00-00",
              email: email ? email.trim() : null,
              whatsapp: phone ? phone.trim() : null,
            },
          });
        }
        finalOwnerId = co.id;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          fullName: fullName.trim(),
          phone: phone ? phone.trim() : null,
          email: email ? email.trim() : null,
          telegram: telegram ? telegram.trim().replace(/^@/, "") : null,
          role,
          status,
          cityId: cityId || null,
          ownerId: finalOwnerId,
        },
        include: {
          city: true,
          owner: true,
        },
      });

      // Если сотруднику назначена роль менеджера и у него еще нет кассы — создаем
      if (role === "MANAGER") {
        const existingCash = await prisma.financialAccount.findFirst({
          where: { userId },
        });
        if (!existingCash) {
          const cityName = updated.city?.nameRu || "Грузия";
          await prisma.financialAccount.create({
            data: {
              name: `Касса нал: ${updated.fullName} (${cityName})`,
              type: "CASH",
              currency: "GEL",
              bankName: "NONE",
              cityId: updated.cityId || undefined,
              userId: updated.id,
              managerResponsible: updated.fullName,
              isManagerCash: true,
              initialBalance: 0,
              currentBalance: 0,
            },
          });
        }
      }

      // Если это владелец (инвестор) и у него есть связанный CarOwner, синхронизируем имя и телефон
      if (updated.ownerId) {
        await prisma.carOwner.update({
          where: { id: updated.ownerId },
          data: {
            fullName: updated.fullName,
            phone: updated.phone || undefined,
            email: updated.email || undefined,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        message: `Данные сотрудника «${updated.fullName}» успешно сохранены!`,
        user: updated,
      });
    }

    // 3. Обновление роли
    if (action === "UPDATE_ROLE" && userId) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role, status, cityId: cityId || null, ownerId: ownerId || null },
      });

      // Если сотруднику назначена роль менеджера и у него еще нет кассы — создаем
      if (role === "MANAGER") {
        const existingCash = await prisma.financialAccount.findFirst({
          where: { userId },
        });
        if (!existingCash) {
          const city = updated.cityId ? await prisma.city.findUnique({ where: { id: updated.cityId } }) : null;
          const cityName = city?.nameRu || "Грузия";
          await prisma.financialAccount.create({
            data: {
              name: `Касса нал: ${updated.fullName} (${cityName})`,
              type: "CASH",
              currency: "GEL",
              bankName: "NONE",
              cityId: updated.cityId || undefined,
              userId: updated.id,
              managerResponsible: updated.fullName,
              isManagerCash: true,
              initialBalance: 0,
              currentBalance: 0,
            },
          });
        }
      }

      return NextResponse.json({ success: true, user: updated });
    }

    if (!fullName) {
      return NextResponse.json(
        { success: false, error: "Имя сотрудника / владельца обязательно" },
        { status: 400 }
      );
    }

    let finalOwnerId = ownerId || null;
    if (role === "OWNER") {
      let co = null;
      if (finalOwnerId) {
        co = await prisma.carOwner.findUnique({ where: { id: finalOwnerId } });
      }
      if (!co) {
        co = await prisma.carOwner.findFirst({ where: { fullName: fullName.trim() } });
      }
      if (!co) {
        co = await prisma.carOwner.create({
          data: {
            fullName: fullName.trim(),
            phone: phone ? phone.trim() : "+995-500-00-00",
            email: email ? email.trim() : null,
            whatsapp: phone ? phone.trim() : null,
          },
        });
      }
      finalOwnerId = co.id;
    }

    // 4. Создание нового пользователя
    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        phone: phone || null,
        email: email || null,
        telegram: telegram || null,
        role,
        status,
        cityId: cityId || null,
        ownerId: finalOwnerId,
      },
      include: {
        city: true,
        owner: true,
      },
    });

    // 5. АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПЕРСОНАЛЬНОЙ НАЛИЧНОЙ КАССЫ ДЛЯ МЕНЕДЖЕРА
    let createdCashAccount = null;
    if (role === "MANAGER") {
      const cityName = newUser.city?.nameRu || "Грузия";
      createdCashAccount = await prisma.financialAccount.create({
        data: {
          name: `Касса нал: ${fullName} (${cityName})`,
          type: "CASH",
          currency: "GEL",
          bankName: "NONE",
          cityId: cityId || undefined,
          userId: newUser.id,
          managerResponsible: fullName,
          isManagerCash: true,
          initialBalance: 0,
          currentBalance: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: role === "MANAGER"
        ? `Менеджер «${fullName}» успешно добавлен! Для него автоматически открыта персональная наличная касса по филиалу.`
        : "Пользователь успешно создан и добавлен в команду!",
      user: newUser,
      cashAccount: createdCashAccount,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/team error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save team user" },
      { status: 500 }
    );
  }
}
