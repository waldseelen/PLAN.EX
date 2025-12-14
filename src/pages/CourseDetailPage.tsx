import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    Circle,
    Clock,
    Edit2,
    ExternalLink,
    FileText,
    MessageSquare,
    Plus,
    Search as SearchIcon,
    Star,
    Trash2,
    Upload,
    Youtube
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card, EmptyState, ProgressBar } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { usePlanner } from '../context/PlannerContext';
import { deleteLectureNote, getLectureNote, saveLectureNote } from '../lib/storage';
import {
    calculateCourseProgress,
    cn,
    formatDateDisplay,
    generateId,
    getDaysUntil,
} from '../lib/utils';
import { Exam, LIMITS, Task, TaskStatus, Unit } from '../types';

const statusLabels: Record<TaskStatus, string> = {
    todo: 'Yapılacak',
    'in-progress': 'Devam Ediyor',
    review: 'İnceleme',
    done: 'Tamamlandı',
};

const statusColors: Record<TaskStatus, string> = {
    todo: '#94a3b8',
    'in-progress': '#3b82f6',
    review: '#f59e0b',
    done: '#22c55e',
};

export function CourseDetailPage() {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const {
        state,
        updateCourse,
        addUnit,
        updateUnit,
        deleteUnit,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        addExam,
        updateExam,
        deleteExam,
        addLectureNoteMeta,
        deleteLectureNoteMeta,
    } = usePlanner();
    const { addToast } = useApp();

    const course = state.courses.find((c) => c.id === courseId);

    const [activeTab, setActiveTab] = useState<'units' | 'exams' | 'notes'>('units');
    const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());
    const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState<string | null>(null);
    const [isAddExamOpen, setIsAddExamOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [editingTask, setEditingTask] = useState<{ task: Task; unitId: string } | null>(null);
    const [editingExam, setEditingExam] = useState<Exam | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string; parentId?: string } | null>(null);

    // Form states
    const [unitForm, setUnitForm] = useState({ title: '' });
    const [taskForm, setTaskForm] = useState({
        text: '',
        status: 'todo' as TaskStatus,
        isPriority: false,
        dueDateISO: '',
        note: '',
    });
    const [examForm, setExamForm] = useState({ title: '', examDateISO: '', description: '' });

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <p className="text-secondary mb-4">Ders bulunamadı</p>
                    <Link to="/courses">
                        <Button>Derslere Dön</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const progress = calculateCourseProgress(course, state.completionState.completedTaskIds);

    const toggleUnit = (unitId: string) => {
        const newExpanded = new Set(expandedUnits);
        if (newExpanded.has(unitId)) {
            newExpanded.delete(unitId);
        } else {
            newExpanded.add(unitId);
        }
        setExpandedUnits(newExpanded);
    };

    const handleAddUnit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!unitForm.title.trim()) {
            addToast('error', 'Ünite adı gerekli');
            return;
        }
        addUnit(course.id, unitForm.title);
        setUnitForm({ title: '' });
        setIsAddUnitOpen(false);
        addToast('success', 'Ünite eklendi');
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.text.trim() || !isAddTaskOpen) {
            addToast('error', 'Görev metni gerekli');
            return;
        }
        addTask(course.id, isAddTaskOpen, taskForm.text, {
            status: taskForm.status,
            isPriority: taskForm.isPriority,
            dueDateISO: taskForm.dueDateISO || undefined,
            note: taskForm.note || undefined,
        });
        setTaskForm({ text: '', status: 'todo', isPriority: false, dueDateISO: '', note: '' });
        setIsAddTaskOpen(null);
        addToast('success', 'Görev eklendi');
    };

    const handleAddExam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!examForm.title.trim() || !examForm.examDateISO) {
            addToast('error', 'Sınav adı ve tarihi gerekli');
            return;
        }
        if (editingExam) {
            updateExam(course.id, editingExam.id, examForm);
            addToast('success', 'Sınav güncellendi');
        } else {
            addExam(course.id, examForm.title, examForm.examDateISO);
            addToast('success', 'Sınav eklendi');
        }
        setExamForm({ title: '', examDateISO: '', description: '' });
        setIsAddExamOpen(false);
        setEditingExam(null);
    };

    const handleDelete = () => {
        if (!deleteConfirm) return;

        if (deleteConfirm.type === 'unit') {
            deleteUnit(course.id, deleteConfirm.id);
            addToast('success', 'Ünite silindi');
        } else if (deleteConfirm.type === 'task' && deleteConfirm.parentId) {
            deleteTask(course.id, deleteConfirm.parentId, deleteConfirm.id);
            addToast('success', 'Görev silindi');
        } else if (deleteConfirm.type === 'exam') {
            deleteExam(course.id, deleteConfirm.id);
            addToast('success', 'Sınav silindi');
        }

        setDeleteConfirm(null);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > LIMITS.MAX_PDF_SIZE_MB * 1024 * 1024) {
            addToast('error', `Dosya boyutu ${LIMITS.MAX_PDF_SIZE_MB}MB'dan küçük olmalı`);
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const noteId = generateId();

            await saveLectureNote({
                id: noteId,
                courseId: course.id,
                data: arrayBuffer,
                mimeType: file.type,
            });

            addLectureNoteMeta({
                id: noteId,
                courseId: course.id,
                name: file.name.replace('.pdf', ''),
                fileName: file.name,
                uploadDateISO: new Date().toISOString(),
                fileSize: file.size,
            });

            addToast('success', 'PDF yüklendi');
        } catch (error) {
            console.error('Upload failed:', error);
            addToast('error', 'PDF yüklenemedi');
        }

        e.target.value = '';
    };

    const handleOpenPdf = async (noteId: string) => {
        try {
            const note = await getLectureNote(noteId);
            if (!note) {
                addToast('error', 'PDF bulunamadı');
                return;
            }

            const blob = new Blob([note.data], { type: note.mimeType });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        } catch (error) {
            console.error('Failed to open PDF:', error);
            addToast('error', 'PDF açılamadı');
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            await deleteLectureNote(noteId);
            deleteLectureNoteMeta(noteId);
            addToast('success', 'PDF silindi');
        } catch (error) {
            console.error('Failed to delete PDF:', error);
            addToast('error', 'PDF silinemedi');
        }
    };

    const openExternalSearch = (text: string, engine: 'google' | 'youtube' | 'chatgpt') => {
        const encodedText = encodeURIComponent(text);
        const urls = {
            google: `https://www.google.com/search?q=${encodedText}`,
            youtube: `https://www.youtube.com/results?search_query=${encodedText}`,
            chatgpt: `https://chat.openai.com/?q=${encodedText}`,
        };
        window.open(urls[engine], '_blank');
    };

    const courseNotes = state.lectureNotesMeta.filter((n) => n.courseId === course.id);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-start gap-4">
                <Button variant="ghost" onClick={() => navigate('/courses')}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: course.color }}
                        />
                        <h1 className="text-2xl font-bold text-primary">{course.title}</h1>
                        {course.code && (
                            <Badge variant="outline" color={course.color}>
                                {course.code}
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-secondary">
                            {progress.completed}/{progress.total} görev tamamlandı
                        </span>
                        <ProgressBar value={progress.percentage} color={course.color} className="w-32" />
                        <span className="text-sm font-medium text-primary">{progress.percentage}%</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-default">
                {(['units', 'exams', 'notes'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                            activeTab === tab
                                ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                                : 'border-transparent text-secondary hover:text-primary'
                        )}
                    >
                        {tab === 'units' && 'Üniteler'}
                        {tab === 'exams' && `Sınavlar (${course.exams.length})`}
                        {tab === 'notes' && `Notlar (${courseNotes.length})`}
                    </button>
                ))}
            </div>

            {/* Units Tab */}
            {activeTab === 'units' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setIsAddUnitOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                            Ünite Ekle
                        </Button>
                    </div>

                    {course.units.length === 0 ? (
                        <EmptyState
                            icon={<FileText className="w-8 h-8 text-tertiary" />}
                            title="Henüz ünite yok"
                            description="Ders içeriğinizi organize etmek için ünite ekleyin"
                        />
                    ) : (
                        <div className="space-y-3">
                            {course.units.map((unit) => {
                                const isExpanded = expandedUnits.has(unit.id);
                                const completedTasks = unit.tasks.filter((t) =>
                                    state.completionState.completedTaskIds.includes(t.id)
                                ).length;

                                return (
                                    <Card key={unit.id} className="overflow-hidden">
                                        {/* Unit Header */}
                                        <div
                                            className="flex items-center gap-3 cursor-pointer"
                                            onClick={() => toggleUnit(unit.id)}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-secondary" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-secondary" />
                                            )}
                                            <div className="flex-1">
                                                <h3 className="font-medium text-primary">{unit.title}</h3>
                                                <p className="text-sm text-secondary">
                                                    {completedTasks}/{unit.tasks.length} görev
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <IconButton
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingUnit(unit);
                                                        setUnitForm({ title: unit.title });
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </IconButton>
                                                <IconButton
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={() => setDeleteConfirm({ type: 'unit', id: unit.id })}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </IconButton>
                                            </div>
                                        </div>

                                        {/* Tasks */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-4 mt-4 border-t border-default space-y-2">
                                                        {unit.tasks.map((task) => {
                                                            const isCompleted = state.completionState.completedTaskIds.includes(
                                                                task.id
                                                            );

                                                            return (
                                                                <div
                                                                    key={task.id}
                                                                    className={cn(
                                                                        'flex items-start gap-3 p-3 rounded-lg transition-colors',
                                                                        isCompleted ? 'bg-green-500/5' : 'bg-secondary'
                                                                    )}
                                                                >
                                                                    <button
                                                                        onClick={() => toggleTaskCompletion(task.id)}
                                                                        className="mt-0.5 flex-shrink-0"
                                                                    >
                                                                        {isCompleted ? (
                                                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                                                        ) : (
                                                                            <Circle className="w-5 h-5 text-secondary" />
                                                                        )}
                                                                    </button>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p
                                                                            className={cn(
                                                                                'text-sm',
                                                                                isCompleted
                                                                                    ? 'line-through text-secondary'
                                                                                    : 'text-primary'
                                                                            )}
                                                                        >
                                                                            {task.text}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            {task.isPriority && (
                                                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                                            )}
                                                                            {task.dueDateISO && (
                                                                                <span className="text-xs text-secondary flex items-center gap-1">
                                                                                    <Clock className="w-3 h-3" />
                                                                                    {formatDateDisplay(task.dueDateISO)}
                                                                                </span>
                                                                            )}
                                                                            <Badge
                                                                                size="sm"
                                                                                color={statusColors[task.status]}
                                                                            >
                                                                                {statusLabels[task.status]}
                                                                            </Badge>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <IconButton
                                                                            size="sm"
                                                                            title="Google'da Ara"
                                                                            onClick={() => openExternalSearch(task.text, 'google')}
                                                                        >
                                                                            <SearchIcon className="w-3 h-3" />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="sm"
                                                                            title="YouTube'da Ara"
                                                                            onClick={() => openExternalSearch(task.text, 'youtube')}
                                                                        >
                                                                            <Youtube className="w-3 h-3" />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="sm"
                                                                            title="ChatGPT'de Sor"
                                                                            onClick={() => openExternalSearch(task.text, 'chatgpt')}
                                                                        >
                                                                            <MessageSquare className="w-3 h-3" />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setEditingTask({ task, unitId: unit.id })
                                                                            }
                                                                        >
                                                                            <Edit2 className="w-3 h-3" />
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="sm"
                                                                            variant="danger"
                                                                            onClick={() =>
                                                                                setDeleteConfirm({
                                                                                    type: 'task',
                                                                                    id: task.id,
                                                                                    parentId: unit.id,
                                                                                })
                                                                            }
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </IconButton>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="w-full"
                                                            onClick={() => setIsAddTaskOpen(unit.id)}
                                                            leftIcon={<Plus className="w-4 h-4" />}
                                                        >
                                                            Görev Ekle
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Exams Tab */}
            {activeTab === 'exams' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <Button onClick={() => setIsAddExamOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                            Sınav Ekle
                        </Button>
                    </div>

                    {course.exams.length === 0 ? (
                        <EmptyState
                            icon={<Calendar className="w-8 h-8 text-tertiary" />}
                            title="Henüz sınav yok"
                            description="Sınav tarihlerinizi ekleyerek geri sayımı başlatın"
                        />
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            {course.exams
                                .sort((a, b) => new Date(a.examDateISO).getTime() - new Date(b.examDateISO).getTime())
                                .map((exam) => {
                                    const daysLeft = getDaysUntil(exam.examDateISO);
                                    const isPast = daysLeft < 0;

                                    return (
                                        <Card
                                            key={exam.id}
                                            className={cn(
                                                isPast && 'opacity-60',
                                                daysLeft <= 3 && !isPast && 'border-red-500',
                                                daysLeft <= 7 && daysLeft > 3 && 'border-orange-500'
                                            )}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-primary">{exam.title}</h3>
                                                    <p className="text-sm text-secondary mt-1">
                                                        {formatDateDisplay(exam.examDateISO)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <IconButton
                                                        size="sm"
                                                        onClick={() => {
                                                            setEditingExam(exam);
                                                            setExamForm({
                                                                title: exam.title,
                                                                examDateISO: exam.examDateISO,
                                                                description: exam.description || '',
                                                            });
                                                            setIsAddExamOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="sm"
                                                        variant="danger"
                                                        onClick={() => setDeleteConfirm({ type: 'exam', id: exam.id })}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </IconButton>
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                {isPast ? (
                                                    <Badge color="#94a3b8">Geçti</Badge>
                                                ) : (
                                                    <Badge
                                                        color={daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#6366f1'}
                                                    >
                                                        {daysLeft} gün kaldı
                                                    </Badge>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                        </div>
                    )}
                </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <label className="cursor-pointer">
                            <span className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 px-4 py-2 text-sm bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2">
                                <Upload className="w-4 h-4" />
                                PDF Yükle
                            </span>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {courseNotes.length === 0 ? (
                        <EmptyState
                            icon={<FileText className="w-8 h-8 text-tertiary" />}
                            title="Henüz not yok"
                            description="Ders notlarınızı PDF olarak yükleyin"
                        />
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {courseNotes.map((note) => (
                                <Card key={note.id} className="group">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 rounded-lg bg-red-500/10">
                                            <FileText className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-primary truncate">{note.name}</h3>
                                            <p className="text-sm text-secondary">
                                                {formatDateDisplay(note.uploadDateISO)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleOpenPdf(note.id)}
                                            leftIcon={<ExternalLink className="w-4 h-4" />}
                                        >
                                            Aç
                                        </Button>
                                        <IconButton
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleDeleteNote(note.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </IconButton>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Unit Modal */}
            <Modal
                isOpen={isAddUnitOpen || !!editingUnit}
                onClose={() => {
                    setIsAddUnitOpen(false);
                    setEditingUnit(null);
                    setUnitForm({ title: '' });
                }}
                title={editingUnit ? 'Ünite Düzenle' : 'Yeni Ünite'}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (editingUnit) {
                            updateUnit(course.id, editingUnit.id, { title: unitForm.title });
                            addToast('success', 'Ünite güncellendi');
                            setEditingUnit(null);
                        } else {
                            handleAddUnit(e);
                        }
                        setUnitForm({ title: '' });
                    }}
                    className="space-y-4"
                >
                    <Input
                        label="Ünite Adı"
                        placeholder="örn: Bölüm 1 - Giriş"
                        value={unitForm.title}
                        onChange={(e) => setUnitForm({ title: e.target.value })}
                        autoFocus
                    />
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsAddUnitOpen(false);
                                setEditingUnit(null);
                            }}
                        >
                            İptal
                        </Button>
                        <Button type="submit">{editingUnit ? 'Güncelle' : 'Ekle'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Add Task Modal */}
            <Modal
                isOpen={!!isAddTaskOpen}
                onClose={() => {
                    setIsAddTaskOpen(null);
                    setTaskForm({ text: '', status: 'todo', isPriority: false, dueDateISO: '', note: '' });
                }}
                title="Yeni Görev"
            >
                <form onSubmit={handleAddTask} className="space-y-4">
                    <Input
                        label="Görev"
                        placeholder="Görev açıklaması..."
                        value={taskForm.text}
                        onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                        autoFocus
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Durum"
                            value={taskForm.status}
                            onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <Input
                            type="date"
                            label="Bitiş Tarihi"
                            value={taskForm.dueDateISO}
                            onChange={(e) => setTaskForm({ ...taskForm, dueDateISO: e.target.value })}
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={taskForm.isPriority}
                            onChange={(e) => setTaskForm({ ...taskForm, isPriority: e.target.checked })}
                            className="w-4 h-4 rounded border-default text-[var(--color-accent)]"
                        />
                        <span className="text-secondary">Öncelikli</span>
                    </label>
                    <Textarea
                        label="Not (Opsiyonel)"
                        placeholder="Ek notlar..."
                        value={taskForm.note}
                        onChange={(e) => setTaskForm({ ...taskForm, note: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsAddTaskOpen(null)}>
                            İptal
                        </Button>
                        <Button type="submit">Ekle</Button>
                    </div>
                </form>
            </Modal>

            {/* Add/Edit Exam Modal */}
            <Modal
                isOpen={isAddExamOpen}
                onClose={() => {
                    setIsAddExamOpen(false);
                    setEditingExam(null);
                    setExamForm({ title: '', examDateISO: '', description: '' });
                }}
                title={editingExam ? 'Sınav Düzenle' : 'Yeni Sınav'}
            >
                <form onSubmit={handleAddExam} className="space-y-4">
                    <Input
                        label="Sınav Adı"
                        placeholder="örn: Vize Sınavı"
                        value={examForm.title}
                        onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                        autoFocus
                    />
                    <Input
                        type="date"
                        label="Sınav Tarihi"
                        value={examForm.examDateISO}
                        onChange={(e) => setExamForm({ ...examForm, examDateISO: e.target.value })}
                    />
                    <Textarea
                        label="Açıklama (Opsiyonel)"
                        placeholder="Sınav hakkında notlar..."
                        value={examForm.description}
                        onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                        rows={3}
                    />
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="secondary" onClick={() => setIsAddExamOpen(false)}>
                            İptal
                        </Button>
                        <Button type="submit">{editingExam ? 'Güncelle' : 'Ekle'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Silme Onayı"
                size="sm"
            >
                <p className="text-secondary mb-6">
                    Bu öğeyi silmek istediğinize emin misiniz?
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                        İptal
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        Sil
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
