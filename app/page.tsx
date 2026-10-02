"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useFleet } from "@/context/FleetContext";
import {
  Truck,
  Users,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowRight,
  Plus,
  ShieldAlert,
  Store,
  Container,
  Radio,
  CalendarDays,
  Check,
  Copy,
  Search,
  ClipboardCheck,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { FleetDocument } from "@/types/fleet";

export default function DashboardPage() {
  const {
    trucks,
    trailers,
    drivers,
    maintenanceRecords,
    shops,
    alerts,
    reminders = [],
    toggleReminderStatus,
  } = useFleet();

  const [selectedDoc, setSelectedDoc] = useState<FleetDocument | null>(null);
  const [docEntityName] = useState("");

  // Quick Dispatcher Info State
  const [selectedDispatchDriverId, setSelectedDispatchDriverId] = useState<string>("");
  const [selectedDispatchTrailerId, setSelectedDispatchTrailerId] = useState<string>("");
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [isDriverSearchOpen, setIsDriverSearchOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const activeTrucks = trucks.filter((t) => t.status === "Active");
  const inShopTrucks = trucks.filter((t) => t.status === "In Shop");
  const activeTrailers = trailers.filter((tr) => tr.status === "Active");
  const activeDrivers = drivers.filter((d) => d.status === "Active");

  // Filtered & sorted drivers for dispatch selector
  const sortedDrivers = React.useMemo(() => {
    return [...drivers].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [drivers]);

  const filteredDispatchDrivers = React.useMemo(() => {
    const q = driverSearchQuery.toLowerCase().trim();
    if (!q) return sortedDrivers;
    return sortedDrivers.filter((d) => {
      const fullName = `${d.firstName} ${d.lastName}`.toLowerCase();
      const phone = (d.phone || "").toLowerCase();
      const cdl = (d.licenseNumber || "").toLowerCase();
      const assignedTruck = trucks.find((t) => t.id === d.assignedTruckId);
      const truckUnit = (assignedTruck?.unitNumber || "").toLowerCase();
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        cdl.includes(q) ||
        truckUnit.includes(q)
      );
    });
  }, [sortedDrivers, driverSearchQuery, trucks]);

  // Selected driver, coupled truck, and coupled trailer
  const currentDispatchDriver = drivers.find((d) => d.id === selectedDispatchDriverId) || null;
  const currentDispatchTruck = currentDispatchDriver
    ? trucks.find((t) => t.id === currentDispatchDriver.assignedTruckId) || null
    : null;

  // Auto-detect trailer coupled to that truck if user hasn't explicitly selected one
  const detectedTrailer = currentDispatchTruck
    ? trailers.find((tr) => tr.assignedTruckId === currentDispatchTruck.id) || null
    : null;
  const currentDispatchTrailer = selectedDispatchTrailerId
    ? trailers.find((tr) => tr.id === selectedDispatchTrailerId) || null
    : detectedTrailer;

  // Format exact text payload for dispatcher
  const formattedDispatchText = React.useMemo(() => {
    if (!currentDispatchDriver) return "";

    const truckUnit = currentDispatchTruck?.unitNumber || "N/A";
    const truckMake = currentDispatchTruck?.make ? currentDispatchTruck.make.toUpperCase() : "N/A";
    const truckModel = currentDispatchTruck?.model || "N/A";
    const truckPlate = currentDispatchTruck?.plateNumber || "N/A";
    const truckVin = currentDispatchTruck?.vin || "N/A";
    const truckYear = currentDispatchTruck?.year ? String(currentDispatchTruck.year) : "N/A";

    const driverFullName = `${currentDispatchDriver.firstName} ${currentDispatchDriver.lastName}`.trim();
    const driverPhone = currentDispatchDriver.phone || "N/A";

    const trailerUnit = currentDispatchTrailer?.unitNumber || "N/A";
    const trailerVin = currentDispatchTrailer?.vin || "N/A";
    const trailerMake = currentDispatchTrailer?.make || "N/A";
    const trailerYear = currentDispatchTrailer?.year ? String(currentDispatchTrailer.year) : "N/A";
    const trailerPlate = currentDispatchTrailer?.plateNumber || "N/A";

    return `Truck Unit: ${truckUnit}
Make: ${truckMake}
Model: ${truckModel}
License Plate: ${truckPlate}
VIN: ${truckVin}
Year: ${truckYear}

Driver Name: ${driverFullName}
Driver Phone Number: ${driverPhone}

Trailer Number: ${trailerUnit}
Trailer VIN: ${trailerVin}
Trailer Make: ${trailerMake}
Trailer Year: ${trailerYear}
Trailer License Plate: ${trailerPlate}`;
  }, [currentDispatchDriver, currentDispatchTruck, currentDispatchTrailer]);

  const handleCopyDispatchInfo = async () => {
    if (!formattedDispatchText) return;
    try {
      await navigator.clipboard.writeText(formattedDispatchText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy dispatch text:", err);
      // Fallback prompt or execCommand
      const textarea = document.createElement("textarea");
      textarea.value = formattedDispatchText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const urgentAlerts = alerts.filter(
    (a) => a.status === "expired" || a.status === "urgent"
  );

  const pendingReminders = reminders.filter((r) => r.status === "Pending");
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 md:p-8 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>Zdunje Trucking Dispatch & Safety Operations</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Fleet Safety & Maintenance Center
          </h2>
          <p className="text-slate-300 text-sm mt-1 max-w-2xl">
            Real-time compliance monitoring, driver qualification files, equipment documents, and roadside maintenance logs.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10">
          <Link
            href="/trucks?action=new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Truck</span>
          </Link>
          <Link
            href="/drivers?action=new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Driver</span>
          </Link>
          <Link
            href="/maintenance?action=new"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Maintenance</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 rounded-xl transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Payment Calendar</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Trucks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Power Units (Trucks)
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900">
                {activeTrucks.length}
              </span>
              <span className="text-xs text-slate-400 font-medium ml-1.5">
                / {trucks.length} Active
              </span>
            </div>
            {inShopTrucks.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
                {inShopTrucks.length} In Shop
              </span>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/trucks"
              className="text-blue-600 hover:text-blue-800 font-semibold flex items-center"
            >
              <span>Manage fleet</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <span className="text-slate-400">
              {trucks.filter((t) => t.isTemporaryPlate).length} Temp Plates
            </span>
          </div>
        </div>

        {/* Trailers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Trailers
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Container className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900">
                {activeTrailers.length}
              </span>
              <span className="text-xs text-slate-400 font-medium ml-1.5">
                / {trailers.length} Total
              </span>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              Dry Van & Reefer
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/trailers"
              className="text-purple-600 hover:text-purple-800 font-semibold flex items-center"
            >
              <span>View trailers</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <span className="text-slate-400">
              {trailers.filter((tr) => tr.ownershipType === "Lease").length} Leased
            </span>
          </div>
        </div>

        {/* Active Drivers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Drivers
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-extrabold text-slate-900">
                {activeDrivers.length}
              </span>
              <span className="text-xs text-slate-400 font-medium ml-1.5">
                / {drivers.length} Ready
              </span>
            </div>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              100% CDL-A
            </span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/drivers"
              className="text-emerald-600 hover:text-emerald-800 font-semibold flex items-center"
            >
              <span>Driver folders</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <span className="text-slate-400">
              {drivers.filter((d) => d.assignedTruckId).length} Assigned
            </span>
          </div>
        </div>

        {/* Compliance / Safety Alerts */}
        <div
          className={`p-5 rounded-2xl border transition-shadow ${
            urgentAlerts.length > 0
              ? "bg-red-50/40 border-red-200 shadow-sm"
              : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Compliance Watchlist
            </span>
            <div
              className={`p-2 rounded-xl ${
                urgentAlerts.length > 0
                  ? "bg-red-100 text-red-600"
                  : "bg-emerald-50 text-emerald-600"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span
                className={`text-3xl font-extrabold ${
                  urgentAlerts.length > 0 ? "text-red-700" : "text-slate-900"
                }`}
              >
                {alerts.length}
              </span>
              <span className="text-xs text-slate-500 font-medium ml-1.5">
                Due &le; 30 Days
              </span>
            </div>
            {urgentAlerts.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full">
                Action Required
              </span>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link
              href="/documents"
              className="text-red-700 hover:text-red-900 font-semibold flex items-center"
            >
              <span>Review documents</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <span className="text-slate-500">
              {urgentAlerts.length} Urgent / Expired
            </span>
          </div>
        </div>
      </div>

      {/* Quick Dispatcher Info / Copy Load Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Quick Dispatcher Info & Driver Copy
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 uppercase">
                  Broker & Rate-Con
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly select a driver to generate and copy truck, driver, and trailer details in one click.
              </p>
            </div>
          </div>

          {formattedDispatchText && (
            <button
              onClick={handleCopyDispatchInfo}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all ${
                isCopied
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                  : "bg-blue-600 hover:bg-blue-700 text-white active:scale-98"
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-white animate-bounce" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Driver Info</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Selection Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Driver Selector with Live Search */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                <span>Select Driver</span>
                {currentDispatchDriver && (
                  <button
                    onClick={() => {
                      setSelectedDispatchDriverId("");
                      setSelectedDispatchTrailerId("");
                      setDriverSearchQuery("");
                    }}
                    className="text-[11px] font-medium text-slate-400 hover:text-slate-600 normal-case"
                  >
                    Clear selection
                  </button>
                )}
              </label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={
                    isDriverSearchOpen
                      ? driverSearchQuery
                      : currentDispatchDriver
                      ? `${currentDispatchDriver.firstName} ${currentDispatchDriver.lastName} (${currentDispatchDriver.phone || "No phone"})`
                      : driverSearchQuery
                  }
                  onFocus={() => {
                    setIsDriverSearchOpen(true);
                    setDriverSearchQuery("");
                  }}
                  onChange={(e) => {
                    setDriverSearchQuery(e.target.value);
                    setIsDriverSearchOpen(true);
                  }}
                  placeholder="Search driver by name, phone, truck #..."
                  className="w-full pl-9 pr-3 h-10 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {isDriverSearchOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsDriverSearchOpen(false)}
                    />
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100">
                      {filteredDispatchDrivers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          No drivers found matching &quot;{driverSearchQuery}&quot;
                        </div>
                      ) : (
                        filteredDispatchDrivers.map((d) => {
                          const trk = trucks.find((t) => t.id === d.assignedTruckId);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDispatchDriverId(d.id);
                                setSelectedDispatchTrailerId(""); // Reset trailer override to auto-detect
                                setIsDriverSearchOpen(false);
                                setDriverSearchQuery("");
                              }}
                              className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between ${
                                selectedDispatchDriverId === d.id
                                  ? "bg-blue-50/80 font-bold text-blue-900"
                                  : "text-slate-800"
                              }`}
                            >
                              <div>
                                <span className="font-semibold block">
                                  {d.firstName} {d.lastName}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {d.phone || "No phone"} • {d.state} CDL: {d.licenseNumber}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                                {trk ? `Truck #${trk.unitNumber}` : "Unassigned"}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Trailer Override Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Trailer
                </label>
                {detectedTrailer && !selectedDispatchTrailerId && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                    Auto-coupled to Truck #{currentDispatchTruck?.unitNumber}
                  </span>
                )}
              </div>
              <select
                value={currentDispatchTrailer ? currentDispatchTrailer.id : ""}
                onChange={(e) => setSelectedDispatchTrailerId(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- No Trailer Selected --</option>
                {trailers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    Trailer #{tr.unitNumber} ({tr.year} {tr.make} - Plate: {tr.plateNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Details Preview Pills */}
            {currentDispatchDriver && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Assigned Truck:</span>
                  <span className="font-semibold text-slate-800">
                    {currentDispatchTruck
                      ? `Unit #${currentDispatchTruck.unitNumber} (${currentDispatchTruck.make} ${currentDispatchTruck.model})`
                      : "None assigned"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Truck Plate:</span>
                  <span className="font-mono text-slate-800">
                    {currentDispatchTruck?.plateNumber || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trailer Unit:</span>
                  <span className="font-semibold text-slate-800">
                    {currentDispatchTrailer
                      ? `Unit #${currentDispatchTrailer.unitNumber} (${currentDispatchTrailer.make})`
                      : "None"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right Formatted Preview Card */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Clipboard Preview (Excel / Broker Format)
              </span>
              {currentDispatchDriver && (
                <button
                  onClick={handleCopyDispatchInfo}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? "Copied!" : "Copy"}</span>
                </button>
              )}
            </div>

            {currentDispatchDriver ? (
              <div className="relative flex-1">
                <pre className="w-full h-full min-h-[260px] p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800 selection:bg-emerald-800 selection:text-white">
                  {formattedDispatchText}
                </pre>
                <button
                  onClick={handleCopyDispatchInfo}
                  className="absolute top-3 right-3 p-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-sm"
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-[260px] border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50/50">
                <ClipboardCheck className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  No Driver Selected
                </p>
                <p className="text-[11px] text-slate-400 max-w-xs mt-1">
                  Select a driver from the dropdown on the left to immediately preview and copy their load info.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Payments & Reminder Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Upcoming Payments & Deadlines
              </h3>
              <p className="text-xs text-slate-500">
                Scheduled tractor lease installments, insurance policies, 2290 tax, and toll reloads.
              </p>
            </div>
          </div>
          <Link
            href="/calendar"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span>Open Calendar ({pendingReminders.length} Pending)</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingReminders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                All Scheduled Payments Settled
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                No pending payment reminders. Click &quot;Open Calendar&quot; to schedule new deadlines.
              </p>
            </div>
          ) : (
            pendingReminders
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
              .slice(0, 3)
              .map((rem) => {
                const isDueToday = rem.date === todayStr;
                const isOverdue = rem.date < todayStr;

                return (
                  <div
                    key={rem.id}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isOverdue
                            ? "bg-rose-100 text-rose-700"
                            : isDueToday
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {rem.name}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600">
                            {rem.category}
                          </span>
                          {isDueToday && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 animate-pulse">
                              Due Today
                            </span>
                          )}
                          {isOverdue && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                          <span>Due: <strong className="text-slate-700">{rem.date}</strong> at <strong className="text-slate-700">{rem.time}</strong></span>
                          {rem.relatedEntityName && (
                            <span>• {rem.relatedEntityName}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-center">
                      {rem.amount !== undefined && (
                        <span className="text-sm font-black text-slate-900">
                          ${rem.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <button
                        onClick={() => toggleReminderStatus(rem.id)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Mark Paid</span>
                      </button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      {/* Safety & Compliance Urgent Watchlist */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Safety & Expiration Alerts
              </h3>
              <p className="text-xs text-slate-500">
                Annual DOT inspections, CDL licenses, Medical cards, and registrations needing renewal.
              </p>
            </div>
          </div>
          <Link
            href="/documents"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center"
          >
            <span>View All ({alerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                Fleet is 100% Compliant
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                No documents or inspections expiring in the next 30 days.
              </p>
            </div>
          ) : (
            alerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      alert.status === "expired"
                        ? "bg-red-100 text-red-700"
                        : alert.status === "urgent"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 text-sm">
                        {alert.entityName}
                      </span>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-slate-100 text-slate-600">
                        {alert.entityType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {alert.documentType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  <div className="text-right">
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full ${
                        alert.status === "expired"
                          ? "bg-red-100 text-red-800"
                          : alert.status === "urgent"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {alert.status === "expired"
                        ? "EXPIRED"
                        : `Expires in ${alert.daysRemaining} days`}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Due: {alert.expirationDate}
                    </p>
                  </div>

                  <Link
                    href={
                      alert.entityType === "truck"
                        ? `/trucks?id=${alert.entityId}`
                        : alert.entityType === "trailer"
                        ? `/trailers?id=${alert.entityId}`
                        : `/drivers?id=${alert.entityId}`
                    }
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two Column Grid: Trucks Status & Recent Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trucks Fleet Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Power Units & BestPass Status
              </h3>
            </div>
            <Link
              href="/trucks"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              All Trucks →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {trucks.map((truck) => {
              const assignedDriver = drivers.find(
                (d) => d.id === truck.assignedDriverId
              );

              return (
                <div
                  key={truck.id}
                  className="p-5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">
                          Unit #{truck.unitNumber}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {truck.year} {truck.make} {truck.model}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                            truck.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {truck.status}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                        <div>
                          <span className="text-slate-400">Plate: </span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {truck.plateNumber}
                          </span>
                          {truck.isTemporaryPlate && (
                            <span className="ml-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded">
                              TEMP
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400">Ownership: </span>
                          <span className="font-semibold text-slate-800">
                            {truck.ownershipType} (${truck.truckValue.toLocaleString()})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">BestPass: </span>
                          <span
                            className={`font-semibold ${
                              truck.isBestPassLinked
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {truck.bestPassSerialNumber} (
                            {truck.isBestPassLinked ? "Linked" : "Unlinked"})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Assigned Driver: </span>
                          <span className="font-semibold text-slate-800">
                            {assignedDriver
                              ? `${assignedDriver.firstName} ${assignedDriver.lastName}`
                              : "Unassigned"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/trucks?id=${truck.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                    >
                      View Documents →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Maintenance & Repair Log */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Recent Maintenance & Repairs
              </h3>
            </div>
            <Link
              href="/maintenance"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              All Records →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {maintenanceRecords.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-5 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded">
                        Unit #{rec.truckUnitNumber}
                      </span>
                      <span className="font-semibold text-slate-900 text-sm">
                        {rec.serviceType}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                          rec.status === "Completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {rec.description}
                    </p>

                    <div className="mt-2 flex items-center space-x-4 text-xs text-slate-600">
                      <span>Shop: <strong className="text-slate-800">{rec.shopName}</strong></span>
                      <span>Odometer: <strong className="text-slate-800">{rec.odometer.toLocaleString()} mi</strong></span>
                      <span>Date: <strong className="text-slate-800">{rec.serviceDate}</strong></span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span className="text-sm font-extrabold text-slate-900 block">
                      ${rec.totalCost.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Inv #{rec.invoiceNumber}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
            <Link
              href="/shops"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 inline-flex items-center space-x-1"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Need Roadside or a Repair Shop? Browse Directory ({shops.length} verified vendors) →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        document={selectedDoc}
        entityName={docEntityName}
      />
    </div>
  );
}
