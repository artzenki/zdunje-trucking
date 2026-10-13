"use client";

import React, { useState, useMemo } from "react";
import { useFleet } from "@/context/FleetContext";
import {
  PtiInspection,
  PtiDriverExemption,
  FleetDocument,
} from "@/types/fleet";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Home,
  AlertTriangle,
  Send,
  Plus,
  Search,
  Upload,
  Trash2,
  Eye,
  Camera,
  Film,
  Phone,
  Truck,
  FileCheck,
  Calendar,
  X,
  FileText,
  UserCheck,
  Sparkles,
  Copy,
  Check,
  MessageSquare,
} from "lucide-react";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { DocumentUploadModal } from "./DocumentUploadModal";

export const PtiInspectionsTab: React.FC = () => {
  const {
    ptiInspections,
    drivers,
    trucks,
    trailers,
    addPtiInspection,
    updatePtiInspection,
    deletePtiInspection,
    addPtiFile,
    removePtiFile,
    generateWeeklyPtiRequests,
  } = useFleet();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [exemptionFilter, setExemptionFilter] = useState<string>("all");

  // Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<FleetDocument | null>(null);
  const [uploadTargetPti, setUploadTargetPti] = useState<PtiInspection | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Telegram Message Modal & Copy State
  const [telegramTargetPti, setTelegramTargetPti] = useState<PtiInspection | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Active drivers only (filtering out inactive / terminated drivers)
  const activeDrivers = useMemo(() => {
    return drivers.filter((d) => d.status === "Active");
  }, [drivers]);

  // Robust clipboard copy function supporting both modern navigator.clipboard and fallback for non-HTTPS/local network HTTP
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }

    // Fallback: document.execCommand('copy') via temporary textarea
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      textArea.remove();
      return successful;
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      return false;
    }
  };

  // Friendly Telegram message generator including dashboard lights, wipers, and fluid
  const generateTelegramMessage = (item: PtiInspection) => {
    const driverFirstName = item.driverName.trim().split(" ")[0] || item.driverName;
    const trailerText = item.trailerUnitNumber
      ? ` & Trailer #${item.trailerUnitNumber}`
      : "";

    return (
`Good Morning ${driverFirstName}! 🚛✨

Hope you're having a safe run! When you do your PTI inspection today for Truck #${item.truckUnitNumber}${trailerText}, please take clear pictures/walkaround video of:

1. 📸 Front of the Truck, Sides, Doors and Company Stickers
2. 🛞 Truck Tires & Trailer Tires (please send individual close-up images for each tire and tread)
3. 💡 Lights, Brake Lights, Marker Lights, and Turn Signals
4. ⚙️ Airbags, Suspension, Mudflaps, Airlines, and Connection Hoses
5. 🚨 Dashboard Gauges & Warning Lights (engine running, no check engine/ABS lights)
6. 🌧️ Windshield Wipers & Washer Fluid level check

Please tell us right away if anything looks worn or needs to be changed/replaced so our safety & maintenance team can note it and take care of it immediately!

Thank you and stay safe out there! 🙏 Safe miles!`
    );
  };

  // New Inspection Request Form State
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [formRequestedDate, setFormRequestedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formDueDate, setFormDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [formNotes, setFormNotes] = useState("");

  // Auto populate driver info on selection
  const selectedDriver = useMemo(() => {
    return drivers.find((d) => d.id === selectedDriverId);
  }, [drivers, selectedDriverId]);

  const assignedTruck = useMemo(() => {
    if (!selectedDriver?.assignedTruckId) return null;
    return trucks.find((t) => t.id === selectedDriver.assignedTruckId);
  }, [selectedDriver, trucks]);

  const coupledTrailer = useMemo(() => {
    if (!assignedTruck) return null;
    return trailers.find((tr) => tr.assignedTruckId === assignedTruck.id);
  }, [assignedTruck, trailers]);

  // Statistics
  const stats = useMemo(() => {
    const total = ptiInspections.length;
    const completed = ptiInspections.filter(
      (p) => p.status === "Passed / Complete"
    ).length;
    const pending = ptiInspections.filter(
      (p) => p.status === "Pending Driver Upload"
    ).length;
    const skipped = ptiInspections.filter(
      (p) => p.status === "Skipped (Hometime / Broken)"
    ).length;
    return { total, completed, pending, skipped };
  }, [ptiInspections]);

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return ptiInspections.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Exemption filter
      if (exemptionFilter !== "all") {
        if (exemptionFilter === "Hometime" && item.driverExemption !== "Hometime") return false;
        if (exemptionFilter === "Broken Down" && item.driverExemption !== "Broken Down") return false;
        if (exemptionFilter === "None" && item.driverExemption !== "None") return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesDriver = item.driverName.toLowerCase().includes(query);
        const matchesPhone = item.driverPhone.toLowerCase().includes(query);
        const matchesTruck = item.truckUnitNumber.toLowerCase().includes(query);
        const matchesTrailer = (item.trailerUnitNumber || "").toLowerCase().includes(query);
        const matchesNotes = (item.inspectorNotes || "").toLowerCase().includes(query);
        return matchesDriver || matchesPhone || matchesTruck || matchesTrailer || matchesNotes;
      }

      return true;
    });
  }, [ptiInspections, statusFilter, exemptionFilter, searchTerm]);

  // Handler: Open Request Modal
  const openNewRequestModal = () => {
    // Select first active driver by default
    const firstActiveWithTruck = activeDrivers.find((d) => d.assignedTruckId);
    setSelectedDriverId(firstActiveWithTruck?.id || activeDrivers[0]?.id || "");
    const today = new Date();
    setFormRequestedDate(today.toISOString().split("T")[0]);
    const due = new Date(today);
    due.setDate(due.getDate() + 7);
    setFormDueDate(due.toISOString().split("T")[0]);
    setFormNotes("");
    setIsRequestModalOpen(true);
  };

  // Handler: Submit New Request
  const handleSubmitNewRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) {
      alert("Please select a driver.");
      return;
    }

    if (!assignedTruck) {
      alert("Selected driver does not have an assigned truck unit. Please assign a truck first in the Drivers directory.");
      return;
    }

    addPtiInspection({
      driverId: selectedDriver.id,
      driverName: `${selectedDriver.firstName} ${selectedDriver.lastName}`,
      driverPhone: selectedDriver.phone || "",
      truckId: assignedTruck.id,
      truckUnitNumber: assignedTruck.unitNumber,
      trailerId: coupledTrailer?.id || null,
      trailerUnitNumber: coupledTrailer ? coupledTrailer.unitNumber : undefined,
      requestedDate: formRequestedDate,
      dueDate: formDueDate,
      providedImages: false,
      files: [],
      status: "Pending Driver Upload",
      driverExemption: "None",
      reminderSent: false,
      inspectorNotes: formNotes.trim() || undefined,
    });

    setIsRequestModalOpen(false);
    setFeedbackBanner(`PTI inspection request created for ${selectedDriver.firstName} ${selectedDriver.lastName}`);
    setTimeout(() => setFeedbackBanner(null), 4000);
  };

  // Handler: Generate Batch Weekly PTI
  const handleGenerateWeekly = () => {
    const createdCount = generateWeeklyPtiRequests();
    if (createdCount > 0) {
      setFeedbackBanner(`Successfully generated ${createdCount} weekly PTI inspection request(s) for active drivers.`);
    } else {
      setFeedbackBanner("All active drivers with assigned trucks already have inspection requests for today.");
    }
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  // Handler: Toggle Exemption (Hometime / Broken Down)
  const handleSetExemption = (inspection: PtiInspection, exemption: PtiDriverExemption) => {
    updatePtiInspection(inspection.id, {
      driverExemption: exemption,
    });
  };

  // Handler: Toggle Provided Images Checkbox
  const handleToggleProvidedImages = (inspection: PtiInspection) => {
    const nextVal = !inspection.providedImages;
    updatePtiInspection(inspection.id, {
      providedImages: nextVal,
      verifiedBy: nextVal ? "Safety Compliance" : undefined,
      verifiedAt: nextVal ? new Date().toISOString() : undefined,
    });
  };

  // Handler: Toggle Reminder
  const handleToggleReminder = (inspection: PtiInspection) => {
    const nextSent = !inspection.reminderSent;
    updatePtiInspection(inspection.id, {
      reminderSent: nextSent,
      reminderDate: nextSent ? new Date().toISOString().split("T")[0] : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-medium flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-blue-500 hover:text-blue-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Info & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Weekly Driver PTI Trips & Pre-Trip Inspections
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mandatory weekly walkaround photos/videos inspection to protect fleet DOT compliance.
            Drivers on <strong>Hometime</strong> or <strong>Broken Down</strong> are automatically exempt & skipped.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerateWeekly}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl shadow-xs transition-colors"
            title="Auto-create weekly inspection requests for all active drivers currently assigned to trucks"
          >
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Auto-Request All Drivers</span>
          </button>

          <button
            onClick={openNewRequestModal}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New PTI Request</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total PTI Requests
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-900 mt-1.5 block">
            {stats.total}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            All recorded trips & inspection logs
          </span>
        </div>

        {/* Complete */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Passed / Complete
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1.5 block">
            {stats.completed}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Photos/videos verified & compliant
          </span>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
              Pending Upload
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-700 mt-1.5 block">
            {stats.pending}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Awaiting driver photos/video
          </span>
        </div>

        {/* Skipped */}
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Skipped / Exempt
            </span>
            <Home className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-black text-blue-700 mt-1.5 block">
            {stats.skipped}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Hometime or Broken Down (No penalty)
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search driver name, phone, truck unit, trailer unit, notes..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Inspection Statuses</option>
            <option value="Passed / Complete">Passed / Complete</option>
            <option value="Pending Driver Upload">Pending Driver Upload</option>
            <option value="Skipped (Hometime / Broken)">Skipped (Hometime / Broken)</option>
          </select>

          {/* Exemption Filter */}
          <select
            value={exemptionFilter}
            onChange={(e) => setExemptionFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-700 font-medium"
          >
            <option value="all">All Duty Statuses</option>
            <option value="None">Active Duty (None)</option>
            <option value="Hometime">Hometime</option>
            <option value="Broken Down">Broken Down</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInspections.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-600">
              No PTI Inspection requests found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;New PTI Request&quot; or &quot;Auto-Request All Drivers&quot; to generate weekly pre-trip inspection records.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInspections.map((item) => {
              const isSkipped = item.driverExemption !== "None";
              const isPassed = item.status === "Passed / Complete";
              const filesCount = item.files?.length || 0;

              return (
                <div
                  key={item.id}
                  className={`p-6 transition-colors ${
                    isSkipped
                      ? "bg-slate-50/50"
                      : isPassed
                      ? "hover:bg-emerald-50/20"
                      : "hover:bg-amber-50/20"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Left Column: Driver, Units & Exemption Status */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Units Badges */}
                        <span className="px-2.5 py-1 text-xs font-black bg-blue-100 text-blue-900 rounded-lg flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5" />
                          Unit #{item.truckUnitNumber}
                        </span>

                        {item.trailerUnitNumber && (
                          <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-800 rounded-lg">
                            Trailer #{item.trailerUnitNumber}
                          </span>
                        )}

                        {/* Driver Name & Phone */}
                        <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5 ml-1">
                          <span>{item.driverName}</span>
                        </h3>

                        {item.driverPhone && (
                          <a
                            href={`tel:${item.driverPhone}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{item.driverPhone}</span>
                          </a>
                        )}

                        {/* Status Badge */}
                        <span
                          className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            isPassed
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : isSkipped
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {/* Exemption Selector & Duty Status Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                          Duty Exemption:
                        </span>
                        
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleSetExemption(item, "None")}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                              item.driverExemption === "None"
                                ? "bg-slate-900 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            Active Duty (Required)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetExemption(item, "Hometime")}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                              item.driverExemption === "Hometime"
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-blue-600"
                            }`}
                          >
                            <Home className="w-3 h-3" />
                            <span>Hometime (Skip)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetExemption(item, "Broken Down")}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                              item.driverExemption === "Broken Down"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-amber-600"
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Broken Down (Skip)</span>
                          </button>
                        </div>

                        {isSkipped && (
                          <span className="text-xs text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100 font-medium">
                            ✓ PTI inspection waived: Driver is {item.driverExemption}. No violation penalty.
                          </span>
                        )}
                      </div>

                      {/* Timeline & Reminder Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Requested: <strong className="text-slate-700">{item.requestedDate}</strong></span>
                        </span>
                        <span>•</span>
                        <span>
                          Due Date: <strong className="text-slate-700">{item.dueDate}</strong>
                        </span>

                        {item.verifiedBy && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              Verified by {item.verifiedBy}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Inspection Checkboxes & Reminders Toolbar */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {/* Provided Images/Videos Checkbox */}
                        <label
                          className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                            item.providedImages
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={item.providedImages}
                            onChange={() => handleToggleProvidedImages(item)}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" />
                            Driver Provided Images / Video Walkaround
                          </span>
                        </label>

                        {/* Reminder Button / Indicator */}
                        <button
                          type="button"
                          onClick={() => handleToggleReminder(item)}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                            item.reminderSent
                              ? "bg-indigo-50 border-indigo-200 text-indigo-800"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Send className="w-3 h-3 text-indigo-600" />
                          <span>
                            {item.reminderSent
                              ? `Reminder Sent (${item.reminderDate || "Yes"})`
                              : "Set / Send Reminder"}
                          </span>
                        </button>

                        {/* Copy Telegram Request Button */}
                        <button
                          type="button"
                          onClick={async () => {
                            const text = generateTelegramMessage(item);
                            const success = await copyToClipboard(text);
                            if (success) {
                              setCopiedId(item.id);
                              setTimeout(() => setCopiedId(null), 3000);
                              setFeedbackBanner(`Telegram request text copied for ${item.driverName}! Ready to paste.`);
                            } else {
                              // If browser strictly blocked background copy, open the preview modal where text can be highlighted & copied
                              setTelegramTargetPti(item);
                            }
                            setTimeout(() => setFeedbackBanner(null), 4000);
                          }}
                          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                            copiedId === item.id
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200"
                          }`}
                          title="Copy friendly Telegram request template to clipboard"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied to Clipboard!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-sky-600" />
                              <span>Copy Telegram Text</span>
                            </>
                          )}
                        </button>

                        {/* View Telegram Text Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => setTelegramTargetPti(item)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                          title="Preview full Telegram request template"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          <span>Preview Message</span>
                        </button>

                        {/* Notes */}
                        {item.inspectorNotes && (
                          <span className="text-xs text-slate-500 italic">
                            &quot;{item.inspectorNotes}&quot;
                          </span>
                        )}
                      </div>

                      {/* Uploaded Files Gallery */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Inspection Media & Files ({filesCount})
                          </span>
                          <button
                            type="button"
                            onClick={() => setUploadTargetPti(item)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Add Photo / Video</span>
                          </button>
                        </div>

                        {filesCount > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {item.files.map((file) => {
                              const isVideo =
                                file.fileType?.includes("video") ||
                                file.name.endsWith(".mp4") ||
                                file.name.endsWith(".mov") ||
                                file.name.endsWith(".webm");

                              return (
                                <div
                                  key={file.id}
                                  className="flex items-center justify-between p-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors shadow-2xs group"
                                >
                                  <div
                                    onClick={() => setViewingDoc(file)}
                                    className="flex items-center space-x-2 truncate cursor-pointer flex-1 mr-2"
                                  >
                                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                                      {isVideo ? (
                                        <Film className="w-3.5 h-3.5" />
                                      ) : (
                                        <Camera className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <div className="truncate">
                                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                                        {file.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        {(file.fileSize / 1024).toFixed(0)} KB
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setViewingDoc(file)}
                                      title="Preview"
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removePtiFile(item.id, file.id)}
                                      title="Remove"
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-slate-50/70 p-2.5 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
                            <span>No walkaround photos or videos uploaded yet.</span>
                            <button
                              type="button"
                              onClick={() => setUploadTargetPti(item)}
                              className="text-indigo-600 font-semibold hover:underline"
                            >
                              Upload now
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex items-center lg:flex-col justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                      <button
                        type="button"
                        onClick={() => deletePtiInspection(item.id)}
                        title="Delete Inspection Request"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New PTI Request */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h3 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                Request Weekly Pre-Trip Inspection (PTI)
              </h3>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="p-6 space-y-4">
              {/* Select Driver */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assigned Driver *
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  required
                >
                  <option value="">Select an active driver...</option>
                  {activeDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName} {d.phone ? `(${d.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Units Info Card */}
              {selectedDriver && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Assigned Truck Unit:</span>
                    <span className="font-bold text-blue-800">
                      {assignedTruck ? `Unit #${assignedTruck.unitNumber} (${assignedTruck.make} ${assignedTruck.model})` : "None Assigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Coupled Trailer:</span>
                    <span className="font-bold text-blue-800">
                      {coupledTrailer ? `Unit #${coupledTrailer.unitNumber} (${coupledTrailer.make} ${coupledTrailer.model})` : "None Coupled"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-900">Driver Phone:</span>
                    <span className="font-bold text-blue-800">
                      {selectedDriver.phone || "No phone on file"}
                    </span>
                  </div>
                  {!assignedTruck && (
                    <p className="text-[11px] text-rose-600 font-bold pt-1">
                      ⚠️ Note: This driver has no assigned truck. Link a truck in Drivers tab first.
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date Requested *
                  </label>
                  <input
                    type="date"
                    value={formRequestedDate}
                    onChange={(e) => setFormRequestedDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Inspector / Request Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Inspection Instructions / Notes (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Please send walkaround video, front tire treads, brake shoes, and dash cluster lights."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedDriver || !assignedTruck}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors"
                >
                  Create PTI Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Viewer Modal for Inspection Photos & Videos */}
      <DocumentViewerModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
      />

      {/* Document Upload Modal for Inspection Media */}
      {uploadTargetPti && (
        <DocumentUploadModal
          isOpen={!!uploadTargetPti}
          onClose={() => setUploadTargetPti(null)}
          category="PTI Inspection Media"
          targetName={`${uploadTargetPti.driverName} - Unit #${uploadTargetPti.truckUnitNumber}`}
          hasExpiration={false}
          onUpload={(doc) => {
            addPtiFile(uploadTargetPti.id, doc);
            setUploadTargetPti(null);
            setFeedbackBanner(`Uploaded ${doc.name} to pre-trip inspection.`);
            setTimeout(() => setFeedbackBanner(null), 4000);
          }}
        />
      )}

      {/* Modal: Preview Telegram Request Message */}
      {telegramTargetPti && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-sky-50/70">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-sky-500 text-white rounded-xl shadow-xs">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">
                    Telegram PTI Request Message
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ready to send to {telegramTargetPti.driverName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTelegramTargetPti(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-sans text-sm text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed selection:bg-sky-200">
                {generateTelegramMessage(telegramTargetPti)}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">
                  Click Copy to copy text directly to your clipboard.
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setTelegramTargetPti(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const text = generateTelegramMessage(telegramTargetPti);
                      await copyToClipboard(text);
                      setCopiedId(telegramTargetPti.id);
                      setTimeout(() => setCopiedId(null), 3000);
                      setFeedbackBanner(`Telegram request copied for ${telegramTargetPti.driverName}!`);
                      setTimeout(() => setFeedbackBanner(null), 4000);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition-colors"
                  >
                    {copiedId === telegramTargetPti.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
