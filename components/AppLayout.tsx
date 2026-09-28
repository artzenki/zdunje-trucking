"use client";

import React, { useState } from "react";
import { FleetProvider } from "@/context/FleetContext";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { GlobalSearchModal } from "@/components/GlobalSearchModal";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <FleetProvider>
      <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </FleetProvider>
  );
};
