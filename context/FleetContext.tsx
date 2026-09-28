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
} from "@/types/fleet";
import {
  initialTrucks,
  initialTrailers,
  initialDrivers,
  initialShops,
  initialMaintenanceRecords,
  initialUsers,
} from "@/lib/mockData";

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
  removeTruckDocument: (truckId: string, key: TruckDocumentKey) => void;

  // Trailers
  addTrailer: (trailer: Omit<Trailer, "id" | "documents">) => void;
  updateTrailer: (id: string, trailer: Partial<Trailer>) => void;
  deleteTrailer: (id: string) => void;
  uploadTrailerDocument: (
    trailerId: string,
    key: TrailerDocumentKey,
    document: FleetDocument
  ) => void;
  removeTrailerDocument: (trailerId: string, key: TrailerDocumentKey) => void;

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
    >
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

  // Reset
  resetDataToDemo: () => void;
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
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage or initialize with mock data
  useEffect(() => {
    try {
      const savedTrucks = localStorage.getItem("zdunje_trucks");
      const savedTrailers = localStorage.getItem("zdunje_trailers");
      const savedDrivers = localStorage.getItem("zdunje_drivers");
      const savedShops = localStorage.getItem("zdunje_shops");
      const savedMaint = localStorage.getItem("zdunje_maintenance");
      const savedUsers = localStorage.getItem("zdunje_users");

      if (savedTrucks) setTrucks(JSON.parse(savedTrucks));
      else setTrucks(initialTrucks);

      if (savedTrailers) setTrailers(JSON.parse(savedTrailers));
      else setTrailers(initialTrailers);

      if (savedDrivers) {
        const parsed = JSON.parse(savedDrivers);
        setDrivers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parsed.map((d: any) => ({
            ...d,
            skippedDocuments: d.skippedDocuments || [],
            documents: {
              ...d.documents,
              onboardingDoc: d.documents?.onboardingDoc || null,
              leaseAgreement: d.documents?.leaseAgreement || null,
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

      if (savedUsers) setUsers(JSON.parse(savedUsers));
      else setUsers(initialUsers);
    } catch {
      setTrucks(initialTrucks);
      setTrailers(initialTrailers);
      setDrivers(initialDrivers);
      setShops(initialShops);
      setMaintenanceRecords(initialMaintenanceRecords);
      setUsers(initialUsers);
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
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  }, [trucks, trailers, drivers, shops, maintenanceRecords, users, isLoaded]);

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
  };

  const uploadTruckDocument = (
    truckId: string,
    key: TruckDocumentKey,
    document: FleetDocument
  ) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
        return {
          ...t,
          documents: {
            ...t.documents,
            [key]: document,
          },
        };
      })
    );
  };

  const removeTruckDocument = (truckId: string, key: TruckDocumentKey) => {
    setTrucks((prev) =>
      prev.map((t) => {
        if (t.id !== truckId) return t;
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
  };

  const uploadTrailerDocument = (
    trailerId: string,
    key: TrailerDocumentKey,
    document: FleetDocument
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
        return {
          ...tr,
          documents: {
            ...tr.documents,
            [key]: document,
          },
        };
      })
    );
  };

  const removeTrailerDocument = (
    trailerId: string,
    key: TrailerDocumentKey
  ) => {
    setTrailers((prev) =>
      prev.map((tr) => {
        if (tr.id !== trailerId) return tr;
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
        return {
          ...d,
          documents: {
            ...d.documents,
            [categoryKey]: document,
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
    >
  ) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
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

  // Reset to clean slate (all data cleared)
  const resetDataToDemo = () => {
    setTrucks([]);
    setTrailers([]);
    setDrivers([]);
    setShops([]);
    setMaintenanceRecords([]);
    localStorage.setItem("zdunje_trucks", JSON.stringify([]));
    localStorage.setItem("zdunje_trailers", JSON.stringify([]));
    localStorage.setItem("zdunje_drivers", JSON.stringify([]));
    localStorage.setItem("zdunje_shops", JSON.stringify([]));
    localStorage.setItem("zdunje_maintenance", JSON.stringify([]));
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
        addTruck,
        updateTruck,
        deleteTruck,
        uploadTruckDocument,
        removeTruckDocument,
        addTrailer,
        updateTrailer,
        deleteTrailer,
        uploadTrailerDocument,
        removeTrailerDocument,
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
        resetDataToDemo,
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
