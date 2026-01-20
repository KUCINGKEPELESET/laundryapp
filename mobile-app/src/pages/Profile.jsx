import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [saveStatus, setSaveStatus] = useState('Save');

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUser(user);

            // Fetch Profile Data
            const { data: profile } = await supabase
                .from('profiles')
                .select('phone, address')
                .eq('id', user.id)
                .single();

            if (profile) {
                setPhone(profile.phone || '');
                setAddress(profile.address || '');
            } else {
                // Determine if we need to load from localstorage as migration?
                // For now, assume empty.
            }

            setLoading(false);
        };
        checkAuth();
    }, [navigate]);

    const handleSave = async () => {
        setSaveStatus('Saving...');

        const { error } = await supabase
            .from('profiles')
            .update({
                phone,
                address,
                updated_at: new Date()
            })
            .eq('id', user.id);

        if (error) {
            console.error(error);
            setSaveStatus('Error');
            alert("Failed to save profile: " + error.message);
        } else {
            setSaveStatus('Saved!');
            setTimeout(() => setSaveStatus('Save'), 2000);
        }
    };

    const handleLogout = async () => {
        if (window.confirm("Are you sure you want to log out?")) {
            await supabase.auth.signOut();
            navigate('/login');
        }
    };

    const handleResetPassword = async () => {
        if (user && user.email) {
            try {
                const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                if (error) throw error;
                alert('Password reset email sent to ' + user.email);
            } catch (error) {
                alert('Error: ' + error.message);
            }
        }
    };

    if (loading) return null;

    const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div className="bg-gray-100 dark:bg-gray-900 font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden flex justify-center items-center min-h-screen">
            <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background-light dark:bg-gray-900 sm:rounded-3xl sm:h-[calc(100vh-2rem)] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 bg-white dark:bg-gray-900 z-10">
                    <h1 className="text-2xl font-bold">Profile</h1>
                    <button onClick={handleSave} className="text-primary font-bold text-sm">{saveStatus}</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* User Info Card */}
                    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                            {initial}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{displayName}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                    </div>

                    {/* Editable Details */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Contact Info</h3>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">call</span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 focus:ring-primary focus:border-primary"
                                    placeholder="+62 812 3456 7890"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Saved Address</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400 material-symbols-outlined text-[20px]">location_on</span>
                                <textarea
                                    rows="3"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 focus:ring-primary focus:border-primary"
                                    placeholder="Jl. Sudirman No..."
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Security Actions */}
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <h3 className="text-sm font-bold uppercase text-slate-400 tracking-wider">Account Security</h3>

                        <button onClick={handleResetPassword} className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border border-slate-100 dark:border-slate-700">
                            <span className="font-medium">Change Password</span>
                            <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                        </button>
                    </div>

                    {/* Logout */}
                    <button onClick={handleLogout} className="w-full mt-8 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors">
                        Log Out
                    </button>
                </div>

                {/* Bottom Navigation */}
                <nav className="shrink-0 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-slate-800 py-3 px-6 pb-8">
                    <div className="flex justify-around items-end">
                        <Link to="/dashboard" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">home</span>
                            <span className="text-[10px] font-medium">Home</span>
                        </Link>
                        <Link to="/orders" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">receipt_long</span>
                            <span className="text-[10px] font-medium">Orders</span>
                        </Link>
                        <Link to="/wallet" className="flex flex-col items-center justify-center w-full gap-1 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                            <span className="text-[10px] font-medium">Wallet</span>
                        </Link>
                        <button className="flex flex-col items-center justify-center w-full gap-1 text-primary">
                            <span className="material-symbols-outlined fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                            <span className="text-[10px] font-bold">Profile</span>
                        </button>
                    </div>
                </nav>

            </div>
        </div>
    );
};

export default Profile;
