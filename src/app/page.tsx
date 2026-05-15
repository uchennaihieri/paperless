"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Eye, EyeOff, AlertTriangle, ArrowLeft, Loader2, ShieldCheck, KeyRound } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://paperlessbackend-production.up.railway.app";

// ─── Step types ──────────────────────────────────────────────────────────────
// credentials  → user enters Employee ID + temp/current password
// new-password → (only when mustResetPassword) user sets their real new password
// otp          → user enters the OTP sent to their email
type Step = "credentials" | "new-password" | "otp";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");

  // Step 1 state
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 state (only for reset flow)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 3 state
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isResetFlow, setIsResetFlow] = useState(false);

  // UI
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Step 1: Employee ID + Temp Password → /auth/login ─────────────────────
  // The temporary password is treated purely as a verification token.
  // If mustResetPassword is true, the user must set a new password before OTP.
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

      setEmail(data.email);

      if (data.mustResetPassword) {
        // Temp password verified — now collect the new password before OTP
        setIsResetFlow(true);
        setStep("new-password");
      } else {
        // Normal login — go straight to OTP
        setIsResetFlow(false);
        setStep("otp");
      }
    } catch {
      setErrorMsg("Failed to connect to the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Validate new password fields and advance to OTP ───────────────
  const handleSetNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    // Advance to OTP — the new password is held in state and forwarded on verify
    setStep("otp");
  };

  // ── Step 3: OTP → NextAuth signIn (with optional newPassword) ─────────────
  // When in reset flow, newPassword is passed alongside the OTP so that the
  // backend atomically updates the password and issues a fresh JWT in one call.
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const signInParams: Record<string, string> = {
        redirect: "false",
        email,
        otp,
      };

      if (isResetFlow && newPassword) {
        signInParams.newPassword = newPassword;
      }

      const res = await signIn("credentials", {
        redirect: false,
        email,
        otp,
        ...(isResetFlow && newPassword ? { newPassword } : {}),
      });

      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      // Always go to role selection — the JWT is already clean (mustResetPassword: false)
      router.push("/role-selection");
    } catch {
      setErrorMsg("Failed to verify OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step metadata ─────────────────────────────────────────────────────────
  const stepMeta: Record<Step, { title: string; description: string; subtitle: string }> = {
    "credentials": {
      title: "Sign In",
      description: "Enter your Employee ID and password to continue.",
      subtitle: "Sign in with your Employee ID",
    },
    "new-password": {
      title: "Set New Password",
      description: "Your temporary password was verified. Please set a permanent password.",
      subtitle: `Securing account for ${email}`,
    },
    "otp": {
      title: "Verify OTP",
      description: "We sent a 6-digit code to your registered email address.",
      subtitle: `OTP sent to ${email}`,
    },
  };

  const meta = stepMeta[step];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl mb-4">
          <Building2 size={32} />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900">
          FINCALite
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">{meta.subtitle}</p>
      </div>

      {/* Step progress indicator */}
      {isResetFlow && (
        <div className="sm:mx-auto sm:w-full sm:max-w-md mt-4">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            {(["credentials", "new-password", "otp"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-colors ${
                  step === s
                    ? "border-primary bg-primary text-white"
                    : (["credentials", "new-password", "otp"] as Step[]).indexOf(step) > i
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-gray-300 bg-white text-gray-400"
                }`}>{i + 1}</div>
                {i < 2 && <div className={`h-0.5 w-8 ${(["credentials", "new-password", "otp"] as Step[]).indexOf(step) > i ? "bg-green-400" : "bg-gray-200"}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              {step === "new-password" && <ShieldCheck className="w-5 h-5 text-primary" />}
              {step === "otp" && <KeyRound className="w-5 h-5 text-primary" />}
              <CardTitle>{meta.title}</CardTitle>
            </div>
            <CardDescription>{meta.description}</CardDescription>
          </CardHeader>

          {/* ── Step 1: Credentials ───────────────────────────────────────── */}
          {step === "credentials" && (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}
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
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…</> : "Continue"}
                </Button>
              </CardFooter>
            </form>
          )}

          {/* ── Step 2: Set New Password (reset flow only) ────────────────── */}
          {step === "new-password" && (
            <form onSubmit={handleSetNewPassword}>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700">
                  Your temporary password was verified. Choose a permanent password — it will be set once you confirm your OTP.
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Password requirements:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li>At least 8 characters</li>
                    <li>Do not share your password with anyone</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full cursor-pointer">
                  Continue to Verification
                </Button>
                <Button type="button" variant="ghost" className="w-full"
                  onClick={() => { setStep("credentials"); setNewPassword(""); setConfirmPassword(""); setErrorMsg(""); }}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </CardFooter>
            </form>
          )}

          {/* ── Step 3: OTP ───────────────────────────────────────────────── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp}>
              <CardContent className="space-y-4">
                {errorMsg && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}
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
                {isResetFlow && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
                    ✓ New password ready — enter your OTP to confirm and complete your account setup.
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying…</>
                    : isResetFlow ? "Confirm & Set Password" : "Verify & Sign In"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep(isResetFlow ? "new-password" : "credentials");
                    setOtp("");
                    setErrorMsg("");
                  }}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
