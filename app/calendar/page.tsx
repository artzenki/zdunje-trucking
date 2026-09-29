"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useFleet } from "@/context/FleetContext";
import {
  PaymentReminder,
  PaymentCategory,
  PaymentReminderStatus,
} from "@/types/fleet";
import {
  CalendarDays,
  Plus,
  Clock,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Calendar as CalendarIcon,
  Truck,
  Search,
  Check,
  X,
  Repeat,
} from "lucide-react";

const CATEGORY_COLORS: Record<
  PaymentCategory,
  { bg: string; text: string; border: string; dot: string }
> = {
  "Lease / Finance": {
    bg: "bg-blue-50 text-blue-800",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-600",
  },
  Insurance: {
    bg: "bg-purple-50 text-purple-800",
    text: "text-purple-700",
    border: "border-purple-200",
    dot: "bg-purple-600",
  },
  "Registration & Plates": {
    bg: "bg-amber-50 text-amber-800",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-600",
  },
  "Tax (2290 / IFTA)": {
    bg: "bg-rose-50 text-rose-800",
    text: "text-rose-700",
    border: "border-rose-200",
    dot: "bg-rose-600",
  },
  "Tolls & Transponder": {
    bg: "bg-cyan-50 text-cyan-800",
    text: "text-cyan-700",
    border: "border-cyan-200",
    dot: "bg-cyan-600",
  },
  "Maintenance & Parts": {
    bg: "bg-emerald-50 text-emerald-800",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-600",
  },
  "Driver Settlement": {
    bg: "bg-indigo-50 text-indigo-800",
    text: "text-indigo-700",
    border: "border-indigo-200",
    dot: "bg-indigo-600",
  },
  Other: {
    bg: "bg-slate-100 text-slate-800",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-600",
  },
};

const CATEGORIES: PaymentCategory[] = [
  "Lease / Finance",
  "Insurance",
  "Registration & Plates",
  "Tax (2290 / IFTA)",
  "Tolls & Transponder",
  "Maintenance & Parts",
  "Driver Settlement",
  "Other",
];

