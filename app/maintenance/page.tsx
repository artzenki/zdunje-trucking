"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  MaintenanceRecord,
  MaintenanceServiceType,
  MaintenanceStatus,
  MaintenancePaymentMethod,
  FleetDocument,
} from "@/types/fleet";
import {
  Wrench,
  Plus,
  Search,
  FileText,
  Calendar,
  Store,
  Upload,
  Download,
  Trash2,
  Edit,
  X,
  CheckCircle,
  CreditCard,
  DollarSign,
  Tag,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { downloadDocument } from "@/lib/documentUtils";
import { uploadFileToSupabaseStorage } from "@/lib/documentStorage";

const SERVICE_TYPES: MaintenanceServiceType[] = [
  "PM-A (Oil & Lube)",
  "PM-B (Full Inspection)",
  "PM-C (Major Overhaul)",
  "Tires & Alignment",
  "Brakes & Air System",
  "Engine & Transmission",
  "Annual DOT Inspection",
  "Roadside Emergency",
  "Electrical & Lights",
  "Exhaust & Emissions (DPF)",
  "Trailer & Reefer Repair",
  "Other",
];

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const {
    maintenanceRecords,
    trucks,
    shops,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
  } = useFleet();

  const [search, setSearch] = useState("");
  const [truckFilter, setTruckFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(
    null
  );
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);

  // Invoice Uploading state for modal & inline
  const [uploadingForRecordId, setUploadingForRecordId] = useState<
    string | null
  >(null);
  const [modalInvoiceFile, setModalInvoiceFile] = useState<File | null>(null);
  const [existingModalDoc, setExistingModalDoc] = useState<FleetDocument | null>(null);
  const [isInvoiceDragging, setIsInvoiceDragging] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    truckId: "",
    serviceDate: new Date().toISOString().split("T")[0],
    odometer: 140000,
    serviceType: "PM-A (Oil & Lube)" as MaintenanceServiceType,
    shopId: "",
    customShopName: "",
    laborCost: 190,
    partsCost: 350,
    calloutFee: 0,
    taxCost: 0,
    discountCost: 0,
    paymentMethod: "EFS" as MaintenancePaymentMethod,
    invoiceNumber: "",
    nextServiceDueMileage: 155000,
    nextServiceDueDate: "",
    status: "Completed" as MaintenanceStatus,
    description: "",
  });

  const openAddModal = useCallback(() => {
    const defaultTruck = trucks[0];
    setFormData({
      truckId: defaultTruck ? defaultTruck.id : "",
      serviceDate: new Date().toISOString().split("T")[0],
      odometer: defaultTruck ? defaultTruck.currentMileage : 120000,
      serviceType: "PM-A (Oil & Lube)",
      shopId: shops[0] ? shops[0].id : "",
      customShopName: "",
      laborCost: 180,
      partsCost: 320,
      calloutFee: 0,
      taxCost: 0,
      discountCost: 0,
      paymentMethod: "EFS",
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      nextServiceDueMileage: defaultTruck
        ? defaultTruck.currentMileage + 15000
        : 135000,
      nextServiceDueDate: "",
      status: "Completed",
      description: "",
    });
    setModalInvoiceFile(null);
    setExistingModalDoc(null);
    setEditingRecord(null);
    setIsAddModalOpen(true);
  }, [trucks, shops]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      openAddModal();
    }
  }, [searchParams, openAddModal]);

  const filteredRecords = useMemo(() => {
    return maintenanceRecords.filter((rec) => {
      const q = search.toLowerCase();
      const matchSearch =
        rec.truckUnitNumber.toLowerCase().includes(q) ||
        rec.invoiceNumber.toLowerCase().includes(q) ||
        rec.shopName.toLowerCase().includes(q) ||
        rec.serviceType.toLowerCase().includes(q) ||
        rec.description.toLowerCase().includes(q);

      const matchTruck =
        truckFilter === "all" || rec.truckId === truckFilter;
      const matchType = typeFilter === "all" || rec.serviceType === typeFilter;
      const matchStatus =
        statusFilter === "all" || rec.status === statusFilter;

      return matchSearch && matchTruck && matchType && matchStatus;
    });
  }, [maintenanceRecords, search, truckFilter, typeFilter, statusFilter]);

  // Aggregate Costs
  const totalFleetSpent = useMemo(() => {
    return maintenanceRecords.reduce((acc, curr) => acc + curr.totalCost, 0);
  }, [maintenanceRecords]);

  const openEditModal = (rec: MaintenanceRecord) => {
    setEditingRecord(rec);
    setFormData({
      truckId: rec.truckId,
      serviceDate: rec.serviceDate,
      odometer: rec.odometer,
      serviceType: rec.serviceType,
      shopId: rec.shopId || "",
      customShopName: rec.shopId ? "" : rec.shopName,
      laborCost: rec.laborCost,
      partsCost: rec.partsCost,
      calloutFee: rec.calloutFee,
      taxCost: rec.taxCost ?? 0,
      discountCost: rec.discountCost ?? 0,
      paymentMethod: rec.paymentMethod || "EFS",
      invoiceNumber: rec.invoiceNumber,
      nextServiceDueMileage: rec.nextServiceDueMileage || 0,
      nextServiceDueDate: rec.nextServiceDueDate || "",
      status: rec.status,
      description: rec.description,
    });
    setModalInvoiceFile(null);
    setExistingModalDoc(rec.invoiceDocument || null);
    setIsAddModalOpen(true);
  };

  const isPmOilService = (type: string) => {
    const lower = type.toLowerCase();
    return lower.includes("oil") || lower.includes("pm-a") || lower.includes("pm (oil)");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const truck = trucks.find((t) => t.id === formData.truckId);
    if (!truck) {
      alert("Please select a valid truck");
      return;
    }

    const selectedShop = shops.find((s) => s.id === formData.shopId);
    const shopName = selectedShop
      ? selectedShop.businessName
      : formData.customShopName.trim() || "Independent Vendor";

    const subtotal =
      Number(formData.laborCost) +
      Number(formData.partsCost) +
      Number(formData.calloutFee) +
      Number(formData.taxCost);
    const total = Math.max(0, subtotal - Number(formData.discountCost || 0));

    setIsSubmittingRecord(true);
    try {
      let finalInvoiceDoc = existingModalDoc;
      if (modalInvoiceFile) {
        const uploadResult = await uploadFileToSupabaseStorage(
          modalInvoiceFile,
          modalInvoiceFile.name,
          "maintenance"
        );
        finalInvoiceDoc = {
          id: `doc-${Date.now()}`,
          name: modalInvoiceFile.name,
          category: "Maintenance Invoice",
          fileType: uploadResult.fileType || modalInvoiceFile.type || "application/pdf",
          fileSize: uploadResult.fileSize || modalInvoiceFile.size,
          uploadedAt: new Date().toISOString(),
          fileData: uploadResult.fileUrl,
        };
      }

      const isOil = isPmOilService(formData.serviceType);

      const payload = {
        truckId: truck.id,
        truckUnitNumber: truck.unitNumber,
        serviceDate: formData.serviceDate,
        odometer: Number(formData.odometer),
        serviceType: formData.serviceType,
        shopId: formData.shopId || null,
        shopName,
        laborCost: Number(formData.laborCost),
        partsCost: Number(formData.partsCost),
        calloutFee: Number(formData.calloutFee),
        taxCost: Number(formData.taxCost),
        discountCost: Number(formData.discountCost || 0),
        paymentMethod: formData.paymentMethod,
        totalCost: total,
        invoiceNumber: formData.invoiceNumber.trim() || `INV-${Date.now()}`,
        invoiceDocument: finalInvoiceDoc || null,
        nextServiceDueMileage:
          isOil && formData.nextServiceDueMileage
            ? Number(formData.nextServiceDueMileage)
            : undefined,
        nextServiceDueDate: formData.nextServiceDueDate || undefined,
        status: formData.status,
        description: formData.description.trim(),
      };

      if (editingRecord) {
        updateMaintenanceRecord(editingRecord.id, payload);
      } else {
        addMaintenanceRecord(payload);
      }
      setIsAddModalOpen(false);
      setModalInvoiceFile(null);
      setExistingModalDoc(null);
    } catch (err) {
      console.error("Error saving maintenance record:", err);
      alert("Failed to save maintenance record. Please try again.");
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const handleDelete = (id: string, inv: string) => {
    if (window.confirm(`Delete maintenance record with invoice #${inv}?`)) {
      deleteMaintenanceRecord(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Maintenance & Repair Log
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-800">
              {maintenanceRecords.length} Work Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track scheduled PM services, roadside emergency calls, parts and labor costs, and repair invoices.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Maintenance Record</span>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Total Fleet Maintenance Spend
          </span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            ${totalFleetSpent.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Across {maintenanceRecords.length} completed work orders
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Active / In Progress Services
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {
              maintenanceRecords.filter((r) => r.status === "In Progress")
                .length
            }
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Units currently in the shop
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Scheduled Upcoming PMs
          </span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {
              maintenanceRecords.filter((r) => r.status === "Scheduled")
                .length
            }
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">
            Preventative maintenance on schedule
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, truck unit, shop name, or repair description..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Truck Filter */}
          <select
            value={truckFilter}
            onChange={(e) => setTruckFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Trucks</option>
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>
                Unit #{t.unitNumber} ({t.make})
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Service Types</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="In Progress">In Progress</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {/* Maintenance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-600">
                No maintenance records found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Log a new service order or modify your search filters.
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-6 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-black bg-blue-100 text-blue-900 rounded-lg">
                        Unit #{rec.truckUnitNumber}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base">
                        {rec.serviceType}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                          rec.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : rec.status === "In Progress"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rec.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Inv: {rec.invoiceNumber}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                      {rec.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-700">{rec.shopName}</strong>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Date: {rec.serviceDate}</span>
                      </span>
                      <span>•</span>
                      <span>
                        Odometer:{" "}
                        <strong className="text-slate-700">
                          {rec.odometer.toLocaleString()} mi
                        </strong>
                      </span>
                      {rec.nextServiceDueMileage && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 font-semibold">
                            Next Due: {rec.nextServiceDueMileage.toLocaleString()} mi
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Cost & Invoice Actions */}
                  <div className="flex items-center space-x-4 self-end lg:self-center shrink-0">
                    {/* Cost Breakdown */}
                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 block">
                        ${rec.totalCost.toLocaleString()}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Labor: ${rec.laborCost} • Parts: ${rec.partsCost}
                        {rec.calloutFee > 0 && ` • Callout: $${rec.calloutFee}`}
                        {((rec.taxCost ?? 0) > 0) && ` • Tax: $${rec.taxCost}`}
                        {((rec.discountCost ?? 0) > 0) && (
                          <span className="text-emerald-600 font-medium">
                            {" "}• Discount: -${rec.discountCost}
                          </span>
                        )}
                      </p>
                      {rec.paymentMethod && (
                        <div className="mt-1 flex items-center justify-end space-x-1 text-[11px] font-medium text-slate-600">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span>Paid by: <strong className="text-slate-700">{rec.paymentMethod}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Invoice Document */}
                    <div className="border-l border-slate-200 pl-4 space-y-1">
                      {rec.invoiceDocument ? (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setViewingDoc(rec.invoiceDocument!)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>
                          <button
                            onClick={() =>
                              downloadDocument(rec.invoiceDocument!)
                            }
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                            title="Download invoice"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setUploadingForRecordId(rec.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Attach Receipt</span>
                        </button>
                      )}
                    </div>

                    {/* Edit/Delete */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openEditModal(rec)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                        title="Edit record"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(rec.id, rec.invoiceNumber)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Maintenance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingRecord ? "Edit Maintenance Record" : "Log Maintenance / Repair"}
                </h3>
                <p className="text-xs text-slate-500">
                  Zdunje Trucking Fleet Safety & Service Log
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Select Truck Unit <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.truckId}
                      onChange={(e) => {
                        const t = trucks.find((tr) => tr.id === e.target.value);
                        setFormData({
                          ...formData,
                          truckId: e.target.value,
                          odometer: t ? t.currentMileage : formData.odometer,
                          nextServiceDueMileage: t
                            ? t.currentMileage + 15000
                            : formData.nextServiceDueMileage,
                        });
                      }}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          Unit #{t.unitNumber} ({t.make} {t.model})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Service Date
                    </label>
                    <input
                      type="date"
                      value={formData.serviceDate}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceDate: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Odometer (Miles)
                    </label>
                    <input
                      type="number"
                      value={formData.odometer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          odometer: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Service Type & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Service Type
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serviceType: e.target.value as MaintenanceServiceType,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {SERVICE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Work Order Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as MaintenanceStatus,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Completed">Completed</option>
                      <option value="In Progress">In Progress (Currently in Shop)</option>
                      <option value="Scheduled">Scheduled for Later</option>
                    </select>
                  </div>
                </div>

                {/* Shop / Vendor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Choose from Truck Shop Directory
                    </label>
                    <select
                      value={formData.shopId}
                      onChange={(e) =>
                        setFormData({ ...formData, shopId: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Other / Custom Vendor --</option>
                      {shops.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.businessName} ({s.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!formData.shopId && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Custom Vendor / Shop Name
                      </label>
                      <input
                        type="text"
                        value={formData.customShopName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            customShopName: e.target.value,
                          })
                        }
                        placeholder="e.g. Cummins Central Indiana"
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Costs Breakdown */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cost Breakdown ($ USD)</span>
                    </h4>
                    <span className="text-xs font-extrabold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      Net Total: $
                      {Math.max(
                        0,
                        Number(formData.laborCost) +
                          Number(formData.partsCost) +
                          Number(formData.calloutFee) +
                          Number(formData.taxCost) -
                          Number(formData.discountCost || 0)
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Labor Cost
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.laborCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            laborCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Parts Cost
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.partsCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            partsCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Callout / Towing
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.calloutFee}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            calloutFee: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Tax
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.taxCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            taxCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-700 mb-1 flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-emerald-600" />
                        <span>Discount</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.discountCost}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discountCost: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="0"
                        className="w-full h-10 px-3 text-sm bg-emerald-50/40 border border-emerald-300 text-emerald-900 font-medium rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Invoice #
                      </label>
                      <input
                        type="text"
                        value={formData.invoiceNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            invoiceNumber: e.target.value,
                          })
                        }
                        placeholder="INV-99210"
                        className="w-full h-10 px-3 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1.5 flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>Paid By / Payment Method</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(
                        [
                          { key: "Driver", label: "Driver" },
                          { key: "EFS", label: "EFS" },
                          { key: "CC over the Phone", label: "CC over the Phone" },
                          { key: "Zelle", label: "Zelle" },
                        ] as const
                      ).map((m) => (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, paymentMethod: m.key })
                          }
                          className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center space-x-1.5 ${
                            formData.paymentMethod === m.key
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upload Document / Work Order Invoice Tab */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Document / Invoice PDF</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Attach the repair shop invoice, work order receipt, or inspection certificate.
                  </p>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsInvoiceDragging(true);
                    }}
                    onDragLeave={() => setIsInvoiceDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsInvoiceDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) setModalInvoiceFile(file);
                    }}
                    className={`relative border-2 border-dashed rounded-xl p-3.5 text-center transition-all ${
                      isInvoiceDragging
                        ? "border-indigo-500 bg-indigo-50"
                        : modalInvoiceFile
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setModalInvoiceFile(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {modalInvoiceFile ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-2 text-left truncate">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {modalInvoiceFile.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {(modalInvoiceFile.size / 1024).toFixed(0)} KB ready to upload
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setModalInvoiceFile(null);
                          }}
                          className="p-1 text-slate-400 hover:text-red-500 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : existingModalDoc ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-2 text-left truncate">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-slate-800 block truncate">
                              On file: {existingModalDoc.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Drop a new PDF or receipt to replace
                            </span>
                          </div>
                        </div>
                        <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2 text-slate-500 py-1">
                        <Upload className="w-4 h-4 text-slate-400" />
                        <span className="text-xs font-medium">
                          Drag & drop invoice PDF / image here or click to browse
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Next Service Due (Only active when Service Type is PM (oil)) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        className={`block text-xs font-semibold uppercase ${
                          isPmOilService(formData.serviceType)
                            ? "text-slate-700"
                            : "text-slate-400"
                        }`}
                      >
                        Next Service Due (Mileage)
                      </label>
                      {!isPmOilService(formData.serviceType) && (
                        <span className="text-[10px] text-slate-400 italic">
                          (Active for PM Oil only)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      disabled={!isPmOilService(formData.serviceType)}
                      value={
                        isPmOilService(formData.serviceType)
                          ? formData.nextServiceDueMileage
                          : ""
                      }
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextServiceDueMileage: parseInt(e.target.value) || 0,
                        })
                      }
                      placeholder={
                        isPmOilService(formData.serviceType)
                          ? "e.g. 155000"
                          : "N/A - PM Oil only"
                      }
                      className={`w-full h-10 px-3 text-sm border rounded-lg focus:outline-none transition-colors ${
                        isPmOilService(formData.serviceType)
                          ? "border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500"
                          : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Next Service Due (Target Date)
                    </label>
                    <input
                      type="date"
                      value={formData.nextServiceDueDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nextServiceDueDate: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Work Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Description of Repairs & Parts Replaced
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detail work performed: oil brand, filter parts numbers, brake lining measurements, tire dot codes, technician comments..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  disabled={isSubmittingRecord}
                  className="h-10 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                >
                  {isSubmittingRecord
                    ? "Saving..."
                    : editingRecord
                    ? "Update Record"
                    : "Save Work Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
      />

      {/* Invoice Document Upload Modal */}
      {uploadingForRecordId && (
        <DocumentUploadModal
          isOpen={!!uploadingForRecordId}
          onClose={() => setUploadingForRecordId(null)}
          category="Maintenance Invoice"
          targetName="Maintenance Record"
          hasExpiration={false}
          onUpload={(doc) => {
            updateMaintenanceRecord(uploadingForRecordId, {
              invoiceDocument: doc,
            });
            setUploadingForRecordId(null);
          }}
        />
      )}
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading maintenance...</div>
      }
    >
      <MaintenanceContent />
    </React.Suspense>
  );
}

