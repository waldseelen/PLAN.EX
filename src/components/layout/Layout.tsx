import React, { useEffect, useState } from 'react';
import { PomodoroDrawer } from '../features/PomodoroDrawer';
import { SearchModal } from '../features/SearchModal';
import { SettingsModal } from '../features/SettingsModal';
import { ToastContainer } from '../ui/Toast';
import { TopBar } from './TopBar';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);

    // Keyboard shortcut for Pomodoro (Ctrl+P)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                setIsPomodoroOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="min-h-screen bg-primary">
            <TopBar
                onPomodoroToggle={() => setIsPomodoroOpen(prev => !prev)}
                isPomodoroOpen={isPomodoroOpen}
            />
            <main className="min-h-screen pt-16">
                <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
                    {children}
                </div>
            </main>
            <ToastContainer />
            <SearchModal />
            <SettingsModal />
            <PomodoroDrawer isOpen={isPomodoroOpen} onClose={() => setIsPomodoroOpen(false)} />
        </div>
    );
}
