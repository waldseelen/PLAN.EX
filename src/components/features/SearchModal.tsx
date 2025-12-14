import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Calendar, CheckSquare, FileText, Search, Target, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useHabits } from '../../context/HabitsContext';
import { usePlanner } from '../../context/PlannerContext';
import { cn, debounce } from '../../lib/utils';
import { SearchResult } from '../../types';

const resultIcons = {
    course: BookOpen,
    unit: FileText,
    task: CheckSquare,
    exam: Calendar,
    habit: Target,
};

export function SearchModal() {
    const navigate = useNavigate();
    const { isSearchOpen, setIsSearchOpen } = useApp();
    const { state: plannerState } = usePlanner();
    const { state: habitsState } = useHabits();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Search function
    const performSearch = useCallback((searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        const q = searchQuery.toLowerCase();
        const searchResults: SearchResult[] = [];

        // Search courses
        plannerState.courses.forEach(course => {
            if (course.title.toLowerCase().includes(q) || course.code?.toLowerCase().includes(q)) {
                searchResults.push({
                    type: 'course',
                    id: course.id,
                    title: course.title,
                    subtitle: course.code,
                });
            }

            // Search units
            course.units.forEach(unit => {
                if (unit.title.toLowerCase().includes(q)) {
                    searchResults.push({
                        type: 'unit',
                        id: unit.id,
                        title: unit.title,
                        subtitle: course.title,
                        courseId: course.id,
                    });
                }

                // Search tasks
                unit.tasks.forEach(task => {
                    if (task.text.toLowerCase().includes(q)) {
                        searchResults.push({
                            type: 'task',
                            id: task.id,
                            title: task.text,
                            subtitle: `${course.title} > ${unit.title}`,
                            courseId: course.id,
                            unitId: unit.id,
                        });
                    }
                });
            });

            // Search exams
            course.exams.forEach(exam => {
                if (exam.title.toLowerCase().includes(q)) {
                    searchResults.push({
                        type: 'exam',
                        id: exam.id,
                        title: exam.title,
                        subtitle: course.title,
                        courseId: course.id,
                    });
                }
            });
        });

        // Search habits
        habitsState.habits.forEach(habit => {
            if (habit.title.toLowerCase().includes(q)) {
                searchResults.push({
                    type: 'habit',
                    id: habit.id,
                    title: habit.title,
                });
            }
        });

        setResults(searchResults.slice(0, 10));
        setSelectedIndex(0);
    }, [plannerState.courses, habitsState.habits]);

    // Debounced search
    const debouncedSearch = useMemo(
        () => debounce((q: string) => performSearch(q), 200),
        [performSearch]
    );

    useEffect(() => {
        debouncedSearch(query);
    }, [query, debouncedSearch]);

    // Reset on close
    useEffect(() => {
        if (!isSearchOpen) {
            setQuery('');
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isSearchOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isSearchOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % results.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                handleResultClick(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearchOpen, results, selectedIndex]);

    const handleResultClick = (result: SearchResult) => {
        setIsSearchOpen(false);

        switch (result.type) {
            case 'course':
            case 'unit':
            case 'task':
            case 'exam':
                navigate(`/courses/${result.courseId || result.id}`);
                break;
            case 'habit':
                navigate(`/habits/${result.id}`);
                break;
        }
    };

    const highlightMatch = (text: string) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">
                    {part}
                </mark>
            ) : (
                part
            )
        );
    };

    return (
        <AnimatePresence>
            {isSearchOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSearchOpen(false)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-[calc(100%-2rem)] max-w-xl"
                    >
                        <div className="bg-card border border-default rounded-xl shadow-lg overflow-hidden">
                            {/* Search Input */}
                            <div className="flex items-center gap-3 px-4 border-b border-default">
                                <Search className="w-5 h-5 text-secondary" />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ders, görev, sınav veya alışkanlık ara..."
                                    className="flex-1 py-4 bg-transparent text-primary placeholder:text-tertiary focus:outline-none"
                                    autoFocus
                                />
                                {query && (
                                    <button onClick={() => setQuery('')} className="p-1 hover:bg-secondary rounded">
                                        <X className="w-4 h-4 text-secondary" />
                                    </button>
                                )}
                            </div>

                            {/* Results */}
                            {results.length > 0 && (
                                <div className="max-h-[400px] overflow-y-auto py-2">
                                    {results.map((result, index) => {
                                        const Icon = resultIcons[result.type];
                                        return (
                                            <button
                                                key={`${result.type}-${result.id}`}
                                                onClick={() => handleResultClick(result)}
                                                className={cn(
                                                    'flex items-center gap-3 w-full px-4 py-3 text-left transition-colors',
                                                    index === selectedIndex ? 'bg-[var(--color-accent-light)]' : 'hover:bg-secondary'
                                                )}
                                            >
                                                <Icon className={cn('w-5 h-5', index === selectedIndex ? 'text-[var(--color-accent)]' : 'text-secondary')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn('font-medium truncate', index === selectedIndex ? 'text-[var(--color-accent)]' : 'text-primary')}>
                                                        {highlightMatch(result.title)}
                                                    </p>
                                                    {result.subtitle && (
                                                        <p className="text-sm text-secondary truncate">
                                                            {result.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-tertiary capitalize">{result.type}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Empty State */}
                            {query && results.length === 0 && (
                                <div className="py-12 text-center">
                                    <p className="text-secondary">Sonuç bulunamadı</p>
                                </div>
                            )}

                            {/* Keyboard hints */}
                            {!query && (
                                <div className="px-4 py-3 flex items-center justify-center gap-4 text-xs text-tertiary">
                                    <span><kbd className="px-1.5 py-0.5 bg-secondary rounded">↑↓</kbd> gezin</span>
                                    <span><kbd className="px-1.5 py-0.5 bg-secondary rounded">Enter</kbd> seç</span>
                                    <span><kbd className="px-1.5 py-0.5 bg-secondary rounded">Esc</kbd> kapat</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
