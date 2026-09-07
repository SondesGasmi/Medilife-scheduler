import { ArrowRight, BadgeEuro, CalendarDays, ClipboardList, LockKeyhole, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

const pageContent = {
  planning: { eyebrow: "Prochaine brique · Planning", title: "Les gardes, sans zones grises.", description: "Le planning MediLife réunira les disponibilités, les règles de capacité et les échanges d’équipe dans une vue conçue pour décider vite.", icon: CalendarDays, accent: "bg-[#dfeaed]", iconColor: "text-[#3d7784]", items: ["Vue semaine et couverture par spécialité", "Alertes de capacité et conflits de présence", "Échanges de garde tracés"] },
  actes: { eyebrow: "Prochaine brique · Actes", title: "Saisir l’activité au fil de l’eau.", description: "La saisie des actes arrivera dans un espace lisible, pensé pour limiter les ressaisies et garder une trace fiable de l’activité médicale.", icon: ClipboardList, accent: "bg-[#e4eee7]", iconColor: "text-[#41826b]", items: ["Saisie rapide par membre et par garde", "Référentiel d’actes centralisé", "Validation avant export"] },
  remuneration: { eyebrow: "Prochaine brique · Rémunération", title: "Des exports qui inspirent confiance.", description: "Les rémunérations s’appuieront sur les actes validés et les règles de l’établissement pour produire des exports contrôlables, au bon moment.", icon: BadgeEuro, accent: "bg-[#f1e9d8]", iconColor: "text-[#967239]", items: ["Synthèse par période et par praticien", "Contrôles avant clôture", "Exports compatibles avec vos outils"] },
};

export default function FuturePage() {
  const [location] = useLocation();
  const content = pageContent[location.slice(1) as "planning" | "actes" | "remuneration"];
  if (!content) return null;
  const Icon = content.icon;
  return (
    <div className="animate-enter min-h-[calc(100dvh-160px)]">
      <div className="mb-8 flex items-center gap-2 text-[11px] text-muted-foreground"><span className="font-mono-ui uppercase tracking-[.14em]">MediLife</span><ArrowRight size={13} /><span>En préparation</span></div>
      <div className="grid overflow-hidden rounded-2xl border border-border bg-card shadow-xs lg:grid-cols-[1.05fr_.95fr]">
        <div className="blueprint-grid relative flex min-h-[500px] flex-col justify-between overflow-hidden border-b border-border p-7 md:p-12 lg:border-b-0 lg:border-r">
          <div className="absolute -right-20 -top-20 size-72 rounded-full border border-[#b9d6d8]/70" /><div className="absolute -right-8 -top-8 size-48 rounded-full border border-[#b9d6d8]/60" /><div className="absolute right-8 top-8 size-32 rounded-full border border-[#b9d6d8]/50" />
          <div className="relative"><span className={`flex size-14 items-center justify-center rounded-2xl ${content.accent} ${content.iconColor}`}><Icon size={26} strokeWidth={1.7} /></span><p className="mt-10 font-mono-ui text-[10px] uppercase tracking-[.19em] text-[#418f96]">{content.eyebrow}</p><h1 className="mt-4 max-w-[510px] font-display text-[48px] leading-[.96] tracking-[-.045em] text-foreground md:text-[64px]">{content.title}</h1><p className="mt-6 max-w-[500px] text-sm leading-7 text-muted-foreground">{content.description}</p></div>
          <div className="relative mt-10 flex items-center gap-3 text-xs text-muted-foreground"><LockKeyhole size={15} className="text-[#4a9299]" /><span>Disponible dans une prochaine version de l’espace.</span></div>
        </div>
        <div className="flex flex-col justify-center p-7 md:p-12"><div className="mb-8 flex size-12 items-center justify-center rounded-xl bg-[#edf4f4] text-[#458e94]"><Sparkles size={21} /></div><h2 className="text-sm font-semibold">Ce que vous pourrez faire</h2><ul className="mt-5 space-y-4">{content.items.map((item) => <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#5babb0]" />{item}</li>)}</ul><div className="mt-10 border-t border-border pt-6"><p className="text-xs leading-5 text-muted-foreground">Pour le moment, préparez votre référentiel depuis <span className="font-semibold text-foreground">Personnel</span>. Il alimentera automatiquement les prochains modules.</p><Link href="/personnel" data-testid="link-back-personnel" className="button-secondary mt-5 inline-flex">Voir le personnel <ArrowRight size={14} /></Link></div></div>
      </div>
    </div>
  );
}