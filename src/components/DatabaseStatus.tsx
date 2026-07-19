import React, { useState, useEffect } from "react";
import { Database, RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { motion } from "motion/react";

interface ConnectionResult {
  success: boolean;
  connected: boolean;
  message?: string;
  error?: string;
}

export default function DatabaseStatus() {
  const [testing, setTesting] = useState<boolean>(true);
  const [status, setStatus] = useState<ConnectionResult | null>(null);

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch("/api/db/test-connection");
      const data: ConnectionResult = await response.json();
      setStatus(data);
    } catch (err: any) {
      setStatus({
        success: false,
        connected: false,
        error: "Failed to connect to backend server. " + (err.message || String(err))
      });
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4" id="database-status-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-800">PostgreSQL Database Connection Status</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status tracking for your live PostgreSQL Cloud database connection.
          </p>
        </div>
        
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          id="btn-test-db-connection"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
          {testing ? "Testing..." : "Test Connection"}
        </button>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-150">
        <div className="relative">
          {/* Visual Ping Indicator */}
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
            {testing ? (
              <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />
            ) : status?.connected ? (
              <>
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <Wifi className="relative h-5 w-5 text-emerald-600" />
              </>
            ) : (
              <>
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-pulse" />
                <WifiOff className="relative h-5 w-5 text-rose-600" />
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${
              testing 
                ? "bg-slate-400 animate-pulse" 
                : status?.connected 
                  ? "bg-emerald-500" 
                  : "bg-rose-500"
            }`} />
            <span className="font-extrabold text-sm text-slate-800">
              {testing 
                ? "Checking Live PostgreSQL Status..." 
                : status?.connected 
                  ? "Database is Connected (Online)" 
                  : "Database Disconnected (Action Required)"}
            </span>
          </div>
          
          <p className="text-xs text-slate-500 mt-1 font-sans line-clamp-2">
            {testing 
              ? "Establishing handshake with external cloud database..." 
              : status?.connected 
                ? "Direct persistent storage connection to PostgreSQL has been verified successfully. Your records, stock inventory, and quotations will be securely persisted in cloud storage." 
                : "The application is currently offline because the PostgreSQL connection is unreachable. Please connect a valid database in the Settings menu."}
          </p>
        </div>
      </div>

      {/* Connection Result / Action Panel */}
      {!testing && status && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border text-xs font-mono whitespace-pre-wrap leading-relaxed ${
            status.connected 
              ? "bg-emerald-50/50 border-emerald-200/60 text-emerald-800" 
              : "bg-rose-50/50 border-rose-200/60 text-rose-800"
          }`}
        >
          {status.connected ? (
            <div className="flex gap-2.5 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">STATUS REPORT: SUCCESS</span>
                <p className="mt-1 text-slate-600 font-sans leading-relaxed">
                  {status.message}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">STATUS REPORT: CONNECTION FAILURE</span>
                <p className="mt-1 text-slate-600 font-sans leading-relaxed">
                  {status.error}
                </p>
                <div className="mt-3 p-3 bg-white border border-rose-100 rounded-lg text-slate-700 font-sans space-y-2">
                  <p className="font-semibold text-slate-800 text-xs">How to connect your live database:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
                    <li>Open Google AI Studio.</li>
                    <li>Click the <strong className="text-slate-850">Settings</strong> menu (gear icon) in the top-right sidebar.</li>
                    <li>Open the <strong className="text-slate-850">Environment Variables</strong> tab.</li>
                    <li>Add/Update your unmasked connection string in the <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono text-[10px]">DATABASE_URL</code> variable.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
