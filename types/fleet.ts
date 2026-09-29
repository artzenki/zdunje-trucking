export type OwnershipType = "Lease" | "Own";
export type EquipmentStatus = "Active" | "Inactive" | "In Shop" | "Out of Service" | "Available";
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
  recordDate?: string; // YYYY-MM-DD for DOT records / inspection date
  fileData?: string; // base64 or object URL
  notes?: string;
  description?: string;
  testDate?: string; // for drug test results
  testType?: "Random FMCSA" | "Pre-Employment" | "Post-Accident" | "Reasonable Suspicion" | "Return-to-Duty";
  inspectionLevel?: string; // e.g. "Level 1", "Level 2", "Level 3"
  inspectionResult?: "Clean / No Violations" | "Violations Noted";
  isCurrent?: boolean; // whether this document is the active current version
  status?: "current" | "expired" | "archived";
  history?: FleetDocument[]; // previous expired/archived versions of this document on file
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
  customDocuments?: FleetDocument[];
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
  customDocuments?: FleetDocument[];
}

export interface DriverBankInfo {
  accountNumber: string;
  routingNumber: string;
  bankInfo?: string;
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
  dotRecords: FleetDocument[]; // Driver DOT Records (with date selector & file uploader)
  bankInfoDoc: FleetDocument | null; // 10. Bank info / Voided Check
  einLetter: FleetDocument | null; // 11. EIN Letter / W9
  onboardingDoc: FleetDocument | null; // 12. Onboarding Packet / Handbook
  leaseAgreement: FleetDocument | null; // 13. Driver Lease Agreement / Independent Contractor Agreement
}

export interface Driver {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string; // YYYY-MM-DD
  email?: string;
  phone: string;
  state: string;
  licenseNumber: string;
  status: DriverStatus;
  assignedTruckId: string | null;
  bankInfo: DriverBankInfo;
  clearingHouseQuery?: boolean; // FMCSA Clearinghouse query verified checkbox
  documents: DriverDocuments;
  skippedDocuments?: string[]; // Keys of documents marked as "Skipped / Not Required" (e.g. leaseAgreement for company drivers)
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

// User & Role-Based Access Control Types
export type UserRole =
  | "Super Admin"
  | "Safety Manager"
  | "Dispatcher"
  | "Maintenance Tech"
  | "Auditor"
  | "Custom";

export type UserStatus = "Active" | "Invited" | "Suspended";

export type PaymentReminderStatus = "Pending" | "Completed";

export type PaymentCategory =
  | "Lease / Finance"
  | "Insurance"
  | "Registration & Plates"
  | "Tax (2290 / IFTA)"
  | "Tolls & Transponder"
  | "Maintenance & Parts"
  | "Driver Settlement"
  | "Other";

export interface PaymentReminder {
  id: string;
  name: string;
  amount?: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24-hour format or 12-hour format string, e.g. "09:00", "14:30")
  category: PaymentCategory;
  reasonNotes: string;
  status: PaymentReminderStatus;
  relatedEntityType?: "truck" | "trailer" | "driver" | "general";
  relatedEntityId?: string | null;
  relatedEntityName?: string;
  isRecurring?: boolean;
  recurrence?: "Once" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  completedAt?: string | null;
  createdAt: string;
}

export type AppModule =
  | "trucks"
  | "trailers"
  | "drivers"
  | "maintenance"
  | "shops"
  | "documents"
  | "calendar"
  | "users"
  | "settings";

export interface PermissionLevel {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModulePermissions = Record<AppModule, PermissionLevel>;

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  department: string;
  lastActive?: string;
  createdAt: string;
  permissions: ModulePermissions;
  notes?: string;
}

export const MODULE_NAMES: Record<AppModule, { label: string; description: string }> = {
  trucks: {
    label: "Trucks & Power Units",
    description: "Manage truck equipment, BestPass tags, and specs",
  },
  trailers: {
    label: "Trailers & Equipment",
    description: "Manage 53' vans, reefers, and staging",
  },
  drivers: {
    label: "Drivers & Qualification",
    description: "Manage CDL drivers, direct deposit, and DOT onboarding",
  },
  maintenance: {
    label: "Maintenance & Work Orders",
    description: "Log PM services, repair invoices, and due reminders",
  },
  shops: {
    label: "Truck Shops & Roadside",
    description: "Vendor directory, hourly rates, and roadside contacts",
  },
  documents: {
    label: "Documents Vault",
    description: "Access and upload compliance files and audit certificates",
  },
  calendar: {
    label: "Payment & Reminder Calendar",
    description: "Schedule lease, insurance, toll, and vendor payment deadlines",
  },
  users: {
    label: "Users & Permissions",
    description: "Manage team member access, roles, and administrative rights",
  },
  settings: {
    label: "Settings & Cloud Sync",
    description: "Database sync, CSV bulk data imports, and system reset",
  },
};

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, ModulePermissions> = {
  "Super Admin": {
    trucks: { view: true, create: true, edit: true, delete: true },
    trailers: { view: true, create: true, edit: true, delete: true },
    drivers: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    shops: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true },
    calendar: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
  },
  "Safety Manager": {
    trucks: { view: true, create: false, edit: false, delete: false },
    trailers: { view: true, create: false, edit: false, delete: false },
    drivers: { view: true, create: true, edit: true, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    shops: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: true, edit: true, delete: false },
    calendar: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  Dispatcher: {
    trucks: { view: true, create: true, edit: true, delete: false },
    trailers: { view: true, create: true, edit: true, delete: false },
    drivers: { view: true, create: false, edit: true, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    shops: { view: true, create: true, edit: true, delete: false },
    documents: { view: true, create: true, edit: false, delete: false },
    calendar: { view: true, create: true, edit: true, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  "Maintenance Tech": {
    trucks: { view: true, create: false, edit: true, delete: false },
    trailers: { view: true, create: false, edit: true, delete: false },
    drivers: { view: false, create: false, edit: false, delete: false },
    maintenance: { view: true, create: true, edit: true, delete: false },
    shops: { view: true, create: true, edit: true, delete: false },
    documents: { view: true, create: true, edit: false, delete: false },
    calendar: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  Auditor: {
    trucks: { view: true, create: false, edit: false, delete: false },
    trailers: { view: true, create: false, edit: false, delete: false },
    drivers: { view: true, create: false, edit: false, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    shops: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false },
    calendar: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
  Custom: {
    trucks: { view: true, create: false, edit: false, delete: false },
    trailers: { view: true, create: false, edit: false, delete: false },
    drivers: { view: true, create: false, edit: false, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    shops: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false },
    calendar: { view: true, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
  },
};
