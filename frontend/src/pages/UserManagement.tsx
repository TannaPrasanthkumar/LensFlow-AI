import React, { useState } from 'react';
import { Users, UserPlus, ShieldAlert, Check } from 'lucide-react';

interface UserRecord {
  id: number;
  username: string;
  role: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([
    { id: 1, username: 'admin', role: 'Admin' },
    { id: 2, username: 'operator', role: 'Operator' },
    { id: 3, username: 'viewer', role: 'Viewer' }
  ]);
  
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('Operator');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // In production, we'd POST to a backend user registration route.
      // For this demo dashboard, we will simulate the creation process client-side.
      setTimeout(() => {
        const newUser = {
          id: users.length + 1,
          username: newUsername.toLowerCase(),
          role: newRole
        };
        setUsers([...users, newUser]);
        setSuccess(true);
        setNewUsername('');
        setNewPassword('');
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError("Failed to create user. Administrator action rejected.");
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-12">
      
      {/* Users List */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="text-indigo-400" size={28} />
            <span>User Management</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Access, audit, and configure internal role authorization credentials.
          </p>
        </div>

        <div className="bg-slate-950/20 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="p-4">User ID</th>
                <th className="p-4">Username</th>
                <th className="p-4">Access Role Privilege</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-500">#USR-{u.id}</td>
                  <td className="p-4 font-semibold text-slate-100">{u.username}</td>
                  <td className="p-4 text-xs font-semibold capitalize text-indigo-400">{u.role}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Active</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Form */}
      <div>
        <div className="p-6 bg-slate-950/45 rounded-3xl border border-slate-800/80 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-900 pb-3">
            <UserPlus className="text-indigo-400" size={18} />
            <span>Register New User</span>
          </div>

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <Check size={16} />
              <span>User successfully registered.</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Username</span>
              <input
                type="text"
                required
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="e.g. operatorsmith"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                id="mgmt-new-username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Password</span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                id="mgmt-new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500 font-semibold">Select Role Privilege</span>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                id="mgmt-new-role"
              >
                <option value="Admin">Admin (Full Access)</option>
                <option value="Operator">Operator (Update Permissions)</option>
                <option value="Viewer">Viewer (Read-Only)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-colors flex items-center justify-center mt-2"
              id="mgmt-submit-create"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Add User'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
