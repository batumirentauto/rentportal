import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    // 1. If roomId provided -> return message history for specific room
    if (roomId) {
      const room = await prisma.chatRoom.findUnique({
        where: { id: roomId },
        include: {
          city: true,
          members: {
            include: { user: true },
          },
          messages: {
            include: { sender: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!room) {
        return NextResponse.json({ success: false, error: "Chat room not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        room: {
          id: room.id,
          name: room.name,
          icon: room.icon,
          type: room.type,
          description: room.description,
          cityName: room.city?.nameRu || "Все филиалы",
          cityCode: room.city?.code || "ALL",
          members: room.members.map((m) => ({
            id: m.user.id,
            fullName: m.user.fullName,
            role: m.user.role,
            phone: m.user.phone,
          })),
          messages: room.messages.map((msg) => ({
            id: msg.id,
            senderId: msg.senderId,
            senderName: msg.senderName,
            senderRole: msg.senderRole,
            content: msg.content,
            carPlate: msg.carPlate,
            bookingId: msg.bookingId,
            createdAt: msg.createdAt,
          })),
        },
      });
    }

    // 2. Return list of all available chat rooms with last message & participant count
    const rooms = await prisma.chatRoom.findMany({
      include: {
        city: true,
        members: {
          include: { user: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        role: true,
        phone: true,
      },
      orderBy: { fullName: "asc" },
    });

    const cars = await prisma.car.findMany({
      select: {
        id: true,
        plateNumber: true,
        brand: true,
        model: true,
      },
      orderBy: { brand: "asc" },
    });

    return NextResponse.json({
      success: true,
      rooms: rooms.map((r) => {
        const lastMsg = r.messages[0];
        return {
          id: r.id,
          name: r.name,
          icon: r.icon,
          type: r.type,
          description: r.description,
          cityName: r.city?.nameRu || "Все города",
          cityCode: r.city?.code || "ALL",
          membersCount: r.members.length,
          lastMessage: lastMsg
            ? {
                content: lastMsg.content,
                senderName: lastMsg.senderName,
                createdAt: lastMsg.createdAt,
                carPlate: lastMsg.carPlate,
              }
            : null,
        };
      }),
      users,
      cars,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("GET /api/chats error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      action = "SEND_MESSAGE",
      roomId,
      content,
      senderName = "Сотрудник",
      senderRole = "MANAGER",
      senderId,
      carPlate,
      bookingId,
      // For CREATE_ROOM
      name,
      icon = "💬",
      type = "GROUP",
      cityId,
      description,
      memberUserIds = [],
    } = body;

    // 1. Отправка сообщения в чат
    if (action === "SEND_MESSAGE") {
      if (!roomId || !content?.trim()) {
        return NextResponse.json(
          { success: false, error: "roomId и текст сообщения обязательны" },
          { status: 400 }
        );
      }

      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          content: content.trim(),
          senderName,
          senderRole,
          senderId: senderId || undefined,
          carPlate: carPlate || undefined,
          bookingId: bookingId || undefined,
        },
      });

      // Update room updatedAt
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message,
      });
    }

    // 2. Создание нового чата (тематического или личного)
    if (action === "CREATE_ROOM") {
      if (!name?.trim()) {
        return NextResponse.json(
          { success: false, error: "Название чата обязательно" },
          { status: 400 }
        );
      }

      const room = await prisma.chatRoom.create({
        data: {
          name: name.trim(),
          icon: icon || "💬",
          type,
          cityId: cityId || undefined,
          description: description || undefined,
        },
      });

      // Добавляем выбранных участников
      if (Array.isArray(memberUserIds) && memberUserIds.length > 0) {
        for (const uid of memberUserIds) {
          await prisma.chatMember.create({
            data: {
              roomId: room.id,
              userId: uid,
            },
          }).catch(() => {});
        }
      } else {
        // Если участников не выбрали — добавляем всех менеджеров и руководителей
        const allUsers = await prisma.user.findMany();
        for (const u of allUsers) {
          await prisma.chatMember.create({
            data: {
              roomId: room.id,
              userId: u.id,
            },
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        success: true,
        message: `Чат «${room.name}» успешно создан!`,
        room,
      });
    }

    // 3. Добавление участника в чат
    if (action === "ADD_MEMBER") {
      const { userId: memberToAdd } = body;
      if (!roomId || !memberToAdd) {
        return NextResponse.json({ success: false, error: "roomId and userId required" }, { status: 400 });
      }

      await prisma.chatMember.upsert({
        where: { roomId_userId: { roomId, userId: memberToAdd } },
        update: {},
        create: { roomId, userId: memberToAdd },
      });

      return NextResponse.json({ success: true, message: "Участник добавлен в чат" });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    if (error?.digest?.startsWith?.("NEXT_")) {
      throw error;
    }
    console.error("POST /api/chats error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process chat action" },
      { status: 500 }
    );
  }
}
