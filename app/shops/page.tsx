"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import { TruckShop, ShopType } from "@/types/fleet";
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  Star,
  ExternalLink,
  Edit,
  Trash2,
  X,
} from "lucide-react";

const COMMON_REPAIR_CATEGORIES = [
  "Tires & Alignment",
  "PM-A (Oil & Lube)",
  "PM-B (Full Inspection)",
  "Brakes & Air System",
  "Engine & Transmission",
  "Electrical & Lights",
  "Exhaust & Emissions (DPF)",
  "DOT Annual Inspection",
  "Roadside Emergency",
  "Towing & Recovery",
  "Trailer & Reefer Repair",
  "Welding & Fabrication",
];

function ShopsContent() {
  const searchParams = useSearchParams();
  const { shops, addShop, updateShop, deleteShop } = useFleet();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<TruckShop | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    businessName: "",
    businessAddress: "",
    state: "IL",
    phone: "",
    shopType: "Both" as ShopType,
    repairCategories: ["Tires & Alignment", "Brakes & Air System"],
    descriptionOfWork: "",
    googleMapsUrl: "",
    laborRatePerHour: 140,
    calloutFee: 150,
    rating: 5,
    notes: "",
  });

  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      openAddModal();
    }
  }, [searchParams]);

  const uniqueStates = useMemo(() => {
    return Array.from(new Set(shops.map((s) => s.state))).sort();
  }, [shops]);

  const filteredShops = useMemo(() => {
    return shops.filter((s) => {
      const q = search.toLowerCase();
      const matchSearch =
        s.businessName.toLowerCase().includes(q) ||
        s.businessAddress.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.descriptionOfWork.toLowerCase().includes(q) ||
        s.repairCategories.some((c) => c.toLowerCase().includes(q));

      const matchType =
        typeFilter === "all" ||
        s.shopType === typeFilter ||
        (s.shopType === "Both" &&
          (typeFilter === "Shop" || typeFilter === "Roadside"));

      const matchState = stateFilter === "all" || s.state === stateFilter;

      const matchCategory =
        categoryFilter === "all" ||
        s.repairCategories.includes(categoryFilter);

      return matchSearch && matchType && matchState && matchCategory;
    });
  }, [shops, search, typeFilter, stateFilter, categoryFilter]);

  const openAddModal = () => {
    setFormData({
      businessName: "",
      businessAddress: "",
      state: "IL",
      phone: "",
      shopType: "Both",
      repairCategories: ["Tires & Alignment", "Brakes & Air System"],
      descriptionOfWork: "",
      googleMapsUrl: "",
      laborRatePerHour: 140,
      calloutFee: 150,
      rating: 5,
      notes: "",
    });
    setEditingShop(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (shop: TruckShop) => {
    setEditingShop(shop);
    setFormData({
      businessName: shop.businessName,
      businessAddress: shop.businessAddress,
      state: shop.state,
      phone: shop.phone,
      shopType: shop.shopType,
      repairCategories: [...shop.repairCategories],
      descriptionOfWork: shop.descriptionOfWork,
      googleMapsUrl: shop.googleMapsUrl,
      laborRatePerHour: shop.laborRatePerHour,
      calloutFee: shop.calloutFee,
      rating: shop.rating,
      notes: shop.notes,
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim()) {
      alert("Please provide the Business Name");
      return;
    }

    if (editingShop) {
      updateShop(editingShop.id, formData);
    } else {
      addShop(formData);
    }
    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete shop vendor "${name}"?`)) {
      deleteShop(id);
    }
  };

  const toggleCategory = (cat: string) => {
    setFormData((prev) => {
      const exists = prev.repairCategories.includes(cat);
      if (exists) {
        return {
          ...prev,
          repairCategories: prev.repairCategories.filter((c) => c !== cat),
        };
      } else {
        return {
          ...prev,
          repairCategories: [...prev.repairCategories, cat],
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Truck Repair Shops & Roadside Directory
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800">
              {shops.length} Vendors
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch directory for emergency road calls, tire shops, OEM service centers, labor rates, and callout fees.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Shop / Roadside</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor name, address, phone, tire services..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Shop vs Roadside */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-700 font-medium"
          >
            <option value="all">All Types (Shop & Roadside)</option>
            <option value="Shop">Shop Facility Only</option>
            <option value="Roadside">Roadside Only</option>
            <option value="Both">Both Shop & Roadside</option>
          </select>

          {/* State */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-700 font-medium"
          >
            <option value="all">All States</option>
            {uniqueStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Service Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-slate-700 font-medium"
          >
            <option value="all">All Service Categories</option>
            {COMMON_REPAIR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shops Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredShops.length === 0 ? (
          <div className="col-span-full p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
            <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-600">
              No truck shops found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your state or service filters.
            </p>
          </div>
        ) : (
          filteredShops.map((shop) => (
            <div
              key={shop.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-slate-900 text-lg">
                        {shop.businessName}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                          shop.shopType === "Both"
                            ? "bg-purple-100 text-purple-800"
                            : shop.shopType === "Roadside"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {shop.shopType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{shop.businessAddress}</span>
                    </p>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center space-x-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 shrink-0">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-800">
                      {shop.rating}.0
                    </span>
                  </div>
                </div>

                {/* Pricing Badges */}
                <div className="grid grid-cols-2 gap-3 my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Labor Rate
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      ${shop.laborRatePerHour}
                      <span className="text-xs font-medium text-slate-500">
                        /hr
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Callout Fee
                    </span>
                    <span className="text-base font-extrabold text-slate-900 mt-0.5 block">
                      {shop.calloutFee > 0 ? (
                        `$${shop.calloutFee}`
                      ) : (
                        <span className="text-xs text-emerald-600 font-bold">
                          No Callout ($0)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Description of Work */}
                {shop.descriptionOfWork && (
                  <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                    {shop.descriptionOfWork}
                  </p>
                )}

                {/* Repair Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {shop.repairCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Dispatch Notes */}
                {shop.notes && (
                  <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-100 text-[11px] text-amber-900 mb-4">
                    <strong>Dispatcher Tip:</strong> {shop.notes}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <a
                    href={`tel:${shop.phone.replace(/[^0-9]/g, "")}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{shop.phone}</span>
                  </a>

                  {shop.googleMapsUrl && (
                    <a
                      href={shop.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(shop)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Edit Shop"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(shop.id, shop.businessName)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete Shop"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Shop Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[768px] max-h-[90vh] flex flex-col my-auto overflow-hidden">
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingShop
                    ? `Edit Shop: ${editingShop.businessName}`
                    : "Add New Truck Shop / Roadside"}
                </h3>
                <p className="text-xs text-slate-500">
                  Zdunje Trucking Vendor & Emergency Roadside Directory
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({ ...formData, businessName: e.target.value })
                      }
                      placeholder="e.g. TA Truck Service - Gary"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                      placeholder="(219) 555-0199"
                      className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Business Address & State
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={formData.businessAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessAddress: e.target.value,
                        })
                      }
                      placeholder="Street, City, State ZIP (e.g. 1201 Ripon Dr, Lake Station, IN 46405)"
                      className="flex-1 h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
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
                      placeholder="IN"
                      className="w-16 h-10 px-2 text-sm font-mono text-center uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Shop Type & Pricing & Star Rating */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Facility Type
                    </label>
                    <select
                      value={formData.shopType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          shopType: e.target.value as ShopType,
                        })
                      }
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Both">Both (Shop & Roadside)</option>
                      <option value="Shop">Shop Only</option>
                      <option value="Roadside">Roadside Service Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Labor Rate ($/hr)
                    </label>
                    <input
                      type="number"
                      value={formData.laborRatePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          laborRatePerHour: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="140"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Callout Fee ($)
                    </label>
                    <input
                      type="number"
                      value={formData.calloutFee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          calloutFee: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="150"
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Star Rating (1-5)
                    </label>
                    <select
                      value={formData.rating}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rating: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 Stars)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 Stars)</option>
                      <option value={3}>⭐⭐⭐ (3 Stars)</option>
                      <option value={2}>⭐⭐ (2 Stars)</option>
                      <option value={1}>⭐ (1 Star)</option>
                    </select>
                  </div>
                </div>

                {/* Google Maps Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Google Maps URL
                  </label>
                  <input
                    type="url"
                    value={formData.googleMapsUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, googleMapsUrl: e.target.value })
                    }
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Repair Categories Multi-tags */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                    Kind of Work They Do (Click to Select)
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {COMMON_REPAIR_CATEGORIES.map((cat) => {
                      const isSelected =
                        formData.repairCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                            isSelected
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Detailed Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Detailed Description of Services & Capability
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descriptionOfWork}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        descriptionOfWork: e.target.value,
                      })
                    }
                    placeholder="e.g. 12 bays, Detroit Diesel diagnostics, trailer alignments, reefer certified, 24/7 service..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Dispatcher Notes & Recommendations
                  </label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="e.g. Ask for Dave the manager, bilingual dispatch, fast tire replacement..."
                    className="w-full p-3 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
                  className="h-10 px-5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingShop ? "Update Shop" : "Save Shop"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ShopsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-400">Loading shops...</div>
      }
    >
      <ShopsContent />
    </React.Suspense>
  );
}

