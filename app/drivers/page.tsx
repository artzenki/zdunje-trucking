"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Mail,
  UserX,
  UserCheck,
  UserMinus,
  FileBadge,
  Save,
  ChevronDown,
  ChevronUp,
  History,
  Clock,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";
import { uploadFileToSupabaseStorage } from "@/lib/documentStorage";

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
  { key: "applicationFile", label: "Signed Driver Application", category: "Application Link" },
  { key: "onboardingDoc", label: "Onboarding Document / Handbook", category: "Onboarding Document" },
  { key: "drugCustodyForm", label: "Drug Custody Form (CCF)", category: "Drug Test Custody Form" },
  { key: "drugPassport", label: "Drug Test ePassport", category: "Drug Test ePassport" },
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

  // Check file-based required documents
  DRIVER_REQUIRED_DOC_KEYS.forEach(({ key }) => {
    const isSkipped = skipped.includes(key);
    let hasDoc = false;
    if (key === "drugCustodyForm") {
      hasDoc = !!driver.documents.drugCustodyForm || ((driver.documents.custodyForms || []).length > 0);
    } else if (key === "drugPassport") {
      hasDoc = !!driver.documents.drugPassport || ((driver.documents.ePassports || []).length > 0);
    } else {
      hasDoc = !!driver.documents[key];
    }

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

  // FMCSA Clearinghouse Query Checkbox
  const clearingHouseSkipped = skipped.includes("clearingHouse");
  if (clearingHouseSkipped) {
    skippedCount++;
  } else {
    totalRequired++;
    if (driver.clearingHouseQuery || driver.documents.clearingHouse) {
      uploadedCount++;
    } else {
      missingCount++;
      missingKeys.push("clearingHouse");
    }
  }

  // Bank Info (Account & Routing Numbers)
  const bankInfoSkipped = skipped.includes("bankInfo") || skipped.includes("bankInfoDoc");
  if (bankInfoSkipped) {
    skippedCount++;
  } else {
    totalRequired++;
    if (driver.bankInfo?.accountNumber?.trim() && driver.bankInfo?.routingNumber?.trim()) {
      uploadedCount++;
    } else {
      missingCount++;
      missingKeys.push("bankInfo");
    }
  }

  const totalCount = uploadedCount + missingCount + skippedCount;
  const percentage =
    totalCount > 0
      ? missingCount === 0
        ? 100
        : Math.round(((uploadedCount + skippedCount) / totalCount) * 100)
      : 100;
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
    applicants,
    trucks,
    trailers,
    addDriver,
    updateDriver,
    updateTrailer,
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
  } = useFleet();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [complianceFilter, setComplianceFilter] = useState<
    "all" | "missing" | "compliant"
  >("all");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Active Folder Tab in Driver View
  const [activeFolderTab, setActiveFolderTab] = useState<
    "all" | "license" | "drug" | "safety" | "payroll" | "dot" | "termination"
  >("all");
  const [showSkippedDocs, setShowSkippedDocs] = useState(false);

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
  const [isEPassportUpload, setIsEPassportUpload] = useState(false);
  const [isCustodyFormUpload, setIsCustodyFormUpload] = useState(false);
  const [isDotRecordUpload, setIsDotRecordUpload] = useState(false);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [droppedFileToUpload, setDroppedFileToUpload] = useState<File | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "1988-05-15",
    email: "",
    phone: "",
    state: "IL",
    licenseNumber: "",
    status: "Active" as DriverStatus,
    assignedTruckId: "",
    assignedTrailerId: "",
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

  // Quick-edit Bank Info State for selected driver
  const [quickBank, setQuickBank] = useState({
    accountNumber: "",
    routingNumber: "",
    bankInfo: "",
  });
  const [bankSavedNotification, setBankSavedNotification] = useState(false);

  useEffect(() => {
    if (selectedDriver) {
      setQuickBank({
        accountNumber: selectedDriver.bankInfo?.accountNumber || "",
        routingNumber: selectedDriver.bankInfo?.routingNumber || "",
        bankInfo:
          selectedDriver.bankInfo?.bankInfo ||
          selectedDriver.bankInfo?.bankName ||
          "",
      });
    }
  }, [selectedDriver]);

  const handleSaveQuickBank = () => {
    if (!selectedDriver) return;
    updateDriver(selectedDriver.id, {
      bankInfo: {
        accountNumber: quickBank.accountNumber.trim(),
        routingNumber: quickBank.routingNumber.trim(),
        bankInfo: quickBank.bankInfo.trim(),
        bankName: quickBank.bankInfo.trim(),
      },
    });
    setBankSavedNotification(true);
    setTimeout(() => setBankSavedNotification(false), 2500);
  };

  const selectedCompliance = useMemo(
    () => (selectedDriver ? getDriverCompliance(selectedDriver) : null),
    [selectedDriver]
  );

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const fullName = `${d.firstName} ${d.middleName} ${d.lastName}`.toLowerCase();
      const matchSearch =
        fullName.includes(search.toLowerCase()) ||
        (d.email && d.email.toLowerCase().includes(search.toLowerCase())) ||
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
      email: "",
      phone: "",
      state: "IL",
      licenseNumber: "",
      status: "Active",
      assignedTruckId: "",
      assignedTrailerId: "",
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
    // Find trailer coupled to this truck
    const coupledTrailer = driver.assignedTruckId
      ? trailers.find((tr) => tr.assignedTruckId === driver.assignedTruckId)
      : null;

    setFormData({
      firstName: driver.firstName,
      middleName: driver.middleName,
      lastName: driver.lastName,
      dateOfBirth: driver.dateOfBirth,
      email: driver.email || "",
      phone: driver.phone,
      state: driver.state,
      licenseNumber: driver.licenseNumber,
      status: driver.status,
      assignedTruckId: driver.assignedTruckId || "",
      assignedTrailerId: coupledTrailer ? coupledTrailer.id : "",
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
      email: formData.email.trim() || undefined,
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

    // Sync Trailer Coupling: If a trailer is selected and a truck is selected, couple trailer to that truck
    if (payload.assignedTruckId && formData.assignedTrailerId) {
      const selectedTr = trailers.find((tr) => tr.id === formData.assignedTrailerId);
      if (selectedTr && selectedTr.assignedTruckId !== payload.assignedTruckId) {
        updateTrailer(selectedTr.id, { assignedTruckId: payload.assignedTruckId });
      }
    } else if (payload.assignedTruckId && !formData.assignedTrailerId) {
      // If user explicitly cleared the trailer for this truck
      const existingCoupledTrailer = trailers.find((tr) => tr.assignedTruckId === payload.assignedTruckId);
      if (existingCoupledTrailer) {
        updateTrailer(existingCoupledTrailer.id, { assignedTruckId: null });
      }
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
    isDotRecord = false,
    file: File | null = null,
    isEPassport = false,
    isCustodyForm = false
  ) => {
    setUploadCategory(categoryName);
    setUploadKey(key);
    setHasExpiration(expires);
    setIsDrugTestUpload(isDrugTest);
    setIsDotRecordUpload(isDotRecord);
    setIsEPassportUpload(isEPassport);
    setIsCustodyFormUpload(isCustodyForm);
    setDroppedFileToUpload(file);
  };

  const handleUpdateDocumentExpiration = (
    categoryKey: keyof Omit<
      DriverType["documents"],
      "drugTestResults" | "custodyForms" | "ePassports" | "applicationLink" | "dotRecords"
    >,
    newExpirationDate: string,
    histId?: string
  ) => {
    if (!selectedDriver) return;
    const currentDoc = selectedDriver.documents[categoryKey];
    if (!currentDoc) return;

    if (histId) {
      const updatedHistory = (currentDoc.history || []).map((h) =>
        h.id === histId ? { ...h, expirationDate: newExpirationDate } : h
      );
      uploadDriverDocument(selectedDriver.id, categoryKey, {
        ...currentDoc,
        history: updatedHistory,
      });
    } else {
      uploadDriverDocument(selectedDriver.id, categoryKey, {
        ...currentDoc,
        expirationDate: newExpirationDate,
      });
    }
  };

  const handleDirectDropEPassport = async (file: File) => {
    if (!selectedDriver) return;
    try {
      const uploadRes = await uploadFileToSupabaseStorage(
        file,
        file.name,
        "drivers"
      );
      const newDoc: FleetDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        category: "Drug Test ePassport",
        fileType: file.type || "application/pdf",
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: uploadRes.fileUrl,
        isCurrent: true,
        status: "current",
      };
      addDriverEPassport(selectedDriver.id, newDoc);
    } catch (err) {
      console.error("ePassport direct drop failed", err);
      alert("Failed to process dropped ePassport file.");
    }
  };

  const handleDirectDropCustodyForm = async (file: File) => {
    if (!selectedDriver) return;
    try {
      const uploadRes = await uploadFileToSupabaseStorage(
        file,
        file.name,
        "drivers"
      );
      const newDoc: FleetDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        category: "Drug Test Custody Form (CCF)",
        fileType: file.type || "application/pdf",
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        fileData: uploadRes.fileUrl,
        isCurrent: true,
        status: "current",
      };
      addDriverCustodyForm(selectedDriver.id, newDoc);
    } catch (err) {
      console.error("Custody Form direct drop failed", err);
      alert("Failed to process dropped Custody Form file.");
    }
  };

  const handleDirectDropDriverDoc = async (
    categoryKey: keyof Omit<
      DriverType["documents"],
      "drugTestResults" | "applicationLink" | "dotRecords"
    >,
    categoryName: string,
    file: File
  ) => {
    if (!selectedDriver) return;

    // For documents with expirations (like CDL and MEDCard), open the uploader with the file pre-attached so user can enter/verify expiration date!
    if (categoryKey === "cdl" || categoryKey === "medCard") {
      openDocumentUploader(categoryName, categoryKey, true, false, false, file);
      return;
    }

    try {
      const uploadRes = await uploadFileToSupabaseStorage(
        file,
        file.name,
        "drivers"
      );
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
      uploadDriverDocument(selectedDriver.id, categoryKey, newDoc);
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

      {/* Driver / Applicant Tab Switcher */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-2">
        <Link
          href="/drivers"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white shadow-xs"
        >
          <Users className="w-4 h-4" />
          <span>Active Fleet Drivers</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-emerald-400 font-extrabold">
            {drivers.length}
          </span>
        </Link>
        <Link
          href="/applicants"
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>Driver Applicants (Onboarding & MVR / PSP)</span>
          {(applicants || []).length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-extrabold">
              {(applicants || []).length}
            </span>
          )}
        </Link>
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
                const coupledTrailer = assignedTruck
                  ? trailers.find((tr) => tr.assignedTruckId === assignedTruck.id)
                  : null;
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
                              : driver.status === "Inactive"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {driver.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{driver.phone || "No phone"}</span>
                        </span>
                        {driver.email && (
                          <span className="flex items-center space-x-1 truncate max-w-[140px]" title={driver.email}>
                            <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{driver.email}</span>
                          </span>
                        )}
                      </div>

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
                              ? `Unit #${assignedTruck.unitNumber}${coupledTrailer ? ` + TR #${coupledTrailer.unitNumber}` : ""}`
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
                              : selectedDriver.status === "Inactive"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {selectedDriver.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>DOB: {selectedDriver.dateOfBirth}</span>
                        <span>•</span>
                        <span>
                          CDL State:{" "}
                          <strong className="text-slate-700 font-mono">
                            {selectedDriver.state}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          License #:{" "}
                          <strong className="text-slate-700 font-mono">
                            {selectedDriver.licenseNumber}
                          </strong>
                        </span>
                        {selectedDriver.email && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center space-x-1 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-emerald-600 inline" />
                              <a
                                href={`mailto:${selectedDriver.email}`}
                                className="font-semibold text-emerald-700 hover:underline"
                              >
                                {selectedDriver.email}
                              </a>
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const willBeInactive = selectedDriver.status !== "Inactive";
                        updateDriver(selectedDriver.id, {
                          status: willBeInactive ? "Inactive" : "Active",
                        });
                        if (willBeInactive && !selectedDriver.documents.terminationDoc) {
                          openDocumentUploader(
                            "Driver Termination Document",
                            "terminationDoc",
                            false
                          );
                        }
                      }}
                      className={`inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        selectedDriver.status === "Inactive"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                      }`}
                      title={
                        selectedDriver.status === "Inactive"
                          ? "Set driver to Active"
                          : "Set driver to Inactive"
                      }
                    >
                      {selectedDriver.status === "Inactive" ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Activate Driver</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5 text-amber-700" />
                          <span>Make Inactive</span>
                        </>
                      )}
                    </button>
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

                {selectedDriver.status === "Inactive" && (
                  <div className="mt-4 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-amber-900">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Driver is currently Inactive:</strong> Not available for dispatch or load assignments.
                        </span>
                      </div>
                      <button
                        onClick={() => updateDriver(selectedDriver.id, { status: "Active" })}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shrink-0 transition-colors shadow-xs"
                      >
                        Reactivate Driver
                      </button>
                    </div>

                    {/* Termination Record Slot */}
                    <div className="pt-2 border-t border-amber-200/60">
                      <DocumentCard
                        showSkippedDocs={true}
                        isOptional={true}
                        emptyStateBadge="Optional / Offboarding"
                        emptyStateText="Separation notice / offboarding record (optional for driver qualification file)."
                        title="Driver Termination / Offboarding Notice"
                        description="Signed termination notice, separation agreement, resignation letter, or exit document"
                        doc={selectedDriver.documents.terminationDoc}
                        badgeText="INACTIVE RECORD"
                        badgeColor="bg-rose-100 text-rose-800 border-rose-300"
                        accentBorder={selectedDriver.documents.terminationDoc ? "bg-white border-rose-200" : "bg-slate-50/70 border-dashed border-slate-300"}
                        onPreview={(tDoc) => setViewingDoc(tDoc || selectedDriver.documents.terminationDoc || null)}
                        onDownload={(tDoc) =>
                          downloadDocument(tDoc || selectedDriver.documents.terminationDoc!)
                        }
                        onUpload={() =>
                          openDocumentUploader(
                            "Driver Termination Document",
                            "terminationDoc",
                            false
                          )
                        }
                        onRemove={(histId) =>
                          removeDriverDocument(selectedDriver.id, "terminationDoc", histId)
                        }
                        onDirectDrop={(file) =>
                          handleDirectDropDriverDoc("terminationDoc", "Driver Termination Document", file)
                        }
                      />
                    </div>
                  </div>
                )}

                {/* Specs & Bank Info Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block uppercase">
                      Contact & Assigned Unit
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedDriver.phone || "No phone"}</span>
                    </span>
                    {selectedDriver.email ? (
                      <a
                        href={`mailto:${selectedDriver.email}`}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center space-x-1.5 mt-1 truncate"
                        title={selectedDriver.email}
                      >
                        <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{selectedDriver.email}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center space-x-1.5 mt-1 italic">
                        <Mail className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        <span>No email on file</span>
                      </span>
                    )}
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 space-y-0.5 text-xs text-slate-600">
                      <div>
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
                      </div>
                      {selectedDriver.assignedTruckId && (
                        <div>
                          Trailer:{" "}
                          <strong className="text-slate-800">
                            {trailers.find((tr) => tr.assignedTruckId === selectedDriver.assignedTruckId)
                              ? `Unit #${
                                  trailers.find(
                                    (tr) => tr.assignedTruckId === selectedDriver.assignedTruckId
                                  )?.unitNumber
                                }`
                              : "None coupled"}
                          </strong>
                        </div>
                      )}
                    </div>
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
                        <span className="text-slate-400">1. Account #: </span>
                        <strong className="text-slate-800 font-mono">
                          {selectedDriver.bankInfo?.accountNumber || "Not recorded"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">2. Routing #: </span>
                        <strong className="text-slate-800 font-mono">
                          {selectedDriver.bankInfo?.routingNumber || "Not recorded"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400">3. Bank Info: </span>
                        <strong className="text-slate-800">
                          {selectedDriver.bankInfo?.bankInfo || selectedDriver.bankInfo?.bankName || "Not recorded"}
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                        Drug Testing ({(selectedDriver.documents.drugTestResults || []).length + (selectedDriver.documents.ePassports || []).length + (selectedDriver.documents.custodyForms || []).length})
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
                      {(selectedDriver.status === "Inactive" || selectedDriver.documents.terminationDoc) && (
                        <button
                          onClick={() => setActiveFolderTab("termination")}
                          className={`px-3 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1.5 ${
                            activeFolderTab === "termination"
                              ? "bg-rose-600 text-white"
                              : "text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200"
                          }`}
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          <span>Termination</span>
                        </button>
                      )}
                    </div>

                    {(selectedDriver.skippedDocuments?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSkippedDocs(!showSkippedDocs)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center space-x-1.5 ${
                          showSkippedDocs
                            ? "bg-slate-800 text-white border-slate-900"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Toggle visibility of exempt/skipped document slots"
                      >
                        <span>{showSkippedDocs ? "Hide Skipped" : `Show Skipped (${selectedDriver.skippedDocuments?.length})`}</span>
                      </button>
                    )}
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
                          showSkippedDocs={showSkippedDocs}
                          title="3. Commercial Driver License (CDL)"
                          description="Front & back copy of Class A license with expiration tracking"
                          doc={selectedDriver.documents.cdl}
                          isSkipped={selectedDriver.skippedDocuments?.includes("cdl")}
                          allowExpirationEdit={true}
                          onUpdateExpiration={(newDate, histId) =>
                            handleUpdateDocumentExpiration("cdl", newDate, histId)
                          }
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "cdl")
                          }
                          onPreview={(tDoc) => setViewingDoc(tDoc || selectedDriver.documents.cdl)}
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.cdl!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Commercial Driver License (CDL)",
                              "cdl",
                              true
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "cdl", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("cdl", "Commercial Driver License (CDL)", file)
                          }
                        />

                        {/* 4. MEDCard */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
                          title="4. Medical Examiner's Certificate (MEDCard)"
                          description="DOT Physical examination certificate (NRCME certified doctor)"
                          doc={selectedDriver.documents.medCard}
                          isSkipped={selectedDriver.skippedDocuments?.includes("medCard")}
                          allowExpirationEdit={true}
                          onUpdateExpiration={(newDate, histId) =>
                            handleUpdateDocumentExpiration("medCard", newDate, histId)
                          }
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "medCard")
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.medCard)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.medCard!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Medical Examiner Card (MEDCard)",
                              "medCard",
                              true
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "medCard", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("medCard", "Medical Examiner Card (MEDCard)", file)
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
                          showSkippedDocs={showSkippedDocs}
                          title="1. Motor Vehicle Record (MVR)"
                          description="36-month official state driving violation lookback"
                          doc={selectedDriver.documents.mvr}
                          isSkipped={selectedDriver.skippedDocuments?.includes("mvr")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "mvr")
                          }
                          onPreview={(tDoc) => setViewingDoc(tDoc || selectedDriver.documents.mvr)}
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.mvr!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Motor Vehicle Record (MVR)",
                              "mvr",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "mvr", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("mvr", "Motor Vehicle Record (MVR)", file)
                          }
                        />

                        {/* 5. FMCSA Clearinghouse Query - Checkbox Only (No File Upload Needed) */}
                        {(!selectedDriver.skippedDocuments?.includes("clearingHouse") || selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse || showSkippedDocs) && (
                        <div
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                            selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse
                              ? "bg-white border-emerald-300 shadow-xs"
                              : selectedDriver.skippedDocuments?.includes("clearingHouse")
                              ? "bg-slate-50/70 border-dashed border-slate-300 opacity-80"
                              : "bg-red-50/20 border-dashed border-red-300 hover:border-red-400 shadow-xs"
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse
                                      ? "bg-emerald-50 text-emerald-600"
                                      : selectedDriver.skippedDocuments?.includes("clearingHouse")
                                      ? "bg-slate-200 text-slate-500"
                                      : "bg-red-100 text-red-600"
                                  }`}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-sm">
                                    5. FMCSA Clearinghouse Query
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Annual query & pre-employment consent verified in FMCSA Clearinghouse
                                  </p>
                                </div>
                              </div>

                              {selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center space-x-1 shrink-0">
                                  <CheckCircle className="w-3 h-3 mr-0.5" />
                                  <span>Verified</span>
                                </span>
                              ) : selectedDriver.skippedDocuments?.includes("clearingHouse") ? (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-600 rounded-full shrink-0">
                                  ⚪ Skipped (N/A)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center space-x-1 shrink-0">
                                  <AlertTriangle className="w-3 h-3 text-red-600" />
                                  <span>Query Pending</span>
                                </span>
                              )}
                            </div>

                            {/* Interactive Checkbox */}
                            <label className="mt-4 flex items-start space-x-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={!!(selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse)}
                                onChange={(e) => {
                                  updateDriver(selectedDriver.id, {
                                    clearingHouseQuery: e.target.checked,
                                  });
                                }}
                                className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              />
                              <div className="text-xs">
                                <span className="font-medium text-slate-800 block">
                                  FMCSA Clearinghouse Query Conducted / Verified
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Check to verify annual query results or electronic consent (no file upload required).
                                </span>
                              </div>
                            </label>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-400">
                              Status:{" "}
                              <strong className={selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse ? "text-emerald-700" : "text-amber-600"}>
                                {selectedDriver.clearingHouseQuery || selectedDriver.documents.clearingHouse ? "Query Completed" : "Not Conducted"}
                              </strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleDriverDocumentSkip(selectedDriver.id, "clearingHouse")}
                              className="p-0 text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors"
                              title="Mark clearinghouse query as not applicable (100% Compliant)"
                            >
                              {selectedDriver.skippedDocuments?.includes("clearingHouse") ? "Mark Required" : "Not Applicable"}
                            </button>
                          </div>
                        </div>
                        )}

                        {/* 2. PSP Authorization */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
                          title="2. PSP Authorization"
                          description="Driver signed electronic consent for FMCSA crash & inspection report"
                          doc={selectedDriver.documents.pspAuth}
                          isSkipped={selectedDriver.skippedDocuments?.includes("pspAuth")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "pspAuth")
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.pspAuth)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.pspAuth!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "PSP Authorization",
                              "pspAuth",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "pspAuth", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("pspAuth", "PSP Authorization", file)
                          }
                        />

                        {/* 2.1 PSP Driver Report */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
                          title="2.1 PSP Driver Report"
                          description="FMCSA Pre-Employment Screening Program official 5-year crash & 3-year inspection history"
                          doc={selectedDriver.documents.pspReport}
                          isSkipped={selectedDriver.skippedDocuments?.includes("pspReport")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "pspReport")
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.pspReport)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.pspReport!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "PSP Driver Report",
                              "pspReport",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "pspReport", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("pspReport", "PSP Driver Report", file)
                          }
                        />

                        {/* Onboarding Document */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
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
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.onboardingDoc)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(
                              tDoc || selectedDriver.documents.onboardingDoc!
                            )
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Onboarding Document",
                              "onboardingDoc",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "onboardingDoc",
                              histId
                            )
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("onboardingDoc", "Onboarding Document", file)
                          }
                        />

                        {/* 6. Application Link & File */}
                        {(!selectedDriver.skippedDocuments?.includes("applicationFile") || selectedDriver.documents.applicationFile || selectedDriver.documents.applicationLink || showSkippedDocs) && (
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
                        )}
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

                        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-2">
                          <button
                            onClick={() =>
                              openDocumentUploader(
                                "Drug Test Custody Form (CCF)",
                                null,
                                false,
                                false,
                                false,
                                null,
                                false,
                                true
                              )
                            }
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Custody Form</span>
                          </button>
                          <button
                            onClick={() =>
                              openDocumentUploader(
                                "Drug Test ePassport",
                                null,
                                false,
                                false,
                                false,
                                null,
                                true,
                                false
                              )
                            }
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add ePassport</span>
                          </button>
                          <button
                            onClick={() =>
                              openDocumentUploader(
                                "Drug Test Result",
                                null,
                                false,
                                true
                              )
                            }
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Random Drug Test Result</span>
                          </button>
                        </div>
                      </div>

                      {/* 7. DRUG TEST CUSTODY FORMS (MULTI-FILE VAULT) */}
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleDirectDropCustodyForm(e.dataTransfer.files[0]);
                          }
                        }}
                        className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                              <span>7. Drug Test Custody & Control Forms (CCF) Vault</span>
                              <span className="text-[10px] lowercase font-normal px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded border border-teal-200">
                                multi-document
                              </span>
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Official Chain of Custody & Control Forms (CCF) for laboratory urine collection.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-teal-100 text-teal-800">
                              {(selectedDriver.documents.custodyForms || []).length} CCFs Logged
                            </span>
                            <button
                              onClick={() =>
                                openDocumentUploader(
                                  "Drug Test Custody Form (CCF)",
                                  null,
                                  false,
                                  false,
                                  false,
                                  null,
                                  false,
                                  true
                                )
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </button>
                          </div>
                        </div>

                        {(!selectedDriver.documents.custodyForms || selectedDriver.documents.custodyForms.length === 0) ? (
                          <div 
                            onClick={() =>
                              openDocumentUploader(
                                "Drug Test Custody Form (CCF)",
                                null,
                                false,
                                false,
                                false,
                                null,
                                false,
                                true
                              )
                            }
                            className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 hover:border-teal-300 hover:bg-teal-50/20 rounded-lg cursor-pointer transition-colors"
                          >
                            No custody forms on file yet. Drag & drop file here or click &ldquo;+ Add Custody Form&rdquo; above.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedDriver.documents.custodyForms || []).map((ccfDoc) => (
                              <div
                                key={ccfDoc.id}
                                className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                              >
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-slate-900 text-xs">
                                      {ccfDoc.name}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-teal-100 text-teal-800">
                                      {ccfDoc.notes || "Custody & Control Form"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                                    <span>Form Date: <strong className="text-slate-700">{ccfDoc.testDate || (ccfDoc.uploadedAt ? ccfDoc.uploadedAt.split("T")[0] : "N/A")}</strong></span>
                                    {ccfDoc.expirationDate && (
                                      <>
                                        <span>•</span>
                                        <span>Expires: <strong className="text-amber-700">{ccfDoc.expirationDate}</strong></span>
                                      </>
                                    )}
                                    {ccfDoc.notes && (
                                      <>
                                        <span>•</span>
                                        <span className="italic">{ccfDoc.notes}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 self-end sm:self-center">
                                  <button
                                    onClick={() => setViewingDoc(ccfDoc)}
                                    className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-teal-600 bg-white border border-slate-200 rounded-md"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => downloadDocument(ccfDoc)}
                                    className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-teal-600 bg-white border border-slate-200 rounded-md"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      removeDriverCustodyForm(
                                        selectedDriver.id,
                                        ccfDoc.id
                                      )
                                    }
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                    title="Delete Custody Form"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 8. DRUG TEST EPASSPORTS (MULTI-FILE VAULT) */}
                      <div 
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleDirectDropEPassport(e.dataTransfer.files[0]);
                          }
                        }}
                        className="bg-white rounded-xl border border-slate-200 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                              <span>8. Clinic Authorization ePassports Vault</span>
                              <span className="text-[10px] lowercase font-normal px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                                multi-document
                              </span>
                            </h5>
                            <p className="text-[11px] text-slate-500">
                              Electronic test authorizations and donor passes (Quest Diagnostics, Labcorp, Concentra).
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
                              {(selectedDriver.documents.ePassports || []).length} ePassports Logged
                            </span>
                            <button
                              onClick={() =>
                                openDocumentUploader(
                                  "Drug Test ePassport",
                                  null,
                                  false,
                                  false,
                                  false,
                                  null,
                                  true
                                )
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Upload</span>
                            </button>
                          </div>
                        </div>

                        {(!selectedDriver.documents.ePassports || selectedDriver.documents.ePassports.length === 0) ? (
                          <div 
                            onClick={() =>
                              openDocumentUploader(
                                "Drug Test ePassport",
                                null,
                                false,
                                false,
                                false,
                                null,
                                true
                              )
                            }
                            className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-lg cursor-pointer transition-colors"
                          >
                            No clinic ePassports on file yet. Drag & drop file here or click &ldquo;+ Add ePassport&rdquo; above.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedDriver.documents.ePassports || []).map((passDoc) => (
                              <div
                                key={passDoc.id}
                                className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
                              >
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-slate-900 text-xs">
                                      {passDoc.name}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-800">
                                      {passDoc.clinicName || passDoc.notes || "Clinic Authorization"}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                                    <span>Auth Date: <strong className="text-slate-700">{passDoc.testDate || (passDoc.uploadedAt ? passDoc.uploadedAt.split("T")[0] : "N/A")}</strong></span>
                                    {passDoc.expirationDate && (
                                      <>
                                        <span>•</span>
                                        <span>Expires: <strong className="text-amber-700">{passDoc.expirationDate}</strong></span>
                                      </>
                                    )}
                                    {passDoc.notes && passDoc.clinicName && (
                                      <>
                                        <span>•</span>
                                        <span className="italic">{passDoc.notes}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 self-end sm:self-center">
                                  <button
                                    onClick={() => setViewingDoc(passDoc)}
                                    className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-md"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => downloadDocument(passDoc)}
                                    className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-slate-700 hover:text-indigo-600 bg-white border border-slate-200 rounded-md"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Download</span>
                                  </button>
                                  <button
                                    onClick={() =>
                                      removeDriverEPassport(
                                        selectedDriver.id,
                                        passDoc.id
                                      )
                                    }
                                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                                    title="Delete ePassport"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
                            {(selectedDriver.documents.drugTestResults || []).length} Tests Logged
                          </span>
                        </div>

                        {(!selectedDriver.documents.drugTestResults || selectedDriver.documents.drugTestResults.length === 0) ? (
                          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                            No drug test results on file yet. Click &ldquo;+ Add Random Drug Test Result&rdquo; above.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedDriver.documents.drugTestResults || []).map(
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
                        {/* 10. Direct Deposit & Bank Information (3 inputs: Account #, Routing #, Bank Info) */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <div className="p-2 rounded-lg bg-teal-50 text-teal-600 shrink-0">
                                  <CreditCard className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-slate-900 text-sm">
                                    Direct Deposit & Bank Information
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Payroll direct deposit banking details (no file upload required)
                                  </p>
                                </div>
                              </div>

                              {quickBank.accountNumber && quickBank.routingNumber ? (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center space-x-1 shrink-0">
                                  <CheckCircle className="w-3 h-3 mr-0.5" />
                                  <span>Recorded</span>
                                </span>
                              ) : selectedDriver.skippedDocuments?.includes("bankInfo") ? (
                                <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full shrink-0">
                                  ⚪ Not Applicable
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center space-x-1 shrink-0">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Incomplete</span>
                                </span>
                              )}
                            </div>

                            <div className="mt-4 space-y-3">
                              {/* 1. Account Number */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  1. Account Number
                                </label>
                                <input
                                  type="text"
                                  value={quickBank.accountNumber}
                                  onChange={(e) =>
                                    setQuickBank((prev) => ({
                                      ...prev,
                                      accountNumber: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. 123456789"
                                  className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                              </div>

                              {/* 2. Routing Number */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  2. Routing Number (9 Digits)
                                </label>
                                <input
                                  type="text"
                                  value={quickBank.routingNumber}
                                  onChange={(e) =>
                                    setQuickBank((prev) => ({
                                      ...prev,
                                      routingNumber: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. 071000013"
                                  className="w-full h-9 px-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                              </div>

                              {/* 3. Bank Info */}
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                  3. Bank Info
                                </label>
                                <input
                                  type="text"
                                  value={quickBank.bankInfo}
                                  onChange={(e) =>
                                    setQuickBank((prev) => ({
                                      ...prev,
                                      bankInfo: e.target.value,
                                    }))
                                  }
                                  placeholder="e.g. Chase Bank, Chicago IL"
                                  className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {bankSavedNotification ? (
                                <span className="text-xs font-semibold text-emerald-600 flex items-center space-x-1">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Banking Saved!</span>
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">
                                  Updates auto-sync
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => toggleDriverDocumentSkip(selectedDriver.id, "bankInfo")}
                                className="p-0 text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors"
                                title="Mark banking information as not applicable (100% Compliant)"
                              >
                                {selectedDriver.skippedDocuments?.includes("bankInfo")
                                  ? "Mark Required"
                                  : "Not Applicable"}
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveQuickBank}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Banking</span>
                            </button>
                          </div>
                        </div>

                        {/* 11. EIN Letter */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
                          title="11. EIN Letter / W-9 Verification"
                          description="IRS Employer Identification Number confirmation or signed W-9"
                          doc={selectedDriver.documents.einLetter}
                          isSkipped={selectedDriver.skippedDocuments?.includes("einLetter")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "einLetter")
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.einLetter)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.einLetter!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "EIN Letter / W9",
                              "einLetter",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "einLetter",
                              histId
                            )
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("einLetter", "EIN Letter / W9", file)
                          }
                        />

                        {/* 12. Driver Lease Agreement */}
                        <DocumentCard
                          showSkippedDocs={showSkippedDocs}
                          title="12. Driver Lease / Contractor Agreement"
                          description="Independent contractor agreement or truck lease agreement for owner-operators"
                          doc={selectedDriver.documents.leaseAgreement}
                          isSkipped={selectedDriver.skippedDocuments?.includes("leaseAgreement")}
                          onToggleSkip={() =>
                            toggleDriverDocumentSkip(selectedDriver.id, "leaseAgreement")
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.leaseAgreement)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.leaseAgreement!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Driver Lease Agreement",
                              "leaseAgreement",
                              true
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(
                              selectedDriver.id,
                              "leaseAgreement",
                              histId
                            )
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc("leaseAgreement", "Driver Lease Agreement", file)
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

                  {/* FOLDER 6: DRIVER OFFBOARDING & TERMINATION RECORD (Only shown when driver is inactive or already has termination doc) */}
                  {(selectedDriver.status === "Inactive" || selectedDriver.documents.terminationDoc) &&
                    (activeFolderTab === "all" || activeFolderTab === "termination") && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <FileBadge className="w-4 h-4 text-rose-600" />
                        <span>6. Driver Offboarding & Separation Records</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <DocumentCard
                          showSkippedDocs={true}
                          isOptional={true}
                          emptyStateBadge="Optional / Offboarding"
                          emptyStateText="Separation notice / offboarding record (optional for driver qualification file)."
                          title="Driver Termination / Offboarding Notice"
                          description="Official separation agreement, resignation letter, exit notice, or release document"
                          doc={selectedDriver.documents.terminationDoc}
                          badgeText={selectedDriver.status === "Inactive" ? "INACTIVE RECORD" : undefined}
                          badgeColor="bg-rose-100 text-rose-800 border-rose-300"
                          accentBorder={
                            selectedDriver.documents.terminationDoc
                              ? "bg-white border-rose-200"
                              : "bg-slate-50/70 border-dashed border-slate-300"
                          }
                          onPreview={(tDoc) =>
                            setViewingDoc(tDoc || selectedDriver.documents.terminationDoc || null)
                          }
                          onDownload={(tDoc) =>
                            downloadDocument(tDoc || selectedDriver.documents.terminationDoc!)
                          }
                          onUpload={() =>
                            openDocumentUploader(
                              "Driver Termination Document",
                              "terminationDoc",
                              false
                            )
                          }
                          onRemove={(histId) =>
                            removeDriverDocument(selectedDriver.id, "terminationDoc", histId)
                          }
                          onDirectDrop={(file) =>
                            handleDirectDropDriverDoc(
                              "terminationDoc",
                              "Driver Termination Document",
                              file
                            )
                          }
                        />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* DOB, Email, Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="driver@zdunjetrucking.com"
                        className="w-full h-10 pl-9 pr-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(312) 555-0100"
                        className="w-full h-10 pl-9 pr-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* State, License */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full h-10 px-3 text-sm uppercase font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Status & Assigned Truck */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700 uppercase">
                        Driver Status
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
                          status: e.target.value as DriverStatus,
                        })
                      }
                      className={`w-full h-10 px-3 text-sm border rounded-lg bg-white focus:ring-2 focus:outline-none ${
                        formData.status === "Inactive"
                          ? "border-amber-300 bg-amber-50/50 text-amber-900 font-semibold focus:ring-amber-500"
                          : "border-slate-300 focus:ring-emerald-500"
                      }`}
                    >
                      <option value="Active">Active / On Duty</option>
                      <option value="Inactive">Inactive (Off Roster / Not Driving)</option>
                      <option value="On Leave">On Leave / Vacation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Assigned Power Unit (Truck)
                    </label>
                    <select
                      value={formData.assignedTruckId}
                      onChange={(e) => {
                        const newTruckId = e.target.value;
                        const autoTrailer = newTruckId
                          ? trailers.find((tr) => tr.assignedTruckId === newTruckId)
                          : null;
                        setFormData({
                          ...formData,
                          assignedTruckId: newTruckId,
                          assignedTrailerId: autoTrailer ? autoTrailer.id : formData.assignedTrailerId,
                        });
                      }}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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

                {/* Assigned Trailer Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                      Assigned Semi-Trailer
                    </label>
                    {formData.assignedTruckId && (
                      <span className="text-[10px] text-slate-400">
                        Auto-couples to Unit #{trucks.find((t) => t.id === formData.assignedTruckId)?.unitNumber || ""}
                      </span>
                    )}
                  </div>
                  <select
                    value={formData.assignedTrailerId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedTrailerId: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- No Trailer Assigned --</option>
                    {trailers.map((tr) => {
                      const coupledTruck = tr.assignedTruckId
                        ? trucks.find((t) => t.id === tr.assignedTruckId)
                        : null;
                      return (
                        <option key={tr.id} value={tr.id}>
                          Trailer #{tr.unitNumber} ({tr.year} {tr.make}) - Plate: {tr.plateNumber}
                          {coupledTruck ? ` [Coupled: Truck #${coupledTruck.unitNumber}]` : ""}
                        </option>
                      );
                    })}
                  </select>
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
                        1. Account Number
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
                        className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        2. Routing Number (9 Digits)
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
                        className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        3. Bank Info
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        placeholder="Chase, BofA, etc."
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Footer */}
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
                  className="h-10 px-5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
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
            setIsEPassportUpload(false);
            setIsCustodyFormUpload(false);
            setDroppedFileToUpload(null);
          }}
          category={uploadCategory}
          targetName={`${selectedDriver.firstName} ${selectedDriver.lastName}`}
          hasExpiration={hasExpiration}
          isDrugTestResult={isDrugTestUpload}
          isDotRecord={isDotRecordUpload}
          initialFile={droppedFileToUpload}
          onUpload={(doc) => {
            if (isDrugTestUpload) {
              addDriverDrugTestResult(selectedDriver.id, doc);
            } else if (isCustodyFormUpload) {
              addDriverCustodyForm(selectedDriver.id, doc);
            } else if (isEPassportUpload) {
              addDriverEPassport(selectedDriver.id, doc);
            } else if (isDotRecordUpload) {
              addDriverDotRecord(selectedDriver.id, doc);
            } else if (uploadKey) {
              uploadDriverDocument(selectedDriver.id, uploadKey, doc);
            }
            setDroppedFileToUpload(null);
            setIsEPassportUpload(false);
            setIsCustodyFormUpload(false);
          }}
        />
      )}
    </div>
  );
}

