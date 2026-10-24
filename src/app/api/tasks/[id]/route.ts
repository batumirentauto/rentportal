import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await props.params;
    const body = await request.json();
    const { action, completionNotes, completedByName, verifiedByName } = body;

    const task = await prisma.managerTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Задача не найдена" },
        { status: 404 }
      );
    }

    let updatedData: any = {};

    switch (action) {
      case "ACCEPT":
        updatedData = {
          status: "IN_PROGRESS",
        };
        break;

      case "COMPLETE":
        updatedData = {
          status: "COMPLETED",
          completionNotes: completionNotes || "Задача выполнена менеджером",
          completedByName: completedByName || "Менеджер смены",
          completedAt: new Date(),
        };
        break;

      case "VERIFY":
        updatedData = {
          status: "VERIFIED",
          verifiedByName: verifiedByName || "Руководитель",
          verifiedAt: new Date(),
        };
        break;

      case "CANCEL":
        updatedData = {
          status: "CANCELLED",
        };
        break;

      default:
        return NextResponse.json(
          { success: false, error: "Недопустимое действие с задачей" },
          { status: 400 }
        );
    }

    const updatedTask = await prisma.managerTask.update({
      where: { id: taskId },
      data: updatedData,
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
      task: updatedTask,
      message: "Статус задачи успешно обновлен",
    });
  } catch (error) {
    console.error("Error updating manager task:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при обновлении задачи" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await props.params;
    await prisma.managerTask.delete({
      where: { id: taskId },
    });
    return NextResponse.json({
      success: true,
      message: "Задача удалена",
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, error: "Ошибка при удалении задачи" },
      { status: 500 }
    );
  }
}
