import JSZip from "jszip";
import * as XLSX from "xlsx";
import {
  Driver,
  Applicant,
  Truck,
  Trailer,
  TruckShop,
  MaintenanceRecord,
  PaymentReminder,
  FleetDocument,
} from "@/types/fleet";

export type ExportCategoryKey =
  | "drivers"
  | "applicants"
  | "trucks"
  | "trailers"
  | "maintenance"
  | "shops"
  | "payments";

export type ExportDataFormat = "xlsx" | "csv";
export type ExportPackageType = "full_archive" | "data_only";

export interface ExportProgress {
  totalSteps: number;
  currentStep: number;
  percentage: number;
  statusMessage: string;
}

// Convert Base64 / Data URL to Uint8Array
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Fetch remote URL or convert base64
async function resolveDocumentContent(
  doc: FleetDocument
): Promise<{ data: Uint8Array | string; filename: string }> {
  const ext = doc.name.includes(".")
    ? doc.name.split(".").pop() || "pdf"
    : doc.fileType?.includes("image")
    ? "jpg"
    : "pdf";
  const safeDocName = doc.name.includes(".") ? doc.name : `${doc.name}.${ext}`;

  if (doc.fileData) {
    if (doc.fileData.startsWith("data:")) {
      return {
        data: dataUrlToUint8Array(doc.fileData),
        filename: safeDocName,
      };
    } else if (doc.fileData.startsWith("http://") || doc.fileData.startsWith("https://")) {
      try {
        const res = await fetch(doc.fileData);
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return {
            data: new Uint8Array(arrayBuffer),
            filename: safeDocName,
          };
        }
      } catch (err) {
        console.warn(`Could not fetch remote doc ${doc.name}:`, err);
      }
    }
  }

  // Fallback text certificate if raw binary not available
  const textContent = `========================================================
ZDUNJE TRUCKING LLC — FLEET ARCHIVE RECORD
========================================================
Document:       ${doc.name}
Category:       ${doc.category}
Uploaded At:    ${doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "N/A"}
Expiration:     ${doc.expirationDate || "N/A (Permanent)"}
File Size:      ${doc.fileSize ? (doc.fileSize / 1024).toFixed(1) + " KB" : "Unknown"}
File Type:      ${doc.fileType || "application/pdf"}
${doc.recordDate ? `Record Date:    ${doc.recordDate}\n` : ""}${
    doc.testDate ? `Test Date:      ${doc.testDate}\n` : ""
  }${doc.testType ? `Test Type:      ${doc.testType}\n` : ""}${
    doc.notes ? `Notes:          ${doc.notes}\n` : ""
  }========================================================
Status: Archive Verified
========================================================`;

  const txtName = safeDocName.endsWith(".pdf")
    ? safeDocName.replace(".pdf", "_RECORD.txt")
    : `${safeDocName}_RECORD.txt`;

  return {
    data: textContent,
    filename: txtName,
  };
}

function sanitizeForFileName(str: string): string {
  return (str || "Unnamed")
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function createMissingNotice(categoryTitle: string, expectedDoc: string, reason?: string): string {
  return `========================================================
MISSING DOCUMENT NOTICE — (EMPTY FOLDER)
========================================================
Category:        ${categoryTitle}
Expected Item:   ${expectedDoc}
Status:          NOT UPLOADED / MISSING ON FILE
Reason / Note:   ${reason || "Document has not yet been attached or uploaded by staff."}
========================================================
Zdunje Trucking LLC — Compliance & Audit System
Generated: ${new Date().toLocaleString()}
========================================================
`;
}

// Convert table data to CSV text
export function generateCsvString(headers: string[], rows: (string | number)[][]): string {
  const sanitize = (val: string | number | boolean | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerRow = headers.map(sanitize).join(",");
  const bodyRows = rows.map((r) => r.map(sanitize).join(","));
  return [headerRow, ...bodyRows].join("\n");
}

// Convert table data to XLSX ArrayBuffer
export function generateXlsxBuffer(
  sheets: { sheetName: string; headers: string[]; rows: (string | number)[][] }[]
): ArrayBuffer {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, headers, rows }) => {
    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto calculate column widths
    const colWidths = headers.map((col, cIdx) => {
      let maxLen = col.length;
      rows.forEach((row) => {
        const val = row[cIdx];
        if (val !== undefined && val !== null) {
          maxLen = Math.max(maxLen, String(val).length);
        }
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 45) };
    });
    ws["!cols"] = colWidths;

    const safeSheetName = sheetName.replace(/[\/\\?*:[\]]/g, "_").slice(0, 31);
    XLSX.utils.book_append_sheet(workbook, ws, safeSheetName);
  });

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return wbout as ArrayBuffer;
}

