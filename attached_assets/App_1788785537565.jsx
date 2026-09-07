import React, { useState } from "react";
import DashboardLayout from "./DashboardLayout";
import ShiftMatrix from "./ShiftMatrix";
import ActeEntryForm from "./ActeEntryForm";

export default function App() {
  const [page, setPage] = useState("planning");

  return (
    <DashboardLayout activePage={page} onNavigate={setPage}>
      {page === "planning" && <ShiftMatrix />}
      {page === "actes" && <ActeEntryForm />}
      {page !== "planning" && page !== "actes" && (
        <div className="text-slate-400 text-sm">Page à venir.</div>
      )}
    </DashboardLayout>
  );
}
