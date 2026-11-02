/**
 * Client-side image compression for mobile uploads.
 * Reduces 5-10 MB raw iPhone HEIC/JPEG photos down to ~150-250 KB
 * without visual quality loss, drastically saving disk space and upload time.
 */
export async function compressImageClient(
  file: File,
  maxWidth = 1600,
  quality = 0.82
): Promise<File> {
  // Only process images (skip videos, pdfs, etc.)
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip SVGs, GIFs, or images that are already tiny (< 250 KB)
  if (file.type.includes("svg") || file.type.includes("gif") || file.size < 250 * 1024) {
    return file;
  }

  // Ensure running in browser environment
  if (typeof window === "undefined" || !window.FileReader || !window.document) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;

        // Proportional resize
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        // Apply smooth rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0 && blob.size < file.size) {
              const safeName = file.name.replace(/\.[^.]+$/, ".jpg");
              const compressedFile = new File([blob], safeName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // If compression didn't reduce size or failed, keep original
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };

    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
