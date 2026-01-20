import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const [showEvidenceModal, setShowEvidenceModal] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);

    // --- NOTIFICATION SETUP ---
    useEffect(() => {
        const reqPerm = async () => {
            try {
                const { display } = await LocalNotifications.requestPermissions();
                if (display === 'granted') {
                    console.log("Notification permission granted");
                }
            } catch (e) {
                console.error("Notification perm error:", e);
            }
        }
        reqPerm();
    }, []);

    useEffect(() => {
        if (!profile?.id) return;
        // ... (realtime logic below)

        console.log("Subscribing to realtime orders for driver:", profile.id);

        const subscription = supabase
            .channel('driver-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE', // Listen for assignments
                    schema: 'public',
                    table: 'orders',
                },
                async (payload) => {
                    const newOrder = payload.new;
                    // Check if this update is for ME and is a NEW ASSIGNMENT
                    if (
                        newOrder.status === 'Pickup Assigned' &&
                        newOrder.driver &&
                        newOrder.driver.id === profile.id
                    ) {
                        // Web Notification (Optional fallback)
                        console.log("Web Notification: New Order Assigned!");

                        // Refresh list
                        fetchAssignedOrders(profile.id);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [profile]);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/staff/login'); return; }

            const { data: userProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            setProfile(userProfile);

            if (userProfile.role !== 'admin' && !userProfile.permissions?.includes('driver')) {
                alert("Access Denied: Driver permissions required.");
                navigate('/staff/dashboard');
                return;
            }

            fetchAssignedOrders(user.id);
        };
        init();
    }, []);

    const fetchAssignedOrders = async (driverId) => {
        // Fetch orders first (no join to avoid FK issues)
        const { data: ordersData, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .or(`status.eq.Pickup Assigned,status.eq.Out for Delivery`)
            .order('created_at', { ascending: true });

        if (ordersError) {
            console.error(ordersError);
            setLoading(false);
            return;
        }

        // Fetch profiles manually
        const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
        let profilesMap = {};

        if (userIds.length > 0) {
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', userIds);

            if (profilesData) {
                profilesData.forEach(p => profilesMap[p.id] = p);
            }
        }

        // Merge and Filter
        const myOrders = ordersData
            .filter(o => o.driver && o.driver.id === driverId)
            .map(o => ({
                ...o,
                profiles: profilesMap[o.user_id] || { full_name: 'Unknown', phone: '' }
            }));

        setOrders(myOrders);
        setLoading(false);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const confirmPickup = async () => {
        if (!selectedOrderId || !imagePreview) return alert("Please take a photo evidence.");

        setUploading(true);
        // Mock upload: usually upload to storage bucket, get URL. 
        // For now, we save raw base64 or a placeholder if too large, but for demo we assume success.
        // In real prod, use supabase.storage
        const evidenceUrl = "https://placehold.co/600x400?text=Pickup+Evidence";

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'Picked Up', // New status
                pickup_evidence: evidenceUrl
                // In real app, upload imagePreview to bucket first
            })
            .eq('id', selectedOrderId);

        if (error) alert("Error updating status: " + error.message);
        else {
            setShowEvidenceModal(false);
            setSelectedOrderId(null);
            setImagePreview(null);
            fetchAssignedOrders(profile.id);
        }
        setUploading(false);
    };

    const updateStatus = async (orderId, newStatus) => {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) alert("Error updating status");
        else fetchAssignedOrders(profile.id);
    };

    const openWhatsApp = (order) => {
        // Use phone from joined profile, or fallback
        const phone = order.profiles?.phone || order.phone || '';
        if (!phone) return alert("No phone number available for this customer.");

        const message = `Halo ${order.profiles?.full_name || 'Pelanggan'}, saya kurir dari Kleenzy Laundry. Saya ingin konfirmasi pickup untuk pesanan #${order.id.substring(0, 8)}. Alamat: ${order.address}`;
        window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const openMaps = (address) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    };

    if (loading) return <div className="p-6 text-center text-slate-500">Loading Driver Portal...</div>;

    return (
        <div className="bg-slate-100 min-h-screen font-display text-slate-900 pb-20">
            <div className="bg-primary text-white p-6 rounded-b-[2rem] shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold">Driver Portal</h1>
                    <button onClick={() => navigate('/staff/dashboard')} className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <span className="material-symbols-outlined">api</span>
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <div className="size-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                        <span className="material-symbols-outlined text-2xl">local_shipping</span>
                    </div>
                    <div>
                        <p className="text-white/80 text-sm">Welcome back,</p>
                        <p className="font-bold text-lg">{profile?.full_name || 'Driver'}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                <div>
                    <h2 className="font-bold text-slate-500 uppercase text-xs mb-4 tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">list_alt</span>
                        Assigned Tasks ({orders.length})
                    </h2>

                    {orders.length === 0 ? (
                        <div className="text-center py-10 opacity-50">
                            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                            <p>No active tasks assigned.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <div key={order.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold font-mono">
                                            #{order.id.substring(0, 8)}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${order.status === 'Pickup Assigned' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {order.status}
                                        </span>
                                    </div>

                                    <h3 className="font-bold text-lg mb-1">{order.service}</h3>
                                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{order.address}</p>

                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        <button onClick={() => openWhatsApp(order)} className="flex items-center justify-center gap-2 bg-green-50 text-green-700 py-2 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors border border-green-200">
                                            <span className="material-symbols-outlined text-[18px]">chat</span>
                                            WhatsApp
                                        </button>
                                        <button onClick={() => openMaps(order.address)} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors border border-blue-200">
                                            <span className="material-symbols-outlined text-[18px]">map</span>
                                            Map
                                        </button>
                                    </div>

                                    {order.status === 'Pickup Assigned' && (
                                        <button onClick={() => { setSelectedOrderId(order.id); setShowEvidenceModal(true); }} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">camera_alt</span>
                                            Confirm Pickup (Photo)
                                        </button>
                                    )}

                                    {order.status === 'Out for Delivery' && (
                                        <button onClick={() => updateStatus(order.id, 'Completed')} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-600/20 flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined">check_circle</span>
                                            Confirm Delivery &rarr; Complete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Evidence Modal */}
            {showEvidenceModal && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEvidenceModal(false)}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
                        <h3 className="text-xl font-bold mb-4">Pickup Evidence</h3>
                        <p className="text-sm text-slate-500 mb-4">Take a photo of the laundry bag.</p>

                        <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:bg-slate-50 hover:border-primary/50 transition-colors">
                            <span className="material-symbols-outlined text-4xl">photo_camera</span>
                            <p className="text-sm font-medium">Tap to take photo</p>
                            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleImageChange} />
                        </label>

                        {imagePreview && (
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 h-40 w-full bg-cover bg-center" style={{ backgroundImage: `url('${imagePreview}')` }}></div>
                        )}

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowEvidenceModal(false)} className="flex-1 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                            <button disabled={uploading} onClick={confirmPickup} className="flex-1 py-2 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                                {uploading ? 'Uploading...' : 'Confirm Pickup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
