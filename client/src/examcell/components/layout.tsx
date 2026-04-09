import React from "react";
import { Outlet } from "react-router-dom";

/**
 * Exam Cell Layout — Minimal wrapper for EC pages when rendered inside ERP's AppShell.
 * The ERP AppShell already provides sidebar, topbar, etc.
 * This just renders the child route content.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function ECOutlet() {
  return <Outlet />;
}
