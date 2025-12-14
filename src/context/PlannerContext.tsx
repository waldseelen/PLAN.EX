import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import {
    getCompletionState,
    getCourses,
    getLectureNotesMeta,
    getPersonalTasks,
    getUndoStack,
    saveCompletionState,
    saveCourses,
    saveLectureNotesMeta,
    savePersonalTasks,
    saveUndoStack,
} from '../lib/storage';
import { debounce, generateId } from '../lib/utils';
import {
    CompletionState,
    Course,
    COURSE_COLORS,
    Exam,
    LectureNoteMeta,
    LIMITS,
    PersonalTask,
    Task,
    TaskStatus,
    UndoSnapshot,
    Unit,
} from '../types';

// ================== STATE ==================

interface PlannerState {
    courses: Course[];
    completionState: CompletionState;
    undoStack: UndoSnapshot[];
    personalTasks: PersonalTask[];
    lectureNotesMeta: LectureNoteMeta[];
    isLoading: boolean;
    error: string | null;
}

const initialState: PlannerState = {
    courses: [],
    completionState: { completedTaskIds: [], completionHistory: {} },
    undoStack: [],
    personalTasks: [],
    lectureNotesMeta: [],
    isLoading: true,
    error: null,
};

// ================== ACTIONS ==================

type PlannerAction =
    | { type: 'LOAD_DATA'; payload: Omit<PlannerState, 'isLoading' | 'error'> }
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: string | null }
    // Courses
    | { type: 'ADD_COURSE'; payload: Course }
    | { type: 'UPDATE_COURSE'; payload: { id: string; updates: Partial<Course> } }
    | { type: 'DELETE_COURSE'; payload: string }
    // Units
    | { type: 'ADD_UNIT'; payload: { courseId: string; unit: Unit } }
    | { type: 'UPDATE_UNIT'; payload: { courseId: string; unitId: string; updates: Partial<Unit> } }
    | { type: 'DELETE_UNIT'; payload: { courseId: string; unitId: string } }
    | { type: 'REORDER_UNITS'; payload: { courseId: string; units: Unit[] } }
    // Tasks
    | { type: 'ADD_TASK'; payload: { courseId: string; unitId: string; task: Task } }
    | { type: 'UPDATE_TASK'; payload: { courseId: string; unitId: string; taskId: string; updates: Partial<Task> } }
    | { type: 'DELETE_TASK'; payload: { courseId: string; unitId: string; taskId: string } }
    | { type: 'TOGGLE_TASK_COMPLETION'; payload: string }
    | { type: 'UPDATE_TASK_STATUS'; payload: { taskId: string; status: TaskStatus; courseId: string; unitId: string } }
    // Exams
    | { type: 'ADD_EXAM'; payload: { courseId: string; exam: Exam } }
    | { type: 'UPDATE_EXAM'; payload: { courseId: string; examId: string; updates: Partial<Exam> } }
    | { type: 'DELETE_EXAM'; payload: { courseId: string; examId: string } }
    // Personal Tasks
    | { type: 'ADD_PERSONAL_TASK'; payload: PersonalTask }
    | { type: 'UPDATE_PERSONAL_TASK'; payload: { id: string; updates: Partial<PersonalTask> } }
    | { type: 'DELETE_PERSONAL_TASK'; payload: string }
    // Lecture Notes
    | { type: 'ADD_LECTURE_NOTE_META'; payload: LectureNoteMeta }
    | { type: 'DELETE_LECTURE_NOTE_META'; payload: string }
    // Undo
    | { type: 'UNDO' }
    | { type: 'PUSH_UNDO_SNAPSHOT' }
    // Import
    | { type: 'IMPORT_DATA'; payload: { courses: Course[]; completionState: CompletionState; personalTasks: PersonalTask[] } };

// ================== REDUCER ==================

