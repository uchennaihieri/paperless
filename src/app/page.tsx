"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Eye, EyeOff, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

type Step = "credentials" | "otp";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");

  // Credentials step
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP step
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [mustResetPassword, setMustResetPassword] = useState(false);

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Step 1: Employee ID + Password → /auth/login ─────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: employeeId.trim(), password }),
      });
      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.error || "Invalid credentials.");
        return;
      }

      // Success — advance to OTP step
      setEmail(data.email);
      setMustResetPassword(data.mustResetPassword ?? false);
      setStep("otp");
    } catch {
      setErrorMsg("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: OTP → NextAuth signIn ────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        otp,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      // Redirect based on first-login flag
      if (mustResetPassword) {
        router.push("/reset-password");
      } else {
        router.push("/role-selection");
      }
    } catch {
      setErrorMsg("Failed to verify OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Main login card ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl mb-4">
          <Building2 size={32} />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900">
          Paperless 2.0 by FINCA
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === "credentials" ? "Sign in with your Employee ID" : `OTP sent to ${email}`}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>{step === "credentials" ? "Sign In" : "Verify OTP"}</CardTitle>
            <CardDescription>
              {step === "credentials"
                ? "Enter your Employee ID and password to continue."
                : "We sent a 6-digit code to your registered email address."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={step === "credentials" ? handleLogin : handleVerifyOtp}>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {step === "credentials" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      type="text"
                      placeholder="e.g. EMP001"
                      required
                      autoComplete="username"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="otp">One-Time Password</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="• • • • • •"
                    className="text-center tracking-[1em] font-mono text-lg"
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                  <p className="text-xs text-gray-500 text-center">Check your email inbox (and spam folder)</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                {isLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</>
                  : step === "credentials" ? "Continue" : "Verify & Sign In"}
              </Button>
              {step === "otp" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => { setStep("credentials"); setOtp(""); setErrorMsg(""); }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
