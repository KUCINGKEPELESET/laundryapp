import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const StaffLogin = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const isEmail = username.includes('@');
            const email = isEmail ? username : `${username.toLowerCase()}@laundrystaff.com`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/staff/dashboard');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-100 dark:bg-slate-900 font-display text-slate-900 dark:text-white min-h-screen flex items-center justify-center p-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-primary text-3xl">badge</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white">Staff Portal</h1>
                    <p className="text-slate-500 font-medium mt-1">Please log in to continue</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Username or Email</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-slate-400 material-symbols-outlined select-none">person</span>
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value.trim())}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl py-4 pl-12 pr-4 text-base font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                placeholder="Username or Verified Email"
                            />
                        </div>
                    </div>
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                        <div className="relative flex items-center">
                            <span className="absolute left-4 text-slate-400 material-symbols-outlined select-none">lock</span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-xl py-4 pl-12 pr-4 text-base font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl py-4 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-4 disabled:opacity-70"
                    >
                        <span>{loading ? 'Verifying...' : 'Access Dashboard'}</span>
                        {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StaffLogin;
