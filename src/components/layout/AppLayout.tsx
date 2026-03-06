import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

export default function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-[248px] flex min-h-screen flex-col">
        <AppHeader />
        <main className={isDashboard ? "flex-1 overflow-y-auto p-4 lg:p-5" : "flex-1 overflow-y-auto p-5 lg:p-6"}>
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
