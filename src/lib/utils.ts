import { type ClassValue, clsx } from 'clsx';
import type { Course, Exam, Habit, HabitLog, Task } from '../types';

// ================== CLASS NAME UTILITY ==================

export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}

// ================== ID GENERATION ==================

export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ================== DATE UTILITIES ==================

export function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
}

export function formatDateDisplay(date: Date | string, locale: string = 'tr-TR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function formatDateShort(date: Date | string, locale: string = 'tr-TR'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
    });
}

export function getToday(): string {
    return formatDate(new Date());
}

export function getDaysUntil(dateISO: string): number {
    const target = new Date(dateISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getWeekDay(date: Date | string): number {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.getDay(); // 0 = Sunday, 6 = Saturday
}

export function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getWeekEnd(date: Date): Date {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

export function getDaysInRange(startDate: Date, endDate: Date): string[] {
    const days: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        days.push(formatDate(current));
        current.setDate(current.getDate() + 1);
    }

    return days;
}

export function getLastNDays(n: number): string[] {
    const days: string[] = [];
    const today = new Date();

    for (let i = n - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        days.push(formatDate(date));
    }

    return days;
}

// ================== HABIT UTILITIES ==================

export function isHabitDueOnDate(habit: Habit, dateISO: string): boolean {
    const { frequency } = habit;
    const date = new Date(dateISO);

    switch (frequency.type) {
        case 'weeklyTarget':
            return true; // Any day counts towards weekly target

        case 'specificDays':
            return frequency.days.includes(date.getDay());

        case 'everyXDays': {
            const createdDate = new Date(habit.createdAt);
            const diffDays = Math.floor(
                (date.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return diffDays >= 0 && diffDays % frequency.interval === 0;
        }

        default:
            return false;
    }
}

export function isHabitCompleted(habit: Habit, log: HabitLog | null): boolean {
    if (!log) return false;

    if (habit.type === 'boolean') {
        return log.done === true;
    }

    if (habit.type === 'numeric') {
        const target = habit.target || 1;
        return (log.value || 0) >= target;
    }

    return false;
}

export function calculateHabitStreak(
    habit: Habit,
    logs: HabitLog[],
    endDate: string = getToday()
): { current: number; best: number } {
    const logMap = new Map(logs.map(log => [log.dateISO, log]));

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Check backwards from endDate
    const checkDate = new Date(endDate);
    let consecutiveMisses = 0;

    for (let i = 0; i < 365; i++) {
        const dateISO = formatDate(checkDate);
        const log = logMap.get(dateISO);
        const isDue = isHabitDueOnDate(habit, dateISO);

        if (isDue) {
            if (isHabitCompleted(habit, log || null)) {
                tempStreak++;
                consecutiveMisses = 0;
                if (i < 30) currentStreak = tempStreak; // Only count recent for current streak
            } else {
                consecutiveMisses++;

                // For weeklyTarget, allow flexibility
                if (habit.frequency.type === 'weeklyTarget') {
                    if (consecutiveMisses > 7) {
                        bestStreak = Math.max(bestStreak, tempStreak);
                        tempStreak = 0;
                    }
                } else {
                    bestStreak = Math.max(bestStreak, tempStreak);
                    tempStreak = 0;
                }
            }
        }

        checkDate.setDate(checkDate.getDate() - 1);
    }

    bestStreak = Math.max(bestStreak, tempStreak);

    return { current: currentStreak, best: bestStreak };
}

export function calculateHabitScore(
    habit: Habit,
    logs: HabitLog[],
    daysToConsider: number = 30
): number {
    const recentDays = getLastNDays(daysToConsider);
    const logMap = new Map(logs.map(log => [log.dateISO, log]));

    let totalWeight = 0;
    let achievedWeight = 0;

    recentDays.forEach((dateISO, index) => {
        const weight = Math.pow(1.05, index); // Exponential weight for recent days
        const isDue = isHabitDueOnDate(habit, dateISO);

        if (isDue) {
            totalWeight += weight;
            const log = logMap.get(dateISO);
            if (isHabitCompleted(habit, log || null)) {
                achievedWeight += weight;
            }
        }
    });

    if (totalWeight === 0) return 100;

    return Math.round((achievedWeight / totalWeight) * 100);
}

export function getWeeklyProgress(
    habit: Habit,
    logs: HabitLog[],
    weekStartDate: Date = getWeekStart(new Date())
): { completed: number; target: number } {
    const weekEnd = getWeekEnd(weekStartDate);
    const weekDays = getDaysInRange(weekStartDate, weekEnd);
    const logMap = new Map(logs.map(log => [log.dateISO, log]));

    let completed = 0;
    let target = 0;

    weekDays.forEach(dateISO => {
        const isDue = isHabitDueOnDate(habit, dateISO);
        if (isDue) {
            target++;
            const log = logMap.get(dateISO);
            if (isHabitCompleted(habit, log || null)) {
                completed++;
            }
        }
    });

    // Adjust target for weeklyTarget frequency
    if (habit.frequency.type === 'weeklyTarget') {
        target = habit.frequency.timesPerWeek;
    }

    return { completed, target };
}

// ================== TASK UTILITIES ==================

export function getTaskCountByStatus(tasks: Task[]): Record<string, number> {
    return tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
    return [...tasks].sort((a, b) => {
        // Priority first
        if (a.isPriority && !b.isPriority) return -1;
        if (!a.isPriority && b.isPriority) return 1;

        // Then by due date
        if (a.dueDateISO && b.dueDateISO) {
            return new Date(a.dueDateISO).getTime() - new Date(b.dueDateISO).getTime();
        }
        if (a.dueDateISO && !b.dueDateISO) return -1;
        if (!a.dueDateISO && b.dueDateISO) return 1;

        // Then by creation date
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

export function getTodayTasks(courses: Course[], completedTaskIds: string[]): Task[] {
    const today = getToday();
    const tasks: Task[] = [];

    courses.forEach(course => {
        course.units.forEach(unit => {
            unit.tasks.forEach(task => {
                const isCompleted = completedTaskIds.includes(task.id);
                const isDueToday = task.dueDateISO === today;
                const isPriority = task.isPriority;
                const isNotDone = task.status !== 'done';

                if (!isCompleted && isNotDone && (isDueToday || isPriority)) {
                    tasks.push(task);
                }
            });
        });
    });

    return sortTasksByPriority(tasks);
}

// ================== EXAM UTILITIES ==================

export function getUpcomingExams(courses: Course[], daysAhead: number = 30): Array<{ exam: Exam; course: Course; daysLeft: number }> {
    const upcoming: Array<{ exam: Exam; course: Course; daysLeft: number }> = [];
    const today = getToday();

    courses.forEach(course => {
        course.exams.forEach(exam => {
            const daysLeft = getDaysUntil(exam.examDateISO);
            if (daysLeft >= 0 && daysLeft <= daysAhead) {
                upcoming.push({ exam, course, daysLeft });
            }
        });
    });

    return upcoming.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ================== COURSE UTILITIES ==================

export function calculateCourseProgress(
    course: Course,
    completedTaskIds: string[]
): { total: number; completed: number; percentage: number } {
    let total = 0;
    let completed = 0;

    course.units.forEach(unit => {
        unit.tasks.forEach(task => {
            total++;
            if (completedTaskIds.includes(task.id)) {
                completed++;
            }
        });
    });

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, percentage };
}

// ================== SEARCH UTILITIES ==================

export function highlightMatch(text: string, query: string): string {
    if (!query) return text;

    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ================== DEBOUNCE ==================

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// ================== THROTTLE ==================

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

// ================== EXPORT UTILITIES ==================

export function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ================== FORMAT UTILITIES ==================

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number, decimals: number = 0): string {
    return `${value.toFixed(decimals)}%`;
}
