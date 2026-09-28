"use client";

import React from "react";
import { FleetDocument } from "@/types/fleet";
import { downloadDocument } from "@/lib/documentUtils";
import {
  X,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  FileCheck,
  Tag,
  Info,
} from "lucide-react";

interface DocumentViewerModalProps {
  document: FleetDocument | null;
  isOpen: boolean;
  onClose: () => void;
  entityName?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  entityName,
}) => {
  if (!isOpen || !doc) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let expirationStatus: "none" | "expired" | "urgent" | "valid" = "none";
  let daysDiff = 0;

  if (doc.expirationDate) {
    const exp = new Date(doc.expirationDate);
    exp.setHours(0, 0, 0, 0);
    daysDiff = Math.ceil(
      (exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 0) expirationStatus = "expired";
    else if (daysDiff <= 30) expirationStatus = "urgent";
    else expirationStatus = "valid";
  }

  const isImage =
    doc.fileType.startsWith("image/") ||
    doc.name.endsWith(".jpg") ||
    doc.name.endsWith(".png") ||
    doc.name.endsWith(".jpeg");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-slate-900 text-lg">
                  {doc.name}
                </h3>
                {entityName && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-200/80 text-slate-700">
                    {entityName}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Category: <span className="font-medium text-slate-700">{doc.category}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => downloadDocument(doc)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expiration Banner if applicable */}
        {doc.expirationDate && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between border-b ${
              expirationStatus === "expired"
                ? "bg-red-50 text-red-700 border-red-200"
                : expirationStatus === "urgent"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {expirationStatus === "expired" ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : expirationStatus === "urgent" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              )}
              <span>
                {expirationStatus === "expired"
                  ? `EXPIRED: Passed expiration on ${doc.expirationDate} (${Math.abs(
                      daysDiff
                    )} days ago)`
                  : expirationStatus === "urgent"
                  ? `ATTENTION REQUIRED: Expires on ${doc.expirationDate} (in ${daysDiff} days)`
                  : `Document Valid: Active through ${doc.expirationDate}`}
              </span>
            </div>
            <span className="text-[11px] uppercase tracking-wider font-semibold opacity-75">
              Compliance Tracking
            </span>
          </div>
        )}

        {/* Content Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">
          {isImage && doc.fileData ? (
            <div className="flex items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.fileData}
                alt={doc.name}
                className="max-h-[460px] object-contain rounded-lg"
              />
            </div>
          ) : doc.fileData && doc.fileType === "application/pdf" ? (
            <div className="w-full h-[460px] bg-white rounded-xl border border-slate-200 overflow-hidden">
              <iframe
                src={doc.fileData}
                className="w-full h-full"
                title={doc.name}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FileCheck className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 mb-1">
                Zdunje Trucking LLC Document Vault
              </h4>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Verified compliance record on file. Download the file below to inspect original signatures or print for the truck cab.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Category</span>
                  <span className="font-semibold text-slate-700">
                    {doc.category}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Uploaded Date</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">File Size</span>
                  <span className="font-semibold text-slate-700">
                    {(doc.fileSize / 1024).toFixed(0)} KB
                  </span>
                </div>
                {doc.expirationDate && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Expiration</span>
                    <span className="font-semibold text-slate-700">
                      {doc.expirationDate}
                    </span>
                  </div>
                )}
                {doc.testType && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Test Pool</span>
                    <span className="font-semibold text-slate-700">
                      {doc.testType}
                    </span>
                  </div>
                )}
                {doc.testDate && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">Test Date</span>
                    <span className="font-semibold text-slate-700">
                      {doc.testDate}
                    </span>
                  </div>
                )}
              </div>

              {doc.notes && (
                <div className="mt-4 max-w-lg mx-auto p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-left text-xs text-blue-900 flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Notes:</span>
                    <span>{doc.notes}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Format: {doc.fileType || "Document"}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => downloadDocument(doc)}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
