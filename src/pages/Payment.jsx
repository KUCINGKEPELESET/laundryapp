import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Payment = () => {
    const navigate = useNavigate();
    const [draft, setDraft] = useState(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const loadDraft = () => {
            try {
                const data = localStorage.getItem('currentOrderDraft');
                if (data) {
                    setDraft(JSON.parse(data));
                } else {
                    // navigate('/dashboard'); 
                    // Commented out to allow viewing empty state if needed during dev, but normally redirect
                }
            } catch (e) {
                console.error("Draft parse error", e);
            }
        };
        loadDraft();
    }, [navigate]);

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const [paymentMethod, setPaymentMethod] = useState('xendit');
    const [walletBalance, setWalletBalance] = useState(null);

    // Fetch wallet balance
    useEffect(() => {
        const fetchBalance = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
                setWalletBalance(data ? data.balance : 0);
            }
        };
        fetchBalance();
    }, []);

    const handlePay = async () => {
        if (!draft) return;
        setProcessing(true);

        try {
            // Check Auth
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                alert("Please log in again.");
                navigate('/login');
                return;
            }

            // Payment Logic
            if (paymentMethod === 'wallet') {
                if (walletBalance < draft.total) {
                    alert("Insufficient wallet balance. Please top up or use Online Payment.");
                    setProcessing(false);
                    return;
                }

                // Call RPC to deduct balance
                const { error: rpcError } = await supabase.rpc('deduct_balance', {
                    amount: draft.total,
                    description: `Payment for Order`
                });

                if (rpcError) throw rpcError;
                // Success deduction
            } else {
                // Xendit Logic
                // Call Supabase Edge Function to create Invoice
                const { data, error } = await supabase.functions.invoke('create-payment', {
                    body: {
                        amount: draft.total,
                        user_id: user.id,
                        email: user.email,
                        type: 'ORDER_PAYMENT',
                        redirect_url: window.location.origin + '/payment'
                    }
                });

                if (error) throw error;

                // Backend now returns 200 for logical errors too, check success flag
                if (!data.success) {
                    throw new Error(data.message || "Unknown Backend Error");
                }

                if (data && data.invoice_url) {
                    window.location.href = data.invoice_url;
                    return; // Stop here, redirecting
                } else {
                    throw new Error("Failed to get invoice URL");
                }
            }

            // Order Creation (Only if Wallet success OR if we weren't redirected above)
            // Note: For Xendit, usually we create order as 'Pending' first, then redirect. 
            // But here logic is simplified: Wallet = Paid immediately. Xendit = Redirect.

            const orderId = 'ORD-' + Math.floor(Math.random() * 100000);
            const finalOrder = {
                id: orderId,
                user_id: user.id,
                user_email: user.email,
                user_name: draft.userName || user.user_metadata?.full_name,
                service: draft.service,
                weight: draft.weight,
                items: draft.items, // JSONB
                total: draft.total,
                schedule: draft.schedule,
                address: draft.address,
                location: draft.location, // JSONB
                status: paymentMethod === 'wallet' ? 'Paid' : 'Pending Payment',
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('orders')
                .insert([finalOrder]);

            if (error) throw error;

            localStorage.removeItem('currentOrderDraft');
            navigate(`/tracking/${orderId}`);

        } catch (error) {
            console.error("Payment error:", error);
            const msg = error.message || "Unknown error";
            alert(`Payment failed: ${msg}. Check console for details.`);
            setProcessing(false);
        }
    };

    if (!draft) return <div className="flex justify-center items-center h-screen">Loading or No Order Found...</div>;

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden flex justify-center items-center min-h-screen">
            <div className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background-light dark:bg-background-dark sm:rounded-3xl sm:h-[calc(100vh-2rem)] shadow-2xl">

                {/* Header */}
                <header className="flex items-center gap-4 p-5 pt-8">
                    <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold">Checkout</h1>
                </header>

                {/* Content */}
                <main className="flex-1 px-6 pt-4 flex flex-col gap-6 overflow-y-auto">
                    {/* Order Summary */}
                    <section className="rounded-2xl bg-surface-light dark:bg-surface-dark p-5">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Order Summary</h2>

                        <div className="flex flex-col gap-3 mb-4">
                            {draft.service === 'Wash & Fold' ? (
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">Wash & Fold ({draft.weight} kg)</span>
                                    <span className="text-slate-500">{formatIDR(draft.total)}</span>
                                </div>
                            ) : (
                                Object.entries(draft.items).map(([item, qty]) => (
                                    qty > 0 && (
                                        <div key={item} className="flex justify-between items-center">
                                            <span className="font-medium">{qty}x {item.charAt(0).toUpperCase() + item.slice(1)}</span>
                                            <span className="text-slate-500">Item</span>
                                        </div>
                                    )
                                ))
                            )}
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500">Service Fee</span>
                            <span className="font-semibold">Included</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                            <span className="text-slate-500">Tax</span>
                            <span className="font-semibold">Rp 0</span>
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>

                        <div className="flex justify-between items-center text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary">{formatIDR(draft.total)}</span>
                        </div>
                    </section>

                    {/* Payment Method */}
                    <section>
                        <h2 className="text-lg font-bold mb-3">Payment Method</h2>
                        <div className="flex flex-col gap-3">
                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'xendit' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={paymentMethod === 'xendit'}
                                    onChange={() => setPaymentMethod('xendit')}
                                    className="text-primary focus:ring-primary"
                                />
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-slate-700 dark:text-white">credit_card</span>
                                        <div>
                                            <span className="font-bold block text-sm">Online Payment</span>
                                            <span className="text-xs text-slate-500">Bank Transfer, E-Wallet (Via Xendit)</span>
                                        </div>
                                    </div>
                                    {paymentMethod === 'xendit' && <span className="material-symbols-outlined text-primary fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                                </div>
                            </label>

                            <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                <input
                                    type="radio"
                                    name="payment"
                                    checked={paymentMethod === 'wallet'}
                                    onChange={() => setPaymentMethod('wallet')}
                                    className="text-primary focus:ring-primary"
                                />
                                <div className="flex-1 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-700 dark:text-white">account_balance_wallet</span>
                                    <div>
                                        <span className="font-bold block text-sm">Wallet Balance</span>
                                        {walletBalance !== null ? (
                                            <span className={`text-xs font-bold ${walletBalance >= draft.total ? 'text-green-600' : 'text-red-500'}`}>
                                                Available: {formatIDR(walletBalance)}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400">Loading balance...</span>
                                        )}
                                    </div>
                                </div>
                                {paymentMethod === 'wallet' && <span className="material-symbols-outlined text-primary fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                            </label>
                        </div>
                    </section>
                </main>

                {/* Pay Button */}
                <div className="p-6 pb-8 bg-background-light dark:bg-background-dark border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={handlePay}
                        disabled={processing}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {processing ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">lock</span>
                                Pay Now
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Payment;
