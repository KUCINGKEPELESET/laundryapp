import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Orders = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('active');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUser(user);
            fetchOrders(user.id);
        };
        init();
    }, [navigate]);

    const fetchOrders = async (userId) => {
        setLoading(true);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) console.error(error);
        else setOrders(data || []);
        setLoading(false);
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

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const filteredOrders = orders.filter(o => {
        const isCompleted = o.status === 'Completed' || o.status === 'Cancelled';
        return activeTab === 'active' ? !isCompleted : isCompleted;
    });

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden flex justify-center items-center min-h-screen">
            <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background-light dark:bg-background-dark sm:rounded-3xl sm:h-[calc(100vh-2rem)] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 bg-background-light dark:bg-background-dark z-10 sticky top-0">
                    <h1 className="text-2xl font-bold">My Orders</h1>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <span className="material-symbols-outlined">search</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-6 pb-2 bg-background-light dark:bg-background-dark z-10">
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'active' ? 'shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'history' ? 'shadow-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            History
                        </button>
                    </div>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4 pb-24">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <p className="text-sm">Loading...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <span className="material-symbols-outlined text-4xl mb-2">receipt</span>
                            <p className="text-sm">No {activeTab} orders found.</p>
                        </div>
                    ) : (
                        filteredOrders.map(order => (
                            <div
                                key={order.id}
                                onClick={() => navigate(`/tracking/${order.id}`)}
                                className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white dark:bg-surface-dark dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <span className="material-symbols-outlined">{getIcon(order.status)}</span>
                                        </div>
                                        <div>
                                            <p className="text-slate-900 dark:text-white text-base font-bold">Order #{order.id.slice(0, 8)}</p>
                                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{order.schedule}</p>
                                        </div>
                                    </div>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-700 pt-3 mt-1">
                                    <span className="text-xs font-bold text-slate-500">{order.service}</span>
                                    <span className="font-bold text-primary">{formatIDR(order.total || 0)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Bottom Navigation */}
                <nav className="absolute bottom-6 left-6 right-6 rounded-2xl glass-nav py-3 z-30 border border-slate-200 dark:border-slate-800 shadow-xl">
                    <div className="flex justify-around items-end h-16 px-2">
                        <Link to="/dashboard" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 dark:text-slate-500 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">home</span>
                            <span className="text-[10px] font-medium">Home</span>
                        </Link>
                        <button className="flex flex-col items-center justify-center w-full gap-1 text-primary">
                            <span className="material-symbols-outlined fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
                            <span className="text-[10px] font-bold">Orders</span>
                        </button>
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
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default Orders;
