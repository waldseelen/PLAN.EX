import React from 'react';
import { SearchModal } from '../features/SearchModal';
import { SettingsModal } from '../features/SettingsModal';
import { ToastContainer } from '../ui/Toast';
import { Sidebar } from './Sidebar';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="flex min-h-screen bg-primary">
            <Sidebar />
            <main className="flex-1 lg:ml-0 min-h-screen">
                <div className="container mx-auto px-4 py-6 lg:py-8 pt-16 lg:pt-8">
                    {children}
                </div>
            </main>
            <ToastContainer />
            <SearchModal />
            <SettingsModal />
        </div>
    );
}
