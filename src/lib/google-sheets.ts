import { JWT } from "google-auth-library";
import fs from "fs";
import path from "path";

export interface GoogleSheetsCredentials {
  client_email: string;
  private_key: string;
}

export function getGoogleSheetsCredentials(): GoogleSheetsCredentials | null {
  // 1. Environment variable with raw JSON content
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      }
    } catch (e) {
      console.warn("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON env var:", e);
    }
  }

  // 2. Environment variable with file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      const content = fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
      const parsed = JSON.parse(content);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      }
    } catch (e) {
      console.warn("Failed to read GOOGLE_APPLICATION_CREDENTIALS file:", e);
    }
  }

  // 3. Local known paths
  const localCandidates = [
    path.resolve(process.cwd(), "service-account.json"),
    "/Users/workpc/Downloads/vsl-car-rental-3fbffe7e9494.json",
    "/Users/workpc/Downloads/Telegram Desktop/vsl-car-rental-3fbffe7e9494.json",
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(/*turbopackIgnore: true*/ candidate)) {
      try {
        const content = fs.readFileSync(/*turbopackIgnore: true*/ candidate, "utf8");
        const parsed = JSON.parse(content);
        if (parsed.client_email && parsed.private_key) {
          return {
            client_email: parsed.client_email,
            private_key: parsed.private_key,
          };
        }
      } catch (e) {
        console.warn(`Failed reading candidate ${candidate}:`, e);
      }
    }
  }

  return null;
}

export async function fetchSpreadsheetRows(spreadsheetId: string, range = "A1:Z100") {
  const credentials = getGoogleSheetsCredentials();

  if (credentials) {
    try {
      const client = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      });

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await client.request<{ values?: string[][] }>({ url });
      if (res.data?.values && res.data.values.length > 0) {
        return {
          source: "service_account",
          serviceAccountEmail: credentials.client_email,
          rows: res.data.values,
        };
      }
    } catch (err: any) {
      console.error("Service account fetch error:", err?.response?.data || err?.message);
      // If 403, pass info up so we can inform user
      if (err?.response?.status === 403) {
        throw new Error(
          `PERMISSION_DENIED: Сервисный аккаунт [${credentials.client_email}] не имеет доступа к таблице. Пожалуйста, добавьте ${credentials.client_email} в настройки доступа таблицы Google с правом Читатель/Редактор.`
        );
      }
      throw err;
    }
  }

  // Fallback: try public export CSV
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const text = await res.text();
      // If response is HTML login page, throw error
      if (text.includes("<!DOCTYPE html>") || text.includes("Google Accounts")) {
        throw new Error(
          "Таблица закрыта для публичного доступа и сервисный аккаунт не авторизован."
        );
      }
      const rows = parseCSV(text);
      return {
        source: "public_csv",
        serviceAccountEmail: null,
        rows,
      };
    }
  } catch (csvErr: any) {
    console.warn("Public CSV fallback failed:", csvErr.message);
  }

  throw new Error("Не удалось получить доступ к Google Таблице. Проверьте права доступа.");
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    // Basic CSV cell parser handling quotes
    const row: string[] = [];
    let insideQuote = false;
    let currentCell = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === "," && !insideQuote) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    return row;
  });
}
