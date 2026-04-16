"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Building2, FileText, CheckSquare, PenTool, LayoutDashboard, LogOut, ArrowLeftRight, Users, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Workflow", href: "/dashboard/workflow", icon: LayoutDashboard },
  { name: "Forms", href: "/dashboard/forms", icon: FileText },
  { name: "Action", href: "/dashboard/action", icon: CheckSquare },
  { name: "Signature", href: "/dashboard/signature", icon: PenTool },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart2 },
  { name: "Teams", href: "/dashboard/teams", icon: Users },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();

  // Find the exact active role from session
  const roles = session?.user && (session.user as any).roles ? JSON.parse((session.user as any).roles) : [];
  const activeRoleId = session?.user && (session.user as any).activeRoleId;
  const activeRole = roles.find((r: any) => r.id === activeRoleId) || roles[0];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 z-10 transition-transform">
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Building2 className="h-6 w-6" />
            Paperless 2.0
          </div>
        </div>

        {/* Active Role Card */}
        {activeRole && (
          <div className="mx-4 mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <div className="text-xs font-semibold text-gray-500 uppercase">Active Role</div>
            <div className="font-medium text-sm text-gray-900 mt-1 truncate">{activeRole.branch}</div>
            <div className="text-xs text-primary font-medium truncate">{activeRole.user_role}</div>
            <Link href="/role-selection" className="mt-2 text-xs text-gray-500 hover:text-primary flex items-center gap-1 transition-colors">
              <ArrowLeftRight className="w-3 h-3" /> Switch Role
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3 mt-2">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-3">
            Navigation
          </div>
          {navigation
            .filter((item) => {
              if (item.name === "Teams") {
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

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors w-full text-left"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-800">
            {navigation.find((item) => pathname.startsWith(item.href))?.name || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700">
              {activeRole?.user_name || session?.user?.name || "User"}
            </div>
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium uppercase">
              {activeRole?.user_name ? activeRole.user_name.charAt(0) : "U"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
