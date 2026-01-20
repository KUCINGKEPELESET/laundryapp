import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Wallet = () => {
    const navigate = useNavigate();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [customAmount, setCustomAmount] = useState('');

    const [debugUserId, setDebugUserId] = useState(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setDebugUserId(user?.id);
            if (user) fetchWalletData(user.id);
        };
        init();

        // Realtime Subscription
        const channel = supabase
            .channel('wallet_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                },
                (payload) => {
                    // Refresh if our profile changed
                    const currentUserId = supabase.auth.getUser()?.data?.user?.id;
                    if (payload.new && payload.new.id === (currentUserId || payload.new.id)) {
                        if (currentUserId) fetchWalletData(currentUserId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchWalletData = async (userId) => {
        if (!userId) return;

        // Fetch Profile for Balance
        const { data: profile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();

        if (profile) setBalance(profile.balance);

        // Fetch Transactions
        const { data: txs } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (txs) setTransactions(txs);
        setLoading(false);
    };

    const handleTopUp = async () => {
        const amount = customAmount ? parseInt(customAmount) : (topUpAmount ? parseInt(topUpAmount) : 0);
        if (!amount || amount < 10000) {
            alert("Minimum top up is Rp 10.000");
            return;
        }

        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            // Call Supabase Edge Function to Create Invoice
            const { data, error } = await supabase.functions.invoke('create-payment', {
                body: {
                    amount: amount,
                    user_id: user.id,
                    email: user.email,
                    type: 'TOPUP',
                    redirect_url: window.location.origin + '/wallet'
                }
            });

            if (error) throw error;

            // Backend now returns 200 for logical errors too, check success flag
            if (!data.success) {
                throw new Error(data.message || "Unknown Backend Error");
            }

            if (data && data.invoice_url) {
                // Redirect to Xendit
                window.location.href = data.invoice_url;
            } else {
                throw new Error("No invoice URL returned");
            }

        } catch (error) {
            console.error("Topup error:", error);
            // Attempt to show more detail if available
            const msg = error.message || "Unknown error";
            alert(`Top Up failed: ${msg}. Check console for details (often missing Secrets).`);
        } finally {
            setLoading(false);
        }
    };

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen text-[#0c1b1d] dark:text-gray-100 flex justify-center w-full font-display">
            <div className="relative flex h-full min-h-screen w-full max-w-md flex-col overflow-x-hidden bg-background-light dark:bg-background-dark shadow-2xl">
                {/* Header */}
                <header className="sticky top-0 z-50 flex items-center justify-between bg-background-light/90 dark:bg-background-dark/90 px-4 py-4 backdrop-blur-md">
                    <button onClick={() => navigate('/dashboard')} className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-slate-800 dark:text-white">
                        <span className="material-symbols-outlined text-2xl">arrow_back</span>
                    </button>
                    <h2 className="flex-1 text-center text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">My Wallet</h2>
                    <div className="size-10"></div>
                </header>

                {/* Main Content */}
                <main className="flex-1 px-5 pb-8">
                    {/* Balance Card */}
                    <div className="relative mt-2 overflow-hidden rounded-2xl bg-primary p-8 shadow-xl shadow-primary/20 transition-transform active:scale-[0.98]">
                        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                        <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl"></div>
                        <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
                            <p className="text-sm font-medium uppercase tracking-widest text-teal-100 opacity-90">Available Balance</p>
                            <div className="flex items-baseline">
                                <span className="text-3xl font-bold text-white opacity-60 mr-1">Rp</span>
                                <h1 className="text-5xl font-extrabold tracking-tighter text-white">{balance.toLocaleString('id-ID')}</h1>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 backdrop-blur-sm">
                                <span className="material-symbols-outlined text-[16px] text-teal-100">verified_user</span>
                                <span className="text-xs font-medium text-teal-50">Secure Wallet</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Up Section */}
                    <div className="mt-8">
                        <h3 className="mb-4 text-xl font-bold tracking-tight text-slate-900 dark:text-white">Add Funds</h3>
                        <div className="mb-5 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                            {[20000, 50000, 100000].map(amt => (
                                <button
                                    key={amt}
                                    onClick={() => { setTopUpAmount(amt); setCustomAmount(''); }}
                                    className={`flex h-12 min-w-[80px] flex-1 items-center justify-center rounded-xl border-2 px-4 transition-all active:scale-95 ${topUpAmount === amt ? 'border-primary bg-primary text-white shadow-md' : 'border-transparent bg-surface-light dark:bg-surface-dark text-slate-700 dark:text-gray-200 hover:border-primary/30'}`}
                                >
                                    <span className="font-bold">{amt / 1000}k</span>
                                </button>
                            ))}
                        </div>

                        {/* Custom Input */}
                        <div className="relative mb-6">
                            <label className="sr-only" htmlFor="amount">Custom Amount</label>
                            <div className="group flex items-center rounded-xl border-2 border-surface-light bg-background-light px-4 py-3 transition-colors focus-within:border-primary dark:border-surface-dark dark:bg-background-dark">
                                <span className="material-symbols-outlined mr-3 text-slate-400 group-focus-within:text-primary">attach_money</span>
                                <input
                                    className="w-full border-none bg-transparent p-0 text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:ring-0 dark:text-white"
                                    id="amount"
                                    placeholder="Enter custom amount..."
                                    type="number"
                                    value={customAmount}
                                    onChange={(e) => { setCustomAmount(e.target.value); setTopUpAmount(''); }}
                                />
                            </div>
                        </div>

                        {/* Payment Method - Purely Visual for now as Xendit handles methods */}
                        <div className="mb-6 rounded-xl bg-surface-light p-4 dark:bg-surface-dark">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-700 shadow-sm">
                                        <span className="material-symbols-outlined text-slate-900 dark:text-white">payments</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Powered by</span>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Xendit</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleTopUp}
                            disabled={loading}
                            className="group relative w-full overflow-hidden rounded-xl bg-primary py-4 text-center font-bold text-white shadow-lg shadow-primary/25 transition-transform active:scale-[0.98] disabled:opacity-70"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                {loading ? 'Processing...' : 'Top Up Now'}
                                {!loading && <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>}
                            </span>
                        </button>
                    </div>

                    {/* Transaction History */}
                    <div className="mt-10">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Recent Activity</h3>
                            <button className="text-sm font-medium text-primary hover:underline">View All</button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {transactions.length === 0 ? (
                                <p className="text-center text-slate-400 py-4">No transactions yet.</p>
                            ) : (
                                transactions.map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-surface-dark">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${tx.type === 'TOPUP' ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'}`}>
                                                <span className="material-symbols-outlined">
                                                    {tx.type === 'TOPUP' ? 'account_balance_wallet' : 'dry_cleaning'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white">
                                                    {tx.type === 'TOPUP' ? 'Wallet Top Up' : 'Payment'}
                                                </p>
                                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    {new Date(tx.created_at).toLocaleDateString()} • {tx.status}
                                                </p>
                                            </div>
                                        </div>
                                        <p className={`font-bold ${tx.type === 'TOPUP' ? 'text-primary dark:text-teal-400' : 'text-slate-900 dark:text-white'}`}>
                                            {tx.type === 'TOPUP' ? '+' : '-'}{formatIDR(tx.amount)}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
                <div className="h-6 w-full bg-background-light dark:bg-background-dark"></div>
            </div>
            <style>{`
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

export default Wallet;