function plannerReducer(state: PlannerState, action: PlannerAction): PlannerState {
    switch (action.type) {
        case 'LOAD_DATA':
            return { ...state, ...action.payload, isLoading: false };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'SET_ERROR':
            return { ...state, error: action.payload };

        // Courses
        case 'ADD_COURSE':
            return { ...state, courses: [...state.courses, action.payload] };

        case 'UPDATE_COURSE':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.id
                        ? { ...c, ...action.payload.updates, updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        case 'DELETE_COURSE':
            return {
                ...state,
                courses: state.courses.filter(c => c.id !== action.payload),
            };

        // Units
        case 'ADD_UNIT':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? { ...c, units: [...c.units, action.payload.unit], updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        case 'UPDATE_UNIT':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? {
                            ...c,
                            units: c.units.map(u =>
                                u.id === action.payload.unitId ? { ...u, ...action.payload.updates } : u
                            ),
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                ),
            };

        case 'DELETE_UNIT':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? { ...c, units: c.units.filter(u => u.id !== action.payload.unitId), updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        case 'REORDER_UNITS':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? { ...c, units: action.payload.units, updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        // Tasks
        case 'ADD_TASK':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? {
                            ...c,
                            units: c.units.map(u =>
                                u.id === action.payload.unitId
                                    ? { ...u, tasks: [...u.tasks, action.payload.task] }
                                    : u
                            ),
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                ),
            };

        case 'UPDATE_TASK':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? {
                            ...c,
                            units: c.units.map(u =>
                                u.id === action.payload.unitId
                                    ? {
                                        ...u,
                                        tasks: u.tasks.map(t =>
                                            t.id === action.payload.taskId
                                                ? { ...t, ...action.payload.updates, updatedAt: new Date().toISOString() }
                                                : t
                                        ),
                                    }
                                    : u
                            ),
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                ),
            };

        case 'DELETE_TASK': {
            const newCompletedIds = state.completionState.completedTaskIds.filter(
                id => id !== action.payload.taskId
            );
            const newHistory = { ...state.completionState.completionHistory };
            delete newHistory[action.payload.taskId];

            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? {
                            ...c,
                            units: c.units.map(u =>
                                u.id === action.payload.unitId
                                    ? { ...u, tasks: u.tasks.filter(t => t.id !== action.payload.taskId) }
                                    : u
                            ),
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                ),
                completionState: {
                    completedTaskIds: newCompletedIds,
                    completionHistory: newHistory,
                },
            };
        }

        case 'TOGGLE_TASK_COMPLETION': {
            const taskId = action.payload;
            const isCompleted = state.completionState.completedTaskIds.includes(taskId);

            let newCompletedIds: string[];
            let newHistory: Record<string, string>;

            if (isCompleted) {
                newCompletedIds = state.completionState.completedTaskIds.filter(id => id !== taskId);
                newHistory = { ...state.completionState.completionHistory };
                delete newHistory[taskId];
            } else {
                newCompletedIds = [...state.completionState.completedTaskIds, taskId];
                newHistory = {
                    ...state.completionState.completionHistory,
                    [taskId]: new Date().toISOString(),
                };
            }

            // Update task status in courses
            let newCourses = state.courses;
            const newStatus: TaskStatus = isCompleted ? 'todo' : 'done';

            for (const course of state.courses) {
                for (const unit of course.units) {
                    const task = unit.tasks.find(t => t.id === taskId);
                    if (task) {
                        newCourses = state.courses.map(c =>
                            c.id === course.id
                                ? {
                                    ...c,
                                    units: c.units.map(u =>
                                        u.id === unit.id
                                            ? {
                                                ...u,
                                                tasks: u.tasks.map(t =>
                                                    t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t
                                                ),
                                            }
                                            : u
                                    ),
                                }
                                : c
                        );
                        break;
                    }
                }
            }

            return {
                ...state,
                courses: newCourses,
                completionState: {
                    completedTaskIds: newCompletedIds,
                    completionHistory: newHistory,
                },
            };
        }

        case 'UPDATE_TASK_STATUS': {
            const { taskId, status, courseId, unitId } = action.payload;

            // If status is done, add to completed; otherwise remove
            let newCompletedIds = state.completionState.completedTaskIds;
            let newHistory = state.completionState.completionHistory;

            if (status === 'done') {
                if (!newCompletedIds.includes(taskId)) {
                    newCompletedIds = [...newCompletedIds, taskId];
                    newHistory = { ...newHistory, [taskId]: new Date().toISOString() };
                }
            } else {
                if (newCompletedIds.includes(taskId)) {
                    newCompletedIds = newCompletedIds.filter(id => id !== taskId);
                    newHistory = { ...newHistory };
                    delete newHistory[taskId];
                }
            }

            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === courseId
                        ? {
                            ...c,
                            units: c.units.map(u =>
                                u.id === unitId
                                    ? {
                                        ...u,
                                        tasks: u.tasks.map(t =>
                                            t.id === taskId ? { ...t, status, updatedAt: new Date().toISOString() } : t
                                        ),
                                    }
                                    : u
                            ),
                        }
                        : c
                ),
                completionState: {
                    completedTaskIds: newCompletedIds,
                    completionHistory: newHistory,
                },
            };
        }

        // Exams
        case 'ADD_EXAM':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? { ...c, exams: [...c.exams, action.payload.exam], updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        case 'UPDATE_EXAM':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? {
                            ...c,
                            exams: c.exams.map(e =>
                                e.id === action.payload.examId ? { ...e, ...action.payload.updates } : e
                            ),
                            updatedAt: new Date().toISOString(),
                        }
                        : c
                ),
            };

        case 'DELETE_EXAM':
            return {
                ...state,
                courses: state.courses.map(c =>
                    c.id === action.payload.courseId
                        ? { ...c, exams: c.exams.filter(e => e.id !== action.payload.examId), updatedAt: new Date().toISOString() }
                        : c
                ),
            };

        // Personal Tasks
        case 'ADD_PERSONAL_TASK':
            return { ...state, personalTasks: [...state.personalTasks, action.payload] };

        case 'UPDATE_PERSONAL_TASK':
            return {
                ...state,
                personalTasks: state.personalTasks.map(t =>
                    t.id === action.payload.id
                        ? { ...t, ...action.payload.updates, updatedAt: new Date().toISOString() }
                        : t
                ),
            };

        case 'DELETE_PERSONAL_TASK':
            return {
                ...state,
                personalTasks: state.personalTasks.filter(t => t.id !== action.payload),
            };

        // Lecture Notes
        case 'ADD_LECTURE_NOTE_META':
            return {
                ...state,
                lectureNotesMeta: [...state.lectureNotesMeta, action.payload],
            };

        case 'DELETE_LECTURE_NOTE_META':
            return {
                ...state,
                lectureNotesMeta: state.lectureNotesMeta.filter(n => n.id !== action.payload),
            };

        // Undo
        case 'PUSH_UNDO_SNAPSHOT': {
            const snapshot: UndoSnapshot = {
                timestamp: new Date().toISOString(),
                completedTaskIds: [...state.completionState.completedTaskIds],
                completionHistory: { ...state.completionState.completionHistory },
            };
            return {
                ...state,
                undoStack: [...state.undoStack.slice(-LIMITS.MAX_UNDO_STACK + 1), snapshot],
            };
        }

        case 'UNDO': {
            if (state.undoStack.length === 0) return state;

            const lastSnapshot = state.undoStack[state.undoStack.length - 1];
            return {
                ...state,
                completionState: {
                    completedTaskIds: lastSnapshot.completedTaskIds,
                    completionHistory: lastSnapshot.completionHistory,
                },
                undoStack: state.undoStack.slice(0, -1),
            };
        }

        // Import
        case 'IMPORT_DATA':
            return {
                ...state,
                courses: action.payload.courses,
                completionState: action.payload.completionState,
                personalTasks: action.payload.personalTasks,
                undoStack: [],
            };

        default:
            return state;
    }
}

