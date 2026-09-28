"use client";

import React, { useState } from "react";
import { FleetDocument } from "@/types/fleet";
import { fileToBase64 } from "@/lib/documentUtils";
import { Upload, X, File } from "lucide-react";

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  targetName: string;
  hasExpiration?: boolean;
  isDrugTestResult?: boolean;
  isDotRecord?: boolean;
  onUpload: (document: FleetDocument) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  category,
  targetName,
  hasExpiration = false,
  isDrugTestResult = false,
  isDotRecord = false,
  onUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [testDate, setTestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [testType, setTestType] = useState<
    "Random FMCSA" | "Pre-Employment" | "Post-Accident" | "Reasonable Suspicion"
  >("Random FMCSA");
  const [recordDate, setRecordDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [inspectionLevel, setInspectionLevel] = useState(
    "Level 3 (Driver-Only)"
  );
  const [inspectionResult, setInspectionResult] = useState<
    "Clean / No Violations" | "Violations Noted"
  >("Clean / No Violations");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName) {
        setDocName(file.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let fileData: string | undefined = undefined;
      let fileSize = 250000;
      let fileType = "application/pdf";

      if (selectedFile) {
        fileSize = selectedFile.size;
        fileType = selectedFile.type || "application/pdf";
        // Convert to base64 for local persistence
        fileData = await fileToBase64(selectedFile);
      }

      const finalName =
        docName.trim() ||
        (selectedFile
          ? selectedFile.name
          : `${category.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);

      const newDoc: FleetDocument = {
        id: `doc-${Date.now()}`,
        name: finalName,
        category,
        fileType,
        fileSize,
        uploadedAt: new Date().toISOString(),
        notes: notes.trim() || undefined,
        fileData,
      };

      if (hasExpiration && expirationDate) {
        newDoc.expirationDate = expirationDate;
      }

      if (isDrugTestResult) {
        newDoc.testDate = testDate;
        newDoc.testType = testType;
      }

      if (isDotRecord) {
        newDoc.recordDate = recordDate;
        newDoc.inspectionLevel = inspectionLevel;
        newDoc.inspectionResult = inspectionResult;
      }

      onUpload(newDoc);
      // Reset
      setSelectedFile(null);
      setDocName("");
      setExpirationDate("");
      setNotes("");
      onClose();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to process document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">
              Upload {category}
            </h3>
            <p className="text-xs text-slate-500">
              Attaching to: <span className="font-medium text-slate-800">{targetName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* File Picker Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Select Document File (PDF, PNG, JPG)
              </label>
              <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20 rounded-xl p-6 cursor-pointer transition-all">
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={handleFileChange}
                />
                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 text-blue-600 mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-800 flex items-center justify-center space-x-1">
                      <File className="w-4 h-4 text-blue-600" />
                      <span className="truncate max-w-xs">{selectedFile.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(0)} KB • Click to change
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Click to browse or drop file here
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PDF, scanned images, documents up to 25MB
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder={`e.g. ${category}_2026.pdf`}
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Drug Test Specific Inputs */}
            {isDrugTestResult && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Category / Pool
                  </label>
                  <select
                    value={testType}
                    onChange={(e) =>
                      setTestType(
                        e.target.value as
                          | "Random FMCSA"
                          | "Pre-Employment"
                          | "Post-Accident"
                          | "Reasonable Suspicion"
                      )
                    }
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Random FMCSA">Random FMCSA Pool</option>
                    <option value="Pre-Employment">Pre-Employment Test</option>
                    <option value="Post-Accident">Post-Accident</option>
                    <option value="Reasonable Suspicion">Reasonable Suspicion</option>
                    <option value="Return-to-Duty">Return-to-Duty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Test Date
                  </label>
                  <input
                    type="date"
                    value={testDate}
                    onChange={(e) => setTestDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* DOT Roadside Record Specific Inputs */}
            {isDotRecord && (
              <div className="space-y-3 p-3.5 bg-amber-50/70 rounded-xl border border-amber-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Inspection Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={recordDate}
                      onChange={(e) => setRecordDate(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Date roadside inspection occurred
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Inspection Level
                    </label>
                    <select
                      value={inspectionLevel}
                      onChange={(e) => setInspectionLevel(e.target.value)}
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Level 1 (Full Inspection)">Level 1 (Full Vehicle & Driver)</option>
                      <option value="Level 2 (Walk-Around)">Level 2 (Walk-Around & Driver)</option>
                      <option value="Level 3 (Driver-Only)">Level 3 (Driver-Only / Credentials / Log)</option>
                      <option value="Level 4 (Special Inspection)">Level 4 (Special Study)</option>
                      <option value="Level 5 (Vehicle-Only)">Level 5 (Vehicle-Only)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inspection Finding / Result
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setInspectionResult("Clean / No Violations")}
                      className={`h-10 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        inspectionResult === "Clean / No Violations"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      ✓ Clean / No Violations
                    </button>
                    <button
                      type="button"
                      onClick={() => setInspectionResult("Violations Noted")}
                      className={`h-10 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                        inspectionResult === "Violations Noted"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      ⚠ Violations Noted
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Expiration Date Tracker */}
            {hasExpiration && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Expiration / Renewal Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  The platform will automatically alert safety managers 30 days before this date.
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Notes / Audit Remarks (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Certificate #, issuing clinic, doctor name, or special conditions..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50/80 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 inline-flex items-center space-x-2 px-5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? "Uploading..." : "Save Document"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
