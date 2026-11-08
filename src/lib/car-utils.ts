/**
 * Utilities for normalizing and formatting vehicle license plates and identifiers.
 */

/**
 * Normalizes a license plate for unique matching:
 * Converts to uppercase and removes all non-alphanumeric characters (spaces, hyphens, dots).
 * Example: "AX-777-PR" -> "AX777PR", "ax 777 pr" -> "AX777PR"
 */
export function normalizePlateKey(plate: string | null | undefined): string {
  if (!plate) return "";
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

/**
 * Standardizes Georgian license plates to the official format "XX-000-YY"
 * if the clean key matches 2 letters + 3 digits + 2 letters.
 * Otherwise returns the trimmed uppercase plate.
 */
export function formatGeorgianPlate(plate: string | null | undefined): string {
  if (!plate) return "";
  const clean = normalizePlateKey(plate);
  // Standard Georgian plate: 2 letters, 3 digits, 2 letters (e.g. AX-777-PR)
  if (/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean)) {
    return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 7)}`;
  }
  return plate.trim().toUpperCase();
}