// Reusable Document Card Component with Drag-and-Drop & Multi-file Version History
interface DocumentCardProps {
  title: string;
  description: string;
  doc: FleetDocument | null | undefined;
  isSkipped?: boolean;
  hideIfSkipped?: boolean;
  showSkippedDocs?: boolean;
  badgeText?: string;
  badgeColor?: string;
  accentBorder?: string;
  allowExpirationEdit?: boolean;
  isOptional?: boolean;
  emptyStateBadge?: string;
  emptyStateText?: string;
  onUpdateExpiration?: (newDate: string, histId?: string) => void;
  onToggleSkip?: () => void;
  onPreview: (targetDoc?: FleetDocument) => void;
  onDownload: (targetDoc?: FleetDocument) => void;
  onUpload: () => void;
  onRemove: (historyDocId?: string) => void;
  onDirectDrop?: (file: File) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  title,
  description,
  doc,
  isSkipped = false,
  hideIfSkipped,
  showSkippedDocs = false,
  badgeText,
  badgeColor,
  accentBorder,
  allowExpirationEdit = false,
  isOptional = false,
  emptyStateBadge,
  emptyStateText,
  onUpdateExpiration,
  onToggleSkip,
  onPreview,
  onDownload,
  onUpload,
  onRemove,
  onDirectDrop,
}) => {
  const [isDragOverCard, setIsDragOverCard] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isEditingExpiration, setIsEditingExpiration] = useState(false);
  const [customExpiration, setCustomExpiration] = useState(doc?.expirationDate || "");

  // If document is skipped and has no file, omit it from display unless toggled to show
  const shouldHide = hideIfSkipped !== undefined ? hideIfSkipped : !showSkippedDocs;
  if (shouldHide && isSkipped && !doc) {
    return null;
  }

  const historyDocs = doc?.history || [];

  const handleCardDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(true);
  };

  const handleCardDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
  };

  const handleCardDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverCard(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (onDirectDrop) {
        onDirectDrop(file);
      } else {
        onUpload();
      }
    }
  };

  return (
    <div
      onDragOver={handleCardDragOver}
      onDragLeave={handleCardDragLeave}
      onDrop={handleCardDrop}
      className={`p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
        isDragOverCard
          ? "border-emerald-500 bg-emerald-50/70 shadow-lg ring-4 ring-emerald-500/20 scale-[1.01]"
          : doc
          ? accentBorder || "bg-white border-slate-200 hover:border-emerald-300 shadow-xs"
          : isSkipped
          ? "bg-slate-50/70 border-dashed border-slate-300 opacity-80"
          : accentBorder || "bg-red-50/20 border-dashed border-red-300 hover:border-red-400 shadow-xs"
      }`}
    >
      {/* Visual Drop Overlay */}
      {isDragOverCard && (
        <div className="absolute inset-0 z-20 bg-emerald-600/90 rounded-xl flex flex-col items-center justify-center text-white backdrop-blur-xs pointer-events-none animate-in fade-in duration-100">
          <Upload className="w-8 h-8 mb-2 animate-bounce" />
          <p className="font-bold text-sm">Drop document file here to upload</p>
          <p className="text-xs text-emerald-100">Saved as CURRENT FILE (previous kept in history)</p>
        </div>
      )}

      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                doc
                  ? "bg-emerald-50 text-emerald-600"
                  : isSkipped
                  ? "bg-slate-200 text-slate-500"
                  : badgeColor
                  ? "bg-amber-100 text-amber-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold text-slate-900 text-sm truncate" title={title}>
                  {title}
                </h4>
                {badgeText && (
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 ${
                      badgeColor || "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-1">{description}</p>
            </div>
          </div>

          {doc ? (
            <div className="flex items-center space-x-1.5 shrink-0">
              {historyDocs.length > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md border border-slate-200 flex items-center space-x-1">
                  <History className="w-2.5 h-2.5" />
                  <span>{historyDocs.length} archived</span>
                </span>
              )}
              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full flex items-center space-x-1 shadow-xs">
                <CheckCircle className="w-3 h-3 mr-0.5" />
                <span>CURRENT FILE</span>
              </span>
            </div>
          ) : isSkipped ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-200 text-slate-700 rounded-full shrink-0">
              ⚪ Not Applicable
            </span>
          ) : isOptional ? (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full shrink-0 border border-slate-200">
              {emptyStateBadge || "Optional / On Exit"}
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-full flex items-center space-x-1 shrink-0">
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Missing</span>
            </span>
          )}
        </div>

        {/* Current Active File Card */}
        {doc && (
          <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50/50 to-slate-50 rounded-xl border border-emerald-100 text-xs space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-slate-900 truncate" title={doc.name}>
                {doc.name}
              </p>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-emerald-100 text-emerald-800 shrink-0">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
              <span>{(doc.fileSize / 1024).toFixed(0)} KB</span>
            </div>
            {/* Expiration Date Display & Inline Editor */}
            {allowExpirationEdit && onUpdateExpiration ? (
              <div className="pt-0.5">
                {isEditingExpiration ? (
                  <div className="flex items-center space-x-1.5 bg-white p-1.5 rounded-lg border border-emerald-300">
                    <span className="text-[10px] font-bold text-slate-600">Expires:</span>
                    <input
                      type="date"
                      value={customExpiration}
                      onChange={(e) => setCustomExpiration(e.target.value)}
                      className="px-1.5 py-0.5 text-[11px] font-medium border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateExpiration(customExpiration);
                        setIsEditingExpiration(false);
                      }}
                      className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-[10px] font-bold"
                      title="Save Date"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomExpiration(doc.expirationDate || "");
                        setIsEditingExpiration(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title="Cancel"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className={`text-[11px] font-semibold flex items-center space-x-1 ${doc.expirationDate ? "text-emerald-800" : "text-amber-700"}`}>
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{doc.expirationDate ? `Expires: ${doc.expirationDate}` : "No expiration date set"}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomExpiration(doc.expirationDate || "");
                        setIsEditingExpiration(true);
                      }}
                      className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center space-x-0.5"
                    >
                      <Edit className="w-2.5 h-2.5 mr-0.5" />
                      <span>{doc.expirationDate ? "Change Date" : "Set Expiration"}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              doc.expirationDate && (
                <p className="text-[11px] font-semibold text-emerald-800 flex items-center space-x-1 pt-0.5">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>Expires: {doc.expirationDate}</span>
                </p>
              )
            )}

            {/* Actions on Current File */}
            <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-1">
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => onPreview(doc)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDownload(doc)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={onUpload}
                  className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100/70 rounded-lg transition-colors"
                  title="Upload a new version and move current to expired history"
                >
                  <Upload className="w-3 h-3" />
                  <span>New Version</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove current ${title}?`)) {
                      onRemove();
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                  title="Remove current active file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Previous / Expired Files Accordion */}
        {historyDocs.length > 0 && (
          <div className="mt-2.5 border border-slate-200 rounded-lg overflow-hidden bg-slate-50/60">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Expired / Archived Files on Record ({historyDocs.length})</span>
              </span>
              {showHistory ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {showHistory && (
              <div className="p-2 space-y-2 border-t border-slate-200 bg-white">
                {historyDocs.map((histDoc, idx) => (
                  <div
                    key={histDoc.id || idx}
                    className="p-2 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                          EXPIRED ON FILE
                        </span>
                        <p className="font-semibold text-slate-800 truncate" title={histDoc.name}>
                          {histDoc.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                        <span>Uploaded: {new Date(histDoc.uploadedAt).toLocaleDateString()}</span>
                        {histDoc.expirationDate && (
                          <>
                            <span>•</span>
                            <span className="text-amber-700 font-medium">
                              Expired: {histDoc.expirationDate}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>{(histDoc.fileSize / 1024).toFixed(0)} KB</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onPreview(histDoc)}
                        className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-white rounded transition-colors"
                        title="Preview expired file"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(histDoc)}
                        className="p-1 text-slate-600 hover:text-emerald-700 hover:bg-white rounded transition-colors"
                        title="Download expired file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete archived file "${histDoc.name}"?`)) {
                            onRemove(histDoc.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Delete archived file"
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

        {!doc && isSkipped && (
          <div className="mt-2.5 p-2 bg-slate-100/60 rounded-lg text-[11px] text-slate-500 italic">
            Marked as Not Applicable / exempt for this driver (100% Compliant).
          </div>
        )}

        {!doc && !isSkipped && isOptional && (
          <div className="mt-2.5 p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-[11px] text-slate-600 text-center">
            <p className="font-semibold text-slate-700">{emptyStateText || "Optional / offboarding record."}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Drag & drop separation document here or click upload below if applicable</p>
          </div>
        )}

        {!doc && !isSkipped && !isOptional && (
          <div className="mt-2.5 p-3 bg-red-50/60 border border-dashed border-red-200 rounded-lg text-[11px] text-red-700 text-center">
            <p className="font-semibold">Required document for driver qualification file.</p>
            <p className="text-[10px] text-red-500 mt-0.5">Drag & drop file here or click upload below</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {doc ? (
          <div className="w-full flex items-center justify-between text-[11px] text-slate-400">
            <span>Tip: Drag & drop new file anytime to update</span>
            <button
              type="button"
              onClick={onUpload}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Upload +
            </button>
          </div>
        ) : isSkipped ? (
          <div className="w-full flex items-center justify-between gap-2">
            {onToggleSkip && (
              <button
                type="button"
                onClick={onToggleSkip}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Mark as Required
              </button>
            )}
            <button
              type="button"
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
              type="button"
              onClick={onUpload}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload or Drop Document</span>
            </button>
            {onToggleSkip && (
              <button
                type="button"
                onClick={onToggleSkip}
                className="p-0 text-xs font-medium text-slate-500 hover:text-slate-800 underline transition-colors whitespace-nowrap"
                title="Mark this document as not applicable (100% Compliant)"
              >
                Not Applicable
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

