import { supabase } from "@/lib/supabase";
import {
  Truck,
  Trailer,
  Driver,
  TruckShop,
  MaintenanceRecord,
  PaymentReminder,
  AppUser,
  OwnershipType,
  EquipmentStatus,
  DriverStatus,
  ShopType,
  MaintenanceServiceType,
  MaintenanceStatus,
  PaymentCategory,
  PaymentReminderStatus,
} from "@/types/fleet";

/* =====================================================================
   MAPPERS: TYPESCRIPT OBJECT -> SUPABASE POSTGRES SNAKE_CASE ROW
===================================================================== */

export const truckToRow = (t: Truck) => ({
  id: t.id,
  unit_number: t.unitNumber,
  make: t.make,
  model: t.model,
  year: t.year,
  vin: t.vin,
  plate_number: t.plateNumber,
  is_temporary_plate: t.isTemporaryPlate,
  ownership_type: t.ownershipType,
  truck_value: t.truckValue,
  best_pass_serial_number: t.bestPassSerialNumber || null,
  is_best_pass_linked: t.isBestPassLinked || false,
  assigned_driver_id: t.assignedDriverId || null,
  status: t.status,
  current_mileage: t.currentMileage || 0,
  notes: t.notes || "",
  documents: t.documents || {},
});

export const rowToTruck = (t: Record<string, unknown>): Truck => ({
  id: String(t.id),
  unitNumber: String(t.unit_number),
  make: String(t.make),
  model: String(t.model),
  year: Number(t.year),
  vin: String(t.vin),
  plateNumber: String(t.plate_number),
  isTemporaryPlate: Boolean(t.is_temporary_plate),
  ownershipType: t.ownership_type as OwnershipType,
  truckValue: Number(t.truck_value),
  bestPassSerialNumber: String(t.best_pass_serial_number || ""),
  isBestPassLinked: Boolean(t.is_best_pass_linked),
  assignedDriverId: t.assigned_driver_id ? String(t.assigned_driver_id) : null,
  status: t.status as EquipmentStatus,
  currentMileage: Number(t.current_mileage || 0),
  notes: String(t.notes || ""),
  documents: (t.documents || {}) as Truck["documents"],
});

export const trailerToRow = (tr: Trailer) => ({
  id: tr.id,
  unit_number: tr.unitNumber,
  make: tr.make,
  model: tr.model,
  year: tr.year,
  vin: tr.vin,
  plate_number: tr.plateNumber,
  is_temporary_plate: tr.isTemporaryPlate,
  ownership_type: tr.ownershipType,
  trailer_value: tr.trailerValue,
  status: tr.status,
  assigned_truck_id: tr.assignedTruckId || null,
  notes: tr.notes || "",
  documents: tr.documents || {},
});

export const rowToTrailer = (tr: Record<string, unknown>): Trailer => ({
  id: String(tr.id),
  unitNumber: String(tr.unit_number),
  make: String(tr.make),
  model: String(tr.model),
  year: Number(tr.year),
  vin: String(tr.vin),
  plateNumber: String(tr.plate_number),
  isTemporaryPlate: Boolean(tr.is_temporary_plate),
  ownershipType: tr.ownership_type as OwnershipType,
  trailerValue: Number(tr.trailer_value),
  status: tr.status as EquipmentStatus,
  assignedTruckId: tr.assigned_truck_id ? String(tr.assigned_truck_id) : null,
  notes: String(tr.notes || ""),
  documents: (tr.documents || {}) as Trailer["documents"],
});

/* Helper to guarantee valid PostgreSQL DATE or null */
export const sanitizeDate = (val?: string | null): string | null => {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return null;
  // If MM/DD/YYYY format:
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("/");
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  // If already YYYY-MM-DD:
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Try Date parse:
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
};

export const driverToRow = (d: Driver) => ({
  id: d.id,
  first_name: d.firstName || "Driver",
  middle_name: d.middleName || "",
  last_name: d.lastName || "Operator",
  date_of_birth: sanitizeDate(d.dateOfBirth),
  email: d.email || "",
  phone: d.phone || "",
  state: d.state || "IL",
  license_number: d.licenseNumber || "",
  status: d.status || "Active",
  assigned_truck_id: d.assignedTruckId || null,
  bank_info: d.bankInfo
    ? {
        accountNumber: d.bankInfo.accountNumber || "",
        routingNumber: d.bankInfo.routingNumber || "",
        bankInfo: d.bankInfo.bankInfo || d.bankInfo.bankName || "",
        bankName: d.bankInfo.bankName || d.bankInfo.bankInfo || "",
      }
    : null,
  documents: {
    ...(d.documents || {}),
    clearingHouseQuery: !!d.clearingHouseQuery,
  },
  skipped_documents: d.skippedDocuments || [],
  hire_date: sanitizeDate(d.hireDate),
  notes: d.notes || "",
});

