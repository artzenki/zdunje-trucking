import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://xorhbiwezmireelklokq.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcmhiaXdlem1pcmVlbGtsb2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjI1NjcsImV4cCI6MjEwNjE5ODU2N30._g8Wffd5DQQt3A7Y-U59CXEUYMTtY_wSuGKPvu7UkGo";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads a file to Supabase Storage bucket 'documents'
 */
export async function uploadFileToSupabase(
  path: string,
  file: File | Blob,
  contentType = "application/pdf"
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(path, file, {
        upsert: true,
        contentType,
      });

    if (error) {
      console.warn("Supabase storage upload error:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("documents")
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.warn("Storage upload exception:", err);
    return null;
  }
}
