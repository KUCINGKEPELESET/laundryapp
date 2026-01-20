import React from 'react';

// Basic layout wrapper, we might make this more complex later
const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased transition-colors duration-200">
            {children}
        </div>
    );
};

export default Layout;
