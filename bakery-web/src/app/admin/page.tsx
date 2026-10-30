'use client';

import React, { useState, useEffect, useSyncExternalStore, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, Layers, UtensilsCrossed, ShoppingCart, 
  Menu as MenuIcon, X, LogOut, AlertTriangle, 
  RefreshCcw, Clock, Crown, Settings as SettingsIcon,
  ReceiptText, Lock, Package, Sun, Moon, StickyNote, Bell, Check
} from 'lucide-react';
import { Category, Dish, LedgerEntry, BakeryNote } from '@/types';
import { inputCls } from '@/components/ui/Primitives';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';

// Feature Views
import OverviewView from '@/components/features/OverviewView';
import StructureView from '@/components/features/StructureView';
import MenuView from '@/components/features/MenuView';
import LedgerView from '@/components/features/LedgerView';
import OrdersHistoryView from '@/components/features/OrdersHistoryView';
import InventoryView from '@/components/features/InventoryView';
import NotesView from '@/components/features/NotesView';
import SettingsView from '@/components/features/SettingsView';

// PROFESSIONAL STREAMLINED NAVIGATION
const NAVIGATION = [
  {
    group: 'Operations',
    items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'orders', label: 'Orders', icon: ReceiptText },
      { id: 'ledger', label: 'Point of sale', icon: ShoppingCart },
      { id: 'notes', label: 'Prep notes', icon: StickyNote },
    ],
  },
  {
    group: 'Bakery Management',
    items: [
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
      { id: 'structure', label: 'Categories', icon: Layers },
    ],
  },
  {
    group: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ],
  },
];

interface AdminOrderNotification {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  itemsSummary?: string;
  createdAt: string;
  receivedAt: string;
  read: boolean;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
}

const NOTIFICATION_STORAGE_KEY = 'sample_bakery_admin_notifications';

function DashboardSkeleton() {
  return (
    <div className="w-full h-full space-y-6 animate-pulse p-2">
      <div className="w-48 h-8 bg-white/5 rounded-lg mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl border border-white/5" />
        ))}
      </div>
      <div className="h-[400px] bg-white/5 rounded-2xl border border-white/5 mt-6" />
    </div>
  );
}

