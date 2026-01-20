import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NewOrder = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [state, setState] = useState({
        service: 'wash-fold',
        weight: 3,
        items: {},
        date: 'Mon, 12',
        time: '8:00 - 10:00 AM',
        address: 'Select Address',
        lat: null,
        lng: null
    });

    // UI State for Search
    const [searchQuery, setSearchQuery] = useState('');
    const [showAllItems, setShowAllItems] = useState(false);
    // UI State for Modal
    const [isMapOpen, setIsMapOpen] = useState(false);

    // Initial state setup for items
    useEffect(() => {
        // Initialize state items with all 0s
        const initialItems = {};
        Object.keys(prices).forEach(key => {
            if (key !== 'wash-fold-kg') initialItems[key] = 0;
        });
        setState(prev => ({
            ...prev,
            items: { ...initialItems, ...prev.items }
        }));
    }, []);

    // Prices constant (Full List)
    const prices = {
        'wash-fold-kg': 6000,
        // Satuan
        'bantal-kecil': 15000,
        'bantal-sedang': 30000,
        'bantal-besar': 50000,
        'batik': 20000,
        'bed-cover-kecil': 20000,
        'bed-cover-sedang': 30000,
        'bed-cover-besar': 40000,
        'boneka-mini': 10000,
        'boneka-kecil': 20000,
        'boneka-sedang': 30000,
        'boneka-besar': 40000,
        'boneka-jumbo': 60000,
        'blazer': 25000,
        'blouse': 18000,
        'cardigan': 25000,
        'celana-pendek': 15000,
        'celana-panjang': 20000,
        'ciput': 10000,
        'dasi': 10000,
        'gaun-pendek': 28000,
        'gaun-panjang': 35000,
        'gamis': 30000,
        'gorden-kg': 15000,
        'gendongan-bayi': 20000,
        // Column 2
        'hambal-selimut': 35000,
        'handuk-kecil': 10000,
        'handuk-sedang': 18000,
        'handuk-besar': 25000,
        'hijab': 15000,
        'helm-half-face': 30000,
        'helm-full-face': 40000,
        'jaket-kain': 20000,
        'jaket-parasut': 25000,
        'jaket-tebal': 35000,
        'jaket-kulit': 45000,
        'jas': 30000,
        'jas-setelan': 40000,
        'jasa-pasang': 2000,
        'kaos': 15000,
        'kaos-polo': 20000,
        'kemeja-koko': 20000,
        'kain-songket': 25000,
        'kasur-bayi': 35000,
        'keset-kecil': 15000,
        'keset-sedang': 20000,
        'keset-besar': 50000,
        'korset': 15000,
        'korset-besar': 25000,
        // Image 2 Column 1
        'kebaya': 25000,
        'kebaya-set': 35000,
        'koper-kecil': 40000,
        'koper-sedang': 60000,
        'koper-besar': 80000,
        'matras': 20000,
        'mukena-setelan': 20000,
        'pdl-tni-polri': 20000,
        'pdl-tni-polri-set': 35000,
        'rompi': 15000,
        'rok': 18000,
        'safari': 18000,
        'safari-setelan': 35000,
        'sarung': 15000,
        'sarung-bantal-guling': 10000,
        'sandal': 20000,
        'sajadah-tipis': 15000,
        'sajadah-tebal': 20000,
        'selimut-tipis': 20000,
        'selimut-tebal': 25000,
        'sweater': 20000,
        'sepatu-leather': 45000,
        'sepatu-kanvas': 35000,
        // Image 2 Column 2
        'stroller-medium': 125000,
        'stroller-travelling': 100000,
        'sprei-single': 15000,
        'sprei-double': 20000,
        'sprei-jumbo': 25000,
        'syal': 15000,
        'taplak-meja-kecil': 12000,
        'taplak-meja-sedang': 22000,
        'taplak-meja-besar': 35000,
        'tas-gunung': 35000,
        'tas-jinjing': 15000,
        'tas-kulit-suede': 45000,
        'tas-pinggang': 15000,
        'tas-ransel': 25000,
        'tambah-hanger': 3000,
        'treatment-khusus': 10000,
        'topi': 15000,
        'tunik': 25000,
        'umbul-umbul': 20000,
        'vitras-kecil': 15000,
        'vitras-sedang': 20000,
        'vitras-besar': 25000,
        'wearpack': 20000
    };

    // Filtered Items Logic
    const getFilteredItems = () => {
        const allItems = Object.entries(prices).filter(([key]) => key !== 'wash-fold-kg');

        let filtered = allItems;
        if (searchQuery) {
            filtered = allItems.filter(([key]) =>
                key.toLowerCase().includes(searchQuery.toLowerCase().replace(/\s+/g, '-'))
            );
        }

        if (!searchQuery && !showAllItems) {
            return filtered.slice(0, 4);
        }
        return filtered;
    };

    const visibleItems = getFilteredItems();

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    let mapInstance = useRef(null);
    let currentCenter = useRef({ lat: 37.7749, lng: -122.4194 });

    const [userBalance, setUserBalance] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const { data } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
                setUserBalance(data ? data.balance : 0);
            }
        };
        checkAuth();
    }, []);

    useEffect(() => {
        // Load Google Maps Script dynamically if not present
        if (!window.google && !document.getElementById('google-maps-script')) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}`;
            script.id = 'google-maps-script';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, []);

    const initMap = () => {
        if (window.google && mapRef.current && !mapInstance.current) {
            mapInstance.current = new window.google.maps.Map(mapRef.current, {
                center: currentCenter.current,
                zoom: 14,
                disableDefaultUI: true,
            });

            mapInstance.current.addListener("center_changed", () => {
                currentCenter.current = mapInstance.current.getCenter().toJSON();
            });
        }
    };

    // Trigger map init when modal opens
    useEffect(() => {
        if (isMapOpen) {
            // Small timeout to allow render
            setTimeout(() => {
                initMap();
            }, 100);
        }
    }, [isMapOpen]);

    const handleServiceSelect = (serviceId) => {
        setState({ ...state, service: serviceId });
    };

    const updateWeight = (change) => {
        setState(prev => ({ ...prev, weight: Math.max(1, prev.weight + change) }));
    };

    const updateQuantity = (itemId, change) => {
        setState(prev => ({
            ...prev,
            items: {
                ...prev.items,
                [itemId]: Math.max(0, (prev.items[itemId] || 0) + change)
            }
        }));
    };

    const selectDate = (dateStr) => {
        setState({ ...state, date: dateStr });
    };

    const selectTime = (timeStr) => {
        setState({ ...state, time: timeStr });
    };

    const confirmLocation = () => {
        const mockStreets = ['Main St', 'Mission St', 'Market St', 'Broadway', 'Union Square'];
        const num = Math.floor(Math.random() * 900) + 100;
        const street = mockStreets[Math.floor(Math.random() * mockStreets.length)];

        const newAddress = `${num} ${street}, San Francisco`;

        setState(prev => ({
            ...prev,
            lat: currentCenter.current.lat,
            lng: currentCenter.current.lng,
            address: newAddress
        }));
        setIsMapOpen(false);
    };

    const calculateTotal = () => {
        let total = 0;
        if (state.service === 'wash-fold') {
            const billableWeight = Math.max(3, state.weight);
            // Safety check for price
            const price = prices['wash-fold-kg'] || 6000;
            total = billableWeight * price;
        } else {
            for (const [item, qty] of Object.entries(state.items)) {
                // Only calculate if price exists to avoid NaN
                const price = prices[item];
                if (price !== undefined) {
                    total += qty * price;
                }
            }
        }
        return total;
    };

    const formatIDR = (num) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(num);
    };

    const handleCheckout = () => {
        if (state.address === 'Select Address') {
            alert("Please select a pickup location.");
            return;
        }

        if (!user) {
            if (window.confirm("You need to log in to place an order. Go to login?")) {
                navigate('/login');
            }
            return;
        }

        const totalVal = calculateTotal();
        const orderData = {
            userId: user.id,
            userEmail: user.email,
            userName: user.user_metadata?.full_name || user.email,
            service: state.service === 'wash-fold' ? 'Wash & Fold' : 'Dry Clean',
            weight: state.service === 'wash-fold' ? state.weight : null,
            items: state.service === 'dry-clean' ? state.items : {},
            total: totalVal,
            date: new Date().toISOString(),
            schedule: `${state.date} at ${state.time}`,
            address: state.address,
            location: {
                lat: state.lat,
                lng: state.lng
            },
            status: 'Pending Payment'
        };

        localStorage.setItem('currentOrderDraft', JSON.stringify(orderData));
        navigate('/payment'); // We will implement Payment page next
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-x-hidden flex justify-center min-h-screen">
            <div className="relative flex min-h-screen w-full flex-col max-w-md shadow-2xl bg-background-light dark:bg-background-dark pb-48">
                {/* Header Section */}
                <header className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between px-4 py-3">
                        <button onClick={() => navigate(-1)} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-white">
                            <span className="material-symbols-outlined">arrow_back_ios_new</span>
                        </button>
                        <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">New Order</h1>
                        <button className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-white">
                            <span className="material-symbols-outlined">more_vert</span>
                        </button>
                    </div>
                    {/* Progress Stepper */}
                    <div className="px-6 py-2 pb-4">
                        <div className="flex w-full items-center justify-between gap-2">
                            <div className="flex flex-col items-center gap-1 w-1/3">
                                <div className="h-1.5 w-full rounded-full bg-primary"></div>
                                <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Service</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 w-1/3">
                                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-primary opacity-30 w-1/2"></div>
                                </div>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Details</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 w-1/3">
                                <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Schedule</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 px-5 pt-6 flex flex-col gap-8">
                    {/* Step 1: Service Selection */}
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">What do you<br />need cleaned today?</h2>
                            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">Step 1/3</span>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {/* Wash & Fold Card */}
                            <div
                                onClick={() => handleServiceSelect('wash-fold')}
                                className={state.service === 'wash-fold'
                                    ? "group relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-1 shadow-lift border-2 border-primary cursor-pointer transition-all"
                                    : "group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all shadow-sm"}
                            >
                                {state.service === 'wash-fold' && (
                                    <div className="absolute top-3 right-3 z-10">
                                        <span className="material-symbols-outlined text-primary text-2xl fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </div>
                                )}
                                <div className="flex h-full flex-row">
                                    <div className="flex-1 p-4 flex flex-col justify-between z-10">
                                        <div>
                                            <div className="inline-flex items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-700 shadow-sm mb-3 text-primary">
                                                <span className="material-symbols-outlined">local_laundry_service</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Wash & Fold</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Everyday laundry, by the pound.</p>
                                        </div>
                                        <div className="mt-4">
                                            <span className="text-sm font-bold text-primary">Rp 6.000</span>
                                            <span className="text-xs text-slate-400">/ kg</span>
                                        </div>
                                    </div>
                                    <div className="w-24 h-full bg-cover bg-center rounded-r-lg" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDjDTOXUzDgZWSnjX5527iZ70bDV_C3-PJ_15DTZUToz9vjsoJFOE01ru4EETd5XPhHyPc6lYot1Zx8wjbf0nwsQ7JGmGcZOrxbgRD7-fROiwTsrqXtGLT9a0opsFcd43QDZ3pllOO-J0lTwc22SRedFNPji9M5b7DQRgMpU6TMb-069jcYuePTRPvjGRn3c4PDiEKemf_l3J4PTSQ4vKguCwadWvAuiTzyMHn-jT7-9FAh8vVnysPdDKPLGUdTVOTTEX531GeP2MyV')" }}></div>
                                </div>
                            </div>

                            {/* Dry Clean Card */}
                            <div
                                onClick={() => handleServiceSelect('dry-clean')}
                                className={state.service === 'dry-clean'
                                    ? "group relative overflow-hidden rounded-xl bg-surface-light dark:bg-surface-dark p-1 shadow-lift border-2 border-primary cursor-pointer transition-all"
                                    : "group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-100 dark:border-slate-700 hover:border-primary/50 cursor-pointer transition-all shadow-sm"}
                            >
                                {state.service === 'dry-clean' && (
                                    <div className="absolute top-3 right-3 z-10">
                                        <span className="material-symbols-outlined text-primary text-2xl fill-1" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    </div>
                                )}
                                <div className={`flex h-full flex-row ${state.service !== 'dry-clean' ? 'opacity-80 group-hover:opacity-100' : ''}`}>
                                    <div className="flex-1 p-4 flex flex-col justify-between z-10">
                                        <div>
                                            <div className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-50 dark:bg-slate-700 shadow-sm mb-3 text-slate-600 dark:text-slate-300">
                                                <span className="material-symbols-outlined">dry_cleaning</span>
                                            </div>
                                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Dry Clean</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Delicates, suits & dresses.</p>
                                        </div>
                                        <div className="mt-4">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Per Item</span>
                                        </div>
                                    </div>
                                    <div className={`w-24 h-full bg-cover bg-center rounded-r-lg transition-all ${state.service !== 'dry-clean' ? 'grayscale group-hover:grayscale-0' : ''}`} style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD0-IfIWcoi3gfiAWkOzzua-aoUd_G9yBFN2y20RrYhF0oqcLJjo5He_Jal4Lto7-4YsM2OXTSk9GqW-py5fH6PHy8JgM1lc6QOC3F4eNHqjp-lvVFLFWh8jd9qUyb94wCOhrrNod7aheoD5eRs7HPUw4k0T2agtAUy8iMqYsOxMlvmpsxQBi7BinYpkD7so68-cQxQ1IravSYE0maTzwokAm_vmOBkdAl7FfrMi9lLABTKY9XzogBLrG2BFP0FHbH_G5bpYglqSnKk')" }}></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {state.service === 'wash-fold' ? (
                        /* Step 2: Weight Input */
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Estimated Weight</h2>
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Minimum 3 KG</span>
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">Rp 6.000 / KG</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => updateWeight(-1)} className="size-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                        <span className="material-symbols-outlined">remove</span>
                                    </button>
                                    <div className="flex-1 text-center">
                                        <div className="text-4xl font-extrabold text-slate-900 dark:text-white">{state.weight}</div>
                                        <span className="text-xs text-slate-400 font-medium">KG</span>
                                    </div>
                                    <button onClick={() => updateWeight(1)} className="size-12 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors">
                                        <span className="material-symbols-outlined">add</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    ) : (
                        /* Step 2: Item Details - Dynamic List */
                        <section>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Select Items</h2>

                            {/* Search Bar */}
                            <div className="relative mb-4">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400">search</span>
                                <input
                                    type="text"
                                    placeholder="Search item (e.g. Jas, Gaun)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-primary outline-none transition-shadow placeholder:text-slate-400 dark:text-white"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <span className="material-symbols-outlined text-[18px]">close</span>
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col gap-3">
                                {visibleItems.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400">
                                        <p>No items found matching "{searchQuery}"</p>
                                    </div>
                                ) : (
                                    visibleItems.map(([key, price]) => {
                                        const qty = state.items[key] || 0;
                                        // Format key for display
                                        const displayName = key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                        return (
                                            <div key={key} className={`flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all ${qty > 0 ? 'bg-primary/5 border-primary/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`size-10 rounded-full flex items-center justify-center text-primary ${qty > 0 ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-light dark:bg-surface-dark'}`}>
                                                        <span className="material-symbols-outlined text-[20px]">
                                                            {/* Icons mapping could be enhanced, falling back to 'checkroom' */}
                                                            {key.includes('shirt') || key.includes('kaos') ? 'styler' :
                                                                key.includes('trouser') || key.includes('celana') ? 'checkroom' :
                                                                    key.includes('bed') || key.includes('sprei') ? 'bed' :
                                                                        key.includes('shoes') || key.includes('sepatu') ? 'hiking' : 'checkroom'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{displayName}</p>
                                                        <p className="text-xs text-slate-500">{formatIDR(price)} / ea</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 bg-surface-light dark:bg-surface-dark rounded-full p-1">
                                                    <button onClick={() => updateQuantity(key, -1)} disabled={qty === 0} className="size-7 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                                        <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                                    </button>
                                                    <span className={`font-bold text-sm w-4 text-center ${qty > 0 ? 'text-primary' : 'text-slate-400'}`}>{qty}</span>
                                                    <button onClick={() => updateQuantity(key, 1)} className="size-7 rounded-full bg-primary text-white shadow-sm flex items-center justify-center hover:bg-primary/90 transition-colors shadow-glow">
                                                        <span className="material-symbols-outlined text-sm font-bold">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}

                                {/* Show More / Less Button - Only show if not searching and list is long */}
                                {!searchQuery && Object.keys(prices).filter(k => k !== 'wash-fold-kg').length > 4 && (
                                    <button
                                        onClick={() => setShowAllItems(!showAllItems)}
                                        className="w-full py-2 text-sm font-semibold text-primary text-center hover:underline mt-1 flex items-center justify-center gap-1"
                                    >
                                        {showAllItems ? (
                                            <>Show Less <span className="material-symbols-outlined text-sm">expand_less</span></>
                                        ) : (
                                            <>View All Items <span className="material-symbols-outlined text-sm">expand_more</span></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Notes Section */}
                    <section>
                        <div className="relative">
                            <label className="sr-only" htmlFor="notes">Special Instructions</label>
                            <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                                <span className="material-symbols-outlined text-slate-400">edit_note</span>
                            </div>
                            <textarea
                                className="block w-full rounded-xl border-0 py-3 pl-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 dark:bg-slate-800 dark:ring-slate-700 dark:text-white bg-white resize-none"
                                id="notes" placeholder="Any special stains or instructions?" rows="2"
                            ></textarea>
                        </div>
                    </section>

                    {/* Step 3: Schedule */}
                    <section className="pb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pickup Time</h2>
                            <button className="text-xs font-semibold text-primary">Edit Date</button>
                        </div>
                        {/* Date Scroller */}
                        <div className="flex gap-3 overflow-x-auto no-scrollbar mb-5 pb-2">
                            {['Mon, 12', 'Tue, 13', 'Wed, 14', 'Thu, 15'].map((date, idx) => {
                                const day = date.split(',')[0].trim().toUpperCase();
                                const num = date.split(',')[1].trim();
                                const isActive = state.date === date;

                                return (
                                    <div key={idx} onClick={() => selectDate(date)}
                                        className={isActive
                                            ? "flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 border border-primary cursor-pointer shrink-0 transition-all"
                                            : "flex flex-col items-center justify-center min-w-[64px] h-20 rounded-2xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 cursor-pointer shrink-0 hover:border-primary/50 transition-all"}
                                    >
                                        <span className={`text-xs font-medium ${isActive ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
                                        <span className="text-xl font-bold">{num}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Time Slots Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => selectTime('8:00 - 10:00 AM')}
                                className={state.time === '8:00 - 10:00 AM'
                                    ? "relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5 text-primary font-bold text-sm transition-all"
                                    : "flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"}
                            >
                                <span className="material-symbols-outlined text-[18px]">wb_twilight</span>
                                8:00 - 10:00 AM
                                {state.time === '8:00 - 10:00 AM' && (
                                    <div className="absolute -top-2 -right-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">Popular</div>
                                )}
                            </button>
                            <button onClick={() => selectTime('12:00 - 2:00 PM')}
                                className={state.time === '12:00 - 2:00 PM'
                                    ? "relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5 text-primary font-bold text-sm transition-all"
                                    : "flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"}
                            >
                                <span className="material-symbols-outlined text-[18px]">sunny</span>
                                12:00 - 2:00 PM
                            </button>
                            <button onClick={() => selectTime('6:00 - 8:00 PM')}
                                className={state.time === '6:00 - 8:00 PM'
                                    ? "relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-primary bg-primary/5 text-primary font-bold text-sm transition-all"
                                    : "flex items-center justify-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-sm hover:border-slate-300 dark:hover:border-slate-600 transition-all"}
                            >
                                <span className="material-symbols-outlined text-[18px]">nights_stay</span>
                                6:00 - 8:00 PM
                            </button>
                            <button className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-transparent text-slate-400 font-medium text-sm">
                                More Slots...
                            </button>
                        </div>
                    </section>

                    {/* Step 4: Address Selection */}
                    <section className="pb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pickup Location</h2>
                        </div>
                        <div
                            onClick={() => setIsMapOpen(true)}
                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-primary">location_on</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{state.address}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Tap to choose on map</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400">chevron_right</span>
                            </div>
                        </div>
                    </section>
                </main>

                {/* Floating Footer CTA */}
                <div className="fixed bottom-0 left-0 right-0 z-30 max-w-md mx-auto">
                    <div className="h-8 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent w-full pointer-events-none"></div>
                    <div className="bg-background-light dark:bg-background-dark border-t border-slate-100 dark:border-slate-800 p-5 pt-2 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 font-medium">Estimated Total</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatIDR(calculateTotal())}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-secondary bg-secondary/10 px-2 py-1 rounded-full">
                                <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                                <span>Wallet: {userBalance !== null ? formatIDR(userBalance) : '...'}</span>
                            </div>
                        </div>
                        <button onClick={handleCheckout} className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-lg h-14 rounded-xl shadow-lift shadow-primary/30 flex items-center justify-between px-6 group transition-all transform active:scale-[0.98]">
                            <span>Checkout</span>
                            <div className="bg-white/20 p-1.5 rounded-lg group-hover:translate-x-1 transition-transform">
                                <span className="material-symbols-outlined block">arrow_forward</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Map Modal */}
                {isMapOpen && (
                    <div className="fixed inset-0 z-[60]">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMapOpen(false)}></div>
                        <div className="absolute bottom-0 sm:bottom-1/2 sm:translate-y-1/2 left-0 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-md w-full h-[80vh] sm:h-[600px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                                <h3 className="font-bold text-lg">Choose Location</h3>
                                <button onClick={() => setIsMapOpen(false)} className="size-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            <div className="relative flex-1 bg-slate-100 dark:bg-slate-800">
                                <div ref={mapRef} className="w-full h-full"></div>
                                {/* Center Marker */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 pb-8">
                                    <span className="material-symbols-outlined text-4xl text-primary drop-shadow-md">location_on</span>
                                </div>
                            </div>
                            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                                <button onClick={confirmLocation} className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30">
                                    Confirm Location
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out forwards;
                }
                 /* Reuse Dashboard glass nav styles if needed, but not present here */
             `}</style>
        </div>
    );
};

export default NewOrder;
