import { BarChart3, CheckCircle, Target, Timer, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardHeader, ProgressBar, ProgressRing } from '../components/ui/Card';
import { useHabits } from '../context/HabitsContext';
import { usePlanner } from '../context/PlannerContext';
import { formatDuration, getLastNDays } from '../lib/utils';

// Get Pomodoro sessions from localStorage
function getPomodoroStats() {
    try {
        const storedSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
        const today = new Date().toISOString().split('T')[0];
        const todaySessions = storedSessions[today] || 0;

        // Calculate total sessions
        let totalSessions = 0;
        Object.values(storedSessions).forEach((count: any) => {
            totalSessions += count;
        });

        return { todaySessions, totalSessions };
    } catch {
        return { todaySessions: 0, totalSessions: 0 };
    }
}

export function StatisticsPage() {
    const { state: plannerState } = usePlanner();
    const { state: habitsState, getTodayHabits, getHabitLogs } = useHabits();

    // Calculate daily completion stats for last 7 days
    const dailyStats = useMemo(() => {
        const last7Days = getLastNDays(7);

        return last7Days.map(dateISO => {
            // Count tasks completed on this day
            let completedTasks = 0;
            Object.entries(plannerState.completionState.completionHistory).forEach(([taskId, completionDate]) => {
                if (completionDate.startsWith(dateISO)) {
                    completedTasks++;
                }
            });

            // Count habits completed on this day
            let completedHabits = 0;
            habitsState.habits.forEach(habit => {
                const logs = getHabitLogs(habit.id);
                const dayLog = logs.find(l => l.dateISO === dateISO);
                if (dayLog?.done || (habit.type === 'numeric' && dayLog?.value && dayLog.value >= (habit.target || 0))) {
                    completedHabits++;
                }
            });

            const date = new Date(dateISO);
            return {
                dateISO,
                dayName: date.toLocaleDateString('tr-TR', { weekday: 'short' }),
                dayNumber: date.getDate(),
                completedTasks,
                completedHabits,
            };
        });
    }, [plannerState.completionState.completionHistory, habitsState.habits, getHabitLogs]);

    // Overall stats
    const overallStats = useMemo(() => {
        let totalTasks = 0;
        let completedTasks = plannerState.completionState.completedTaskIds.length;

        plannerState.courses.forEach(course => {
            course.units.forEach(unit => {
                totalTasks += unit.tasks.length;
            });
        });

        const todayHabits = getTodayHabits();
        const habitsCompleted = todayHabits.filter(h => h.isCompletedToday).length;

        // Calculate average habit score
        const avgHabitScore = todayHabits.length > 0
            ? Math.round(todayHabits.reduce((sum, h) => sum + h.score, 0) / todayHabits.length)
            : 0;

        return {
            totalTasks,
            completedTasks,
            taskCompletion: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            totalHabits: habitsState.habits.filter(h => !h.isArchived).length,
            todayHabits: todayHabits.length,
            habitsCompleted,
            avgHabitScore,
            totalCourses: plannerState.courses.length,
        };
    }, [plannerState, habitsState.habits, getTodayHabits]);

    // Course progress data
    const courseProgress = useMemo(() => {
        return plannerState.courses.map(course => {
            let total = 0;
            let completed = 0;

            course.units.forEach(unit => {
                total += unit.tasks.length;
                completed += unit.tasks.filter(t =>
                    plannerState.completionState.completedTaskIds.includes(t.id)
                ).length;
            });

            return {
                id: course.id,
                title: course.title,
                color: course.color,
                total,
                completed,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
        });
    }, [plannerState]);

    // Max value for chart scaling
    const maxChartValue = Math.max(...dailyStats.map(d => d.completedTasks + d.completedHabits), 1);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary">İstatistikler</h1>
                <p className="text-secondary mt-1">Genel ilerleme ve istatistikler</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto mb-3">
                        <CheckCircle className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{overallStats.completedTasks}</p>
                    <p className="text-sm text-secondary">Tamamlanan Görev</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-green-500/10 w-fit mx-auto mb-3">
                        <Target className="w-6 h-6 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{overallStats.avgHabitScore}%</p>
                    <p className="text-sm text-secondary">Ortalama Alışkanlık Skoru</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto mb-3">
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{overallStats.taskCompletion}%</p>
                    <p className="text-sm text-secondary">Görev Tamamlama</p>
                </Card>

                <Card className="text-center">
                    <div className="p-3 rounded-full bg-orange-500/10 w-fit mx-auto mb-3">
                        <Timer className="w-6 h-6 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold text-primary">{getPomodoroStats().todaySessions}</p>
                    <p className="text-sm text-secondary">Bugünkü Pomodoro</p>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Pomodoro Summary */}
                <Card>
                    <CardHeader title="Pomodoro Özeti" subtitle="Çalışma istatistikleri" />
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-secondary rounded-lg text-center">
                            <Timer className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-primary">{getPomodoroStats().todaySessions}</p>
                            <p className="text-sm text-secondary">Bugün</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg text-center">
                            <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-primary">{getPomodoroStats().totalSessions}</p>
                            <p className="text-sm text-secondary">Toplam</p>
                        </div>
                    </div>
                    <div className="mt-4 p-4 bg-secondary rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-secondary">Bugünkü Çalışma Süresi</span>
                            <span className="font-bold text-primary">{formatDuration(getPomodoroStats().todaySessions * 25 * 60)}</span>
                        </div>
                    </div>
                </Card>

                {/* Weekly Activity Chart */}
                <Card>
                    <CardHeader title="Haftalık Aktivite" subtitle="Son 7 günlük tamamlama" />

                    <div className="flex items-end justify-between gap-2 h-48 mt-4">
                        {dailyStats.map((day, index) => {
                            const totalHeight = ((day.completedTasks + day.completedHabits) / maxChartValue) * 100;
                            const taskHeight = totalHeight > 0 ? (day.completedTasks / (day.completedTasks + day.completedHabits)) * 100 : 0;

                            return (
                                <div key={day.dateISO} className="flex-1 flex flex-col items-center">
                                    <div className="relative w-full h-40 flex flex-col justify-end">
                                        <div
                                            className="w-full rounded-t-lg overflow-hidden transition-all duration-500"
                                            style={{ height: `${totalHeight}%` }}
                                        >
                                            {/* Habits portion */}
                                            <div
                                                className="w-full bg-green-500"
                                                style={{ height: `${100 - taskHeight}%` }}
                                            />
                                            {/* Tasks portion */}
                                            <div
                                                className="w-full bg-blue-500"
                                                style={{ height: `${taskHeight}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-xs text-tertiary">{day.dayName}</p>
                                        <p className="text-sm font-medium text-secondary">{day.dayNumber}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-default">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-blue-500" />
                            <span className="text-sm text-secondary">Görevler</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span className="text-sm text-secondary">Alışkanlıklar</span>
                        </div>
                    </div>
                </Card>

                {/* Overall Progress */}
                <Card>
                    <CardHeader title="Genel İlerleme" />

                    <div className="flex items-center justify-center py-6">
                        <ProgressRing value={overallStats.taskCompletion} size={150} strokeWidth={12}>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-primary">{overallStats.taskCompletion}%</p>
                                <p className="text-sm text-secondary">Tamamlandı</p>
                            </div>
                        </ProgressRing>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 bg-secondary rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">{overallStats.completedTasks}</p>
                            <p className="text-sm text-secondary">Tamamlanan</p>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">
                                {overallStats.totalTasks - overallStats.completedTasks}
                            </p>
                            <p className="text-sm text-secondary">Kalan</p>
                        </div>
                    </div>
                </Card>

                {/* Course Progress */}
                <Card className="lg:col-span-2">
                    <CardHeader title="Ders İlerlemesi" />

                    {courseProgress.length === 0 ? (
                        <p className="text-secondary text-center py-8">Henüz ders eklenmemiş</p>
                    ) : (
                        <div className="space-y-4">
                            {courseProgress.map(course => (
                                <div key={course.id} className="flex items-center gap-4">
                                    <div
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: course.color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-primary truncate">{course.title}</p>
                                            <span className="text-sm text-secondary ml-2">
                                                {course.completed}/{course.total} ({course.percentage}%)
                                            </span>
                                        </div>
                                        <ProgressBar value={course.percentage} color={course.color} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
