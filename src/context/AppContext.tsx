import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../lib/storage';
import { generateId } from '../lib/utils';
import { AppSettings, DEFAULT_APP_SETTINGS, Toast } from '../types';

// ================== CONTEXT ==================

interface AppContextValue {
    // Settings
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;

    // Theme
    isDarkMode: boolean;
    toggleTheme: () => void;

    // Toasts
    toasts: Toast[];
    addToast: (type: Toast['type'], message: string, duration?: number) => void;
    removeToast: (id: string) => void;

    // Modals
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (open: boolean) => void;

    // Backup warning
    backupWarning: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

// ================== PROVIDER ==================

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [backupWarning, setBackupWarning] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadedSettings = getSettings();
        setSettings(loadedSettings);

        // Check backup warning
        if (loadedSettings.lastBackupISO) {
            const lastBackup = new Date(loadedSettings.lastBackupISO);
            const daysSinceBackup = Math.floor(
                (Date.now() - lastBackup.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceBackup >= 7) {
                setBackupWarning(true);
            }
        } else {
            setBackupWarning(true);
        }
    }, []);

    // Apply theme
    useEffect(() => {
        const applyTheme = () => {
            const root = document.documentElement;

            if (settings.theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                root.classList.toggle('dark', prefersDark);
            } else {
                root.classList.toggle('dark', settings.theme === 'dark');
            }
        };

        applyTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (settings.theme === 'system') {
                applyTheme();
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [settings.theme]);

    // Update settings
    const updateSettings = useCallback((updates: Partial<AppSettings>) => {
        setSettings(prev => {
            const newSettings = { ...prev, ...updates };
            saveSettings(newSettings);
            return newSettings;
        });
    }, []);

    // Theme
    const isDarkMode = useMemo(() => {
        if (settings.theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return settings.theme === 'dark';
    }, [settings.theme]);

    const toggleTheme = useCallback(() => {
        const newTheme = isDarkMode ? 'light' : 'dark';
        updateSettings({ theme: newTheme });
    }, [isDarkMode, updateSettings]);

    // Toasts
    const addToast = useCallback((type: Toast['type'], message: string, duration: number = 4000) => {
        const toast: Toast = {
            id: generateId(),
            type,
            message,
            duration,
        };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+K - Search
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }

            // Ctrl+, - Settings
            if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                setIsSettingsOpen(true);
            }

            // Ctrl+Shift+D - Theme toggle
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleTheme();
            }

            // Escape - Close modals
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
                setIsSettingsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleTheme]);

    const value = useMemo<AppContextValue>(
        () => ({
            settings,
            updateSettings,
            isDarkMode,
            toggleTheme,
            toasts,
            addToast,
            removeToast,
            isSearchOpen,
            setIsSearchOpen,
            isSettingsOpen,
            setIsSettingsOpen,
            backupWarning,
        }),
        [
            settings,
            updateSettings,
            isDarkMode,
            toggleTheme,
            toasts,
            addToast,
            removeToast,
            isSearchOpen,
            isSettingsOpen,
            backupWarning,
        ]
    );

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ================== HOOK ==================

export function useApp(): AppContextValue {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}
