import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const MerchantDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [tab, setTab] = useState('incoming');
    const [stats, setStats] = useState({ count: 0, revenue: 0 });
    const [loading, setLoading] = useState(true);

    // Modal States
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [showDriverModal, setShowDriverModal] = useState(false);
    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [driverSelection, setDriverSelection] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        const fetchDrivers = async () => {
            // Fetch all profiles to ensure we find everyone, filtering in memory to avoid array syntax issues
            // Fetching just role=admin OR role=staff might be safer if database is huge, but for now fetch all is fine.
            const { data: allStaff, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, permissions, role, phone');

            if (error) {
                console.error("Error fetching drivers:", error);
                return;
            }

            if (allStaff) {
                const driverStaff = allStaff.filter(u => {
                    // Check for null/undefined permissions
                    if (!u.permissions) {
                        // admin is always a driver
                        return u.role === 'admin';
                    }

                    // Normalize to array
                    let perms = [];
                    if (Array.isArray(u.permissions)) {
                        perms = u.permissions;
                    } else if (typeof u.permissions === 'string') {
                        // Try to parse if it's a JSON string, otherwise treat as single csv or item
                        try {
                            perms = JSON.parse(u.permissions);
                        } catch (e) {
                            perms = [u.permissions];
                        }
                    }

                    // Check logic (case insensitive)
                    const hasDriverPerm = perms.some(p =>
                        typeof p === 'string' && p.toLowerCase() === 'driver'
                    );

                    return hasDriverPerm || u.role === 'admin';
                }).map(u => ({
                    id: u.id,
                    name: u.full_name || u.username || 'Unknown Driver',
                    phone: u.phone || 'No Phone'
                }));
                // Log for debugging
                console.log("All Staff Found:", allStaff);
                console.log("Filtered Drivers:", driverStaff);
                setDrivers(driverStaff);
            }
        };
        fetchDrivers();
    }, []);

    const fetchOrders = async () => {
        // Step 1: Fetch Orders
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (ordersError) {
            console.error("Error fetching orders:", ordersError);
            alert("Error fetching orders: " + ordersError.message);
            setLoading(false);
            return;
        }

        // Step 2: Fetch Profiles for these orders to get Name/Phone
        // Collect unique user IDs
        const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];

        let profilesMap = {};
        if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', userIds);

            if (profilesData) {
                profilesData.forEach(p => {
                    profilesMap[p.id] = p;
                });
            }
        }

        // Merge generic profile info into orders
        const enrichedOrders = ordersData.map(order => ({
            ...order,
            profiles: profilesMap[order.user_id] || { full_name: 'Unknown', phone: '' }
        }));

        setOrders(enrichedOrders);
        const totalRev = enrichedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStats({ count: enrichedOrders.length, revenue: totalRev });
        setLoading(false);
    };

    useEffect(() => {
        let intervalId;

        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/staff/login'); return; }

            const { data: profile, error: profileError } = await supabase.from('profiles').select('role, permissions').eq('id', user.id).single();

            if (profileError) {
                console.error("Profile check error:", profileError);
                // Don't block yet, maybe retry or just let it slide if transient?
                // Better to show error than wrong access denied.
                // But for now, if profile is null, we can't verify role.
                if (profileError.code !== 'PGRST116') { // PGRST116 is 'not found'
                    alert("Error verifying permissions. Please check connection.");
                    return;
                }
            }

            // Allow if Admin OR Staff with 'cashier' permission
            const hasAccess = profile?.role === 'admin' || (profile?.role === 'staff' && profile?.permissions?.includes('cashier'));

            if (!hasAccess) {
                // Double check if profile exists but no permissions?
                alert(`Access Denied: Account ${profile?.role || 'Unknown Role'} does not have Merchant/Cashier permissions.`);
                navigate('/staff/dashboard');
            } else {
                fetchOrders();
                intervalId = setInterval(fetchOrders, 5000);
            }
        };

        checkAccess();

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, []);

    const updateStatus = async (id, newStatus) => {
        const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) {
            alert("Failed to update status");
        } else {
            fetchOrders();
        }
    };

    const confirmDriver = async () => {
        if (!selectedOrderId || !driverSelection) return;

        const driverInfo = drivers.find(d => d.id === driverSelection);
        const order = orders.find(o => o.id === selectedOrderId);
        let nextStatus = 'Pickup Assigned';
        if (order && order.status === 'Ready for Delivery') {
            nextStatus = 'Out for Delivery';
        }

        const { error } = await supabase
            .from('orders')
            .update({
                status: nextStatus,
                driver: { name: driverInfo.name, phone: driverInfo.phone, id: driverInfo.id } // Store object for backwards compatibility or display
            })
            .eq('id', selectedOrderId);

        if (error) {
            // Fallback if driver column issue
            console.error(error);
            alert("Error assigning driver: " + error.message);
        } else {
            alert("Driver assigned successfully.");
        }

        setShowDriverModal(false);
        setDriverSelection(null);
        setSelectedOrderId(null);
        fetchOrders();
    };

    const confirmEvidence = async () => {
        if (!selectedOrderId) return;
        // Mock upload
        if (!imagePreview) {
            alert("Please upload (select) a photo.");
            return;
        }

        // Mock URL
        const evidenceUrl = "https://placehold.co/600x400?text=Workshop+Arrival";

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'Washing',
                workshop_evidence: evidenceUrl
            })
            .eq('id', selectedOrderId);

        if (error) {
            alert("Failed to update status");
        } else {
            setShowEvidenceModal(false);
            setImagePreview(null);
            setSelectedOrderId(null);
            fetchOrders();
        }
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // Filter Logic
    const filteredOrders = orders.filter(o => {
        const s = o.status;
        if (tab === 'incoming') return ['Paid', 'Request Received', 'Pending Payment', 'Pickup Assigned', 'Picked Up'].includes(s);
        if (tab === 'progress') return ['Washing', 'Drying', 'Ironing', 'Ironing/Folding', 'Packing', 'Ready for Delivery', 'Out for Delivery'].includes(s);
        if (tab === 'completed') return s === 'Completed';
        return false;
    });

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const getActionBtn = (order) => {
        if (tab === 'incoming') {
            if (order.status === 'Pickup Assigned') {
                return <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">Driver Assigned</span>;
            }
            if (order.status === 'Picked Up') {
                return (
                    <button onClick={() => { setSelectedOrderId(order.id); setShowEvidenceModal(true); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/30 ring-1 ring-white/20">
                        Confirm Arrival (Evidence)
                    </button>
                );
            }
            return (
                <button onClick={() => { setSelectedOrderId(order.id); setShowDriverModal(true); }} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
                    Assign Pickup
                </button>
            );
        } else if (tab === 'progress') {
            if (order.status === 'Ready for Delivery') {
                return (
                    <button onClick={() => { setSelectedOrderId(order.id); setShowDriverModal(true); }} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">
                        Assign Courier
                    </button>
                );
            } else if (order.status === 'Out for Delivery') {
                return (
                    <button onClick={() => updateStatus(order.id, 'Completed')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/30">
                        Complete Order
                    </button>
                );
            } else {
                return <span className="text-xs font-bold text-slate-400">Processing</span>;
            }
        } else {
            return <span className="text-xs font-bold text-slate-400">Archived</span>;
        }
    };

    const openDetails = (id) => {
        setSelectedOrderId(id);
        setShowDetailsModal(true);
    };

    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    return (
        <div className="bg-gray-50 font-display text-slate-900 min-h-screen">
            <div className="max-w-4xl mx-auto p-6">
                {/* Header */}
                <header className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="size-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined">storefront</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Launder Merchant</h1>
                            <p className="text-sm text-slate-500">Manage your laundry orders</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setLoading(true); fetchOrders(); }} className="text-xs text-primary font-bold border border-primary px-3 py-1 rounded-full hover:bg-primary hover:text-white transition-colors flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">refresh</span>
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Orders</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h2 className="text-3xl font-black">{stats.count}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Revenue</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h2 className="text-3xl font-black text-primary">{formatIDR(stats.revenue)}</h2>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Services</p>
                        <div className="flex items-end gap-2 mt-2">
                            <h2 className="text-3xl font-black text-orange-500">2</h2>
                            <span className="text-sm font-semibold text-slate-400 mb-1">Wash & Dry</span>
                        </div>
                    </div>
                </div>

                {/* Orders Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-100">
                        {['incoming', 'progress', 'completed'].map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors capitalize ${tab === t ? 'text-primary border-primary hover:bg-slate-50' : 'text-slate-500 border-transparent hover:bg-slate-50'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-surface-light text-slate-500 text-xs uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Order ID</th>
                                    <th className="px-6 py-4">Schedule</th>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4">Address</th>
                                    <th className="px-6 py-4">Total</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                                <p>No orders in this tab.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map(order => {
                                        let statusColor = 'bg-slate-100 text-slate-800';
                                        if (order.status === 'Pickup Assigned') statusColor = 'bg-indigo-100 text-indigo-800';
                                        if (order.status === 'Washing') statusColor = 'bg-blue-100 text-blue-800';
                                        if (order.status === 'Completed') statusColor = 'bg-green-100 text-green-800';

                                        return (
                                            <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-sm font-semibold text-slate-600">{order.id.substring(0, 8)}...</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{order.schedule || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {order.service}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600 truncate max-w-[150px]">{order.address ? (order.address.substring(0, 20) + '...') : 'N/A'}</td>
                                                <td className="px-6 py-4 font-bold text-slate-900">{formatIDR(order.total || 0)}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor} border border-slate-200`}>
                                                        {order.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    {getActionBtn(order)}
                                                    <button onClick={() => openDetails(order.id)} className="text-slate-400 hover:text-primary transition-colors">
                                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {/* Driver Modal */}
            {showDriverModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDriverModal(false)}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Assign Driver</h3>
                        <div className="space-y-3">
                            <div className="space-y-3 max-h-60 overflow-y-auto">
                                {drivers.length === 0 ? <p className="text-sm text-slate-500 text-center">No drivers found.</p> : drivers.map((driver) => (
                                    <label key={driver.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="driver"
                                            value={driver.id}
                                            checked={driverSelection === driver.id}
                                            onChange={(e) => setDriverSelection(e.target.value)}
                                            className="text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <div>
                                            <p className="font-bold text-sm">{driver.name}</p>
                                            <p className="text-xs text-slate-500">ID: {driver.id.slice(0, 4)}...</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowDriverModal(false)} className="flex-1 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={confirmDriver} className="flex-1 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">Assign</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evidence Modal */}
            {showEvidenceModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEvidenceModal(false)}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Upload Laundry Evidence</h3>
                        <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-colors">
                            <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                            <p className="text-sm font-medium">Click to upload photo</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                        {imagePreview && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url('${imagePreview}')` }}></div>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowEvidenceModal(false)} className="flex-1 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button onClick={confirmEvidence} className="flex-1 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30">Upload & Process</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedOrder && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Order Details</h3>
                            <div className="flex gap-2">
                                <button onClick={() => window.open(`/#/receipt/${selectedOrder.id}`, '_blank', 'width=400,height=600')} className="size-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600">
                                    <span className="material-symbols-outlined text-[18px]">print</span>
                                </button>
                                <button onClick={() => setShowDetailsModal(false)} className="size-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 text-slate-600">
                                    <span className="material-symbols-outlined text-[18px]">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Order ID</p>
                                    <p className="font-mono font-bold">{selectedOrder.id}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Status</p>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                        {selectedOrder.status}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Service</p>
                                    <p className="font-medium">{selectedOrder.service}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Customer Phone</p>
                                    <p className="font-mono text-sm">{selectedOrder.profiles?.phone || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
                                    <p className="font-bold text-primary">{formatIDR(selectedOrder.total || 0)}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Pickup Details</p>
                                <div className="flex items-start gap-3 mb-2">
                                    <span className="material-symbols-outlined text-slate-400">calendar_month</span>
                                    <p className="text-sm font-medium">{selectedOrder.schedule || 'N/A'}</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-slate-400">location_on</span>
                                    <p className="text-sm font-medium">{selectedOrder.address || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                                <p className="text-xs text-slate-500 uppercase font-bold mb-2">Details</p>
                                <div className="text-sm space-y-1">
                                    {selectedOrder.service === 'Wash & Fold' ? (
                                        <div className="flex justify-between"><span>Weight</span><span className="font-bold">{selectedOrder.weight || 0} KG</span></div>
                                    ) : (
                                        selectedOrder.items && Object.entries(selectedOrder.items).map(([item, qty]) => (
                                            qty > 0 && <div key={item} className="flex justify-between"><span>{item}</span><span className="font-bold">x{qty}</span></div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantDashboard;
