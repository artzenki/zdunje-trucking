import {
  Truck,
  Trailer,
  Driver,
  MaintenanceRecord,
  TruckShop,
  AppUser,
  PaymentReminder,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/types/fleet";

export const initialTrucks: Truck[] = [];
export const initialTrailers: Trailer[] = [];
export const initialDrivers: Driver[] = [];
export const initialShops: TruckShop[] = [];
export const initialMaintenanceRecords: MaintenanceRecord[] = [];
export const initialReminders: PaymentReminder[] = [
  {
    id: "rem_001",
    name: "Unit #101 Penske Lease Installment",
    amount: 1850.0,
    date: new Date().toISOString().split("T")[0], // Today
    time: "10:00",
    category: "Lease / Finance",
    reasonNotes: "Monthly tractor lease installment via Penske Truck Leasing portal. Account #PK-88921.",
    status: "Pending",
    relatedEntityType: "truck",
    relatedEntityName: "Unit #101",
    isRecurring: true,
    recurrence: "Monthly",
    createdAt: "2024-09-01",
  },
  {
    id: "rem_002",
    name: "Progressive Fleet Commercial Liability Premium",
    amount: 3420.5,
    date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0], // in 2 days
    time: "14:30",
    category: "Insurance",
    reasonNotes: "Auto liability, bobtail, and physical damage policy #PRG-99238472. Auto-debit fails if not authorized.",
    status: "Pending",
    relatedEntityType: "general",
    isRecurring: true,
    recurrence: "Monthly",
    createdAt: "2024-09-01",
  },
  {
    id: "rem_003",
    name: "BestPass Toll Account Auto-Replenish Verification",
    amount: 600.0,
    date: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0], // in 5 days
    time: "09:00",
    category: "Tolls & Transponder",
    reasonNotes: "Verify credit card balance threshold to keep I-Pass and PrePass transponders active on tollways.",
    status: "Pending",
    relatedEntityType: "general",
    isRecurring: true,
    recurrence: "Monthly",
    createdAt: "2024-09-05",
  },
  {
    id: "rem_004",
    name: "2290 Heavy Highway Vehicle Use Tax (IRS e-File)",
    amount: 550.0,
    date: new Date(Date.now() - 86400000 * 5).toISOString().split("T")[0], // 5 days ago
    time: "16:00",
    category: "Tax (2290 / IFTA)",
    reasonNotes: "Annual IRS 2290 Form filing for Schedule 1 watermark stamp on power units.",
    status: "Completed",
    completedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    relatedEntityType: "truck",
    relatedEntityName: "Unit #102",
    isRecurring: true,
    recurrence: "Yearly",
    createdAt: "2024-08-20",
  },
];

export const initialUsers: AppUser[] = [
  {
    id: "usr_001",
    name: "Haris Zdunje",
    email: "haris@zdunjetrucking.com",
    phone: "(312) 555-0101",
    role: "Super Admin",
    status: "Active",
    department: "Executive & Ownership",
    lastActive: "Just now",
    createdAt: "2024-01-15",
    permissions: ROLE_DEFAULT_PERMISSIONS["Super Admin"],
    notes: "Fleet owner and principal administrator. Has unrestricted rights across all systems.",
  },
  {
    id: "usr_002",
    name: "Eldin Basic",
    email: "safety@zdunjetrucking.com",
    phone: "(312) 555-0102",
    role: "Safety Manager",
    status: "Active",
    department: "Safety & Compliance",
    lastActive: "2 hours ago",
    createdAt: "2024-02-01",
    permissions: ROLE_DEFAULT_PERMISSIONS["Safety Manager"],
    notes: "Oversees FMCSA compliance, CDL qualification, drug test pools, and DOT audits.",
  },
  {
    id: "usr_003",
    name: "Mirsad Vucic",
    email: "dispatch@zdunjetrucking.com",
    phone: "(312) 555-0103",
    role: "Dispatcher",
    status: "Active",
    department: "Operations & Dispatch",
    lastActive: "10 mins ago",
    createdAt: "2024-03-10",
    permissions: ROLE_DEFAULT_PERMISSIONS["Dispatcher"],
    notes: "Assigns power units to drivers, tracks loads, and manages equipment statuses.",
  },
  {
    id: "usr_004",
    name: "Damir Jahic",
    email: "maintenance@zdunjetrucking.com",
    phone: "(312) 555-0104",
    role: "Maintenance Tech",
    status: "Active",
    department: "Fleet Maintenance & Repair",
    lastActive: "Yesterday",
    createdAt: "2024-04-12",
    permissions: ROLE_DEFAULT_PERMISSIONS["Maintenance Tech"],
    notes: "Supervises PM schedules, roadside service calls, and vendor repair work orders.",
  },
];

