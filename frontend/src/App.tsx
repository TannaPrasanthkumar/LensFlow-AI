import API_URL from './config';
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Glasses, 
  Package, 
  BarChart3, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  Users, 
  LogOut, 
  User,
  Menu,
  X,
  Bell,
  Sun,
  Moon
} from 'lucide-react';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Inventory from './pages/Inventory';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';

// Protected Route Wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || '';
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Sidebar Layout Component
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const username = localStorage.getItem('username') || 'User';
  const role = localStorage.getItem('role') || 'Viewer';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    // Default to dark mode
    document.documentElement.classList.add('dark');
    
    // Fetch alerts to count active ones
    const fetchAlertCount = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/alerts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const pending = data.filter((a: any) => a.sent_status === 'PENDING' || a.sent_status === 'DISPATCHED');
          setAlertsCount(pending.length);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Operator', 'Viewer'] },
    { name: 'Orders', path: '/orders', icon: Glasses, roles: ['Admin', 'Operator', 'Viewer'] },
    { name: 'Inventory', path: '/inventory', icon: Package, roles: ['Admin', 'Operator', 'Viewer'] },
    { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['Admin', 'Operator', 'Viewer'] },
    { 
      name: 'Alerts', 
      path: '/alerts', 
      icon: AlertTriangle, 
      roles: ['Admin', 'Operator', 'Viewer'],
      badge: alertsCount > 0 ? alertsCount : undefined 
    },
    { name: 'User Management', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['Admin', 'Operator', 'Viewer'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      setTheme('light');
    } else {
      document.documentElement.classList.add('dark');
      setTheme('dark');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xl">👓</span>
          <span className="font-bold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            AURA EYEWEAR
          </span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white"
          id="mobile-menu-toggle"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-950/80 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col justify-between
        transform transition-transform duration-300 md:relative md:transform-none
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-2xl">👓</span>
            <span className="font-bold tracking-wider text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              AURA EYEWEAR
            </span>
          </div>

          {/* User profile card */}
          <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-semibold border border-indigo-500/20">
              {username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm text-slate-100">{username}</div>
              <div className="text-xs text-slate-400 capitalize">{role}</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path || 
                               (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive 
                      ? 'bg-indigo-600/25 text-indigo-300 border-l-4 border-indigo-500 shadow-lg shadow-indigo-600/5' 
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'}
                  `}
                  id={`nav-link-${item.name.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-4">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-200"
            id="theme-toggle"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            id="btn-logout"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetails />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                
                {/* Admin Only Route */}
                <Route path="/users" element={
                  <ProtectedRoute allowedRoles={['Admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
