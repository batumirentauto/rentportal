import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = searchParams.get("city");
    const status = searchParams.get("status"); // "ALL", "PENDING", "IN_PROGRESS", "COMPLETED", "VERIFIED"
    const priority = searchParams.get("priority");

    const where: any = {};

    if (cityCode && cityCode !== "ALL") {
      where.OR = [
        { city: { code: cityCode } },
        { car: { city: { code: cityCode } } },
        { cityId: null }, // Общие задачи для всех городов
      ];
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    const tasks = await prisma.managerTask.findMany({
      where,
      include: {
        car: {
          include: {
            city: true,
          },
        },
        city: true,
      },
      orderBy: [
        { priority: "asc" }, // URGENT first if sorted or handle custom
        { createdAt: "desc" },
      ],
    });

    // Custom sorting: URGENT -> HIGH -> MEDIUM -> LOW
    const priorityWeight: Record<string, number> = {
      URGENT: 1,
      HIGH: 2,
      MEDIUM: 3,
      LOW: 4,
    };

    const statusWeight: Record<string, number> = {
      PENDING: 1,
      IN_PROGRESS: 2,
      COMPLETED: 3,
      VERIFIED: 4,
      CANCELLED: 5,
    };

    const sortedTasks = [...tasks].sort((a, b) => {
      const sDiff = (statusWeight[a.status] || 99) - (statusWeight[b.status] || 99);
      if (sDiff !== 0) return sDiff;
      const pDiff = (priorityWeight[a.priority] || 99) - (priorityWeight[b.priority] || 99);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const summary = {
      totalCount: tasks.length,
      pendingCount: tasks.filter((t) => t.status === "PENDING").length,
      inProgressCount: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completedCount: tasks.filter((t) => t.status === "COMPLETED").length,
      verifiedCount: tasks.filter((t) => t.status === "VERIFIED").length,
      urgentCount: tasks.filter((t) => t.priority === "URGENT" && t.status !== "VERIFIED" && t.status !== "CANCELLED").length,
    };

    return NextResponse.json({
      success: true,
      tasks: sortedTasks,
      summary,
    });
  } catch (error) {
    console.error("Error loading manager tasks:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load manager tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      category,
      priority,
      assignedToName,
      cityId,
      carId,
      dueDateTime,
      createdByName,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: "Название задачи обязательно для заполнения" },
        { status: 400 }
      );
    }

    const newTask = await prisma.managerTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        category: category || "GENERAL",
        priority: priority || "MEDIUM",
        status: "PENDING",
        assignedToName: assignedToName || "Менеджер смены",
        cityId: cityId || null,
        carId: carId || null,
        dueDateTime: dueDateTime ? new Date(dueDateTime) : null,
        createdByName: createdByName || "Руководитель",
      },
      include: {
        car: {
          include: {
            city: true,
          },
        },
        city: true,
      },
    });

    return NextResponse.json({
      success: true,
      task: newTask,
      message: "Задача успешно поставлена менеджеру!",
    });
  } catch (error) {
    console.error("Error creating manager task:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при постановке задачи менеджеру" },
      { status: 500 }
    );
  }
}
