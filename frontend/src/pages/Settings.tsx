import API_URL from '../config';
import React from 'react';
import { Settings as SettingsIcon, Shield, User, Info, Server } from 'lucide-react';

const Settings: React.FC = () => {
  const username = localStorage.getItem('username') || 'Viewer';
  const role = localStorage.getItem('role') || 'Viewer';

  return (
    <div className="flex flex-col gap-6 max-w-3xl animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <SettingsIcon className="text-indigo-400" size={28} />
          <span>System Settings</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review system configuration metadata, auth tokens, and security configurations.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="p-6 bg-slate-950/20 border border-slate-800/80 rounded-3xl flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white pl-1 flex items-center gap-2">
          <User size={18} className="text-indigo-400" />
          <span>User Session profile</span>
        </h2>
        
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/85 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Authorized User:</span>
            <span className="font-semibold text-slate-200 mt-1 block">{username}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 font-semibold block">Session Access Privilege:</span>
            <span className="font-bold text-indigo-400 mt-1 block capitalize">{role}</span>
          </div>
        </div>
      </div>

      {/* Role Permissions Information Panel */}
      <div className="p-6 bg-slate-950/20 border border-slate-800/80 rounded-3xl flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white pl-1 flex items-center gap-2">
          <Shield size={18} className="text-indigo-400" />
          <span>Access Authorization Matrix</span>
        </h2>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 bg-slate-950/65 rounded-xl border border-slate-900">
            <div>
              <span className="font-semibold text-sm text-slate-200 block">Admin</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Full administrative operations: create/update/delete orders, manage users, seed data.</span>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase shrink-0">
              Active Policy
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3.5 bg-slate-950/65 rounded-xl border border-slate-900">
            <div>
              <span className="font-semibold text-sm text-slate-200 block">Operator</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Order updates: add customer parameters, check sourcing, transition stages.</span>
            </div>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded font-bold uppercase shrink-0">
              Standard
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3.5 bg-slate-950/65 rounded-xl border border-slate-900">
            <div>
              <span className="font-semibold text-sm text-slate-200 block">Viewer</span>
              <span className="text-xs text-slate-500 mt-0.5 block">Read-only logs: inspect tables, view analytics reports and alerts.</span>
            </div>
            <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-500 px-2 py-0.5 rounded font-bold uppercase shrink-0">
              Read-Only
            </span>
          </div>
        </div>
      </div>

      {/* Backend connection */}
      <div className="p-6 bg-slate-950/20 border border-slate-800/80 rounded-3xl flex flex-col gap-4">
        <h2 className="text-lg font-bold text-white pl-1 flex items-center gap-2">
          <Server size={18} className="text-indigo-400" />
          <span>Infrastructure Connections</span>
        </h2>
        
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/85 flex flex-col gap-2 font-mono text-xs text-slate-400">
          <div className="flex justify-between">
            <span className="text-slate-600">FastAPI API URL:</span>
            <span>${API_URL}/api</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Redis Connection Status:</span>
            <span className="text-emerald-400">Online</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">XGBoost ML Models Status:</span>
            <span className="text-indigo-400">Loaded & Cached</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
