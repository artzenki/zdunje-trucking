"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Truck,
  Trailer,
  Driver,
  Applicant,
  ApplicantDocumentKey,
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
  rowToTruck,
  trailerToRow,
  rowToTrailer,
  driverToRow,
  rowToDriver,
  applicantToRow,
  rowToApplicant,
  shopToRow,
  rowToShop,
  maintenanceToRow,
  rowToMaintenance,
  reminderToRow,
  rowToReminder,
  userToRow,
  rowToUser,
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
  toggleTruckDocumentSkip: (truckId: string, documentKey: string) => void;

  // Trailers
  addTrailer: (trailer: Omit<Trailer, "id" | "documents"> & { documents?: Partial<Record<TrailerDocumentKey, FleetDocument | null>> }) => void;
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
  toggleTrailerDocumentSkip: (trailerId: string, documentKey: string) => void;

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
  addDriverCustodyForm: (driverId: string, document: FleetDocument) => void;
  removeDriverCustodyForm: (driverId: string, documentId: string) => void;
  addDriverEPassport: (driverId: string, document: FleetDocument) => void;
  removeDriverEPassport: (driverId: string, documentId: string) => void;
  addDriverDotRecord: (driverId: string, document: FleetDocument) => void;
  removeDriverDotRecord: (driverId: string, documentId: string) => void;
  updateDriverApplicationLink: (driverId: string, link: string) => void;
  toggleDriverDocumentSkip: (driverId: string, documentKey: string) => void;

  // Applicants
  applicants: Applicant[];
  addApplicant: (applicant: Omit<Applicant, "id" | "documents">) => void;
  updateApplicant: (id: string, patch: Partial<Applicant>) => void;
  deleteApplicant: (id: string) => void;
  uploadApplicantDocument: (
    applicantId: string,
    key: ApplicantDocumentKey,
    document: FleetDocument
  ) => void;
  removeApplicantDocument: (
    applicantId: string,
    key: ApplicantDocumentKey,
    historyDocId?: string
  ) => void;
  convertApplicantToDriver: (applicantId: string) => void;

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
  const [applicants, setApplicants] = useState<Applicant[]>([]);
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

  // 1. Initial Load: Read localStorage cache for instant render, then immediately fetch live from Supabase
  useEffect(() => {
    // Phase 1: fast cache hydration
    try {
      const savedTrucks = localStorage.getItem("zdunje_trucks");
      const savedTrailers = localStorage.getItem("zdunje_trailers");
      const savedDrivers = localStorage.getItem("zdunje_drivers");
      const savedApplicants = localStorage.getItem("zdunje_applicants");
      const savedShops = localStorage.getItem("zdunje_shops");
      const savedMaint = localStorage.getItem("zdunje_maintenance");
      const savedUsers = localStorage.getItem("zdunje_users");
      const savedReminders = localStorage.getItem("zdunje_reminders");

      if (savedTrucks) setTrucks(JSON.parse(savedTrucks));
      if (savedTrailers) setTrailers(JSON.parse(savedTrailers));
      if (savedDrivers) setDrivers(JSON.parse(savedDrivers));
      if (savedApplicants) setApplicants(JSON.parse(savedApplicants));
      if (savedShops) setShops(JSON.parse(savedShops));
      if (savedMaint) setMaintenanceRecords(JSON.parse(savedMaint));
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      if (savedReminders) setReminders(JSON.parse(savedReminders));
    } catch (e) {
      console.warn("Could not read localStorage cache:", e);
    }

    // Phase 2: Live Supabase Fetch (Single Source of Truth)
    const loadFromSupabase = async () => {
      if (!supabase) {
        setIsLoaded(true);
        return;
      }

      setCloudSyncStatus("syncing");
      try {
        const [tRes, trRes, dRes, appRes, sRes, mRes, uRes, rRes] = await Promise.all([
          supabase.from("trucks").select("*"),
          supabase.from("trailers").select("*"),
          supabase.from("drivers").select("*"),
          supabase.from("applicants").select("*"),
          supabase.from("shops").select("*"),
          supabase.from("maintenance_records").select("*"),
          supabase.from("user_profiles").select("*"),
          supabase.from("payment_reminders").select("*"),
        ]);

        // Trucks: live from Supabase
        if (tRes.data && tRes.data.length > 0) {
          const remoteTrucks = tRes.data.map(rowToTruck);
          setTrucks(remoteTrucks);
          localStorage.setItem("zdunje_trucks", JSON.stringify(remoteTrucks));
        } else if (initialTrucks.length > 0) {
          await cloudUpsert("trucks", initialTrucks.map(truckToRow));
          setTrucks(initialTrucks);
          localStorage.setItem("zdunje_trucks", JSON.stringify(initialTrucks));
        }

        // Drivers: live from Supabase
        if (dRes.data && dRes.data.length > 0) {
          const remoteDrivers = dRes.data.map(rowToDriver);
          setDrivers(remoteDrivers);
          localStorage.setItem("zdunje_drivers", JSON.stringify(remoteDrivers));
        } else if (initialDrivers.length > 0) {
          await cloudUpsert("drivers", initialDrivers.map(driverToRow));
          setDrivers(initialDrivers);
          localStorage.setItem("zdunje_drivers", JSON.stringify(initialDrivers));
        }

        // Applicants: live from Supabase
        if (appRes.data && appRes.data.length > 0) {
          const remoteApplicants = appRes.data.map(rowToApplicant);
          setApplicants(remoteApplicants);
          localStorage.setItem("zdunje_applicants", JSON.stringify(remoteApplicants));
        }

        // Trailers: live from Supabase
        if (trRes.data && trRes.data.length > 0) {
          const remoteTrailers = trRes.data.map(rowToTrailer);
          setTrailers(remoteTrailers);
          localStorage.setItem("zdunje_trailers", JSON.stringify(remoteTrailers));
        } else if (initialTrailers.length > 0) {
          await cloudUpsert("trailers", initialTrailers.map(trailerToRow));
          setTrailers(initialTrailers);
          localStorage.setItem("zdunje_trailers", JSON.stringify(initialTrailers));
        } else {
          // If Supabase returned 0 trailers, check if local storage had user-created trailers and push them to cloud
          const cachedTr = localStorage.getItem("zdunje_trailers");
          if (cachedTr) {
            try {
              const parsed: Trailer[] = JSON.parse(cachedTr);
              if (parsed.length > 0) {
                setTrailers(parsed);
                await cloudUpsert("trailers", parsed.map(trailerToRow));
              }
            } catch (err) {
              console.warn("Failed restoring cached trailers:", err);
            }
          }
        }

        // Shops: live from Supabase
        if (sRes.data && sRes.data.length > 0) {
          const remoteShops = sRes.data.map(rowToShop);
          setShops(remoteShops);
          localStorage.setItem("zdunje_shops", JSON.stringify(remoteShops));
        } else if (initialShops.length > 0) {
          await cloudUpsert("shops", initialShops.map(shopToRow));
          setShops(initialShops);
          localStorage.setItem("zdunje_shops", JSON.stringify(initialShops));
        }

        // Maintenance Records: live from Supabase
        if (mRes.data && mRes.data.length > 0) {
          const remoteMaint = mRes.data.map(rowToMaintenance);
          setMaintenanceRecords(remoteMaint);
          localStorage.setItem("zdunje_maintenance", JSON.stringify(remoteMaint));
        } else if (initialMaintenanceRecords.length > 0) {
          await cloudUpsert("maintenance_records", initialMaintenanceRecords.map(maintenanceToRow));
          setMaintenanceRecords(initialMaintenanceRecords);
          localStorage.setItem("zdunje_maintenance", JSON.stringify(initialMaintenanceRecords));
        }

        // User Profiles: live from Supabase
        if (uRes.data && uRes.data.length > 0) {
          const remoteUsers = uRes.data.map(rowToUser);
          setUsers(remoteUsers);
          localStorage.setItem("zdunje_users", JSON.stringify(remoteUsers));
        } else if (initialUsers.length > 0) {
          await cloudUpsert("user_profiles", initialUsers.map(userToRow));
          setUsers(initialUsers);
          localStorage.setItem("zdunje_users", JSON.stringify(initialUsers));
        }

        // Payment Reminders: live from Supabase
        if (rRes.data && rRes.data.length > 0) {
          const remoteReminders = rRes.data.map(rowToReminder);
          setReminders(remoteReminders);
          localStorage.setItem("zdunje_reminders", JSON.stringify(remoteReminders));
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastSyncTime(timeStr);
        setCloudSyncStatus("synced");
      } catch (err) {
        console.warn("[Supabase Initial Load] Error fetching from Supabase:", err);
        setCloudSyncStatus("error");
      } finally {
        setIsLoaded(true);
      }
    };

    loadFromSupabase();
  }, []);

  // Save to LocalStorage cache
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem("zdunje_trucks", JSON.stringify(trucks));
      localStorage.setItem("zdunje_trailers", JSON.stringify(trailers));
      localStorage.setItem("zdunje_drivers", JSON.stringify(drivers));
      localStorage.setItem("zdunje_applicants", JSON.stringify(applicants));
      localStorage.setItem("zdunje_shops", JSON.stringify(shops));
      localStorage.setItem("zdunje_maintenance", JSON.stringify(maintenanceRecords));
      localStorage.setItem("zdunje_users", JSON.stringify(users));
      localStorage.setItem("zdunje_reminders", JSON.stringify(reminders));
    } catch (e) {
      console.error("Failed to save to localStorage cache", e);
    }
  }, [trucks, trailers, drivers, applicants, shops, maintenanceRecords, users, reminders, isLoaded]);

  // Explicit Full Cloud Sync Function
  const syncWithCloud = async (): Promise<{ success: boolean; message: string }> => {
    if (!supabase) return { success: false, message: "Supabase client not initialized" };
    setCloudSyncStatus("syncing");
    try {
      await Promise.all([
        trucks.length > 0 ? cloudUpsert("trucks", trucks.map(truckToRow)) : Promise.resolve(),
        trailers.length > 0 ? cloudUpsert("trailers", trailers.map(trailerToRow)) : Promise.resolve(),
        drivers.length > 0 ? cloudUpsert("drivers", drivers.map(driverToRow)) : Promise.resolve(),
        applicants.length > 0 ? cloudUpsert("applicants", applicants.map(applicantToRow)) : Promise.resolve(),
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

  // Debounced backup sync across fleet on state modifications
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
          applicants.length > 0 ? cloudUpsert("applicants", applicants.map(applicantToRow)) : Promise.resolve(),
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

    // Drivers (only active drivers generate expiration / due compliance alerts)
    drivers.forEach((d) => {
      if (!d.documents) return;
      if (d.status === "Inactive") return;
      const name = `${d.firstName} ${d.lastName}`;
      checkDoc(d.documents.cdl, "driver", d.id, name, "Commercial Driver License (CDL)");
      checkDoc(d.documents.medCard, "driver", d.id, name, "Medical Examiner Card (MEDCard)");
    });

    // Sort by days remaining ascending
    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [trucks, trailers, drivers]);

  // Truck Handlers
  const addTruck = (data: Omit<Truck, "id" | "documents">) => {
    const newTruckId = `truck-${Date.now()}`;
    const newTruck: Truck = {
      ...data,
      id: newTruckId,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        leaseAgreement: null,
      },
      customDocuments: [],
    };
    setTrucks((prev) => [newTruck, ...prev]);
    cloudUpsert("trucks", truckToRow(newTruck));

    // Interlink: If new truck has an assigned driver, link driver's assignedTruckId
    if (data.assignedDriverId) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === data.assignedDriverId) {
            const updatedD: Driver = { ...d, assignedTruckId: newTruckId };
            cloudUpsert("drivers", driverToRow(updatedD));
            return updatedD;
          }
          return d;
        })
      );
    }
    // Interlink: If new truck has a team secondary driver, link their assignedTruckId
    if (data.isTeamDriver && data.secondaryDriverId) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === data.secondaryDriverId) {
            const updatedD: Driver = { ...d, assignedTruckId: newTruckId };
            cloudUpsert("drivers", driverToRow(updatedD));
            return updatedD;
          }
          return d;
        })
      );
    }
  };

  const updateTruck = (id: string, updated: Partial<Truck>) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const newT = { ...t, ...updated };
        cloudUpsert("trucks", truckToRow(newT));
        return newT;
      })
    );

    // Current truck record for comparison
    const existingTruck = trucks.find((t) => t.id === id);

    // Interlink: Primary Driver
    if ("assignedDriverId" in updated) {
      const newDriverId = updated.assignedDriverId || null;
      setDrivers((prevDrivers) =>
        prevDrivers.map((d) => {
          // If this driver is the newly assigned primary driver
          if (newDriverId && d.id === newDriverId) {
            if (d.assignedTruckId !== id) {
              const updatedD: Driver = { ...d, assignedTruckId: id };
              cloudUpsert("drivers", driverToRow(updatedD));
              return updatedD;
            }
            return d;
          }
          // If this driver was previously assigned to this truck (and is not the secondary driver), but is no longer
          const currentSecondary = "secondaryDriverId" in updated ? updated.secondaryDriverId : existingTruck?.secondaryDriverId;
          if (d.assignedTruckId === id && d.id !== newDriverId && d.id !== currentSecondary) {
            const unlinkedD: Driver = { ...d, assignedTruckId: null };
            cloudUpsert("drivers", driverToRow(unlinkedD));
            return unlinkedD;
          }
          return d;
        })
      );

      // Clean up other trucks where newDriverId was primary
      if (newDriverId) {
        setTrucks((prevTrucks) =>
          prevTrucks.map((t) => {
            if (t.id !== id && t.assignedDriverId === newDriverId) {
              const unlinkedT: Truck = { ...t, assignedDriverId: null };
              cloudUpsert("trucks", truckToRow(unlinkedT));
              return unlinkedT;
            }
            return t;
          })
        );
      }
    }

    // Interlink: Secondary / Team Driver
    if ("secondaryDriverId" in updated || "isTeamDriver" in updated) {
      const isTeam = updated.isTeamDriver !== undefined ? updated.isTeamDriver : existingTruck?.isTeamDriver;
      const newSecondaryId = isTeam ? (updated.secondaryDriverId || null) : null;
      const currentPrimary = "assignedDriverId" in updated ? updated.assignedDriverId : existingTruck?.assignedDriverId;

      setDrivers((prevDrivers) =>
        prevDrivers.map((d) => {
          if (newSecondaryId && d.id === newSecondaryId) {
            if (d.assignedTruckId !== id) {
              const updatedD: Driver = { ...d, assignedTruckId: id };
              cloudUpsert("drivers", driverToRow(updatedD));
              return updatedD;
            }
            return d;
          }
          // If this driver was the secondary driver on this truck, but is no longer (and not primary)
          if (existingTruck?.secondaryDriverId && d.id === existingTruck.secondaryDriverId && d.id !== newSecondaryId && d.id !== currentPrimary) {
            const unlinkedD: Driver = { ...d, assignedTruckId: null };
            cloudUpsert("drivers", driverToRow(unlinkedD));
            return unlinkedD;
          }
          return d;
        })
      );
    }
  };

  const deleteTruck = (id: string) => {
    setTrucks((prev) => prev.filter((t) => t.id !== id));
    cloudDelete("trucks", id);

    // Interlink: Unlink any drivers assigned to this truck
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.assignedTruckId === id) {
          const unlinkedD: Driver = { ...d, assignedTruckId: null };
          cloudUpsert("drivers", driverToRow(unlinkedD));
          return unlinkedD;
        }
        return d;
      })
    );

    // Interlink: Uncouple any trailers assigned to this truck
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.assignedTruckId === id) {
          const uncoupledTr: Trailer = { ...tr, assignedTruckId: null };
          cloudUpsert("trailers", trailerToRow(uncoupledTr));
          return uncoupledTr;
        }
        return tr;
      })
    );
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
        const updatedTruck: Truck = {
          ...t,
          documents: {
            ...t.documents,
            [key]: newCurrentDoc,
          },
        };
        cloudUpsert("trucks", truckToRow(updatedTruck));
        return updatedTruck;
      })
    );
  };

  const removeTruckDocument = (truckId: string, key: TruckDocumentKey, historyDocId?: string) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const currentDoc = t.documents ? t.documents[key] : null;
        if (!currentDoc) return t;

        let updatedTruck: Truck;
        // If removing a specific historical / expired file:
        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          updatedTruck = {
            ...t,
            documents: {
              ...t.documents,
              [key]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        } else {
          // If removing the current active file:
          const remainingHistory = currentDoc.history || [];
          if (remainingHistory.length > 0) {
            const [nextCurrent, ...restHistory] = remainingHistory;
            updatedTruck = {
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
          } else {
            updatedTruck = {
              ...t,
              documents: {
                ...t.documents,
                [key]: null,
              },
            };
          }
        }
        cloudUpsert("trucks", truckToRow(updatedTruck));
        return updatedTruck;
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
        const updatedTruck: Truck = {
          ...t,
          customDocuments: [document, ...customDocs],
        };
        cloudUpsert("trucks", truckToRow(updatedTruck));
        return updatedTruck;
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
        const updatedTruck: Truck = {
          ...t,
          customDocuments: (t.customDocuments || []).filter(
            (d) => d.id !== documentId
          ),
        };
        cloudUpsert("trucks", truckToRow(updatedTruck));
        return updatedTruck;
      })
    );
  };

  const toggleTruckDocumentSkip = (truckId: string, documentKey: string) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        const currentSkipped = t.skippedDocuments || [];
        const isAlreadySkipped = currentSkipped.includes(documentKey);
        const updatedTruck: Truck = {
          ...t,
          skippedDocuments: isAlreadySkipped
            ? currentSkipped.filter((k) => k !== documentKey)
            : [...currentSkipped, documentKey],
        };
        cloudUpsert("trucks", truckToRow(updatedTruck));
        return updatedTruck;
      })
    );
  };

  // Trailer Handlers
  const addTrailer = (
    data: Omit<Trailer, "id" | "documents"> & {
      documents?: Partial<Record<TrailerDocumentKey, FleetDocument | null>>;
    }
  ) => {
    const { documents: initialDocs, ...restData } = data;
    const newTrailer: Trailer = {
      ...restData,
      id: `trailer-${Date.now()}`,
      documents: {
        title: null,
        tax2290: null,
        dotInspection: null,
        insurance: null,
        cabCard: null,
        trailerAgreement: null,
        ...(initialDocs || {}),
      },
      customDocuments: [],
    };
    setTrailers((prev) => [newTrailer, ...prev]);
    cloudUpsert("trailers", trailerToRow(newTrailer));
  };

  const updateTrailer = (id: string, updated: Partial<Trailer>) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== id) return tr;
        const newTr = { ...tr, ...updated };
        cloudUpsert("trailers", trailerToRow(newTr));
        return newTr;
      })
    );

    // If assignedTruckId is being set or changed, uncouple any other trailer coupled to that truck
    if ("assignedTruckId" in updated) {
      const newTruckId = updated.assignedTruckId || null;
      if (newTruckId) {
        setTrailers((prevTrailers) =>
          prevTrailers.map((tr) => {
            if (tr.id !== id && tr.assignedTruckId === newTruckId) {
              const uncoupled: Trailer = { ...tr, assignedTruckId: null };
              cloudUpsert("trailers", trailerToRow(uncoupled));
              return uncoupled;
            }
            return tr;
          })
        );
      }
    }
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
        const updatedTrailer: Trailer = {
          ...tr,
          documents: {
            ...tr.documents,
            [key]: newCurrentDoc,
          },
        };
        cloudUpsert("trailers", trailerToRow(updatedTrailer));
        return updatedTrailer;
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

        let updatedTrailer: Trailer;
        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          updatedTrailer = {
            ...tr,
            documents: {
              ...tr.documents,
              [key]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        } else {
          const remainingHistory = currentDoc.history || [];
          if (remainingHistory.length > 0) {
            const [nextCurrent, ...restHistory] = remainingHistory;
            updatedTrailer = {
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
          } else {
            updatedTrailer = {
              ...tr,
              documents: {
                ...tr.documents,
                [key]: null,
              },
            };
          }
        }
        cloudUpsert("trailers", trailerToRow(updatedTrailer));
        return updatedTrailer;
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
        const updatedTrailer: Trailer = {
          ...tr,
          customDocuments: [document, ...customDocs],
        };
        cloudUpsert("trailers", trailerToRow(updatedTrailer));
        return updatedTrailer;
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
        const updatedTrailer: Trailer = {
          ...tr,
          customDocuments: (tr.customDocuments || []).filter(
            (d) => d.id !== documentId
          ),
        };
        cloudUpsert("trailers", trailerToRow(updatedTrailer));
        return updatedTrailer;
      })
    );
  };

  const toggleTrailerDocumentSkip = (trailerId: string, documentKey: string) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        const currentSkipped = tr.skippedDocuments || [];
        const isAlreadySkipped = currentSkipped.includes(documentKey);
        const updatedTrailer: Trailer = {
          ...tr,
          skippedDocuments: isAlreadySkipped
            ? currentSkipped.filter((k) => k !== documentKey)
            : [...currentSkipped, documentKey],
        };
        cloudUpsert("trailers", trailerToRow(updatedTrailer));
        return updatedTrailer;
      })
    );
  };

  // Driver Handlers
  const addDriver = (data: Omit<Driver, "id" | "documents">) => {
    const newDriverId = `driver-${Date.now()}`;
    const newDriver: Driver = {
      ...data,
      id: newDriverId,
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
    cloudUpsert("drivers", driverToRow(newDriver));

    // Interlink: If new driver is assigned to a truck, update truck's assignedDriverId
    if (data.assignedTruckId) {
      setTrucks((prev) =>
        prev.map((t) => {
          if (t.id === data.assignedTruckId) {
            const updatedT: Truck = { ...t, assignedDriverId: newDriverId };
            cloudUpsert("trucks", truckToRow(updatedT));
            return updatedT;
          }
          return t;
        })
      );
    }
  };

  const updateDriver = (id: string, updated: Partial<Driver>) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const newD = { ...d, ...updated };
        cloudUpsert("drivers", driverToRow(newD));
        return newD;
      })
    );

    // Interlink: If assignedTruckId changed
    if ("assignedTruckId" in updated) {
      const newTruckId = updated.assignedTruckId || null;
      setTrucks((prevTrucks) =>
        prevTrucks.map((t) => {
          // If this truck is the newly assigned truck
          if (newTruckId && t.id === newTruckId) {
            if (t.assignedDriverId !== id) {
              const updatedT: Truck = { ...t, assignedDriverId: id };
              cloudUpsert("trucks", truckToRow(updatedT));
              return updatedT;
            }
            return t;
          }
          // If this truck was previously assigned to this driver, but is no longer
          if (t.assignedDriverId === id && t.id !== newTruckId) {
            const unlinkedT: Truck = { ...t, assignedDriverId: null };
            cloudUpsert("trucks", truckToRow(unlinkedT));
            return unlinkedT;
          }
          return t;
        })
      );

      // Also clean up any other drivers if newTruckId was previously assigned to them
      if (newTruckId) {
        setDrivers((prevDrivers) =>
          prevDrivers.map((d) => {
            if (d.id !== id && d.assignedTruckId === newTruckId) {
              const unlinkedD: Driver = { ...d, assignedTruckId: null };
              cloudUpsert("drivers", driverToRow(unlinkedD));
              return unlinkedD;
            }
            return d;
          })
        );
      }
    }
  };

  const deleteDriver = (id: string) => {
    setDrivers((prev) => prev.filter((d) => d.id !== id));
    cloudDelete("drivers", id);

    // Interlink: Unlink any trucks assigned to this driver
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.assignedDriverId === id) {
          const unlinkedT: Truck = { ...t, assignedDriverId: null };
          cloudUpsert("trucks", truckToRow(unlinkedT));
          return unlinkedT;
        }
        return t;
      })
    );
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
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            [categoryKey]: newCurrentDoc,
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
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

        let updatedDriver: Driver;
        if (historyDocId) {
          const updatedHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          updatedDriver = {
            ...d,
            documents: {
              ...d.documents,
              [categoryKey]: {
                ...currentDoc,
                history: updatedHistory,
              },
            },
          };
        } else {
          const remainingHistory = currentDoc.history || [];
          if (remainingHistory.length > 0) {
            const [nextCurrent, ...restHistory] = remainingHistory;
            updatedDriver = {
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
          } else {
            updatedDriver = {
              ...d,
              documents: {
                ...d.documents,
                [categoryKey]: null,
              },
            };
          }
        }
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
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
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugTestResults: [document, ...(d.documents.drugTestResults || [])],
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
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
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugTestResults: (d.documents.drugTestResults || []).filter(
              (doc) => doc.id !== documentId
            ),
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const addDriverCustodyForm = (
    driverId: string,
    document: FleetDocument
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugCustodyForm: document, // Keep most recent as primary drugCustodyForm as well
            custodyForms: [document, ...(d.documents.custodyForms || [])],
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const removeDriverCustodyForm = (
    driverId: string,
    documentId: string
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const filtered = (d.documents.custodyForms || []).filter(
          (doc) => doc.id !== documentId
        );
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugCustodyForm: filtered.length > 0 ? filtered[0] : null,
            custodyForms: filtered,
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const addDriverEPassport = (
    driverId: string,
    document: FleetDocument
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugPassport: document, // Keep most recent as primary drugPassport as well
            ePassports: [document, ...(d.documents.ePassports || [])],
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const removeDriverEPassport = (
    driverId: string,
    documentId: string
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const filtered = (d.documents.ePassports || []).filter(
          (doc) => doc.id !== documentId
        );
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            drugPassport: filtered.length > 0 ? filtered[0] : null,
            ePassports: filtered,
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const addDriverDotRecord = (driverId: string, document: FleetDocument) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            dotRecords: [document, ...(d.documents.dotRecords || [])],
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const removeDriverDotRecord = (driverId: string, documentId: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            dotRecords: (d.documents.dotRecords || []).filter(
              (doc) => doc.id !== documentId
            ),
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const updateDriverApplicationLink = (driverId: string, link: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const updatedDriver: Driver = {
          ...d,
          documents: {
            ...d.documents,
            applicationLink: link,
          },
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  const toggleDriverDocumentSkip = (driverId: string, documentKey: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const currentSkipped = d.skippedDocuments || [];
        const isAlreadySkipped = currentSkipped.includes(documentKey);
        const updatedDriver: Driver = {
          ...d,
          skippedDocuments: isAlreadySkipped
            ? currentSkipped.filter((k) => k !== documentKey)
            : [...currentSkipped, documentKey],
        };
        cloudUpsert("drivers", driverToRow(updatedDriver));
        return updatedDriver;
      })
    );
  };

  // Applicant Handlers
  const addApplicant = (applicant: Omit<Applicant, "id" | "documents">) => {
    const newApplicant: Applicant = {
      ...applicant,
      id: `app-${Date.now()}`,
      appliedDate: applicant.appliedDate || new Date().toISOString().split("T")[0],
      documents: {
        mvr: null,
        pspAuth: null,
        pspReport: null,
      },
    };
    setApplicants((prev) => [newApplicant, ...prev]);
    cloudUpsert("applicants", applicantToRow(newApplicant));
  };

  const updateApplicant = (id: string, patch: Partial<Applicant>) => {
    setApplicants((prev) =>
      prev.map((app) => {
        if (app.id !== id) return app;
        const updated = { ...app, ...patch };
        cloudUpsert("applicants", applicantToRow(updated));
        return updated;
      })
    );
  };

  const deleteApplicant = (id: string) => {
    setApplicants((prev) => prev.filter((app) => app.id !== id));
    cloudDelete("applicants", id);
  };

  const uploadApplicantDocument = (
    applicantId: string,
    key: ApplicantDocumentKey,
    document: FleetDocument
  ) => {
    setApplicants((prev) =>
      prev.map((app) => {
        if (app.id !== applicantId) return app;
        const currentDoc = app.documents[key];
        const newDoc: FleetDocument = {
          ...document,
          isCurrent: true,
          status: "current",
        };

        if (currentDoc) {
          const existingHistory = currentDoc.history || [];
          const { history: _, ...archiveCopy } = currentDoc;
          newDoc.history = [
            { ...archiveCopy, isCurrent: false, status: "archived" },
            ...existingHistory,
          ];
        }

        const updated: Applicant = {
          ...app,
          documents: {
            ...app.documents,
            [key]: newDoc,
          },
        };
        cloudUpsert("applicants", applicantToRow(updated));
        return updated;
      })
    );
  };

  const removeApplicantDocument = (
    applicantId: string,
    key: ApplicantDocumentKey,
    historyDocId?: string
  ) => {
    setApplicants((prev) =>
      prev.map((app) => {
        if (app.id !== applicantId) return app;
        const currentDoc = app.documents[key];
        if (!currentDoc) return app;

        let updated: Applicant;
        if (historyDocId) {
          const filteredHistory = (currentDoc.history || []).filter((h) => h.id !== historyDocId);
          updated = {
            ...app,
            documents: {
              ...app.documents,
              [key]: {
                ...currentDoc,
                history: filteredHistory,
              },
            },
          };
        } else {
          // deleting current active doc; promote previous if available
          const [nextCurrent, ...restHistory] = currentDoc.history || [];
          if (nextCurrent) {
            updated = {
              ...app,
              documents: {
                ...app.documents,
                [key]: {
                  ...nextCurrent,
                  isCurrent: true,
                  status: "current",
                  history: restHistory,
                },
              },
            };
          } else {
            updated = {
              ...app,
              documents: {
                ...app.documents,
                [key]: null,
              },
            };
          }
        }
        cloudUpsert("applicants", applicantToRow(updated));
        return updated;
      })
    );
  };

  const convertApplicantToDriver = (applicantId: string) => {
    const applicant = applicants.find((a) => a.id === applicantId);
    if (!applicant) return;

    const newDriver: Driver = {
      id: `driver-${Date.now()}`,
      firstName: applicant.firstName,
      middleName: applicant.middleName || "",
      lastName: applicant.lastName,
      dateOfBirth: applicant.dateOfBirth,
      email: applicant.email || "",
      phone: applicant.phone,
      state: applicant.state,
      licenseNumber: applicant.licenseNumber,
      status: "Active",
      assignedTruckId: null,
      bankInfo: {
        accountNumber: "",
        routingNumber: "",
        bankInfo: "",
      },
      clearingHouseQuery: false,
      hireDate: new Date().toISOString().split("T")[0],
      notes: applicant.notes ? `Promoted from applicant on ${new Date().toLocaleDateString()}. Notes: ${applicant.notes}` : "",
      documents: {
        cdl: null,
        medCard: null,
        mvr: applicant.documents.mvr || null,
        pspAuth: applicant.documents.pspAuth || null,
        pspReport: applicant.documents.pspReport || null,
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
    };

    // Add driver
    setDrivers((prev) => [newDriver, ...prev]);
    cloudUpsert("drivers", driverToRow(newDriver));

    // Remove or mark applicant as Hired
    setApplicants((prev) => prev.filter((a) => a.id !== applicantId));
    cloudDelete("applicants", applicantId);
  };

  // Maintenance Handlers
  const addMaintenanceRecord = (record: Omit<MaintenanceRecord, "id">) => {
    const newRecord: MaintenanceRecord = {
      ...record,
      id: `maint-${Date.now()}`,
    };
    setMaintenanceRecords((prev) => [newRecord, ...prev]);
    cloudUpsert("maintenance_records", maintenanceToRow(newRecord));
  };

  const updateMaintenanceRecord = (
    id: string,
    updated: Partial<MaintenanceRecord>
  ) => {
    setMaintenanceRecords((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newM = { ...m, ...updated };
        cloudUpsert("maintenance_records", maintenanceToRow(newM));
        return newM;
      })
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
    cloudUpsert("shops", shopToRow(newShop));
  };

  const updateShop = (id: string, updated: Partial<TruckShop>) => {
    setShops((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newS = { ...s, ...updated };
        cloudUpsert("shops", shopToRow(newS));
        return newS;
      })
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
    cloudUpsert("trucks", newTrucks.map(truckToRow));
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
    cloudUpsert("trailers", newTrailers.map(trailerToRow));
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
    cloudUpsert("drivers", newDrivers.map(driverToRow));
  };

  const bulkAddShops = (items: Omit<TruckShop, "id">[]) => {
    const timestamp = Date.now();
    const newShops: TruckShop[] = items.map((data, idx) => ({
      ...data,
      id: `shop-${timestamp}-${idx}`,
    }));
    setShops((prev) => [...newShops, ...prev]);
    cloudUpsert("shops", newShops.map(shopToRow));
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
    cloudUpsert("user_profiles", userToRow(user));
  };

  const updateUser = (id: string, updatedFields: Partial<AppUser>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newU = { ...u, ...updatedFields };
        cloudUpsert("user_profiles", userToRow(newU));
        return newU;
      })
    );
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    cloudDelete("user_profiles", id);
  };

  const toggleUserStatus = (id: string, status: UserStatus) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        const newU = { ...u, status };
        cloudUpsert("user_profiles", userToRow(newU));
        return newU;
      })
    );
  };

  const resetUsers = () => {
    setUsers(initialUsers);
    localStorage.setItem("zdunje_users", JSON.stringify(initialUsers));
    cloudUpsert("user_profiles", initialUsers.map(userToRow));
  };

  // Payment & Calendar Reminders Handlers
  const addReminder = (data: Omit<PaymentReminder, "id" | "createdAt">) => {
    const newReminder: PaymentReminder = {
      ...data,
      id: `rem_${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setReminders((prev) => [newReminder, ...prev]);
    cloudUpsert("payment_reminders", reminderToRow(newReminder));
  };

  const updateReminder = (id: string, patch: Partial<PaymentReminder>) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newR = { ...r, ...patch };
        cloudUpsert("payment_reminders", reminderToRow(newR));
        return newR;
      })
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
        const updated: PaymentReminder = {
          ...r,
          status: newStatus,
          completedAt: newStatus === "Completed" ? new Date().toISOString() : null,
        };
        cloudUpsert("payment_reminders", reminderToRow(updated));
        return updated;
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
        applicants,
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
        toggleTruckDocumentSkip,
        addTrailer,
        updateTrailer,
        deleteTrailer,
        uploadTrailerDocument,
        removeTrailerDocument,
        addTrailerCustomDocument,
        removeTrailerCustomDocument,
        toggleTrailerDocumentSkip,
        addDriver,
        updateDriver,
        deleteDriver,
        uploadDriverDocument,
        removeDriverDocument,
        addDriverDrugTestResult,
        removeDriverDrugTestResult,
        addDriverCustodyForm,
        removeDriverCustodyForm,
        addDriverEPassport,
        removeDriverEPassport,
        addDriverDotRecord,
        removeDriverDotRecord,
        updateDriverApplicationLink,
        toggleDriverDocumentSkip,
        addApplicant,
        updateApplicant,
        deleteApplicant,
        uploadApplicantDocument,
        removeApplicantDocument,
        convertApplicantToDriver,
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
