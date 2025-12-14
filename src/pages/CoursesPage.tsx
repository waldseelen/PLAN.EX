import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Edit2, GraduationCap, Plus, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button';
import { Card, EmptyState, ProgressBar } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { usePlanner } from '../context/PlannerContext';
import { calculateCourseProgress, cn } from '../lib/utils';
import { COURSE_COLORS, Course } from '../types';

export function CoursesPage() {
    const { state, addCourse, updateCourse, deleteCourse } = usePlanner();
    const { addToast } = useApp();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [formData, setFormData] = useState({ title: '', code: '', color: COURSE_COLORS[0] as string });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            addToast('error', 'Ders adı gerekli');
            return;
        }

        if (editingCourse) {
            updateCourse(editingCourse.id, {
                title: formData.title,
                code: formData.code || undefined,
                color: formData.color,
            });
            addToast('success', 'Ders güncellendi');
        } else {
            addCourse(formData.title, formData.code || undefined);
            addToast('success', 'Ders eklendi');
        }

        closeModal();
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingCourse(null);
        setFormData({ title: '', code: '', color: COURSE_COLORS[0] as string });
    };

    const openEditModal = (course: Course) => {
        setEditingCourse(course);
        setFormData({
            title: course.title,
            code: course.code || '',
            color: course.color || COURSE_COLORS[0],
        });
    };

    const handleDelete = (id: string) => {
        deleteCourse(id);
        setDeleteConfirm(null);
        addToast('success', 'Ders silindi');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Dersler</h1>
                    <p className="text-secondary mt-1">{state.courses.length} ders</p>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    leftIcon={<Plus className="w-4 h-4" />}
                >
                    Ders Ekle
                </Button>
            </div>

            {/* Courses Grid */}
            {state.courses.length === 0 ? (
                <EmptyState
                    icon={<GraduationCap className="w-8 h-8 text-tertiary" />}
                    title="Henüz ders yok"
                    description="Derslerinizi ekleyerek akademik planlamanıza başlayın"
                    action={
                        <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                            İlk Dersi Ekle
                        </Button>
                    }
                />
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {state.courses.map((course, index) => {
                            const progress = calculateCourseProgress(
                                course,
                                state.completionState.completedTaskIds
                            );

                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card hoverable className="group relative">
                                        {/* Actions Menu */}
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="flex gap-1">
                                                <IconButton
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(course);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </IconButton>
                                                <IconButton
                                                    size="sm"
                                                    variant="danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeleteConfirm(course.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </IconButton>
                                            </div>
                                        </div>

                                        <Link to={`/courses/${course.id}`}>
                                            {/* Color Bar */}
                                            <div
                                                className="h-2 rounded-t-lg -mx-4 -mt-4 mb-4"
                                                style={{ backgroundColor: course.color }}
                                            />

                                            {/* Course Info */}
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="p-2 rounded-lg"
                                                    style={{ backgroundColor: `${course.color}20` }}
                                                >
                                                    <BookOpen className="w-5 h-5" style={{ color: course.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-primary truncate">{course.title}</h3>
                                                    {course.code && (
                                                        <p className="text-sm text-secondary">{course.code}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                                <div className="p-2 bg-secondary rounded-lg">
                                                    <p className="text-lg font-semibold text-primary">{course.units.length}</p>
                                                    <p className="text-xs text-secondary">Ünite</p>
                                                </div>
                                                <div className="p-2 bg-secondary rounded-lg">
                                                    <p className="text-lg font-semibold text-primary">{progress.total}</p>
                                                    <p className="text-xs text-secondary">Görev</p>
                                                </div>
                                                <div className="p-2 bg-secondary rounded-lg">
                                                    <p className="text-lg font-semibold text-primary">{course.exams.length}</p>
                                                    <p className="text-xs text-secondary">Sınav</p>
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="mt-4">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-secondary">İlerleme</span>
                                                    <span className="text-primary font-medium">{progress.percentage}%</span>
                                                </div>
                                                <ProgressBar value={progress.percentage} color={course.color} />
                                            </div>
                                        </Link>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isAddModalOpen || !!editingCourse}
                onClose={closeModal}
                title={editingCourse ? 'Ders Düzenle' : 'Yeni Ders Ekle'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Ders Adı"
                        placeholder="örn: Matematik I"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        autoFocus
                    />

                    <Input
                        label="Ders Kodu (Opsiyonel)"
                        placeholder="örn: MAT101"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />

                    <div>
                        <label className="block text-sm font-medium text-primary mb-2">Renk</label>
                        <div className="flex flex-wrap gap-2">
                            {COURSE_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={cn(
                                        'w-8 h-8 rounded-full transition-transform',
                                        formData.color === color && 'ring-2 ring-offset-2 ring-[var(--color-accent)] scale-110'
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={closeModal}>
                            İptal
                        </Button>
                        <Button type="submit">
                            {editingCourse ? 'Güncelle' : 'Ekle'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Dersi Sil"
                size="sm"
            >
                <p className="text-secondary mb-6">
                    Bu dersi silmek istediğinize emin misiniz? Tüm üniteler, görevler ve sınavlar da silinecek.
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
