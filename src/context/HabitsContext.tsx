import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import {
    deleteHabitLogsByHabitId,
    getAllHabitLogs,
    getHabits,
    saveHabitLog,
    saveHabits
} from '../lib/storage';
import {
    calculateHabitScore,
    calculateHabitStreak,
    debounce,
    generateId,
    getToday,
    getWeeklyProgress,
    isHabitCompleted,
    isHabitDueOnDate,
} from '../lib/utils';
import {
    FrequencyRule,
    Habit,
    HABIT_COLORS,
    HabitLog,
    HabitType,
    LIMITS
} from '../types';

// ================== STATE ==================

interface HabitsState {
    habits: Habit[];
    habitLogs: Map<string, HabitLog[]>; // habitId -> logs
    isLoading: boolean;
    error: string | null;
}

const initialState: HabitsState = {
    habits: [],
    habitLogs: new Map(),
    isLoading: true,
    error: null,
};

// ================== ACTIONS ==================

type HabitsAction =
    | { type: 'LOAD_DATA'; payload: { habits: Habit[]; habitLogs: Map<string, HabitLog[]> } }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'ADD_HABIT'; payload: Habit }
    | { type: 'UPDATE_HABIT'; payload: { id: string; updates: Partial<Habit> } }
    | { type: 'DELETE_HABIT'; payload: string }
    | { type: 'ARCHIVE_HABIT'; payload: string }
    | { type: 'UNARCHIVE_HABIT'; payload: string }
    | { type: 'LOG_HABIT'; payload: HabitLog }
    | { type: 'REORDER_HABITS'; payload: Habit[] }
    | { type: 'IMPORT_HABITS'; payload: { habits: Habit[]; logs: HabitLog[] } };

// ================== REDUCER ==================

function habitsReducer(state: HabitsState, action: HabitsAction): HabitsState {
    switch (action.type) {
        case 'LOAD_DATA':
            return { ...state, ...action.payload, isLoading: false };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        case 'ADD_HABIT':
            return { ...state, habits: [...state.habits, action.payload] };

        case 'UPDATE_HABIT':
            return {
                ...state,
                habits: state.habits.map(h =>
                    h.id === action.payload.id
                        ? { ...h, ...action.payload.updates, updatedAt: new Date().toISOString() }
                        : h
                ),
            };

        case 'DELETE_HABIT': {
            const newLogs = new Map(state.habitLogs);
            newLogs.delete(action.payload);
            return {
                ...state,
                habits: state.habits.filter(h => h.id !== action.payload),
                habitLogs: newLogs,
            };
        }

        case 'ARCHIVE_HABIT':
            return {
                ...state,
                habits: state.habits.map(h =>
                    h.id === action.payload
                        ? { ...h, isArchived: true, updatedAt: new Date().toISOString() }
                        : h
                ),
            };

        case 'UNARCHIVE_HABIT':
            return {
                ...state,
                habits: state.habits.map(h =>
                    h.id === action.payload
                        ? { ...h, isArchived: false, updatedAt: new Date().toISOString() }
                        : h
                ),
            };

        case 'LOG_HABIT': {
            const { habitId, dateISO } = action.payload;
            const existingLogs = state.habitLogs.get(habitId) || [];
            const filteredLogs = existingLogs.filter(l => l.dateISO !== dateISO);
            const newLogs = new Map(state.habitLogs);
            newLogs.set(habitId, [...filteredLogs, action.payload]);
            return { ...state, habitLogs: newLogs };
        }

        case 'REORDER_HABITS':
            return { ...state, habits: action.payload };

        case 'IMPORT_HABITS': {
            const newLogs = new Map<string, HabitLog[]>();
            action.payload.logs.forEach(log => {
                const existing = newLogs.get(log.habitId) || [];
                newLogs.set(log.habitId, [...existing, log]);
            });
            return {
                ...state,
                habits: action.payload.habits,
                habitLogs: newLogs,
            };
        }

        default:
            return state;
    }
}

// ================== CONTEXT ==================

