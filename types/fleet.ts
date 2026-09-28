export type OwnershipType = "Lease" | "Own";
export type EquipmentStatus = "Active" | "In Shop" | "Out of Service" | "Available";
export type DriverStatus = "Active" | "Inactive" | "On Leave";
export type ShopType = "Shop" | "Roadside" | "Both";
export type MaintenanceStatus = "Completed" | "In Progress" | "Scheduled";

export type MaintenanceServiceType =
  | "PM-A (Oil & Lube)"
  | "PM-B (Full Inspection)"
  | "PM-C (Major Overhaul)"
  | "Tires & Alignment"
  | "Brakes & Air System"
  | "Engine & Transmission"
  | "Annual DOT Inspection"
  | "Roadside Emergency"
  | "Electrical & Lights"
  | "Exhaust & Emissions (DPF)"
  | "Trailer & Reefer Repair"
  | "Other";

export interface FleetDocument {
  id: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string; // ISO date
  expirationDate?: string; // YYYY-MM-DD
  fileData?: string; // base64 or object URL
  notes?: string;
  testDate?: string; // for drug test results
  testType?: "Random FMCSA" | "Pre-Employment" | "Post-Accident" | "Reasonable Suspicion" | "Return-to-Duty";
}

export type TruckDocumentKey =
  | "title"
  | "tax2290"
  | "dotInspection"
  | "insurance"
  | "cabCard"
  | "leaseAgreement";

export interface Truck {
  id: string;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  isTemporaryPlate: boolean;
  ownershipType: OwnershipType;
  truckValue: number;
  bestPassSerialNumber: string;
  isBestPassLinked: boolean;
  assignedDriverId: string | null;
  status: EquipmentStatus;
  currentMileage: number;
  notes: string;
  documents: Record<TruckDocumentKey, FleetDocument | null>;
}

export type TrailerDocumentKey =
  | "title"
  | "tax2290"
  | "dotInspection"
  | "insurance"
  | "cabCard"
  | "trailerAgreement";

export interface Trailer {
  id: string;
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plateNumber: string;
  isTemporaryPlate: boolean;
  ownershipType: OwnershipType;
  trailerValue: number;
  status: EquipmentStatus;
  assignedTruckId: string | null;
  notes: string;
  documents: Record<TrailerDocumentKey, FleetDocument | null>;
}

export interface DriverBankInfo {
  accountNumber: string;
  routingNumber: string;
  bankName?: string;
}

export interface DriverDocuments {
  mvr: FleetDocument | null;
  pspAuth: FleetDocument | null;
  pspReport: FleetDocument | null; // 2.1 PSP Driver Report
  cdl: FleetDocument | null; // Front/Back + Expiration
  medCard: FleetDocument | null; // Medical Card + Expiration
  clearingHouse: FleetDocument | null;
  applicationLink: string; // URL
  applicationFile: FleetDocument | null; // File
  drugCustodyForm: FleetDocument | null; // 7. Custody & Control Form (CCF)
  drugPassport: FleetDocument | null; // 8. ePassport
  drugTestResults: FleetDocument[]; // 9. Multiple files (monthly FMCSA random picks)
  bankInfoDoc: FleetDocument | null; // 10. Bank info / Voided Check
  einLetter: FleetDocument | null; // 11. EIN Letter / W9
}

export interface Driver {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  phone: string;
  state: string;
  licenseNumber: string;
  status: DriverStatus;
  assignedTruckId: string | null;
  bankInfo: DriverBankInfo;
  documents: DriverDocuments;
  hireDate: string;
  notes: string;
}

export interface MaintenanceRecord {
  id: string;
  truckId: string;
  truckUnitNumber: string;
  serviceDate: string; // YYYY-MM-DD
  odometer: number;
  serviceType: MaintenanceServiceType;
  shopId: string | null;
  shopName: string;
  laborCost: number;
  partsCost: number;
  calloutFee: number;
  totalCost: number;
  invoiceNumber: string;
  invoiceDocument?: FleetDocument | null;
  nextServiceDueMileage?: number;
  nextServiceDueDate?: string;
  status: MaintenanceStatus;
  description: string;
}

export interface TruckShop {
  id: string;
  businessName: string;
  businessAddress: string;
  state: string;
  phone: string;
  shopType: ShopType;
  repairCategories: string[];
  descriptionOfWork: string;
  googleMapsUrl: string;
  laborRatePerHour: number;
  calloutFee: number;
  rating: number; // 1-5
  notes: string;
}

export interface ComplianceAlert {
  id: string;
  entityType: "truck" | "trailer" | "driver";
  entityId: string;
  entityName: string;
  documentType: string;
  expirationDate: string;
  daysRemaining: number;
  status: "expired" | "urgent" | "upcoming"; // <=0 days: expired, <=15: urgent, <=30: upcoming
}
