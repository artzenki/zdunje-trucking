"use client";

import React, { useState } from "react";
import { useFleet } from "@/context/FleetContext";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  Bell,
  Plus,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  ChevronDown,
  Truck,
  Users,
  Wrench,
  Store,
  LogOut,
} from "lucide-react";
import Link from "next/link";

interface NavbarProps {
  onOpenSearch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch }) => {
  const { alerts, resetDataToDemo } = useFleet();
  const { currentUser, logout } = useAuth();
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const urgentCount = alerts.filter(
    (a) => a.status === "expired" || a.status === "urgent"
  ).length;

  const handleReset = () => {
    if (
      window.confirm(
        "Reset fleet data back to original Zdunje Trucking demo records?"
      )
    ) {
      resetDataToDemo();
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Search trigger bar */}
      <div className="flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-xs group"
        >
          <div className="flex items-center space-x-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            <span className="text-slate-500 font-normal">
              Search by Unit #, VIN, Driver name, Shop...
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded shadow-xs">
              ⌘K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3 ml-4">
        {/* Clear All Data Button */}
        <button
          onClick={handleReset}
          title="Clear all fleet data"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Clear All Data</span>
        </button>

        {/* Quick Add Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-80" />
          </button>

          {showAddMenu && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
              onClick={() => setShowAddMenu(false)}
            >
              <Link
                href="/trucks?action=new"
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Add Truck</span>
              </Link>
              <Link
                href="/trailers?action=new"
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Truck className="w-4 h-4 text-purple-600" />
                <span>Add Trailer</span>
              </Link>
              <Link
                href="/drivers?action=new"
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Add Driver</span>
              </Link>
              <Link
                href="/maintenance?action=new"
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Wrench className="w-4 h-4 text-indigo-600" />
                <span>Log Maintenance</span>
              </Link>
              <Link
                href="/shops?action=new"
                className="flex items-center space-x-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700"
              >
                <Store className="w-4 h-4 text-amber-600" />
                <span>Add Truck Shop</span>
              </Link>
            </div>
          )}
        </div>

        {/* Safety Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Compliance & Expiration Alerts"
          >
            <Bell className="w-5 h-5" />
            {urgentCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                {urgentCount}
              </span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm">
                    Safety & Compliance Alerts
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Documents expiring within 30 days
                  </p>
                </div>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-100 text-red-700">
                  {alerts.length} Total
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 px-2 py-1">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                    <p className="text-xs font-medium text-slate-600">
                      All Fleet Documents Compliant
                    </p>
                    <p className="text-[11px] text-slate-400">
                      No inspections, CDLs, or med cards expiring soon.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <Link
                      key={alert.id}
                      href={
                        alert.entityType === "truck"
                          ? `/trucks?id=${alert.entityId}`
                          : alert.entityType === "trailer"
                          ? `/trailers?id=${alert.entityId}`
                          : `/drivers?id=${alert.entityId}`
                      }
                      onClick={() => setShowAlertsDropdown(false)}
                      className="block p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start space-x-2.5">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            alert.status === "expired"
                              ? "bg-red-100 text-red-700"
                              : alert.status === "urgent"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {alert.entityName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {alert.documentType}
                          </p>
                          <p
                            className={`text-[11px] font-medium mt-0.5 ${
                              alert.status === "expired"
                                ? "text-red-600 font-bold"
                                : alert.status === "urgent"
                                ? "text-amber-600 font-bold"
                                : "text-slate-500"
                            }`}
                          >
                            {alert.status === "expired"
                              ? `Expired on ${alert.expirationDate}`
                              : `Expires in ${alert.daysRemaining} days (${alert.expirationDate})`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="px-4 pt-2.5 border-t border-slate-100 text-center">
                <Link
                  href="/documents"
                  onClick={() => setShowAlertsDropdown(false)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  View All Documents Vault →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User / Role Badge & Profile Dropdown */}
        <div className="relative pl-3 border-l border-slate-200">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {currentUser?.name
                ? currentUser.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "ZT"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.name || "Safety & Dispatch"}
              </p>
              <p className="text-[10px] text-blue-600 font-semibold leading-tight flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block mr-1"></span>
                {currentUser?.role || "Staff Member"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">
                    {currentUser?.role}
                  </span>
                  <span className="text-[10px] text-slate-400">{currentUser?.department}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Link
                  href="/users"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-400" />
                  <span>Team & Permissions</span>
                </Link>

                <button
                  onClick={async () => {
                    setShowUserMenu(false);
                    await logout();
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
