"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  Search,
  Truck,
  Users,
  Wrench,
  Store,
  X,
  ArrowRight,
} from "lucide-react";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { trucks, trailers, drivers, shops, maintenanceRecords } = useFleet();

  // Handle Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    // Trucks
    const matchedTrucks = trucks.filter(
      (t) =>
        t.unitNumber.toLowerCase().includes(q) ||
        t.vin.toLowerCase().includes(q) ||
        t.plateNumber.toLowerCase().includes(q) ||
        t.make.toLowerCase().includes(q) ||
        t.model.toLowerCase().includes(q) ||
        t.bestPassSerialNumber.toLowerCase().includes(q)
    );

    // Trailers
    const matchedTrailers = trailers.filter(
      (tr) =>
        tr.unitNumber.toLowerCase().includes(q) ||
        tr.vin.toLowerCase().includes(q) ||
        tr.plateNumber.toLowerCase().includes(q) ||
        tr.make.toLowerCase().includes(q) ||
        tr.model.toLowerCase().includes(q)
    );

    // Drivers
    const matchedDrivers = drivers.filter(
      (d) =>
        `${d.firstName} ${d.middleName} ${d.lastName}`
          .toLowerCase()
          .includes(q) ||
        d.phone.toLowerCase().includes(q) ||
        d.licenseNumber.toLowerCase().includes(q) ||
        d.state.toLowerCase().includes(q)
    );

    // Shops
    const matchedShops = shops.filter(
      (s) =>
        s.businessName.toLowerCase().includes(q) ||
        s.businessAddress.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.repairCategories.some((c) => c.toLowerCase().includes(q))
    );

    // Maintenance
    const matchedMaintenance = maintenanceRecords.filter(
      (m) =>
        m.truckUnitNumber.toLowerCase().includes(q) ||
        m.invoiceNumber.toLowerCase().includes(q) ||
        m.serviceType.toLowerCase().includes(q) ||
        m.shopName.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
    );

    return {
      trucks: matchedTrucks,
      trailers: matchedTrailers,
      drivers: matchedDrivers,
      shops: matchedShops,
      maintenance: matchedMaintenance,
      totalCount:
        matchedTrucks.length +
        matchedTrailers.length +
        matchedDrivers.length +
        matchedShops.length +
        matchedMaintenance.length,
    };
  }, [query, trucks, trailers, drivers, shops, maintenanceRecords]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    router.push(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[768px] overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Trucks (Unit#, VIN, Plate), Drivers, Trailers, Shops, Invoices..."
            className="w-full text-base bg-transparent border-none focus:outline-none placeholder-slate-400 text-slate-900"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="ml-2 px-2 py-0.5 text-[11px] font-medium bg-slate-200 text-slate-600 rounded">
            ESC
          </span>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div className="py-12 text-center text-slate-400">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Quick Spotlight Search
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Type a Unit #, VIN, Driver name, BestPass serial, or Shop name to instantly find and open records.
              </p>
            </div>
          )}

          {results && results.totalCount === 0 && (
            <div className="py-12 text-center text-slate-400">
              <p className="text-sm text-slate-600 font-medium">
                No matching results found for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching by Unit #, last 6 of VIN, or driver surname.
              </p>
            </div>
          )}

          {results && (
            <>
              {/* Trucks */}
              {results.trucks.length > 0 && (
                <div>
                  <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    <Truck className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    <span>Trucks ({results.trucks.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.trucks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => navigateTo(`/trucks?id=${t.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group border border-transparent hover:border-blue-100"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 group-hover:text-blue-700">
                              Unit #{t.unitNumber}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.year} {t.make} {t.model}
                            </span>
                            {t.isTemporaryPlate && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
                                Temp Plate
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            VIN: {t.vin} • Plate: {t.plateNumber} • BestPass:{" "}
                            {t.bestPassSerialNumber}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers */}
              {results.drivers.length > 0 && (
                <div>
                  <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    <span>Drivers ({results.drivers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.drivers.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => navigateTo(`/drivers?id=${d.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors group border border-transparent hover:border-emerald-100"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 group-hover:text-emerald-700">
                              {d.firstName} {d.middleName} {d.lastName}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                              {d.state} CDL
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Phone: {d.phone} • License #: {d.licenseNumber}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trailers */}
              {results.trailers.length > 0 && (
                <div>
                  <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    <Truck className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
                    <span>Trailers ({results.trailers.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.trailers.map((tr) => (
                      <button
                        key={tr.id}
                        onClick={() => navigateTo(`/trailers?id=${tr.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 text-left transition-colors group border border-transparent hover:border-purple-100"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 group-hover:text-purple-700">
                              Trailer #{tr.unitNumber}
                            </span>
                            <span className="text-xs text-slate-500">
                              {tr.year} {tr.make} {tr.model}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 font-mono">
                            VIN: {tr.vin} • Plate: {tr.plateNumber}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Shops */}
              {results.shops.length > 0 && (
                <div>
                  <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    <Store className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    <span>Truck Shops & Roadside ({results.shops.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.shops.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigateTo(`/shops?id=${s.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors group border border-transparent hover:border-amber-100"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 group-hover:text-amber-800">
                              {s.businessName}
                            </span>
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded">
                              {s.shopType}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {s.businessAddress} • {s.phone} • Rate: ${s.laborRatePerHour}/hr
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Maintenance */}
              {results.maintenance.length > 0 && (
                <div>
                  <div className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 px-2">
                    <Wrench className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    <span>Maintenance Records ({results.maintenance.length})</span>
                  </div>
                  <div className="space-y-1">
                    {results.maintenance.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => navigateTo(`/maintenance?id=${m.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50 text-left transition-colors group border border-transparent hover:border-indigo-100"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-slate-900 group-hover:text-indigo-700">
                              Unit #{m.truckUnitNumber} — {m.serviceType}
                            </span>
                            <span className="text-xs text-slate-500">
                              ${m.totalCost.toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {m.serviceDate} • Invoice #{m.invoiceNumber} • {m.shopName}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-semibold shadow-xs">
                ↑
              </kbd>{" "}
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-semibold shadow-xs">
                ↓
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 font-semibold shadow-xs">
                ESC
              </kbd>{" "}
              close
            </span>
          </div>
          <span>Zdunje Trucking LLC Unified Search</span>
        </div>
      </div>
    </div>
  );
};
