import { AnimatePresence, motion } from 'framer-motion';
import {
    Archive,
    ArchiveRestore,
    BarChart3,
    CheckCircle,
    Circle,
    Edit2,
    Flame,
    MoreVertical,
    Plus,
    Target,
    Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card, EmptyState, ProgressBar } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { useHabits } from '../context/HabitsContext';
import { cn } from '../lib/utils';
import { FrequencyRule, Habit, HABIT_COLORS } from '../types';

const frequencyTypeLabels = {
    weeklyTarget: 'Haftalık Hedef',
    specificDays: 'Belirli Günler',
    everyXDays: 'Her X Günde Bir',
};

const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export function HabitsDashboardPage() {
    const { state, addHabit, updateHabit, deleteHabit, logHabit, getTodayHabits, getHabitWithStats } = useHabits();
    const { addToast } = useApp();

    const [showArchived, setShowArchived] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        emoji: '✨',
        color: HABIT_COLORS[0] as string,
        type: 'boolean' as 'boolean' | 'numeric',
        target: 1,
        unit: '',
        frequencyType: 'weeklyTarget' as FrequencyRule['type'],
        weeklyTarget: 7,
        specificDays: [1, 2, 3, 4, 5] as number[],
        everyXDays: 1,
    });

    const todayHabits = useMemo(() => getTodayHabits(), [getTodayHabits]);
    const todayCompleted = todayHabits.filter(h => h.isCompletedToday).length;

    const displayHabits = useMemo(() => {
        return state.habits
            .filter(h => showArchived ? h.isArchived : !h.isArchived)
            .map(h => getHabitWithStats(h.id))
            .filter(Boolean) as ReturnType<typeof getHabitWithStats>[];
    }, [state.habits, showArchived, getHabitWithStats]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            addToast('error', 'Alışkanlık adı gerekli');
            return;
        }

        let frequency: FrequencyRule;
        switch (formData.frequencyType) {
            case 'weeklyTarget':
                frequency = { type: 'weeklyTarget', timesPerWeek: formData.weeklyTarget };
                break;
            case 'specificDays':
                frequency = { type: 'specificDays', days: formData.specificDays };
                break;
            case 'everyXDays':
                frequency = { type: 'everyXDays', interval: formData.everyXDays };
                break;
        }

        const habitData = {
            title: formData.title,
            description: formData.description || undefined,
            emoji: formData.emoji,
            color: formData.color,
            type: formData.type,
            target: formData.type === 'numeric' ? formData.target : undefined,
            unit: formData.type === 'numeric' ? formData.unit : undefined,
            frequency,
        };

        if (editingHabit) {
            updateHabit(editingHabit.id, habitData);
            addToast('success', 'Alışkanlık güncellendi');
        } else {
            addHabit(habitData);
            addToast('success', 'Alışkanlık eklendi');
        }

        closeModal();
    };

    const closeModal = () => {
        setIsAddModalOpen(false);
        setEditingHabit(null);
        setFormData({
            title: '',
            description: '',
            emoji: '✨',
            color: HABIT_COLORS[0] as string,
            type: 'boolean',
            target: 1,
            unit: '',
            frequencyType: 'weeklyTarget',
            weeklyTarget: 7,
            specificDays: [1, 2, 3, 4, 5],
            everyXDays: 1,
        });
    };

    const openEditModal = (habit: Habit) => {
        setEditingHabit(habit);
        setFormData({
            title: habit.title,
            description: habit.description || '',
            emoji: habit.emoji,
            color: habit.color || HABIT_COLORS[0],
            type: habit.type,
            target: habit.target || 1,
            unit: habit.unit || '',
            frequencyType: habit.frequency.type,
            weeklyTarget: habit.frequency.type === 'weeklyTarget' ? habit.frequency.timesPerWeek : 7,
            specificDays: habit.frequency.type === 'specificDays' ? habit.frequency.days : [1, 2, 3, 4, 5],
            everyXDays: habit.frequency.type === 'everyXDays' ? habit.frequency.interval : 1,
        });
        setOpenMenu(null);
    };

    const toggleHabit = (habitId: string, isCompleted: boolean) => {
        logHabit(habitId, new Date().toISOString().split('T')[0], isCompleted ? undefined : true);
    };

    const handleDelete = (id: string) => {
        deleteHabit(id);
        setDeleteConfirm(null);
        addToast('success', 'Alışkanlık silindi');
    };

    const toggleArchive = (habit: Habit) => {
        updateHabit(habit.id, { isArchived: !habit.isArchived });
        addToast('success', habit.isArchived ? 'Alışkanlık geri yüklendi' : 'Alışkanlık arşivlendi');
        setOpenMenu(null);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Alışkanlıklar</h1>
                    <p className="text-secondary mt-1">
                        Bugün: {todayCompleted}/{todayHabits.length} tamamlandı
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setShowArchived(!showArchived)}
                        leftIcon={<Archive className="w-4 h-4" />}
                    >
                        {showArchived ? 'Aktifler' : 'Arşiv'}
                    </Button>
                    <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                        Alışkanlık Ekle
                    </Button>
                </div>
            </div>

            {/* Today's Progress */}
            {!showArchived && todayHabits.length > 0 && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-primary">Bugünkü İlerleme</h3>
                        <span className="text-sm text-secondary">
                            {Math.round((todayCompleted / todayHabits.length) * 100)}%
                        </span>
                    </div>
                    <ProgressBar
                        value={(todayCompleted / todayHabits.length) * 100}
                        color="#22c55e"
                    />
                </Card>
            )}

            {/* Habits Grid */}
            {displayHabits.length === 0 ? (
                <EmptyState
                    icon={<Target className="w-8 h-8 text-tertiary" />}
                    title={showArchived ? 'Arşivde alışkanlık yok' : 'Henüz alışkanlık yok'}
                    description="Günlük alışkanlıklarınızı takip edin"
                    action={
                        !showArchived && (
                            <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
                                İlk Alışkanlığı Ekle
                            </Button>
                        )
                    }
                />
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                        {displayHabits.map((habit) => {
                            if (!habit) return null;
                            const todayData = todayHabits.find(h => h.habit.id === habit.habit.id);
                            const isCompletedToday = todayData?.isCompletedToday || false;
                            const isDueToday = todayData !== undefined;

                            return (
                                <motion.div
                                    key={habit.habit.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    layout
                                >
                                    <Card
                                        className={cn(
                                            'relative overflow-hidden transition-all',
                                            habit.habit.isArchived && 'opacity-60'
                                        )}
                                        style={{ borderColor: habit.habit.color + '40' }}
                                    >
                                        {/* Color stripe */}
                                        <div
                                            className="absolute top-0 left-0 right-0 h-1"
                                            style={{ backgroundColor: habit.habit.color }}
                                        />

                                        <div className="flex items-start gap-3 pt-2">
                                            {/* Toggle */}
                                            {isDueToday && !habit.habit.isArchived && (
                                                <button
                                                    onClick={() => toggleHabit(habit.habit.id, isCompletedToday)}
                                                    className="mt-1 flex-shrink-0"
                                                >
                                                    {isCompletedToday ? (
                                                        <CheckCircle
                                                            className="w-6 h-6"
                                                            style={{ color: habit.habit.color }}
                                                        />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-secondary hover:text-primary transition-colors" />
                                                    )}
                                                </button>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    to={`/habits/${habit.habit.id}`}
                                                    className="flex items-center gap-2 group"
                                                >
                                                    <span className="text-xl">{habit.habit.emoji}</span>
                                                    <h3 className="font-semibold text-primary group-hover:text-[var(--color-accent)] transition-colors truncate">
                                                        {habit.habit.title}
                                                    </h3>
                                                </Link>

                                                {habit.habit.description && (
                                                    <p className="text-sm text-secondary mt-1 line-clamp-1">
                                                        {habit.habit.description}
                                                    </p>
                                                )}

                                                {/* Stats */}
                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex items-center gap-1">
                                                        <Flame className="w-4 h-4 text-orange-500" />
                                                        <span className="text-sm font-medium text-primary">
                                                            {habit.currentStreak}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                                        <span className="text-sm font-medium text-primary">
                                                            {habit.score}%
                                                        </span>
                                                    </div>
                                                    {!isDueToday && !habit.habit.isArchived && (
                                                        <Badge size="sm" color="#94a3b8">
                                                            Bugün yok
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Menu */}
                                            <div className="relative">
                                                <IconButton
                                                    size="sm"
                                                    onClick={() => setOpenMenu(openMenu === habit.habit.id ? null : habit.habit.id)}
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </IconButton>

                                                {openMenu === habit.habit.id && (
                                                    <>
                                                        <div
                                                            className="fixed inset-0 z-10"
                                                            onClick={() => setOpenMenu(null)}
                                                        />
                                                        <div className="absolute right-0 top-8 bg-primary border border-default rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
                                                            <button
                                                                className="w-full px-3 py-2 text-left text-sm text-secondary hover:bg-secondary flex items-center gap-2"
                                                                onClick={() => openEditModal(habit.habit)}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                                Düzenle
                                                            </button>
                                                            <button
                                                                className="w-full px-3 py-2 text-left text-sm text-secondary hover:bg-secondary flex items-center gap-2"
                                                                onClick={() => toggleArchive(habit.habit)}
                                                            >
                                                                {habit.habit.isArchived ? (
                                                                    <>
                                                                        <ArchiveRestore className="w-4 h-4" />
                                                                        Geri Yükle
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Archive className="w-4 h-4" />
                                                                        Arşivle
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-secondary flex items-center gap-2"
                                                                onClick={() => {
                                                                    setDeleteConfirm(habit.habit.id);
                                                                    setOpenMenu(null);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Sil
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isAddModalOpen || !!editingHabit}
                onClose={closeModal}
                title={editingHabit ? 'Alışkanlığı Düzenle' : 'Yeni Alışkanlık'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <label className="block text-sm font-medium text-secondary mb-1">Emoji</label>
                            <input
                                type="text"
                                value={formData.emoji}
                                onChange={(e) => setFormData({ ...formData, emoji: e.target.value.slice(0, 2) })}
                                className="w-14 h-14 text-3xl text-center bg-secondary rounded-lg border border-default"
                            />
                        </div>
                        <div className="flex-1">
                            <Input
                                label="Alışkanlık Adı"
                                placeholder="Örn: Kitap Oku"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                autoFocus
                            />
                        </div>
                    </div>

                    <Input
                        label="Açıklama (Opsiyonel)"
                        placeholder="Alışkanlık hakkında kısa not..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Renk</label>
                        <div className="flex gap-2 flex-wrap">
                            {HABIT_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={cn(
                                        'w-8 h-8 rounded-full transition-transform',
                                        formData.color === color && 'ring-2 ring-offset-2 ring-[var(--color-accent)] scale-110'
                                    )}
                                    style={{ backgroundColor: color }}
                                    onClick={() => setFormData({ ...formData, color })}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Type */}
                    <Select
                        label="Tür"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'boolean' | 'numeric' })}
                        options={[
                            { value: 'boolean', label: 'Onay Kutusu (Yaptım/Yapmadım)' },
                            { value: 'numeric', label: 'Sayısal (Hedef miktar)' },
                        ]}
                    />

                    {/* Numeric Options */}
                    {formData.type === 'numeric' && (
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                type="number"
                                label="Günlük Hedef"
                                min={1}
                                value={formData.target}
                                onChange={(e) => setFormData({ ...formData, target: parseInt(e.target.value) || 1 })}
                            />
                            <Input
                                label="Birim"
                                placeholder="Örn: sayfa, bardak"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            />
                        </div>
                    )}

                    {/* Frequency */}
                    <Select
                        label="Sıklık"
                        value={formData.frequencyType}
                        onChange={(e) => setFormData({ ...formData, frequencyType: e.target.value as FrequencyRule['type'] })}
                        options={Object.entries(frequencyTypeLabels).map(([value, label]) => ({ value, label }))}
                    />

                    {formData.frequencyType === 'weeklyTarget' && (
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-1">
                                Haftada kaç kez?
                            </label>
                            <input
                                type="range"
                                min={1}
                                max={7}
                                value={formData.weeklyTarget}
                                onChange={(e) => setFormData({ ...formData, weeklyTarget: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <p className="text-sm text-secondary text-center mt-1">{formData.weeklyTarget} gün/hafta</p>
                        </div>
                    )}

                    {formData.frequencyType === 'specificDays' && (
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2">Günler</label>
                            <div className="flex gap-2">
                                {dayLabels.map((label, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className={cn(
                                            'w-10 h-10 rounded-full text-sm font-medium transition-colors',
                                            formData.specificDays.includes(index)
                                                ? 'bg-[var(--color-accent)] text-white'
                                                : 'bg-secondary text-secondary'
                                        )}
                                        onClick={() => {
                                            const days = formData.specificDays.includes(index)
                                                ? formData.specificDays.filter(d => d !== index)
                                                : [...formData.specificDays, index].sort();
                                            setFormData({ ...formData, specificDays: days });
                                        }}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {formData.frequencyType === 'everyXDays' && (
                        <Input
                            type="number"
                            label="Kaç günde bir?"
                            min={1}
                            max={30}
                            value={formData.everyXDays}
                            onChange={(e) => setFormData({ ...formData, everyXDays: parseInt(e.target.value) || 1 })}
                        />
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={closeModal}>
                            İptal
                        </Button>
                        <Button type="submit">{editingHabit ? 'Güncelle' : 'Ekle'}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Alışkanlığı Sil"
                size="sm"
            >
                <p className="text-secondary mb-6">
                    Bu alışkanlığı ve tüm geçmişini silmek istediğinize emin misiniz?
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
