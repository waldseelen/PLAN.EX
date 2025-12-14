import { z } from 'zod';
import {
    AppSettings,
    AppSettingsSchema,
    CompletionState,
    CompletionStateSchema,
    Course,
    CourseSchema,
    DEFAULT_APP_SETTINGS,
    Habit,
    HabitLog,
    HabitLogSchema,
    HabitSchema,
    LectureNoteMeta,
    LectureNoteMetaSchema,
    LIMITS,
    PersonalTask,
    PersonalTaskSchema,
    UndoSnapshot,
    UndoSnapshotSchema,
} from '../types';

// ================== STORAGE KEYS ==================

const STORAGE_KEYS = {
    COURSES: 'planex_courses_v1',
    COMPLETION: 'planex_completion_v1',
    UNDO_STACK: 'planex_undo_stack_v1',
    PERSONAL_TASKS: 'planex_personal_tasks_v1',
    HABITS: 'planex_habits_v1',
    SETTINGS: 'planex_settings_v1',
    LECTURE_NOTES_META: 'planex_lecture_notes_meta_v1',
} as const;

// ================== LOCAL STORAGE HELPERS ==================

function safeJsonParse<T>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
        return JSON.parse(json);
    } catch {
        console.error('Failed to parse JSON:', json);
        return fallback;
    }
}

function validateWithSchema<T>(data: unknown, schema: z.ZodSchema<T>, fallback: T): T {
    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.error('Schema validation failed:', result.error);
    return fallback;
}

// ================== COURSES ==================

export function getCourses(): Course[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COURSES);
    const parsed = safeJsonParse(raw, []);
    return validateWithSchema(parsed, z.array(CourseSchema), []);
}

export function saveCourses(courses: Course[]): void {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
}

// ================== COMPLETION STATE ==================

const defaultCompletionState: CompletionState = {
    completedTaskIds: [],
    completionHistory: {},
};

export function getCompletionState(): CompletionState {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPLETION);
    const parsed = safeJsonParse(raw, defaultCompletionState);
    return validateWithSchema(parsed, CompletionStateSchema, defaultCompletionState);
}

export function saveCompletionState(state: CompletionState): void {
    localStorage.setItem(STORAGE_KEYS.COMPLETION, JSON.stringify(state));
}

// ================== UNDO STACK ==================

export function getUndoStack(): UndoSnapshot[] {
    const raw = localStorage.getItem(STORAGE_KEYS.UNDO_STACK);
    const parsed = safeJsonParse(raw, []);
    return validateWithSchema(parsed, z.array(UndoSnapshotSchema), []);
}

export function saveUndoStack(stack: UndoSnapshot[]): void {
    const trimmed = stack.slice(-LIMITS.MAX_UNDO_STACK);
    localStorage.setItem(STORAGE_KEYS.UNDO_STACK, JSON.stringify(trimmed));
}

// ================== PERSONAL TASKS ==================

export function getPersonalTasks(): PersonalTask[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PERSONAL_TASKS);
    const parsed = safeJsonParse(raw, []);
    return validateWithSchema(parsed, z.array(PersonalTaskSchema), []);
}

export function savePersonalTasks(tasks: PersonalTask[]): void {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_TASKS, JSON.stringify(tasks));
}

// ================== HABITS ==================

export function getHabits(): Habit[] {
    const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
    const parsed = safeJsonParse(raw, []);
    return validateWithSchema(parsed, z.array(HabitSchema), []);
}

export function saveHabits(habits: Habit[]): void {
    localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
}

// ================== SETTINGS ==================

export function getSettings(): AppSettings {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const parsed = safeJsonParse(raw, DEFAULT_APP_SETTINGS);
    return validateWithSchema(parsed, AppSettingsSchema, DEFAULT_APP_SETTINGS);
}

export function saveSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// ================== LECTURE NOTES META ==================

export function getLectureNotesMeta(): LectureNoteMeta[] {
    const raw = localStorage.getItem(STORAGE_KEYS.LECTURE_NOTES_META);
    const parsed = safeJsonParse(raw, []);
    return validateWithSchema(parsed, z.array(LectureNoteMetaSchema), []);
}

export function saveLectureNotesMeta(meta: LectureNoteMeta[]): void {
    localStorage.setItem(STORAGE_KEYS.LECTURE_NOTES_META, JSON.stringify(meta));
}

// ================== INDEXEDDB FOR PDF & HABIT LOGS ==================

const DB_NAME = 'PlanExDB';
const DB_VERSION = 1;
const STORES = {
    LECTURE_NOTES: 'lectureNotes',
    HABIT_LOGS: 'habitLogs',
} as const;