interface HabitWithStats {
    habit: Habit;
    isDueToday: boolean;
    isCompletedToday: boolean;
    currentStreak: number;
    bestStreak: number;
    longestStreak: number;
    totalCompletions: number;
    score: number;
    weeklyProgress: { completed: number; target: number };
}

interface HabitsContextValue {
    state: HabitsState;
    // CRUD
    addHabit: (habitData: {
        title: string;
        description?: string;
        emoji?: string;
        type: HabitType;
        frequency: FrequencyRule;
        target?: number;
        unit?: string;
        color?: string;
    }) => void;
    updateHabit: (id: string, updates: Partial<Habit>) => void;
    deleteHabit: (id: string) => Promise<void>;
    archiveHabit: (id: string) => void;
    unarchiveHabit: (id: string) => void;
    // Logging
    logHabit: (habitId: string, dateISO: string, done?: boolean, value?: number) => Promise<void>;
    // Reorder
    reorderHabits: (habits: Habit[]) => void;
    // Computed
    getHabitWithStats: (habitId: string) => HabitWithStats | null;
    getTodayHabits: () => HabitWithStats[];
    getArchivedHabits: () => Habit[];
    getHabitLogs: (habitId: string) => HabitLog[];
    // Import
    importHabits: (habits: Habit[], logs: HabitLog[]) => void;
}

const HabitsContext = createContext<HabitsContextValue | null>(null);

// ================== PROVIDER ==================

