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
    <div className="min-h-dvh flex flex-col" style={{ background: '#faf9f7' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #e5e3e0' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#1a1a1a' }}>
            <span className="text-white text-sm font-semibold">P</span>
          </div>
          <span className="font-semibold text-[15px]" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>Plexaris</span>
        </div>
        <button
          onClick={() => router.push("/login")}
          className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ color: '#6b6b6b' }}
          onMouseEnter={(e) => e.target.style.background = '#f5f4f2'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          Sign in
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] font-semibold mb-2" style={{ color: '#1a1a1a', letterSpacing: '-0.02em' }}>
              Create your account
            </h1>
            <p className="text-[15px]" style={{ color: '#6b6b6b' }}>
              Get started with Plexaris today
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626'
              }}
            >
              {error}
            </div>
          )}

          {/* Success Message */}
          {infoMessage && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#16a34a'
              }}
            >
              {infoMessage}
            </div>
          )}

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loadingGoogle}
            className="w-full py-3 text-[15px] font-medium rounded-lg flex items-center justify-center gap-3 transition-all mb-6"
            style={{
              background: '#ffffff',
              border: '1px solid #e5e3e0',
              color: '#1a1a1a',
              opacity: loadingGoogle ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loadingGoogle) {
                e.currentTarget.style.background = '#f5f4f2';
                e.currentTarget.style.borderColor = '#999999';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#e5e3e0';
            }}
          >
            {loadingGoogle ? (
              "Redirecting..."
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px" style={{ background: '#e5e3e0' }} />
            <span className="text-sm" style={{ color: '#999999' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#e5e3e0' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Full name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 text-[15px] rounded-lg transition-all"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e3e0',
                  color: '#1a1a1a',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#999999';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e3e0';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 text-[15px] rounded-lg transition-all"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e3e0',
                  color: '#1a1a1a',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#999999';
                  e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e3e0';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-16 text-[15px] rounded-lg transition-all"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e3e0',
                    color: '#1a1a1a',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#999999';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e3e0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors"
                  style={{ color: '#6b6b6b' }}
                  onClick={() => setShowPassword((v) => !v)}
                  onMouseEnter={(e) => e.target.style.color = '#1a1a1a'}
                  onMouseLeave={(e) => e.target.style.color = '#6b6b6b'}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1a1a1a' }}>
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-16 text-[15px] rounded-lg transition-all"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e5e3e0',
                    color: '#1a1a1a',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#999999';
                    e.target.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.05)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e3e0';
                    e.target.style.boxShadow = 'none';
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium transition-colors"
                  style={{ color: '#6b6b6b' }}
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  onMouseEnter={(e) => e.target.style.color = '#1a1a1a'}
                  onMouseLeave={(e) => e.target.style.color = '#6b6b6b'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-[15px] font-medium rounded-lg transition-all mt-2"
              style={{
                background: loading ? '#6b6b6b' : '#1a1a1a',
                color: '#ffffff',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#333333';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#1a1a1a';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center mt-6 text-[15px]" style={{ color: '#6b6b6b' }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="font-medium transition-colors"
              style={{ color: '#1a1a1a' }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Sign in
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4" style={{ borderTop: '1px solid #e5e3e0' }}>
        <div className="flex items-center justify-center gap-6 text-sm" style={{ color: '#999999' }}>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </footer>
    </div>
  );
}