let dbInstance: IDBDatabase | null = null;

export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Lecture Notes Store
            if (!db.objectStoreNames.contains(STORES.LECTURE_NOTES)) {
                db.createObjectStore(STORES.LECTURE_NOTES, { keyPath: 'id' });
            }

            // Habit Logs Store
            if (!db.objectStoreNames.contains(STORES.HABIT_LOGS)) {
                const habitLogsStore = db.createObjectStore(STORES.HABIT_LOGS, { keyPath: ['habitId', 'dateISO'] });
                habitLogsStore.createIndex('habitId', 'habitId', { unique: false });
                habitLogsStore.createIndex('dateISO', 'dateISO', { unique: false });
            }
        };
    });
}

// ================== LECTURE NOTES (PDF) ==================

export interface StoredLectureNote {
    id: string;
    courseId: string;
    data: ArrayBuffer;
    mimeType: string;
}

export async function saveLectureNote(note: StoredLectureNote): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.LECTURE_NOTES, 'readwrite');
        const store = transaction.objectStore(STORES.LECTURE_NOTES);
        const request = store.put(note);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to save lecture note'));
    });
}

export async function getLectureNote(id: string): Promise<StoredLectureNote | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.LECTURE_NOTES, 'readonly');
        const store = transaction.objectStore(STORES.LECTURE_NOTES);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to get lecture note'));
    });
}

export async function deleteLectureNote(id: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.LECTURE_NOTES, 'readwrite');
        const store = transaction.objectStore(STORES.LECTURE_NOTES);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete lecture note'));
    });
}

export async function getAllLectureNotes(): Promise<StoredLectureNote[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.LECTURE_NOTES, 'readonly');
        const store = transaction.objectStore(STORES.LECTURE_NOTES);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get all lecture notes'));
    });
}

// ================== HABIT LOGS ==================

export async function saveHabitLog(log: HabitLog): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readwrite');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const request = store.put(log);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to save habit log'));
    });
}

export async function getHabitLog(habitId: string, dateISO: string): Promise<HabitLog | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readonly');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const request = store.get([habitId, dateISO]);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error('Failed to get habit log'));
    });
}

export async function getHabitLogsByHabitId(habitId: string): Promise<HabitLog[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readonly');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const index = store.index('habitId');
        const request = index.getAll(habitId);

        request.onsuccess = () => {
            const logs = request.result || [];
            resolve(logs.map(log => validateWithSchema(log, HabitLogSchema, log)));
        };
        request.onerror = () => reject(new Error('Failed to get habit logs'));
    });
}

export async function getHabitLogsByDateRange(startDate: string, endDate: string): Promise<HabitLog[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readonly');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const request = store.getAll();

        request.onsuccess = () => {
            const allLogs: HabitLog[] = request.result || [];
            const filtered = allLogs.filter(
                log => log.dateISO >= startDate && log.dateISO <= endDate
            );
            resolve(filtered);
        };
        request.onerror = () => reject(new Error('Failed to get habit logs by date range'));
    });
}

export async function getAllHabitLogs(): Promise<HabitLog[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readonly');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(new Error('Failed to get all habit logs'));
    });
}

export async function deleteHabitLog(habitId: string, dateISO: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readwrite');
        const store = transaction.objectStore(STORES.HABIT_LOGS);
        const request = store.delete([habitId, dateISO]);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Failed to delete habit log'));
    });
}

export async function deleteHabitLogsByHabitId(habitId: string): Promise<void> {
    const logs = await getHabitLogsByHabitId(habitId);
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.HABIT_LOGS, 'readwrite');
        const store = transaction.objectStore(STORES.HABIT_LOGS);

        let completed = 0;
        const total = logs.length;

        if (total === 0) {
            resolve();
            return;
        }

        logs.forEach(log => {
            const request = store.delete([log.habitId, log.dateISO]);
            request.onsuccess = () => {
                completed++;
                if (completed === total) resolve();
            };
            request.onerror = () => reject(new Error('Failed to delete habit logs'));
        });
    });
}

// ================== CLEAR ALL DATA ==================

export async function clearAllData(): Promise<void> {
    // Clear localStorage
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });

    // Clear IndexedDB
    const db = await openDatabase();
    const transaction = db.transaction([STORES.LECTURE_NOTES, STORES.HABIT_LOGS], 'readwrite');

    await Promise.all([
        new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore(STORES.LECTURE_NOTES).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject();
        }),
        new Promise<void>((resolve, reject) => {
            const request = transaction.objectStore(STORES.HABIT_LOGS).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject();
        }),
    ]);
}