export function HabitsProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(habitsReducer, initialState);

    // Load data on mount
    useEffect(() => {
        async function loadData() {
            try {
                const habits = getHabits();
                const allLogs = await getAllHabitLogs();

                const habitLogs = new Map<string, HabitLog[]>();
                allLogs.forEach(log => {
                    const existing = habitLogs.get(log.habitId) || [];
                    habitLogs.set(log.habitId, [...existing, log]);
                });

                dispatch({ type: 'LOAD_DATA', payload: { habits, habitLogs } });
            } catch (error) {
                console.error('Failed to load habits data:', error);
                dispatch({ type: 'SET_ERROR', payload: 'Alışkanlık verileri yüklenemedi.' });
            }
        }

        loadData();
    }, []);

    // Auto-save habits with debounce
    const debouncedSaveHabits = useMemo(
        () => debounce(() => saveHabits(state.habits), 500),
        [state.habits]
    );

    useEffect(() => {
        if (!state.isLoading) {
            debouncedSaveHabits();
        }
    }, [state.habits, state.isLoading, debouncedSaveHabits]);

    // Actions
    const addHabit = useCallback(
        (habitData: {
            title: string;
            description?: string;
            emoji?: string;
            type: HabitType;
            frequency: FrequencyRule;
            target?: number;
            unit?: string;
            color?: string;
        }) => {
            if (state.habits.length >= LIMITS.MAX_HABITS) {
                dispatch({ type: 'SET_ERROR', payload: `Maksimum ${LIMITS.MAX_HABITS} alışkanlık ekleyebilirsiniz.` });
                return;
            }

            const colorIndex = state.habits.length % HABIT_COLORS.length;
            const habit: Habit = {
                id: generateId(),
                title: habitData.title,
                description: habitData.description,
                emoji: habitData.emoji || '✨',
                type: habitData.type,
                target: habitData.target,
                unit: habitData.unit,
                color: habitData.color || HABIT_COLORS[colorIndex],
                frequency: habitData.frequency,
                sortMode: 'manual',
                manualOrder: state.habits.length,
                isArchived: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            dispatch({ type: 'ADD_HABIT', payload: habit });
        },
        [state.habits.length]
    );

    const updateHabit = useCallback((id: string, updates: Partial<Habit>) => {
        dispatch({ type: 'UPDATE_HABIT', payload: { id, updates } });
    }, []);

    const deleteHabit = useCallback(async (id: string) => {
        try {
            await deleteHabitLogsByHabitId(id);
            dispatch({ type: 'DELETE_HABIT', payload: id });
        } catch (error) {
            console.error('Failed to delete habit:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Alışkanlık silinemedi.' });
        }
    }, []);

    const archiveHabit = useCallback((id: string) => {
        dispatch({ type: 'ARCHIVE_HABIT', payload: id });
    }, []);

    const unarchiveHabit = useCallback((id: string) => {
        dispatch({ type: 'UNARCHIVE_HABIT', payload: id });
    }, []);

    const logHabit = useCallback(async (habitId: string, dateISO: string, done?: boolean, value?: number) => {
        const log: HabitLog = {
            habitId,
            dateISO,
            done,
            value,
            timestamp: new Date().toISOString(),
        };

        try {
            await saveHabitLog(log);
            dispatch({ type: 'LOG_HABIT', payload: log });
        } catch (error) {
            console.error('Failed to save habit log:', error);
            dispatch({ type: 'SET_ERROR', payload: 'Alışkanlık kaydı yapılamadı.' });
        }
    }, []);

    const reorderHabits = useCallback((habits: Habit[]) => {
        dispatch({ type: 'REORDER_HABITS', payload: habits });
    }, []);

    const getHabitLogs = useCallback((habitId: string): HabitLog[] => {
        return state.habitLogs.get(habitId) || [];
    }, [state.habitLogs]);

    const getHabitWithStats = useCallback((habitId: string): HabitWithStats | null => {
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return null;

        const logs = getHabitLogs(habitId);
        const today = getToday();
        const todayLog = logs.find(l => l.dateISO === today);

        const { current: currentStreak, best: bestStreak } = calculateHabitStreak(habit, logs);
        const score = calculateHabitScore(habit, logs);
        const weeklyProgress = getWeeklyProgress(habit, logs);
        const totalCompletions = logs.filter(l => l.done || (habit.type === 'numeric' && l.value && l.value >= (habit.target || 0))).length;

        return {
            habit,
            isDueToday: isHabitDueOnDate(habit, today),
            isCompletedToday: isHabitCompleted(habit, todayLog || null),
            currentStreak,
            bestStreak,
            longestStreak: bestStreak,
            totalCompletions,
            score,
            weeklyProgress,
        };
    }, [state.habits, getHabitLogs]);

    const getTodayHabits = useCallback((): HabitWithStats[] => {
        return state.habits
            .filter(h => !h.isArchived)
            .map(habit => {
                const stats = getHabitWithStats(habit.id);
                return stats!;
            })
            .filter(stats => stats.isDueToday)
            .sort((a, b) => {
                if (a.habit.sortMode === 'manual' && b.habit.sortMode === 'manual') {
                    return (a.habit.manualOrder || 0) - (b.habit.manualOrder || 0);
                }
                if (a.habit.sortMode === 'name') {
                    return a.habit.title.localeCompare(b.habit.title);
                }
                if (a.habit.sortMode === 'colorGroup') {
                    return (a.habit.color || '').localeCompare(b.habit.color || '');
                }
                return 0;
            });
    }, [state.habits, getHabitWithStats]);

    const getArchivedHabits = useCallback((): Habit[] => {
        return state.habits.filter(h => h.isArchived);
    }, [state.habits]);

    const importHabits = useCallback((habits: Habit[], logs: HabitLog[]) => {
        // Save logs to IndexedDB
        logs.forEach(log => saveHabitLog(log).catch(console.error));
        dispatch({ type: 'IMPORT_HABITS', payload: { habits, logs } });
    }, []);

    const value = useMemo<HabitsContextValue>(
        () => ({
            state,
            addHabit,
            updateHabit,
            deleteHabit,
            archiveHabit,
            unarchiveHabit,
            logHabit,
            reorderHabits,
            getHabitWithStats,
            getTodayHabits,
            getArchivedHabits,
            getHabitLogs,
            importHabits,
        }),
        [
            state,
            addHabit,
            updateHabit,
            deleteHabit,
            archiveHabit,
            unarchiveHabit,
            logHabit,
            reorderHabits,
            getHabitWithStats,
            getTodayHabits,
            getArchivedHabits,
            getHabitLogs,
            importHabits,
        ]
    );

    return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

// ================== HOOK ==================

export function useHabits(): HabitsContextValue {
    const context = useContext(HabitsContext);
    if (!context) {
        throw new Error('useHabits must be used within a HabitsProvider');
    }
    return context;
}