// ================== CONTEXT ==================

interface PlannerContextValue {
    state: PlannerState;
    // Courses
    addCourse: (title: string, code?: string) => void;
    updateCourse: (id: string, updates: Partial<Course>) => void;
    deleteCourse: (id: string) => void;
    // Units
    addUnit: (courseId: string, title: string) => void;
    updateUnit: (courseId: string, unitId: string, updates: Partial<Unit>) => void;
    deleteUnit: (courseId: string, unitId: string) => void;
    reorderUnits: (courseId: string, units: Unit[]) => void;
    // Tasks
    addTask: (courseId: string, unitId: string, text: string, options?: Partial<Task>) => void;
    updateTask: (courseId: string, unitId: string, taskId: string, updates: Partial<Task>) => void;
    deleteTask: (courseId: string, unitId: string, taskId: string) => void;
    toggleTaskCompletion: (taskId: string) => void;
    updateTaskStatus: (taskId: string, status: TaskStatus, courseId: string, unitId: string) => void;
    // Exams
    addExam: (courseId: string, title: string, examDateISO: string) => void;
    updateExam: (courseId: string, examId: string, updates: Partial<Exam>) => void;
    deleteExam: (courseId: string, examId: string) => void;
    // Personal Tasks
    addPersonalTask: (text: string, options?: Partial<PersonalTask>) => void;
    updatePersonalTask: (id: string, updates: Partial<PersonalTask>) => void;
    deletePersonalTask: (id: string) => void;
    // Lecture Notes
    addLectureNoteMeta: (meta: LectureNoteMeta) => void;
    deleteLectureNoteMeta: (id: string) => void;
    // Undo
    undo: () => void;
    canUndo: boolean;
    // Import/Export
    importData: (courses: Course[], completionState: CompletionState, personalTasks: PersonalTask[]) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

// ================== PROVIDER ==================

export function PlannerProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(plannerReducer, initialState);

