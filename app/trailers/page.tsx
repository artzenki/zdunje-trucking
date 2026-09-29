"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  Trailer as TrailerType,
  TrailerDocumentKey,
  OwnershipType,
  EquipmentStatus,
  FleetDocument,
} from "@/types/fleet";
import {
  Container,
  Plus,
  Search,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Edit,
  CheckCircle,
  X,
  ChevronRight,
  Shield,
  Truck,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { CustomDocumentUploadModal } from "@/components/CustomDocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";

const TRAILER_DOCUMENTS: {
  key: TrailerDocumentKey;
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
    description: "Heavy Highway Vehicle Tax Schedule 1 (if applicable)",
  },
  {
    key: "dotInspection",
    label: "Annual DOT Inspection",
    hasExpiration: true,
    description: "Annual 396.17 trailer chassis, brake & lighting inspection",
  },
  {
    key: "insurance",
    label: "Bobtail / Physical Damage",
    hasExpiration: true,
    description: "Physical damage policy certificate for trailer",
  },
  {
    key: "cabCard",
    label: "CAB Card",
    hasExpiration: true,
    description: "Trailer registration / apportioned plate cab card",
  },
  {
    key: "trailerAgreement",
    label: "Trailer Agreement",
    hasExpiration: false,
    description: "Trailer interchange / lease or operating agreement",
  },
];

