"use client";

import { useState } from "react";
import { X, Loader2, AlertTriangle, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";

export function ESaveLoginModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ESAVE_BASE}/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": process.env.NEXT_PUBLIC_ESAVE_DEVICE || "web",
        },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const responseJson = await res.json();
      const responseData = responseJson.data || responseJson;

      if (!res.ok || (!responseData?.accessToken && responseJson.success === false)) {
        setErrorMsg(responseJson.error || responseJson.message || "Invalid credentials");
        setIsLoading(false);
        return;
      }

      if (responseData?.user?.role?.toLowerCase() !== "admin") {
        setErrorMsg("Only the E-Save admin is allowed.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("esave_token", responseData.accessToken);
      onClose();
      router.push("/dashboard/esave/health");
      
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect to E-Save API.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-primary">
            <Building className="w-5 h-5" />
            <h2 className="font-semibold">Switch to E-Save Dashboard</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {errorMsg}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Phone Number</label>
            <Input
              type="tel"
              required
              placeholder="e.g. 2347038230744"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 h-11 bg-primary text-white font-medium rounded-md hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...</> : "Switch Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
