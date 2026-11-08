import { JWT } from "google-auth-library";
import fs from "fs";
import path from "path";

export interface GoogleSheetsCredentials {
  client_email: string;
  private_key: string;
}

let memoryCachedCredentials: GoogleSheetsCredentials | null = null;

export function setCachedGoogleSheetsCredentials(creds: GoogleSheetsCredentials) {
  memoryCachedCredentials = creds;
}

export function getGoogleSheetsCredentials(): GoogleSheetsCredentials | null {
  // 0. In-memory cached credentials
  if (memoryCachedCredentials) {
    return memoryCachedCredentials;
  }

  // 1. Environment variable with raw JSON content
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      let raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
      if (!raw.startsWith("{") && raw.length > 50) {
        try {
          raw = Buffer.from(raw, "base64").toString("utf-8");
        } catch {}
      }
      const parsed = JSON.parse(raw);
      if (parsed.client_email && parsed.private_key) {
        memoryCachedCredentials = {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
        return memoryCachedCredentials;
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
        memoryCachedCredentials = {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
        return memoryCachedCredentials;
      }
    } catch (e) {
      console.warn("Failed to read GOOGLE_APPLICATION_CREDENTIALS file:", e);
    }
  }

  // 3. Persistent storage files (Railway Volume, /data, public/uploads)
  const localCandidates = [
    "/data/service-account.json",
    "/data/uploads/service-account.json",
    path.resolve(process.cwd(), "public/uploads/service-account.json"),
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

  // 4. Embedded fallback service account credentials for production redundancy
  const DEFAULT_SERVICE_ACCOUNT_B64 =
    "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAidnNsLWNhci1yZW50YWwiLAogICJwcml2YXRlX2tleV9pZCI6ICIzZmJmZmU3ZTk0OTRhMzhiMWVhNTJiODllOWIwMGJjMzAyMjZkNGRiIiwKICAicHJpdmF0ZV9rZXkiOiAiLS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tXG5NSUlFdlFJQkFEQU5CZ2txaGtpRzl3MEJBUUVGQUFTQ0JLY3dnZ1NqQWdFQUFvSUJBUURMOEtuK2FsTUJLWlAwXG5ycEl1Zms1Tk1ieFlUMHpZcUNzdTgyNjBiL0lkWUkyOTRERHJ1NENvSHRic1lMVlpLYjFaRnE3T0puQUQ3eEI0XG5DR2ZBbTB5QUorVzVFZ0xSbTFsaGp1a3FiM1pqY1NUY2VycUIvZUpONVhHdHlWUkJzWEpNWkEwWkx3L1VaOXdmXG5wazdhd1FtSElYTmdKa2dySGhNQXlWdlVZakFpNk9obWhIQU8waGpmMDhoMUliMG9Db1dWTlRRa0I4VHVnbGlWXG5acWV3S1BZQWVKZnpvV0tIS3NkL1JaaWZodDB2UFRCSTNlSE56MnN0bTM5WFJwQzgwSFlLRllNRzM0ZUZOSVl4XG44VFhVNlBtYmN2dDROa0RZcFp0SDJEQ01HczhMMndNVkd0RDJ6SmI3ZzYza0x1Qk9JMTVaaTY0aHFaN1lCR2tFXG51RUVPUWIzcEFnTUJBQUVDZ2dFQUVTc0FWSCtFMzBzdHZtSlh3ZncyQVQrWG1HT01sNHlJbmhvMkRwQ0I5RUVsXG5qWDlxL3QwNDltNHFMNW53aWtIK1E1cXFPb1ozMVl6eGVQbFVLcDJvTWYycDFBdVZHeW9WdXlXNXNTM1M3SW9nXG56VUt6b3EvSnRqOERjOXJIOGdQTEdHMHZ3UmY2SUNwaUdIUDZuV1cwdEtCM1F2ZldDWE10ckZwSEZianlUbTNnXG5icXc0YnZab3VEZGQ2ZXkwdmtxaUlURXZVWloxZXBqU1BYYkIyWUk5d2ZjcFloL1EvVFpjYzlSNmJSaVcrOXc5XG5iRUNFOWRsMnV6Zllhdm0rdWRXYTV2NnIycE80QzhZRmZ1N2QzMUZtck9ldnBNY0Z6UitZOG0yemVRWUJuc1NMXG4xNHV2SFUvN1lta1hyaTlwemxnNXJKY2hvblFzQjNmRFVMYWRMcUNKUlFLQmdRRHFxTldvTTM2RTJjSHpnR0duXG5tMDVJa3lNOVdrSysvRDJqNUF6cHFrTHIrMmEyZ3crWElXN0hTcjQxcnYveHdKa1NtWjVnWUZBVCtQVlBDSnc1XG5NK29tUldoeFV0MEpxR3A3R0EvLzd0dUN2dVdyOGRHenpnVGpLYW8rT1FHVG1LQ21PL0hWRVlMRnQ3WjN3ZTRkXG5jVkYxR3hwa29SYU4vd1l3RHpkdXFKNklEd0tCZ1FEZWZLU28vYXZaZ1VOV04vVkd2R3RMS3piVWRoSVlDbUl0XG52aENaSHY5MGdMd283cGFSbEVKbGlkR3FEQmJQQTJWR1EzVjJGcWpYOEl6MmY2aUx6WTh1U05sTUhKNm01OGlMXG54cW9BUzdUdDlocE5DMDI5bmg4UmxHMmRZQkdqaWxRV1o5NUszMEJwY2Y3elFXNUlMOVR0Sm5ZeC91UElia2N0XG5NbnFQL0FvaWh3S0JnUUNoTi9IaXA4NUtzOWtlMUp0RExkNXcyalloMXJ0NHY1QVI0NEpEbjJodS9NQXFzSXlyXG5ocHEzYlZDVlRYQW14ZTNrNjRuMktQV2JZellXWUpJRWN2aHg1c25FNGV0ZTBVaW0zWGRRbk9oUFFaeEZyOVFsXG5ObXdCTGdUNnp1dVlYZ294YTRuUW0wRS9XZUtSRUxucG5Jc2NhOHlNU21oV2tsbkw5d2hjakppdVhRS0JnQ01NXG5WNVFYZ2Y3ZGtoSCs5ckNSOWdUOVpjSEtaOGRKdTNXaFAxUWZ3ZlpFWVYvQlZnN1E0RFRHcFRTNGVzOVpwWmFRXG5BZXo4WE5USG5DMG9weEIrN1ZOSlBwSHk0RHRDd0NEa3h0c05FZzk2ZVdJeHFhbDVRME90c2liY2YyclgyNjg3XG41WlM5M3BPOTFYL1VpdDdzU2dxaHlIVFB4bXBJbFFYVnNlRUV2MFA1QW9HQU9YYTZoWDVTMWZWbmRqeWh6M2taXG5rYXJ0QTNYYnh2ZDJ5WHN3Uk1VM1RaM2MyL1FWK0FLVHhPK0dEVXlxM29odktKNVNEMHE4RWg2L1pGR09ua2k3XG5sMW5VS3NoYW83RTdIRVo3YVV3UmFZYlN1a2lMTGpEUWdCOStEdE1YSy9oWElhQi9uUWhYRXBvQmlQOTFoUHBGXG5XanJMWDI0ZU0vSWFVb084Wkk0enRVUT1cbi0tLS0tRU5EIFBSSVZBVEUgS0VZLS0tLS1cbiIsCiAgImNsaWVudF9lbWFpbCI6ICJ2c2wtY2FyLXJlbnRhbEB2c2wtY2FyLXJlbnRhbC5pYW0uZ3NlcnZpY2VhY2NvdW50LmNvbSIsCiAgImNsaWVudF9pZCI6ICIxMDI4ODA5NzcwNzA5NjQ2NzY1OTAiLAogICJhdXRoX3VyaSI6ICJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20vby9vYXV0aDIvYXV0aCIsCiAgInRva2VuX3VyaSI6ICJodHRwczovL29hdXRoMi5nb29nbGVhcGlzLmNvbS90b2tlbiIsCiAgImF1dGhfcHJvdmlkZXJfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLAogICJjbGllbnRfeDUwOV9jZXJ0X3VybCI6ICJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9yb2JvdC92MS9tZXRhZGF0YS94NTA5L3ZzbC1jYXItcmVudGFsJTQwdnNsLWNhci1yZW50YWwuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K";

  try {
    const raw = Buffer.from(DEFAULT_SERVICE_ACCOUNT_B64, "base64").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    }
  } catch {}

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
