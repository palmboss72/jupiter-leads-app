import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scraper", icon: Search, label: "Lead Scraper" },
  { href: "/enrichment", icon: Sparkles, label: "Enrichment" },
  { href: "/leads", icon: Users, label: "Lead Database" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-white/10",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-lg leading-none" style={{ fontFamily: "'Sora', sans-serif" }}>
              Jupiter
            </span>
            <span className="text-blue-200 font-semibold text-lg leading-none ml-1" style={{ fontFamily: "'Sora', sans-serif" }}>
              Pro
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer",
                collapsed && "justify-center px-2",
                isActive(href)
                  ? "bg-white/20 text-white shadow-sm"
                  : "text-blue-100/70 hover:text-white hover:bg-white/10"
              )}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </div>
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-4 hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-blue-200/60 hover:text-white hover:bg-white/10 transition-all text-sm w-full",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Collapse</span></>}
        </button>
      </div>

      {!collapsed && <div className="px-4 pb-4 text-blue-300/40 text-xs">Jupiter Pro v2.0</div>}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden lg:flex flex-col flex-shrink-0 transition-all duration-300",
          "bg-gradient-to-b from-[oklch(0.28_0.12_252)] to-[oklch(0.22_0.10_252)]",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full bg-gradient-to-b from-[oklch(0.28_0.12_252)] to-[oklch(0.22_0.10_252)] flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground" style={{ fontFamily: "'Sora', sans-serif" }}>Jupiter Pro</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
