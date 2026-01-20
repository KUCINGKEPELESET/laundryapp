import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const StaffDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const checkStaff = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/staff/login'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'staff' && profile?.role !== 'admin') {
                // Admins can also view staff dashboard if needed, or restrict strictly. 
                // Let's allow admins for testing.
                alert("Unauthorized Access");
                await supabase.auth.signOut();
                navigate('/staff/login');
            } else {
                setProfile(profile);
                setLoading(false);
            }
        };
        checkStaff();
    }, [navigate]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/staff/login');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Loading Staff Portal...</div>;

    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-display text-slate-900 dark:text-white">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 shadow-sm p-4 sticky top-0 z-10">
                <div className="flex justify-between items-center max-w-5xl mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined">badge</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-black leading-tight">Staff Portal</h1>
                            <p className="text-xs text-slate-500 font-bold">{profile?.full_name}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6">

                {/* Greeting Card */}
                <div className="bg-gradient-to-r from-primary to-teal-600 rounded-3xl p-8 text-white shadow-lg shadow-primary/20 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-primary-light font-bold mb-1 opacity-80">{formattedDate}</p>
                        <h2 className="text-3xl font-black mb-4">Good Morning, {profile?.username || 'Staff'}!</h2>
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                            <span className="material-symbols-outlined text-white">schedule</span>
                            <span className="font-bold font-mono text-xl">{formattedTime}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (Future Features: Clock In, Salary) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* App Access based on Permissions */}
                    {(profile?.permissions?.includes('cashier') || profile?.role === 'admin') && (
                        <button onClick={() => navigate('/merchant')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 group transition-all text-left">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">storefront</span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">Merchant App</h3>
                            <p className="text-xs text-slate-400">POS & Orders</p>
                        </button>
                    )}

                    {(profile?.permissions?.includes('production') || profile?.role === 'admin') && (
                        <button onClick={() => navigate('/production')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 group transition-all text-left">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">factory</span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">Production App</h3>
                            <p className="text-xs text-slate-400">Workflow & Tasks</p>
                        </button>
                    )}

                    {(profile?.permissions?.includes('driver') || profile?.role === 'admin') && (
                        <button onClick={() => navigate('/driver')} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 group transition-all text-left">
                            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined">local_shipping</span>
                            </div>
                            <h3 className="font-bold text-lg mb-1">Driver App</h3>
                            <p className="text-xs text-slate-400">Deliveries</p>
                        </button>
                    )}

                    <button className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 group transition-all text-left">
                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">how_to_reg</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">Clock In</h3>
                        <p className="text-xs text-slate-400">Start your shift</p>
                    </button>

                    <button className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-primary/50 group transition-all text-left">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">My Salary</h3>
                        <p className="text-xs text-slate-400">View earnings</p>
                    </button>
                </div>

            </main>
        </div>
    );
};

export default StaffDashboard;
