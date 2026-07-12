import React, { useState, useEffect } from "react";
import { Database, RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff, ShieldAlert, Play, Check, RotateCcw, Info } from "lucide-react";
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
  
  // Schema Init States
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);
  const [schemaResult, setSchemaResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
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

  const handleInitSchema = async (force: boolean) => {
    if (force) {
      const confirmForce = window.confirm(
        "⚠️ WARNING: This will drop all existing tables CASCADE in your database and recreate them brand new from your schema file. All existing data in those tables will be deleted. Are you sure you want to proceed with a fresh table push?"
      );
      if (!confirmForce) return;
    }

    setSchemaLoading(true);
    setSchemaResult(null);
    try {
      const response = await fetch("/api/db/init-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force })
      });
      const data = await response.json();
      if (data.success) {
        setSchemaResult({
          success: true,
          message: data.message || "Database tables initialized and pushed successfully!"
        });
        // Retest connection to verify status
        await testConnection();
      } else {
        setSchemaResult({
          success: false,
          message: data.error || "Failed to initialize schema."
        });
      }
    } catch (err: any) {
      setSchemaResult({
        success: false,
        message: err.message || "Network error occurred."
      });
    } finally {
      setSchemaLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <div className="space-y-6">
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

      {/* Schema / Push Fresh Tables Module */}
      {status?.connected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
          id="database-schema-management-card"
        >
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600 animate-pulse" />
              <h3 className="text-lg font-bold text-slate-800">Database Table Push & Initialization</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure and push your clean SQL tables to the connected Neon PostgreSQL database.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safe Initialization */}
            <div className="p-4 border border-slate-150 rounded-xl hover:border-indigo-150 transition-all flex flex-col justify-between bg-slate-50/40">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">SAFE OPTION</span>
                  <h4 className="text-sm font-extrabold text-slate-700">Incremental Setup</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Only pushes missing tables defined in the schema check file. Existing tables containing live data will not be modified or dropped. Recommended for initial setup or routine checking.
                </p>
              </div>

              <button
                onClick={() => handleInitSchema(false)}
                disabled={schemaLoading}
                className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {schemaLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Initialize Schema (Safe)
              </button>
            </div>

            {/* Fresh Clean Push */}
            <div className="p-4 border border-red-150 rounded-xl hover:border-red-200 transition-all flex flex-col justify-between bg-red-50/10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded">FRESH SLATE</span>
                  <h4 className="text-sm font-extrabold text-slate-700">Push Fresh Tables (Force Recreate)</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed text-red-950/70">
                  ⚠️ This action will drop any existing tables in your database and push fresh tables from scratch. Useful to clear corrupted data or completely reset the application back to a pristine default.
                </p>
              </div>

              <button
                onClick={() => handleInitSchema(true)}
                disabled={schemaLoading}
                className="mt-4 w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                {schemaLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Fresh Table Push (Clean Slate)
              </button>
            </div>
          </div>

          {schemaResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed font-sans ${
                schemaResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {schemaResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold">{schemaResult.success ? "SUCCESS" : "ERROR"}</span>
                <p className="mt-0.5 text-[11px] opacity-90">{schemaResult.message}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
