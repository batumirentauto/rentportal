import { NextResponse } from "next/server";
import {
  FINANCIAL_SPREADSHEET_ID,
  FINANCIAL_SPREADSHEET_URL,
  syncAllFinancialDataToGoogleSheets,
} from "@/lib/financial-sheets-sync";

let lastSyncCache: any = null;

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      spreadsheetId: FINANCIAL_SPREADSHEET_ID,
      spreadsheetUrl: FINANCIAL_SPREADSHEET_URL,
      lastSync: lastSyncCache,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to get sheets sync status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let targetSpreadsheetId = FINANCIAL_SPREADSHEET_ID;
    try {
      const body = await request.json();
      if (body?.spreadsheetId) {
        targetSpreadsheetId = body.spreadsheetId;
      }
    } catch {
      // empty body is fine
    }

    const result = await syncAllFinancialDataToGoogleSheets(targetSpreadsheetId);
    lastSyncCache = result;

    return NextResponse.json({
      success: true,
      result,
      spreadsheetUrl: result.spreadsheetUrl,
    });
  } catch (error: any) {
    console.error("Manual Google Sheets sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Ошибка синхронизации с Google Таблицей" },
      { status: 500 }
    );
  }
}
