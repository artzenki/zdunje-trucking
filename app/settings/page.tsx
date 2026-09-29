"use client";

import React, { useState, useRef, useEffect } from "react";
import { useFleet } from "@/context/FleetContext";
import { supabase } from "@/lib/supabase";

import {
  Settings,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Truck,
  Users,
  Container,
  Store,
  HelpCircle,
  Database,
  RefreshCw,
  CloudUpload,
  CloudDownload,
} from "lucide-react";
import {
  OwnershipType,
  EquipmentStatus,
  DriverStatus,
  ShopType,
  Truck as TruckType,
  Trailer as TrailerType,
  Driver as DriverType,
  MaintenanceRecord,
  MaintenanceServiceType,
  MaintenanceStatus,
  PaymentReminder,
  PaymentCategory,
  PaymentReminderStatus,
  AppUser,
  UserRole,
  UserStatus,
  ModulePermissions,
} from "@/types/fleet";

type ImportCategory = "trucks" | "trailers" | "drivers" | "shops";

export default function SettingsPage() {
  const {
    trucks,
    trailers,
    drivers,
    shops,
    maintenanceRecords,
    users,
    reminders,
    bulkAddTrucks,
    bulkAddTrailers,
    bulkAddDrivers,
    bulkAddShops,
    setAllFleetData,
    resetDataToDemo,
    syncWithCloud,
    lastSyncTime,
  } = useFleet();

  const [activeCategory, setActiveCategory] = useState<ImportCategory>("trucks");
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Sync States
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseStats, setSupabaseStats] = useState<{
    trucks: number;
    trailers: number;
    drivers: number;
    shops: number;
    maintenance: number;
    reminders: number;
    users: number;
  }>({
    trucks: 0,
    trailers: 0,
    drivers: 0,
    shops: 0,
    maintenance: 0,
    reminders: 0,
    users: 0,
  });
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Check Supabase connection and stats
  const checkSupabaseStatus = async () => {
    if (!supabase) {
      setIsSupabaseConnected(false);
      return;
    }
    try {
      const [tRes, trRes, dRes, sRes, mRes, remRes, uRes] = await Promise.all([
        supabase.from("trucks").select("id", { count: "exact", head: true }),
        supabase.from("trailers").select("id", { count: "exact", head: true }),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("shops").select("id", { count: "exact", head: true }),
        supabase.from("maintenance_records").select("id", { count: "exact", head: true }),
        supabase.from("payment_reminders").select("id", { count: "exact", head: true }),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
      ]);

      setSupabaseStats({
        trucks: tRes.count || 0,
        trailers: trRes.count || 0,
        drivers: dRes.count || 0,
        shops: sRes.count || 0,
        maintenance: mRes.count || 0,
        reminders: remRes.count || 0,
        users: uRes.count || 0,
      });
      setIsSupabaseConnected(true);
    } catch {
      setIsSupabaseConnected(false);
    }
  };

  useEffect(() => {
    checkSupabaseStatus();
  }, [trucks, trailers, drivers, shops, maintenanceRecords, reminders, users, lastSyncTime]);

  // Push local data to Supabase using unified upsert & status check
  const pushToSupabase = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await syncWithCloud();
      await checkSupabaseStatus();
      if (res.success) {
        setSyncMessage(`Live sync complete: All fleet data, work orders, payment reminders, and user profiles saved to Supabase cloud database at ${new Date().toLocaleTimeString()}!`);
      } else {
        setSyncMessage(`Sync notice: ${res.message}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sync to Supabase.";
      setSyncMessage(`Error syncing to Supabase: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull from Supabase into local state
  const pullFromSupabase = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const [tRes, trRes, dRes, sRes, mRes, remRes, uRes] = await Promise.all([
        supabase.from("trucks").select("*"),
        supabase.from("trailers").select("*"),
        supabase.from("drivers").select("*"),
        supabase.from("shops").select("*"),
        supabase.from("maintenance_records").select("*"),
        supabase.from("payment_reminders").select("*"),
        supabase.from("user_profiles").select("*"),
      ]);

      const loadedTrucks: TruckType[] = (tRes.data || []).map((t: Record<string, unknown>) => ({
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
        documents: (t.documents || {}) as TruckType["documents"],
      }));

      const loadedTrailers: TrailerType[] = (trRes.data || []).map((tr: Record<string, unknown>) => ({
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
        documents: (tr.documents || {}) as TrailerType["documents"],
      }));

      const loadedDrivers: DriverType[] = (dRes.data || []).map((d: Record<string, unknown>) => ({
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
        bankInfo: (d.bank_info || { accountNumber: "", routingNumber: "" }) as DriverType["bankInfo"],
        documents: (d.documents || {}) as DriverType["documents"],
        skippedDocuments: (d.skippedDocuments || []) as string[],
        hireDate: String(d.hire_date),
        notes: String(d.notes || ""),
      }));

      const loadedShops = (sRes.data || []).map((s: Record<string, unknown>) => ({
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
      }));

      const loadedMaintenance: MaintenanceRecord[] = (mRes.data || []).map((m: Record<string, unknown>) => ({
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
      }));

      const loadedReminders: PaymentReminder[] = (remRes.data || []).map((r: Record<string, unknown>) => ({
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
      }));

      const loadedUsers: AppUser[] = (uRes.data || []).map((u: Record<string, unknown>) => ({
        id: String(u.id),
        email: String(u.email),
        name: String(u.name),
        phone: u.phone ? String(u.phone) : undefined,
        role: u.role as UserRole,
        department: String(u.department || "Operations"),
        status: u.status as UserStatus,
        permissions: (u.permissions || {}) as ModulePermissions,
        lastActive: u.last_active ? String(u.last_active) : undefined,
        notes: u.notes ? String(u.notes) : undefined,
        createdAt: String(u.created_at || new Date().toISOString().split("T")[0]),
      }));

      setAllFleetData({
        trucks: loadedTrucks.length > 0 ? loadedTrucks : undefined,
        trailers: loadedTrailers.length > 0 ? loadedTrailers : undefined,
        drivers: loadedDrivers.length > 0 ? loadedDrivers : undefined,
        shops: loadedShops.length > 0 ? loadedShops : undefined,
        maintenanceRecords: loadedMaintenance.length > 0 ? loadedMaintenance : undefined,
        reminders: loadedReminders.length > 0 ? loadedReminders : undefined,
        users: loadedUsers.length > 0 ? loadedUsers : undefined,
      });

      await checkSupabaseStatus();
      setSyncMessage("Successfully refreshed all fleet data, work orders, reminders, and users from Supabase!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load from Supabase.";
      setSyncMessage(`Error fetching from Supabase: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // CSV Templates Definition
  const templates: Record<
    ImportCategory,
    { filename: string; headers: string[]; example: string[]; description: string }
  > = {
    trucks: {
      filename: "zdunje_trucks_template.csv",
      headers: [
        "unitNumber",
        "make",
        "model",
        "year",
        "vin",
        "plateNumber",
        "isTemporaryPlate",
        "ownershipType",
        "truckValue",
        "bestPassSerialNumber",
        "status",
        "currentMileage",
        "notes",
      ],
      example: [
        "101",
        "Freightliner",
        "Cascadia 126",
        "2023",
        "1FUJGHDV8PL129841",
        "P398102",
        "false",
        "Own",
        "138000",
        "BP-9938102",
        "Active",
        "142500",
        "Dedicated Midwest - Southeast runner",
      ],
      description: "Import power units / tractors into Zdunje Trucking fleet.",
    },
    trailers: {
      filename: "zdunje_trailers_template.csv",
      headers: [
        "unitNumber",
        "make",
        "model",
        "year",
        "vin",
        "plateNumber",
        "isTemporaryPlate",
        "ownershipType",
        "trailerValue",
        "status",
        "notes",
      ],
      example: [
        "TR-5301",
        "Great Dane",
        "Champion 53ft Dry Van",
        "2022",
        "1GRAN5320ND194821",
        "TL-78201",
        "false",
        "Own",
        "44000",
        "Active",
        "Side skirts and tire inflation system",
      ],
      description: "Import semi-trailers (Dry Vans, Reefers, Flatbeds) into fleet inventory.",
    },
    drivers: {
      filename: "zdunje_drivers_template.csv",
      headers: [
        "firstName",
        "middleName",
        "lastName",
        "dateOfBirth",
        "email",
        "phone",
        "state",
        "licenseNumber",
        "status",
        "hireDate",
        "bankName",
        "routingNumber",
        "accountNumber",
        "notes",
      ],
      example: [
        "John",
        "David",
        "Miller",
        "1984-06-14",
        "john.miller@zdunjetrucking.com",
        "(312) 555-0182",
        "IL",
        "M829-1048-2910",
        "Active",
        "2021-04-15",
        "Chase Bank",
        "071000013",
        "4829104829",
        "Class A CDL with clean 3-year MVR",
      ],
      description: "Import CDL drivers with license details, contacts, and payroll banking info.",
    },
    shops: {
      filename: "zdunje_truck_shops_template.csv",
      headers: [
        "businessName",
        "businessAddress",
        "state",
        "phone",
        "shopType",
        "repairCategories",
        "descriptionOfWork",
        "googleMapsUrl",
        "laborRatePerHour",
        "calloutFee",
        "rating",
        "notes",
      ],
      example: [
        "Speedco Truck Lube & Tire #308",
        "2500 E 175th St, Lansing, IL 60438",
        "IL",
        "(708) 474-0400",
        "Shop",
        "PM-A (Oil & Lube); Tires & Alignment",
        "Express PM service, oil analysis, steer tire replacement",
        "https://maps.google.com/?q=Speedco+Lansing+IL",
        "125",
        "0",
        "5",
        "Fleet national account discount available",
      ],
      description: "Import trusted maintenance repair shops and 24/7 roadside emergency vendors.",
    },
  };

  const downloadCsvTemplate = (cat: ImportCategory) => {
    const t = templates[cat];
    const headerLine = t.headers.join(",");
    const exampleLine = t.example
      .map((val) => (val.includes(",") || val.includes(";") ? `"${val}"` : val))
      .join(",");
    const csvData = `${headerLine}\n${exampleLine}\n`;

    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", t.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error("CSV must have at least 1 header line and 1 data row.");
    }

    const rawHeaders = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim());
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const rowValues: string[] = [];
      let inQuote = false;
      let currentVal = "";

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          rowValues.push(currentVal.trim());
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      rowValues.push(currentVal.trim());

      const rowObj: Record<string, string> = {};
      rawHeaders.forEach((header, index) => {
        rowObj[header] = rowValues[index] ? rowValues[index].replace(/^["']|["']$/g, "") : "";
      });
      rows.push(rowObj);
    }

    return rows;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = parseCSV(content);
        setParsedRows(parsed);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to parse CSV file.";
        setParseError(message);
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  };

  const executeImport = () => {
    if (parsedRows.length === 0) return;
    setParseError(null);

    try {
      if (activeCategory === "trucks") {
        const items = parsedRows.map((r) => ({
          unitNumber: r.unitNumber || `UNIT-${Math.floor(Math.random() * 900 + 100)}`,
          make: r.make || "Freightliner",
          model: r.model || "Cascadia",
          year: parseInt(r.year, 10) || new Date().getFullYear(),
          vin: r.vin || "1FUJ" + Math.random().toString(36).substring(2, 10).toUpperCase(),
          plateNumber: r.plateNumber || "P" + Math.floor(Math.random() * 900000 + 100000),
          isTemporaryPlate: r.isTemporaryPlate === "true",
          ownershipType: (r.ownershipType as OwnershipType) || "Own",
          truckValue: parseFloat(r.truckValue) || 120000,
          bestPassSerialNumber: r.bestPassSerialNumber || "",
          isBestPassLinked: !!r.bestPassSerialNumber,
          assignedDriverId: null,
          status: (r.status as EquipmentStatus) || "Active",
          currentMileage: parseInt(r.currentMileage, 10) || 0,
          notes: r.notes || "",
        }));
        bulkAddTrucks(items);
        setImportSuccess(`Successfully imported ${items.length} trucks! Click "Push to Cloud" to sync to Supabase.`);
      } else if (activeCategory === "trailers") {
        const items = parsedRows.map((r) => ({
          unitNumber: r.unitNumber || `TR-${Math.floor(Math.random() * 9000 + 1000)}`,
          make: r.make || "Great Dane",
          model: r.model || "53' Dry Van",
          year: parseInt(r.year, 10) || new Date().getFullYear(),
          vin: r.vin || "1GRA" + Math.random().toString(36).substring(2, 10).toUpperCase(),
          plateNumber: r.plateNumber || "TL-" + Math.floor(Math.random() * 90000 + 10000),
          isTemporaryPlate: r.isTemporaryPlate === "true",
          ownershipType: (r.ownershipType as OwnershipType) || "Own",
          trailerValue: parseFloat(r.trailerValue) || 45000,
          status: (r.status as EquipmentStatus) || "Active",
          assignedTruckId: null,
          notes: r.notes || "",
        }));
        bulkAddTrailers(items);
        setImportSuccess(`Successfully imported ${items.length} trailers! Click "Push to Cloud" to sync to Supabase.`);
      } else if (activeCategory === "drivers") {
        const items = parsedRows.map((r) => ({
          firstName: r.firstName || "Driver",
          middleName: r.middleName || "",
          lastName: r.lastName || "Operator",
          dateOfBirth: r.dateOfBirth || "1988-01-01",
          email: r.email || "",
          phone: r.phone || "(555) 000-0000",
          state: r.state || "IL",
          licenseNumber: r.licenseNumber || "D" + Math.floor(Math.random() * 9000000 + 1000000),
          status: (r.status as DriverStatus) || "Active",
          assignedTruckId: null,
          hireDate: r.hireDate || new Date().toISOString().split("T")[0],
          bankInfo: {
            bankName: r.bankName || "Primary Bank",
            routingNumber: r.routingNumber || "",
            accountNumber: r.accountNumber || "",
          },
          notes: r.notes || "",
        }));
        bulkAddDrivers(items);
        setImportSuccess(`Successfully imported ${items.length} drivers! Click "Push to Cloud" to sync to Supabase.`);
      } else if (activeCategory === "shops") {
        const items = parsedRows.map((r) => ({
          businessName: r.businessName || "Fleet Service Center",
          businessAddress: r.businessAddress || "",
          state: r.state || "IL",
          phone: r.phone || "",
          shopType: (r.shopType as ShopType) || "Both",
          repairCategories: r.repairCategories
            ? r.repairCategories.split(";").map((c) => c.trim())
            : ["PM-A (Oil & Lube)", "Tires & Alignment"],
          descriptionOfWork: r.descriptionOfWork || "",
          googleMapsUrl: r.googleMapsUrl || "",
          laborRatePerHour: parseFloat(r.laborRatePerHour) || 135,
          calloutFee: parseFloat(r.calloutFee) || 0,
          rating: parseInt(r.rating, 10) || 5,
          notes: r.notes || "",
        }));
        bulkAddShops(items);
        setImportSuccess(`Successfully imported ${items.length} shops! Click "Push to Cloud" to sync to Supabase.`);
      }

      setParsedRows([]);
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to commit imported records.";
      setParseError(message);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete ALL fleet data? This will clear trucks, trailers, drivers, maintenance, and shops across both local storage and the Supabase cloud database."
      )
    ) {
      resetDataToDemo();
      if (supabase) {
        await Promise.all([
          supabase.from("trucks").delete().neq("id", "0"),
          supabase.from("trailers").delete().neq("id", "0"),
          supabase.from("drivers").delete().neq("id", "0"),
          supabase.from("shops").delete().neq("id", "0"),
        ]);
        await checkSupabaseStatus();
      }
      setImportSuccess("All fleet data has been cleared across both local and Supabase cloud database.");
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Settings & Database Hub
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Bulk upload fleet inventory via CSV templates, and sync seamlessly with main Supabase PostgreSQL.
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Cloud Database Status Pills */}
        <div className="flex flex-col gap-2 text-xs">
          <div
            className={`px-4 py-2 border rounded-xl flex items-center space-x-2.5 shadow-sm ${
              isSupabaseConnected
                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                : "bg-amber-50 text-amber-900 border-amber-300"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isSupabaseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            ></span>
            <div className="flex flex-col">
              <span className="font-bold flex items-center space-x-1.5">
                <span>{isSupabaseConnected ? "Supabase Cloud: Live & Auto-Synced" : "Supabase: Connecting..."}</span>
                <span className="px-1.5 py-0.2 bg-emerald-200/60 text-emerald-800 text-[10px] rounded uppercase tracking-wider font-extrabold">Instant Real-Time</span>
              </span>
              <span className="text-[11px] text-emerald-700/90 font-medium">
                Cloud Synced: {supabaseStats.trucks || trucks.length} Trucks · {supabaseStats.trailers || trailers.length} Trailers · {supabaseStats.drivers || drivers.length} Drivers · {supabaseStats.shops || shops.length} Shops · {supabaseStats.maintenance || maintenanceRecords.length} Work Orders · {supabaseStats.reminders || reminders.length} Reminders · {supabaseStats.users || users.length} Staff
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Supabase Cloud Sync Center Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
            <Database className="w-4 h-4" />
            <span>Real-Time Cloud Backend (`zdunje-trucking`)</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            Single Source of Truth: Supabase PostgreSQL & Storage
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Connected to <span className="font-mono text-blue-300">https://xorhbiwezmireelklokq.supabase.co</span>.
            All fleet records, driver credentials, and uploaded files are automatically saved directly to Supabase cloud database & storage as soon as any change is made.
          </p>
          {syncMessage && (
            <p className="text-xs font-semibold text-emerald-300 pt-1 flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{syncMessage}</span>
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={pushToSupabase}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-md shadow-blue-600/30 transition-all"
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? "animate-bounce" : ""}`} />
            <span>Push Local to Cloud</span>
          </button>
          <button
            onClick={pullFromSupabase}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 rounded-xl transition-all"
          >
            <CloudDownload className="w-4 h-4" />
            <span>Pull Cloud to Local</span>
          </button>
          <button
            onClick={checkSupabaseStatus}
            disabled={isSyncing}
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            title="Refresh DB connection"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: CSV Importer & Template Download */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Category Selector & Templates */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>1. Choose Import Type</span>
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setActiveCategory("trucks");
                  setParsedRows([]);
                  setParseError(null);
                  setImportSuccess(null);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeCategory === "trucks"
                    ? "bg-blue-50/70 border-blue-500 shadow-xs ring-1 ring-blue-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activeCategory === "trucks" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Power Units (Trucks)</h4>
                    <p className="text-[11px] text-slate-500">Make, Model, VIN, Plate, Mileage</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {trucks.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveCategory("trailers");
                  setParsedRows([]);
                  setParseError(null);
                  setImportSuccess(null);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeCategory === "trailers"
                    ? "bg-purple-50/70 border-purple-500 shadow-xs ring-1 ring-purple-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activeCategory === "trailers" ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Container className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Semi-Trailers</h4>
                    <p className="text-[11px] text-slate-500">Dry Vans, Reefers, Flatbeds, VIN</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {trailers.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveCategory("drivers");
                  setParsedRows([]);
                  setParseError(null);
                  setImportSuccess(null);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeCategory === "drivers"
                    ? "bg-emerald-50/70 border-emerald-500 shadow-xs ring-1 ring-emerald-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activeCategory === "drivers" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Drivers Roster</h4>
                    <p className="text-[11px] text-slate-500">Name, Phone, CDL #, State, Bank</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {drivers.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveCategory("shops");
                  setParsedRows([]);
                  setParseError(null);
                  setImportSuccess(null);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  activeCategory === "shops"
                    ? "bg-amber-50/70 border-amber-500 shadow-xs ring-1 ring-amber-500"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${
                      activeCategory === "shops" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Truck Shops & Roadside</h4>
                    <p className="text-[11px] text-slate-500">Vendor directory, rates & phone</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-md">
                  {shops.length}
                </span>
              </button>
            </div>
          </div>

          {/* Download Template Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-md">
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
              <Download className="w-4 h-4" />
              <span>Official CSV Template</span>
            </div>

            <div>
              <h4 className="font-bold text-white text-base capitalize">
                {activeCategory} Template
              </h4>
              <p className="text-slate-300 text-xs mt-1">
                {templates[activeCategory].description}
              </p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-700/60 text-[11px] space-y-1 font-mono text-slate-400">
              <span className="block text-slate-300 font-bold uppercase text-[10px]">Headers included:</span>
              <p className="truncate">{templates[activeCategory].headers.join(", ")}</p>
            </div>

            <button
              onClick={() => downloadCsvTemplate(activeCategory)}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              <span>Download {activeCategory.toUpperCase()} Template (.CSV)</span>
            </button>
          </div>

          {/* Clean Slate / Wipe Card */}
          <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-3 shadow-xs">
            <div className="flex items-center space-x-2 text-red-600 text-xs font-bold uppercase tracking-wider">
              <RotateCcw className="w-4 h-4" />
              <span>Reset & Clean Slate</span>
            </div>
            <p className="text-xs text-slate-500">
              Need to clear test data and start fresh? This flushes both local storage and the Supabase cloud DB.
            </p>
            <button
              onClick={handleClearAll}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 hover:border-red-600 rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Clear All Fleet Data (0 Records)</span>
            </button>
          </div>
        </div>

        {/* Right Column: Uploader, Validator & Preview Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Import {activeCategory.toUpperCase()} Records
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload your completed CSV file. We will preview and validate every row before committing.
                </p>
              </div>

              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                {activeCategory} Importer
              </span>
            </div>

            {/* Drag & Drop File Input */}
            <div>
              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20 rounded-2xl p-8 cursor-pointer transition-all">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-blue-600 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {fileName ? fileName : `Click or drag your ${activeCategory} CSV here`}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Accepts standard comma-delimited (.csv) files from Microsoft Excel, Numbers, or Google Sheets
                </span>
              </label>
            </div>

            {/* Error Message */}
            {parseError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Import Error:</strong>
                  <span>{parseError}</span>
                </div>
              </div>
            )}

            {/* Success Message */}
            {importSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-800 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Success!</strong>
                  <span>{importSuccess}</span>
                </div>
              </div>
            )}

            {/* Preview Table */}
            {parsedRows.length > 0 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                      {parsedRows.length} Rows Detected
                    </span>
                    <span className="text-xs text-slate-500">
                      Review sample data below before importing
                    </span>
                  </div>

                  <button
                    onClick={executeImport}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm & Import {parsedRows.length} {activeCategory}</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-[11px]">#</th>
                        {Object.keys(parsedRows[0] || {}).map((header) => (
                          <th key={header} className="p-2.5 text-[11px] whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="p-2.5 font-bold text-slate-400 text-[11px]">{idx + 1}</td>
                          {Object.values(row).map((val, cIdx) => (
                            <td key={cIdx} className="p-2.5 whitespace-nowrap font-medium text-slate-800">
                              {val || <span className="text-slate-300 italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 10 && (
                    <div className="p-2 bg-slate-50 text-center text-[11px] text-slate-500 border-t border-slate-200">
                      Showing preview of first 10 of {parsedRows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Guide */}
          <div className="bg-blue-50/60 rounded-2xl border border-blue-200/80 p-5 space-y-2 text-xs text-blue-900">
            <div className="flex items-center space-x-2 font-bold text-blue-950">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>How CSV & Excel Import Works:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-800 ml-1">
              <li>Click <strong>Download Template</strong> on the left to get the official spreadsheet structure.</li>
              <li>Open in <strong>Excel</strong>, <strong>Google Sheets</strong>, or <strong>Numbers</strong>, paste your real company fleet info, and save as <strong>.CSV</strong>.</li>
              <li>Upload the CSV above. The system validates all columns and lets you review before adding.</li>
              <li>Click <strong>Push Local to Cloud</strong> to save your imported records straight into your Supabase database!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
