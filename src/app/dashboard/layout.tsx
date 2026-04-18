"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Building2, FileText, CheckSquare, PenTool, LayoutDashboard,
  LogOut, Users, BarChart2, Menu, X, History, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { HistoryModal } from "@/components/HistoryModal";
import { SettingsModal } from "@/components/SettingsModal";

const navigation = [
  { name: "Workflow", href: "/dashboard/workflow", icon: LayoutDashboard },
  { name: "Forms", href: "/dashboard/forms", icon: FileText },
  { name: "Action", href: "/dashboard/action", icon: CheckSquare },
  { name: "Signature", href: "/dashboard/signature", icon: PenTool },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart2 },
  { name: "Teams", href: "/dashboard/teams", icon: Users },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Find the exact active role from session
  const roles = session?.user && (session.user as any).roles ? JSON.parse((session.user as any).roles) : [];
  const activeRoleId = session?.user && (session.user as any).activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || roles[0];

  const handleSignOut = () => signOut({ callbackUrl: '/' });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen]       = useState(false);
  const [isSettingsOpen, setIsSettingsOpen]     = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Close avatar menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-50 transition-transform duration-300 md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Building2 className="h-6 w-6" />
            Paperless 2.0
          </div>
          <button className="md:hidden p-1 text-gray-500" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Role Card */}
        {activeRole && (
          <div className="mx-4 mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="text-xs font-semibold text-gray-500 uppercase">Active Role</div>
            <div className="font-medium text-sm text-gray-900 mt-1 truncate">{activeRole.branch}</div>
            <div className="text-xs text-primary font-medium truncate">{activeRole.user_role}</div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3 mt-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          {navigation
            .filter((item) => {
              if (item.name === "Teams" || item.name === "Templates") {
                return activeRole?.user_role?.toLowerCase() === "administrator";
              }
              return true;
            })
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/5 text-primary"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-gray-400")} />
                  {item.name}
                </Link>
              );
            })}
        </div>
      </div>


      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0 transition-all duration-300">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
              {navigation.find((item) => pathname.startsWith(item.href))?.name || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-sm font-medium text-gray-700">
              {activeRole?.user_name || session?.user?.name || "User"}
            </div>

            {/* Avatar button + dropdown */}
            <div className="relative" ref={avatarMenuRef}>
              <button
                onClick={() => setIsAvatarMenuOpen((v) => !v)}
                className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium uppercase hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
                aria-label="User menu"
              >
                {activeRole?.user_name ? activeRole.user_name.charAt(0) : "U"}
              </button>

              {isAvatarMenuOpen && (
                <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">{activeRole?.user_name || session?.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{activeRole?.finca_email || ""}</p>
                  </div>
                  <button
                    onClick={() => { setIsHistoryOpen(true); setIsAvatarMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <History className="w-4 h-4 text-gray-400" /> History
                  </button>
                  <button
                    onClick={() => { setIsSettingsOpen(true); setIsAvatarMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" /> Settings
                  </button>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>

    {/* Global Modals */}
    <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