function TrailersContent() {
  const searchParams = useSearchParams();
  const {
    trailers,
    trucks,
    addTrailer,
    updateTrailer,
    deleteTrailer,
    uploadTrailerDocument,
    removeTrailerDocument,
    addTrailerCustomDocument,
    removeTrailerCustomDocument,
  } = useFleet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTrailerId, setSelectedTrailerId] = useState<string | null>(
    null
  );

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTrailer, setEditingTrailer] = useState<TrailerType | null>(null);
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);
  const [uploadingDocKey, setUploadingDocKey] =
    useState<TrailerDocumentKey | null>(null);
  const [isUploadCustomDocOpen, setIsUploadCustomDocOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    unitNumber: "",
    make: "Great Dane",
    model: "53' Dry Van",
    year: new Date().getFullYear(),
    vin: "",
    plateNumber: "",
    isTemporaryPlate: false,
    ownershipType: "Own" as OwnershipType,
    trailerValue: 45000,
    status: "Active" as EquipmentStatus,
    assignedTruckId: "",
    notes: "",
  });

  useEffect(() => {
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (id && trailers.some((tr) => tr.id === id)) {
      setSelectedTrailerId(id);
    } else if (trailers.length > 0 && !selectedTrailerId) {
      setSelectedTrailerId(trailers[0].id);
    }
    if (action === "new") {
      openAddModal();
    }
  }, [searchParams, trailers, selectedTrailerId]);

  const selectedTrailer = useMemo(
    () => trailers.find((tr) => tr.id === selectedTrailerId) || (trailers.length > 0 ? trailers[0] : null),
    [trailers, selectedTrailerId]
  );

  const filteredTrailers = useMemo(() => {
    return trailers.filter((tr) => {
      const matchSearch =
        tr.unitNumber.toLowerCase().includes(search.toLowerCase()) ||
        tr.vin.toLowerCase().includes(search.toLowerCase()) ||
        tr.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
        tr.make.toLowerCase().includes(search.toLowerCase()) ||
        tr.model.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || tr.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [trailers, search, statusFilter]);

  const openAddModal = () => {
    setFormData({
      unitNumber: "",
      make: "Great Dane",
      model: "53' Dry Van",
      year: new Date().getFullYear(),
      vin: "",
      plateNumber: "",
      isTemporaryPlate: false,
      ownershipType: "Own",
      trailerValue: 48000,
      status: "Active",
      assignedTruckId: "",
      notes: "",
    });
    setEditingTrailer(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (trailer: TrailerType) => {
    setEditingTrailer(trailer);
    setFormData({
      unitNumber: trailer.unitNumber,
      make: trailer.make,
      model: trailer.model,
      year: trailer.year,
      vin: trailer.vin,
      plateNumber: trailer.plateNumber,
      isTemporaryPlate: trailer.isTemporaryPlate,
      ownershipType: trailer.ownershipType,
      trailerValue: trailer.trailerValue,
      status: trailer.status,
      assignedTruckId: trailer.assignedTruckId || "",
      notes: trailer.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitNumber.trim()) {
      alert("Please enter a Unit Number");
      return;
    }

    if (editingTrailer) {
      updateTrailer(editingTrailer.id, {
        ...formData,
        assignedTruckId: formData.assignedTruckId || null,
      });
    } else {
      addTrailer({
        ...formData,
        assignedTruckId: formData.assignedTruckId || null,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, unitNumber: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete Trailer #${unitNumber}? All documents will be deleted.`
      )
    ) {
      deleteTrailer(id);
      if (selectedTrailerId === id) {
        const remaining = trailers.filter((t) => t.id !== id);
        if (remaining.length > 0) setSelectedTrailerId(remaining[0].id);
      }
    }
  };

  const activeDocDef = TRAILER_DOCUMENTS.find(
    (d) => d.key === uploadingDocKey
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Trailers & Equipment
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-800">
              {trailers.length} Trailers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track dry vans, reefers, annual inspections, temporary plates, and lease agreements.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Trailer</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Column */}
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
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
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
                All ({trailers.length})
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
                onClick={() => setStatusFilter("Available")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "Available"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Available
              </button>
            </div>
          </div>

          {/* List Items */}
          <div className="divide-y divide-slate-100 max-h-[750px] overflow-y-auto">
            {filteredTrailers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No trailers match your search.
              </div>
            ) : (
              filteredTrailers.map((trailer) => {
                const isSelected = selectedTrailer?.id === trailer.id;
                const assignedTruck = trucks.find(
                  (t) => t.id === trailer.assignedTruckId
                );
                const uploadedDocsCount = Object.values(
                  trailer.documents
                ).filter(Boolean).length;

                return (
                  <button
                    key={trailer.id}
                    onClick={() => setSelectedTrailerId(trailer.id)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between ${
                      isSelected
                        ? "bg-purple-50/70 border-l-4 border-purple-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          {trailer.unitNumber}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            trailer.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {trailer.status}
                        </span>
                        {trailer.isTemporaryPlate && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
                            TEMP
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5 truncate">
                        {trailer.year} {trailer.make} {trailer.model}
                      </p>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2 font-mono">
                        <span>Plate: {trailer.plateNumber}</span>
                        <span>•</span>
                        <span>{trailer.ownershipType}</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center space-x-1">
                          <Truck className="w-3 h-3 text-slate-400" />
                          <span>
                            {assignedTruck
                              ? `Coupled to Unit #${assignedTruck.unitNumber}`
                              : "Uncoupled"}
                          </span>
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                          {uploadedDocsCount}/6 Docs
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                        isSelected
                          ? "text-purple-600 translate-x-1"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Column */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTrailer ? (
            <>
              {/* Header Box */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                      <Container className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          Trailer #{selectedTrailer.unitNumber}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            selectedTrailer.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {selectedTrailer.status}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                          {selectedTrailer.ownershipType} ($
                          {selectedTrailer.trailerValue.toLocaleString()})
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedTrailer.year} {selectedTrailer.make} {selectedTrailer.model}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(selectedTrailer)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Trailer</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(
                          selectedTrailer.id,
                          selectedTrailer.unitNumber
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Trailer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      License Plate
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                      {selectedTrailer.plateNumber}
                    </span>
                    {selectedTrailer.isTemporaryPlate && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">
                        Temporary Permit
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      VIN
                    </span>
                    <span
                      className="text-xs font-bold text-slate-800 font-mono mt-1 block truncate"
                      title={selectedTrailer.vin}
                    >
                      {selectedTrailer.vin}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Assigned Truck
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">
                      {trucks.find((t) => t.id === selectedTrailer.assignedTruckId)
                        ? `Unit #${
                            trucks.find(
                              (t) => t.id === selectedTrailer.assignedTruckId
                            )?.unitNumber
                          }`
                        : "Uncoupled / Yard"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Replacement Value
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">
                      ${selectedTrailer.trailerValue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedTrailer.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <strong className="text-slate-700">Dispatcher & Trailer Notes:</strong>{" "}
                    {selectedTrailer.notes}
                  </div>
                )}
              </div>

              {/* Documents Hub */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <span>Trailer #{selectedTrailer.unitNumber} Documents Vault</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Required compliance papers (Title, 2290, Annual DOT, Bobtail/Physical Damage, CAB Card, Lease).
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                      {TRAILER_DOCUMENTS.filter((def) => !!selectedTrailer.documents[def.key]).length} / {TRAILER_DOCUMENTS.length} Uploaded
                    </span>
                  </div>
                </div>

                {/* Mandatory Compliance Documents List */}
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                  {TRAILER_DOCUMENTS.map((def) => {
                    const doc = selectedTrailer.documents[def.key];

                    return (
                      <div
                        key={def.key}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Left: Document Info */}
                        <div className="flex items-start space-x-3 min-w-0">
                          <div
                            className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                              doc
                                ? "bg-purple-50 text-purple-600"
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
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full inline-flex items-center">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  <span>Uploaded</span>
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
                                <span className="font-mono text-slate-700 truncate max-w-xs" title={doc.name}>
                                  {doc.name}
                                </span>
                                <span>•</span>
                                <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
                                <span>•</span>
                                <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                {doc.expirationDate && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-purple-700">
                                      Expires: {doc.expirationDate}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                          {doc ? (
                            <>
                              <button
                                onClick={() => setViewingDoc(doc)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview</span>
                              </button>
                              <button
                                onClick={() => downloadDocument(doc)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                              <button
                                onClick={() => setUploadingDocKey(def.key)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                                title="Replace file"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Replace</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Remove ${def.label} from Trailer #${selectedTrailer.unitNumber}?`
                                    )
                                  ) {
                                    removeTrailerDocument(
                                      selectedTrailer.id,
                                      def.key
                                    );
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove file"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setUploadingDocKey(def.key)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
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

                {/* Additional / Other Documents Section */}
                <div className="pt-6 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-slate-700" />
                        <span>Additional Documents & Paperwork</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Upload custom files, reefer maintenance certificates, interchange receipts, or custom permits.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsUploadCustomDocOpen(true)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Upload Document</span>
                    </button>
                  </div>

                  {/* List of Custom Documents */}
                  {selectedTrailer.customDocuments && selectedTrailer.customDocuments.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
                      {selectedTrailer.customDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 shrink-0 mt-0.5">
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
                                    <span className="font-semibold text-purple-600">
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
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => downloadDocument(doc)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-purple-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete document "${doc.name}"?`)) {
                                  removeTrailerCustomDocument(selectedTrailer.id, doc.id);
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
                        Upload custom paperwork, reefer certificates, lease addendums, or inspection forms with custom names and descriptions.
                      </p>
                      <button
                        onClick={() => setIsUploadCustomDocOpen(true)}
                        className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
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
              <Container className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">
                No Trailer Selected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Trailer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingTrailer
                    ? `Edit Trailer #${editingTrailer.unitNumber}`
                    : "Add New Trailer"}
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
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
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
                      placeholder="e.g. TR-5320"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Great Dane">Great Dane</option>
                      <option value="Utility">Utility</option>
                      <option value="Wabash">Wabash</option>
                      <option value="Hyundai Translead">Hyundai Translead</option>
                      <option value="Vanguard">Vanguard</option>
                      <option value="Stoughton">Stoughton</option>
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
                        className="w-20 h-10 px-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) =>
                          setFormData({ ...formData, model: e.target.value })
                        }
                        placeholder="e.g. 53' Dry Van"
                        className="flex-1 h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      VIN
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
                      placeholder="1GRAN532..."
                      className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
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
                        placeholder="e.g. TL-78201"
                        className="flex-1 h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer bg-slate-50 px-3 h-10 border border-slate-200 rounded-lg">
                        <input
                          type="checkbox"
                          checked={formData.isTemporaryPlate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isTemporaryPlate: e.target.checked,
                            })
                          }
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                        <span>Temp Plate?</span>
                      </label>
                    </div>
                  </div>
                </div>

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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="Own">Company Owned</option>
                      <option value="Lease">Leased</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Trailer Value ($ USD)
                    </label>
                    <input
                      type="number"
                      value={formData.trailerValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          trailerValue: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="45000"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Assigned Truck
                    </label>
                    <select
                      value={formData.assignedTruckId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assignedTruckId: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      <option value="">-- Uncoupled / Staged in Yard --</option>
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          Unit #{t.unitNumber} ({t.make} {t.model})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Trailer Notes
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="e.g. Reefer unit hours, side skirts, tire inflation system, terminal location..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="h-10 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 px-5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingTrailer ? "Update Trailer" : "Save Trailer"}
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
        entityName={
          selectedTrailer
            ? `Trailer #${selectedTrailer.unitNumber}`
            : undefined
        }
      />

      {/* Document Upload Modal */}
      {selectedTrailer && uploadingDocKey && activeDocDef && (
        <DocumentUploadModal
          isOpen={!!uploadingDocKey}
          onClose={() => setUploadingDocKey(null)}
          category={activeDocDef.label}
          targetName={`Trailer #${selectedTrailer.unitNumber}`}
          hasExpiration={activeDocDef.hasExpiration}
          onUpload={(doc) => {
            uploadTrailerDocument(selectedTrailer.id, uploadingDocKey, doc);
          }}
        />
      )}

      {/* Custom Document Upload Modal */}
      {selectedTrailer && isUploadCustomDocOpen && (
        <CustomDocumentUploadModal
          isOpen={isUploadCustomDocOpen}
          onClose={() => setIsUploadCustomDocOpen(false)}
          targetName={`Trailer #${selectedTrailer.unitNumber}`}
          onUpload={(doc) => {
            addTrailerCustomDocument(selectedTrailer.id, doc);
          }}
        />
      )}
    </div>
  );
}

export default function TrailersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading trailers...</div>
      }
    >
      <TrailersContent />
    </React.Suspense>
  );
}

