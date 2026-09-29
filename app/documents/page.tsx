"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useFleet } from "@/context/FleetContext";
import { FleetDocument, DriverDocuments } from "@/types/fleet";
import {
  FolderLock,
  Search,
  FileText,
  Eye,
  Download,
  AlertTriangle,
  Truck,
  Users,
  Wrench,
  Container,
} from "lucide-react";
import { DocumentViewerModal } from "@/components/DocumentViewerModal";
import { downloadDocument } from "@/lib/documentUtils";

interface ConsolidatedDocument {
  doc: FleetDocument;
  entityType: "truck" | "trailer" | "driver" | "maintenance";
  entityId: string;
  entityName: string;
  linkUrl: string;
}

export default function DocumentsPage() {
  const { trucks, trailers, drivers, maintenanceRecords, alerts } = useFleet();

  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [expirationFilter, setExpirationFilter] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<FleetDocument | null>(null);
  const [entityName, setEntityName] = useState("");

  // Gather all documents
  const allDocuments = useMemo(() => {
    const list: ConsolidatedDocument[] = [];

    // Trucks
    trucks.forEach((t) => {
      Object.entries(t.documents || {}).forEach(([, doc]) => {
        if (doc) {
          list.push({
            doc,
            entityType: "truck",
            entityId: t.id,
            entityName: `Unit #${t.unitNumber} (${t.make})`,
            linkUrl: `/trucks?id=${t.id}`,
          });
        }
      });
      (t.customDocuments || []).forEach((doc) => {
        list.push({
          doc,
          entityType: "truck",
          entityId: t.id,
          entityName: `Unit #${t.unitNumber} (${t.make})`,
          linkUrl: `/trucks?id=${t.id}`,
        });
      });
    });

    // Trailers
    trailers.forEach((tr) => {
      Object.entries(tr.documents || {}).forEach(([, doc]) => {
        if (doc) {
          list.push({
            doc,
            entityType: "trailer",
            entityId: tr.id,
            entityName: `Trailer #${tr.unitNumber}`,
            linkUrl: `/trailers?id=${tr.id}`,
          });
        }
      });
      (tr.customDocuments || []).forEach((doc) => {
        list.push({
          doc,
          entityType: "trailer",
          entityId: tr.id,
          entityName: `Trailer #${tr.unitNumber}`,
          linkUrl: `/trailers?id=${tr.id}`,
        });
      });
    });

    // Drivers
    drivers.forEach((d) => {
      const driverName = `${d.firstName} ${d.lastName}`;
      const dDocs = (d.documents || {}) as Partial<DriverDocuments>;
      const singleKeys: (keyof DriverDocuments)[] = [
        "mvr",
        "pspAuth",
        "pspReport",
        "cdl",
        "medCard",
        "clearingHouse",
        "applicationFile",
        "drugCustodyForm",
        "drugPassport",
        "bankInfoDoc",
        "einLetter",
        "onboardingDoc",
        "leaseAgreement",
      ];

      singleKeys.forEach((k) => {
        const doc = dDocs[k];
        if (doc && typeof doc === "object" && "id" in doc) {
          list.push({
            doc: doc as FleetDocument,
            entityType: "driver",
            entityId: d.id,
            entityName: driverName,
            linkUrl: `/drivers?id=${d.id}`,
          });
        }
      });

      // Drug tests
      (dDocs.drugTestResults || []).forEach((doc) => {
        list.push({
          doc,
          entityType: "driver",
          entityId: d.id,
          entityName: driverName,
          linkUrl: `/drivers?id=${d.id}`,
        });
      });

      // Driver DOT records
      (dDocs.dotRecords || []).forEach((doc) => {
        list.push({
          doc,
          entityType: "driver",
          entityId: d.id,
          entityName: driverName,
          linkUrl: `/drivers?id=${d.id}`,
        });
      });
    });

    // Maintenance
    maintenanceRecords.forEach((m) => {
      if (m.invoiceDocument) {
        list.push({
          doc: m.invoiceDocument,
          entityType: "maintenance",
          entityId: m.id,
          entityName: `Unit #${m.truckUnitNumber} (${m.serviceType})`,
          linkUrl: `/maintenance?id=${m.id}`,
        });
      }
    });

    return list;
  }, [trucks, trailers, drivers, maintenanceRecords]);

  // Filtered
  const filteredDocuments = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return allDocuments.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.doc.name.toLowerCase().includes(q) ||
        item.doc.category.toLowerCase().includes(q) ||
        item.entityName.toLowerCase().includes(q);

      const matchEntity =
        entityFilter === "all" || item.entityType === entityFilter;

      let matchExp = true;
      if (expirationFilter === "expired") {
        if (!item.doc.expirationDate) matchExp = false;
        else {
          const exp = new Date(item.doc.expirationDate);
          matchExp = exp.getTime() < today.getTime();
        }
      } else if (expirationFilter === "due30") {
        if (!item.doc.expirationDate) matchExp = false;
        else {
          const exp = new Date(item.doc.expirationDate);
          const diffDays = Math.ceil(
            (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );
          matchExp = diffDays >= 0 && diffDays <= 30;
        }
      } else if (expirationFilter === "valid") {
        if (item.doc.expirationDate) {
          const exp = new Date(item.doc.expirationDate);
          matchExp = exp.getTime() >= today.getTime();
        }
      }

      return matchSearch && matchEntity && matchExp;
    });
  }, [allDocuments, search, entityFilter, expirationFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Documents Vault & Compliance Archive
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
              {allDocuments.length} Documents
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Unified archive across all Trucks, Trailers, Drivers, and Maintenance Invoices with expiration tracking.
          </p>
        </div>
      </div>

      {/* Expiration Alerts Summary Banner */}
      {alerts.length > 0 && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {alerts.length} Document{alerts.length > 1 ? "s" : ""} Expiring or Expired
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Immediate attention required for DOT inspections, driver CDL licenses, or medical certificates.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpirationFilter("due30")}
            className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors shrink-0"
          >
            Show Expiring Only
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document name, category, truck unit, or driver name..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Entity Filter */}
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
          >
            <option value="all">All Fleet Assets</option>
            <option value="truck">Trucks Only</option>
            <option value="trailer">Trailers Only</option>
            <option value="driver">Drivers Only</option>
            <option value="maintenance">Maintenance Invoices</option>
          </select>

          {/* Expiration Filter */}
          <select
            value={expirationFilter}
            onChange={(e) => setExpirationFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
          >
            <option value="all">All Expiration States</option>
            <option value="due30">Expiring in &le; 30 Days</option>
            <option value="expired">Expired Only</option>
            <option value="valid">Valid / Active</option>
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-6">Document Name & Category</th>
                <th className="py-3.5 px-4">Associated Entity</th>
                <th className="py-3.5 px-4">Uploaded Date</th>
                <th className="py-3.5 px-4">Expiration / Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FolderLock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">
                      No documents match your filter
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((item) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  let expBadge = null;
                  if (item.doc.expirationDate) {
                    const exp = new Date(item.doc.expirationDate);
                    exp.setHours(0, 0, 0, 0);
                    const days = Math.ceil(
                      (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (days <= 0) {
                      expBadge = (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800">
                          EXPIRED ({item.doc.expirationDate})
                        </span>
                      );
                    } else if (days <= 30) {
                      expBadge = (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                          Expires in {days}d ({item.doc.expirationDate})
                        </span>
                      );
                    } else {
                      expBadge = (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700">
                          Valid: {item.doc.expirationDate}
                        </span>
                      );
                    }
                  } else {
                    expBadge = (
                      <span className="px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        Permanent
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={item.doc.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Name & Category */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">
                              {item.doc.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {item.doc.category}
                              {item.doc.testType && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[9px] font-bold">
                                  {item.doc.testType}
                                </span>
                              )}
                              {item.doc.inspectionLevel && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-200 text-slate-800 rounded text-[9px] font-bold">
                                  {item.doc.inspectionLevel}
                                </span>
                              )}
                              {item.doc.inspectionResult && (
                                <span
                                  className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    item.doc.inspectionResult === "Violations Noted"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-emerald-100 text-emerald-800"
                                  }`}
                                >
                                  {item.doc.inspectionResult}
                                </span>
                              )}
                              {item.doc.recordDate && (
                                <span className="ml-1.5 text-slate-500 font-mono text-[10px]">
                                  (Date: {item.doc.recordDate})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Associated Entity */}
                      <td className="py-4 px-4">
                        <Link
                          href={item.linkUrl}
                          className="inline-flex items-center space-x-1.5 font-semibold text-slate-800 hover:text-blue-600 transition-colors"
                        >
                          {item.entityType === "truck" && (
                            <Truck className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {item.entityType === "trailer" && (
                            <Container className="w-3.5 h-3.5 text-purple-600" />
                          )}
                          {item.entityType === "driver" && (
                            <Users className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {item.entityType === "maintenance" && (
                            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                          <span>{item.entityName}</span>
                        </Link>
                      </td>

                      {/* Upload Date */}
                      <td className="py-4 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(item.doc.uploadedAt).toLocaleDateString()}
                      </td>

                      {/* Expiration Status */}
                      <td className="py-4 px-4">{expBadge}</td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setSelectedDoc(item.doc);
                              setEntityName(item.entityName);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview file"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => downloadDocument(item.doc)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        document={selectedDoc}
        entityName={entityName}
      />
    </div>
  );
}
