import { AnimatePresence, motion } from 'framer-motion';
import {
    BookOpen,
    Calendar,
    LayoutDashboard,
    Menu,
    Moon,
    Search,
    Settings,
    Sun,
    Target,
    Timer,
    X
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { path: '/', label: 'Genel Bakış', icon: <LayoutDashboard className="w-5 h-5" /> },
    { path: '/courses', label: 'Dersler', icon: <BookOpen className="w-5 h-5" /> },
    { path: '/calendar', label: 'Takvim', icon: <Calendar className="w-5 h-5" /> },
    { path: '/habits', label: 'Alışkanlıklar', icon: <Target className="w-5 h-5" /> },
];

interface TopBarProps {
    onPomodoroToggle: () => void;
    isPomodoroOpen: boolean;
}

export function TopBar({ onPomodoroToggle, isPomodoroOpen }: TopBarProps) {
    const location = useLocation();
    const { isDarkMode, toggleTheme, setIsSearchOpen, setIsSettingsOpen } = useApp();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const renderNavItem = (item: NavItem, mobile = false) => (
        <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
                cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium',
                    mobile ? 'w-full' : '',
                    isActive
                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                        : 'text-secondary hover:bg-secondary hover:text-primary'
                )
            }
        >
            {item.icon}
            <span>{item.label}</span>
        </NavLink>
    );

    return (
        <>
            {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-default">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                                <span className="text-white font-bold text-lg">P</span>
                            </div>
                            <span className="text-xl font-bold text-primary hidden sm:block">Plan.Ex</span>
                            <span className="text-sm text-secondary ml-2 hidden lg:block">
                                {new Date().toLocaleDateString('tr-TR', {
                                    day: 'numeric',
                                    month: 'long',
                                    weekday: 'long',
                                })}
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map(item => renderNavItem(item))}
                        </nav>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2">
                            {/* Search Button */}
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary hover:text-primary transition-colors"
                                title="Ara (Ctrl+K)"
                            >
                                <Search className="w-5 h-5" />
                                <span className="hidden lg:inline text-sm">Ara...</span>
                            </button>

                            {/* Pomodoro Toggle */}
                            <button
                                onClick={onPomodoroToggle}
                                className={cn(
                                    'p-2 rounded-lg transition-colors',
                                    isPomodoroOpen
                                        ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                                        : 'text-secondary hover:bg-secondary hover:text-primary'
                                )}
                                title="Pomodoro Zamanlayıcı (Ctrl+P)"
                            >
                                <Timer className="w-5 h-5" />
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg text-secondary hover:bg-secondary hover:text-primary transition-colors"
                                title={isDarkMode ? 'Açık Tema' : 'Koyu Tema'}
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>

                            {/* Settings */}
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 rounded-lg text-secondary hover:bg-secondary hover:text-primary transition-colors"
                                title="Ayarlar"
                            >
                                <Settings className="w-5 h-5" />
                            </button>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="p-2 rounded-lg text-secondary hover:bg-secondary hover:text-primary transition-colors md:hidden"
                            >
                                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Dropdown */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                            style={{ top: '64px' }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="fixed left-0 right-0 z-50 bg-card border-b border-default shadow-lg md:hidden"
                            style={{ top: '64px' }}
                        >
                            <nav className="p-4 space-y-1">
                                {navItems.map(item => renderNavItem(item, true))}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
