import { supabase } from "@/lib/supabase";

/**
 * Uploads a file (File object or Base64 data URL) to Supabase Storage bucket ('documents').
 * Returns the public URL of the uploaded file.
 * If Supabase Storage upload fails or is not available, falls back to base64 Data URL.
 */
export async function uploadFileToSupabaseStorage(
  fileOrBase64: File | string,
  fileName: string,
  folder: "drivers" | "trucks" | "trailers" | "maintenance" | "general" = "general"
): Promise<{ fileUrl: string; fileSize?: number; fileType?: string }> {
  if (!supabase) {
    if (typeof fileOrBase64 === "string") {
      return { fileUrl: fileOrBase64 };
    }
    const base64 = await fileToBase64(fileOrBase64);
    return { fileUrl: base64, fileSize: fileOrBase64.size, fileType: fileOrBase64.type };
  }

  try {
    let fileBlob: Blob;
    let fileType = "application/pdf";
    let fileSize = 0;

    if (typeof fileOrBase64 === "string") {
      // Base64 Data URL to Blob
      fileType = fileOrBase64.match(/data:([^;]+);/)?.[1] || "application/pdf";
      const base64Data = fileOrBase64.includes(",") ? fileOrBase64.split(",")[1] : fileOrBase64;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      fileBlob = new Blob([byteArray], { type: fileType });
      fileSize = byteArray.length;
    } else {
      fileBlob = fileOrBase64;
      fileType = fileOrBase64.type || "application/pdf";
      fileSize = fileOrBase64.size;
    }

    // Clean filename for storage path
    const sanitizedName = fileName
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .toLowerCase();
    const timestamp = Date.now();
    const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

    const { data, error } = await supabase.storage
      .from("documents")
      .upload(storagePath, fileBlob, {
        contentType: fileType,
        upsert: true,
      });

    if (error) {
      console.warn("[Supabase Storage] Upload error, falling back to base64:", error.message);
      // Fallback to base64
      if (typeof fileOrBase64 === "string") {
        return { fileUrl: fileOrBase64, fileSize, fileType };
      }
      const base64 = await fileToBase64(fileOrBase64);
      return { fileUrl: base64, fileSize, fileType };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);

    return {
      fileUrl: publicUrlData.publicUrl,
      fileSize,
      fileType,
    };
  } catch (err) {
    console.warn("[Supabase Storage] Exception during upload:", err);
    if (typeof fileOrBase64 === "string") {
      return { fileUrl: fileOrBase64 };
    }
    const base64 = await fileToBase64(fileOrBase64);
    return { fileUrl: base64, fileSize: fileOrBase64.size, fileType: fileOrBase64.type };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
