import { useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export default function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white px-3 py-2 text-sm font-medium text-[#0F172A] shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Ir para o conteúdo principal
      </a>
      <AppSidebar className="hidden lg:flex" />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[286px] border-r-0 p-0 sm:max-w-[286px]">
          <SheetTitle className="sr-only">Menu principal</SheetTitle>
          <AppSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-screen flex-col lg:ml-[248px]">
        <AppHeader onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto bg-[#F8FAFC] px-4 pb-5 pt-2 md:px-6 md:pb-6 md:pt-3">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
