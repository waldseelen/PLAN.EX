import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card } from '../components/ui/Card';
import { usePlanner } from '../context/PlannerContext';
import { cn, getDaysUntil } from '../lib/utils';
import { Course, Exam } from '../types';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    exams: Array<{ exam: Exam; course: Course }>;
}

export function CalendarPage() {
    const { state } = usePlanner();
    const [currentDate, setCurrentDate] = useState(new Date());

    const { days, monthName, year } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        // Last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Start from previous month's days to fill the first week
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // End at next month's days to fill the last week
        const endDate = new Date(lastDay);
        const daysToAdd = 6 - lastDay.getDay();
        endDate.setDate(endDate.getDate() + daysToAdd);

        const days: CalendarDay[] = [];
        const current = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Create exam map for quick lookup
        const examsByDate = new Map<string, Array<{ exam: Exam; course: Course }>>();
        state.courses.forEach(course => {
            course.exams.forEach(exam => {
                const dateKey = exam.examDateISO;
                if (!examsByDate.has(dateKey)) {
                    examsByDate.set(dateKey, []);
                }
                examsByDate.get(dateKey)!.push({ exam, course });
            });
        });

        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            days.push({
                date: new Date(current),
                isCurrentMonth: current.getMonth() === month,
                isToday: current.getTime() === today.getTime(),
                exams: examsByDate.get(dateKey) || [],
            });
            current.setDate(current.getDate() + 1);
        }

        const monthName = firstDay.toLocaleDateString('tr-TR', { month: 'long' });

        return { days, monthName, year };
    }, [currentDate, state.courses]);

    const goToPreviousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    // Get all upcoming exams for sidebar
    const upcomingExams = useMemo(() => {
        const exams: Array<{ exam: Exam; course: Course; daysLeft: number }> = [];
        state.courses.forEach(course => {
            course.exams.forEach(exam => {
                const daysLeft = getDaysUntil(exam.examDateISO);
                if (daysLeft >= 0) {
                    exams.push({ exam, course, daysLeft });
                }
            });
        });
        return exams.sort((a, b) => a.daysLeft - b.daysLeft);
    }, [state.courses]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Takvim</h1>
                    <p className="text-secondary mt-1">Sınav takvimi</p>
                </div>
                <Button variant="secondary" onClick={goToToday}>
                    Bugün
                </Button>
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                {/* Calendar */}
                <Card>
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-primary capitalize">
                            {monthName} {year}
                        </h2>
                        <div className="flex gap-2">
                            <IconButton onClick={goToPreviousMonth}>
                                <ChevronLeft className="w-5 h-5" />
                            </IconButton>
                            <IconButton onClick={goToNextMonth}>
                                <ChevronRight className="w-5 h-5" />
                            </IconButton>
                        </div>
                    </div>

                    {/* Week Days Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-sm font-medium text-secondary py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'min-h-[80px] p-2 rounded-lg transition-colors',
                                    day.isCurrentMonth ? 'bg-secondary' : 'bg-secondary/50',
                                    day.isToday && 'ring-2 ring-[var(--color-accent)]'
                                )}
                            >
                                <span
                                    className={cn(
                                        'text-sm font-medium',
                                        day.isCurrentMonth ? 'text-primary' : 'text-tertiary',
                                        day.isToday && 'text-[var(--color-accent)]'
                                    )}
                                >
                                    {day.date.getDate()}
                                </span>

                                {/* Exams */}
                                <div className="mt-1 space-y-1">
                                    {day.exams.slice(0, 2).map(({ exam, course }) => (
                                        <div
                                            key={exam.id}
                                            className="text-xs px-1.5 py-0.5 rounded truncate"
                                            style={{ backgroundColor: `${course.color}30`, color: course.color }}
                                            title={exam.title}
                                        >
                                            {exam.title}
                                        </div>
                                    ))}
                                    {day.exams.length > 2 && (
                                        <div className="text-xs text-tertiary px-1">
                                            +{day.exams.length - 2} daha
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Upcoming Exams Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            Yaklaşan Sınavlar
                        </h3>

                        {upcomingExams.length === 0 ? (
                            <p className="text-secondary text-sm text-center py-4">
                                Yaklaşan sınav yok
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingExams.slice(0, 10).map(({ exam, course, daysLeft }) => (
                                    <div
                                        key={exam.id}
                                        className={cn(
                                            'p-3 rounded-lg',
                                            daysLeft <= 3 ? 'bg-red-500/10' : daysLeft <= 7 ? 'bg-orange-500/10' : 'bg-secondary'
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: course.color }}
                                            />
                                            <span className="text-xs text-secondary truncate">{course.title}</span>
                                        </div>
                                        <p className="font-medium text-primary text-sm">{exam.title}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-secondary">
                                                {new Date(exam.examDateISO).toLocaleDateString('tr-TR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                            <Badge
                                                size="sm"
                                                color={daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#6366f1'}
                                            >
                                                {daysLeft} gün
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
