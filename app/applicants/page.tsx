"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useFleet } from "@/context/FleetContext";
import {
  Applicant,
  ApplicantStatus,
  ApplicantDocumentKey,
  FleetDocument,
} from "@/types/fleet";
import {
  Users,
  UserCheck,
  Plus,
  Search,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  Edit,
  X,
  Phone,
  Calendar,
  UserX,
  History,
  ChevronDown,
  ChevronUp,
  ArrowRightCircle,
  FileCheck,
  CheckCircle2,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";
import { uploadFileToSupabaseStorage } from "@/lib/documentStorage";

const APPLICANT_DOC_FIELDS: {
  key: ApplicantDocumentKey;
  label: string;
  category: string;
  description: string;
  sampleName: string;
}[] = [
  {
    key: "mvr",
    label: "Motor Vehicle Record (MVR)",
    category: "MVR",
    description: "State 3-Year / 5-Year Driving History Record",
    sampleName: "MVR_Record.pdf",
  },
  {
    key: "pspAuth",
    label: "PSP Authorization Form",
    category: "PSP Auth Form",
    description: "Signed FMCSA Pre-Employment Screening Program Consent Form",
    sampleName: "PSP_Consent_Signed.pdf",
  },
  {
    key: "pspReport",
    label: "PSP Driver Report",
    category: "PSP Report",
    description: "Official FMCSA 5-Year Crash & 3-Year Roadside Inspection Report",
    sampleName: "PSP_Screening_Report.pdf",
  },
];

export default function ApplicantsPage() {
  const {
    applicants,
    drivers,
    addApplicant,
    updateApplicant,
    deleteApplicant,
    uploadApplicantDocument,
    removeApplicantDocument,
    convertApplicantToDriver,
  } = useFleet();

  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicantStatus | "all">("all");

  // Document Modal States
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<ApplicantDocumentKey | null>(null);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<Record<string, boolean>>({});

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplicant, setEditingApplicant] = useState<Applicant | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "1990-01-01",
    state: "IL",
    licenseNumber: "",
    email: "",
    status: "Under Review" as ApplicantStatus,
    notes: "",
  });

  const filteredApplicants = useMemo(() => {
    return (applicants || []).filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        a.firstName.toLowerCase().includes(q) ||
        (a.middleName || "").toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        (a.licenseNumber || "").toLowerCase().includes(q) ||
        (a.phone || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || a.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [applicants, search, statusFilter]);

  const selectedApplicant = useMemo(() => {
    if (selectedApplicantId) {
      const found = (applicants || []).find((a) => a.id === selectedApplicantId);
      if (found) return found;
    }
    return filteredApplicants.length > 0 ? filteredApplicants[0] : (applicants || [])[0] || null;
  }, [applicants, filteredApplicants, selectedApplicantId]);

  const openAddModal = () => {
    setEditingApplicant(null);
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      phone: "",
      dateOfBirth: "1990-01-01",
      state: "IL",
      licenseNumber: "",
      email: "",
      status: "Under Review",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (app: Applicant) => {
    setEditingApplicant(app);
    setFormData({
      firstName: app.firstName,
      middleName: app.middleName || "",
      lastName: app.lastName,
      phone: app.phone,
      dateOfBirth: app.dateOfBirth,
      state: app.state,
      licenseNumber: app.licenseNumber,
      email: app.email || "",
      status: app.status,
      notes: app.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert("First and Last name are required.");
      return;
    }
    if (!formData.licenseNumber.trim()) {
      alert("Driver's License number is required.");
      return;
    }

    if (editingApplicant) {
      updateApplicant(editingApplicant.id, {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        state: formData.state.toUpperCase().trim(),
        licenseNumber: formData.licenseNumber.trim(),
        email: formData.email.trim(),
        status: formData.status,
        notes: formData.notes.trim(),
      });
    } else {
      addApplicant({
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,
        state: formData.state.toUpperCase().trim(),
        licenseNumber: formData.licenseNumber.trim(),
        email: formData.email.trim(),
        status: formData.status,
        appliedDate: new Date().toISOString().split("T")[0],
        notes: formData.notes.trim(),
      });
    }
    setIsModalOpen(false);
  };

  const handleDeleteApplicant = (app: Applicant) => {
    if (confirm(`Are you sure you want to delete applicant ${app.firstName} ${app.lastName}?`)) {
      deleteApplicant(app.id);
      if (selectedApplicant?.id === app.id) {
        setSelectedApplicantId(null);
      }
    }
  };

  const handlePromoteToDriver = (app: Applicant) => {
    if (
      confirm(
        `Promote ${app.firstName} ${app.lastName} to Active Fleet Driver?\n\nThis will transfer personal details, Driver's License, MVR, and PSP documents into the active driver roster.`
      )
    ) {
      convertApplicantToDriver(app.id);
      alert(`${app.firstName} ${app.lastName} has been promoted to Active Drivers!`);
    }
  };

  const toggleHistory = (key: string) => {
    setExpandedHistoryKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleDirectDropDoc = async (
    docKey: ApplicantDocumentKey,
    categoryName: string,
    file: File
  ) => {
    if (!selectedApplicant) return;
    try {
      const uploadRes = await uploadFileToSupabaseStorage(file, file.name, "drivers");
      const newDoc: FleetDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        category: categoryName,
        fileType: file.type || "application/pdf",
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: uploadRes.fileUrl,
        isCurrent: true,
        status: "current",
      };
      uploadApplicantDocument(selectedApplicant.id, docKey, newDoc);
    } catch (err) {
      console.error("Direct drop failed for applicant", err);
      alert("Failed to upload file to cloud storage.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Driver Applicants & Screening
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
              {(applicants || []).length} Applicants
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pre-employment onboarding qualification: MVR record check, PSP authorization form, and official FMCSA PSP report.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Applicant</span>
        </button>
      </div>

      {/* Driver / Applicant Tab Switcher */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-2">
        <Link
          href="/drivers"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Active Fleet Drivers</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-extrabold">
            {(drivers || []).length}
          </span>
        </Link>
        <Link
          href="/applicants"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-xs"
        >
          <UserCheck className="w-4 h-4 text-blue-400" />
          <span>Driver Applicants (Onboarding & MVR / PSP)</span>
          {(applicants || []).length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-600 text-white font-extrabold">
              {(applicants || []).length}
            </span>
          )}
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List Pane */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Search & Filter */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, license..."
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
                All ({(applicants || []).length})
              </button>
              {(["Under Review", "Approved", "Rejected"] as ApplicantStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? st === "Approved"
                        ? "bg-emerald-600 text-white"
                        : st === "Rejected"
                        ? "bg-rose-600 text-white"
                        : "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-slate-100 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredApplicants.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <UserX className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold">No applicants found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add prospective drivers to record their MVR and PSP checks.
                </p>
              </div>
            ) : (
              filteredApplicants.map((app) => {
                const isSelected = selectedApplicant?.id === app.id;
                const hasMvr = !!app.documents?.mvr;
                const hasPspAuth = !!app.documents?.pspAuth;
                const hasPspReport = !!app.documents?.pspReport;
                const docCount = [hasMvr, hasPspAuth, hasPspReport].filter(Boolean).length;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApplicantId(app.id)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-blue-600"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                          <span>
                            {app.firstName} {app.middleName ? `${app.middleName} ` : ""}{app.lastName}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                          <span>CDL: {app.licenseNumber || "N/A"} ({app.state})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Phone: {app.phone || "No phone"} · DOB: {app.dateOfBirth}
                        </div>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            app.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>{docCount}/3 Docs</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details Pane */}
        <div className="lg:col-span-8 space-y-6">
          {selectedApplicant ? (
            <>
              {/* Applicant Header Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-blue-500/20">
                      {selectedApplicant.firstName[0]}
                      {selectedApplicant.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-extrabold text-slate-900">
                          {selectedApplicant.firstName}{" "}
                          {selectedApplicant.middleName ? `${selectedApplicant.middleName} ` : ""}
                          {selectedApplicant.lastName}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            selectedApplicant.status === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : selectedApplicant.status === "Rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {selectedApplicant.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Applied Date: {selectedApplicant.appliedDate || "Recent"} · CDL #{selectedApplicant.licenseNumber} ({selectedApplicant.state})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePromoteToDriver(selectedApplicant)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                      title="Promote this applicant to Active Driver in fleet roster"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                      <span>Hire & Promote to Driver</span>
                    </button>

                    <button
                      onClick={() => openEditModal(selectedApplicant)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                      title="Edit Applicant"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteApplicant(selectedApplicant)}
                      className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-slate-200"
                      title="Delete Applicant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 10 Required Data Fields Display */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      1. First Name
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedApplicant.firstName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      2. Middle Name
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {selectedApplicant.middleName || "—"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      3. Last Name
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedApplicant.lastName}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      4. Phone Number
                    </span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedApplicant.phone || "—"}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      5. Date of Birth (DOB)
                    </span>
                    <span className="text-sm font-semibold text-slate-800 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedApplicant.dateOfBirth || "—"}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      6. State
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {selectedApplicant.state || "IL"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      7. License Number
                    </span>
                    <span className="text-sm font-bold text-blue-700 font-mono">
                      {selectedApplicant.licenseNumber || "—"}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Email Address
                    </span>
                    <span className="text-xs font-medium text-slate-700 truncate block">
                      {selectedApplicant.email || "—"}
                    </span>
                  </div>
                </div>

                {selectedApplicant.notes && (
                  <div className="mt-4 p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                    <span className="font-bold">Applicant Notes:</span> {selectedApplicant.notes}
                  </div>
                )}
              </div>

              {/* Onboarding Documents Section: MVR, PSP Auth, PSP Report */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <FileCheck className="w-5 h-5 text-blue-600" />
                      <span>Required Applicant Files (MVR & PSP)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload, inspect, and maintain version history for required screening documents. Drag and drop any file directly onto the card.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {APPLICANT_DOC_FIELDS.map((docField) => {
                    const currentDoc = selectedApplicant.documents[docField.key];
                    const isHistoryOpen = !!expandedHistoryKeys[docField.key];
                    const historyList = currentDoc?.history || [];

                    return (
                      <div
                        key={docField.key}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("border-blue-500", "bg-blue-50/40");
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/40");
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("border-blue-500", "bg-blue-50/40");
                          const droppedFile = e.dataTransfer.files?.[0];
                          if (droppedFile) {
                            await handleDirectDropDoc(docField.key, docField.category, droppedFile);
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between ${
                          currentDoc
                            ? "border-emerald-200 bg-emerald-50/20"
                            : "border-dashed border-slate-200 bg-slate-50/50 hover:border-blue-400"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                              {docField.label}
                            </span>
                            {currentDoc ? (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ON FILE</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800">
                                MISSING
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 mb-3">{docField.description}</p>

                          {/* Current Document Preview */}
                          {currentDoc ? (
                            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs mb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 truncate">
                                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                  <span className="text-xs font-bold text-slate-800 truncate" title={currentDoc.name}>
                                    {currentDoc.name}
                                  </span>
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  CURRENT
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                                <span>Uploaded: {currentDoc.uploadedAt.split("T")[0]}</span>
                                {currentDoc.expirationDate && (
                                  <span className="text-amber-600 font-medium">
                                    Exp: {currentDoc.expirationDate}
                                  </span>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 mt-2.5 pt-2 border-t border-slate-100">
                                <button
                                  onClick={() => setViewingDoc(currentDoc)}
                                  className="p-1 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Preview Document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => downloadDocument(currentDoc)}
                                  className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${currentDoc.name}?`)) {
                                      removeApplicantDocument(selectedApplicant.id, docField.key);
                                    }
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 px-2 border border-dashed border-slate-300 rounded-lg bg-white/60 mb-3">
                              <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                              <span className="text-[11px] text-slate-500 font-medium block">
                                Drag & drop {docField.category} here
                              </span>
                            </div>
                          )}
                        </div>

                        {/* History & Upload Trigger */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/60">
                          {historyList.length > 0 && (
                            <div>
                              <button
                                onClick={() => toggleHistory(docField.key)}
                                className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-600 hover:text-slate-900 py-1"
                              >
                                <span className="flex items-center space-x-1">
                                  <History className="w-3 h-3 text-slate-400" />
                                  <span>Version History ({historyList.length})</span>
                                </span>
                                {isHistoryOpen ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </button>

                              {isHistoryOpen && (
                                <div className="space-y-1.5 pt-1">
                                  {historyList.map((hDoc) => (
                                    <div
                                      key={hDoc.id}
                                      className="flex items-center justify-between p-2 bg-slate-100 rounded text-[10px] text-slate-600"
                                    >
                                      <div className="truncate pr-2">
                                        <div className="font-medium truncate">{hDoc.name}</div>
                                        <div className="text-[9px] text-slate-400">
                                          Archived: {hDoc.uploadedAt.split("T")[0]}
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-1 shrink-0">
                                        <button
                                          onClick={() => setViewingDoc(hDoc)}
                                          className="p-1 hover:text-blue-600"
                                          title="View Archived File"
                                        >
                                          <Eye className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => downloadDocument(hDoc)}
                                          className="p-1 hover:text-emerald-600"
                                          title="Download Archived File"
                                        >
                                          <Download className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`Delete archived version ${hDoc.name}?`)) {
                                              removeApplicantDocument(
                                                selectedApplicant.id,
                                                docField.key,
                                                hDoc.id
                                              );
                                            }
                                          }}
                                          className="p-1 hover:text-rose-600"
                                          title="Delete from History"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            onClick={() => {
                              setUploadCategory(docField.category);
                              setUploadKey(docField.key);
                              setHasExpiration(docField.key === "mvr");
                            }}
                            className="w-full py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>
                              {currentDoc ? "Upload New / Replace Version" : `Upload ${docField.category}`}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <UserCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">No applicant selected</p>
              <p className="text-xs text-slate-400 mt-1">
                Select an applicant from the list or click &quot;Add New Applicant&quot; to begin onboarding qualification.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Applicant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingApplicant ? "Edit Applicant Information" : "Add Driver Applicant"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    1. First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="Robert"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    4. Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    5. Date of Birth (DOB) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    6. State (2-Letter) *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs uppercase"
                    placeholder="IL"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    7. CDL / License Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono"
                    placeholder="D123-4567-8901"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                    placeholder="john.doe@example.com"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Applicant Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ApplicantStatus })}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Hired">Hired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Screening Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="Notes on PSP violations, past carrier references, etc."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingApplicant ? "Save Changes" : "Create Applicant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      {uploadCategory && uploadKey && selectedApplicant && (
        <DocumentUploadModal
          isOpen={true}
          onClose={() => {
            setUploadCategory(null);
            setUploadKey(null);
          }}
          targetName={`${selectedApplicant.firstName} ${selectedApplicant.lastName}`}
          category={uploadCategory}
          hasExpiration={hasExpiration}
          onUpload={(doc) => {
            uploadApplicantDocument(selectedApplicant.id, uploadKey, doc);
            setUploadCategory(null);
            setUploadKey(null);
          }}
        />
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <DocumentViewerModal
          isOpen={true}
          onClose={() => setViewingDoc(null)}
          document={viewingDoc}
        />
      )}
    </div>
  );
}
