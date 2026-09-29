"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Truck,
  Trailer,
  Driver,
  MaintenanceRecord,
  TruckShop,
  FleetDocument,
  TruckDocumentKey,
  TrailerDocumentKey,
  ComplianceAlert,
  AppUser,
  UserStatus,
  PaymentReminder,
} from "@/types/fleet";
import {
  initialTrucks,
  initialTrailers,
  initialDrivers,
  initialShops,
  initialMaintenanceRecords,
  initialUsers,
  initialReminders,
} from "@/lib/mockData";
import { supabase } from "@/lib/supabase";
import {
  truckToRow,
  trailerToRow,
  driverToRow,
  shopToRow,
  maintenanceToRow,
  reminderToRow,
  userToRow,
  cloudUpsert,
  cloudDelete,
} from "@/lib/supabaseSync";

interface FleetContextType {
  trucks: Truck[];
  trailers: Trailer[];
  drivers: Driver[];
  shops: TruckShop[];
  maintenanceRecords: MaintenanceRecord[];
  alerts: ComplianceAlert[];

  // Trucks
  addTruck: (truck: Omit<Truck, "id" | "documents">) => void;
  updateTruck: (id: string, truck: Partial<Truck>) => void;
  deleteTruck: (id: string) => void;
  uploadTruckDocument: (
    truckId: string,
    key: TruckDocumentKey,
    document: FleetDocument
  ) => void;
  removeTruckDocument: (truckId: string, key: TruckDocumentKey, historyDocId?: string) => void;
  addTruckCustomDocument: (truckId: string, document: FleetDocument) => void;
  removeTruckCustomDocument: (truckId: string, documentId: string) => void;

  // Trailers
  addTrailer: (trailer: Omit<Trailer, "id" | "documents">) => void;
  updateTrailer: (id: string, trailer: Partial<Trailer>) => void;
  deleteTrailer: (id: string) => void;
  uploadTrailerDocument: (
    trailerId: string,
    key: TrailerDocumentKey,
    document: FleetDocument
  ) => void;
  removeTrailerDocument: (trailerId: string, key: TrailerDocumentKey, historyDocId?: string) => void;
  addTrailerCustomDocument: (trailerId: string, document: FleetDocument) => void;
  removeTrailerCustomDocument: (trailerId: string, documentId: string) => void;

