import {
  Truck,
  Trailer,
  Driver,
  MaintenanceRecord,
  TruckShop,
  AppUser,
  ROLE_DEFAULT_PERMISSIONS,
} from "@/types/fleet";

export const initialTrucks: Truck[] = [];
export const initialTrailers: Trailer[] = [];
export const initialDrivers: Driver[] = [];
export const initialShops: TruckShop[] = [];
export const initialMaintenanceRecords: MaintenanceRecord[] = [];

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

