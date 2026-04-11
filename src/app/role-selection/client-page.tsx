"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, UserCircle2, ArrowRight } from "lucide-react";

export default function RoleSelectionClient({ roles }: { roles: any[] }) {
  const { data: session, update } = useSession();
  const router = useRouter();

  const handleSelectRole = async (roleId: number) => {
    // Update the session with the new active role
    await update({ activeRoleId: roleId });
    router.push("/dashboard/workflow");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-8">
        <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl mx-auto mb-4">
          <Building2 size={32} />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">
          Select Your Active Role
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Choose a branch and role combination to proceed.
        </p>
      </div>

      <div className="w-full max-w-2xl grid gap-4 grid-cols-1">
        {roles.map((role) => (
          <Card 
            key={role.id} 
            className="hover:border-primary hover:shadow-md cursor-pointer transition-all bg-white"
            onClick={() => handleSelectRole(role.id)}
          >
            <CardContent className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary">
                  <UserCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">
                    {role.branch || "Head Office"}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium">
                    {role.user_role || "User"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Employee No: {role.employee_id || "N/A"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400">
                <ArrowRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