function CalendarPageContent() {
  const {
    reminders = [],
    trucks = [],
    trailers = [],
    drivers = [],
    addReminder,
    updateReminder,
    deleteReminder,
    toggleReminderStatus,
  } = useFleet();

  // View state
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Completed">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<PaymentReminder | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    category: "Lease / Finance" as PaymentCategory,
    reasonNotes: "",
    status: "Pending" as PaymentReminderStatus,
    relatedEntityType: "general" as "truck" | "trailer" | "driver" | "general",
    relatedEntityId: "",
    isRecurring: false,
    recurrence: "Monthly" as "Once" | "Weekly" | "Monthly" | "Quarterly" | "Yearly",
  });

  // Today ISO
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    return (reminders || []).filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.reasonNotes && r.reasonNotes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.relatedEntityName && r.relatedEntityName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "All" || r.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" || r.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [reminders, searchQuery, statusFilter, categoryFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const pendingList = (reminders || []).filter((r) => r.status === "Pending");
    const completedList = (reminders || []).filter((r) => r.status === "Completed");

    const totalPendingAmount = pendingList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const dueTodayCount = pendingList.filter((r) => r.date === todayStr).length;
    const overdueCount = pendingList.filter((r) => r.date < todayStr).length;

    return {
      totalPendingAmount,
      dueTodayCount,
      overdueCount,
      completedCount: completedList.length,
    };
  }, [reminders, todayStr]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(todayStr);
  };

  // Group reminders by date for the calendar
  const remindersByDate = useMemo(() => {
    const map: Record<string, PaymentReminder[]> = {};
    filteredReminders.forEach((r) => {
      if (!map[r.date]) map[r.date] = [];
      map[r.date].push(r);
    });
    return map;
  }, [filteredReminders]);

  // Open modal for Create
  const handleOpenCreateModal = (defaultDate?: string) => {
    setEditingReminder(null);
    setFormData({
      name: "",
      amount: "",
      date: defaultDate || selectedDay || new Date().toISOString().split("T")[0],
      time: "10:00",
      category: "Lease / Finance",
      reasonNotes: "",
      status: "Pending",
      relatedEntityType: "general",
      relatedEntityId: "",
      isRecurring: false,
      recurrence: "Monthly",
    });
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item: PaymentReminder) => {
    setEditingReminder(item);
    setFormData({
      name: item.name,
      amount: item.amount !== undefined ? String(item.amount) : "",
      date: item.date,
      time: item.time || "10:00",
      category: item.category,
      reasonNotes: item.reasonNotes || "",
      status: item.status,
      relatedEntityType: item.relatedEntityType || "general",
      relatedEntityId: item.relatedEntityId || "",
      isRecurring: !!item.isRecurring,
      recurrence: item.recurrence || "Monthly",
    });
    setIsModalOpen(true);
  };

  // Handle Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    let entityName = "";
    if (formData.relatedEntityType === "truck") {
      const t = trucks.find((tr) => tr.id === formData.relatedEntityId);
      if (t) entityName = `Unit #${t.unitNumber} (${t.make})`;
    } else if (formData.relatedEntityType === "trailer") {
      const tr = trailers.find((t) => t.id === formData.relatedEntityId);
      if (tr) entityName = `Trailer #${tr.unitNumber}`;
    } else if (formData.relatedEntityType === "driver") {
      const d = drivers.find((dr) => dr.id === formData.relatedEntityId);
      if (d) entityName = `${d.firstName} ${d.lastName}`;
    }

    const payload = {
      name: formData.name.trim(),
      amount: formData.amount ? parseFloat(formData.amount) : undefined,
      date: formData.date,
      time: formData.time,
      category: formData.category,
      reasonNotes: formData.reasonNotes.trim(),
      status: formData.status,
      relatedEntityType: formData.relatedEntityType,
      relatedEntityId: formData.relatedEntityId || null,
      relatedEntityName: entityName,
      isRecurring: formData.isRecurring,
      recurrence: formData.recurrence,
      completedAt: formData.status === "Completed" ? new Date().toISOString() : null,
    };

    if (editingReminder) {
      updateReminder(editingReminder.id, payload);
    } else {
      addReminder(payload);
    }

    setIsModalOpen(false);
  };

  const activeDayReminders = useMemo(() => {
    if (!selectedDay) return [];
    return remindersByDate[selectedDay] || [];
  }, [selectedDay, remindersByDate]);

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Payment & Reminder Calendar
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800">
              {reminders.length} Scheduled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track and schedule time-sensitive truck leases, insurance premiums, IFTA/2290 tax filings, and tolls.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "calendar"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agenda View
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Reminder</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Total</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            ${metrics.totalPendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400">Scheduled payouts</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Due Today</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {metrics.dueTodayCount}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Requires attention today</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600 tracking-tight">
            {metrics.overdueCount}
          </div>
          <span className="text-[11px] text-rose-500 font-medium">Past due date</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
            {metrics.completedCount}
          </div>
          <span className="text-[11px] text-slate-400">Paid & settled records</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payments, units, notes, or vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-xl text-xs font-semibold text-slate-600">
            {(["All", "Pending", "Completed"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  statusFilter === s ? "bg-white text-slate-900 shadow-sm" : "hover:text-slate-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-700"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Month Calendar Grid (8 cols on lg) */}
          <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-lg font-bold text-slate-900">{monthName}</h2>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={prevMonth}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[85px] bg-slate-50/40 rounded-xl" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDay = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayReminders = remindersByDate[formattedDay] || [];
                const isToday = formattedDay === todayStr;
                const isSelected = selectedDay === formattedDay;

                return (
                  <div
                    key={formattedDay}
                    onClick={() => setSelectedDay(formattedDay)}
                    className={`min-h-[88px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-sm"
                        : isToday
                        ? "border-amber-300 bg-amber-50/20"
                        : "border-slate-200/70 hover:border-slate-300 bg-white hover:bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : isSelected
                            ? "bg-slate-900 text-white"
                            : "text-slate-700"
                        }`}
                      >
                        {dayNum}
                      </span>
                      {dayReminders.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                          {dayReminders.length}
                        </span>
                      )}
                    </div>

                    {/* Compact Reminders List inside day */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayReminders.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate font-semibold flex items-center space-x-1 ${
                            item.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800 line-through opacity-70"
                              : CATEGORY_COLORS[item.category]?.bg || "bg-blue-50 text-blue-700"
                          }`}
                          title={`${item.time} - ${item.name} (${item.status})`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              item.status === "Completed"
                                ? "bg-emerald-500"
                                : CATEGORY_COLORS[item.category]?.dot || "bg-blue-600"
                            }`}
                          />
                          <span className="truncate">{item.time} {item.name}</span>
                        </div>
                      ))}
                      {dayReminders.length > 2 && (
                        <span className="text-[9px] font-bold text-slate-400 pl-1">
                          +{dayReminders.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Details Panel (4 cols on lg) */}
          <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedDay
                    ? new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Select a Date"}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedDay ? `${activeDayReminders.length} payments scheduled` : "Click a day on the calendar"}
                </span>
              </div>

              {selectedDay && (
                <button
                  onClick={() => handleOpenCreateModal(selectedDay)}
                  className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Add reminder for this day"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {selectedDay ? (
              activeDayReminders.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    No payment reminders scheduled for this date.
                  </p>
                  <button
                    onClick={() => handleOpenCreateModal(selectedDay)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Payment</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {activeDayReminders.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        item.status === "Completed"
                          ? "bg-slate-50/70 border-slate-200 opacity-80"
                          : "bg-white border-slate-200/90 shadow-sm hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              CATEGORY_COLORS[item.category]?.bg || "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.category}
                          </span>
                          <h4
                            className={`text-xs font-bold ${
                              item.status === "Completed"
                                ? "line-through text-slate-500"
                                : "text-slate-900"
                            }`}
                          >
                            {item.name}
                          </h4>
                        </div>

                        <div className="text-right shrink-0">
                          {item.amount !== undefined && (
                            <span className="text-xs font-extrabold text-slate-900">
                              ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Time and Entity Link */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-2">
                        <span className="flex items-center space-x-1 font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.time}</span>
                        </span>

                        {item.relatedEntityName && (
                          <span className="flex items-center space-x-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>{item.relatedEntityName}</span>
                          </span>
                        )}

                        {item.isRecurring && (
                          <span className="flex items-center space-x-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-semibold text-[10px]">
                            <Repeat className="w-3 h-3" />
                            <span>{item.recurrence}</span>
                          </span>
                        )}
                      </div>

                      {/* Reason / Notes */}
                      {item.reasonNotes && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg mt-2 leading-relaxed border border-slate-100">
                          {item.reasonNotes}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100">
                        <button
                          onClick={() => toggleReminderStatus(item.id)}
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            item.status === "Completed"
                              ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{item.status === "Completed" ? "Mark Pending" : "Mark as Paid"}</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete reminder "${item.name}"?`)) {
                                deleteReminder(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Click any day on the calendar to view and manage payment reminders.
              </div>
            )}
          </div>
        </div>
      )}

      {/* AGENDA / LIST VIEW */}
      {viewMode === "agenda" && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Chronological Reminders List ({filteredReminders.length})
            </h2>
            <span className="text-xs text-slate-500">Sorted by payment due date</span>
          </div>

          {filteredReminders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CalendarDays className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">No payment reminders match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReminders
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                .map((item) => {
                  const isOverdue = item.status === "Pending" && item.date < todayStr;
                  const isDueToday = item.status === "Pending" && item.date === todayStr;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        item.status === "Completed" ? "bg-slate-50/30 opacity-75" : ""
                      }`}
                    >
                      <div className="flex items-start space-x-3 flex-1">
                        <button
                          onClick={() => toggleReminderStatus(item.id)}
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-colors border ${
                            item.status === "Completed"
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 hover:border-slate-400 text-transparent hover:text-slate-300"
                          }`}
                          title={item.status === "Completed" ? "Mark Pending" : "Mark as Paid"}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                CATEGORY_COLORS[item.category]?.bg || "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {item.category}
                            </span>

                            {isDueToday && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                                Due Today
                              </span>
                            )}

                            {isOverdue && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Overdue
                              </span>
                            )}

                            {item.status === "Completed" && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Paid
                              </span>
                            )}

                            {item.isRecurring && (
                              <span className="flex items-center space-x-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                <Repeat className="w-3 h-3" />
                                <span>{item.recurrence}</span>
                              </span>
                            )}
                          </div>

                          <h3
                            className={`text-sm font-bold ${
                              item.status === "Completed" ? "line-through text-slate-500" : "text-slate-900"
                            }`}
                          >
                            {item.name}
                          </h3>

                          {item.reasonNotes && (
                            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                              {item.reasonNotes}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                            <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.date}</span>
                            </span>
                            <span className="flex items-center space-x-1 text-slate-600 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.time}</span>
                            </span>
                            {item.relatedEntityName && (
                              <span className="flex items-center space-x-1 text-slate-600">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.relatedEntityName}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end space-x-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                        {item.amount !== undefined && (
                          <div className="text-right">
                            <span className="text-base font-black text-slate-900">
                              ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit reminder"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete reminder "${item.name}"?`)) {
                                deleteReminder(item.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete reminder"
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
      )}

      {/* CREATE / EDIT REMINDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingReminder ? "Edit Payment Reminder" : "Schedule New Payment Reminder"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set date, exact alert time, amount, and reason notes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Payment Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Name / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit #101 Penske Lease Installment"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                />
              </div>

              {/* Date & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Due Time / Reminder Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                  />
                </div>
              </div>

              {/* Amount & Category Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Amount ($) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full h-10 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as PaymentCategory })
                    }
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linked Unit / Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Link to Fleet Asset
                  </label>
                  <select
                    value={formData.relatedEntityType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relatedEntityType: e.target.value as
                          | "truck"
                          | "trailer"
                          | "driver"
                          | "general",
                        relatedEntityId: "",
                      })
                    }
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                  >
                    <option value="general">General Fleet Expense</option>
                    <option value="truck">Specific Truck (Power Unit)</option>
                    <option value="trailer">Specific Trailer</option>
                    <option value="driver">Specific Driver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Asset
                  </label>
                  {formData.relatedEntityType === "truck" && (
                    <select
                      value={formData.relatedEntityId}
                      onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                    >
                      <option value="">-- Choose Truck --</option>
                      {trucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          Unit #{t.unitNumber} ({t.make} {t.model})
                        </option>
                      ))}
                    </select>
                  )}

                  {formData.relatedEntityType === "trailer" && (
                    <select
                      value={formData.relatedEntityId}
                      onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                    >
                      <option value="">-- Choose Trailer --</option>
                      {trailers.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          Trailer #{tr.unitNumber} ({tr.make})
                        </option>
                      ))}
                    </select>
                  )}

                  {formData.relatedEntityType === "driver" && (
                    <select
                      value={formData.relatedEntityId}
                      onChange={(e) => setFormData({ ...formData, relatedEntityId: e.target.value })}
                      className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                    >
                      <option value="">-- Choose Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.firstName} {d.lastName} ({d.phone})
                        </option>
                      ))}
                    </select>
                  )}

                  {formData.relatedEntityType === "general" && (
                    <div className="h-10 px-3 text-xs text-slate-400 bg-slate-50/50 border border-slate-200 rounded-xl flex items-center">
                      Applicable to entire company
                    </div>
                  )}
                </div>
              </div>

              {/* Status Toggle & Recurrence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: "Pending" })}
                      className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                        formData.status === "Pending"
                          ? "bg-amber-50 border-amber-300 text-amber-800 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, status: "Completed" })}
                      className={`h-10 rounded-xl text-xs font-bold transition-all border ${
                        formData.status === "Completed"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Completed / Paid
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recurring Frequency
                  </label>
                  <select
                    value={formData.recurrence}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isRecurring: e.target.value !== "Once",
                        recurrence: e.target.value as
                          | "Once"
                          | "Weekly"
                          | "Monthly"
                          | "Quarterly"
                          | "Yearly",
                      })
                    }
                    className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium text-slate-900"
                  >
                    <option value="Once">One-time payment</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Reason / Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason / Notes / Wire & Account Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Wire routing #, monthly installment breakdown, or portal login reminder notes..."
                  value={formData.reasonNotes}
                  onChange={(e) => setFormData({ ...formData, reasonNotes: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-medium"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all"
                >
                  {editingReminder ? "Save Changes" : "Create Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 text-xs">Loading calendar...</div>}>
      <CalendarPageContent />
    </Suspense>
  );
}
