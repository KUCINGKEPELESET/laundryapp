import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/dashboard');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                    redirectTo: window.location.origin,
                },
            });
            if (error) throw error;
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-[#0c1b1d] dark:text-white antialiased selection:bg-primary/30 min-h-screen flex flex-col">
            {/* Hero / Header Section */}
            <div className="relative w-full h-[38vh] min-h-[300px] bg-primary/10 organic-header overflow-hidden shadow-sm shrink-0 z-0" style={{ borderBottomLeftRadius: '2.5rem', borderBottomRightRadius: '2.5rem' }}>
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-center bg-cover transition-transform duration-700 hover:scale-105"
                    style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD4H9rSuJRkimBZKSeAOoZZuhAMQG1DxyYqWgbuOBCwZhmDtp_Bo_e1wpD00Eld45lgoUpWriPHOc_FuGCs9URGwjbuYPlIF7rPnWGAar-yv3WQqL-0h7RLCtiCAjzRGIxJk67R_iTG25kwf_XRdD4Dn45XW-aeC0E4DyiYCaWv_JezV1XR3jUL_SJ8gLE7CGU_42f_6ZSgoMSB_ntyzIvLfO0NWfl1CwHx1I2maAgWbWnbCLOf6OoTjogAPR-tTmUt87Ej4ndlDUyW')" }}
                ></div>
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/80 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#004d56] via-transparent to-transparent opacity-90"></div>
                {/* Brand Elements */}
                <div className="absolute top-0 left-0 w-full p-6 pt-12 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                            <span className="material-symbols-outlined text-white text-[22px]">local_laundry_service</span>
                        </div>
                        <span className="text-white font-bold text-lg tracking-tight drop-shadow-md">Launder.</span>
                    </div>
                </div>
                {/* Hero Headline */}
                <div className="absolute bottom-10 left-0 w-full px-8">
                    <h1 className="text-white text-[32px] leading-tight font-extrabold tracking-tight drop-shadow-sm mb-1">
                        Clean clothes,<br />zero stress.
                    </h1>
                    <p className="text-white/80 text-sm font-medium">Your premium laundry concierge.</p>
                </div>
            </div>

            {/* Login Form Card */}
            <div className="flex-1 flex flex-col px-5 -mt-6 relative z-10 w-full max-w-md mx-auto">
                <div className="bg-white dark:bg-[#232c33] rounded-3xl p-6 pt-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-100 dark:border-slate-700/50">
                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        {/* Email Input */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Email Address</label>
                            <div className="relative flex items-center transition-transform duration-200 focus-within:scale-[1.01]">
                                <span className="absolute left-4 text-primary/70 material-symbols-outlined select-none" style={{ fontSize: '20px' }}>mail</span>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-input-bg dark:bg-slate-800 dark:text-white border-none rounded-xl py-4 pl-12 pr-4 text-base font-medium placeholder:text-primary-light focus:ring-2 focus:ring-primary/50 focus:bg-[#edf7f8] dark:focus:bg-slate-700 h-14 outline-none transition-all ring-0"
                                    placeholder="hello@example.com"
                                />
                            </div>
                        </div>
                        {/* Password Input */}
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Password</label>
                            <div className="relative flex items-center transition-transform duration-200 focus-within:scale-[1.01]">
                                <span className="absolute left-4 text-primary/70 material-symbols-outlined select-none" style={{ fontSize: '20px' }}>lock</span>
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-input-bg dark:bg-slate-800 dark:text-white border-none rounded-xl py-4 pl-12 pr-12 text-base font-medium placeholder:text-primary-light focus:ring-2 focus:ring-primary/50 focus:bg-[#edf7f8] dark:focus:bg-slate-700 h-14 outline-none transition-all ring-0"
                                    placeholder="••••••••"
                                />
                                <button type="button" className="absolute right-4 text-primary-light hover:text-primary transition-colors flex items-center justify-center rounded-full p-1 hover:bg-white/50">
                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>visibility</span>
                                </button>
                            </div>
                        </div>
                        {/* Forgot Password Link */}
                        <div className="flex justify-end -mt-1">
                            <a href="#" className="text-sm font-semibold text-primary/80 hover:text-primary transition-colors decoration-primary/30 underline-offset-4 hover:underline">Forgot Password?</a>
                        </div>
                        {/* Primary Action Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="group w-full bg-primary hover:bg-[#005a63] text-white font-bold text-lg rounded-2xl py-4 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
                        >
                            <span>{loading ? 'Logging in...' : 'Log In'}</span>
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                    </form>
                </div>

                {/* Social & Registration Footer */}
                <div className="flex flex-col gap-6 items-center py-8">
                    <div className="relative w-full text-center px-4">
                        <div aria-hidden="true" className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-background-light dark:bg-background-dark px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                        </div>
                    </div>
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full bg-white dark:bg-transparent border border-slate-200 dark:border-slate-600 rounded-2xl py-3.5 flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm active:scale-[0.99]"
                    >
                        <img
                            alt="Google Logo"
                            className="w-5 h-5"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBc9Xv1DtVvyb_r47amzX6gTA0_UPy456O46_XVq7B_Q-3pTJgp87Ybb0v4-xLi_3IJsMZ7VEDVzOR2G0Dx7MT-98-bf7lOqYSvjRPCPCWl4HxxfZDVjy19tUhqkqMroNBHxalGpVufKYldvJhGtMglfeSCzF3ushex5_c_J_x-nqW9n2cRxwQhE8pv_V1kmJA8Ut7XV0QzxtZ3bU6G0UTfs52oDUr1zrp3sHUCsWqLYkU6oepPr8uXeAvkU8Sn2Ci0nwrmfbzrzVpK"
                        />
                        <span className="text-slate-700 dark:text-slate-200 font-bold text-base">Continue with Google</span>
                    </button>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        New here?
                        <Link to="/signup" className="text-primary font-extrabold hover:text-[#005a63] ml-1 transition-colors">Create an Account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
