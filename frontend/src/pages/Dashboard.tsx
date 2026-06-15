import API_URL from '../config';
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { 
  Glasses, Clock, AlertTriangle, CheckCircle, Flame, Filter, RefreshCw
} from 'lucide-react';

interface DashboardStats {
  kpis: {
    total_orders: number;
    active_orders: number;
    delivered_orders: number;
    orders_at_risk: number;
    sla_breaches: number;
    qc_failures: number;
  };
  orders_by_stage: Array<{ name: string; value: number }>;
  orders_by_store: Array<{ name: string; value: number }>;
  avg_tat_by_lens: Array<{ name: string; value: number }>;
  breach_rate_by_lens: Array<{ name: string; value: number }>;
  qc_failure_rate: number;
  inventory_levels: Array<{ name: string; value: number }>;
}

const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [status, setStatus] = useState('');
  const [lensType, setLensType] = useState('');
  const [store, setStore] = useState('');
  const [source, setSource] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (lensType) params.append('lens_type', lensType);
      if (store) params.append('store', store);
      if (source) params.append('source', source);
      if (dateStart) params.append('date_start', dateStart);
      if (dateEnd) params.append('date_end', dateEnd);

      const url = `${API_URL}/api/dashboard?${params.toString()}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error('Failed to load dashboard aggregations.');
      }

      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error connecting to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [status, lensType, store, source, dateStart, dateEnd]);

  const clearFilters = () => {
    setStatus('');
    setLensType('');
    setStore('');
    setSource('');
    setDateStart('');
    setDateEnd('');
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      
      {/* Top Title and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Operations Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time eyewear order throughput and automated SLA breach warnings.
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl text-sm border border-slate-700 transition-colors shrink-0 self-start md:self-auto"
          id="btn-refresh-dashboard"
        >
          <RefreshCw size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Filter Panel */}
      <div className="p-6 bg-slate-950/50 backdrop-blur-md rounded-3xl border border-slate-800/80 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Filter size={16} className="text-indigo-400" />
          <span>Filter Parameters</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">Lens Type</span>
            <select
              value={lensType}
              onChange={(e) => setLensType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-lens-type"
            >
              <option value="">All Lens Types</option>
              <option value="Single Vision">Single Vision</option>
              <option value="Bifocal">Bifocal</option>
              <option value="Progressive">Progressive</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">Store</span>
            <select
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-store"
            >
              <option value="">All Stores</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Pune">Pune</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">Source</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-source"
            >
              <option value="">All Sources</option>
              <option value="Inhouse">In-house</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">Start Date</span>
            <input
              type="date"
              value={dateStart}
              onChange={(e) => setDateStart(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-date-start"
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-medium">End Date</span>
            <input
              type="date"
              value={dateEnd}
              onChange={(e) => setDateEnd(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              id="filter-date-end"
            />
          </div>
        </div>

        {(status || lensType || store || source || dateStart || dateEnd) && (
          <button 
            onClick={clearFilters}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold self-start pl-1"
            id="btn-clear-filters"
          >
            Clear Active Filters
          </button>
        )}
      </div>

      {data && (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            
            {/* Total Orders */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
                <Glasses size={18} className="text-blue-400" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-white" id="kpi-total-orders">{data.kpis.total_orders}</span>
                <span className="text-xs text-slate-500 block mt-0.5">Overall requests</span>
              </div>
            </div>

            {/* Active Orders */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Active</span>
                <Clock size={18} className="text-indigo-400" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-white" id="kpi-active-orders">{data.kpis.active_orders}</span>
                <span className="text-xs text-slate-500 block mt-0.5">In process</span>
              </div>
            </div>

            {/* Delivered Orders */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Delivered</span>
                <CheckCircle size={18} className="text-emerald-400" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-white" id="kpi-delivered-orders">{data.kpis.delivered_orders}</span>
                <span className="text-xs text-slate-500 block mt-0.5">Finished delivery</span>
              </div>
            </div>

            {/* Orders At Risk */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
              {data.kpis.orders_at_risk > 0 && (
                <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
              )}
              <div className="flex justify-between items-center text-slate-400 relative z-10">
                <span className="text-xs font-semibold uppercase tracking-wider">At Risk</span>
                <AlertTriangle size={18} className="text-amber-500" />
              </div>
              <div className="mt-4 relative z-10">
                <span className="text-2xl font-bold text-white" id="kpi-orders-at-risk">{data.kpis.orders_at_risk}</span>
                <span className="text-xs text-slate-500 block mt-0.5">Risk probability &gt; 50%</span>
              </div>
            </div>

            {/* SLA Breaches */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32 relative overflow-hidden">
              {data.kpis.sla_breaches > 0 && (
                <div className="absolute inset-0 bg-red-500/5" />
              )}
              <div className="flex justify-between items-center text-slate-400 relative z-10">
                <span className="text-xs font-semibold uppercase tracking-wider">SLA Breaches</span>
                <Flame size={18} className="text-red-500" />
              </div>
              <div className="mt-4 relative z-10">
                <span className="text-2xl font-bold text-red-400" id="kpi-sla-breaches">{data.kpis.sla_breaches}</span>
                <span className="text-xs text-slate-500 block mt-0.5">Exceeded parameters</span>
              </div>
            </div>

            {/* QC Failures */}
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-32">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">QC Failures</span>
                <AlertTriangle size={18} className="text-pink-500" />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-white" id="kpi-qc-failures">{data.kpis.qc_failures}</span>
                <span className="text-xs text-slate-500 block mt-0.5">Rate: {data.qc_failure_rate}%</span>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Orders by Stage */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Orders by Current Stage</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.orders_by_stage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]}>
                      {data.orders_by_stage.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Orders by Store */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Store Distribution</h2>
              <div className="flex-1 w-full flex items-center">
                <div className="w-2/3 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.orders_by_store}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {data.orders_by_store.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/3 flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-2">
                  {data.orders_by_store.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-300 font-medium truncate max-w-[80px]">{item.name}</span>
                      <span className="text-slate-500 font-bold ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Average TAT by Lens Type */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Average Turnaround Time (TAT)</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.avg_tat_by_lens} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(val) => [`${val} hours`, 'Average TAT']}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={25} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Breach Rate by Lens Type */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">SLA Breach Percentage by Lens Type</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.breach_rate_by_lens}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(val) => [`${val}%`, 'Breach Rate']}
                    />
                    <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Inventory Levels */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Lens Inventory Sourcing Status</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inventory_levels}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(val) => [`${val} pieces`, 'In stock']}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
