import React, { useState } from "react";
import {
  CalendarDays,
  Users,
  Stethoscope,
  BarChart3,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Plus,
  CircleUserRound,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "planning", label: "Planning", icon: CalendarDays },
  { id: "personnel", label: "Personnel", icon: Users },
  { id: "actes", label: "Saisie des actes", icon: Stethoscope },
  { id: "remuneration", label: "Rémunérations", icon: BarChart3 },
  { id: "parametres", label: "Paramètres", icon: Settings },
];

function todayLabel() {
  const d = new Date();
  const label = d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function Sidebar({ collapsed, onToggle, activePage, onNavigate }) {
  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-64"
      } shrink-0 bg-slate-900 flex flex-col transition-all duration-200`}
    >
      <div className="h-16 flex items-center gap-2.5 px-4 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <span className="text-white font-medium text-[15px] tracking-tight">
            MediLife
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-slate-800 text-white border-l-2 border-teal-500 pl-[10px]"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
        >
          {collapsed ? (
            <ChevronsRight className="w-[18px] h-[18px]" strokeWidth={1.8} />
          ) : (
            <>
              <ChevronsLeft className="w-[18px] h-[18px]" strokeWidth={1.8} />
              <span>Réduire</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function HeaderBar({ pageTitle, onGenerate }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-[17px] font-medium text-slate-900 leading-tight">
          {pageTitle}
        </h1>
        <p className="text-[13px] text-slate-500 leading-tight">{todayLabel()}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Générer planning
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <CircleUserRound className="w-5 h-5 text-slate-500" strokeWidth={1.8} />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-[13px] font-medium text-slate-800">Admin</p>
            <p className="text-[11px] text-slate-400">Coordination</p>
          </div>
        </div>
      </div>
    </header>
  );
}

const PAGE_TITLES = {
  planning: "Planning des gardes",
  personnel: "Personnel",
  actes: "Saisie des actes",
  remuneration: "Rémunérations & exports",
  parametres: "Paramètres & contraintes",
};

export default function DashboardLayout({ children, activePage = "planning", onNavigate = () => {} }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="h-screen w-full flex bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        activePage={activePage}
        onNavigate={onNavigate}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar
          pageTitle={PAGE_TITLES[activePage] ?? "Tableau de bord"}
          onGenerate={() => console.log("Générer planning")}
        />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
