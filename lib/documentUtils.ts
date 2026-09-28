import { FleetDocument } from "@/types/fleet";

/**
 * Trigger browser download for a FleetDocument.
 * If fileData exists (base64 data URI), downloads it directly.
 * Otherwise, generates a formatted document verification file with all compliance metadata.
 */
export function downloadDocument(doc: FleetDocument) {
  if (doc.fileData) {
    const link = document.createElement("a");
    link.href = doc.fileData;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // Generate simulated compliance proof file if mock file without raw blob
  const textContent = `========================================================
ZDUNJE TRUCKING LLC — SAFETY & COMPLIANCE VAULT
========================================================
Document Name:      ${doc.name}
Category:           ${doc.category}
Uploaded At:        ${new Date(doc.uploadedAt).toLocaleString()}
Expiration Date:    ${doc.expirationDate || "N/A (Permanent)"}
File Size:          ${(doc.fileSize / 1024).toFixed(1)} KB
File Type:          ${doc.fileType}
${doc.testType ? `FMCSA Test Type:    ${doc.testType}\n` : ""}${
    doc.testDate ? `Test Date:          ${doc.testDate}\n` : ""
  }${doc.notes ? `Notes / Remarks:    ${doc.notes}\n` : ""}
========================================================
System Verified: Zdunje Trucking Safety & Maintenance Portal
========================================================`;

  const blob = new Blob([textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = doc.name.endsWith(".pdf") ? doc.name.replace(".pdf", ".txt") : `${doc.name}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts a browser File object to Base64 Data URL.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
