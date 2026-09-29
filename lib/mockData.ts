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
export const initialReminders: PaymentReminder[] = [];

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
    password: "admin123",
    notes: "Fleet owner and principal administrator. Has unrestricted rights across all systems.",
  },
];

