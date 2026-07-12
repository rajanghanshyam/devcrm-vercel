import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginView() {
  const { login, dbError } = useAuth();
  const [email, setEmail] = useState('rajan@devinfotech.net');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      let message = "Invalid email or password";
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password") {
        message = "Incorrect email address or password. Please try again.";
      } else if (err?.code === "auth/invalid-email") {
        message = "Please insert a valid email address.";
      } else if (err?.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {dbError && (
        <div className="max-w-md w-full mb-6 p-4 md:p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 shadow-sm relative text-sm">
          <div className="flex gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 text-sm md:text-base">Database Connection Required</h3>
              <div className="mt-2 text-xs md:text-sm text-red-800 space-y-2 font-sans leading-relaxed">
                <p>
                  The server failed to authenticate or connect with your PostgreSQL database.
                </p>
                {dbError.includes('password') || dbError.toLowerCase().includes('password authentication failed') || dbError.includes('neondb_owner') ? (
                  <div className="bg-white/80 p-3 rounded border border-red-100 font-sans text-xs text-red-800 leading-normal">
                    <strong className="text-red-900 font-semibold block mb-1">Reason: Database password authentication failed</strong>
                    <p>This indicates that the password provided in your <code>DATABASE_URL</code> or <code>DATABASE_URL_UNPOOLED</code> is incorrect or has expired.</p>
                    <p className="mt-2 text-slate-800 font-semibold">To resolve this:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-700">
                      <li>Go to your <strong>Neon console</strong> (or PostgreSQL provider dashboard) and copy your correct connection string.</li>
                      <li>Open Google AI Studio, click <strong>Settings</strong> (gear icon) in the sidebar/header, then choose <strong>Environment Variables</strong>.</li>
                      <li>Locate <code>DATABASE_URL</code> and <code>DATABASE_URL_UNPOOLED</code> and update them with the correct password. Ensure no leading or trailing spaces are copied.</li>
                    </ol>
                  </div>
                ) : dbError.includes('******') || dbError.includes('%2A%2A%2A%2A%2A%2A') ? (
                  <div className="bg-white/80 p-3 rounded border border-red-100 font-mono text-[11px] md:text-xs text-red-700 leading-normal">
                    <strong>Reason:</strong> Your <code>DATABASE_URL</code> contains <code>******</code> (the masked/hidden password placeholder) instead of your actual database password.
                    <p className="mt-2 text-slate-800 font-sans">
                      To resolve this:
                    </p>
                    <ol className="list-decimal list-inside mt-1 space-y-1 text-slate-700 font-sans">
                      <li>Locate your database connection details or credentials.</li>
                      <li>Make sure to use your actual database password instead of the masked '******' placeholder.</li>
                      <li>Copy the complete unmasked connection string.</li>
                      <li>Open Google AI Studio, click the <strong>Settings</strong> button in the left panel, and paste the unmasked URL into <code>DATABASE_URL</code> and <code>DATABASE_URL_UNPOOLED</code>.</li>
                    </ol>
                  </div>
                ) : (
                  <div className="bg-white/80 p-3 rounded border border-red-100 font-mono text-xs text-red-700 leading-normal overflow-x-auto">
                    <strong>Error Details:</strong> {dbError}
                  </div>
                )}
                <p className="text-[11px] text-slate-600 font-sans italic mt-1">
                  * Direct Connection Required: Offline sandbox simulation and local fallbacks have been disabled. Connecting a valid database is required for full application use.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in to Application</h1>
          <p className="text-slate-500 mt-2 text-sm">Enter your details to proceed further</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-lg py-2.5 font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