    // Load data on mount
    useEffect(() => {
        const courses = getCourses();
        const completionState = getCompletionState();
        const undoStack = getUndoStack();
        const personalTasks = getPersonalTasks();
        const lectureNotesMeta = getLectureNotesMeta();

        dispatch({
            type: 'LOAD_DATA',
            payload: { courses, completionState, undoStack, personalTasks, lectureNotesMeta },
        });
    }, []);

    // Auto-save with debounce
    const debouncedSave = useMemo(
        () =>
            debounce(() => {
                saveCourses(state.courses);
                saveCompletionState(state.completionState);
                saveUndoStack(state.undoStack);
                savePersonalTasks(state.personalTasks);
                saveLectureNotesMeta(state.lectureNotesMeta);
            }, 500),
        [state.courses, state.completionState, state.undoStack, state.personalTasks, state.lectureNotesMeta]
    );

    useEffect(() => {
        if (!state.isLoading) {
            debouncedSave();
        }
    }, [state, debouncedSave]);

    // Actions
    const addCourse = useCallback((title: string, code?: string) => {
        if (state.courses.length >= LIMITS.MAX_COURSES) {
            dispatch({ type: 'SET_ERROR', payload: `Maksimum ${LIMITS.MAX_COURSES} ders ekleyebilirsiniz.` });
            return;
        }

        const colorIndex = state.courses.length % COURSE_COLORS.length;
        const course: Course = {
            id: generateId(),
            title,
            code,
            color: COURSE_COLORS[colorIndex],
            units: [
                {
                    id: generateId(),
                    title: 'Bölüm 1',
                    order: 0,
                    tasks: [],
                },
            ],
            exams: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        dispatch({ type: 'ADD_COURSE', payload: course });
    }, [state.courses.length]);

    const updateCourse = useCallback((id: string, updates: Partial<Course>) => {
        dispatch({ type: 'UPDATE_COURSE', payload: { id, updates } });
    }, []);

    const deleteCourse = useCallback((id: string) => {
        dispatch({ type: 'DELETE_COURSE', payload: id });
    }, []);

    const addUnit = useCallback((courseId: string, title: string) => {
        const course = state.courses.find(c => c.id === courseId);
        if (!course) return;

        if (course.units.length >= LIMITS.MAX_UNITS_PER_COURSE) {
            dispatch({ type: 'SET_ERROR', payload: `Maksimum ${LIMITS.MAX_UNITS_PER_COURSE} ünite ekleyebilirsiniz.` });
            return;
        }

        const unit: Unit = {
            id: generateId(),
            title,
            order: course.units.length,
            tasks: [],
        };

        dispatch({ type: 'ADD_UNIT', payload: { courseId, unit } });
    }, [state.courses]);

    const updateUnit = useCallback((courseId: string, unitId: string, updates: Partial<Unit>) => {
        dispatch({ type: 'UPDATE_UNIT', payload: { courseId, unitId, updates } });
    }, []);

    const deleteUnit = useCallback((courseId: string, unitId: string) => {
        dispatch({ type: 'DELETE_UNIT', payload: { courseId, unitId } });
    }, []);

    const reorderUnits = useCallback((courseId: string, units: Unit[]) => {
        dispatch({ type: 'REORDER_UNITS', payload: { courseId, units } });
    }, []);

    const addTask = useCallback((courseId: string, unitId: string, text: string, options?: Partial<Task>) => {
        const course = state.courses.find(c => c.id === courseId);
        const unit = course?.units.find(u => u.id === unitId);

        if (unit && unit.tasks.length >= LIMITS.MAX_TASKS_PER_UNIT) {
            dispatch({ type: 'SET_ERROR', payload: `Maksimum ${LIMITS.MAX_TASKS_PER_UNIT} görev ekleyebilirsiniz.` });
            return;
        }

        const task: Task = {
            id: generateId(),
            text: text.slice(0, LIMITS.MAX_TASK_TEXT_LENGTH),
            status: 'todo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...options,
        };

        dispatch({ type: 'ADD_TASK', payload: { courseId, unitId, task } });
    }, [state.courses]);

    const updateTask = useCallback((courseId: string, unitId: string, taskId: string, updates: Partial<Task>) => {
        dispatch({ type: 'UPDATE_TASK', payload: { courseId, unitId, taskId, updates } });
    }, []);

    const deleteTask = useCallback((courseId: string, unitId: string, taskId: string) => {
        dispatch({ type: 'DELETE_TASK', payload: { courseId, unitId, taskId } });
    }, []);

    const toggleTaskCompletion = useCallback((taskId: string) => {
        dispatch({ type: 'PUSH_UNDO_SNAPSHOT' });
        dispatch({ type: 'TOGGLE_TASK_COMPLETION', payload: taskId });
    }, []);

    const updateTaskStatus = useCallback((taskId: string, status: TaskStatus, courseId: string, unitId: string) => {
        dispatch({ type: 'PUSH_UNDO_SNAPSHOT' });
        dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status, courseId, unitId } });
    }, []);

    const addExam = useCallback((courseId: string, title: string, examDateISO: string) => {
        const course = state.courses.find(c => c.id === courseId);
        if (!course) return;

        if (course.exams.length >= LIMITS.MAX_EXAMS_PER_COURSE) {
            dispatch({ type: 'SET_ERROR', payload: `Maksimum ${LIMITS.MAX_EXAMS_PER_COURSE} sınav ekleyebilirsiniz.` });
            return;
        }

        const exam: Exam = {
            id: generateId(),
            title,
            examDateISO,
        };

        dispatch({ type: 'ADD_EXAM', payload: { courseId, exam } });
    }, [state.courses]);

    const updateExam = useCallback((courseId: string, examId: string, updates: Partial<Exam>) => {
        dispatch({ type: 'UPDATE_EXAM', payload: { courseId, examId, updates } });
    }, []);

    const deleteExam = useCallback((courseId: string, examId: string) => {
        dispatch({ type: 'DELETE_EXAM', payload: { courseId, examId } });
    }, []);

    const addPersonalTask = useCallback((text: string, options?: Partial<PersonalTask>) => {
        const task: PersonalTask = {
            id: generateId(),
            text: text.slice(0, LIMITS.MAX_TASK_TEXT_LENGTH),
            status: 'todo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ...options,
        };

        dispatch({ type: 'ADD_PERSONAL_TASK', payload: task });
    }, []);

    const updatePersonalTask = useCallback((id: string, updates: Partial<PersonalTask>) => {
        dispatch({ type: 'UPDATE_PERSONAL_TASK', payload: { id, updates } });
    }, []);

    const deletePersonalTask = useCallback((id: string) => {
        dispatch({ type: 'DELETE_PERSONAL_TASK', payload: id });
    }, []);

    const addLectureNoteMeta = useCallback((meta: LectureNoteMeta) => {
        dispatch({ type: 'ADD_LECTURE_NOTE_META', payload: meta });
    }, []);

    const deleteLectureNoteMeta = useCallback((id: string) => {
        dispatch({ type: 'DELETE_LECTURE_NOTE_META', payload: id });
    }, []);

    const undo = useCallback(() => {
        dispatch({ type: 'UNDO' });
    }, []);

    const importData = useCallback((courses: Course[], completionState: CompletionState, personalTasks: PersonalTask[]) => {
        dispatch({ type: 'IMPORT_DATA', payload: { courses, completionState, personalTasks } });
    }, []);

    const value = useMemo<PlannerContextValue>(
        () => ({
            state,
            addCourse,
            updateCourse,
            deleteCourse,
            addUnit,
            updateUnit,
            deleteUnit,
            reorderUnits,
            addTask,
            updateTask,
            deleteTask,
            toggleTaskCompletion,
            updateTaskStatus,
            addExam,
            updateExam,
            deleteExam,
            addPersonalTask,
            updatePersonalTask,
            deletePersonalTask,
            addLectureNoteMeta,
            deleteLectureNoteMeta,
            undo,
            canUndo: state.undoStack.length > 0,
            importData,
        }),
        [
            state,
            addCourse,
            updateCourse,
            deleteCourse,
            addUnit,
            updateUnit,
            deleteUnit,
            reorderUnits,
            addTask,
            updateTask,
            deleteTask,
            toggleTaskCompletion,
            updateTaskStatus,
            addExam,
            updateExam,
            deleteExam,
            addPersonalTask,
            updatePersonalTask,
            deletePersonalTask,
            addLectureNoteMeta,
            deleteLectureNoteMeta,
            undo,
            importData,
        ]
    );

    return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

// ================== HOOK ==================

export function usePlanner(): PlannerContextValue {
    const context = useContext(PlannerContext);
    if (!context) {
        throw new Error('usePlanner must be used within a PlannerProvider');
    }
    return context;
}
