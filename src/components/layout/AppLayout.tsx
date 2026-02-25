import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

export default function AppLayout() {
  const location = useLocation();
  const isDashboard = location.pathname === "/";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className={isDashboard ? "flex-1 overflow-y-auto p-4 lg:p-5" : "flex-1 overflow-y-auto p-6"}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