// Data Preparation Extractors
export function getDriversTableData(drivers: Driver[]) {
  const headers = [
    "Driver ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Status",
    "Assigned Truck Unit",
    "Phone",
    "Email",
    "State",
    "License Number",
    "Date of Birth",
    "Hire Date",
    "Bank Name",
    "Routing Number",
    "Account Number",
    "Clearinghouse Query Verified",
    "CDL Expiration",
    "MEDCard Expiration",
    "MVR Expiration",
    "Notes",
  ];

  const rows = drivers.map((d) => [
    d.id,
    d.firstName,
    d.middleName || "",
    d.lastName,
    d.status,
    d.assignedTruckId || "Unassigned",
    d.phone,
    d.email || "",
    d.state,
    d.licenseNumber,
    d.dateOfBirth,
    d.hireDate || "",
    d.bankInfo?.bankName || d.bankInfo?.bankInfo || "",
    d.bankInfo?.routingNumber || "",
    d.bankInfo?.accountNumber || "",
    d.clearingHouseQuery ? "Yes" : "No",
    d.documents?.cdl?.expirationDate || "N/A",
    d.documents?.medCard?.expirationDate || "N/A",
    d.documents?.mvr?.expirationDate || "N/A",
    d.notes || "",
  ]);

  return { headers, rows };
}

export function getApplicantsTableData(applicants: Applicant[]) {
  const headers = [
    "Applicant ID",
    "First Name",
    "Middle Name",
    "Last Name",
    "Status",
    "Phone",
    "Email",
    "State",
    "License Number",
    "Date of Birth",
    "Applied Date",
    "CDL On File",
    "MEDCard On File",
    "MVR On File",
    "PSP Auth On File",
    "Notes",
  ];

  const rows = applicants.map((a) => [
    a.id,
    a.firstName,
    a.middleName || "",
    a.lastName,
    a.status,
    a.phone,
    a.email || "",
    a.state,
    a.licenseNumber,
    a.dateOfBirth,
    a.appliedDate,
    a.documents?.cdl ? "Yes" : "No",
    a.documents?.medCard ? "Yes" : "No",
    a.documents?.mvr ? "Yes" : "No",
    a.documents?.pspAuth ? "Yes" : "No",
    a.notes || "",
  ]);

  return { headers, rows };
}

export function getTrucksTableData(trucks: Truck[]) {
  const headers = [
    "Unit #",
    "Make",
    "Model",
    "Year",
    "VIN",
    "License Plate",
    "Temp Plate?",
    "Status",
    "Assigned Driver ID",
    "Ownership",
    "Current Mileage",
    "Estimated Value ($)",
    "BestPass Serial",
    "BestPass Linked",
    "Registration Expiration",
    "Annual DOT Expiration",
    "Insurance Expiration",
    "2290 Expiration",
    "Notes",
  ];

  const rows = trucks.map((t) => [
    t.unitNumber,
    t.make,
    t.model,
    t.year,
    t.vin,
    t.plateNumber,
    t.isTemporaryPlate ? "Yes" : "No",
    t.status,
    t.assignedDriverId || "Unassigned",
    t.ownershipType,
    t.currentMileage,
    t.truckValue,
    t.bestPassSerialNumber || "",
    t.isBestPassLinked ? "Yes" : "No",
    t.documents?.cabCard?.expirationDate || "N/A",
    t.documents?.dotInspection?.expirationDate || "N/A",
    t.documents?.insurance?.expirationDate || "N/A",
    t.documents?.tax2290?.expirationDate || "N/A",
    t.notes || "",
  ]);

  return { headers, rows };
}

export function getTrailersTableData(trailers: Trailer[]) {
  const headers = [
    "Unit #",
    "Make",
    "Model",
    "Year",
    "VIN",
    "License Plate",
    "Temp Plate?",
    "Status",
    "Assigned Truck ID",
    "Ownership",
    "Lease Company",
    "Trailer Value ($)",
    "Registration Expiration",
    "Annual DOT Expiration",
    "Insurance Expiration",
    "Notes",
  ];

  const rows = trailers.map((tr) => [
    tr.unitNumber,
    tr.make,
    tr.model,
    tr.year,
    tr.vin,
    tr.plateNumber,
    tr.isTemporaryPlate ? "Yes" : "No",
    tr.status,
    tr.assignedTruckId || "Unassigned",
    tr.ownershipType,
    tr.leaseCompany || "",
    tr.trailerValue,
    tr.documents?.cabCard?.expirationDate || "N/A",
    tr.documents?.dotInspection?.expirationDate || "N/A",
    tr.documents?.insurance?.expirationDate || "N/A",
    tr.notes || "",
  ]);

  return { headers, rows };
}