  // Drivers
  addDriver: (driver: Omit<Driver, "id" | "documents">) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;
  uploadDriverDocument: (
    driverId: string,
    categoryKey: keyof Omit<
      Driver["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    >,
    document: FleetDocument
  ) => void;
  removeDriverDocument: (
    driverId: string,
    categoryKey: keyof Omit<
      Driver["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    >,
    historyDocId?: string
  ) => void;
  addDriverDrugTestResult: (driverId: string, document: FleetDocument) => void;
  removeDriverDrugTestResult: (driverId: string, documentId: string) => void;
  addDriverDotRecord: (driverId: string, document: FleetDocument) => void;
  removeDriverDotRecord: (driverId: string, documentId: string) => void;
  updateDriverApplicationLink: (driverId: string, link: string) => void;
  toggleDriverDocumentSkip: (driverId: string, documentKey: string) => void;

  // Maintenance
  addMaintenanceRecord: (
    record: Omit<MaintenanceRecord, "id">
  ) => void;
  updateMaintenanceRecord: (
    id: string,
    record: Partial<MaintenanceRecord>
  ) => void;
  deleteMaintenanceRecord: (id: string) => void;

  // Shops
  addShop: (shop: Omit<TruckShop, "id">) => void;
  updateShop: (id: string, shop: Partial<TruckShop>) => void;
  deleteShop: (id: string) => void;

  // Bulk Import
  bulkAddTrucks: (trucks: Omit<Truck, "id" | "documents">[]) => void;
  bulkAddTrailers: (trailers: Omit<Trailer, "id" | "documents">[]) => void;
  bulkAddDrivers: (drivers: Omit<Driver, "id" | "documents">[]) => void;
  bulkAddShops: (shops: Omit<TruckShop, "id">[]) => void;

  // Users & Permissions
  users: AppUser[];
  addUser: (user: Omit<AppUser, "id" | "createdAt">) => void;
  updateUser: (id: string, user: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string, status: UserStatus) => void;
  resetUsers: () => void;

  // Payment & Calendar Reminders
  reminders: PaymentReminder[];
  addReminder: (reminder: Omit<PaymentReminder, "id" | "createdAt">) => void;
  updateReminder: (id: string, reminder: Partial<PaymentReminder>) => void;
  deleteReminder: (id: string) => void;
  toggleReminderStatus: (id: string) => void;

  // Bulk State Setters
  setAllFleetData: (data: {
    trucks?: Truck[];
    trailers?: Trailer[];
    drivers?: Driver[];
    shops?: TruckShop[];
    maintenanceRecords?: MaintenanceRecord[];
    users?: AppUser[];
    reminders?: PaymentReminder[];
  }) => void;

  // Reset
  resetDataToDemo: () => void;

  // Cloud Auto-Sync
  cloudSyncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncTime: string | null;
  syncWithCloud: () => Promise<{ success: boolean; message: string }>;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shops, setShops] = useState<TruckShop[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<
    MaintenanceRecord[]
  >([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const isInitialMount = React.useRef(true);

  // Load from LocalStorage or initialize with mock data
  useEffect(() => {
    try {
      const savedTrucks = localStorage.getItem("zdunje_trucks");
      const savedTrailers = localStorage.getItem("zdunje_trailers");
      const savedDrivers = localStorage.getItem("zdunje_drivers");
      const savedShops = localStorage.getItem("zdunje_shops");
      const savedMaint = localStorage.getItem("zdunje_maintenance");
      const savedUsers = localStorage.getItem("zdunje_users");
      const savedReminders = localStorage.getItem("zdunje_reminders");

      if (savedTrucks) {
        const parsed = JSON.parse(savedTrucks);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrucks(parsed.map((t: any) => ({
          ...t,
          status: t.status || "Active",
          documents: {
            title: null,
            tax2290: null,
            dotInspection: null,
            insurance: null,
            cabCard: null,
            leaseAgreement: null,
            ...(t.documents || {}),
          },
          customDocuments: t.customDocuments || [],
        })));
      } else {
        setTrucks(initialTrucks);
      }

      if (savedTrailers) {
        const parsed = JSON.parse(savedTrailers);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTrailers(parsed.map((tr: any) => ({
          ...tr,
          status: tr.status || "Active",
          documents: {
            title: null,
            tax2290: null,
            dotInspection: null,
            insurance: null,
            cabCard: null,
            trailerAgreement: null,
            ...(tr.documents || {}),
          },
          customDocuments: tr.customDocuments || [],
        })));
      } else {
        setTrailers(initialTrailers);
      }

      if (savedDrivers) {
        const parsed = JSON.parse(savedDrivers);
        setDrivers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsed.map((d: any) => ({
            ...d,
            email: d.email || "",
            skippedDocuments: d.skippedDocuments || [],
            documents: {
              mvr: null,
              pspAuth: null,
              pspReport: null,
              cdl: null,
              medCard: null,
              clearingHouse: null,
              applicationFile: null,
              applicationLink: "",
              drugCustodyForm: null,
              drugPassport: null,
              bankInfoDoc: null,
              einLetter: null,
              onboardingDoc: null,
              leaseAgreement: null,
              ...(d.documents || {}),
              drugTestResults: d.documents?.drugTestResults || [],
              dotRecords: d.documents?.dotRecords || [],
            },
          }))
        );
      } else {
        setDrivers(initialDrivers);
      }

      if (savedShops) setShops(JSON.parse(savedShops));
      else setShops(initialShops);

      if (savedMaint) setMaintenanceRecords(JSON.parse(savedMaint));
      else setMaintenanceRecords(initialMaintenanceRecords);

      if (savedUsers) {
        const parsedU = JSON.parse(savedUsers);
        const cleanU = Array.isArray(parsedU)
          ? parsedU.filter((u: AppUser) => !["usr_002", "usr_003", "usr_004"].includes(u.id))
          : initialUsers;
        setUsers(cleanU.length > 0 ? cleanU : initialUsers);
      } else {
        setUsers(initialUsers);
      }

      // Clear calendar reminders completely
      setReminders([]);
      localStorage.setItem("zdunje_reminders", JSON.stringify([]));
    } catch {
      setTrucks(initialTrucks);
      setTrailers(initialTrailers);
      setDrivers(initialDrivers);
      setShops(initialShops);
      setMaintenanceRecords(initialMaintenanceRecords);
      setUsers(initialUsers);
      setReminders(initialReminders);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("zdunje_trucks", JSON.stringify(trucks));
      localStorage.setItem("zdunje_trailers", JSON.stringify(trailers));
      localStorage.setItem("zdunje_drivers", JSON.stringify(drivers));
      localStorage.setItem("zdunje_shops", JSON.stringify(shops));
      localStorage.setItem(
        "zdunje_maintenance",
        JSON.stringify(maintenanceRecords)
      );
      localStorage.setItem("zdunje_users", JSON.stringify(users));
      localStorage.setItem("zdunje_reminders", JSON.stringify(reminders));
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }, [trucks, trailers, drivers, shops, maintenanceRecords, users, reminders, isLoaded]);

  // Explicit Cloud Sync Function
  const syncWithCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) return { success: false, message: "Supabase client not initialized" };
    setCloudSyncStatus("syncing");
    try {
      await Promise.all([
        trucks.length > 0 ? cloudUpsert("trucks", trucks.map(truckToRow)) : Promise.resolve(),
        trailers.length > 0 ? cloudUpsert("trailers", trailers.map(trailerToRow)) : Promise.resolve(),
        drivers.length > 0 ? cloudUpsert("drivers", drivers.map(driverToRow)) : Promise.resolve(),
        shops.length > 0 ? cloudUpsert("shops", shops.map(shopToRow)) : Promise.resolve(),
        maintenanceRecords.length > 0 ? cloudUpsert("maintenance_records", maintenanceRecords.map(maintenanceToRow)) : Promise.resolve(),
        reminders.length > 0 ? cloudUpsert("payment_reminders", reminders.map(reminderToRow)) : Promise.resolve(),
        users.length > 0 ? cloudUpsert("user_profiles", users.map(userToRow)) : Promise.resolve(),
      ]);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSyncTime(timeStr);
      setCloudSyncStatus("synced");
      return { success: true, message: `Synced with Supabase at ${timeStr}` };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sync error";
      console.warn("[Supabase Auto-Sync] Manual sync error:", msg);
      setCloudSyncStatus("error");
      return { success: false, message: msg };
    }
  };

  const hasReconciled = React.useRef(false);

  // Initial startup sync reconciliation
  useEffect(() => {
    if (!isLoaded) return;
    const client = supabase;
    if (!client) return;

    const initialSync = async () => {
      try {
        setCloudSyncStatus("syncing");
        const { count: remoteDrivers } = await client
          .from("drivers")
          .select("id", { count: "exact", head: true });

        // If local has drivers but remote is 0 (or empty), push local data to Supabase
        if ((remoteDrivers === 0 || remoteDrivers === null) && drivers.length > 0 && !hasReconciled.current) {
          hasReconciled.current = true;
          console.log(`[Supabase Auto-Sync] Reconciling ${drivers.length} drivers and fleet into Supabase...`);
          await Promise.all([
            trucks.length > 0 ? cloudUpsert("trucks", trucks.map(truckToRow)) : Promise.resolve(),
            trailers.length > 0 ? cloudUpsert("trailers", trailers.map(trailerToRow)) : Promise.resolve(),
            drivers.length > 0 ? cloudUpsert("drivers", drivers.map(driverToRow)) : Promise.resolve(),
            shops.length > 0 ? cloudUpsert("shops", shops.map(shopToRow)) : Promise.resolve(),
            maintenanceRecords.length > 0 ? cloudUpsert("maintenance_records", maintenanceRecords.map(maintenanceToRow)) : Promise.resolve(),
            reminders.length > 0 ? cloudUpsert("payment_reminders", reminders.map(reminderToRow)) : Promise.resolve(),
            users.length > 0 ? cloudUpsert("user_profiles", users.map(userToRow)) : Promise.resolve(),
          ]);
        }
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        setLastSyncTime(timeStr);
        setCloudSyncStatus("synced");
      } catch (e) {
        console.warn("[Supabase Auto-Sync] Initial sync exception:", e);
        setCloudSyncStatus("error");
      }
    };
    initialSync();
  }, [isLoaded, drivers.length]);

  // Immediate or debounced auto-sync to Supabase on any change
  useEffect(() => {
    if (!isLoaded || !supabase) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setCloudSyncStatus("syncing");
    const timer = setTimeout(async () => {
      try {
        await Promise.all([
          trucks.length > 0 ? cloudUpsert("trucks", trucks.map(truckToRow)) : Promise.resolve(),
          trailers.length > 0 ? cloudUpsert("trailers", trailers.map(trailerToRow)) : Promise.resolve(),
          drivers.length > 0 ? cloudUpsert("drivers", drivers.map(driverToRow)) : Promise.resolve(),
          shops.length > 0 ? cloudUpsert("shops", shops.map(shopToRow)) : Promise.resolve(),
          maintenanceRecords.length > 0 ? cloudUpsert("maintenance_records", maintenanceRecords.map(maintenanceToRow)) : Promise.resolve(),
          reminders.length > 0 ? cloudUpsert("payment_reminders", reminders.map(reminderToRow)) : Promise.resolve(),
          users.length > 0 ? cloudUpsert("user_profiles", users.map(userToRow)) : Promise.resolve(),
        ]);
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSyncTime(timeStr);
        setCloudSyncStatus("synced");
      } catch (err) {
        console.warn("[Supabase Auto-Sync] Auto-sync error:", err);
        setCloudSyncStatus("error");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [trucks, trailers, drivers, shops, maintenanceRecords, reminders, users, isLoaded]);

  // Compute Alerts
  const alerts: ComplianceAlert[] = React.useMemo(() => {
    const list: ComplianceAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDoc = (
      doc: FleetDocument | null | undefined,
      entityType: "truck" | "trailer" | "driver",
      entityId: string,
      entityName: string,
      docType: string
    ) => {
      if (!doc || !doc.expirationDate) return;
      const exp = new Date(doc.expirationDate);
      exp.setHours(0, 0, 0, 0);
      const diffTime = exp.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysRemaining <= 30) {
        list.push({
          id: `${entityId}-${docType}-${doc.expirationDate}`,
          entityType,
          entityId,
          entityName,
          documentType: docType,
          expirationDate: doc.expirationDate,
          daysRemaining,
          status:
            daysRemaining <= 0
              ? "expired"
              : daysRemaining <= 15
              ? "urgent"
              : "upcoming",
        });
      }
    };

    // Trucks
    trucks.forEach((t) => {
      if (!t.documents) return;
      checkDoc(
        t.documents.dotInspection,
        "truck",
        t.id,
        `Unit #${t.unitNumber} (${t.make})`,
        "Annual DOT Inspection"
      );
      checkDoc(
        t.documents.tax2290,
        "truck",
        t.id,
        `Unit #${t.unitNumber} (${t.make})`,
        "2290 Heavy Highway Tax"
      );
      checkDoc(
        t.documents.cabCard,
        "truck",
        t.id,
        `Unit #${t.unitNumber} (${t.make})`,
        "CAB Card / Registration"
      );
      checkDoc(
        t.documents.insurance,
        "truck",
        t.id,
        `Unit #${t.unitNumber} (${t.make})`,
        "Insurance Certificate"
      );
    });

    // Trailers
    trailers.forEach((tr) => {
      if (!tr.documents) return;
      checkDoc(
        tr.documents.dotInspection,
        "trailer",
        tr.id,
        `Trailer #${tr.unitNumber}`,
        "Annual DOT Inspection"
      );
      checkDoc(
        tr.documents.cabCard,
        "trailer",
        tr.id,
        `Trailer #${tr.unitNumber}`,
        "CAB Card / Registration"
      );
      checkDoc(
        tr.documents.insurance,
        "trailer",
        tr.id,
        `Trailer #${tr.unitNumber}`,
        "Insurance Certificate"
      );
    });

    // Drivers
    drivers.forEach((d) => {
      if (!d.documents) return;
      const name = `${d.firstName} ${d.lastName}`;
      checkDoc(d.documents.cdl, "driver", d.id, name, "Commercial Driver License (CDL)");
      checkDoc(d.documents.medCard, "driver", d.id, name, "Medical Examiner Card (MEDCard)");
    });

    // Sort by days remaining ascending
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [trucks, trailers, drivers]);

  // Truck Handlers
  const addTruck = (data: Omit<Truck, "id" | "documents">) => {
    const newTruck: Truck = {
      ...data,
      id: `truck-${Date.now()}`,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        leaseAgreement: null,
      },
    };
    setTrucks((prev) => [newTruck, ...prev]);
  };

  const updateTruck = (id: string, updated: Partial<Truck>) => {
    setTrucks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updated } : t))
    );
  };

  const deleteTruck = (id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
    cloudDelete("trucks", id);
  };

  const uploadTruckDocument = (
    truckId: string,
    key: TruckDocumentKey,
    document: FleetDocument
  ) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const existing = t.documents ? t.documents[key] : null;
        let newHistory: FleetDocument[] = [];
        if (existing) {
          const prevHistory = existing.history || [];
          const archivedExisting: FleetDocument = {
            ...existing,
            isCurrent: false,
            status: "expired",
            history: undefined,
          };
          newHistory = [archivedExisting, ...prevHistory];
        }
        const newCurrentDoc: FleetDocument = {
          ...document,
          isCurrent: true,
          status: "current",
          history: newHistory,
        };
        return {
          ...t,
          documents: {
            ...t.documents,
            [key]: newCurrentDoc,
          },
        };
      })
    );
  };

  const removeTruckDocument = (truckId: string, key: TruckDocumentKey, historyDocId?: string) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const currentDoc = t.documents ? t.documents[key] : null;
        if (!currentDoc) return t;

        // If removing a specific historical / expired file:
        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          return {
            ...t,
            documents: {
              ...t.documents,
              [key]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        }

        // If removing the current active file:
        const remainingHistory = currentDoc.history || [];
        if (remainingHistory.length > 0) {
          // Promote the most recent historical file as current or keep slot with remaining history
          const [nextCurrent, ...restHistory] = remainingHistory;
          return {
            ...t,
            documents: {
              ...t.documents,
              [key]: {
                ...nextCurrent,
                isCurrent: true,
                status: "current",
                history: restHistory,
              },
            },
          };
        }

        // Completely empty
        return {
          ...t,
          documents: {
            ...t.documents,
            [key]: null,
          },
        };
      })
    );
  };

  const addTruckCustomDocument = (
    truckId: string,
    document: FleetDocument
  ) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const customDocs = t.customDocuments || [];
        return {
          ...t,
          customDocuments: [document, ...customDocs],
        };
      })
    );
  };

  const removeTruckCustomDocument = (
    truckId: string,
    documentId: string
  ) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        return {
          ...t,
          customDocuments: (t.customDocuments || []).filter(
            (d) => d.id !== documentId
          ),
        };
      })
    );
  };

  // Trailer Handlers
  const addTrailer = (data: Omit<Trailer, "id" | "documents">) => {
    const newTrailer: Trailer = {
      ...data,
      id: `trailer-${Date.now()}`,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        trailerAgreement: null,
      },
    };
    setTrailers((prev) => [newTrailer, ...prev]);
  };

  const updateTrailer = (id: string, updated: Partial<Trailer>) => {
    setTrailers((prev) =>
      prev.map((tr) => (tr.id === id ? { ...tr, ...updated } : tr))
    );
  };

  const deleteTrailer = (id: string) => {
    setTrailers((prev) => prev.filter((tr) => tr.id !== id));
    cloudDelete("trailers", id);
  };

  const uploadTrailerDocument = (
    trailerId: string,
    key: TrailerDocumentKey,
    document: FleetDocument
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        const existing = tr.documents ? tr.documents[key] : null;
        let newHistory: FleetDocument[] = [];
        if (existing) {
          const prevHistory = existing.history || [];
          const archivedExisting: FleetDocument = {
            ...existing,
            isCurrent: false,
            status: "expired",
            history: undefined,
          };
          newHistory = [archivedExisting, ...prevHistory];
        }
        const newCurrentDoc: FleetDocument = {
          ...document,
          isCurrent: true,
          status: "current",
          history: newHistory,
        };
        return {
          ...tr,
          documents: {
            ...tr.documents,
            [key]: newCurrentDoc,
          },
        };
      })
    );
  };

  const removeTrailerDocument = (
    trailerId: string,
    key: TrailerDocumentKey,
    historyDocId?: string
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        const currentDoc = tr.documents ? tr.documents[key] : null;
        if (!currentDoc) return tr;

        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          return {
            ...tr,
            documents: {
              ...tr.documents,
              [key]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        }

        const remainingHistory = currentDoc.history || [];
        if (remainingHistory.length > 0) {
          const [nextCurrent, ...restHistory] = remainingHistory;
          return {
            ...tr,
            documents: {
              ...tr.documents,
              [key]: {
                ...nextCurrent,
                isCurrent: true,
                status: "current",
                history: restHistory,
              },
            },
          };
        }

        return {
          ...tr,
          documents: {
            ...tr.documents,
            [key]: null,
          },
        };
      })
    );
  };

  const addTrailerCustomDocument = (
    trailerId: string,
    document: FleetDocument
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        const customDocs = tr.customDocuments || [];
        return {
          ...tr,
          customDocuments: [document, ...customDocs],
        };
      })
    );
  };

  const removeTrailerCustomDocument = (
    trailerId: string,
    documentId: string
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        return {
          ...tr,
          customDocuments: (tr.customDocuments || []).filter(
            (d) => d.id !== documentId
          ),
        };
      })
    );
  };

  // Driver Handlers
  const addDriver = (data: Omit<Driver, "id" | "documents">) => {
    const newDriver: Driver = {
      ...data,
      id: `driver-${Date.now()}`,
      documents: {
        mvr: null,
        pspAuth: null,
        pspReport: null,
        cdl: null,
        medCard: null,
        clearingHouse: null,
        applicationLink: "",
        applicationFile: null,
        drugCustodyForm: null,
        drugPassport: null,
        drugTestResults: [],
        dotRecords: [],
        bankInfoDoc: null,
        einLetter: null,
        onboardingDoc: null,
        leaseAgreement: null,
      },
      skippedDocuments: [],
    };
    setDrivers((prev) => [newDriver, ...prev]);
  };

  const updateDriver = (id: string, updated: Partial<Driver>) => {
    setDrivers((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updated } : d))
    );
  };

  const deleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    cloudDelete("drivers", id);
  };

  const uploadDriverDocument = (
    driverId: string,
    categoryKey: keyof Omit<
      Driver["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    >,
    document: FleetDocument
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const existing = d.documents ? (d.documents[categoryKey] as FleetDocument | null) : null;
        let newHistory: FleetDocument[] = [];
        if (existing) {
          const prevHistory = existing.history || [];
          const archivedExisting: FleetDocument = {
            ...existing,
            isCurrent: false,
            status: "expired",
            history: undefined,
          };
          newHistory = [archivedExisting, ...prevHistory];
        }
        const newCurrentDoc: FleetDocument = {
          ...document,
          isCurrent: true,
          status: "current",
          history: newHistory,
        };
        return {
          ...d,
          documents: {
            ...d.documents,
            [categoryKey]: newCurrentDoc,
          },
        };
      })
    );
  };

  const removeDriverDocument = (
    driverId: string,
    categoryKey: keyof Omit<
      Driver["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    >,
    historyDocId?: string
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const currentDoc = d.documents ? (d.documents[categoryKey] as FleetDocument | null) : null;
        if (!currentDoc) return d;

        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          return {
            ...d,
            documents: {
              ...d.documents,
              [categoryKey]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        }

        const remainingHistory = currentDoc.history || [];
        if (remainingHistory.length > 0) {
          const [nextCurrent, ...restHistory] = remainingHistory;
          return {
            ...d,
            documents: {
              ...d.documents,
              [categoryKey]: {
                ...nextCurrent,
                isCurrent: true,
                status: "current",
                history: restHistory,
              },
            },
          };
        }

        return {
          ...d,
          documents: {
            ...d.documents,
            [categoryKey]: null,
          },
        };
      })
    );
  };

  const addDriverDrugTestResult = (
    driverId: string,
    document: FleetDocument
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          documents: {
            ...d.documents,
            drugTestResults: [document, ...(d.documents.drugTestResults || [])],
          },
        };
      })
    );
  };

  const removeDriverDrugTestResult = (
    driverId: string,
    documentId: string
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          documents: {
            ...d.documents,
            drugTestResults: (d.documents.drugTestResults || []).filter(
              (doc) => doc.id !== documentId
            ),
          },
        };
      })
    );
  };

  const addDriverDotRecord = (driverId: string, document: FleetDocument) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          documents: {
            ...d.documents,
            dotRecords: [document, ...(d.documents.dotRecords || [])],
          },
        };
      })
    );
  };

  const removeDriverDotRecord = (driverId: string, documentId: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          documents: {
            ...d.documents,
            dotRecords: (d.documents.dotRecords || []).filter(
              (doc) => doc.id !== documentId
            ),
          },
        };
      })
    );
  };

  const updateDriverApplicationLink = (driverId: string, link: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          documents: {
            ...d.documents,
            applicationLink: link,
          },
        };
      })
    );
  };

  const toggleDriverDocumentSkip = (driverId: string, documentKey: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const currentSkipped = d.skippedDocuments || [];
        const isAlreadySkipped = currentSkipped.includes(documentKey);
        return {
          ...d,
          skippedDocuments: isAlreadySkipped
            ? currentSkipped.filter((k) => k !== documentKey)
            : [...currentSkipped, documentKey],
        };
      })
    );
  };

  // Maintenance Handlers
  const addMaintenanceRecord = (record: Omit<MaintenanceRecord, "id">) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}`,
    };
    setMaintenanceRecords((prev) => [newRecord, ...prev]);
  };

  const updateMaintenanceRecord = (
    id: string,
    updated: Partial<MaintenanceRecord>
  ) => {
    setMaintenanceRecords((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
    );
  };

  const deleteMaintenanceRecord = (id: string) => {
    setMaintenanceRecords((prev) => prev.filter((m) => m.id !== id));
    cloudDelete("maintenance_records", id);
  };

  // Shop Handlers
  const addShop = (shop: Omit<TruckShop, "id">) => {
    const newShop: TruckShop = {
      ...shop,
      id: `shop-${Date.now()}`,
    };
    setShops((prev) => [newShop, ...prev]);
  };

  const updateShop = (id: string, updated: Partial<TruckShop>) => {
    setShops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteShop = (id: string) => {
    setShops((prev) => prev.filter((s) => s.id !== id));
    cloudDelete("shops", id);
  };

  // Bulk Add Handlers
  const bulkAddTrucks = (items: Omit<Truck, "id" | "documents">[]) => {
    const timestamp = Date.now();
    const newTrucks: Truck[] = items.map((data, idx) => ({
      ...data,
      id: `truck-${timestamp}-${idx}`,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        leaseAgreement: null,
      },
    }));
    setTrucks((prev) => [...newTrucks, ...prev]);
  };

  const bulkAddTrailers = (items: Omit<Trailer, "id" | "documents">[]) => {
    const timestamp = Date.now();
    const newTrailers: Trailer[] = items.map((data, idx) => ({
      ...data,
      id: `trailer-${timestamp}-${idx}`,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        trailerAgreement: null,
      },
    }));
    setTrailers((prev) => [...newTrailers, ...prev]);
  };

  const bulkAddDrivers = (items: Omit<Driver, "id" | "documents">[]) => {
    const timestamp = Date.now();
    const newDrivers: Driver[] = items.map((data, idx) => ({
      ...data,
      id: `driver-${timestamp}-${idx}`,
      documents: {
        mvr: null,
        pspAuth: null,
        pspReport: null,
        cdl: null,
        medCard: null,
        clearingHouse: null,
        applicationLink: "",
        applicationFile: null,
        drugCustodyForm: null,
        drugPassport: null,
        drugTestResults: [],
        dotRecords: [],
        bankInfoDoc: null,
        einLetter: null,
        onboardingDoc: null,
        leaseAgreement: null,
      },
    }));
    setDrivers((prev) => [...newDrivers, ...prev]);
  };

  const bulkAddShops = (items: Omit<TruckShop, "id">[]) => {
    const timestamp = Date.now();
    const newShops: TruckShop[] = items.map((data, idx) => ({
      ...data,
      id: `shop-${timestamp}-${idx}`,
    }));
    setShops((prev) => [...newShops, ...prev]);
  };

  // User Management
  const addUser = (newUser: Omit<AppUser, "id" | "createdAt">) => {
    const user: AppUser = {
      ...newUser,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastActive: "Never",
    };
    setUsers((prev) => [user, ...prev]);
  };

  const updateUser = (id: string, updatedFields: Partial<AppUser>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...updatedFields } : u))
    );
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    cloudDelete("user_profiles", id);
  };

  const toggleUserStatus = (id: string, status: UserStatus) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status } : u))
    );
  };

  const resetUsers = () => {
    setUsers(initialUsers);
    localStorage.setItem("zdunje_users", JSON.stringify(initialUsers));
  };

  // Payment & Calendar Reminders Handlers
  const addReminder = (data: Omit<PaymentReminder, "id" | "createdAt">) => {
    const newReminder: PaymentReminder = {
      ...data,
      id: `rem_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setReminders((prev) => [newReminder, ...prev]);
  };

  const updateReminder = (id: string, patch: Partial<PaymentReminder>) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  };

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    cloudDelete("payment_reminders", id);
  };

  const toggleReminderStatus = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newStatus: PaymentReminder["status"] =
          r.status === "Completed" ? "Pending" : "Completed";
        return {
          ...r,
          status: newStatus,
          completedAt: newStatus === "Completed" ? new Date().toISOString() : null,
        };
      })
    );
  };

  const setAllFleetData = (data: {
    trucks?: Truck[];
    trailers?: Trailer[];
    drivers?: Driver[];
    shops?: TruckShop[];
    maintenanceRecords?: MaintenanceRecord[];
    users?: AppUser[];
    reminders?: PaymentReminder[];
  }) => {
    if (data.trucks !== undefined) setTrucks(data.trucks);
    if (data.trailers !== undefined) setTrailers(data.trailers);
    if (data.drivers !== undefined) setDrivers(data.drivers);
    if (data.shops !== undefined) setShops(data.shops);
    if (data.maintenanceRecords !== undefined) setMaintenanceRecords(data.maintenanceRecords);
    if (data.users !== undefined) setUsers(data.users);
    if (data.reminders !== undefined) setReminders(data.reminders);
  };

  // Reset to clean slate (all data cleared)
  const resetDataToDemo = async () => {
    setTrucks([]);
    setTrailers([]);
    setDrivers([]);
    setShops([]);
    setMaintenanceRecords([]);
    setReminders([]);
    setUsers(initialUsers);
    localStorage.setItem("zdunje_trucks", JSON.stringify([]));
    localStorage.setItem("zdunje_trailers", JSON.stringify([]));
    localStorage.setItem("zdunje_drivers", JSON.stringify([]));
    localStorage.setItem("zdunje_shops", JSON.stringify([]));
    localStorage.setItem("zdunje_maintenance", JSON.stringify([]));
    localStorage.setItem("zdunje_reminders", JSON.stringify([]));
    localStorage.setItem("zdunje_users", JSON.stringify(initialUsers));

    const client = supabase;
    if (client) {
      setCloudSyncStatus("syncing");
      try {
        await Promise.all([
          client.from("trucks").delete().neq("id", "0"),
          client.from("trailers").delete().neq("id", "0"),
          client.from("drivers").delete().neq("id", "0"),
          client.from("shops").delete().neq("id", "0"),
          client.from("maintenance_records").delete().neq("id", "0"),
          client.from("payment_reminders").delete().neq("id", "0"),
          client.from("user_profiles").delete().neq("id", "0"),
        ]);
        await cloudUpsert("user_profiles", initialUsers.map(userToRow));
        setCloudSyncStatus("synced");
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch (err) {
        console.warn("[Supabase Auto-Sync] Reset error:", err);
      }
    }
  };

  return (
    <FleetContext.Provider
      value={{
        trucks,
        trailers,
        drivers,
        shops,
        maintenanceRecords,
        alerts,
        users,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUsers,
        reminders,
        addReminder,
        updateReminder,
        deleteReminder,
        toggleReminderStatus,
        addTruck,
        updateTruck,
        deleteTruck,
        uploadTruckDocument,
        removeTruckDocument,
        addTruckCustomDocument,
        removeTruckCustomDocument,
        addTrailer,
        updateTrailer,
        deleteTrailer,
        uploadTrailerDocument,
        removeTrailerDocument,
        addTrailerCustomDocument,
        removeTrailerCustomDocument,
        addDriver,
        updateDriver,
        deleteDriver,
        uploadDriverDocument,
        removeDriverDocument,
        addDriverDrugTestResult,
        removeDriverDrugTestResult,
        addDriverDotRecord,
        removeDriverDotRecord,
        updateDriverApplicationLink,
        toggleDriverDocumentSkip,
        addMaintenanceRecord,
        updateMaintenanceRecord,
        deleteMaintenanceRecord,
        addShop,
        updateShop,
        deleteShop,
        bulkAddTrucks,
        bulkAddTrailers,
        bulkAddDrivers,
        bulkAddShops,
        setAllFleetData,
        resetDataToDemo,
        cloudSyncStatus,
        lastSyncTime,
        syncWithCloud,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error("useFleet must be used within a FleetProvider");
  }
  return context;
};
