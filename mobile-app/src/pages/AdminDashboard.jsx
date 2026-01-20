import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');

    // Staff Creation State
    const [staffForm, setStaffForm] = useState({ username: '', fullName: '', password: '', email: '', permissions: [] });
    const [creatingStaff, setCreatingStaff] = useState(false);

    // Admin Check
    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { navigate('/login'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                alert("Access Denied: Admins Only");
                navigate('/dashboard');
            } else {
                setLoading(false);
                fetchData();
            }
        };
        checkAdmin();
    }, [navigate]);

    const fetchData = async () => {
        // Fetch Users
        const { data: usersData } = await supabase
            .from('profiles')
            .select('*')
            .order('updated_at', { ascending: false, nullsFirst: false });
        // Note: 'created_at' might not exist in profiles schema I wrote, checking 'updated_at'
        // Using updated_at for now.

        if (usersData) setUsers(usersData);

        // Fetch Transactions
        const { data: txData } = await supabase
            .from('wallet_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (txData) setTransactions(txData);
    };

    const handleAdjustBalance = async (userId, amount, description) => {
        if (!amount || isNaN(amount)) return alert("Invalid amount");

        try {
            const { error } = await supabase.rpc('admin_adjust_balance', {
                target_user_id: userId,
                amount_change: parseFloat(amount),
                description: description || 'Admin Adjustment'
            });

            if (error) throw error;

            alert("Balance adjusted successfully");
            fetchData(); // Refresh
        } catch (e) {
            console.error(e);
            alert("Error adjusting balance: " + e.message);
        }
    };

    const handleCreateStaff = async (e) => {
        e.preventDefault();
        if (!staffForm.username || !staffForm.password || !staffForm.fullName) return alert("Please fill all fields");

        setCreatingStaff(true);
        try {
            // Create a secondary client to avoid logging out the admin
            const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false // Don't persist this session
                }
            });

            const email = staffForm.email || `${staffForm.username.toLowerCase()}@laundrystaff.com`;

            const { data, error } = await tempClient.auth.signUp({
                email: email,
                password: staffForm.password,
                options: {
                    data: {
                        fullName: staffForm.fullName,
                        username: staffForm.username,
                        role: 'staff',
                        permissions: staffForm.permissions || []
                    }
                }
            });

            if (error) throw error;

            // Wait a sec for the trigger to run? Usually fast.
            // Wait a sec for the trigger to run? Usually fast.
            // Check if confirmation is required
            if (data.user && !data.session) {
                alert(`Staff ${staffForm.username} created, but EMAIL VERIFICATION is required by Supabase settings.\n\nIf you used a real email, please check your inbox.\nIf you used a Username, you MUST disable "Confirm Email" in Supabase Auth settings, or this account cannot login.`);
            } else {
                alert(`Staff ${staffForm.username} created successfully! You can login immediately.`);
            }

            setStaffForm({ username: '', fullName: '', password: '', email: '', permissions: [] });
            fetchData();

        } catch (error) {
            console.error(error);
            alert("Error creating staff: " + error.message);
        } finally {
            setCreatingStaff(false);
        }
    };

    // Filter Users
    const filteredUsers = users.filter(u =>
        (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (u.id || '').includes(searchTerm)
    );

    if (loading) return <div className="p-10 text-center">Checking Admin Privileges...</div>;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white font-display">
            {/* Navbar */}
            <div className="bg-white dark:bg-slate-800 shadow p-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-xl font-bold text-primary">Super Admin Dashboard</h1>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/dashboard')} className="text-sm font-medium hover:text-primary">Back to App</button>
                    <button onClick={fetchData} className="text-sm font-medium hover:text-primary">Refresh Data</button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                        <p className="text-sm text-slate-500 uppercase font-bold">Total Users</p>
                        <p className="text-4xl font-extrabold mt-2">{users.length}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                        <p className="text-sm text-slate-500 uppercase font-bold">Total Wallet Funds</p>
                        <p className="text-4xl font-extrabold mt-2 text-teal-600">
                            Rp {users.reduce((acc, curr) => acc + Number(curr.balance || 0), 0).toLocaleString('id-ID')}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm">
                        <p className="text-sm text-slate-500 uppercase font-bold">Total Transactions</p>
                        <p className="text-4xl font-extrabold mt-2">{transactions.length}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-4 px-2 font-bold transition-all ${activeTab === 'users' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`pb-4 px-2 font-bold transition-all ${activeTab === 'transactions' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        Global Transactions
                    </button>
                    <button
                        onClick={() => setActiveTab('staff')}
                        className={`pb-4 px-2 font-bold transition-all ${activeTab === 'staff' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'}`}
                    >
                        Staff Management
                    </button>
                </div>

                {/* Users Content */}
                {activeTab === 'users' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                className="w-full md:w-1/3 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase">
                                        <th className="p-4">User</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4 text-right">Balance</th>
                                        <th className="p-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map(user => (
                                        <tr key={user.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4">
                                                <div className="font-bold">{user.full_name || 'No Name'}</div>
                                                <div className="text-xs text-slate-500 font-mono">{user.id}</div>
                                                <div className="text-xs text-slate-400">{user.email || ''}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {user.role || 'customer'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold">
                                                Rp {(user.balance || 0).toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        const amount = prompt(`Adjust balance for ${user.full_name}. \nEnter amount (use (-) for deduction):`);
                                                        if (amount) handleAdjustBalance(user.id, amount, 'Manual Admin Adjustment');
                                                    }}
                                                    className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    Adjust Balance
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-xs text-slate-500 uppercase">
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">User ID</th>
                                        <th className="p-4 text-right">Amount</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-700 last:border-0">
                                            <td className="p-4 text-xs text-slate-500">
                                                {new Date(tx.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4">
                                                <span className="uppercase text-xs font-bold">{tx.type}</span>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-slate-400">
                                                {tx.user_id.slice(0, 8)}...
                                            </td>
                                            <td className={`p-4 text-right font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900 dark:text-white'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('id-ID')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${tx.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                                                {tx.description}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* Staff Management Content */}
                {activeTab === 'staff' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Create Staff Form */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
                            <h2 className="text-lg font-bold mb-4">Add New Staff</h2>
                            <form onSubmit={handleCreateStaff} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                    <input
                                        type="text"
                                        value={staffForm.username}
                                        onChange={e => setStaffForm({ ...staffForm, username: e.target.value.replace(/[^a-zA-Z0-9]/g, '') })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                                        placeholder="e.g. budi01"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">Only letters and numbers.</p>
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        value={staffForm.email}
                                        onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        placeholder="To verify account (overrides username email)"
                                    />
                                </div>

                                {/* Permissions */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Access Permissions</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1">
                                            <input
                                                type="checkbox"
                                                checked={staffForm.permissions?.includes('cashier')}
                                                onChange={e => {
                                                    const newPerms = e.target.checked
                                                        ? [...(staffForm.permissions || []), 'cashier']
                                                        : (staffForm.permissions || []).filter(p => p !== 'cashier');
                                                    setStaffForm({ ...staffForm, permissions: newPerms });
                                                }}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            />
                                            <div>
                                                <span className="block font-bold text-sm">Cashier</span>
                                                <span className="text-[10px] text-slate-400">Merchant App Access</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1">
                                            <input
                                                type="checkbox"
                                                checked={staffForm.permissions?.includes('production')}
                                                onChange={e => {
                                                    const newPerms = e.target.checked
                                                        ? [...(staffForm.permissions || []), 'production']
                                                        : (staffForm.permissions || []).filter(p => p !== 'production');
                                                    setStaffForm({ ...staffForm, permissions: newPerms });
                                                }}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            />
                                            <div>
                                                <span className="block font-bold text-sm">Production</span>
                                                <span className="text-[10px] text-slate-400">Production App Access</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors flex-1">
                                            <input
                                                type="checkbox"
                                                checked={staffForm.permissions?.includes('driver')}
                                                onChange={e => {
                                                    const newPerms = e.target.checked
                                                        ? [...(staffForm.permissions || []), 'driver']
                                                        : (staffForm.permissions || []).filter(p => p !== 'driver');
                                                    setStaffForm({ ...staffForm, permissions: newPerms });
                                                }}
                                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                                            />
                                            <div>
                                                <span className="block font-bold text-sm">Driver</span>
                                                <span className="text-[10px] text-slate-400">Driver App Access</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={staffForm.fullName}
                                        onChange={e => setStaffForm({ ...staffForm, fullName: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                                        placeholder="Full Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                    <input
                                        type="text"
                                        value={staffForm.password}
                                        onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono"
                                        placeholder="Strong Password"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={creatingStaff}
                                    className="w-full bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {creatingStaff ? 'Creating...' : 'Create Staff Account'}
                                </button>
                            </form>
                        </div>

                        {/* Staff List */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-6">
                            <h2 className="text-lg font-bold mb-4">Current Staff</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 uppercase">
                                            <th className="pb-2">Details</th>
                                            <th className="pb-2">Username</th>
                                            <th className="pb-2 text-right">Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {users.filter(u => u.role === 'staff').length === 0 ? (
                                            <tr><td colSpan="3" className="py-8 text-center text-slate-400">No staff found.</td></tr>
                                        ) : (
                                            users.filter(u => u.role === 'staff').map(staff => (
                                                <tr key={staff.id} className="group">
                                                    <td className="py-3">
                                                        <p className="font-bold">{staff.full_name}</p>
                                                        <p className="text-xs text-slate-400">{staff.email}</p>
                                                    </td>
                                                    <td className="py-3 font-mono text-sm text-primary font-bold">
                                                        {staff.username || staff.email.split('@')[0]}
                                                    </td>
                                                    <td className="py-3 text-right text-xs text-slate-500">
                                                        {new Date(staff.updated_at || Date.now()).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
