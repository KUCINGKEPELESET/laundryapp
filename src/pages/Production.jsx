import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Production = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [inputNotes, setInputNotes] = useState('');
    const [productionItems, setProductionItems] = useState([]);

    const STAGES = ['Washing', 'Drying', 'Ironing/Folding', 'Packing'];
    const [staffMembers, setStaffMembers] = useState([]);

    useEffect(() => {
        const fetchStaff = async () => {
            // Fetch admins and staff with 'production' permission
            const { data: staff } = await supabase
                .from('profiles')
                .select('username, full_name, permissions, role')
                .or('role.eq.admin,role.eq.staff');

            if (staff) {
                const prodStaff = staff.filter(u =>
                    u.role === 'admin' ||
                    (u.permissions && u.permissions.includes('production'))
                ).map(u => u.full_name || u.username);
                setStaffMembers(prodStaff);
            }
        };
        fetchStaff();
    }, []);

    const getDeadline = (order) => {
        // Use created_at or schedule
        const created = new Date(order.created_at || new Date().toISOString());
        let due = new Date(created);
        if (order.service === 'Wash & Fold') {
            due.setHours(due.getHours() + 6);
        } else {
            due.setDate(due.getDate() + 3);
        }
        return due;
    };

    const getTimeRemaining = (due) => {
        const now = new Date();
        const diffMs = due - now;
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffMs < 0) return { text: 'Overdue', classN: 'bg-slate-800 text-white', urgent: true };

        if (diffHrs < 1) {
            return { text: `Due in ${diffMins}m`, classN: 'bg-red-500 text-white', urgent: true };
        } else if (diffHrs < 24) {
            return { text: `Due in ${diffHrs}h ${diffMins}m`, classN: 'bg-orange-500 text-white', urgent: false };
        } else {
            const days = Math.floor(diffHrs / 24);
            return { text: `Due in ${days}d ${diffHrs % 24}h`, classN: 'bg-green-500 text-white', urgent: false };
        }
    };

    const fetchOrders = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: true }); // Oldest first for production?

        if (error) console.error(error);
        else setOrders(data);
        setLoading(false);
    };

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/staff/login'); return; }

            const { data: profile } = await supabase.from('profiles').select('role, permissions').eq('id', user.id).single();

            // Allow if Admin OR Staff with 'production' permission
            const hasAccess = profile?.role === 'admin' || (profile?.role === 'staff' && profile?.permissions?.includes('production'));

            if (!hasAccess) {
                alert("Access Denied: You do not have Production permissions.");
                navigate('/staff/dashboard');
            } else {
                fetchOrders();
            }
        };
        checkAccess();
    }, []);

    const inProgress = orders.filter(o =>
        ['Washing', 'Drying', 'Ironing/Folding', 'Packing', 'Ironing'].includes(o.status)
    ).map(o => {
        const due = getDeadline(o);
        return { ...o, due, remaining: getTimeRemaining(due) };
    }).sort((a, b) => a.due - b.due);


    const openModal = (order) => {
        setSelectedOrder(order);
        setInputNotes(order.production_notes || ''); // Note: column needs to exist or use jsonb

        // Parse items if exists, else init
        let items = [];
        if (order.production_items && Array.isArray(order.production_items)) {
            items = order.production_items;
        } else {
            items = [{ type: '', qty: '' }];
        }
        setProductionItems(items);

        setIsModalOpen(true);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...productionItems];
        newItems[index][field] = value;
        setProductionItems(newItems);
    };

    const addItem = () => {
        setProductionItems([...productionItems, { type: '', qty: '' }]);
    };

    const removeItem = (index) => {
        const newItems = productionItems.filter((_, i) => i !== index);
        setProductionItems(newItems);
    };

    const completeStage = async (stage, staff) => {
        if (!selectedOrder) return;
        if (!staff) {
            alert("Please select staff.");
            return;
        }

        const logs = selectedOrder.production_logs || {};
        logs[stage] = { done: true, staff };

        let nextStatus = selectedOrder.status;
        const idx = STAGES.indexOf(stage);
        if (stage === 'Packing') nextStatus = 'Ready for Delivery';
        else if (idx !== -1 && idx < STAGES.length - 1) nextStatus = STAGES[idx + 1];

        // Save
        const { error } = await supabase
            .from('orders')
            .update({
                status: nextStatus,
                production_logs: logs, // Need JSONB column
                production_items: productionItems, // Need JSONB column
                production_notes: inputNotes // Need text column
            })
            .eq('id', selectedOrder.id);

        if (error) {
            console.error(error);
            alert("Error updating: " + error.message);
        } else {
            // Optimistic update
            fetchOrders();
            setIsModalOpen(false);
        }
    };

    // Total count
    const totalCount = productionItems.reduce((acc, item) => acc + (parseInt(item.qty) || 0), 0);

    return (
        <div className="bg-gray-50 font-display text-slate-900 min-h-screen">
            <div className="max-w-4xl mx-auto p-6">
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/staff/dashboard')} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">Production Timeline</h1>
                            <p className="text-sm text-slate-500">Prioritized work queue</p>
                        </div>
                    </div>
                </header>

                <div className="space-y-4">
                    {inProgress.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <span className="material-symbols-outlined text-6xl mb-4 text-slate-300">check_circle</span>
                            <p className="text-lg font-bold">All caught up!</p>
                            <p className="text-sm">No orders currently in production.</p>
                        </div>
                    ) : (
                        inProgress.map(order => (
                            <div key={order.id} className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md border-l-8 ${order.remaining.urgent ? 'border-l-red-500' : 'border-l-green-500'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-mono font-bold text-slate-500 text-sm">#{order.id.substring(0, 8)}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${order.remaining.classN}`}>
                                            {order.remaining.text}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">{order.service}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-2">
                                        <span>Since: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-xs font-bold text-slate-400 uppercase">Current Stage</span>
                                        <span className="block font-bold text-primary">{order.status}</span>
                                    </div>
                                    <button onClick={() => openModal(order)} className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                                        Manage
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && selectedOrder && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold">Manage Production</h3>
                                <p className="text-sm text-slate-500 font-mono">#{selectedOrder.id}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="size-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase">Items Breakdown</label>
                                        <span className="text-xs font-bold text-primary">Total: {totalCount}</span>
                                    </div>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {productionItems.map((item, idx) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <input value={item.type} onChange={(e) => updateItem(idx, 'type', e.target.value)} placeholder="Type" className="flex-1 rounded-lg border-slate-200 text-sm p-2" />
                                                <input value={item.qty} type="number" onChange={(e) => updateItem(idx, 'qty', e.target.value)} placeholder="Qty" className="w-20 rounded-lg border-slate-200 text-sm p-2" />
                                                <button onClick={() => removeItem(idx)} className="text-slate-400 hover:text-red-500"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={addItem} className="mt-2 text-xs font-bold text-primary flex items-center gap-1 hover:bg-primary/5 p-1 rounded transition-colors"><span className="material-symbols-outlined text-[16px]">add</span> Add Item</button>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
                                    <input value={inputNotes} onChange={(e) => setInputNotes(e.target.value)} className="w-full rounded-lg border-slate-200 text-sm" placeholder="Notes..." />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Workflow Stages</label>
                                <div className="space-y-2">
                                    {STAGES.map(stage => {
                                        const logs = selectedOrder.production_logs || {};
                                        const stageData = logs[stage] || { done: false, staff: '' };
                                        const isDone = stageData.done;

                                        return (
                                            <div key={stage} className={`p-3 rounded-xl border ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'} flex items-center justify-between`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300'}`}>
                                                        <span className="material-symbols-outlined text-[16px]">check</span>
                                                    </div>
                                                    <span className={`font-bold text-sm ${isDone ? 'text-green-800' : 'text-slate-700'}`}>{stage}</span>
                                                </div>
                                                <div>
                                                    {!isDone && (
                                                        <>
                                                            <select id={`staff-${stage}`} className="text-xs border-slate-200 rounded-lg py-1 pr-8 mr-2">
                                                                <option value="">Select Staff</option>
                                                                {staffMembers.map(s => <option key={s} value={s}>{s}</option>)}
                                                            </select>
                                                            <button onClick={() => completeStage(stage, document.getElementById(`staff-${stage}`).value)} className="text-xs font-bold text-primary hover:underline">Done</button>
                                                        </>
                                                    )}
                                                    {isDone && <span className="text-xs text-slate-500">Staff: {stageData.staff}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Production;
