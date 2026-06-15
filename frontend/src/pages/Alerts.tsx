import API_URL from '../config';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Eye, RefreshCw, Send, Mail, MessageSquare, Check, X
} from 'lucide-react';

interface SystemAlert {
  alert_id: number;
  order_id: string;
  alert_type: string;
  message: string;
  risk_score: number;
  created_at: string;
  sent_status: string;
}

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAlerts = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Could not retrieve alerts repository.');
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const setOrders = (data: any[]) => {
    setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const triggerManualAlert = async () => {
    const orderId = prompt("Enter active Order ID to simulate breach alert:");
    if (!orderId) return;
    try {
      const token = localStorage.getItem('token');
      const payload = {
        order_id: orderId.trim().toUpperCase(),
        alert_type: "SLA_BREACH_RISK",
        message: `Simulated high risk of SLA breach for order ${orderId}`,
        risk_score: 95.0
      };
      
      const res = await fetch(`${API_URL}/api/send-alert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Alert event sent! Notifications dispatched.");
        await fetchAlerts();
      } else {
        const err = await res.json();
        alert(`Error: ${err.detail}`);
      }
    } catch (err) {
      alert("Error sending alert request.");
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'SLA_BREACH_RISK':
        return 'text-red-400 bg-red-500/10 border-red-500/25';
      case 'QC_FAILURE':
        return 'text-pink-400 bg-pink-500/10 border-pink-500/25';
      default:
        return 'text-amber-400 bg-amber-500/10 border-amber-500/25';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Operations Alert Logs</h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit automatic notification status (Email and WhatsApp) and review risk summaries.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={fetchAlerts}
            className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
            id="btn-refresh-alerts"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={triggerManualAlert}
            className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            id="btn-trigger-manual-alert"
          >
            Simulate Alert
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-slate-950/20 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="p-4">Alert ID</th>
                <th className="p-4">Order Reference</th>
                <th className="p-4">Alert Type</th>
                <th className="p-4">Message Log</th>
                <th className="p-4 text-center">Calculated Probability</th>
                <th className="p-4">Generated Time</th>
                <th className="p-4">Dispatch Status</th>
                <th className="p-4 text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    <span>Querying active warnings...</span>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    No active alerts generated. System operating within optimal thresholds.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.alert_id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="p-4 font-mono text-xs text-slate-500">#AL-{alert.alert_id}</td>
                    <td className="p-4 font-mono font-semibold text-slate-100">{alert.order_id}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getBadgeColor(alert.alert_type)}`}>
                        {alert.alert_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 font-medium max-w-[300px] truncate" title={alert.message}>
                      {alert.message}
                    </td>
                    <td className="p-4 text-center font-bold text-red-400">{alert.risk_score}%</td>
                    <td className="p-4 text-xs text-slate-500">{new Date(alert.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase 
                        ${alert.sent_status === 'SENT' ? 'text-emerald-400' : 
                          alert.sent_status === 'DISPATCHED' ? 'text-blue-400' : 
                          alert.sent_status === 'FAILED' ? 'text-red-400' : 'text-slate-500'}`}>
                        {alert.sent_status === 'SENT' && <Check size={12} />}
                        {alert.sent_status === 'FAILED' && <X size={12} />}
                        <span>{alert.sent_status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        to={`/orders/${alert.order_id}`}
                        className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        id={`btn-alert-inspect-order-${alert.order_id.toLowerCase()}`}
                      >
                        <Eye size={12} />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Alerts;
