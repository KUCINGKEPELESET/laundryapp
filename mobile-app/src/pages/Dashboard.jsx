import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUser(user);
            fetchOrders(user.id);
            fetchBalance(user.id);
        };

        checkAuth();

        // Optional: polling
        const interval = setInterval(async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) fetchOrders(user.id);
        }, 10000);

        return () => clearInterval(interval);
    }, [navigate]);

    const fetchOrders = async (userId) => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'Completed')
            .neq('status', 'Cancelled')
            .order('created_at', { ascending: false })
            .limit(2);

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            setOrders(data || []);
        }
        setLoading(false);
    };

    const fetchBalance = async (userId) => {
        const { data } = await supabase.from('profiles').select('balance, role, full_name, email').eq('id', userId).single();
        if (data) {
            setBalance(data.balance);
            // Enhance user object with profile data for role check
            setUser(prev => ({ ...prev, ...data }));
        }
    };

    const getProgress = (status) => {
        const map = {
            'Pending Payment': 5,
            'Paid': 10,
            'Request Received': 15,
            'Pickup Assigned': 20,
            'Washing': 35,
            'Drying': 50,
            'Ironing': 65,
            'Ironing/Folding': 65,
            'Packing': 80,
            'Ready for Delivery': 90,
            'Out for Delivery': 95,
            'Completed': 100
        };
        return map[status] || 15;
    };

    const getStatusColor = (status) => {
        if (status === 'Completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        if (status === 'Ready for Delivery') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
        if (status === 'Out for Delivery') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
        if (status === 'Pending Payment') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        return 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
    };

    const getIcon = (status) => {
        if (status === 'Completed') return 'check_circle';
        if (status === 'Out for Delivery') return 'local_shipping';
        if (['Washing', 'Drying', 'Ironing', 'Ironing/Folding', 'Packing', 'Ready for Delivery'].includes(status)) return 'local_laundry_service';
        if (status === 'Request Received' || status === 'Paid') return 'receipt_long';
        return 'water_drop';
    };

    const displayName = user ? (user.user_metadata?.full_name || user.email.split('@')[0]) : 'User';
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

    return (
        <div className="bg-gray-100 flex justify-center items-center min-h-screen font-display antialiased selection:bg-primary selection:text-white">
            {/* Phone Container */}
            <div className="relative flex h-[100dvh] w-full max-w-md flex-col bg-background-light dark:bg-background-dark overflow-hidden shadow-2xl sm:rounded-3xl sm:my-8 sm:h-[calc(100vh-4rem)]">
                {/* Status Bar Area */}
                <div className="h-12 w-full shrink-0 bg-transparent"></div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto hide-scrollbar pb-24">
                    {/* Header */}
                    <header className="px-6 py-2 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Tuesday, 14 Oct</p>
                            <h1 className="text-slate-900 dark:text-white text-2xl font-extrabold tracking-tight">Hello, {formattedName}</h1>
                        </div>
                        <button className="relative p-2 rounded-full hover:bg-surface-light dark:hover:bg-surface-dark transition-colors group">
                            <span className="material-symbols-outlined text-slate-900 dark:text-white" style={{ fontSize: '28px' }}>notifications</span>
                            <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-accent-blush border-2 border-background-light dark:border-background-dark"></span>
                        </button>
                    </header>

                    {/* Wallet Card */}
                    <section className="px-6 mt-6">
                        <div className="relative overflow-hidden rounded-2xl bg-[#e6f3f4] dark:bg-surface-dark p-6 shadow-soft">
                            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl"></div>
                            <div className="relative z-10 flex flex-col gap-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-primary-light dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1">Total Balance</p>
                                        <h2 className="text-slate-900 dark:text-white text-4xl font-bold tracking-tight">
                                            {loading ? '...' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(balance)}
                                        </h2>
                                    </div>
                                    <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm">
                                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '24px' }}>account_balance_wallet</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-white h-12 text-sm font-bold shadow-glow hover:bg-primary/90 transition-colors">
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
                                        Top Up
                                    </button>
                                    <Link to="/wallet" className="h-12 w-12 flex items-center justify-center rounded-xl border border-primary/20 text-primary dark:text-white hover:bg-primary/5 transition-colors">
                                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Quick Action: New Order */}
                    <section className="px-6 mt-8">
                        <Link to="/new-order" className="group relative block w-full overflow-hidden rounded-2xl bg-slate-900 dark:bg-white p-1 shadow-lg transition-transform active:scale-[0.98]">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                            <div className="flex h-16 items-center justify-between rounded-xl px-6">
                                <div className="flex flex-col items-start">
                                    <span className="text-lg font-bold text-white dark:text-slate-900">New Laundry Order</span>
                                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Pickup available today</span>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                                    <span className="material-symbols-outlined">local_laundry_service</span>
                                </div>
                            </div>
                        </Link>
                    </section>

                    {/* Active Orders Section */}
                    <section className="mt-10">
                        <div className="flex items-center justify-between px-6 mb-4">
                            <h3 className="text-slate-900 dark:text-white text-lg font-bold">In Progress</h3>
                            <Link to="/orders" className="text-primary text-sm font-semibold">See All</Link>
                        </div>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="px-6 flex flex-col items-center justify-center py-6 text-slate-400">
                                    <p className="text-xs">Loading orders...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="px-6 flex flex-col items-center justify-center py-6 text-slate-400">
                                    <span className="material-symbols-outlined mb-2">local_laundry_service</span>
                                    <p className="text-xs">No active orders</p>
                                </div>
                            ) : (
                                orders.map(order => {
                                    const progress = getProgress(order.status);
                                    const icon = getIcon(order.status);

                                    return (
                                        <Link to={`/tracking/${order.id}`} key={order.id} className="block px-6 cursor-pointer">
                                            <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white dark:bg-surface-dark dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex gap-4">
                                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                            <span className="material-symbols-outlined">{icon}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-900 dark:text-white text-base font-bold">Order #{order.id.slice(0, 8)}...</p>
                                                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{order.service} • {order.status}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusColor(order.status)}`}>{order.status}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-xs font-medium text-slate-400">
                                                        <span>Progress</span>
                                                        <span className="text-primary">{progress}%</span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* Subscription Status & Promotions (Static mostly) */}
                    <section className="mt-10 px-6">
                        <div className="relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-black p-5 text-white">
                            <div className="absolute right-0 top-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 opacity-20 blur-2xl"></div>
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-yellow-400" style={{ fontSize: '20px' }}>workspace_premium</span>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-yellow-400">Gold Member</h3>
                                    </div>
                                    <p className="text-2xl font-bold">12 lbs</p>
                                    <p className="text-xs text-slate-400">Remaining allowance this month</p>
                                </div>
                                <div className="h-14 w-14 rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                                    <span className="text-xs font-bold">75%</span>
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                                        <path className="text-yellow-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="75, 100" strokeWidth="4"></path>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="mt-10 mb-6">
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold px-6 mb-4">Special Offers</h3>
                        <div className="flex gap-4 overflow-x-auto px-6 pb-4 hide-scrollbar snap-x snap-mandatory">
                            <div className="snap-center shrink-0 w-[280px] rounded-2xl bg-white dark:bg-surface-dark shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col">
                                <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBKxwosZvnUp7JIJcrCU9Q1MeAsI-ydh8QWnHCIiUZYHHf0J5UED6rWtZUevOTeesrB4DBg7IRp01DBl1bXhekH2EFp323eJ2_Ssh12czujmNn5Kq1A9f-J3AtTzsouakDWJXvEOtyTaPRO8TOqlHK2_-n661H7RoN3gLeDGH0Z0G_lNMD--zz6DO763FU2o24qZC2U5lZ-O9SplMqi6gT09OJsuB5xHAWHDe6ef3pFPXeSElZLLEPWBtpMzmpYT9z7c-TrLG1RVoqx')" }}></div>
                                <div className="p-4">
                                    <span className="inline-block px-2 py-1 rounded bg-accent-blush/20 text-orange-600 text-[10px] font-bold uppercase tracking-wide mb-2">New Customer</span>
                                    <h4 className="text-slate-900 dark:text-white font-bold text-base leading-tight mb-1">Get $10 Off Dry Cleaning</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Use code FIRSTDRY10 at checkout.</p>
                                </div>
                            </div>
                            <div className="snap-center shrink-0 w-[280px] rounded-2xl bg-white dark:bg-surface-dark shadow-sm overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col">
                                <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD64VWmin4srbMQ_suu_31gllUM7IEOMsjVwyQTAO5s82UUnBsCMfAF1WskuaOmF8IPysKHjGHlhiyh-_FItvLlEz1Rs_9EXshRsmneDXkG3HX9h6g-wEUnfMfj2_kSbhQMtbNAJRA5NXcWk_NOgxkumQ_Ws_RPiAhTOcEW47P53F_NBzJfAcmKZcaykjb80c-LHfFRn2gsxFxkGT0ld-C75iqU77gN2I_zEOfL6PVhRb3eZIkuqJhHxdi-LMi2aX8EceRothy6F3TB')" }}></div>
                                <div className="p-4">
                                    <span className="inline-block px-2 py-1 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wide mb-2">Seasonal</span>
                                    <h4 className="text-slate-900 dark:text-white font-bold text-base leading-tight mb-1">Spring Cleaning Bundle</h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs">Refresh your curtains and linens.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-6 left-6 right-6 rounded-2xl glass-nav py-3 z-30 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="flex justify-around items-end h-16 px-2">
                        <button className="flex flex-col items-center justify-center w-full gap-1 text-primary">
                            <span className="material-symbols-outlined fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
                            <span className="text-[10px] font-bold">Home</span>
                        </button>
                        <Link to="/orders" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">receipt_long</span>
                            <span className="text-[10px] font-medium">Orders</span>
                        </Link>
                        <Link to="/wallet" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                            <span className="text-[10px] font-medium">Wallet</span>
                        </Link>
                        <Link to="/profile" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">person</span>
                            <span className="text-[10px] font-medium">Profile</span>
                        </Link>
                    </div>
                </nav>

                {/* iOS Home Indicator */}
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-slate-900/20 dark:bg-white/20 rounded-full"></div>
            </div>

            <style>{`
                .glass-nav {
                    background: rgba(252, 253, 253, 0.85);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                .dark .glass-nav {
                    background: rgba(26, 33, 40, 0.85);
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
