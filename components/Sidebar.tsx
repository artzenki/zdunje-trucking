"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFleet } from "@/context/FleetContext";
import {
  LayoutDashboard,
  Truck,
  Users,
  Wrench,
  Store,
  FolderLock,
  Container,
  Settings,
} from "lucide-react";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { trucks, trailers, drivers, alerts } = useFleet();

  const activeTrucks = trucks.filter((t) => t.status === "Active").length;
  const activeDrivers = drivers.filter((d) => d.status === "Active").length;
  const urgentAlerts = alerts.filter(
    (a) => a.status === "expired" || a.status === "urgent"
  ).length;

  const navItems = [
    {
      name: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: "Trucks",
      href: "/trucks",
      icon: Truck,
      badge: trucks.length,
    },
    {
      name: "Trailers",
      href: "/trailers",
      icon: Container,
      badge: trailers.length,
    },
    {
      name: "Drivers",
      href: "/drivers",
      icon: Users,
      badge: drivers.length,
    },
    {
      name: "Maintenance",
      href: "/maintenance",
      icon: Wrench,
      badge: null,
    },
    {
      name: "Truck Shops",
      href: "/shops",
      icon: Store,
      badge: null,
    },
    {
      name: "Documents Vault",
      href: "/documents",
      icon: FolderLock,
      badge: urgentAlerts > 0 ? `${urgentAlerts} due` : null,
      badgeColor: "bg-red-500 text-white",
    },
    {
      name: "Settings & Import",
      href: "/settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/30">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-tight leading-none">
              Zdunje Trucking
            </h1>
            <p className="text-[11px] text-blue-400 font-medium tracking-wide mt-1">
              Safety & Fleet Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Fleet Operations
        </div>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    item.badgeColor
                      ? item.badgeColor
                      : isActive
                      ? "bg-blue-500/40 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Fleet Quick Status Card at bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/30">
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold text-slate-300">Fleet Status</span>
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <p className="text-slate-400 text-[10px]">Active Trucks</p>
              <p className="text-white font-bold text-sm mt-0.5">
                {activeTrucks}/{trucks.length}
              </p>
            </div>
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <p className="text-slate-400 text-[10px]">Drivers Ready</p>
              <p className="text-white font-bold text-sm mt-0.5">
                {activeDrivers}/{drivers.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
