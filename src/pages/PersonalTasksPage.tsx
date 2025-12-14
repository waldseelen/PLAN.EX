import { AnimatePresence, motion } from 'framer-motion';
import {
    CheckCircle,
    Circle,
    Clock,
    Edit2,
    ListTodo,
    Plus,
    Star,
    Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card, EmptyState } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { usePlanner } from '../context/PlannerContext';
import { cn, formatDateDisplay } from '../lib/utils';
import { PersonalTask, TaskStatus } from '../types';

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

export function PersonalTasksPage() {
    const { state, addPersonalTask, updatePersonalTask, deletePersonalTask } = usePlanner();
    const { addToast } = useApp();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

    const [formData, setFormData] = useState({
        text: '',
        status: 'todo' as TaskStatus,
        isPriority: false,
        dueDateISO: '',
        note: '',
    });

    const filteredTasks = state.personalTasks.filter(
        task => filter === 'all' || task.status === filter
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.text.trim()) {
            addToast('error', 'Görev metni gerekli');
            return;
        }

        if (editingTask) {
            updatePersonalTask(editingTask.id, {
                text: formData.text,
                status: formData.status,
                isPriority: formData.isPriority,
                dueDateISO: formData.dueDateISO || undefined,
                note: formData.note || undefined,
            });
            addToast('success', 'Görev güncellendi');
        } else {
            addPersonalTask(formData.text, {
                status: formData.status,
                isPriority: formData.isPriority,
                dueDateISO: formData.dueDateISO || undefined,
                note: formData.note || undefined,
            });
            addToast('success', 'Görev eklendi');
        }

        closeModal();
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingTask(null);
        setFormData({
            text: '',
            status: 'todo',
            isPriority: false,
            dueDateISO: '',
            note: '',
        });
    };

    const openEditModal = (task: PersonalTask) => {
        setEditingTask(task);
        setFormData({
            text: task.text,
            status: task.status,
            isPriority: task.isPriority || false,
            dueDateISO: task.dueDateISO || '',
            note: task.note || '',
        });
    };

    const toggleTaskStatus = (task: PersonalTask) => {
        const newStatus = task.status === 'done' ? 'todo' : 'done';
        updatePersonalTask(task.id, { status: newStatus });
    };

    const handleDelete = (id: string) => {
        deletePersonalTask(id);
        setDeleteConfirm(null);
        addToast('success', 'Görev silindi');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Kişisel Görevler</h1>
                    <p className="text-secondary mt-1">{state.personalTasks.length} görev</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Görev Ekle
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
                {(['all', 'todo', 'in-progress', 'review', 'done'] as const).map((status) => (
                    <Button
                        key={status}
                        variant={filter === status ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter(status)}
                    >
                        {status === 'all' ? 'Tümü' : statusLabels[status]}
                    </Button>
                ))}
            </div>

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
                <EmptyState
                    icon={<ListTodo className="w-8 h-8 text-tertiary" />}
                    title={filter === 'all' ? 'Henüz görev yok' : 'Bu filtrede görev yok'}
                    description="Kişisel görevlerinizi ekleyerek takip edin"
                    action={
                        filter === 'all' && (
                            <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                                İlk Görevi Ekle
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                        {filteredTasks.map((task) => (
                            <motion.div
                                key={task.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                layout
                            >
                                <Card
                                    className={cn(
                                        'group transition-colors',
                                        task.status === 'done' && 'opacity-60'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={() => toggleTaskStatus(task)}
                                            className="mt-1 flex-shrink-0"
                                        >
                                            {task.status === 'done' ? (
                                                <CheckCircle className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-secondary hover:text-primary transition-colors" />
                                            )}
                                        </button>

                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={cn(
                                                    'font-medium',
                                                    task.status === 'done'
                                                        ? 'line-through text-secondary'
                                                        : 'text-primary'
                                                )}
                                            >
                                                {task.text}
                                            </p>

                                            {task.note && (
                                                <p className="text-sm text-secondary mt-1 line-clamp-2">
                                                    {task.note}
                                                </p>
                                            )}

                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                {task.isPriority && (
                                                    <span className="flex items-center gap-1 text-yellow-500 text-sm">
                                                        <Star className="w-4 h-4 fill-yellow-500" />
                                                        Öncelikli
                                                    </span>
                                                )}
                                                {task.dueDateISO && (
                                                    <span className="flex items-center gap-1 text-secondary text-sm">
                                                        <Clock className="w-4 h-4" />
                                                        {formatDateDisplay(task.dueDateISO)}
                                                    </span>
                                                )}
                                                <Badge color={statusColors[task.status]}>
                                                    {statusLabels[task.status]}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton size="sm" onClick={() => openEditModal(task)}>
                                                <Edit2 className="w-4 h-4" />
                                            </IconButton>
                                            <IconButton
                                                size="sm"
                                                variant="danger"
                                                onClick={() => setDeleteConfirm(task.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </IconButton>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isAddModalOpen || !!editingTask}
                onClose={closeModal}
                title={editingTask ? 'Görevi Düzenle' : 'Yeni Görev'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Görev"
                        placeholder="Görev açıklaması..."
                        value={formData.text}
                        onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                        autoFocus
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Durum"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                            options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))}
                        />
                        <Input
                            type="date"
                            label="Bitiş Tarihi"
                            value={formData.dueDateISO}
                            onChange={(e) => setFormData({ ...formData, dueDateISO: e.target.value })}
                        />
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.isPriority}
                            onChange={(e) => setFormData({ ...formData, isPriority: e.target.checked })}
                            className="w-4 h-4 rounded border-default text-[var(--color-accent)]"
                        />
                        <span className="text-secondary">Öncelikli</span>
                    </label>

                    <Textarea
                        label="Not (Opsiyonel)"
                        placeholder="Ek notlar..."
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                        rows={3}
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={closeModal}>
                            İptal
                        </Button>
                        <Button type="submit">{editingTask ? 'Güncelle' : 'Ekle'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Görevi Sil"
                size="sm"
            >
                <p className="text-secondary mb-6">
                    Bu görevi silmek istediğinize emin misiniz?
                </p>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                        İptal
                    </Button>
                    <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
                        Sil
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
