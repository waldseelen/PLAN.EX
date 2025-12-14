import { AnimatePresence, motion } from 'framer-motion';
import {
    BarChart3,
    BookOpen,
    Calendar,
    ChevronLeft,
    Download,
    LayoutDashboard,
    ListTodo,
    Menu,
    Moon,
    Search,
    Settings,
    Sun,
    Target,
    Timer,
    X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const plannerNavItems: NavItem[] = [
    { path: '/', label: 'Genel Bakış', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/courses', label: 'Dersler', icon: <BookOpen className="w-5 h-5" /> },
    { path: '/calendar', label: 'Takvim', icon: <Calendar className="w-5 h-5" /> },
    { path: '/statistics', label: 'İstatistikler', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/productivity', label: 'Üretkenlik', icon: <Timer className="w-5 h-5" /> },
    { path: '/personal', label: 'Kişisel Görevler', icon: <ListTodo className="w-5 h-5" /> },
];

const habitsNavItems: NavItem[] = [
    { path: '/habits', label: 'Alışkanlıklar', icon: <Target className="w-5 h-5" /> },
];

export function Sidebar() {
    const location = useLocation();
    const { isDarkMode, toggleTheme, setIsSearchOpen, setIsSettingsOpen, backupWarning } = useApp();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const renderNavItem = (item: NavItem) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileOpen(false)}
            className={({ isActive }) =>
                cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                        : 'text-secondary hover:bg-secondary hover:text-primary'
                )
            }
        >
            {item.icon}
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
        </NavLink>
    );

    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center justify-between px-4 py-5 border-b border-default">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                            <span className="text-white font-bold text-lg">P</span>
                        </div>
                        <span className="text-xl font-bold text-primary">Plan.Ex</span>
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors hidden lg:block"
                >
                    <ChevronLeft className={cn('w-5 h-5 text-secondary transition-transform', isCollapsed && 'rotate-180')} />
                </button>
                <button
                    onClick={() => setIsMobileOpen(false)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden"
                >
                    <X className="w-5 h-5 text-secondary" />
                </button>
            </div>

            {/* Quick Actions */}
            <div className="px-3 py-4 border-b border-default">
                <button
                    onClick={() => {
                        setIsSearchOpen(true);
                        setIsMobileOpen(false);
                    }}
                    className={cn(
                        'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg',
                        'bg-secondary text-secondary hover:text-primary transition-colors'
                    )}
                >
                    <Search className="w-5 h-5" />
                    {!isCollapsed && (
                        <>
                            <span className="flex-1 text-left text-sm">Ara...</span>
                            <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs bg-card rounded border border-default">
                                Ctrl+K
                            </kbd>
                        </>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                    {!isCollapsed && (
                        <p className="px-3 py-2 text-xs font-semibold text-tertiary uppercase tracking-wider">
                            Planlayıcı
                        </p>
                    )}
                    {plannerNavItems.map(renderNavItem)}
                </div>

                <div className="mt-6 space-y-1">
                    {!isCollapsed && (
                        <p className="px-3 py-2 text-xs font-semibold text-tertiary uppercase tracking-wider">
                            Alışkanlıklar
                        </p>
                    )}
                    {habitsNavItems.map(renderNavItem)}
                </div>
            </nav>

            {/* Bottom Actions */}
            <div className="px-3 py-4 border-t border-default space-y-2">
                {/* Backup Warning */}
                {backupWarning && !isCollapsed && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                        <Download className="w-4 h-4" />
                        <span className="text-xs">Yedekleme önerilir</span>
                    </div>
                )}

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-secondary hover:bg-secondary hover:text-primary transition-colors"
                >
                    {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!isCollapsed && <span className="font-medium">{isDarkMode ? 'Açık Tema' : 'Koyu Tema'}</span>}
                </button>

                {/* Settings */}
                <button
                    onClick={() => {
                        setIsSettingsOpen(true);
                        setIsMobileOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-secondary hover:bg-secondary hover:text-primary transition-colors"
                >
                    <Settings className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Ayarlar</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileOpen(true)}
                className="fixed top-4 left-4 z-40 p-2 rounded-lg bg-card border border-default shadow-md lg:hidden"
            >
                <Menu className="w-6 h-6 text-primary" />
            </button>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isMobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            className="fixed left-0 top-0 z-50 h-full w-[280px] bg-card border-r border-default lg:hidden"
                        >
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    'hidden lg:flex flex-col fixed left-0 top-0 h-full bg-card border-r border-default z-30 transition-all duration-300',
                    isCollapsed ? 'w-[72px]' : 'w-[260px]'
                )}
            >
                {sidebarContent}
            </aside>

            {/* Spacer for content */}
            <div className={cn('hidden lg:block transition-all duration-300', isCollapsed ? 'w-[72px]' : 'w-[260px]')} />
        </>
    );
}