export const rowToDriver = (d: Record<string, unknown>): Driver => {
  const rawBank = (d.bank_info || {}) as Record<string, unknown>;
  const rawDocs = (d.documents || {}) as Record<string, unknown>;
  const clearingHouseQueryVal =
    Boolean(d.clearing_house_query) ||
    Boolean(d.clearingHouseQuery) ||
    Boolean(rawDocs.clearingHouseQuery);

  return {
    id: String(d.id),
    firstName: String(d.first_name),
    middleName: String(d.middle_name || ""),
    lastName: String(d.last_name),
    dateOfBirth: String(d.date_of_birth),
    email: String(d.email || ""),
    phone: String(d.phone),
    state: String(d.state),
    licenseNumber: String(d.license_number),
    status: d.status as DriverStatus,
    assignedTruckId: d.assigned_truck_id ? String(d.assigned_truck_id) : null,
    bankInfo: {
      accountNumber: String(rawBank.accountNumber || ""),
      routingNumber: String(rawBank.routingNumber || ""),
      bankInfo: String(rawBank.bankInfo || rawBank.bankName || ""),
      bankName: String(rawBank.bankName || rawBank.bankInfo || ""),
    },
    clearingHouseQuery: clearingHouseQueryVal,
    documents: (d.documents || {}) as Driver["documents"],
    skippedDocuments: ((d.skipped_documents || d.skippedDocuments || []) as string[]),
    hireDate: String(d.hire_date),
    notes: String(d.notes || ""),
  };
};

export const shopToRow = (s: TruckShop) => ({
  id: s.id,
  business_name: s.businessName,
  business_address: s.businessAddress || "",
  state: s.state || "IL",
  phone: s.phone || "",
  shop_type: s.shopType || "Both",
  repair_categories: s.repairCategories || [],
  description_of_work: s.descriptionOfWork || "",
  google_maps_url: s.googleMapsUrl || "",
  labor_rate_per_hour: s.laborRatePerHour || 0,
  callout_fee: s.calloutFee || 0,
  rating: s.rating || 5,
  notes: s.notes || "",
});

export const rowToShop = (s: Record<string, unknown>): TruckShop => ({
  id: String(s.id),
  businessName: String(s.business_name),
  businessAddress: String(s.business_address || ""),
  state: String(s.state || "IL"),
  phone: String(s.phone || ""),
  shopType: (s.shop_type || "Both") as ShopType,
  repairCategories: (s.repair_categories || []) as string[],
  descriptionOfWork: String(s.description_of_work || ""),
  googleMapsUrl: String(s.google_maps_url || ""),
  laborRatePerHour: Number(s.labor_rate_per_hour || 0),
  calloutFee: Number(s.callout_fee || 0),
  rating: Number(s.rating || 5),
  notes: String(s.notes || ""),
});

export const maintenanceToRow = (m: MaintenanceRecord) => ({
  id: m.id,
  truck_id: m.truckId,
  truck_unit_number: m.truckUnitNumber,
  service_date: sanitizeDate(m.serviceDate) || new Date().toISOString().split("T")[0],
  odometer: Number(m.odometer) || 0,
  service_type: m.serviceType,
  shop_id: m.shopId || null,
  shop_name: m.shopName || "",
  labor_cost: Number(m.laborCost) || 0,
  parts_cost: Number(m.partsCost) || 0,
  callout_fee: Number(m.calloutFee) || 0,
  total_cost: Number(m.totalCost) || 0,
  invoice_number: m.invoiceNumber || "",
  invoice_document: m.invoiceDocument || null,
  next_service_due_mileage: m.nextServiceDueMileage ? Number(m.nextServiceDueMileage) : null,
  next_service_due_date: sanitizeDate(m.nextServiceDueDate),
  status: m.status,
  description: m.description || "",
});