function AdminCommandCenter() {
  const { mode, toggleMode, themeConfig } = useTheme();
  const isLight = mode === 'light';

  // PIN Lock State
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [view, setView] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [notifications, setNotifications] = useState<AdminOrderNotification[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as AdminOrderNotification[] : [];
      return Array.isArray(parsed)
        ? parsed.filter((notification) => Boolean(notification.receivedAt && Number.isFinite(Date.parse(notification.receivedAt))))
        : [];
    } catch {
      return [];
    }
  });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const seenOrderIds = useRef<Set<string>>(new Set());
  const ordersLoaded = useRef(false);
  const sessionStartedAt = useRef(0);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [notes, setNotes] = useState<BakeryNote[]>([]);
  const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState<boolean>(true);

  const addOrderNotification = useCallback((order: LedgerEntry) => {
    const orderId = String(order.id || order.order_id || '');
    if (!orderId) return;

    const itemsSummary = (order.items || []).map((it) => `${it.name} x${it.quantity}`).join(', ');

    setNotifications((current) => {
      const existing = current.find((notification) => notification.orderId === orderId);
      if (existing) {
        return current.map((notification) =>
          notification.orderId === orderId ? { ...notification, status: order.status || notification.status } : notification
        );
      }

      const newNotification = {
        orderId,
        customerName: order.customer_name || 'New customer',
        customerPhone: order.customer_phone || '',
        total: Number(order.total) || 0,
        itemsSummary,
        createdAt: order.created_at || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        read: false,
        status: (order.status || 'pending') as 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled',
      };

      // Browser push notification when a new order arrives
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification('🧁 New Order Arrived!', {
              body: `${newNotification.customerName} — ₹${newNotification.total}\n${itemsSummary}`,
              icon: '/favicon.ico',
              tag: orderId,
            });
          } catch {}
        } else if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      return [newNotification, ...current].slice(0, 30);
    });
  }, []);

  // Central status updater (Accept ✓: 'completed', Reject ✕: 'cancelled')
  const handleUpdateOrderStatus = useCallback(async (
    targetId: string,
    newStatus: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
  ) => {
    // 1. Optimistic update in ledger
    setLedger((prev) =>
      prev.map((o) =>
        o.id === targetId || o.order_id === targetId
          ? { ...o, status: newStatus }
          : o
      )
    );

    // 2. Optimistic update in notifications
    setNotifications((prev) =>
      prev.map((n) =>
        n.orderId === targetId ? { ...n, status: newStatus, read: true } : n
      )
    );

    // 3. Persist to API
    try {
      const res = await fetch(`/api/orders/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PIN || '779911'}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        console.error('Failed to update order status');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  }, []);

  // Persistent master inventory tracking toggle
  const handleToggleInventoryTracking = useCallback(async (val: boolean) => {
    setInventoryTrackingEnabled(val);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sample_bakery_inventory_tracking', String(val));
      }
      await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PIN || '779911'}`,
        },
        body: JSON.stringify({ inventory_tracking_enabled: val }),
      });
    } catch (err) {
      console.error('Failed to save inventory tracking toggle:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // Notifications still work for this page session if storage is unavailable.
    }
  }, [notifications]);

  const markNotificationsRead = useCallback(() => {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }, []);

  const markNotificationRead = useCallback((orderId: string) => {
    setNotifications((current) => current.map((notification) =>
      notification.orderId === orderId ? { ...notification, read: true } : notification
    ));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchGlobalTelemetry = useCallback(async (isSilentSync = false) => {
    try {
      if (!isSilentSync) setStatus('loading');
      setErrorMessage(null);
      
      const [catsRes, itemsRes, ledgerRes, notesRes, settingsRes] = await Promise.all([
        fetch('/api/categories').then((r) => r.json()).catch(() => []),
        fetch('/api/menu').then((r) => r.json()).catch(() => []),
        fetch('/api/orders?format=ledger').then((r) => r.json()).catch(() => []),
        fetch('/api/notes').then((r) => r.json()).catch(() => []),
        fetch('/api/settings').then((r) => r.json()).catch(() => null),
      ]);

      setCategories(Array.isArray(catsRes) ? catsRes : []);
      setDishes(Array.isArray(itemsRes) ? itemsRes : []);
      const orders = Array.isArray(ledgerRes) ? ledgerRes as LedgerEntry[] : [];
      
      // Auto-populate all pending orders into notifications so the bell always lists them
      orders
        .filter((o) => (o.status || 'pending') === 'pending')
        .forEach((order) => {
          addOrderNotification(order);
        });

      if (ordersLoaded.current) {
        orders.forEach((order) => {
          const orderId = String(order.id || order.order_id || '');
          if (orderId && !seenOrderIds.current.has(orderId) && Date.parse(order.created_at) >= sessionStartedAt.current - 60_000) {
            addOrderNotification(order);
          }
        });
      }
      seenOrderIds.current = new Set(orders.map((order) => String(order.id || order.order_id || '')).filter(Boolean));
      ordersLoaded.current = true;
      setLedger(orders);
      setNotes(Array.isArray(notesRes) ? notesRes : []);

      // Check persistent inventory tracking preference first
      if (typeof window !== 'undefined') {
        const savedTracking = localStorage.getItem('sample_bakery_inventory_tracking');
        if (savedTracking !== null) {
          setInventoryTrackingEnabled(savedTracking === 'true');
        } else if (settingsRes && settingsRes.inventory_tracking_enabled !== undefined) {
          setInventoryTrackingEnabled(Boolean(settingsRes.inventory_tracking_enabled));
        }
      } else if (settingsRes && settingsRes.inventory_tracking_enabled !== undefined) {
        setInventoryTrackingEnabled(Boolean(settingsRes.inventory_tracking_enabled));
      }
      
      if (!isSilentSync) setStatus('success');
    } catch (err: any) {
      console.error('Telemetry Sync Failed:', err);
      if (!isSilentSync) {
        setErrorMessage(err.message || 'Unable to establish secure connection to the database.');
        setStatus('error');
      }
    }
  }, [addOrderNotification]);

  useEffect(() => {
    sessionStartedAt.current = Date.now();
    let active = true;

    async function initialLoad() {
      try {
        const [catsRes, itemsRes, ledgerRes, notesRes] = await Promise.all([
          fetch('/api/categories').then((r) => r.json()).catch(() => []),
          fetch('/api/menu').then((r) => r.json()).catch(() => []),
          fetch('/api/orders?format=ledger').then((r) => r.json()).catch(() => []),
          fetch('/api/notes').then((r) => r.json()).catch(() => []),
        ]);

        if (!active) return;
        setCategories(Array.isArray(catsRes) ? catsRes : []);
        setDishes(Array.isArray(itemsRes) ? itemsRes : []);
        const orders = Array.isArray(ledgerRes) ? ledgerRes as LedgerEntry[] : [];
        seenOrderIds.current = new Set(orders.map((order) => String(order.id || order.order_id || '')).filter(Boolean));
        ordersLoaded.current = true;
        setLedger(orders);
        setNotes(Array.isArray(notesRes) ? notesRes : []);
        setStatus('success');
      } catch (err: any) {
        if (!active) return;
        console.error('Initial Telemetry Load Failed:', err);
        setErrorMessage(err.message || 'Unable to establish secure connection to the database.');
        setStatus('error');
      }
    }

    initialLoad();

    let eventSource: EventSource | null = null;
    const handlePushUpdate = () => {
      if (active) fetchGlobalTelemetry(true);
    };

    try {
      eventSource = new EventSource('/api/realtime');
      eventSource.addEventListener('ping', handlePushUpdate);
      eventSource.addEventListener('order', handlePushUpdate);
      eventSource.addEventListener('connected', () => setSseConnected(true));
      eventSource.onerror = () => setSseConnected(false);
    } catch (sseErr) {
      console.warn('SSE not available:', sseErr);
    }

    const pollInterval = setInterval(() => {
      if (active) fetchGlobalTelemetry(true);
    }, 45000);
    
    return () => { 
      active = false;
      setSseConnected(false);
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [fetchGlobalTelemetry]);

  useEffect(() => {
    if (status !== 'success') return;

    const channel = supabase
      .channel('admin-order-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
      }, (payload) => {
        const order = payload.new as LedgerEntry;
        const orderId = String(order.id || order.order_id || '');
        if (!orderId) return;

        if (ordersLoaded.current && !seenOrderIds.current.has(orderId) && Date.parse(order.created_at) >= sessionStartedAt.current - 60_000) {
          addOrderNotification(order);
        }
        seenOrderIds.current.add(orderId);
        setLedger((current) => current.some((entry) => String(entry.id) === orderId)
          ? current
          : [order, ...current]);
      })
      .subscribe((state) => setRealtimeConnected(state === 'SUBSCRIBED'));

    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [status, addOrderNotification]);

  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;
  const pendingOrdersCount = ledger.filter((o) => (o.status || 'pending') === 'pending').length;
  const pendingNotificationsCount = notifications.filter((n) => n.status === 'pending').length;
  const badgeCount = pendingNotificationsCount > 0 ? pendingNotificationsCount : unreadNotificationCount;
  const activeViewTitle = NAVIGATION.flatMap((group) => group.items).find((item) => item.id === view)?.label || 'Overview';
  const liveUpdatesAvailable = realtimeConnected || sseConnected;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = process.env.NEXT_PUBLIC_ADMIN_PIN || '779911';
    if (pinInput.trim() === correctPin || pinInput.trim() === '779911') {
      setIsLocked(false);
      setPinInput('');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleLogout = () => {
    setIsLocked(true);
  };

  return (
    <div
      suppressHydrationWarning
      className={`min-h-screen ${isLight ? 'bg-[#F5F2EB] text-[#1C1917]' : 'bg-[#09090B] text-white'} flex font-sans transition-colors duration-250`}
    >
      {/* MOBILE BACKDROP OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* PROFESSIONAL TRANSLUCENT GLASS SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 backdrop-blur-2xl ${
          isLight 
            ? 'bg-[#FAF7F2] border-[#E8E2D8] shadow-2xl shadow-stone-900/10' 
            : 'bg-black/45 border-white/10 shadow-2xl shadow-black/80'
        } border-r flex flex-col transition-all duration-300 ${
          desktopCollapsed ? 'w-20' : 'w-64'
        } ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div
          className={`h-16 flex items-center justify-between px-4 border-b ${
            isLight ? 'border-[#E8E2D8] bg-[#FAF7F2]' : 'border-white/5 bg-white/[0.02]'
          } overflow-hidden`}
        >
          <div className="flex items-center gap-3 min-w-max">
            <div 
              className="w-8 h-8 shrink-0 rounded-lg border flex items-center justify-center transition-colors shadow-sm"
              style={{ backgroundColor: themeConfig.light, borderColor: themeConfig.border, color: themeConfig.primary }}
            >
              <Crown className="w-4 h-4" />
            </div>
            {!desktopCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className={`font-serif text-sm font-black tracking-wide truncate ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
                  Sample Cloud Bakery
                </span>
                <span className="text-[9px] font-bold tracking-widest uppercase text-amber-500">
                  Cloud Kitchen
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setDesktopCollapsed(!desktopCollapsed)}
              className={`hidden lg:flex p-1.5 rounded-lg ${
                isLight ? 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFE9DF]' : 'text-gray-500 hover:text-white hover:bg-white/5'
              } transition-colors`}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`lg:hidden p-1.5 rounded-lg ${isLight ? 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#EFE9DF]' : 'text-gray-500 hover:text-white'} transition-colors`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar overflow-x-hidden">
          {NAVIGATION.map((navGroup) => (
            <div key={navGroup.group}>
              {!desktopCollapsed ? (
                <p className={`px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] mb-2 ${isLight ? 'text-[#78716C]' : 'text-gray-500'}`}>
                  {navGroup.group}
                </p>
              ) : (
                <div className={`w-full h-px ${isLight ? 'bg-[#E8E2D8]' : 'bg-white/5'} mb-3 my-2`} />
              )}
              <div className="space-y-1">
                {navGroup.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = view === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setView(item.id); setSidebarOpen(false); }}
                      title={desktopCollapsed ? item.label : undefined}
                      style={isActive ? { backgroundColor: themeConfig.light, color: themeConfig.primary } : {}}
                      className={`w-full flex items-center ${desktopCollapsed ? 'justify-center' : 'justify-start'} gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isActive 
                          ? 'font-black shadow-sm' 
                          : isLight
                            ? 'text-[#57534E] hover:bg-[#EFE9DF] hover:text-[#1C1917]'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon 
                        className="w-4 h-4 shrink-0" 
                        style={isActive ? { color: themeConfig.primary } : {}}
                      />
                      {!desktopCollapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`p-4 border-t ${isLight ? 'border-[#E8E2D8] bg-[#FAF7F2]' : 'border-white/5 bg-white/[0.02]'}`}>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider transition-colors"
            title="Lock Terminal"
          >
            <LogOut className="w-4 h-4 shrink-0" /> {!desktopCollapsed && 'Lock Terminal'}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 ${desktopCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        
        {/* HEADER BAR */}
        <header className={`h-16 shrink-0 ${isLight ? 'bg-[#FAF7F2]/95 border-[#E8E2D8] text-[#1C1917]' : 'bg-[#09090B]/80 border-white/5 text-white'} backdrop-blur-xl border-b px-3 sm:px-8 flex items-center justify-between z-30 transition-colors`}>
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl transition-colors shrink-0 ${isLight ? 'bg-[#EFE9DF] text-[#1C1917] hover:bg-[#E5DFD5]' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
              title="Open Navigation"
            >
              <MenuIcon className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <p className={`truncate text-sm font-bold ${isLight ? 'text-[#1C1917]' : 'text-gray-100'}`}>{activeViewTitle}</p>
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${liveUpdatesAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`truncate text-[10px] ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                  {liveUpdatesAvailable ? 'Live order updates' : 'Order refresh active'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick POS Trigger */}
            <button
              onClick={() => setView('ledger')}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider text-black transition-all shadow-sm hover:opacity-95"
              style={{ backgroundColor: themeConfig.primary }}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>New counter sale</span>
            </button>

            {/* Current Clock Time */}
            {currentTime && (
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono text-xs ${
                isLight ? 'border-[#E8E2D8] bg-[#F5F0E6] text-[#44403C]' : 'border-white/10 bg-white/5 text-gray-400'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{currentTime}</span>
              </div>
            )}

            {/* Telemetry Refresh */}
            <button
              onClick={() => fetchGlobalTelemetry(true)}
              className={`p-2 rounded-xl border transition-colors ${
                isLight ? 'border-[#E8E2D8] hover:bg-[#EFE9DF] text-[#44403C]' : 'border-white/10 hover:bg-white/5 text-gray-400'
              }`}
              title="Refresh Live Data"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  if (!notificationsOpen) markNotificationsRead();
                }}
                aria-label={badgeCount ? `Notifications, ${badgeCount} alerts` : 'Notifications'}
                aria-expanded={notificationsOpen}
                aria-controls="admin-notifications"
                className={`relative flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                  isLight ? 'border-[#E8E2D8] text-[#44403C] hover:bg-[#EFE9DF]' : 'border-white/10 text-gray-300 hover:bg-white/5'
                }`}
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {badgeCount > 0 && (
                  <span className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white ${
                    pendingOrdersCount > 0 ? 'bg-amber-500 animate-pulse ring-2 ring-amber-500/40' : 'bg-rose-500'
                  }`}>
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  id="admin-notifications"
                  className={`absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border shadow-2xl ${
                    isLight ? 'border-[#E8E2D8] bg-white text-[#1C1917]' : 'border-white/10 bg-[#151517] text-white'
                  }`}
                >
                  <div className={`flex items-center justify-between border-b px-4 py-3 ${isLight ? 'border-[#EEE8DF]' : 'border-white/10'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold">Order notifications</p>
                        {pendingOrdersCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {pendingOrdersCount} pending
                          </span>
                        )}
                      </div>
                      <p className={`mt-0.5 text-[10px] ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                        {pendingOrdersCount > 0 ? 'Accept or reject incoming orders below' : 'Checking for new orders regularly'}
                      </p>
                    </div>
                    {notifications.some((notification) => !notification.read) && (
                      <button
                        type="button"
                        onClick={markNotificationsRead}
                        className="text-[10px] font-semibold text-caramel-dark hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[min(65vh,26rem)] overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className={`px-4 py-8 text-center text-xs ${isLight ? 'text-[#78716C]' : 'text-gray-400'}`}>
                        <Bell className="mx-auto mb-2 h-5 w-5 opacity-50" aria-hidden="true" />
                        No order notifications at the moment.
                      </div>
                    ) : notifications.map((notification) => {
                      const linkedOrder = ledger.find(
                        (o) => o.id === notification.orderId || o.order_id === notification.orderId
                      );
                      const currentStatus = linkedOrder?.status || notification.status || 'pending';
                      const isPending = currentStatus === 'pending';

                      return (
                        <div
                          key={notification.orderId}
                          onClick={() => {
                            markNotificationRead(notification.orderId);
                            setNotificationsOpen(false);
                            setView('orders');
                            setSidebarOpen(false);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isPending
                              ? isLight
                                ? 'bg-[#FFFBEB] border-amber-300 hover:bg-[#FEF3C7]'
                                : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/15'
                              : isLight
                              ? 'bg-[#FAF7F2] border-[#E8E2D8] hover:bg-[#F5F0E6]'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 mr-1.5">
                                {notification.orderId.startsWith('#') ? notification.orderId : `#BK-${notification.orderId.slice(0, 4)}`}
                              </span>
                              <span className="text-xs font-bold truncate">
                                {notification.customerName}
                              </span>
                            </div>
                            <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 shrink-0">
                              ₹{notification.total.toLocaleString('en-IN')}
                            </span>
                          </div>

                          {notification.itemsSummary && (
                            <p className={`text-[11px] truncate mb-2 ${isLight ? 'text-[#57534E]' : 'text-gray-400'}`}>
                              {notification.itemsSummary}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                            <span>
                              {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isPending ? (
                              <span className="font-bold text-amber-500 animate-pulse">
                                ⏳ Awaiting Acceptance
                              </span>
                            ) : currentStatus === 'cancelled' ? (
                              <span className="font-bold text-rose-500 flex items-center gap-0.5">
                                <X className="w-2.5 h-2.5" /> Rejected
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-500 flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Confirmed
                              </span>
                            )}
                          </div>

                          {/* ACTION BUTTONS: Tick (✓) & Wrong (✕) */}
                          {isPending && (
                            <div
                              className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-black/5 dark:border-white/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(notification.orderId, 'cancelled')}
                                className="flex-1 py-1.5 px-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
                                title="Reject order (Wrong ✕)"
                              >
                                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Reject (✕)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(notification.orderId, 'completed')}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm shadow-emerald-500/20"
                                title="Accept order & confirm revenue (Tick ✓)"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>Accept (✓)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setView('orders'); setNotificationsOpen(false); }}
                      className={`w-full border-t px-4 py-3 text-left text-xs font-semibold text-caramel-dark ${isLight ? 'border-[#EEE8DF] hover:bg-[#F7F3EC]' : 'border-white/10 hover:bg-white/5'}`}
                    >
                      Open order history →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle */}
            <button
              onClick={toggleMode}
              className={`p-2 rounded-xl border transition-colors ${
                isLight ? 'border-[#E8E2D8] hover:bg-[#EFE9DF] text-[#44403C]' : 'border-white/10 hover:bg-white/5 text-gray-400'
              }`}
              title="Toggle Theme Mode"
            >
              {isLight ? <Moon className="w-4 h-4 text-[#B45309]" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Lock Button */}
            <button
              onClick={() => setIsLocked(true)}
              className={`p-2 rounded-xl border transition-colors ${
                isLight
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-[#92400E] border-amber-500/30'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20'
              }`}
              title="Lock Terminal"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-8 custom-scrollbar relative">
          {status === 'loading' && <DashboardSkeleton />}

          {status === 'error' && (
            <div className="h-full flex items-center justify-center">
              <div className={`max-w-md w-full p-8 rounded-3xl border text-center shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10'}`}>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className={`text-xl font-serif mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>Telemetry Offline</h2>
                <p className={`text-sm mb-8 leading-relaxed ${isLight ? 'text-slate-500' : 'text-gray-400'}`}>{errorMessage}</p>
                <button
                  onClick={() => fetchGlobalTelemetry(false)}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 w-full mx-auto"
                >
                  <RefreshCcw className="w-4 h-4" /> Attempt Reconnect
                </button>
              </div>
            </div>
          )}

          {status === 'success' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="h-full max-w-7xl mx-auto"
              >
                {view === 'overview' && (
                  <OverviewView 
                    dishes={dishes} 
                    ledger={ledger} 
                    categories={categories}
                    notes={notes}
                    onNavigateToTab={(tab) => setView(tab)}
                    inventoryTrackingEnabled={inventoryTrackingEnabled}
                  />
                )}
                {view === 'orders' && (
                  <OrdersHistoryView 
                    ledger={ledger} 
                    setLedger={setLedger} 
                  />
                )}
                {view === 'ledger' && (
                  <LedgerView 
                    dishes={dishes} 
                    categories={categories} 
                    ledger={ledger} 
                    setLedger={setLedger}
                  />
                )}
                {view === 'notes' && (
                  <NotesView 
                    notes={notes} 
                    setNotes={setNotes} 
                    onRefresh={() => fetchGlobalTelemetry(true)} 
                  />
                )}
                {view === 'inventory' && (
                  <InventoryView
                    dishes={dishes}
                    setDishes={setDishes}
                    categories={categories}
                    onRefresh={() => fetchGlobalTelemetry(true)}
                    inventoryTrackingEnabled={inventoryTrackingEnabled}
                    onToggleInventoryTracking={handleToggleInventoryTracking}
                    onNavigateToSettings={() => setView('settings')}
                  />
                )}
                {view === 'menu' && (
                  <MenuView 
                    dishes={dishes} 
                    categories={categories} 
                    setDishes={setDishes}
                  />
                )}
                {view === 'structure' && (
                  <StructureView 
                    categories={categories} 
                    setCategories={setCategories} 
                    dishes={dishes} 
                  />
                )}
                {view === 'settings' && (
                  <SettingsView 
                    inventoryTrackingEnabled={inventoryTrackingEnabled}
                    onToggleInventoryTracking={handleToggleInventoryTracking}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* PIN LOCK OVERLAY */}
      {isLocked && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className={`max-w-sm w-full rounded-3xl p-8 border text-center shadow-2xl ${isLight ? 'bg-white border-slate-200' : 'bg-[#121214] border-white/10 text-white'}`}>
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4 text-amber-500">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-serif text-xl font-bold mb-1">Terminal Locked</h2>
            <p className="text-xs text-gray-400 mb-6">Enter Admin PIN to unlock bakery command center</p>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  maxLength={6}
                  placeholder="PIN: 779911"
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                  className={`${inputCls(isLight)} text-center text-lg tracking-[0.3em] font-mono`}
                />
              </div>

              {pinError && (
                <p className="text-xs text-red-400 font-medium">Incorrect PIN. Try again.</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
              >
                Unlock Terminal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const emptySubscribe = () => () => {};

export default function AdminPageWrapper() {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#09090B] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-400 font-mono tracking-wider uppercase">Loading Sample Cloud Bakery / Cloud Kitchen...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AdminCommandCenter />
    </ThemeProvider>
  );
}