export function getMaintenanceTableData(maintenance: MaintenanceRecord[]) {
  const headers = [
    "Record ID",
    "Truck ID",
    "Truck Unit Number",
    "Service Date",
    "Odometer",
    "Service Type",
    "Shop Name",
    "Invoice #",
    "Labor Cost ($)",
    "Parts Cost ($)",
    "Callout Fee ($)",
    "Total Cost ($)",
    "Payment Method",
    "Status",
    "Next Service Mileage",
    "Next Service Date",
    "Description",
  ];

  const rows = maintenance.map((m) => [
    m.id,
    m.truckId,
    m.truckUnitNumber,
    m.serviceDate,
    m.odometer,
    m.serviceType,
    m.shopName,
    m.invoiceNumber,
    m.laborCost,
    m.partsCost,
    m.calloutFee,
    m.totalCost,
    m.paymentMethod || "Other",
    m.status,
    m.nextServiceDueMileage || "N/A",
    m.nextServiceDueDate || "N/A",
    m.description || "",
  ]);

  return { headers, rows };
}

export function getShopsTableData(shops: TruckShop[]) {
  const headers = [
    "Shop ID",
    "Business Name",
    "Address",
    "State",
    "Phone",
    "Shop Type",
    "Repair Categories",
    "Hourly Labor Rate ($)",
    "Callout Fee ($)",
    "Rating",
    "Google Maps URL",
    "Description of Work",
    "Notes",
  ];

  const rows = shops.map((s) => [
    s.id,
    s.businessName,
    s.businessAddress,
    s.state,
    s.phone,
    s.shopType,
    (s.repairCategories || []).join("; "),
    s.laborRatePerHour,
    s.calloutFee,
    s.rating,
    s.googleMapsUrl || "",
    s.descriptionOfWork || "",
    s.notes || "",
  ]);

  return { headers, rows };
}

export function getPaymentsTableData(payments: PaymentReminder[]) {
  const headers = [
    "Reminder ID",
    "Title / Name",
    "Category",
    "Amount ($)",
    "Due Date",
    "Time",
    "Status",
    "Related Entity",
    "Is Recurring",
    "Recurrence",
    "Notes",
  ];

  const rows = payments.map((p) => [
    p.id,
    p.name,
    p.category,
    p.amount ?? 0,
    p.date,
    p.time,
    p.status,
    p.relatedEntityName || p.relatedEntityId || "N/A",
    p.isRecurring ? "Yes" : "No",
    p.recurrence || "Once",
    p.reasonNotes || "",
  ]);

  return { headers, rows };
}

