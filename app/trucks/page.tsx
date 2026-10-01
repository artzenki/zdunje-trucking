"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  Truck as TruckType,
  TruckDocumentKey,
  OwnershipType,
  EquipmentStatus,
  FleetDocument,
} from "@/types/fleet";
import {
  Truck,
  Plus,
  Search,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Edit,
  CheckCircle,
  Shield,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  History,
  User,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { CustomDocumentUploadModal } from "@/components/CustomDocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";
import { uploadFileToSupabaseStorage } from "@/lib/documentStorage";

const DOCUMENT_DEFINITIONS: {
  key: TruckDocumentKey;
  label: string;
  hasExpiration: boolean;
  description: string;
}[] = [
  {
    key: "title",
    label: "Title",
    hasExpiration: false,
    description: "Certificate of Title / Ownership Record",
  },
  {
    key: "tax2290",
    label: "Form 2290",
    hasExpiration: true,
    description: "Heavy Highway Vehicle Use Tax Schedule 1",
  },
  {
    key: "dotInspection",
    label: "Annual DOT Inspection",
    hasExpiration: true,
    description: "Annual 396.17 periodic safety brake & chassis inspection",
  },
  {
    key: "insurance",
    label: "Bobtail / Physical Damage",
    hasExpiration: true,
    description: "Insurance Certificate & Non-Trucking Liability",
  },
  {
    key: "cabCard",
    label: "CAB Card",
    hasExpiration: true,
    description: "IRP Apportioned Cab Card Registration",
  },
  {
    key: "leaseAgreement",
    label: "Lease Agreement",
    hasExpiration: false,
    description: "Internal company equipment lease / contractor agreement",
  },
];

function TrucksContent() {
  const searchParams = useSearchParams();
  const {
    trucks,
    drivers,
    addTruck,
    updateTruck,
    deleteTruck,
    uploadTruckDocument,
    removeTruckDocument,
    addTruckCustomDocument,
    removeTruckCustomDocument,
    toggleTruckDocumentSkip,
  } = useFleet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [showSkippedDocs, setShowSkippedDocs] = useState(false);
  const [dragOverTruckDocKey, setDragOverTruckDocKey] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);
  const [uploadingDocKey, setUploadingDocKey] =
    useState<TruckDocumentKey | null>(null);
  const [droppedFileToUpload, setDroppedFileToUpload] = useState<File | null>(null);
  const [isUploadCustomDocOpen, setIsUploadCustomDocOpen] = useState(false);
  const [expandedHistoryKey, setExpandedHistoryKey] = useState<string | null>(null);

  // Driver search dropdown state
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [driverSearch, setDriverSearch] = useState("");
  const driverDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    unitNumber: "",
    make: "Freightliner",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    plateNumber: "",
    isTemporaryPlate: false,
    ownershipType: "Company owned" as OwnershipType,
    truckValue: 125000,
    bestPassSerialNumber: "",
    isBestPassLinked: true,
    assignedDriverId: "",
    status: "Active" as EquipmentStatus,
    currentMileage: 120000,
    notes: "",
  });

  // URL Query handling
  useEffect(() => {
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (id && trucks.some((t) => t.id === id)) {
      setSelectedTruckId(id);
    } else if (trucks.length > 0 && !selectedTruckId) {
      setSelectedTruckId(trucks[0].id);
    }
    if (action === "new") {
      openAddModal();
    }
  }, [searchParams, trucks, selectedTruckId]);

  const selectedTruck = useMemo(
    () => trucks.find((t) => t.id === selectedTruckId) || (trucks.length > 0 ? trucks[0] : null),
    [trucks, selectedTruckId]
  );

  const filteredTrucks = useMemo(() => {
    return trucks.filter((t) => {
      const matchSearch =
        t.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.vin.toLowerCase().includes(search.toLowerCase()) ||
        t.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
        t.make.toLowerCase().includes(search.toLowerCase()) ||
        t.model.toLowerCase().includes(search.toLowerCase()) ||
        t.bestPassSerialNumber.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || t.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [trucks, search, statusFilter]);

  // Filtered & alphabetically sorted drivers for searchable dropdown in add/edit modal
  const filteredDriversForSelect = useMemo(() => {
    const q = driverSearch.toLowerCase().trim();
    const list = !q
      ? [...drivers]
      : drivers.filter((d) => {
          const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
          const state = (d.state || "").toLowerCase();
          const license = (d.licenseNumber || "").toLowerCase();
          const phone = (d.phone || "").toLowerCase();
          return (
            fullName.includes(q) ||
            state.includes(q) ||
            license.includes(q) ||
            phone.includes(q)
          );
        });

    return list.sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [drivers, driverSearch]);

  // Close driver dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        driverDropdownRef.current &&
        !driverDropdownRef.current.contains(e.target as Node)
      ) {
        setIsDriverDropdownOpen(false);
      }
    };
    if (isDriverDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDriverDropdownOpen]);

  const openAddModal = () => {
    setIsDriverDropdownOpen(false);
    setDriverSearch("");
    setFormData({
      unitNumber: "",
      make: "Freightliner",
      model: "Cascadia",
      year: new Date().getFullYear(),
      vin: "",
      plateNumber: "",
      isTemporaryPlate: false,
      ownershipType: "Company owned",
      truckValue: 135000,
      bestPassSerialNumber: "",
      isBestPassLinked: false,
      assignedDriverId: "",
      status: "Active",
      currentMileage: 0,
      notes: "",
    });
    setEditingTruck(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (truck: TruckType) => {
    setIsDriverDropdownOpen(false);
    setDriverSearch("");
    setEditingTruck(truck);
    setFormData({
      unitNumber: truck.unitNumber,
      make: truck.make,
      model: truck.model,
      year: truck.year,
      vin: truck.vin,
      plateNumber: truck.plateNumber,
      isTemporaryPlate: truck.isTemporaryPlate,
      ownershipType: truck.ownershipType,
      truckValue: truck.truckValue,
      bestPassSerialNumber: truck.bestPassSerialNumber,
      isBestPassLinked: truck.isBestPassLinked,
      assignedDriverId: truck.assignedDriverId || "",
      status: truck.status,
      currentMileage: truck.currentMileage,
      notes: truck.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitNumber.trim()) {
      alert("Please enter a Unit Number");
      return;
    }

    if (editingTruck) {
      updateTruck(editingTruck.id, {
        ...formData,
        assignedDriverId: formData.assignedDriverId || null,
      });
    } else {
      addTruck({
        ...formData,
        assignedDriverId: formData.assignedDriverId || null,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, unitNumber: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete Unit #${unitNumber}? All attached documents will be removed.`
      )
    ) {
      deleteTruck(id);
      if (selectedTruckId === id) {
        const remaining = trucks.filter((t) => t.id !== id);
        if (remaining.length > 0) setSelectedTruckId(remaining[0].id);
      }
    }
  };

  const activeDocDef = DOCUMENT_DEFINITIONS.find(
    (d) => d.key === uploadingDocKey
  );

  const handleDirectDropTruckDoc = async (
    key: TruckDocumentKey,
    categoryName: string,
    file: File
  ) => {
    if (!selectedTruck) return;
    const docDef = DOCUMENT_DEFINITIONS.find((d) => d.key === key);
    if (docDef?.hasExpiration) {
      setDroppedFileToUpload(file);
      setUploadingDocKey(key);
      return;
    }

    try {
      const uploadRes = await uploadFileToSupabaseStorage(
        file,
        file.name,
        "trucks"
      );
      const newDoc: FleetDocument = {
        id: `truck-doc-${Date.now()}`,
        name: file.name,
        category: categoryName,
        fileType: file.type || "application/pdf",
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: uploadRes.fileUrl,
        isCurrent: true,
        status: "current",
      };
      uploadTruckDocument(selectedTruck.id, key, newDoc);
    } catch (err) {
      console.error("Direct drop failed", err);
      alert("Failed to process dropped file.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Trucks & Power Units
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
              {trucks.length} Units
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage power equipment, BestPass transponders, driver links, and mandatory compliance documents.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Truck</span>
        </button>
      </div>

      {/* Main Grid: Left List (35%) & Right Detailed Workspace (65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Truck List & Filter */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search unit #, VIN, plate..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({trucks.length})
              </button>
              <button
                onClick={() => setStatusFilter("Active")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "Active"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("Inactive")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "Inactive"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Inactive
              </button>
              <button
                onClick={() => setStatusFilter("In Shop")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "In Shop"
                    ? "bg-amber-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                In Shop
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100 max-h-[750px] overflow-y-auto">
            {filteredTrucks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No trucks match your criteria.
              </div>
            ) : (
              filteredTrucks.map((truck) => {
                const isSelected = selectedTruck?.id === truck.id;
                const assignedDriver = drivers.find(
                  (d) => d.id === truck.assignedDriverId
                );

                // Count uploaded or skipped docs
                const uploadedCount = Object.values(truck.documents).filter(Boolean).length;
                const skippedCount = (truck.skippedDocuments || []).filter(
                  (key) => !truck.documents[key as TruckDocumentKey]
                ).length;
                const totalCompliantDocs = uploadedCount + skippedCount;

                return (
                  <button
                    key={truck.id}
                    onClick={() => setSelectedTruckId(truck.id)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-blue-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          Unit #{truck.unitNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            truck.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : truck.status === "Inactive"
                              ? "bg-slate-200 text-slate-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {truck.status}
                        </span>
                        {truck.isTemporaryPlate && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                            TEMP
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5">
                        {truck.year} {truck.make} {truck.model}
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2 font-mono">
                        <span>Plate: {truck.plateNumber}</span>
                        <span>•</span>
                        <span>{truck.ownershipType}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          Driver:{" "}
                          <strong className="text-slate-700">
                            {assignedDriver
                              ? `${assignedDriver.firstName} ${assignedDriver.lastName}`
                              : "Unassigned"}
                          </strong>
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold ${
                            totalCompliantDocs >= 6
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {totalCompliantDocs}/6 Docs
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                        isSelected ? "text-blue-600 translate-x-1" : "text-slate-300"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Truck Detail & Document Manager */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTruck ? (
            <>
              {/* Truck Overview Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                            Unit #{selectedTruck.unitNumber}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              selectedTruck.status === "Active"
                                ? "bg-emerald-100 text-emerald-800"
                                : selectedTruck.status === "Inactive"
                                ? "bg-slate-200 text-slate-700"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {selectedTruck.status}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                            {selectedTruck.ownershipType} ($
                            {selectedTruck.truckValue.toLocaleString()})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedTruck.year} {selectedTruck.make} {selectedTruck.model} • Odometer:{" "}
                          <strong className="text-slate-700">
                            {selectedTruck.currentMileage.toLocaleString()} miles
                          </strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() =>
                        updateTruck(selectedTruck.id, {
                          status:
                            selectedTruck.status === "Inactive"
                              ? "Active"
                              : "Inactive",
                        })
                      }
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        selectedTruck.status === "Inactive"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                      }`}
                      title={
                        selectedTruck.status === "Inactive"
                          ? "Set truck to Active"
                          : "Set truck to Inactive"
                      }
                    >
                      <span>
                        {selectedTruck.status === "Inactive"
                          ? "Activate Unit"
                          : "Mark as Inactive"}
                      </span>
                    </button>
                    <button
                      onClick={() => openEditModal(selectedTruck)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Truck</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(
                          selectedTruck.id,
                          selectedTruck.unitNumber
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Truck"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Key Spec Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      License Plate
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                      {selectedTruck.plateNumber}
                    </span>
                    {selectedTruck.isTemporaryPlate && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                        Temporary Permit
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      VIN
                    </span>
                    <span className="text-xs font-bold text-slate-800 font-mono mt-1 block truncate" title={selectedTruck.vin}>
                      {selectedTruck.vin}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      BestPass Toll Device
                    </span>
                    <div className="mt-0.5 flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-slate-800 font-mono">
                        {selectedTruck.bestPassSerialNumber || "Not Assigned"}
                      </span>
                      {selectedTruck.isBestPassLinked ? (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">
                          Linked
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                          Unlinked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Assigned Driver
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">
                      {drivers.find((d) => d.id === selectedTruck.assignedDriverId)
                        ? `${
                            drivers.find(
                              (d) => d.id === selectedTruck.assignedDriverId
                            )?.firstName
                          } ${
                            drivers.find(
                              (d) => d.id === selectedTruck.assignedDriverId
                            )?.lastName
                          }`
                        : "No Driver Assigned"}
                    </span>
                  </div>
                </div>

                {selectedTruck.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <strong className="text-slate-700">Dispatcher & Safety Notes:</strong>{" "}
                    {selectedTruck.notes}
                  </div>
                )}
              </div>

              {/* Truck Documents Section */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span>Unit #{selectedTruck.unitNumber} Documents Vault</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required compliance papers (Title, 2290, Annual DOT, CabCard, Insurance, Lease).
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {(selectedTruck.skippedDocuments?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSkippedDocs(!showSkippedDocs)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                          showSkippedDocs
                            ? "bg-slate-800 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Toggle visibility of exempt/skipped document slots"
                      >
                        <span>{showSkippedDocs ? "Hide Skipped" : `Show Skipped (${selectedTruck.skippedDocuments?.length})`}</span>
                      </button>
                    )}
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {DOCUMENT_DEFINITIONS.filter(
                        (def) =>
                          !!selectedTruck.documents?.[def.key] ||
                          selectedTruck.skippedDocuments?.includes(def.key)
                      ).length} / {DOCUMENT_DEFINITIONS.length} Compliant
                    </span>
                  </div>
                </div>

                {/* Mandatory Compliance Documents List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {DOCUMENT_DEFINITIONS.map((def) => {
                    const doc = selectedTruck.documents?.[def.key];
                    const isSkipped = selectedTruck.skippedDocuments?.includes(def.key);
                    const historyDocs = doc?.history || [];
                    const isHistoryOpen = expandedHistoryKey === def.key;
                    const isDraggingThis = dragOverTruckDocKey === def.key;

                    if (!showSkippedDocs && isSkipped && !doc) {
                      return null;
                    }

                    return (
                      <div
                        key={def.key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTruckDocKey(def.key);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTruckDocKey(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverTruckDocKey(null);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleDirectDropTruckDoc(def.key, def.label, e.dataTransfer.files[0]);
                          }
                        }}
                        className={`p-4 flex flex-col gap-3 transition-all border-b last:border-b-0 border-slate-100 relative ${
                          isDraggingThis
                            ? "bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20"
                            : isSkipped && !doc
                            ? "bg-slate-50/60 opacity-80"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        {/* Drag Drop Overlay */}
                        {isDraggingThis && (
                          <div className="absolute inset-0 z-10 bg-blue-600/90 rounded-lg flex flex-col items-center justify-center text-white backdrop-blur-xs pointer-events-none animate-in fade-in duration-100">
                            <Upload className="w-6 h-6 mb-1 animate-bounce" />
                            <p className="font-bold text-xs">Drop {def.label} file here to upload</p>
                            <p className="text-[10px] text-blue-100">Saved as CURRENT FILE</p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: Document Info */}
                          <div className="flex items-start space-x-3 min-w-0">
                            <div
                              className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                                doc
                                  ? "bg-blue-50 text-blue-600"
                                  : isSkipped
                                  ? "bg-slate-200 text-slate-500"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-2 flex-wrap">
                                <h4 className="font-semibold text-slate-900 text-sm">
                                  {def.label}
                                </h4>
                                {doc ? (
                                  <div className="flex items-center space-x-1.5">
                                    {historyDocs.length > 0 && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200 flex items-center space-x-0.5">
                                        <History className="w-2.5 h-2.5" />
                                        <span>{historyDocs.length} archived</span>
                                      </span>
                                    )}
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full inline-flex items-center shadow-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      <span>CURRENT FILE</span>
                                    </span>
                                  </div>
                                ) : isSkipped ? (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full">
                                    ⚪ Not Applicable
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full">
                                    Missing
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {def.description}
                              </p>
                              {doc && (
                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                                  <span className="font-mono text-slate-700 truncate max-w-xs font-medium" title={doc.name}>
                                    {doc.name}
                                  </span>
                                  <span>•</span>
                                  <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                  <span>•</span>
                                  <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                  {doc.expirationDate && (
                                    <>
                                      <span>•</span>
                                      <span className="font-semibold text-blue-700">
                                        Expires: {doc.expirationDate}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                              {!doc && isSkipped && (
                                <p className="text-[11px] text-slate-400 italic mt-1">
                                  Marked as Not Applicable for this unit (100% Compliant).
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                            {doc ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc(doc)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadDocument(doc)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUploadingDocKey(def.key)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                  title="Upload new version and move current to expired history"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>New Version</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Remove current ${def.label} from Unit #${selectedTruck.unitNumber}?`
                                      )
                                    ) {
                                      removeTruckDocument(
                                        selectedTruck.id,
                                        def.key
                                      );
                                    }
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove current file"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : isSkipped ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => toggleTruckDocumentSkip(selectedTruck.id, def.key)}
                                  className="p-0 text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors whitespace-nowrap"
                                  title="Mark document as required"
                                >
                                  Mark Required
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setUploadingDocKey(def.key)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Upload Anyway</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setUploadingDocKey(def.key)}
                                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload or Drop {def.label}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleTruckDocumentSkip(selectedTruck.id, def.key)}
                                  className="p-0 text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors whitespace-nowrap"
                                  title="Mark this document as not applicable"
                                >
                                  Not Applicable
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expired / Archived files list */}
                        {historyDocs.length > 0 && (
                          <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
                            <button
                              type="button"
                              onClick={() => setExpandedHistoryKey(isHistoryOpen ? null : def.key)}
                              className="w-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100/80 flex items-center justify-between"
                            >
                              <span className="flex items-center space-x-1.5">
                                <History className="w-3.5 h-3.5 text-slate-500" />
                                <span>Expired / Historical Versions ({historyDocs.length})</span>
                              </span>
                              {isHistoryOpen ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                            {isHistoryOpen && (
                              <div className="p-2 space-y-1.5 bg-white border-t border-slate-200">
                                {historyDocs.map((histDoc, idx) => (
                                  <div
                                    key={histDoc.id || idx}
                                    className="p-2 rounded border border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                                          EXPIRED
                                        </span>
                                        <span className="font-semibold text-slate-800 truncate" title={histDoc.name}>
                                          {histDoc.name}
                                        </span>
                                      </div>
                                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                        <span>Uploaded: {new Date(histDoc.uploadedAt).toLocaleDateString()}</span>
                                        {histDoc.expirationDate && (
                                          <>
                                            <span>•</span>
                                            <span className="text-amber-700">Expired: {histDoc.expirationDate}</span>
                                          </>
                                        )}
                                        <span>•</span>
                                        <span>{(histDoc.fileSize / 1024).toFixed(0)} KB</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => setViewingDoc(histDoc)}
                                        className="p-1 text-slate-600 hover:text-blue-600"
                                        title="Preview"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => downloadDocument(histDoc)}
                                        className="p-1 text-slate-600 hover:text-blue-600"
                                        title="Download"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (window.confirm(`Delete archived file "${histDoc.name}"?`)) {
                                            removeTruckDocument(selectedTruck.id, def.key, histDoc.id);
                                          }
                                        }}
                                        className="p-1 text-slate-400 hover:text-red-600"
                                        title="Delete archive"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Additional / Other Documents Section */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-700" />
                        <span>Additional Documents & Paperwork</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload custom files, permits, lease addendums, cab inspection sheets, or receipts with custom names and descriptions.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsUploadCustomDocOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  {/* List of Custom Documents */}
                  {selectedTruck.customDocuments && selectedTruck.customDocuments.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                      {selectedTruck.customDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0 mt-0.5">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-semibold text-slate-900 text-sm truncate">
                                {doc.name}
                              </h5>
                              {(doc.description || doc.notes) && (
                                <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-line">
                                  {doc.description || doc.notes}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                                <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                {doc.expirationDate && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-blue-600">
                                      Expires: {doc.expirationDate}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 shrink-0 self-end md:self-center">
                            <button
                              onClick={() => setViewingDoc(doc)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => downloadDocument(doc)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete document "${doc.name}"?`)) {
                                  removeTruckCustomDocument(selectedTruck.id, doc.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-slate-300 rounded-xl text-center bg-slate-50/50">
                      <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-sm font-semibold text-slate-700">
                        No additional documents uploaded
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        Upload custom paperwork, state permits, lease addendums, or inspection forms with custom names and descriptions.
                      </p>
                      <button
                        onClick={() => setIsUploadCustomDocOpen(true)}
                        className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Upload First Document</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Truck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">
                No Truck Selected
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Select a truck from the list or add a new power unit.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Truck Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingTruck
                    ? `Edit Unit #${editingTruck.unitNumber}`
                    : "Add New Truck (Power Unit)"}
                </h3>
                <p className="text-xs text-slate-500">
                  Zdunje Trucking LLC Equipment Record
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="flex flex-col flex-1 overflow-hidden"
            >
              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Unit Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.unitNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, unitNumber: e.target.value })
                      }
                      placeholder="e.g. 108"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Make
                    </label>
                    <select
                      value={formData.make}
                      onChange={(e) =>
                        setFormData({ ...formData, make: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Freightliner">Freightliner</option>
                      <option value="Kenworth">Kenworth</option>
                      <option value="Peterbilt">Peterbilt</option>
                      <option value="Volvo">Volvo</option>
                      <option value="International">International</option>
                      <option value="Mack">Mack</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Model & Year
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            year: parseInt(e.target.value) || 2024,
                          })
                        }
                        className="w-24 h-10 px-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                        placeholder="e.g. Cascadia 126"
                        className="flex-1 h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      VIN (17 Characters)
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vin: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="1FUJGHDV8PL..."
                      className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      License Plate & Temp Check
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={formData.plateNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            plateNumber: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="e.g. P398102 or TEMP"
                        className="flex-1 h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <label className="flex items-center space-x-1.5 text-xs text-slate-700 whitespace-nowrap cursor-pointer bg-slate-50 px-3 h-10 border border-slate-200 rounded-lg select-none">
                        <input
                          type="checkbox"
                          checked={formData.isTemporaryPlate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isTemporaryPlate: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span>Temp Plate?</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Ownership & BestPass */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Ownership Type
                    </label>
                    <select
                      value={
                        formData.ownershipType === "Own"
                          ? "Company owned"
                          : formData.ownershipType === "Lease"
                          ? "Leased"
                          : formData.ownershipType
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ownershipType: e.target.value as OwnershipType,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="Owner Operator">Owner Operator</option>
                      <option value="Leased">Leased</option>
                      <option value="Company owned">Company owned</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Truck Value ($ USD)
                    </label>
                    <input
                      type="number"
                      value={formData.truckValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          truckValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="135000"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      BestPass Device Serial
                    </label>
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={formData.bestPassSerialNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            bestPassSerialNumber: e.target.value,
                          })
                        }
                        placeholder="e.g. BP-9938102"
                        className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <label className="flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.isBestPassLinked}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isBestPassLinked: e.target.checked,
                            })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>Active & Linked in BestPass</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Driver & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Searchable Driver Dropdown */}
                  <div className="relative" ref={driverDropdownRef}>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Assigned Driver
                    </label>
                    <div
                      onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                      className={`w-full h-10 px-3 border rounded-lg bg-white flex items-center justify-between cursor-pointer transition-colors ${
                        isDriverDropdownOpen
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <User className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm truncate">
                          {(() => {
                            const d = drivers.find((x) => x.id === formData.assignedDriverId);
                            if (d) {
                              return (
                                <span className="text-slate-900 font-medium">
                                  {d.firstName} {d.lastName}{" "}
                                  <span className="text-xs text-slate-400">
                                    ({d.state} CDL)
                                  </span>
                                </span>
                              );
                            }
                            return <span className="text-slate-400">-- Unassigned --</span>;
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 pl-1 shrink-0">
                        {formData.assignedDriverId && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormData({ ...formData, assignedDriverId: "" });
                            }}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
                            title="Unassign driver"
                          >
                            <X className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isDriverDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Dropdown Menu with integrated search */}
                    {isDriverDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
                        <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <input
                              type="text"
                              autoFocus
                              value={driverSearch}
                              onChange={(e) => setDriverSearch(e.target.value)}
                              placeholder="Search driver by name, state, phone..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                            />
                            {driverSearch && (
                              <button
                                type="button"
                                onClick={() => setDriverSearch("")}
                                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {/* Unassigned Option */}
                          <div
                            onClick={() => {
                              setFormData({ ...formData, assignedDriverId: "" });
                              setIsDriverDropdownOpen(false);
                            }}
                            className={`p-2.5 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
                              !formData.assignedDriverId
                                ? "bg-blue-50/70 text-blue-700 font-semibold"
                                : "text-slate-600"
                            }`}
                          >
                            <span className="italic">-- Unassigned --</span>
                            {!formData.assignedDriverId && (
                              <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                            )}
                          </div>

                          {/* Driver List */}
                          {filteredDriversForSelect.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No drivers found matching &quot;{driverSearch}&quot;
                            </div>
                          ) : (
                            filteredDriversForSelect.map((d) => {
                              const isSelected = formData.assignedDriverId === d.id;
                              return (
                                <div
                                  key={d.id}
                                  onClick={() => {
                                    setFormData({ ...formData, assignedDriverId: d.id });
                                    setIsDriverDropdownOpen(false);
                                  }}
                                  className={`p-2.5 text-xs cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors ${
                                    isSelected
                                      ? "bg-blue-50/70 text-blue-700 font-semibold"
                                      : "text-slate-700"
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-slate-900 flex items-center space-x-1.5">
                                      <span>
                                        {d.firstName} {d.lastName}
                                      </span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal">
                                        {d.state} CDL
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      {d.phone} • Lic: {d.licenseNumber}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-2" />
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                        Operational Status
                      </label>
                      <label className="flex items-center space-x-1.5 text-xs font-medium cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={formData.status === "Inactive"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              status: e.target.checked ? "Inactive" : "Active",
                            })
                          }
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span
                          className={
                            formData.status === "Inactive"
                              ? "text-amber-700 font-bold"
                              : "text-slate-500 hover:text-slate-700"
                          }
                        >
                          Make Inactive
                        </span>
                      </label>
                    </div>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as EquipmentStatus,
                        })
                      }
                      className={`w-full h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:outline-none ${
                        formData.status === "Inactive"
                          ? "border-amber-300 bg-amber-50/50 text-amber-900 font-semibold focus:ring-amber-500"
                          : "border-slate-300 focus:ring-blue-500"
                      }`}
                    >
                      <option value="Active">Active / On Road</option>
                      <option value="Inactive">Inactive (Decommissioned / Off Fleet)</option>
                      <option value="In Shop">In Shop for Service</option>
                      <option value="Out of Service">Out of Service</option>
                      <option value="Available">Available (Spare Unit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                      Current Mileage (Odometer)
                    </label>
                    <input
                      type="number"
                      value={formData.currentMileage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentMileage: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional equipment notes, APU brand, engine specs, tire sizes, dispatcher instructions..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-200 bg-slate-50/80 rounded-b-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4 text-sm font-medium text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingTruck ? "Update Truck" : "Save Truck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        entityName={selectedTruck ? `Unit #${selectedTruck.unitNumber}` : undefined}
      />

      {/* Document Upload Modal */}
      {selectedTruck && uploadingDocKey && activeDocDef && (
        <DocumentUploadModal
          isOpen={!!uploadingDocKey}
          onClose={() => {
            setUploadingDocKey(null);
            setDroppedFileToUpload(null);
          }}
          category={activeDocDef.label}
          targetName={`Unit #${selectedTruck.unitNumber} (${selectedTruck.make})`}
          hasExpiration={activeDocDef.hasExpiration}
          initialFile={droppedFileToUpload}
          onUpload={(doc) => {
            uploadTruckDocument(selectedTruck.id, uploadingDocKey, doc);
            setDroppedFileToUpload(null);
          }}
        />
      )}

      {/* Custom Document Upload Modal */}
      {selectedTruck && isUploadCustomDocOpen && (
        <CustomDocumentUploadModal
          isOpen={isUploadCustomDocOpen}
          onClose={() => setIsUploadCustomDocOpen(false)}
          targetName={`Unit #${selectedTruck.unitNumber} (${selectedTruck.make})`}
          onUpload={(doc) => {
            addTruckCustomDocument(selectedTruck.id, doc);
          }}
        />
      )}
    </div>
  );
}

export default function TrucksPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading trucks...</div>
      }
    >
      <TrucksContent />
    </React.Suspense>
  );
}

