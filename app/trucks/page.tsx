"use client";

import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";

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
  } = useFleet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<TruckType | null>(null);
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);
  const [uploadingDocKey, setUploadingDocKey] =
    useState<TruckDocumentKey | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    unitNumber: "",
    make: "Freightliner",
    model: "",
    year: new Date().getFullYear(),
    vin: "",
    plateNumber: "",
    isTemporaryPlate: false,
    ownershipType: "Own" as OwnershipType,
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
    () => trucks.find((t) => t.id === selectedTruckId) || trucks[0],
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

  const openAddModal = () => {
    setFormData({
      unitNumber: "",
      make: "Freightliner",
      model: "Cascadia",
      year: new Date().getFullYear(),
      vin: "",
      plateNumber: "",
      isTemporaryPlate: false,
      ownershipType: "Own",
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

                // Count uploaded docs
                const uploadedDocsCount = Object.values(truck.documents).filter(
                  Boolean
                ).length;

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
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                          {uploadedDocsCount}/6 Docs
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
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <span>Unit #{selectedTruck.unitNumber} Documents Vault</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Upload and track required compliance papers (Title, 2290, Annual DOT, CabCard, Insurance, Lease).
                    </p>
                  </div>
                </div>

                {/* 6 Document Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {DOCUMENT_DEFINITIONS.map((def) => {
                    const doc = selectedTruck.documents[def.key];

                    return (
                      <div
                        key={def.key}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          doc
                            ? "bg-white border-slate-200 hover:border-blue-300 shadow-xs"
                            : "bg-slate-50/60 border-dashed border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div
                                className={`p-2 rounded-lg ${
                                  doc
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-slate-200 text-slate-400"
                                }`}
                              >
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 text-sm">
                                  {def.label}
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  {def.description}
                                </p>
                              </div>
                            </div>

                            {doc ? (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center space-x-1">
                                <CheckCircle className="w-3 h-3 mr-0.5" />
                                <span>Uploaded</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full">
                                Missing
                              </span>
                            )}
                          </div>

                          {doc && (
                            <div className="mt-3 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1">
                              <p className="font-semibold text-slate-800 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>
                                  Uploaded:{" "}
                                  {new Date(doc.uploadedAt).toLocaleDateString()}
                                </span>
                                <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                              </div>
                              {doc.expirationDate && (
                                <p className="text-[11px] font-semibold text-blue-700 flex items-center space-x-1 pt-0.5">
                                  <span>Expires: {doc.expirationDate}</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          {doc ? (
                            <>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => {
                                    setViewingDoc(doc);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Preview</span>
                                </button>
                                <button
                                  onClick={() => downloadDocument(doc)}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </button>
                              </div>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${def.label} from Unit #${selectedTruck.unitNumber}?`
                                    )
                                  ) {
                                    removeTruckDocument(
                                      selectedTruck.id,
                                      def.key
                                    );
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                title="Remove file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setUploadingDocKey(def.key)}
                              className="w-full inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-lg transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload {def.label}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
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
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
              className="p-6 overflow-y-auto space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Make
                  </label>
                  <select
                    value={formData.make}
                    onChange={(e) =>
                      setFormData({ ...formData, make: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                      className="w-20 px-2 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="e.g. Cascadia 126"
                      className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                      className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <label className="flex items-center space-x-1.5 text-xs text-slate-700 whitespace-nowrap cursor-pointer bg-slate-50 px-2.5 py-2 border border-slate-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={formData.isTemporaryPlate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isTemporaryPlate: e.target.checked,
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Temp Plate?</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Ownership & BestPass */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Ownership Type
                  </label>
                  <select
                    value={formData.ownershipType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ownershipType: e.target.value as OwnershipType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Own">Company Owned</option>
                    <option value="Lease">Leased</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    BestPass Device Serial
                  </label>
                  <div className="space-y-1">
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
                      className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <label className="flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Assigned Driver
                  </label>
                  <select
                    value={formData.assignedDriverId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedDriverId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.firstName} {d.lastName} ({d.state} CDL)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as EquipmentStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Active">Active / On Road</option>
                    <option value="In Shop">In Shop for Service</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
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
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional equipment notes, APU brand, engine specs, tire sizes, dispatcher instructions..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
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
          onClose={() => setUploadingDocKey(null)}
          category={activeDocDef.label}
          targetName={`Unit #${selectedTruck.unitNumber} (${selectedTruck.make})`}
          hasExpiration={activeDocDef.hasExpiration}
          onUpload={(doc) => {
            uploadTruckDocument(selectedTruck.id, uploadingDocKey, doc);
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

