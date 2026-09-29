"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { AppModule, MODULE_NAMES } from "@/types/fleet";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Map URL routes to corresponding AppModule
const ROUTE_TO_MODULE: Record<string, AppModule> = {
  "/": "trucks", // Dashboard checks general access
  "/trucks": "trucks",
  "/trailers": "trailers",
  "/drivers": "drivers",
  "/maintenance": "maintenance",
  "/shops": "shops",
  "/documents": "documents",
  "/calendar": "calendar",
  "/users": "users",
  "/settings": "settings",
};

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isAuthenticated, isLoading, hasPermission } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // Don't guard the login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Show loading spinner while determining session
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 font-semibold tracking-wider uppercase">
          Verifying Zdunje Security Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  // Check module permission
  const targetModule = ROUTE_TO_MODULE[pathname];
  if (targetModule && pathname !== "/" && !hasPermission(targetModule, "view")) {
    const moduleInfo = MODULE_NAMES[targetModule];

    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Restricted Module Access
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your account role (<strong>{currentUser?.role}</strong>) does not have authorization to view the{" "}
            <strong>{moduleInfo?.label || targetModule}</strong> module.
          </p>
        </div>

        <div className="bg-slate-100 p-4 rounded-xl text-left text-xs space-y-1.5 border border-slate-200">
          <div className="flex justify-between font-bold text-slate-700">
            <span>Signed in as:</span>
            <span>{currentUser?.name}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Email:</span>
            <span>{currentUser?.email}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Department:</span>
            <span>{currentUser?.department}</span>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-center space-x-3">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
