import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  BadgeEuro,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Database,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";

const navigation = [
  { href: "/personnel", label: "Personnel", caption: "Équipe médicale", icon: UsersRound },
  { href: "/planning", label: "Planning", caption: "Gardes & présences", icon: CalendarDays },
  { href: "/actes", label: "Actes", caption: "Saisie d’activité", icon: ClipboardList },
  { href: "/remuneration", label: "Rémunération", caption: "Exports & suivi", icon: BadgeEuro },
  { href: "/admin/database", label: "Base de données", caption: "Vue de diagnostic", icon: Database },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="grain min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[266px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${collapsed ? "md:w-[78px]" : ""} ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[88px] items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/personnel" data-testid="link-brand" className="flex items-center gap-3 overflow-hidden">
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/10">
              <Activity size={21} strokeWidth={2.5} />
              <span className="absolute bottom-[7px] right-[6px] size-1.5 rounded-full bg-sidebar" />
            </span>
            <span className={`min-w-0 transition-opacity ${collapsed ? "md:opacity-0" : "opacity-100"}`}>
              <span className="block font-display text-[24px] leading-none tracking-[-.03em] text-sidebar-accent-foreground">MediLife</span>
              <span className="mt-1 block whitespace-nowrap font-mono-ui text-[9px] uppercase tracking-[.19em] text-sidebar-foreground/55">Centre de diagnostic</span>
            </span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" data-testid="button-close-menu" className="rounded-md p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden">
            <X size={19} />
          </button>
        </div>

        <div className="px-3 pt-7">
          <p className={`mb-3 px-3 font-mono-ui text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/40 ${collapsed ? "md:hidden" : ""}`}>Espace de travail</p>
          <nav className="space-y-1" aria-label="Navigation principale">
            {navigation.map(({ href, label, caption, icon: Icon }) => {
              const active = location === href || (href === "/personnel" && location === "/");
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} data-testid={`link-nav-${label.toLowerCase()}`} className={`group relative flex items-center gap-3 rounded-lg px-3 py-3 transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"}`}>
                  {active && <span className="absolute left-0 top-2.5 h-7 w-[3px] rounded-r bg-sidebar-primary" />}
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} className={active ? "text-sidebar-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-primary"} />
                  <span className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                    <span className="block text-[13px] font-semibold">{label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-sidebar-foreground/40">{caption}</span>
                  </span>
                  {active && <ChevronRight size={14} className={`ml-auto text-sidebar-primary ${collapsed ? "md:hidden" : ""}`} />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={`mt-auto border-t border-sidebar-border p-4 ${collapsed ? "md:px-3" : ""}`}>
          <div className={`flex items-center gap-3 rounded-lg bg-sidebar-accent/65 p-3 ${collapsed ? "md:justify-center" : ""}`}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#d6e7e7] text-[11px] font-bold text-[#1d4b55]">AD</div>
            <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
              <p className="truncate text-xs font-semibold text-sidebar-accent-foreground">Administration</p>
              <p className="mt-0.5 font-mono-ui text-[10px] text-sidebar-foreground/45">Mode MVP · auth à durcir</p>
            </div>
            <span className={`ml-auto size-1.5 rounded-full bg-[#70c6aa] ${collapsed ? "md:hidden" : ""}`} />
          </div>
        </div>
        <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Développer le menu" : "Réduire le menu"} data-testid="button-collapse-sidebar" className="absolute -right-3 top-[98px] hidden size-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm md:flex">
          {collapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
        </button>
      </aside>
      {mobileOpen && <button type="button" aria-label="Fermer la navigation" data-testid="button-overlay-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[hsl(215_46%_15%/.35)] md:hidden" />}

      <div className={`min-h-[100dvh] transition-[padding] duration-300 ${collapsed ? "md:pl-[78px]" : "md:pl-[266px]"}`}>
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir la navigation" data-testid="button-open-menu" className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-[11px] font-medium text-muted-foreground sm:flex">
              <span className="font-mono-ui uppercase tracking-[.15em]">MediLife</span>
              <ChevronRight size={13} />
              <span className="text-foreground">{navigation.find((item) => location === item.href)?.label ?? "Personnel"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
              <Database size={14} className="text-[#2f8f86]" />
              <span className="font-mono-ui text-[10px] uppercase tracking-[.1em] text-muted-foreground">Supabase via serveur</span>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full border border-[#b8d2d4] bg-[#e1eff0] text-[11px] font-bold text-[#1d5960]">AD</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-5 py-7 md:px-9 md:py-10">{children}</main>
      </div>
    </div>
  );
}