import API_URL from '../config';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, PlusCircle, Eye, RefreshCw
} from 'lucide-react';
import CreateOrderModal from '../components/CreateOrderModal';

interface Order {
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
}

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [lensType, setLensType] = useState('');
  const [store, setStore] = useState('');
  const [source, setSource] = useState('');
  
  // Pagination & Sorting state
  const [limit] = useState(15);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const offset = (page - 1) * limit;
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (lensType) params.append('lens_type', lensType);
      if (store) params.append('store', store);
      if (source) params.append('source', source);

      const res = await fetch(`${API_URL}/api/orders?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load orders catalog.');
      
      const data = await res.json();
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, sortBy, sortOrder, status, lensType, store, source]);

  // Debounce search input
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score < 70) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'Delivered':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      case 'Active':
        return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/25';
      case 'Cancelled':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/25';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/25';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Orders Catalog</h1>
          <p className="text-slate-400 text-sm mt-1">
            Access specific customer orders, check timeline progress, and trace fulfillment loops.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={fetchOrders}
            className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-colors"
            id="btn-refresh-orders"
            title="Refresh list"
          >
            <RefreshCw size={18} />
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-all active:scale-[0.98]"
            id="btn-create-order"
          >
            <PlusCircle size={18} />
            <span>Create Order</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-5 bg-slate-950/45 rounded-2xl border border-slate-800/80 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          {/* Search bar */}
          <div className="relative w-full md:flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
              <Search size={18} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Customer Name, or Frame code..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 outline-none transition-all"
              id="search-orders"
            />
          </div>
          
          {/* Sourcing Filter Toggle */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 overflow-x-auto py-1">
            <SlidersHorizontal size={16} className="text-slate-500 shrink-0" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              id="select-filter-status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={lensType}
              onChange={(e) => { setLensType(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              id="select-filter-lens-type"
            >
              <option value="">All Lenses</option>
              <option value="Single Vision">Single Vision</option>
              <option value="Bifocal">Bifocal</option>
              <option value="Progressive">Progressive</option>
            </select>

            <select
              value={store}
              onChange={(e) => { setStore(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              id="select-filter-store"
            >
              <option value="">All Stores</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bangalore">Bangalore</option>
              <option value="Chennai">Chennai</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Delhi">Delhi</option>
              <option value="Pune">Pune</option>
            </select>

            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              id="select-filter-source"
            >
              <option value="">All Sources</option>
              <option value="Inhouse">In-house</option>
              <option value="Vendor">Vendor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-slate-950/20 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800/80">
              <tr>
                <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('order_id')}>
                  <div className="flex items-center gap-1">
                    <span>Order ID</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('customer_name')}>
                  <div className="flex items-center gap-1">
                    <span>Customer</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('lens_type')}>
                  <div className="flex items-center gap-1">
                    <span>Lens Type</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4">Current Stage</th>
                <th className="p-4">Status</th>
                <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('remaining_sla_hours')}>
                  <div className="flex items-center gap-1">
                    <span>Remaining SLA</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('risk_score')}>
                  <div className="flex items-center gap-1">
                    <span>Risk Score</span>
                    <ArrowUpDown size={14} />
                  </div>
                </th>
                <th className="p-4">Delay Reason</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/40 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    <span>Querying orders repository...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    No orders match the selected criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4 font-mono font-semibold text-slate-100">{order.order_id}</td>
                    <td className="p-4 font-medium">{order.customer_name}</td>
                    <td className="p-4 text-xs">
                      <div>{order.lens_type}</div>
                      <div className="text-slate-500 mt-0.5">{order.lens_index} Index • {order.coating}</div>
                    </td>
                    <td className="p-4 text-slate-400 font-medium text-xs">{order.current_stage}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className={`p-4 font-semibold text-xs ${order.remaining_sla_hours !== null && order.remaining_sla_hours < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {order.status === 'Delivered' 
                        ? `${order.actual_tat_hours} hrs TAT`
                        : order.remaining_sla_hours !== null 
                          ? `${order.remaining_sla_hours} hrs left` 
                          : '--'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRiskColor(order.risk_score)}`}>
                        {order.risk_score}%
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 italic text-xs truncate max-w-[150px]">{order.delay_reason || 'None'}</td>
                    <td className="p-4 text-center">
                      <Link
                        to={`/orders/${order.order_id}`}
                        className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 border border-slate-700 hover:border-indigo-500/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        id={`btn-view-order-${order.order_id.toLowerCase()}`}
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
        
        {/* Pagination controls */}
        {!loading && orders.length > 0 && (
          <div className="p-4 bg-slate-950/40 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of entries</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition-colors"
                id="btn-page-prev"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                disabled={orders.length < limit}
                onClick={() => setPage(page + 1)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50 transition-colors"
                id="btn-page-next"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Create Order Modal */}
      {showCreateModal && (
        <CreateOrderModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => { setShowCreateModal(false); fetchOrders(); }} 
        />
      )}
    </div>
  );
};

export default Orders;