export const rowToMaintenance = (m: Record<string, unknown>): MaintenanceRecord => ({
  id: String(m.id),
  truckId: String(m.truck_id),
  truckUnitNumber: String(m.truck_unit_number),
  serviceDate: String(m.service_date),
  odometer: Number(m.odometer || 0),
  serviceType: m.service_type as MaintenanceServiceType,
  shopId: m.shop_id ? String(m.shop_id) : null,
  shopName: String(m.shop_name || ""),
  laborCost: Number(m.labor_cost || 0),
  partsCost: Number(m.parts_cost || 0),
  calloutFee: Number(m.callout_fee || 0),
  totalCost: Number(m.total_cost || 0),
  invoiceNumber: String(m.invoice_number || ""),
  invoiceDocument: (m.invoice_document || null) as MaintenanceRecord["invoiceDocument"],
  nextServiceDueMileage: m.next_service_due_mileage ? Number(m.next_service_due_mileage) : undefined,
  nextServiceDueDate: m.next_service_due_date ? String(m.next_service_due_date) : undefined,
  status: m.status as MaintenanceStatus,
  description: String(m.description || ""),
});

export const reminderToRow = (r: PaymentReminder) => ({
  id: r.id,
  name: r.name,
  amount: r.amount ? Number(r.amount) : null,
  date: r.date,
  time: r.time,
  category: r.category,
  reason_notes: r.reasonNotes || "",
  status: r.status,
  related_entity_type: r.relatedEntityType || null,
  related_entity_id: r.relatedEntityId || null,
  related_entity_name: r.relatedEntityName || null,
  is_recurring: r.isRecurring || false,
  recurrence: r.recurrence || null,
  completed_at: r.completedAt && r.completedAt.trim() ? r.completedAt : null,
});

export const rowToReminder = (r: Record<string, unknown>): PaymentReminder => ({
  id: String(r.id),
  name: String(r.name),
  amount: r.amount ? Number(r.amount) : undefined,
  date: String(r.date),
  time: String(r.time),
  category: r.category as PaymentCategory,
  reasonNotes: String(r.reason_notes || ""),
  status: r.status as PaymentReminderStatus,
  relatedEntityType: (r.related_entity_type as PaymentReminder["relatedEntityType"]) || undefined,
  relatedEntityId: r.related_entity_id ? String(r.related_entity_id) : undefined,
  relatedEntityName: r.related_entity_name ? String(r.related_entity_name) : undefined,
  isRecurring: Boolean(r.is_recurring),
  recurrence: (r.recurrence as PaymentReminder["recurrence"]) || undefined,
  completedAt: r.completed_at ? String(r.completed_at) : undefined,
  createdAt: String(r.created_at || new Date().toISOString().split("T")[0]),
});

export const userToRow = (u: AppUser) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  phone: u.phone || null,
  role: u.role,
  department: u.department || null,
  status: u.status,
  permissions: u.permissions || [],
  last_active: u.lastActive || null,
  notes: u.notes || null,
  password: u.password || null,
});

export const rowToUser = (u: Record<string, unknown>): AppUser => ({
  id: String(u.id),
  email: String(u.email),
  name: String(u.name),
  phone: u.phone ? String(u.phone) : undefined,
  role: u.role as AppUser["role"],
  department: String(u.department || "Operations"),
  status: u.status as AppUser["status"],
  permissions: (u.permissions || []) as AppUser["permissions"],
  lastActive: u.last_active ? String(u.last_active) : undefined,
  createdAt: String(u.created_at || new Date().toISOString().split("T")[0]),
  notes: u.notes ? String(u.notes) : undefined,
  password: u.password ? String(u.password) : undefined,
});

/* =====================================================================
   AUTOMATIC CLOUD SYNC OPERATIONS
===================================================================== */

export async function cloudUpsert(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[]
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase client not initialized" };
  try {
    const { error } = await supabase.from(table).upsert(payload, { onConflict: "id" });
    if (error) {
      console.warn(`[Supabase Auto-Sync] Error upserting into ${table}:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown sync error";
    console.warn(`[Supabase Auto-Sync] Exception in ${table}:`, msg);
    return { success: false, error: msg };
  }
}

export async function cloudDelete(
  table: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: "Supabase client not initialized" };
  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.warn(`[Supabase Auto-Sync] Error deleting from ${table}:`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown delete error";
    console.warn(`[Supabase Auto-Sync] Exception deleting in ${table}:`, msg);
    return { success: false, error: msg };
  }
}
