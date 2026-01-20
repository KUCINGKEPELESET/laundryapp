import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import GlobalError from './components/GlobalError';

// Placeholder Pages (we will implement these next)
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import OrderTracking from './pages/OrderTracking';
import Profile from './pages/Profile';
import MerchantDashboard from './pages/MerchantDashboard';
import Receipt from './pages/Receipt';
import Payment from './pages/Payment';
import Wallet from './pages/Wallet';
import AdminDashboard from './pages/AdminDashboard';
import Production from './pages/Production';
import Orders from './pages/Orders';
import StaffLogin from './pages/StaffLogin';
import StaffDashboard from './pages/StaffDashboard';
import DriverDashboard from './pages/DriverDashboard';


function App() {
  return (
    <GlobalError>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new-order" element={<NewOrder />} />
            <Route path="/tracking/:id" element={<OrderTracking />} />

            <Route path="/profile" element={<Profile />} />
            <Route path="/merchant" element={<MerchantDashboard />} />
            <Route path="/receipt/:id" element={<Receipt />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/production" element={<Production />} />
            <Route path="/orders" element={<Orders />} />

            {/* Staff Routes */}
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/driver" element={<DriverDashboard />} />
          </Routes>
        </Layout>
      </Router>
    </GlobalError>
  );
}

export default App;
