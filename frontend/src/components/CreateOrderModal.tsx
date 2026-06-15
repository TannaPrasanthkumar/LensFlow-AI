import API_URL from '../config';
import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ onClose, onSuccess }) => {
  const [customerName, setCustomerName] = useState('');
  const [storeLocation, setStoreLocation] = useState('Hyderabad');
  const [lensType, setLensType] = useState('Single Vision');
  const [lensIndex, setLensIndex] = useState(1.56);
  const [coating, setCoating] = useState('Hard Coat');
  const [frame, setFrame] = useState('');
  const [spherePower, setSpherePower] = useState(0.00);
  const [cylinderPower, setCylinderPower] = useState(0.00);
  const [axis, setAxis] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const payload = {
        customer_name: customerName,
        store_location: storeLocation,
        lens_type: lensType,
        lens_index: Number(lensIndex),
        coating: coating,
        frame: frame || 'FR-STANDARD',
        sphere_power: Number(spherePower),
        cylinder_power: Number(cylinderPower),
        axis: Number(axis),
      };

      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Could not place new order');
      }

      const data = await res.json();
      setSuccessInfo(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred during submission.');
    } finally {
      setLoading(false);
    }
  };

  const STORES = ["Hyderabad", "Bangalore", "Chennai", "Mumbai", "Delhi", "Pune"];
  const LENS_TYPES = ["Single Vision", "Bifocal", "Progressive"];
  const LENS_INDICES = [1.56, 1.61, 1.67, 1.74];
  const COATINGS = ["Hard Coat", "Anti-Glare", "Blue Cut", "Photochromic"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
          id="btn-close-create-modal"
        >
          <X size={20} />
        </button>

        {successInfo ? (
          <div className="text-center py-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-3xl">
              <Check size={28} />
            </div>
            <h2 className="text-xl font-bold text-white">Order Successfully Placed!</h2>
            <div className="p-4 bg-slate-950 rounded-2xl font-mono text-xs text-slate-300 w-full max-w-md border border-slate-800/80 flex flex-col gap-2">
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Order ID:</span>
                <span className="font-bold text-indigo-400">{successInfo.order_id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Customer:</span>
                <span>{successInfo.customer_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900 pb-1.5">
                <span className="text-slate-500">Sourced:</span>
                <span className="font-semibold text-blue-400">{successInfo.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Initial Risk:</span>
                <span className="font-semibold text-amber-500">{successInfo.risk_score}%</span>
              </div>
            </div>
            <button
              onClick={onSuccess}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors mt-4"
              id="btn-create-modal-success-close"
            >
              Back to Catalog
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white mb-6">Create New Eyewear Order</h2>
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Amit Sharma"
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    id="input-create-customer-name"
                  />
                </div>

                {/* Store Location */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Store Location</label>
                  <select
                    value={storeLocation}
                    onChange={(e) => setStoreLocation(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 outline-none"
                    id="select-create-store"
                  >
                    {STORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Lens Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Lens Type</label>
                  <select
                    value={lensType}
                    onChange={(e) => setLensType(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 outline-none"
                    id="select-create-lens-type"
                  >
                    {LENS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                {/* Lens Index */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Lens Index</label>
                  <select
                    value={lensIndex}
                    onChange={(e) => setLensIndex(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 outline-none"
                    id="select-create-lens-index"
                  >
                    {LENS_INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>

                {/* Coating */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Coating</label>
                  <select
                    value={coating}
                    onChange={(e) => setCoating(e.target.value)}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 outline-none"
                    id="select-create-coating"
                  >
                    {COATINGS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Frame Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Frame Code</label>
                  <input
                    type="text"
                    required
                    value={frame}
                    onChange={(e) => setFrame(e.target.value)}
                    placeholder="e.g. FR-5023"
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    id="input-create-frame"
                  />
                </div>

                {/* Sphere Power */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Sphere Power (SPH)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={spherePower}
                    onChange={(e) => setSpherePower(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    id="input-create-sphere"
                  />
                </div>

                {/* Cylinder Power */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Cylinder Power (CYL)</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={cylinderPower}
                    onChange={(e) => setCylinderPower(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    id="input-create-cylinder"
                  />
                </div>

                {/* Axis */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400 font-semibold">Axis (0 - 180)</label>
                  <input
                    type="number"
                    min="0"
                    max="180"
                    required
                    value={axis}
                    onChange={(e) => setAxis(Number(e.target.value))}
                    className="bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none"
                    id="input-create-axis"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                  id="btn-create-modal-cancel"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl px-6 py-2.5 text-sm font-semibold shadow-lg shadow-indigo-600/10 transition-colors flex items-center gap-2"
                  id="btn-create-modal-submit"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateOrderModal;
