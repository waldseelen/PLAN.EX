import {
    ArrowLeft,
    BarChart3,
    CheckCircle,
    Circle,
    Edit2,
    Flame,
    Target,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, EmptyState, ProgressRing } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useHabits } from '../context/HabitsContext';
import { cn, formatDateDisplay, getLastNDays } from '../lib/utils';
import { Habit } from '../types';

export function HabitDetailPage() {
    const { habitId } = useParams<{ habitId: string }>();
    const navigate = useNavigate();
    const { state, getHabitWithStats, getHabitLogs, logHabit, updateHabit, deleteHabit } = useHabits();

    const habit = state.habits.find(h => h.id === habitId);
    const habitStats = habit ? getHabitWithStats(habit.id) : null;
    const logs = habit ? getHabitLogs(habit.id) : [];

    const [heatmapMonths] = useState(3);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Habit> | null>(null);

    // Generate heatmap data for last N months
    const heatmapData = useMemo(() => {
        if (!habit) return [];

        const days = heatmapMonths * 30;
        const lastNDays = getLastNDays(days);
        const logMap = new Map(logs.map(l => [l.dateISO, l]));

        return lastNDays.map(dateISO => {
            const log = logMap.get(dateISO);
            const date = new Date(dateISO);
            return {
                dateISO,
                date,
                done: log?.done || false,
                value: log?.value,
                dayOfWeek: date.getDay(),
            };
        });
    }, [habit, logs, heatmapMonths]);

    // Group heatmap by weeks
    const heatmapWeeks = useMemo(() => {
        const weeks: typeof heatmapData[] = [];
        let currentWeek: typeof heatmapData = [];

        heatmapData.forEach((day, index) => {
            if (index === 0) {
                // Pad first week with empty cells
                for (let i = 0; i < day.dayOfWeek; i++) {
                    currentWeek.push(null as any);
                }
            }
            currentWeek.push(day);
            if (day.dayOfWeek === 6 || index === heatmapData.length - 1) {
                weeks.push([...currentWeek]);
                currentWeek = [];
            }
        });

        return weeks;
    }, [heatmapData]);

    // Weekly progress for bar chart
    const weeklyProgress = useMemo(() => {
        const weeks: { weekStart: string; completed: number; total: number }[] = [];
        const last8Weeks = getLastNDays(56);
        const logMap = new Map(logs.map(l => [l.dateISO, l]));

        for (let i = 0; i < 8; i++) {
            const weekDays = last8Weeks.slice(i * 7, (i + 1) * 7);
            let completed = 0;
            weekDays.forEach(day => {
                const log = logMap.get(day);
                if (log?.done || (habit?.type === 'numeric' && log?.value && log.value >= (habit?.target || 0))) {
                    completed++;
                }
            });
            weeks.push({
                weekStart: weekDays[0],
                completed,
                total: 7,
            });
        }

        return weeks.reverse();
    }, [logs, habit]);

    if (!habit || !habitStats) {
        return (
            <div className="animate-fade-in">
                <EmptyState
                    icon={<Target className="w-8 h-8 text-tertiary" />}
                    title="Alışkanlık bulunamadı"
                    action={
                        <Link to="/habits">
                            <Button>
                                Alışkanlıklara Dön
                            </Button>
                        </Link>
                    }
                />
            </div>
        );
    }

    const openEditModal = () => {
        if (!habit) return;
        setEditFormData({
            title: habit.title,
            description: habit.description,
            emoji: habit.emoji,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSave = () => {
        if (!habit || !editFormData?.title?.trim()) return;
        updateHabit(habit.id, editFormData);
        setIsEditModalOpen(false);
        setEditFormData(null);
    };

    const handleDelete = () => {
        if (!habit) return;
        deleteHabit(habit.id);
        navigate('/habits');
    };

    const toggleToday = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayLog = logs.find(l => l.dateISO === today);
        logHabit(habit.id, today, todayLog?.done ? undefined : true);
    };

    const todayLog = logs.find(l => l.dateISO === new Date().toISOString().split('T')[0]);
    const isCompletedToday = todayLog?.done ||
        (habit.type === 'numeric' && todayLog?.value && todayLog.value >= (habit.target || 0));

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/habits">
                    <IconButton variant="secondary">
                        <ArrowLeft className="w-5 h-5" />
                    </IconButton>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{habit.emoji}</span>
                        <div>
                            <h1 className="text-2xl font-bold text-primary">{habit.title}</h1>
                            {habit.description && (
                                <p className="text-secondary mt-1">{habit.description}</p>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <IconButton
                        variant="secondary"
                        onClick={openEditModal}
                        title="Düzenle"
                    >
                        <Edit2 className="w-5 h-5" />
                    </IconButton>
                    <IconButton
                        variant="danger"
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        title="Sil"
                    >
                        <Trash2 className="w-5 h-5" />
                    </IconButton>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center" style={{ borderColor: habit.color + '40' }}>
                    <div className="p-3 rounded-full w-fit mx-auto mb-2" style={{ backgroundColor: habit.color + '20' }}>
                        <Flame className="w-6 h-6" style={{ color: habit.color }} />
                    </div>
                    <p className="text-3xl font-bold text-primary">{habitStats.currentStreak}</p>
                    <p className="text-sm text-secondary">Güncel Seri</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto mb-2">
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-primary">{habitStats.longestStreak}</p>
                    <p className="text-sm text-secondary">En Uzun Seri</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto mb-2">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-primary">{habitStats.totalCompletions}</p>
                    <p className="text-sm text-secondary">Toplam Tamamlama</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto mb-2">
                        <BarChart3 className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-primary">{habitStats.score}%</p>
                    <p className="text-sm text-secondary">Başarı Oranı</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                {/* Heatmap */}
                <Card>
                    <CardHeader
                        title="Aktivite Haritası"
                        subtitle={`Son ${heatmapMonths} ay`}
                    />

                    <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
                        <div className="flex flex-col gap-1 mr-2 text-xs text-tertiary">
                            {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((day, i) => (
                                <div key={day} className="h-4 flex items-center">
                                    {i % 2 === 1 && day}
                                </div>
                            ))}
                        </div>

                        {heatmapWeeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {week.map((day, dayIndex) => (
                                    <div
                                        key={`${weekIndex}-${dayIndex}`}
                                        className={cn(
                                            'w-4 h-4 rounded-sm',
                                            day ? (
                                                day.done ? 'cursor-pointer' : 'cursor-pointer'
                                            ) : ''
                                        )}
                                        style={{
                                            backgroundColor: day ? (
                                                day.done ? habit.color : 'var(--color-bg-secondary)'
                                            ) : 'transparent',
                                            opacity: day?.done ? 1 : 0.5,
                                        }}
                                        title={day ? `${formatDateDisplay(day.dateISO)}${day.done ? ' ✓' : ''}` : ''}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-default text-sm text-secondary">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm bg-secondary" />
                            <span>Yapılmadı</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: habit.color }} />
                            <span>Yapıldı</span>
                        </div>
                    </div>
                </Card>

                {/* Today's Status */}
                <div className="space-y-4">
                    <Card className="text-center">
                        <h3 className="font-semibold text-primary mb-4">Bugün</h3>

                        <ProgressRing
                            value={isCompletedToday ? 100 : 0}
                            size={120}
                            strokeWidth={10}
                            color={habit.color}
                        >
                            <button onClick={toggleToday} className="p-2">
                                {isCompletedToday ? (
                                    <CheckCircle className="w-12 h-12" style={{ color: habit.color }} />
                                ) : (
                                    <Circle className="w-12 h-12 text-secondary hover:text-primary transition-colors" />
                                )}
                            </button>
                        </ProgressRing>

                        <p className="text-secondary mt-4">
                            {isCompletedToday ? 'Tamamlandı! 🎉' : 'Tamamlamak için tıkla'}
                        </p>
                    </Card>

                    {/* Weekly Trend */}
                    <Card>
                        <CardHeader title="Haftalık Trend" />

                        <div className="flex items-end justify-between gap-2 h-24 mt-4">
                            {weeklyProgress.map((week, index) => {
                                const height = (week.completed / week.total) * 100;
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center">
                                        <div className="relative w-full h-20 flex flex-col justify-end">
                                            <div
                                                className="w-full rounded-t transition-all"
                                                style={{
                                                    height: `${height}%`,
                                                    backgroundColor: habit.color,
                                                    opacity: index === weeklyProgress.length - 1 ? 1 : 0.6,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs text-tertiary mt-1">
                                            {week.completed}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditFormData(null);
                }}
                title="Alışkanlığı Düzenle"
            >
                {editFormData && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary mb-2">Emoji</label>
                            <Input
                                type="text"
                                value={editFormData.emoji || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, emoji: e.target.value })}
                                placeholder="😊"
                                maxLength={2}
                            />
                        </div>

                        <Input
                            label="Başlık"
                            value={editFormData.title || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                            placeholder="Alışkanlık adı..."
                        />

                        <Input
                            label="Açıklama (isteğe bağlı)"
                            value={editFormData.description || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                            placeholder="Alışkanlık açıklaması..."
                        />

                        <div className="flex gap-3 pt-4">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setEditFormData(null);
                                }}
                            >
                                İptal
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleEditSave}
                                disabled={!editFormData.title?.trim()}
                            >
                                Kaydet
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                title="Alışkanlığı Sil?"
            >
                <div className="space-y-4">
                    <p className="text-secondary">
                        "{habit?.title}" alışkanlığını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                        >
                            İptal
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                        >
                            Evet, Sil
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