// Master Export Function
export async function buildFleetExportArchive(options: {
  categories: ExportCategoryKey[];
  format: ExportDataFormat;
  packageType: ExportPackageType;
  fleetData: {
    drivers: Driver[];
    applicants: Applicant[];
    trucks: Truck[];
    trailers: Trailer[];
    maintenance: MaintenanceRecord[];
    shops: TruckShop[];
    payments: PaymentReminder[];
  };
  onProgress: (progress: ExportProgress) => void;
}): Promise<{ blob: Blob; fileName: string }> {
  const { categories, format, packageType, fleetData, onProgress } = options;
  const todayStr = new Date().toISOString().split("T")[0];

  // If DATA ONLY mode, create single workbook / CSV
  if (packageType === "data_only") {
    onProgress({
      totalSteps: 10,
      currentStep: 2,
      percentage: 20,
      statusMessage: `Generating ${format.toUpperCase()} spreadsheet database...`,
    });

    const sheets: { sheetName: string; headers: string[]; rows: (string | number)[][] }[] = [];

    if (categories.includes("drivers")) {
      const { headers, rows } = getDriversTableData(fleetData.drivers);
      sheets.push({ sheetName: "Drivers", headers, rows });
    }
    if (categories.includes("applicants")) {
      const { headers, rows } = getApplicantsTableData(fleetData.applicants);
      sheets.push({ sheetName: "Applicants", headers, rows });
    }
    if (categories.includes("trucks")) {
      const { headers, rows } = getTrucksTableData(fleetData.trucks);
      sheets.push({ sheetName: "Trucks", headers, rows });
    }
    if (categories.includes("trailers")) {
      const { headers, rows } = getTrailersTableData(fleetData.trailers);
      sheets.push({ sheetName: "Trailers", headers, rows });
    }
    if (categories.includes("maintenance")) {
      const { headers, rows } = getMaintenanceTableData(fleetData.maintenance);
      sheets.push({ sheetName: "Maintenance", headers, rows });
    }
    if (categories.includes("shops")) {
      const { headers, rows } = getShopsTableData(fleetData.shops);
      sheets.push({ sheetName: "Shops", headers, rows });
    }
    if (categories.includes("payments")) {
      const { headers, rows } = getPaymentsTableData(fleetData.payments);
      sheets.push({ sheetName: "Payments", headers, rows });
    }

    onProgress({
      totalSteps: 10,
      currentStep: 7,
      percentage: 70,
      statusMessage: "Packaging spreadsheet data...",
    });

    if (format === "xlsx") {
      const xlsxBuffer = generateXlsxBuffer(sheets);
      const blob = new Blob([xlsxBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      onProgress({
        totalSteps: 10,
        currentStep: 10,
        percentage: 100,
        statusMessage: "Export ready!",
      });
      return { blob, fileName: `Zdunje_Fleet_Data_${todayStr}.xlsx` };
    } else {
      // CSV format: combine or deliver active
      const primary = sheets[0] || { sheetName: "Fleet", headers: [], rows: [] };
      const csvStr = generateCsvString(primary.headers, primary.rows);
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
      onProgress({
        totalSteps: 10,
        currentStep: 10,
        percentage: 100,
        statusMessage: "Export ready!",
      });
      return { blob, fileName: `Zdunje_Fleet_${primary.sheetName}_${todayStr}.csv` };
    }
  }

  // FULL ARCHIVE PACKAGE (.ZIP with nested category & entity folders)
  const zip = new JSZip();
  const rootName = `Zdunje_Trucking_Fleet_Archive_${todayStr}`;
  const root = zip.folder(rootName) || zip;

  let totalEntities = 0;
  if (categories.includes("drivers")) totalEntities += fleetData.drivers.length;
  if (categories.includes("applicants")) totalEntities += fleetData.applicants.length;
  if (categories.includes("trucks")) totalEntities += fleetData.trucks.length;
  if (categories.includes("trailers")) totalEntities += fleetData.trailers.length;
  if (categories.includes("maintenance") || categories.includes("shops")) totalEntities += 2;
  if (categories.includes("payments")) totalEntities += 1;

  let processedCount = 0;
  const updateProgress = (name: string) => {
    processedCount++;
    const pct = Math.min(Math.round((processedCount / Math.max(totalEntities, 1)) * 90), 90);
    onProgress({
      totalSteps: Math.max(totalEntities, 1),
      currentStep: processedCount,
      percentage: pct,
      statusMessage: `Archiving ${name}... (${processedCount}/${totalEntities})`,
    });
  };

  // Helper to attach metadata sheet
  const attachDataSheet = (
    folder: JSZip,
    filenameBase: string,
    headers: string[],
    rows: (string | number)[][]
  ) => {
    if (format === "xlsx") {
      const buffer = generateXlsxBuffer([{ sheetName: filenameBase, headers, rows }]);
      folder.file(`${filenameBase}.xlsx`, buffer);
    } else {
      const csv = generateCsvString(headers, rows);
      folder.file(`${filenameBase}.csv`, csv);
    }
  };

  // 1. DRIVERS
  if (categories.includes("drivers")) {
    const driversFolder = root.folder("01_Drivers");
    if (driversFolder) {
      const dTable = getDriversTableData(fleetData.drivers);
      attachDataSheet(driversFolder, "drivers_master_data", dTable.headers, dTable.rows);

      for (const driver of fleetData.drivers) {
        const driverName = sanitizeForFileName(`${driver.firstName}_${driver.lastName}_${driver.id}`);
        const dFolder = driversFolder.folder(driverName);
        if (!dFolder) continue;

        // Driver Summary Note
        const summary = `========================================================
DRIVER PERSONNEL PROFILE & COMPLIANCE DOSSIER
========================================================
Name:           ${driver.firstName} ${driver.middleName ? driver.middleName + " " : ""}${driver.lastName}
ID:             ${driver.id}
Status:         ${driver.status}
Assigned Truck: ${driver.assignedTruckId || "Unassigned"}
Phone:          ${driver.phone}
Email:          ${driver.email || "N/A"}
State:          ${driver.state}
CDL Number:     ${driver.licenseNumber}
Date of Birth:  ${driver.dateOfBirth}
Hire Date:      ${driver.hireDate || "N/A"}
Clearinghouse:  ${driver.clearingHouseQuery ? "Verified Query Completed" : "Not Verified"}
Bank Name:      ${driver.bankInfo?.bankName || driver.bankInfo?.bankInfo || "N/A"}
Routing #:      ${driver.bankInfo?.routingNumber || "N/A"}
Account #:      ${driver.bankInfo?.accountNumber || "N/A"}
Notes:          ${driver.notes || "None"}
========================================================
Zdunje Trucking Safety Management System
`;
        dFolder.file("driver_profile_summary.txt", summary);

        // Document slots definition
        const docSlots: {
          folderName: string;
          doc: FleetDocument | null | undefined;
          expectedName: string;
        }[] = [
          {
            folderName: "01_Commercial_Driver_License_(CDL)",
            doc: driver.documents?.cdl,
            expectedName: "CDL License Front/Back",
          },
          {
            folderName: "02_Medical_Examiner_Certificate_(MEDCard)",
            doc: driver.documents?.medCard,
            expectedName: "Medical Examiner Certificate (MEDCard)",
          },
          {
            folderName: "03_Motor_Vehicle_Record_(MVR)",
            doc: driver.documents?.mvr,
            expectedName: "MVR Driving History Report",
          },
          {
            folderName: "04_PSP_Authorization",
            doc: driver.documents?.pspAuth,
            expectedName: "PSP Authorization Form",
          },
          {
            folderName: "05_PSP_Driver_Report",
            doc: driver.documents?.pspReport,
            expectedName: "Pre-Employment Screening Program (PSP) Report",
          },
          {
            folderName: "06_FMCSA_Clearinghouse",
            doc: driver.documents?.clearingHouse,
            expectedName: "FMCSA Drug & Alcohol Clearinghouse Consent/Query",
          },
          {
            folderName: "07_Driver_Application",
            doc: driver.documents?.applicationFile,
            expectedName: "Signed Driver Employment Application",
          },
          {
            folderName: "08_Drug_&_Alcohol_Custody_Form_(CCF)",
            doc: driver.documents?.drugCustodyForm,
            expectedName: "Federal Drug Testing Custody & Control Form (CCF)",
          },
          {
            folderName: "09_Drug_&_Alcohol_ePassport",
            doc: driver.documents?.drugPassport,
            expectedName: "Labcorp / Quest Drug Screening ePassport",
          },
          {
            folderName: "10_Bank_Direct_Deposit_&_Voided_Check",
            doc: driver.documents?.bankInfoDoc,
            expectedName: "Direct Deposit Authorization / Voided Check",
          },
          {
            folderName: "11_EIN_Letter_&_W9",
            doc: driver.documents?.einLetter,
            expectedName: "EIN Letter / IRS Form W-9",
          },
          {
            folderName: "12_Onboarding_Handbook_&_Packet",
            doc: driver.documents?.onboardingDoc,
            expectedName: "Signed Company Safety Handbook & Policies",
          },
          {
            folderName: "13_Driver_Lease_Agreement",
            doc: driver.documents?.leaseAgreement,
            expectedName: "Independent Contractor / Driver Lease Agreement",
          },
          {
            folderName: "14_Termination_&_Offboarding",
            doc: driver.documents?.terminationDoc,
            expectedName: "Driver Resignation / Offboarding Notice",
          },
        ];

        // Process single document slots
        for (const slot of docSlots) {
          if (slot.doc) {
            const slotFolder = dFolder.folder(slot.folderName);
            if (slotFolder) {
              const { data, filename } = await resolveDocumentContent(slot.doc);
              slotFolder.file(filename, data);
            }
          } else {
            // Missing folder marked with (empty)
            const emptyFolder = dFolder.folder(`${slot.folderName} (empty)`);
            if (emptyFolder) {
              emptyFolder.file(
                "MISSING_NOTICE.txt",
                createMissingNotice(slot.folderName, slot.expectedName)
              );
            }
          }
        }

        // Multi-file Drug Test Results
        const drugTests = driver.documents?.drugTestResults || [];
        if (drugTests.length > 0) {
          const dtFolder = dFolder.folder("15_Drug_Test_Results");
          if (dtFolder) {
            for (const dt of drugTests) {
              const { data, filename } = await resolveDocumentContent(dt);
              dtFolder.file(filename, data);
            }
          }
        } else {
          const emptyDt = dFolder.folder("15_Drug_Test_Results (empty)");
          if (emptyDt) {
            emptyDt.file(
              "MISSING_NOTICE.txt",
              createMissingNotice("Drug Test Results", "FMCSA Drug & Alcohol Lab Test Results")
            );
          }
        }

        // Multi-file DOT Records
        const dotRecords = driver.documents?.dotRecords || [];
        if (dotRecords.length > 0) {
          const dotFolder = dFolder.folder("16_DOT_Inspection_Records");
          if (dotFolder) {
            for (const dot of dotRecords) {
              const { data, filename } = await resolveDocumentContent(dot);
              dotFolder.file(filename, data);
            }
          }
        } else {
          const emptyDot = dFolder.folder("16_DOT_Inspection_Records (empty)");
          if (emptyDot) {
            emptyDot.file(
              "MISSING_NOTICE.txt",
              createMissingNotice("DOT Records", "Roadside Inspection & DOT Violations Records")
            );
          }
        }

        updateProgress(`Driver: ${driver.firstName} ${driver.lastName}`);
      }
    }
  }

  // 2. APPLICANTS
  if (categories.includes("applicants")) {
    const applicantsFolder = root.folder("02_Applicants");
    if (applicantsFolder) {
      const aTable = getApplicantsTableData(fleetData.applicants);
      attachDataSheet(applicantsFolder, "applicants_master_data", aTable.headers, aTable.rows);

      for (const app of fleetData.applicants) {
        const appName = sanitizeForFileName(`${app.firstName}_${app.lastName}_${app.id}`);
        const aFolder = applicantsFolder.folder(appName);
        if (!aFolder) continue;

        const summary = `========================================================
DRIVER APPLICANT SCREENING DOSSIER
========================================================
Name:           ${app.firstName} ${app.middleName ? app.middleName + " " : ""}${app.lastName}
Status:         ${app.status}
Applied Date:   ${app.appliedDate}
Phone:          ${app.phone}
Email:          ${app.email || "N/A"}
State:          ${app.state}
CDL Number:     ${app.licenseNumber}
Date of Birth:  ${app.dateOfBirth}
Notes:          ${app.notes || "None"}
========================================================
`;
        aFolder.file("applicant_profile_summary.txt", summary);

        const appSlots: {
          folderName: string;
          doc: FleetDocument | null | undefined;
          expectedName: string;
        }[] = [
          {
            folderName: "01_CDL_Commercial_Driver_License",
            doc: app.documents?.cdl,
            expectedName: "CDL License Copy (Front/Back)",
          },
          {
            folderName: "02_Medical_Examiner_Certificate_(MEDCard)",
            doc: app.documents?.medCard,
            expectedName: "Medical Examiner Card",
          },
          {
            folderName: "03_Motor_Vehicle_Record_(MVR)",
            doc: app.documents?.mvr,
            expectedName: "Pre-employment Motor Vehicle Record",
          },
          {
            folderName: "04_PSP_Authorization",
            doc: app.documents?.pspAuth,
            expectedName: "PSP Background Check Authorization",
          },
          {
            folderName: "05_PSP_Driver_Report",
            doc: app.documents?.pspReport,
            expectedName: "Pre-employment Screening Program Report",
          },
        ];

        for (const slot of appSlots) {
          if (slot.doc) {
            const slotFolder = aFolder.folder(slot.folderName);
            if (slotFolder) {
              const { data, filename } = await resolveDocumentContent(slot.doc);
              slotFolder.file(filename, data);
            }
          } else {
            const emptyFolder = aFolder.folder(`${slot.folderName} (empty)`);
            if (emptyFolder) {
              emptyFolder.file(
                "MISSING_NOTICE.txt",
                createMissingNotice(slot.folderName, slot.expectedName)
              );
            }
          }
        }

        updateProgress(`Applicant: ${app.firstName} ${app.lastName}`);
      }
    }
  }

  // 3. TRUCKS
  if (categories.includes("trucks")) {
    const trucksFolder = root.folder("03_Trucks");
    if (trucksFolder) {
      const tTable = getTrucksTableData(fleetData.trucks);
      attachDataSheet(trucksFolder, "trucks_master_data", tTable.headers, tTable.rows);

      for (const truck of fleetData.trucks) {
        const truckName = sanitizeForFileName(`Unit_${truck.unitNumber}_${truck.vin.slice(-6)}`);
        const tFolder = trucksFolder.folder(truckName);
        if (!tFolder) continue;

        const summary = `========================================================
TRUCK EQUIPMENT SPECIFICATION & COMPLIANCE FILE
========================================================
Unit Number:    ${truck.unitNumber}
Make/Model:     ${truck.make} ${truck.model} (${truck.year})
VIN:            ${truck.vin}
Plate:          ${truck.plateNumber} ${truck.isTemporaryPlate ? "(Temporary)" : "(Permanent)"}
Status:         ${truck.status}
Ownership:      ${truck.ownershipType}
Assigned Driver:${truck.assignedDriverId || "Unassigned"}
Current Mileage:${truck.currentMileage.toLocaleString()} miles
Truck Value:    $${truck.truckValue.toLocaleString()}
BestPass:       ${truck.bestPassSerialNumber || "N/A"} (${truck.isBestPassLinked ? "Linked" : "Unlinked"})
Notes:          ${truck.notes || "None"}
========================================================
`;
        tFolder.file("truck_spec_summary.txt", summary);

        const truckSlots: {
          folderName: string;
          doc: FleetDocument | null | undefined;
          expectedName: string;
        }[] = [
          {
            folderName: "01_Registration_CabCard",
            doc: truck.documents?.cabCard,
            expectedName: "Vehicle Registration / Cab Card",
          },
          {
            folderName: "02_Annual_DOT_Inspection",
            doc: truck.documents?.dotInspection,
            expectedName: "Annual DOT Periodic Inspection Certificate",
          },
          {
            folderName: "03_Certificate_Of_Title",
            doc: truck.documents?.title,
            expectedName: "Vehicle Title / Proof of Ownership",
          },
          {
            folderName: "04_Proof_Of_Insurance",
            doc: truck.documents?.insurance,
            expectedName: "Commercial Auto Liability Certificate of Insurance (COI)",
          },
          {
            folderName: "05_Form_2290_Heavy_Vehicle_Tax",
            doc: truck.documents?.tax2290,
            expectedName: "IRS Form 2290 Heavy Highway Vehicle Use Tax Return",
          },
          {
            folderName: "06_Lease_Agreement",
            doc: truck.documents?.leaseAgreement,
            expectedName: "Equipment Lease / Financing Agreement",
          },
        ];

        for (const slot of truckSlots) {
          if (slot.doc) {
            const slotFolder = tFolder.folder(slot.folderName);
            if (slotFolder) {
              const { data, filename } = await resolveDocumentContent(slot.doc);
              slotFolder.file(filename, data);
            }
          } else {
            const emptyFolder = tFolder.folder(`${slot.folderName} (empty)`);
            if (emptyFolder) {
              emptyFolder.file(
                "MISSING_NOTICE.txt",
                createMissingNotice(slot.folderName, slot.expectedName)
              );
            }
          }
        }

        // Custom documents
        if (truck.customDocuments && truck.customDocuments.length > 0) {
          const customFolder = tFolder.folder("07_Custom_Documents");
          if (customFolder) {
            for (const cDoc of truck.customDocuments) {
              const { data, filename } = await resolveDocumentContent(cDoc);
              customFolder.file(filename, data);
            }
          }
        }

        updateProgress(`Truck Unit: ${truck.unitNumber}`);
      }
    }
  }

  // 4. TRAILERS
  if (categories.includes("trailers")) {
    const trailersFolder = root.folder("04_Trailers");
    if (trailersFolder) {
      const trTable = getTrailersTableData(fleetData.trailers);
      attachDataSheet(trailersFolder, "trailers_master_data", trTable.headers, trTable.rows);

      for (const trailer of fleetData.trailers) {
        const trName = sanitizeForFileName(`Unit_${trailer.unitNumber}_${trailer.vin.slice(-6)}`);
        const trFolder = trailersFolder.folder(trName);
        if (!trFolder) continue;

        const summary = `========================================================
TRAILER EQUIPMENT SPECIFICATION & COMPLIANCE FILE
========================================================
Unit Number:    ${trailer.unitNumber}
Make/Model:     ${trailer.make} ${trailer.model} (${trailer.year})
VIN:            ${trailer.vin}
Plate:          ${trailer.plateNumber} ${trailer.isTemporaryPlate ? "(Temporary)" : "(Permanent)"}
Status:         ${trailer.status}
Ownership:      ${trailer.ownershipType} ${trailer.leaseCompany ? `(${trailer.leaseCompany})` : ""}
Assigned Truck: ${trailer.assignedTruckId || "Unassigned"}
Trailer Value:  $${trailer.trailerValue.toLocaleString()}
Notes:          ${trailer.notes || "None"}
========================================================
`;
        trFolder.file("trailer_spec_summary.txt", summary);

        const trailerSlots: {
          folderName: string;
          doc: FleetDocument | null | undefined;
          expectedName: string;
        }[] = [
          {
            folderName: "01_Registration_CabCard",
            doc: trailer.documents?.cabCard,
            expectedName: "Trailer Registration Card",
          },
          {
            folderName: "02_Annual_DOT_Inspection",
            doc: trailer.documents?.dotInspection,
            expectedName: "Annual DOT Periodic Inspection Certificate",
          },
          {
            folderName: "03_Certificate_Of_Title",
            doc: trailer.documents?.title,
            expectedName: "Trailer Title / Bill of Sale",
          },
          {
            folderName: "04_Proof_Of_Insurance",
            doc: trailer.documents?.insurance,
            expectedName: "Trailer Physical Damage / Interchange Insurance",
          },
          {
            folderName: "05_Trailer_Agreement",
            doc: trailer.documents?.trailerAgreement,
            expectedName: "Trailer Lease / Interchange Agreement",
          },
        ];

        for (const slot of trailerSlots) {
          if (slot.doc) {
            const slotFolder = trFolder.folder(slot.folderName);
            if (slotFolder) {
              const { data, filename } = await resolveDocumentContent(slot.doc);
              slotFolder.file(filename, data);
            }
          } else {
            const emptyFolder = trFolder.folder(`${slot.folderName} (empty)`);
            if (emptyFolder) {
              emptyFolder.file(
                "MISSING_NOTICE.txt",
                createMissingNotice(slot.folderName, slot.expectedName)
              );
            }
          }
        }

        // Custom documents
        if (trailer.customDocuments && trailer.customDocuments.length > 0) {
          const customFolder = trFolder.folder("06_Custom_Documents");
          if (customFolder) {
            for (const cDoc of trailer.customDocuments) {
              const { data, filename } = await resolveDocumentContent(cDoc);
              customFolder.file(filename, data);
            }
          }
        }

        updateProgress(`Trailer Unit: ${trailer.unitNumber}`);
      }
    }
  }

  // 5. MAINTENANCE & SHOPS
  if (categories.includes("maintenance") || categories.includes("shops")) {
    const maintFolder = root.folder("05_Maintenance_&_Shops");
    if (maintFolder) {
      if (categories.includes("maintenance")) {
        const mTable = getMaintenanceTableData(fleetData.maintenance);
        attachDataSheet(maintFolder, "maintenance_work_orders", mTable.headers, mTable.rows);

        // Include invoices folder
        const invFolder = maintFolder.folder("Work_Order_Invoices");
        let hasInvoices = false;
        if (invFolder) {
          for (const m of fleetData.maintenance) {
            if (m.invoiceDocument) {
              hasInvoices = true;
              const { data, filename } = await resolveDocumentContent(m.invoiceDocument);
              invFolder.file(`Inv_${sanitizeForFileName(m.invoiceNumber)}_${filename}`, data);
            }
          }
          if (!hasInvoices) {
            const emptyInv = maintFolder.folder("Work_Order_Invoices (empty)");
            if (emptyInv) {
              emptyInv.file(
                "MISSING_NOTICE.txt",
                createMissingNotice("Work Order Invoices", "Uploaded Shop Repair Invoices")
              );
            }
          }
        }
      }

      if (categories.includes("shops")) {
        const sTable = getShopsTableData(fleetData.shops);
        attachDataSheet(maintFolder, "vendor_shops_directory", sTable.headers, sTable.rows);
      }

      updateProgress("Maintenance & Vendor Directory");
    }
  }

  // 6. PAYMENTS & FINANCIAL REMINDERS
  if (categories.includes("payments")) {
    const paymentsFolder = root.folder("06_Financial_Reminders");
    if (paymentsFolder) {
      const pTable = getPaymentsTableData(fleetData.payments);
      attachDataSheet(paymentsFolder, "payment_schedules", pTable.headers, pTable.rows);
      updateProgress("Financial Payment Schedules");
    }
  }

  // Final Compression
  onProgress({
    totalSteps: 100,
    currentStep: 92,
    percentage: 92,
    statusMessage: "Compressing archive files into ZIP package...",
  });

  const zipBlob = await zip.generateAsync(
    {
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const percent = Math.min(92 + Math.round((metadata.percent / 100) * 7), 99);
      onProgress({
        totalSteps: 100,
        currentStep: percent,
        percentage: percent,
        statusMessage: `Zipping contents: ${Math.round(metadata.percent)}%`,
      });
    }
  );

  onProgress({
    totalSteps: 100,
    currentStep: 100,
    percentage: 100,
    statusMessage: "Archive packaging completed!",
  });

  return {
    blob: zipBlob,
    fileName: `${rootName}.zip`,
  };
}
