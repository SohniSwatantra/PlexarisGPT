"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Demo credentials
const DEMO_EMAIL = "sohni.swatantra@gmail.com";
const DEMO_PASSWORD = "sohni.swatantra@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setLoading(true);

    // Simple demo credentials check
    if (email.toLowerCase().trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      // Store session info
      sessionStorage.setItem('userId', 'demo-admin-001');
      sessionStorage.setItem('userEmail', DEMO_EMAIL);
      sessionStorage.setItem('userName', 'Sohni Swatantra');
      sessionStorage.setItem('userRole', 'admin');
      localStorage.setItem('userId', 'demo-admin-001');
      localStorage.setItem('userEmail', DEMO_EMAIL);
      localStorage.setItem('userName', 'Sohni Swatantra');
      localStorage.setItem('userRole', 'admin');

      // Redirect to dashboard
      router.push('/dashboard');
    } else {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-(--background)">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-xs tracking-[0.14em] uppercase text-(--text-secondary) mb-2">
            PLEXARIS
          </p>
          <h1 className="text-3xl font-bold text-(--primary) mb-3">Sign In</h1>
          <p className="text-(--text-secondary)">Welcome back</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20 focus:border-(--primary) text-gray-900 placeholder-gray-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-(--primary)/20 focus:border-(--primary) text-gray-900 placeholder-gray-400"
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-(--primary) font-medium"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-(--primary) hover:bg-(--primary-light) disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-sm text-(--text-secondary)">Don't have an account?</span>
          <button
            className="ml-2 text-(--primary) font-semibold hover:underline"
            type="button"
            onClick={() => router.push("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
