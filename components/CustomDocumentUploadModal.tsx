"use client";

import React, { useState } from "react";
import { FleetDocument } from "@/types/fleet";
import { fileToBase64 } from "@/lib/documentUtils";
import { Upload, X, File, FileText } from "lucide-react";

interface CustomDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  onUpload: (document: FleetDocument) => void;
}

export const CustomDocumentUploadModal: React.FC<CustomDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  targetName,
  onUpload,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [description, setDescription] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!docName.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "");
        setDocName(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      alert("Please provide a Document Name.");
      return;
    }
    if (!selectedFile) {
      alert("Please select a document file to upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      let fileData: string | undefined = undefined;
      const fileSize = selectedFile.size;
      const fileType = selectedFile.type || "application/pdf";

      fileData = await fileToBase64(selectedFile);

      const newDoc: FleetDocument = {
        id: `custom-doc-${Date.now()}`,
        name: docName.trim(),
        category: "Additional Document",
        description: description.trim() || undefined,
        notes: description.trim() || undefined,
        fileType,
        fileSize,
        uploadedAt: new Date().toISOString(),
        expirationDate: expirationDate || undefined,
        fileData,
      };

      onUpload(newDoc);
      setSelectedFile(null);
      setDocName("");
      setDescription("");
      setExpirationDate("");
      onClose();
    } catch (err) {
      console.error("Failed to upload document", err);
      alert("Failed to process document. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col my-auto overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Upload Document</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Attach custom paperwork or records to <span className="font-semibold text-slate-700">{targetName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Document File <span className="text-red-500">*</span>
            </label>
            <label className="relative flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/20 rounded-xl p-5 cursor-pointer transition-all">
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={handleFileChange}
              />
              <div className="p-2.5 bg-white rounded-full shadow-xs border border-slate-200 text-blue-600 mb-2">
                <Upload className="w-5 h-5" />
              </div>
              {selectedFile ? (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-800 flex items-center justify-center space-x-1.5">
                    <File className="w-4 h-4 text-blue-600" />
                    <span className="truncate max-w-xs">{selectedFile.name}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(0)} KB • Click or drop to replace
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700">
                    Click to browse or drop file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, images (PNG, JPG), Word & Excel docs up to 25MB
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. California Clean Truck Check, IFTA Permit, Lease Addendum"
                className="w-full h-10 pl-9 pr-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description / Notes
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description, record details, account #, or notes about this document..."
                className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Expiration Date (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Expiration Date (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Leave empty if this is a permanent document without renewal deadlines.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile || !docName.trim()}
              className="h-10 inline-flex items-center space-x-2 px-5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? "Uploading..." : "Upload Document"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
