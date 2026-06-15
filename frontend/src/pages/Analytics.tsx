import API_URL from '../config';
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  BarChart3, Download, RefreshCw, Compass, Clock, HelpCircle, Activity
} from 'lucide-react';

interface AnalyticsData {
  stage_distribution: Array<{ name: string; value: number }>;
  avg_tat_hours: number;
  orders_per_day: Array<{ name: string; value: number }>;
  breach_percentage: number;
  lens_type_distribution: Array<{ name: string; value: number }>;
  store_performance: Array<{ name: string; value: number }>;
  heatmaps: Array<{ store: string; stage: string; avg_duration: number }>;
}

const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'];

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load analytics.');
      const resData = await res.json();
      setData(resData);
    } catch (err: any) {
      setError(err.message || 'Error connecting to analytics database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const exportCSV = () => {
    if (!data) return;
    
    // Build CSV Content
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: KPIs
    csvContent += "METRIC,VALUE\n";
    csvContent += `Average Turnaround Time (Hours),${data.avg_tat_hours}\n`;
    csvContent += `SLA Breach Rate (%),${data.breach_percentage}\n\n`;
    
    // Section 2: Store performance
    csvContent += "STORE,AVERAGE TAT (HOURS)\n";
    data.store_performance.forEach(s => {
      csvContent += `${s.name},${s.value}\n`;
    });
    csvContent += "\n";
    
    // Section 3: Daily volume
    csvContent += "DATE,ORDERS CREATED\n";
    data.orders_per_day.forEach(d => {
      csvContent += `${d.name},${d.value}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Aura_Eyewear_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelSimulation = () => {
    // Standard Excel spreadsheet simulation via XML format
    if (!data) return;
    
    let doc = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">';
    doc += '<Worksheet ss:Name="Aura Eyewear Analytics"><Table>';
    
    // Row header
    doc += '<Row><Cell><Data ss:Type="String">Key Performance Report</Data></Cell></Row>';
    doc += `<Row><Cell><Data ss:Type="String">Average TAT (Hours)</Data></Cell><Cell><Data ss:Type="Number">${data.avg_tat_hours}</Data></Cell></Row>`;
    doc += `<Row><Cell><Data ss:Type="String">Breach Rate (%)</Data></Cell><Cell><Data ss:Type="Number">${data.breach_percentage}</Data></Cell></Row>`;
    
    doc += '</Table></Worksheet></Workbook>';
    
    const blob = new Blob([doc], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Aura_Eyewear_Analytics_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const STORES = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi", "Pune"];
  const STAGES = [
    "Prescription Validation",
    "Lens Allocation",
    "Lens Cutting",
    "Coating",
    "Frame Assembly",
    "Quality Check",
    "Packing",
    "Shipped"
  ];

  // Map heatmap metrics for matrix grid rendering
  const getHeatmapDuration = (storeName: string, stageName: string) => {
    if (!data) return 0;
    const match = data.heatmaps.find(
      h => h.store.toLowerCase() === storeName.toLowerCase() && h.stage.toLowerCase() === stageName.toLowerCase()
    );
    return match ? match.avg_duration : 0;
  };

  // Find max duration in heatmap to scale opacity colors
  const maxDuration = data ? Math.max(...data.heatmaps.map(h => h.avg_duration), 1.0) : 10.0;

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Advanced Reports</h1>
          <p className="text-slate-400 text-sm mt-1">
            Aggregate historical data logs, download spreadsheets, and audit process bottleneck heatmaps.
          </p>
        </div>
        
        <div className="flex gap-2 self-start sm:self-auto">
          {/* CSV Export */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            id="btn-export-csv"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={exportExcelSimulation}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
            id="btn-export-excel"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                <Clock size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Average Turnaround Time</span>
                <span className="text-xl font-bold text-slate-100 mt-0.5">{data.avg_tat_hours} Hours</span>
              </div>
            </div>

            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600/10 flex items-center justify-center text-red-400">
                <Activity size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Fulfillment Breach Rate</span>
                <span className="text-xl font-bold text-red-400 mt-0.5">{data.breach_percentage}%</span>
              </div>
            </div>

            <div className="p-6 bg-slate-950/45 border border-slate-800/80 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-400">
                <Compass size={22} />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Reporting Period</span>
                <span className="text-xl font-bold text-slate-100 mt-0.5">Last 90 Days</span>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Orders per day */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Daily Order Volume</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.orders_per_day}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Lens type share */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Lens Category Share</h2>
              <div className="flex-1 w-full flex items-center">
                <div className="w-2/3 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.lens_type_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.lens_type_distribution.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/3 flex flex-col gap-2.5">
                  {data.lens_type_distribution.map((item, idx) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-300 font-medium">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Store Performance Average TAT */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 h-[380px] flex flex-col lg:col-span-2">
              <h2 className="text-lg font-bold text-slate-100 mb-4 pl-1">Store Performance Profile (Average TAT in Hours)</h2>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.store_performance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      formatter={(val) => [`${val} hours`, 'Average TAT']}
                    />
                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={50}>
                      {data.store_performance.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Section 4: Process Bottleneck Heatmap Matrix */}
            <div className="p-6 bg-slate-950/30 rounded-3xl border border-slate-800/70 flex flex-col lg:col-span-2 shadow-lg">
              <h2 className="text-lg font-bold text-slate-100 mb-2 pl-1">Process Bottlenecks (Average Duration per Stage in Hours)</h2>
              <p className="text-slate-500 text-xs pl-1 mb-6">
                Matrix grid highlighting stages that contribute to fulfillment delays across locations. Red/pink opacity represents higher processing hours.
              </p>
              
              <div className="overflow-x-auto">
                <div className="min-w-[700px] flex flex-col border border-slate-800/60 rounded-2xl overflow-hidden">
                  {/* Grid Header */}
                  <div className="grid grid-cols-9 bg-slate-950/80 p-3 border-b border-slate-800/80 text-[10px] text-slate-500 font-bold uppercase text-center">
                    <div className="text-left pl-2">Stage Name</div>
                    {STORES.map(store => <div key={store}>{store}</div>)}
                  </div>
                  
                  {/* Grid Rows */}
                  <div className="divide-y divide-slate-800/40 text-xs">
                    {STAGES.map(stage => (
                      <div key={stage} className="grid grid-cols-9 items-center p-2 hover:bg-slate-900/10">
                        <div className="font-semibold text-slate-300 pl-2 text-left">{stage}</div>
                        {STORES.map(store => {
                          const duration = getHeatmapDuration(store, stage);
                          const intensity = duration / maxDuration;
                          // Use a nice Indigo-pink gradient color model
                          const cellBg = duration > 0 
                            ? `rgba(99, 102, 241, ${Math.max(0.08, intensity)})` 
                            : 'transparent';
                          const textColor = duration > (maxDuration * 0.7) ? 'text-indigo-200 font-bold' : 'text-slate-400';
                          
                          return (
                            <div 
                              key={`${store}-${stage}`} 
                              className={`p-3 text-center border-l border-slate-800/20 font-mono ${textColor}`}
                              style={{ backgroundColor: cellBg }}
                              title={`Store: ${store} | Stage: ${stage} | Avg: ${duration} hours`}
                            >
                              {duration > 0 ? `${duration}h` : '-'}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
