/**
 * Helper to download document files with clean suggested names and cross-browser support.
 */
export async function downloadDocument(fileUrl: string, suggestedName?: string) {
  if (!fileUrl || typeof window === "undefined") return;

  try {
    const ext = fileUrl.split(".").pop()?.split("?")[0] || "jpg";
    let finalFileName = suggestedName || "document";
    if (!finalFileName.includes(".")) {
      finalFileName = `${finalFileName}.${ext}`;
    }

    const separator = fileUrl.includes("?") ? "&" : "?";
    const downloadApiUrl = `${fileUrl}${separator}download=1&filename=${encodeURIComponent(finalFileName)}`;

    // Try fetch + blob for true download without opening a blank tab
    const response = await fetch(downloadApiUrl);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = finalFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // Fallback: direct window.open or standard anchor click
    const separator = fileUrl.includes("?") ? "&" : "?";
    const fallbackUrl = `${fileUrl}${separator}download=1`;
    const a = document.createElement("a");
    a.href = fallbackUrl;
    a.target = "_blank";
    a.download = suggestedName || "document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Downloads multiple customer documents sequentially.
 */
export async function downloadAllCustomerDocuments(
  customer: {
    fullName?: string;
    passportPhotoUrl?: string | null;
    driverLicensePhotoUrl?: string | null;
    driverLicenseBackPhotoUrl?: string | null;
  },
  bookingNumber?: string,
  additionalDrivers?: Array<{
    fullName?: string;
    licensePhotoUrl?: string | null;
    licenseBackPhotoUrl?: string | null;
  }>
) {
  if (!customer) return;

  const sanitize = (str: string) => str.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_");
  const clientName = sanitize(customer.fullName || "Клиент");
  const bNum = bookingNumber ? `_Бронь_${sanitize(bookingNumber)}` : "";

  const queue: { url: string; name: string }[] = [];

  if (customer.passportPhotoUrl) {
    queue.push({
      url: customer.passportPhotoUrl,
      name: `Паспорт_${clientName}${bNum}`,
    });
  }

  if (customer.driverLicensePhotoUrl) {
    queue.push({
      url: customer.driverLicensePhotoUrl,
      name: `Права_Лицо_${clientName}${bNum}`,
    });
  }

  if (customer.driverLicenseBackPhotoUrl) {
    queue.push({
      url: customer.driverLicenseBackPhotoUrl,
      name: `Права_Оборот_${clientName}${bNum}`,
    });
  }

  if (Array.isArray(additionalDrivers)) {
    additionalDrivers.forEach((driver, idx) => {
      const dName = sanitize(driver.fullName || `Водитель_${idx + 1}`);
      if (driver.licensePhotoUrl) {
        queue.push({
          url: driver.licensePhotoUrl,
          name: `ДопВодитель_${dName}_Права_Лицо${bNum}`,
        });
      }
      if (driver.licenseBackPhotoUrl) {
        queue.push({
          url: driver.licenseBackPhotoUrl,
          name: `ДопВодитель_${dName}_Права_Оборот${bNum}`,
        });
      }
    });
  }

  if (queue.length === 0) {
    alert("У клиента еще нет прикрепленных фотографий документов.");
    return;
  }

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    await downloadDocument(item.url, item.name);
    if (i < queue.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
}
