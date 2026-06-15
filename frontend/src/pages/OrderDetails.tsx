import API_URL from '../config';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, ShieldAlert, Sparkles, AlertTriangle, Clock, RefreshCw, CheckCircle, Trash2, Milestone
} from 'lucide-react';

interface OrderDetails {
  order: {
    order_id: string;
    customer_name: string;
    store_location: string;
    lens_type: string;
    lens_index: number;
    coating: string;
    frame: string;
    sphere_power: number;
    cylinder_power: number;
    axis: number;
    source: string;
    inhouse_available: boolean;
    created_at: string;
    completed_at: string | null;
    current_stage: string;
    status: string;
    sla_hours: number;
    actual_tat_hours: number | null;
    remaining_sla_hours: number | null;
    qc_fail_count: number;
    delay_reason: string | null;
    breached: boolean;
    risk_score: number;
  };
  stage_history: Array<{
    stage_history_id: number;
    order_id: string;
    stage_iteration: number;
    stage: string;
    start_time: string;
    end_time: string | null;
    duration_hours: number | null;
  }>;
  predictions: Array<{
    prediction_id: number;
    predicted_at: string;
    risk_score: number;
    probability: number;
    breach_prediction: boolean;
    recommended_action: string;
  }>;
  alerts: Array<{
    alert_id: number;
    alert_type: string;
    message: string;
    risk_score: number;
    created_at: string;
    sent_status: string;
  }>;
}

const OrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Transition Form State
  const [nextStage, setNextStage] = useState('');
  const [nextStatus, setNextStatus] = useState('Active');
  const [qcFailed, setQcFailed] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const role = localStorage.getItem('role') || 'Viewer';

  const fetchOrderDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Order not found or access denied.');
      const resData = await res.json();
      setData(resData);
      
      // Auto-set the dropdowns
      setNextStatus(resData.order.status);
      setNextStage(resData.order.current_stage);
      setDelayReason(resData.order.delay_reason || '');
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const handleTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransitioning(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        stage: nextStage,
        status: nextStatus,
        qc_failed: qcFailed,
        delay_reason: delayReason || null
      };

      const res = await fetch(`${API_URL}/api/orders/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Could not transition order stage.');
      }

      setQcFailed(false);
      await fetchOrderDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete order ${id}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/orders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Delete permission denied.');
      navigate('/orders');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePredict = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ order_id: id })
      });
      if (res.ok) {
        await fetchOrderDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stagesSequence = [
    "Prescription Validation",
    "Lens Allocation",
    "Lens Cutting",
    "Coating",
    "Frame Assembly",
    "Quality Check",
    "Packing",
    "Shipped",
    "Delivered"
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-300 rounded-2xl flex flex-col gap-4 max-w-md mx-auto mt-20">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <ShieldAlert size={20} />
          <span>Error Loading Details</span>
        </div>
        <p className="text-sm">{error}</p>
        <Link to="/orders" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
          <ArrowLeft size={12} />
          <span>Return to Catalog</span>
        </Link>
      </div>
    );
  }

  const { order, stage_history, predictions, alerts } = data!;

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
    if (score < 70) return 'text-amber-400 border-amber-500/30 bg-amber-500/5';
    return 'text-red-400 border-red-500/30 bg-red-500/5';
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      {/* Header Back Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link 
          to="/orders"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          id="btn-details-back"
        >
          <ArrowLeft size={16} />
          <span>Back to Orders</span>
        </Link>
        
        {role === 'Admin' && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
            id="btn-delete-order"
          >
            <Trash2 size={14} />
            <span>Delete Order</span>
          </button>
        )}
      </div>

      {/* Title Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-950/45 border border-slate-800/80 rounded-3xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-2xl font-bold border border-indigo-500/10 text-indigo-400">
            👓
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-white" id="order-details-id">Order {order.order_id}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize 
                ${order.status === 'Delivered' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                  order.status === 'Active' ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' : 
                  'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}
                id="order-details-status"
              >
                {order.status}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Customer: <span className="font-semibold text-slate-200">{order.customer_name}</span> &nbsp;•&nbsp; 
              Store: <span className="font-semibold text-slate-200">{order.store_location}</span>
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex flex-col text-right">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Breach Risk</span>
            <span className="text-sm font-semibold text-slate-300 mt-0.5">{order.risk_score}% Probability</span>
          </div>
          <span className={`w-3.5 h-3.5 rounded-full shrink-0 border 
            ${order.risk_score < 30 ? 'bg-emerald-500 border-emerald-400' : 
              order.risk_score < 70 ? 'bg-amber-500 border-amber-400' : 
              'bg-red-500 border-red-400 glow-red'}`} 
            id="order-details-risk-indicator"
          />
        </div>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Prescription and Sourcing */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Prescription Parameters */}
          <div className="p-6 bg-slate-950/20 rounded-3xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-4 pl-1">Prescription & Parameters</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Lens Type</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-lens-type">{order.lens_type}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Lens Index</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-lens-index">{order.lens_index}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Coating</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-coating">{order.coating}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Frame</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-frame">{order.frame}</span>
              </div>
              
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Sphere (SPH)</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-sphere">{order.sphere_power > 0 ? `+${order.sphere_power}` : order.sphere_power}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Cylinder (CYL)</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-cylinder">{order.cylinder_power}</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Axis</span>
                <span className="font-semibold text-sm text-slate-200 block mt-1" id="order-param-axis">{order.axis}°</span>
              </div>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-900/80">
                <span className="text-xs text-slate-500 block">Fulfillment Source</span>
                <span className="font-semibold text-sm text-blue-400 block mt-1" id="order-param-source">{order.source}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 pl-1.5 text-xs text-slate-500">
              <Calendar size={14} />
              <span>Placed on: {new Date(order.created_at).toLocaleString()}</span>
              {order.completed_at && (
                <>
                  <span className="mx-1.5">•</span>
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span>Delivered on: {new Date(order.completed_at).toLocaleString()}</span>
                </>
              )}
            </div>
          </div>

          {/* Workflow Timeline */}
          <div className="p-6 bg-slate-950/20 rounded-3xl border border-slate-800/80">
            <h2 className="text-lg font-bold text-white mb-4 pl-1">Stage Progression Logs</h2>
            <div className="relative border-l-2 border-slate-800/80 pl-6 ml-3 flex flex-col gap-6">
              {stage_history.map((log, index) => {
                const isActive = log.end_time === null;
                return (
                  <div key={log.stage_history_id} className="relative">
                    {/* Circle icon indicator */}
                    <span className={`
                      absolute -left-[31px] top-1.5 w-4.5 h-4.5 rounded-full border-2 
                      ${isActive 
                        ? 'bg-indigo-500 border-indigo-400 animate-pulse' 
                        : 'bg-slate-950 border-slate-700'
                      }
                    `} />
                    
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-sm ${isActive ? 'text-indigo-400 font-bold' : 'text-slate-200'}`}>
                          {log.stage}
                        </span>
                        {log.stage_iteration > 1 && (
                          <span className="bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                            Iter {log.stage_iteration}
                          </span>
                        )}
                        {isActive && (
                          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                        <span>Started: {new Date(log.start_time).toLocaleString()}</span>
                        {log.end_time ? (
                          <>
                            <span>Ended: {new Date(log.end_time).toLocaleString()}</span>
                            <span className="text-slate-400 font-semibold">Duration: {log.duration_hours} hrs</span>
                          </>
                        ) : (
                          <span className="text-indigo-500 font-bold italic">Processing...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 2: Predictions, Alerts, and Operator Form */}
        <div className="flex flex-col gap-6">
          
          {/* ML Predictions Card */}
          <div className="p-6 bg-slate-950/20 rounded-3xl border border-slate-800/80 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Sparkles className="text-indigo-400" size={18} />
                <span>ML SLA Prediction</span>
              </div>
              <button
                onClick={handlePredict}
                className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                id="btn-repredict"
                title="Recalculate predictions"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            {predictions.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className={`p-4 rounded-2xl border ${getRiskColor(predictions[0].risk_score)}`}>
                  <div className="font-semibold text-sm">Breach probability: {predictions[0].risk_score}%</div>
                  <div className="text-xs mt-1.5 opacity-90 leading-relaxed font-medium">
                    <span className="font-bold">Recommended action:</span> {predictions[0].recommended_action}
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 block pl-1.5">
                  Last evaluated: {new Date(predictions[0].predicted_at).toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic pl-1">No prediction scored. Click refresh icon to generate.</p>
            )}
          </div>

          {/* Active Alerts */}
          <div className="p-6 bg-slate-950/20 rounded-3xl border border-slate-800/80 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <AlertTriangle className="text-amber-500" size={18} />
              <span>Active Warning Logs</span>
            </div>
            
            {alerts.length > 0 ? (
              <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-1">
                {alerts.map(a => (
                  <div key={a.alert_id} className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-xs flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase text-[9px]">
                        {a.alert_type}
                      </span>
                      <span className="text-slate-600 text-[10px]">{new Date(a.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-400 font-medium leading-relaxed">{a.message}</p>
                    <div className="text-slate-600 text-[9px] mt-0.5">
                      Notification channels status: <span className="font-semibold text-slate-500 uppercase">{a.sent_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-xs italic pl-1">No alerts raised for this order.</p>
            )}
          </div>

          {/* Operator Action Panel */}
          {role !== 'Viewer' && order.status === 'Active' && (
            <div className="p-6 bg-slate-950/45 rounded-3xl border border-slate-800/80 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-white font-bold text-base border-b border-slate-900 pb-3">
                <Milestone className="text-indigo-400" size={18} />
                <span>Transition Workflow Stage</span>
              </div>
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <form onSubmit={handleTransition} className="flex flex-col gap-4">
                {/* Next Stage Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Select Next Stage</span>
                  <select
                    value={nextStage}
                    onChange={(e) => setNextStage(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                    id="select-transition-stage"
                  >
                    {stagesSequence.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Status Dropdown */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Set Sourcing Status</span>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                    id="select-transition-status"
                  >
                    <option value="Active">Active (In progress)</option>
                    <option value="Delivered">Delivered (Completed)</option>
                    <option value="Cancelled">Cancelled (Aborted)</option>
                  </select>
                </div>

                {/* Quality Check Failure Flag */}
                {order.current_stage === 'Quality Check' && (
                  <div className="flex items-center gap-2.5 p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl">
                    <input
                      type="checkbox"
                      id="checkbox-qc-failed"
                      checked={qcFailed}
                      onChange={(e) => setQcFailed(e.target.checked)}
                      className="w-4.5 h-4.5 rounded border-slate-700 bg-slate-900 text-pink-500 focus:ring-pink-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="checkbox-qc-failed" className="text-xs font-semibold text-pink-400 cursor-pointer">
                      Flag Quality Check Failure (Triggers Re-run loop)
                    </label>
                  </div>
                )}

                {/* Delay Reason */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs text-slate-500 font-semibold">Delay / Loop Note (Optional)</span>
                  <input
                    type="text"
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="e.g. Lens coating scratches, Vendor delay"
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    id="input-transition-delay-reason"
                  />
                </div>

                <button
                  type="submit"
                  disabled={transitioning}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-colors flex items-center justify-center gap-2 mt-2"
                  id="btn-transition-submit"
                >
                  {transitioning ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Apply Transition'
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
