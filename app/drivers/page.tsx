"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  Driver as DriverType,
  DriverStatus,
  FleetDocument,
} from "@/types/fleet";
import {
  Users,
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
  Phone,
  CreditCard,
  Building,
  FolderOpen,
  Link as LinkIcon,
  FlaskConical,
  Award,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";

const DRIVER_REQUIRED_DOC_KEYS: {
  key: keyof Omit<
    DriverType["documents"],
    "drugTestResults" | "applicationLink" | "dotRecords"
  >;
  label: string;
  category: string;
}[] = [
  { key: "cdl", label: "Commercial Driver License (CDL)", category: "CDL" },
  { key: "medCard", label: "Medical Examiner Certificate (MEDCard)", category: "MEDCard" },
  { key: "mvr", label: "Motor Vehicle Record (MVR)", category: "MVR" },
  { key: "pspAuth", label: "PSP Authorization", category: "PSP Authorization" },
  { key: "pspReport", label: "PSP Driver Report", category: "PSP Driver Report" },
  { key: "clearingHouse", label: "FMCSA Clearinghouse", category: "Clearing House" },
  { key: "applicationFile", label: "Signed Driver Application", category: "Application Link" },
  { key: "onboardingDoc", label: "Onboarding Document / Handbook", category: "Onboarding Document" },
  { key: "drugCustodyForm", label: "Drug Custody Form (CCF)", category: "Drug Test Custody Form" },
  { key: "drugPassport", label: "Drug Test ePassport", category: "Drug Test ePassport" },
  { key: "bankInfoDoc", label: "Bank Info / Voided Check", category: "Bank Information" },
  { key: "einLetter", label: "EIN Letter / W-9", category: "EIN Letter" },
  { key: "leaseAgreement", label: "Driver Lease Agreement", category: "Driver Lease Agreement" },
];

function getDriverCompliance(driver: DriverType) {
  const skipped = driver.skippedDocuments || [];
  let totalRequired = 0;
  let uploadedCount = 0;
  let missingCount = 0;
  let skippedCount = 0;
  const missingKeys: string[] = [];

  DRIVER_REQUIRED_DOC_KEYS.forEach(({ key }) => {
    const isSkipped = skipped.includes(key);
    const doc = driver.documents[key];
    const hasDoc = !!doc;

    if (isSkipped) {
      skippedCount++;
    } else {
      totalRequired++;
      if (hasDoc) {
        uploadedCount++;
      } else {
        missingCount++;
        missingKeys.push(key);
      }
    }
  });

  const percentage =
    totalRequired > 0 ? Math.round((uploadedCount / totalRequired) * 100) : 100;
  const isCompliant = missingCount === 0;

  return {
    totalRequired,
    uploadedCount,
    missingCount,
    skippedCount,
    percentage,
    isCompliant,
    missingKeys,
  };
}

function DriversContent() {
  const searchParams = useSearchParams();
  const {
    drivers,
    trucks,
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
  } = useFleet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [complianceFilter, setComplianceFilter] = useState<
    "all" | "missing" | "compliant"
  >("all");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Active Folder Tab in Driver View
  const [activeFolderTab, setActiveFolderTab] = useState<
    "all" | "license" | "drug" | "safety" | "payroll" | "dot"
  >("all");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverType | null>(null);
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);

  // Upload modal state
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState<
    keyof Omit<
      DriverType["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    > | null
  >(null);
  const [isDrugTestUpload, setIsDrugTestUpload] = useState(false);
  const [isDotRecordUpload, setIsDotRecordUpload] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "1988-05-15",
    phone: "",
    state: "IL",
    licenseNumber: "",
    status: "Active" as DriverStatus,
    assignedTruckId: "",
    hireDate: new Date().toISOString().split("T")[0],
    accountNumber: "",
    routingNumber: "",
    bankName: "",
    applicationLink: "",
    notes: "",
  });

  useEffect(() => {
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (id && drivers.some((d) => d.id === id)) {
      setSelectedDriverId(id);
    } else if (drivers.length > 0 && !selectedDriverId) {
      setSelectedDriverId(drivers[0].id);
    }
    if (action === "new") {
      openAddModal();
    }
  }, [searchParams, drivers, selectedDriverId]);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === selectedDriverId) || (drivers.length > 0 ? drivers[0] : null),
    [drivers, selectedDriverId]
  );

  const selectedCompliance = useMemo(
    () => (selectedDriver ? getDriverCompliance(selectedDriver) : null),
    [selectedDriver]
  );

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const fullName = `${d.firstName} ${d.middleName} ${d.lastName}`.toLowerCase();
      const matchSearch =
        fullName.includes(search.toLowerCase()) ||
        d.phone.toLowerCase().includes(search.toLowerCase()) ||
        d.licenseNumber.toLowerCase().includes(search.toLowerCase()) ||
        d.state.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "all" || d.status === statusFilter;

      const comp = getDriverCompliance(d);
      let matchCompliance = true;
      if (complianceFilter === "missing") matchCompliance = !comp.isCompliant;
      if (complianceFilter === "compliant") matchCompliance = comp.isCompliant;

      return matchSearch && matchStatus && matchCompliance;
    });
  }, [drivers, search, statusFilter, complianceFilter]);

  const openAddModal = () => {
    setFormData({
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "1988-05-15",
      phone: "",
      state: "IL",
      licenseNumber: "",
      status: "Active",
      assignedTruckId: "",
      hireDate: new Date().toISOString().split("T")[0],
      accountNumber: "",
      routingNumber: "",
      bankName: "",
      applicationLink: "",
      notes: "",
    });
    setEditingDriver(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (driver: DriverType) => {
    setEditingDriver(driver);
    setFormData({
      firstName: driver.firstName,
      middleName: driver.middleName,
      lastName: driver.lastName,
      dateOfBirth: driver.dateOfBirth,
      phone: driver.phone,
      state: driver.state,
      licenseNumber: driver.licenseNumber,
      status: driver.status,
      assignedTruckId: driver.assignedTruckId || "",
      hireDate: driver.hireDate,
      accountNumber: driver.bankInfo.accountNumber,
      routingNumber: driver.bankInfo.routingNumber,
      bankName: driver.bankInfo.bankName || "",
      applicationLink: driver.documents.applicationLink || "",
      notes: driver.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      alert("Please provide First and Last Name");
      return;
    }

    const payload = {
      firstName: formData.firstName.trim(),
      middleName: formData.middleName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      phone: formData.phone.trim(),
      state: formData.state.toUpperCase().trim(),
      licenseNumber: formData.licenseNumber.trim(),
      status: formData.status,
      assignedTruckId: formData.assignedTruckId || null,
      hireDate: formData.hireDate,
      notes: formData.notes.trim(),
      bankInfo: {
        accountNumber: formData.accountNumber.trim(),
        routingNumber: formData.routingNumber.trim(),
        bankName: formData.bankName.trim() || undefined,
      },
    };

    if (editingDriver) {
      updateDriver(editingDriver.id, payload);
      if (formData.applicationLink !== editingDriver.documents.applicationLink) {
        updateDriverApplicationLink(editingDriver.id, formData.applicationLink);
      }
    } else {
      addDriver(payload);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove driver ${name}? All driver qualification files and drug test records will be deleted.`
      )
    ) {
      deleteDriver(id);
      if (selectedDriverId === id) {
        const remaining = drivers.filter((d) => d.id !== id);
        if (remaining.length > 0) setSelectedDriverId(remaining[0].id);
      }
    }
  };

  const openDocumentUploader = (
    categoryName: string,
    key: keyof Omit<
      DriverType["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    > | null,
    expires = false,
    isDrugTest = false,
    isDotRecord = false
  ) => {
    setUploadCategory(categoryName);
    setUploadKey(key);
    setHasExpiration(expires);
    setIsDrugTestUpload(isDrugTest);
    setIsDotRecordUpload(isDotRecord);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Drivers & Qualification Files
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800">
              {drivers.length} Drivers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete digital driver folders: CDL, Medical Cards, FMCSA Clearinghouse, MVRs, and monthly Random Drug Tests.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Driver</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Roster Column */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {/* Search & Filters */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, license..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
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
                All ({drivers.length})
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
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Inactive
              </button>
            </div>

            {/* Compliance Quick Filters */}
            <div className="flex items-center space-x-1 text-[11px] pt-2 border-t border-slate-200/80">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Compliance:</span>
              <button
                onClick={() => setComplianceFilter("all")}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  complianceFilter === "all"
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setComplianceFilter("missing")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center space-x-1 ${
                  complianceFilter === "missing"
                    ? "bg-red-600 text-white"
                    : "text-red-700 bg-red-50 hover:bg-red-100"
                }`}
              >
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>Missing ({drivers.filter((d) => !getDriverCompliance(d).isCompliant).length})</span>
              </button>
              <button
                onClick={() => setComplianceFilter("compliant")}
                className={`px-2 py-0.5 rounded-md font-semibold transition-colors flex items-center space-x-1 ${
                  complianceFilter === "compliant"
                    ? "bg-emerald-600 text-white"
                    : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle className="w-2.5 h-2.5" />
                <span>Compliant ({drivers.filter((d) => getDriverCompliance(d).isCompliant).length})</span>
              </button>
            </div>
          </div>

          {/* Roster Items */}
          <div className="divide-y divide-slate-100 max-h-[750px] overflow-y-auto">
            {filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No drivers match your search.
              </div>
            ) : (
              filteredDrivers.map((driver) => {
                const isSelected = selectedDriver?.id === driver.id;
                const assignedTruck = trucks.find(
                  (t) => t.id === driver.assignedTruckId
                );
                const comp = getDriverCompliance(driver);

                return (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="min-w-0 pr-2 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          {driver.firstName} {driver.lastName}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            driver.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {driver.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{driver.phone || "No phone"}</span>
                      </p>

                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-2 font-mono">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold">
                          {driver.state} CDL: {driver.licenseNumber}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1">
                        <span className="text-slate-500 flex items-center space-x-1 truncate">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {assignedTruck
                              ? `Unit #${assignedTruck.unitNumber}`
                              : "Unassigned"}
                          </span>
                        </span>
                        {comp.isCompliant ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 flex items-center space-x-1 shrink-0">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>100% Compliant</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-100 text-red-800 flex items-center space-x-1 shrink-0">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Missing {comp.missingCount} doc{comp.missingCount > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                        isSelected
                          ? "text-emerald-600 translate-x-1"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Column: The Digital Compliance Folder */}
        <div className="lg:col-span-8 space-y-6">
          {selectedDriver ? (
            <>
              {/* Driver Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
                      {selectedDriver.firstName[0]}
                      {selectedDriver.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          {selectedDriver.firstName} {selectedDriver.middleName}{" "}
                          {selectedDriver.lastName}
                        </h2>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                            selectedDriver.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {selectedDriver.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        DOB: {selectedDriver.dateOfBirth} • CDL State:{" "}
                        <strong className="text-slate-700 font-mono">
                          {selectedDriver.state}
                        </strong>{" "}
                        • License #:{" "}
                        <strong className="text-slate-700 font-mono">
                          {selectedDriver.licenseNumber}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEditModal(selectedDriver)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Driver</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(
                          selectedDriver.id,
                          `${selectedDriver.firstName} ${selectedDriver.lastName}`
                        )
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Driver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Specs & Bank Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Contact & Assigned Unit
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                      {selectedDriver.phone}
                    </span>
                    <span className="text-xs text-slate-600 block mt-1">
                      Truck:{" "}
                      <strong className="text-slate-800">
                        {trucks.find((t) => t.id === selectedDriver.assignedTruckId)
                          ? `Unit #${
                              trucks.find(
                                (t) => t.id === selectedDriver.assignedTruckId
                              )?.unitNumber
                            }`
                          : "Unassigned"}
                      </strong>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                        Direct Deposit / Bank Information
                      </span>
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <div>
                        <span className="text-slate-400">Bank: </span>
                        <strong className="text-slate-800">
                          {selectedDriver.bankInfo.bankName || "Primary Bank"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Routing #: </span>
                        <strong className="text-slate-800 font-mono">
                          {selectedDriver.bankInfo.routingNumber || "Not recorded"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Account #: </span>
                        <strong className="text-slate-800 font-mono">
                          {selectedDriver.bankInfo.accountNumber || "Not recorded"}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedDriver.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                    <strong className="text-slate-700">Safety & Dispatch Notes:</strong>{" "}
                    {selectedDriver.notes}
                  </div>
                )}
              </div>

              {/* Compliance Audit Status Bar */}
              {selectedCompliance && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2.5 rounded-xl ${
                          selectedCompliance.isCompliant
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {selectedCompliance.isCompliant ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-extrabold text-slate-900 text-sm">
                            Driver File Compliance Audit
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                              selectedCompliance.isCompliant
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedCompliance.percentage}% Complete
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {selectedCompliance.isCompliant
                            ? "All required safety qualification documents are uploaded and valid."
                            : `${selectedCompliance.missingCount} required document${
                                selectedCompliance.missingCount > 1 ? "s are" : " is"
                              } missing. You can upload or skip non-applicable items.`}
                        </p>
                      </div>
                    </div>

                    {/* Summary Counters */}
                    <div className="flex items-center space-x-2 text-xs flex-wrap gap-y-1">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-semibold rounded-lg border border-emerald-200">
                        ✓ {selectedCompliance.uploadedCount} Filed
                      </span>
                      {selectedCompliance.missingCount > 0 && (
                        <span className="px-2.5 py-1 bg-red-50 text-red-700 font-semibold rounded-lg border border-red-200 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{selectedCompliance.missingCount} Missing</span>
                        </span>
                      )}
                      {selectedCompliance.skippedCount > 0 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg border border-slate-200">
                          {selectedCompliance.skippedCount} Skipped (Exempt)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        selectedCompliance.isCompliant ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${selectedCompliance.percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Digital Compliance Folder Binder */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Folder Binder Tabs */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">
                        Driver Compliance Folder
                      </h3>
                      <p className="text-xs text-slate-500">
                        11-section FMCSA qualification files and monthly drug tests binder.
                      </p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setActiveFolderTab("all")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        activeFolderTab === "all"
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      All Files
                    </button>
                    <button
                      onClick={() => setActiveFolderTab("license")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        activeFolderTab === "license"
                          ? "bg-emerald-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      CDL & MedCard
                    </button>
                    <button
                      onClick={() => setActiveFolderTab("drug")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        activeFolderTab === "drug"
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Drug Testing ({selectedDriver.documents.drugTestResults.length})
                    </button>
                    <button
                      onClick={() => setActiveFolderTab("payroll")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        activeFolderTab === "payroll"
                          ? "bg-teal-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Banking & EIN
                    </button>
                    <button
                      onClick={() => setActiveFolderTab("dot")}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        activeFolderTab === "dot"
                          ? "bg-amber-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      DOT Records ({(selectedDriver.documents.dotRecords || []).length})
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* FOLDER 1: CDL & MEDCARD */}
                  {(activeFolderTab === "all" ||
                    activeFolderTab === "license") && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Award className="w-4 h-4 text-emerald-600" />
                        <span>1. Core Licensing & Medical Qualifications</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 3. CDL */}
                        <DocumentCard
                          title="3. Commercial Driver License (CDL)"
                          description="Front & back copy of Class A license with expiration tracking"
                          doc={selectedDriver.documents.cdl}
                          isSkipped={selectedDriver.skippedDocuments?.includes("cdl")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "cdl")
                          }
                          onPreview={() => setViewingDoc(selectedDriver.documents.cdl)}
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.cdl!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Commercial Driver License (CDL)",
                              "cdl",
                              true
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "cdl")
                          }
                        />

                        {/* 4. MEDCard */}
                        <DocumentCard
                          title="4. Medical Examiner's Certificate (MEDCard)"
                          description="DOT Physical examination certificate (NRCME certified doctor)"
                          doc={selectedDriver.documents.medCard}
                          isSkipped={selectedDriver.skippedDocuments?.includes("medCard")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "medCard")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.medCard)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.medCard!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Medical Examiner Card (MEDCard)",
                              "medCard",
                              true
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "medCard")
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* FOLDER 2: SAFETY BACKGROUND & QUALIFICATION */}
                  {(activeFolderTab === "all" ||
                    activeFolderTab === "safety") && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <span>2. Background, Safety & Clearinghouse</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. MVR */}
                        <DocumentCard
                          title="1. Motor Vehicle Record (MVR)"
                          description="36-month official state driving violation lookback"
                          doc={selectedDriver.documents.mvr}
                          isSkipped={selectedDriver.skippedDocuments?.includes("mvr")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "mvr")
                          }
                          onPreview={() => setViewingDoc(selectedDriver.documents.mvr)}
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.mvr!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Motor Vehicle Record (MVR)",
                              "mvr",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "mvr")
                          }
                        />

                        {/* 5. Clearinghouse */}
                        <DocumentCard
                          title="5. FMCSA Clearinghouse Query"
                          description="Annual query / Pre-employment electronic consent record"
                          doc={selectedDriver.documents.clearingHouse}
                          isSkipped={selectedDriver.skippedDocuments?.includes("clearingHouse")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(
                              selectedDriver.id,
                              "clearingHouse"
                            )
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.clearingHouse)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.clearingHouse!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "FMCSA Clearinghouse Record",
                              "clearingHouse",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "clearingHouse")
                          }
                        />

                        {/* 2. PSP Authorization */}
                        <DocumentCard
                          title="2. PSP Authorization"
                          description="Driver signed electronic consent for FMCSA crash & inspection report"
                          doc={selectedDriver.documents.pspAuth}
                          isSkipped={selectedDriver.skippedDocuments?.includes("pspAuth")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "pspAuth")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.pspAuth)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.pspAuth!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "PSP Authorization",
                              "pspAuth",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "pspAuth")
                          }
                        />

                        {/* 2.1 PSP Driver Report */}
                        <DocumentCard
                          title="2.1 PSP Driver Report"
                          description="FMCSA Pre-Employment Screening Program official 5-year crash & 3-year inspection history"
                          doc={selectedDriver.documents.pspReport}
                          isSkipped={selectedDriver.skippedDocuments?.includes("pspReport")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "pspReport")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.pspReport)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.pspReport!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "PSP Driver Report",
                              "pspReport",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(selectedDriver.id, "pspReport")
                          }
                        />

                        {/* Onboarding Document */}
                        <DocumentCard
                          title="Onboarding Document & Handbook"
                          description="Company driver handbook receipt, safety policies & orientation packet"
                          doc={selectedDriver.documents.onboardingDoc}
                          isSkipped={selectedDriver.skippedDocuments?.includes("onboardingDoc")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(
                              selectedDriver.id,
                              "onboardingDoc"
                            )
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.onboardingDoc)
                          }
                          onDownload={() =>
                            downloadDocument(
                              selectedDriver.documents.onboardingDoc!
                            )
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Onboarding Document",
                              "onboardingDoc",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "onboardingDoc"
                            )
                          }
                        />

                        {/* 6. Application Link & File */}
                        <div className="p-4 rounded-xl border bg-slate-50/70 border-slate-200 md:col-span-2 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <LinkIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900 text-sm">
                                  6. Driver Application (Web Link & Signed Form)
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                  Digital portal application link or signed paper application file
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* URL Input */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-semibold text-slate-600 block">
                                IntelliApp / Driver Application URL:
                              </label>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="url"
                                  value={selectedDriver.documents.applicationLink}
                                  onChange={(e) =>
                                    updateDriverApplicationLink(
                                      selectedDriver.id,
                                      e.target.value
                                    )
                                  }
                                  placeholder="https://intelli-app.com/driver-app/..."
                                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {selectedDriver.documents.applicationLink && (
                                  <a
                                    href={selectedDriver.documents.applicationLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    title="Open link"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Application PDF Document */}
                            <div>
                              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                                Signed Application File:
                              </label>
                              {selectedDriver.documents.applicationFile ? (
                                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs">
                                  <span className="truncate max-w-[160px] font-medium text-slate-800">
                                    {selectedDriver.documents.applicationFile.name}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() =>
                                        setViewingDoc(
                                          selectedDriver.documents.applicationFile
                                        )
                                      }
                                      className="p-1 text-slate-600 hover:text-blue-600"
                                      title="Preview"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        downloadDocument(
                                          selectedDriver.documents.applicationFile!
                                        )
                                      }
                                      className="p-1 text-slate-600 hover:text-blue-600"
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        removeDriverDocument(
                                          selectedDriver.id,
                                          "applicationFile"
                                        )
                                      }
                                      className="p-1 text-slate-400 hover:text-red-600"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    openDocumentUploader(
                                      "Driver Application Document",
                                      "applicationFile",
                                      false
                                    )
                                  }
                                  className="w-full py-1.5 px-3 text-xs font-medium text-blue-600 bg-white hover:bg-blue-50 border border-slate-200 rounded-lg inline-flex items-center justify-center space-x-1.5"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Attach Signed App (PDF)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* FOLDER 3: DRUG TESTING SUITE & MONTHLY FMCSA RANDOMS */}
                  {(activeFolderTab === "all" || activeFolderTab === "drug") && (
                    <div className="space-y-4 p-5 bg-gradient-to-br from-blue-50/40 to-slate-50/60 rounded-2xl border border-blue-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                            <FlaskConical className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              3. DOT Drug & Alcohol Compliance Suite
                            </h4>
                            <p className="text-xs text-slate-500">
                              Custody forms, ePassports, and monthly FMCSA random pull test results.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            openDocumentUploader(
                              "Drug Test Result",
                              null,
                              false,
                              true
                            )
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Random Drug Test Result</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 7. Drug Test Custody Form */}
                        <DocumentCard
                          title="7. Drug Test Custody Form (CCF)"
                          description="Chain of custody form for laboratory urine collection"
                          doc={selectedDriver.documents.drugCustodyForm}
                          isSkipped={selectedDriver.skippedDocuments?.includes("drugCustodyForm")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "drugCustodyForm")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.drugCustodyForm)
                          }
                          onDownload={() =>
                            downloadDocument(
                              selectedDriver.documents.drugCustodyForm!
                            )
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Drug Test Custody Form (CCF)",
                              "drugCustodyForm",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "drugCustodyForm"
                            )
                          }
                        />

                        {/* 8. Drug Test ePassport */}
                        <DocumentCard
                          title="8. Drug Test ePassport"
                          description="Electronic clinic authorization ticket (Quest / Labcorp / Concentra)"
                          doc={selectedDriver.documents.drugPassport}
                          isSkipped={selectedDriver.skippedDocuments?.includes("drugPassport")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "drugPassport")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.drugPassport)
                          }
                          onDownload={() =>
                            downloadDocument(
                              selectedDriver.documents.drugPassport!
                            )
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Drug Test ePassport",
                              "drugPassport",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "drugPassport"
                            )
                          }
                        />
                      </div>

                      {/* 9. DRUG TEST RESULTS (MULTI-FILE VAULT) */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                              9. Drug Test Results Vault (Multi-file FMCSA History)
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Stores recurring monthly random FMCSA picks, pre-employment, and post-accident results.
                            </p>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
                            {selectedDriver.documents.drugTestResults.length} Tests Logged
                          </span>
                        </div>

                        {selectedDriver.documents.drugTestResults.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                            No drug test results on file yet. Click &ldquo;+ Add Random Drug Test Result&rdquo; above.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedDriver.documents.drugTestResults.map(
                              (testDoc) => (
                                <div
                                  key={testDoc.id}
                                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-slate-900 text-xs">
                                        {testDoc.name}
                                      </span>
                                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                                        {testDoc.testType || "Random FMCSA"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                                      <span>Test Date: <strong className="text-slate-700">{testDoc.testDate || "N/A"}</strong></span>
                                      <span>•</span>
                                      <span>Result: <strong className="text-emerald-700">NEGATIVE</strong></span>
                                      {testDoc.notes && (
                                        <>
                                          <span>•</span>
                                          <span className="italic">{testDoc.notes}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1.5 self-end sm:self-center">
                                    <button
                                      onClick={() => setViewingDoc(testDoc)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white border border-slate-200 rounded-md"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View</span>
                                    </button>
                                    <button
                                      onClick={() => downloadDocument(testDoc)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white border border-slate-200 rounded-md"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </button>
                                    <button
                                      onClick={() =>
                                        removeDriverDrugTestResult(
                                          selectedDriver.id,
                                          testDoc.id
                                        )
                                      }
                                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                                      title="Delete test"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* FOLDER 4: BANKING & TAX */}
                  {(activeFolderTab === "all" ||
                    activeFolderTab === "payroll") && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <Building className="w-4 h-4 text-teal-600" />
                        <span>4. Banking, Tax ID & Direct Deposit</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 10. Bank Information Doc */}
                        <DocumentCard
                          title="10. Bank Information / Voided Check"
                          description="Direct deposit authorization form or voided check for payroll"
                          doc={selectedDriver.documents.bankInfoDoc}
                          isSkipped={selectedDriver.skippedDocuments?.includes("bankInfoDoc")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "bankInfoDoc")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.bankInfoDoc)
                          }
                          onDownload={() =>
                            downloadDocument(
                              selectedDriver.documents.bankInfoDoc!
                            )
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Bank Information Document",
                              "bankInfoDoc",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "bankInfoDoc"
                            )
                          }
                        />

                        {/* 11. EIN Letter */}
                        <DocumentCard
                          title="11. EIN Letter / W-9 Verification"
                          description="IRS Employer Identification Number confirmation or signed W-9"
                          doc={selectedDriver.documents.einLetter}
                          isSkipped={selectedDriver.skippedDocuments?.includes("einLetter")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "einLetter")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.einLetter)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.einLetter!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "EIN Letter / W9",
                              "einLetter",
                              false
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "einLetter"
                            )
                          }
                        />

                        {/* 12. Driver Lease Agreement */}
                        <DocumentCard
                          title="12. Driver Lease / Contractor Agreement"
                          description="Independent contractor agreement or truck lease agreement for owner-operators"
                          doc={selectedDriver.documents.leaseAgreement}
                          isSkipped={selectedDriver.skippedDocuments?.includes("leaseAgreement")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "leaseAgreement")
                          }
                          onPreview={() =>
                            setViewingDoc(selectedDriver.documents.leaseAgreement)
                          }
                          onDownload={() =>
                            downloadDocument(selectedDriver.documents.leaseAgreement!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Driver Lease Agreement",
                              "leaseAgreement",
                              true
                            )
                          }
                          onRemove={() =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "leaseAgreement"
                            )
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* FOLDER 5: DRIVER DOT RECORDS (ROADSIDE INSPECTIONS) */}
                  {(activeFolderTab === "all" ||
                    activeFolderTab === "dot") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          <span>5. Driver DOT Roadside Inspection Records</span>
                        </div>
                        <button
                          onClick={() =>
                            openDocumentUploader(
                              "Driver DOT Inspection Record",
                              null,
                              false,
                              false,
                              true
                            )
                          }
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add DOT Record</span>
                        </button>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                              State & Federal Roadside Inspection Vault
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Highway patrol inspection reports, weigh station pull-ins, and safety violations or clean inspection records.
                            </p>
                          </div>
                          <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
                            {(selectedDriver.documents.dotRecords || []).length} Records Logged
                          </span>
                        </div>

                        {(!selectedDriver.documents.dotRecords ||
                          selectedDriver.documents.dotRecords.length === 0) ? (
                          <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                            <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="font-semibold text-slate-600">No Driver DOT Records On File</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              Click &ldquo;+ Add DOT Record&rdquo; above to attach roadside reports with inspection date and result.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedDriver.documents.dotRecords.map(
                              (dotDoc) => (
                                <div
                                  key={dotDoc.id}
                                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                                >
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-semibold text-slate-900 text-xs">
                                        {dotDoc.name}
                                      </span>
                                      {dotDoc.inspectionLevel && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-800">
                                          {dotDoc.inspectionLevel}
                                        </span>
                                      )}
                                      <span
                                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                          dotDoc.inspectionResult === "Violations Noted"
                                            ? "bg-amber-100 text-amber-800"
                                            : "bg-emerald-100 text-emerald-800"
                                        }`}
                                      >
                                        {dotDoc.inspectionResult || "Clean / No Violations"}
                                      </span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        <span>Inspection Date: <strong className="text-slate-700">{dotDoc.recordDate || "N/A"}</strong></span>
                                      </span>
                                      <span>•</span>
                                      <span>Size: {(dotDoc.fileSize / 1024).toFixed(0)} KB</span>
                                      {dotDoc.notes && (
                                        <>
                                          <span>•</span>
                                          <span className="italic text-slate-600">{dotDoc.notes}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1.5 self-end sm:self-center">
                                    <button
                                      onClick={() => setViewingDoc(dotDoc)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white border border-slate-200 rounded-md"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View</span>
                                    </button>
                                    <button
                                      onClick={() => downloadDocument(dotDoc)}
                                      className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-blue-600 bg-white border border-slate-200 rounded-md"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Download</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (
                                          confirm(
                                            `Delete DOT record ${dotDoc.name}?`
                                          )
                                        ) {
                                          removeDriverDotRecord(
                                            selectedDriver.id,
                                            dotDoc.id
                                          );
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                                      title="Delete DOT record"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">
                No Driver Selected
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Driver Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingDriver
                    ? `Edit Driver: ${editingDriver.firstName} ${editingDriver.lastName}`
                    : "Add New Driver"}
                </h3>
                <p className="text-xs text-slate-500">
                  Zdunje Trucking LLC Driver Qualification Record
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
              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) =>
                      setFormData({ ...formData, middleName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* DOB, Phone, State, License */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfBirth: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(312) 555-0100"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    CDL State
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="IL"
                    className="w-full px-3 py-2 text-sm uppercase font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    License # (CDL)
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        licenseNumber: e.target.value,
                      })
                    }
                    placeholder="M1234567"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Status & Assigned Truck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Driver Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as DriverStatus,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Active">Active / On Duty</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Assigned Power Unit (Truck)
                  </label>
                  <select
                    value={formData.assignedTruckId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedTruckId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- No Truck Assigned --</option>
                    {trucks.map((t) => (
                      <option key={t.id} value={t.id}>
                        Unit #{t.unitNumber} ({t.make} {t.model})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bank Info Fields */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Direct Deposit & Banking Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bankName}
                      onChange={(e) =>
                        setFormData({ ...formData, bankName: e.target.value })
                      }
                      placeholder="Chase, BofA, etc."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Routing Number (9 Digits)
                    </label>
                    <input
                      type="text"
                      value={formData.routingNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          routingNumber: e.target.value,
                        })
                      }
                      placeholder="071000013"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accountNumber: e.target.value,
                        })
                      }
                      placeholder="4829104829"
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Application Link */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Driver Application Portal Link
                </label>
                <input
                  type="url"
                  value={formData.applicationLink}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicationLink: e.target.value,
                    })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
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
                  placeholder="Safety record notes, preferred lanes, emergency contact..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                >
                  {editingDriver ? "Update Driver" : "Save Driver"}
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
          selectedDriver
            ? `${selectedDriver.firstName} ${selectedDriver.lastName}`
            : undefined
        }
      />

      {/* Document Upload Modal */}
      {selectedDriver && uploadCategory && (
        <DocumentUploadModal
          isOpen={!!uploadCategory}
          onClose={() => {
            setUploadCategory(null);
            setUploadKey(null);
            setIsDrugTestUpload(false);
            setIsDotRecordUpload(false);
          }}
          category={uploadCategory}
          targetName={`${selectedDriver.firstName} ${selectedDriver.lastName}`}
          hasExpiration={hasExpiration}
          isDrugTestResult={isDrugTestUpload}
          isDotRecord={isDotRecordUpload}
          onUpload={(doc) => {
            if (isDrugTestUpload) {
              addDriverDrugTestResult(selectedDriver.id, doc);
            } else if (isDotRecordUpload) {
              addDriverDotRecord(selectedDriver.id, doc);
            } else if (uploadKey) {
              uploadDriverDocument(selectedDriver.id, uploadKey, doc);
            }
          }}
        />
      )}
    </div>
  );
}

// Reusable Document Card Component
interface DocumentCardProps {
  title: string;
  description: string;
  doc: FleetDocument | null | undefined;
  isSkipped?: boolean;
  onToggleSkip?: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onUpload: () => void;
  onRemove: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  description,
  doc,
  isSkipped = false,
  onToggleSkip,
  onPreview,
  onDownload,
  onUpload,
  onRemove,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
        doc
          ? "bg-white border-slate-200 hover:border-emerald-300 shadow-xs"
          : isSkipped
          ? "bg-slate-50/70 border-dashed border-slate-300 opacity-80"
          : "bg-red-50/20 border-dashed border-red-300 hover:border-red-400 shadow-xs"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                doc
                  ? "bg-emerald-50 text-emerald-600"
                  : isSkipped
                  ? "bg-slate-200 text-slate-500"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-900 text-sm truncate" title={title}>
                {title}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-1">{description}</p>
            </div>
          </div>

          {doc ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center space-x-1 shrink-0">
              <CheckCircle className="w-3 h-3 mr-0.5" />
              <span>On File</span>
            </span>
          ) : isSkipped ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full shrink-0">
              ⚪ Skipped (N/A)
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-full flex items-center space-x-1 shrink-0">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Missing</span>
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
                Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
              </span>
              <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
            </div>
            {doc.expirationDate && (
              <p className="text-[11px] font-semibold text-emerald-700 flex items-center space-x-1 pt-0.5">
                <span>Expires: {doc.expirationDate}</span>
              </p>
            )}
          </div>
        )}

        {!doc && isSkipped && (
          <div className="mt-2.5 p-2 bg-slate-100/60 rounded-lg text-[11px] text-slate-500 italic">
            Marked as exempt / not necessary for this driver.
          </div>
        )}

        {!doc && !isSkipped && (
          <div className="mt-2.5 p-2 bg-red-50/60 border border-red-100 rounded-lg text-[11px] text-red-700 font-medium">
            Required document for driver qualification file.
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {doc ? (
          <>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onPreview}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                onClick={onDownload}
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-emerald-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
            <button
              onClick={() => {
                if (window.confirm(`Remove ${title} from this driver?`)) {
                  onRemove();
                }
              }}
              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
              title="Remove file"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : isSkipped ? (
          <div className="w-full flex items-center justify-between gap-2">
            {onToggleSkip && (
              <button
                onClick={onToggleSkip}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Mark as Required
              </button>
            )}
            <button
              onClick={onUpload}
              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors ml-auto"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Anyway</span>
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2">
            <button
              onClick={onUpload}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
            {onToggleSkip && (
              <button
                onClick={onToggleSkip}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                title="Mark this document as not required / exempt for this driver"
              >
                <span>Skip (N/A)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function DriversPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading drivers...</div>
      }
    >
      <DriversContent />
    </React.Suspense>
  );
}

