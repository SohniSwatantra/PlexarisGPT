"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getNeonAuthClient } from "@/lib/neonAuthClient";

export default function SignupPage() {
  const router = useRouter();
  const neonClient = getNeonAuthClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await neonClient.signUp.email({
        email,
        password,
        name: fullName,
        callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/callback`,
      });
      if (signUpError) {
        setError(signUpError.message || "Signup failed");
        return;
      }
      setInfoMessage("Check your email to verify your account, then continue. You can return here or log in after confirming.");
      // Store pending name/email for role screen
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pendingName", fullName);
        sessionStorage.setItem("pendingEmail", email);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoadingGoogle(true);
    try {
      await neonClient.signIn.social({
        provider: "google",
        callbackURL: `${process.env.NEXT_PUBLIC_FRONTEND_URL}/auth/callback`,
      });
    } catch (err) {
      setError("Google sign-up failed. Please try again.");
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-(--background)">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-(--primary) mb-3">Sign Up</h1>
          <p className="text-(--text-secondary)">Create your account</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-sm mb-4">
            {infoMessage}
          </div>
        )}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loadingGoogle}
          className="w-full border border-(--border) text-(--primary) font-medium py-3 rounded-xl transition-colors mb-4 disabled:opacity-50"
        >
          {loadingGoogle ? "Redirecting…" : "Continue with Google"}
        </button>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--primary)"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Confirm Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/10"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--primary)"
                onClick={() => setShowConfirmPassword((v) => !v)}
                tabIndex={-1}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-(--primary) hover:bg-(--primary-light) disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="text-sm text-(--text-secondary) mt-4">
          After signing up, check your email to verify, then return to continue.
        </p>
        <div className="mt-6 text-center">
          <span className="text-sm text-(--text-secondary)">Already have an account?</span>
          <button
            className="ml-2 text-(--primary) font-semibold hover:underline"
            type="button"
            onClick={() => router.push('/login')}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
