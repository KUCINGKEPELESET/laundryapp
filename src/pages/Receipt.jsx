import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { ReceiptBuilder } from '../utils/escpos';
import { Capacitor } from '@capacitor/core';

const Receipt = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!id) return;

            // Safely check auth
            const { data } = await supabase.auth.getUser();
            if (!data || !data.user) {
                // If checking receipt as public, ensure RLS allows it, or redirect to Login
                navigate('/staff/login');
                return;
            }
            const user = data.user;

            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            if (orderError) {
                console.error("Error fetching order:", orderError);
                alert("Could not load receipt: " + orderError.message);
                setLoading(false);
                return;
            }

            // Step 2: Fetch Profile manually to safely get the name
            let profileData = null;
            if (orderData.user_id) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('full_name, phone')
                    .eq('id', orderData.user_id)
                    .single();
                profileData = pData;
            }

            setOrder({ ...orderData, profiles: profileData });
            setLoading(false);
        };
        fetchOrder();
    }, [id, navigate]);

    const [nativeDevices, setNativeDevices] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [showDeviceModal, setShowDeviceModal] = useState(false);

    const formatIDR = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

    const handlePrint = () => {
        window.print();
    };

    // --- NATIVE BLUETOOTH (ANDROID) ---
    const handleNativePrint = () => {
        if (!window.bluetoothSerial) {
            alert("Bluetooth plugin not ready or not supported.");
            return;
        }
        setShowDeviceModal(true);
        listPairedDevices();
    };

    const listPairedDevices = () => {
        setIsScanning(true);
        window.bluetoothSerial.list(
            (devices) => {
                setNativeDevices(devices);
                setIsScanning(false);
            },
            (err) => {
                // Even if list fails, we stop scanning
                setIsScanning(false);
            }
        );
    };

    const scanUnpairedDevices = () => {
        setIsScanning(true);
        setNativeDevices([]); // Clear list to show we are searching fresh
        window.bluetoothSerial.discoverUnpaired(
            (devices) => {
                setNativeDevices(devices);
                setIsScanning(false);
            },
            (err) => {
                console.error(err);
                setIsScanning(false);
                alert("Scan failed: " + err);
            }
        );
    };

    const connectAndPrintNative = (address) => {
        setIsScanning(true); // Re-use loading state
        window.bluetoothSerial.connect(
            address,
            () => {
                // Connected!
                printNativeSequence();
            },
            (err) => {
                setIsScanning(false);
                alert("Connection failed: " + err);
            }
        );
    };

    const printNativeSequence = () => {
        try {
            const builder = new ReceiptBuilder();
            // Header
            builder.init()
                .align('center')
                .bold(true).textLn('SUPERZY LAUNDRY').bold(false)
                .textLn('123 Clean Street, JKT')
                .textLn('WA: 0812-3456-7890')
                .textLn('--------------------------------')
                .align('left'); // ... rest of builder

            // Re-create the builder logic (duplicated for safety to access current scope)
            // Ideally extract to helper, but for now inline to ensure access to 'order' vars
            builder.textLn(`Date: ${fmtDate(dateIn)}`)
                .textLn(`Est.: ${fmtDate(dateOut)}`)
                .textLn(`Order: ${order.id.slice(0, 8)}`)
                .textLn(`Cust: ${customerName}`)
                .textLn('--------------------------------');

            if (order.service === 'Wash & Fold') {
                builder.textLn(`Wash & Fold (${order.weight}kg)`);
                builder.align('right').textLn(formatIDR(order.total || 0)).align('left');
            } else if (order.items) {
                Object.entries(order.items).forEach(([item, qty]) => {
                    if (qty > 0) {
                        const lineTotal = (prices[item] || 0) * qty;
                        builder.textLn(`${item} x${qty}`);
                        builder.align('right').textLn(formatIDR(lineTotal)).align('left');
                    }
                });
            }

            builder.textLn('--------------------------------')
                .align('right')
                .bold(true).textLn(`TOTAL: ${formatIDR(order.total || 0)}`).bold(false)
                .align('left')
                .textLn(`Status: ${order.status === 'Completed' ? 'PAID' : 'PENDING'}`)
                .align('center')
                .feed(1)
                .textLn('Thank you for trusting us!')
                .feed(3)
                .cut();

            const data = builder.getData();
            window.bluetoothSerial.write(data, () => {
                window.bluetoothSerial.disconnect();
                setIsScanning(false);
                setShowDeviceModal(false);
                alert("Printed Successfully!");
            }, (err) => {
                setIsScanning(false);
                alert("Write failed: " + err);
                window.bluetoothSerial.disconnect();
            });
        } catch (e) {
            alert("Error building receipt: " + e.message);
            setIsScanning(false);
        }
    };

    const handleSmartPrint = () => {
        if (Capacitor.isNativePlatform()) {
            handleNativePrint();
        } else {
            handleWebBluetoothPrint(); // Legacy Web BLE
        }
    };

    // --- WEB BLUETOOTH (LEGACY) ---
    const handleWebBluetoothPrint = async () => {
        if (!order) {
            console.error("No order loaded to print");
            return;
        }

        try {
            console.log("Requesting Bluetooth Device...");
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
                acceptAllDevices: false
            }).catch(err => {
                console.log("Filter failed, trying generic...", err);
                if (err.name !== 'NotFoundError' && err.message !== 'User cancelled the requestDevice() chooser.') {
                    return navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] });
                }
                throw err;
            });

            console.log("Device selected:", device.name);
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            // Build Receipt Data
            const builder = new ReceiptBuilder();
            builder.init()
                .align('center')
                .bold(true).textLn('SUPERZY LAUNDRY').bold(false)
                .textLn('123 Clean Street, JKT')
                .textLn('WA: 0812-3456-7890')
                .textLn('--------------------------------')
                .align('left')
                .textLn(`Date: ${fmtDate(dateIn)}`)
                .textLn(`Est.: ${fmtDate(dateOut)}`)
                .textLn(`Order: ${order.id.slice(0, 8)}`)
                .textLn(`Cust: ${customerName}`)
                .textLn('--------------------------------');

            // Items
            if (order.service === 'Wash & Fold') {
                builder.textLn(`Wash & Fold (${order.weight}kg)`);
                builder.align('right').textLn(formatIDR(order.total || 0)).align('left');
            } else if (order.items) {
                Object.entries(order.items).forEach(([item, qty]) => {
                    if (qty > 0) {
                        const lineTotal = (prices[item] || 0) * qty;
                        builder.textLn(`${item} x${qty}`);
                        builder.align('right').textLn(formatIDR(lineTotal)).align('left');
                    }
                });
            }

            builder.textLn('--------------------------------')
                .align('right')
                .bold(true).textLn(`TOTAL: ${formatIDR(order.total || 0)}`).bold(false)
                .align('left')
                .textLn(`Status: ${order.status === 'Completed' ? 'PAID' : 'PENDING'}`)
                .align('center')
                .feed(1)
                .textLn('Thank you for trusting us!')
                .feed(3)
                .cut();

            // Send Data (Chunking for BLE limitations)
            const data = builder.getData();
            const MAX_CHUNK = 100;
            for (let i = 0; i < data.length; i += MAX_CHUNK) {
                const chunk = data.slice(i, i + MAX_CHUNK);
                await characteristic.writeValue(chunk);
            }

            device.gatt.disconnect();
            alert("Sent to printer!");

        } catch (err) {
            console.error(err);
            alert("Bluetooth Print Failed: " + err.message + "\n\nNote: This only works with BLE printers. Use the standard Print button for older bluetooth printers.");
        }
    };

    const fmtDate = (d) => d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    if (loading) return <div className="flex h-screen items-center justify-center font-mono">Loading Receipt...</div>;
    if (!order) return <div className="flex h-screen items-center justify-center font-mono">Order not found.</div>;

    // View Helpers
    const prices = {
        'shirt': 15000,
        'trousers': 20000,
        'wash-fold-kg': 6000,
        'suit': 50000,
        'bedsheet': 25000
    };

    const dateIn = new Date(order.created_at || new Date().toISOString());
    const dateOut = new Date(dateIn.getTime() + (48 * 60 * 60 * 1000));
    const customerName = order.profiles?.full_name || order.userName || order.user_name || 'Guest Customer';

    return (
        <div className="receipt-body min-h-screen bg-[#eee] p-5 flex justify-center font-mono text-black">
            {/* Print Buttons */}
            <div className="no-print absolute top-5 left-5 z-50 flex flex-col gap-3">
                <button onClick={handlePrint} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 flex items-center gap-2">
                    <span className="material-symbols-outlined">print</span>
                    Print (System Dialog)
                </button>
                <button onClick={handleSmartPrint} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center gap-2">
                    <span className="material-symbols-outlined">bluetooth</span>
                    {Capacitor.isNativePlatform() ? 'Connect Printer' : 'Connect & Print (BLE)'}
                </button>
                <div className="text-[10px] text-gray-500 max-w-[200px] bg-white/50 p-2 rounded border border-gray-200 backdrop-blur-sm">
                    {Capacitor.isNativePlatform()
                        ? "Tap Blue Button to find paired Bluetooth printers (Native)."
                        : "Blue button is for BLE only. Use System Dialog for others."}
                </div>
            </div>

            {/* Native Device Modal */}
            {showDeviceModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 font-sans print:hidden">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg">Select Printer</h3>
                                <p className="text-[10px] text-slate-500">Tap to connect</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={scanUnpairedDevices} disabled={isScanning} className="size-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200" title="Scan for new devices">
                                    <span className={`material-symbols-outlined text-sm ${isScanning ? 'animate-spin' : ''}`}>refresh</span>
                                </button>
                                <button onClick={() => setShowDeviceModal(false)} className="size-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                            {isScanning ? (
                                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined animate-spin text-3xl mb-2">refresh</span>
                                    <p className="text-sm">Scanning nearby devices...</p>
                                    <p className="text-xs">This may take 10-15 seconds</p>
                                </div>
                            ) : nativeDevices.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    <span className="material-symbols-outlined text-3xl mb-2">bluetooth_searching</span>
                                    <p className="text-sm">No printers found.</p>
                                    <button onClick={scanUnpairedDevices} className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-800 underline">
                                        Scan for Unpaired Devices
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {nativeDevices.map((d, i) => (
                                        <button
                                            key={i}
                                            onClick={() => connectAndPrintNative(d.address)}
                                            className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50 active:bg-blue-50 transition-colors flex items-center gap-3"
                                        >
                                            <span className="material-symbols-outlined text-slate-400">print</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-800 truncate">{d.name || "Unknown Device"}</p>
                                                <p className="text-xs text-slate-400 font-mono">{d.address}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-slate-300 text-sm">chevron_right</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Container */}
            <div id="receipt" className="bg-white w-[58mm] min-h-[100mm] p-[5px] shadow-2xl relative">
                {/* Header / Logo */}
                <div className="header text-center mb-[10px] border-b border-dashed border-black pb-[10px]">
                    {/* QR Code */}
                    <div className="flex justify-center mb-4 mt-2 print:mb-2 print:mt-0">
                        <QRCodeSVG value={order.id} size={100} level={"M"} includeMargin={false} />
                    </div>
                    <h1 className="text-[16px] uppercase font-bold mb-[2px]">Superzy Laundry</h1>
                    <p className="text-[10px] leading-[1.2]">123 Clean Street, Downtown, Jakarta</p>
                    <p className="text-[10px] leading-[1.2]">WA: 0812-3456-7890</p>
                </div>

                {/* Order Metadata */}
                <div className="info mb-[10px] text-[10px] leading-[1.4] border-b border-dashed border-black pb-[10px]">
                    <div className="flex justify-between">
                        <span>Order ID:</span>
                        <span className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Customer:</span>
                        <span className="font-bold text-right w-[60%] truncate">{customerName}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>In:</span>
                        <span>{fmtDate(dateIn)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>Est. Ready:</span>
                        <span className="font-bold">{fmtDate(dateOut)}</span>
                    </div>
                </div>

                {/* Items Table */}
                <div className="items mb-[10px] text-[10px] border-b border-dashed border-black pb-[10px]">
                    <div className="font-bold uppercase text-center mb-2 border-b border-black pb-1">
                        {order.service} Package
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left font-bold w-[50%]">Item</th>
                                <th className="text-center font-bold w-[15%]">Qty</th>
                                <th className="text-right font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.service === 'Wash & Fold' ? (
                                <tr>
                                    <td className="py-1">Laundry (Kg)</td>
                                    <td className="text-center py-1">{order.weight}</td>
                                    <td className="text-right py-1">{formatIDR(order.total || 0)}</td>
                                </tr>
                            ) : (
                                order.items && Object.entries(order.items).map(([item, qty]) => {
                                    if (qty > 0) {
                                        const price = prices[item] || 0;
                                        const lineTotal = price * qty;
                                        // Auto-capitalize
                                        const name = item.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                        return (
                                            <tr key={item}>
                                                <td className="py-1 align-top leading-tight pr-1">{name}</td>
                                                <td className="text-center py-1 align-top">{qty}</td>
                                                <td className="text-right py-1 align-top">{formatIDR(lineTotal)}</td>
                                            </tr>
                                        )
                                    }
                                    return null;
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="totals mt-[5px] text-[11px] font-bold">
                    <div className="flex justify-between mb-[2px]">
                        <span>TOTAL</span>
                        <span>{formatIDR(order.total || 0)}</span>
                    </div>
                    <div className="flex justify-between mb-[2px] text-[10px] font-normal">
                        <span>Payment Status</span>
                        <span>{order.status === 'Completed' ? 'PAID' : 'PENDING'}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="footer mt-[20px] text-center text-[10px] pb-4">
                    <p className="mb-2">Thank you for choosing Superzy!</p>
                    <p className="text-[8px] text-gray-500">save this receipt for collection</p>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 0; size: 58mm 100mm; } /* Try to force 58mm paper size */
                    body { margin: 0; padding: 0; background: white; }
                    .receipt-body { padding: 0; margin: 0; background: white; width: 100%; display: block; }
                    .no-print { display: none !important; }
                    #receipt {
                        width: 100% !important;
                        max-width: 100% !important;
                        box-shadow: none !important;
                        padding: 0 4px !important; /* Tiny padding for safe zone */
                        margin: 0 !important;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;   /* Chrome, Safari */
                        color-adjust: exact !important;                 /*Firefox*/
                    }
                }
            `}</style>
        </div>
    );
};

export default Receipt;
