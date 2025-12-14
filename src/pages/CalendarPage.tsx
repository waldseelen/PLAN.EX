import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Trash2, Upload } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { Badge, Card } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../context/AppContext';
import { usePlanner } from '../context/PlannerContext';
import { cn, generateId, getDaysUntil } from '../lib/utils';
import { CalendarEvent, Course, Exam } from '../types';

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    exams: Array<{ exam: Exam; course: Course }>;
    events: CalendarEvent[];
}

// Local storage for calendar events
const CALENDAR_EVENTS_KEY = 'planex-calendar-events';

function getCalendarEvents(): CalendarEvent[] {
    try {
        const data = localStorage.getItem(CALENDAR_EVENTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveCalendarEvents(events: CalendarEvent[]): void {
    localStorage.setItem(CALENDAR_EVENTS_KEY, JSON.stringify(events));
}

export function CalendarPage() {
    const { state } = usePlanner();
    const { addToast } = useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(getCalendarEvents);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        color: '#6366f1',
        type: 'event' as 'event' | 'reminder' | 'deadline',
    });

    const { days, monthName, year } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        const endDate = new Date(lastDay);
        const daysToAdd = 6 - lastDay.getDay();
        endDate.setDate(endDate.getDate() + daysToAdd);

        const days: CalendarDay[] = [];
        const current = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Exam map
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

        // Events map
        const eventsByDate = new Map<string, CalendarEvent[]>();
        calendarEvents.forEach(event => {
            if (!eventsByDate.has(event.dateISO)) {
                eventsByDate.set(event.dateISO, []);
            }
            eventsByDate.get(event.dateISO)!.push(event);
        });

        while (current <= endDate) {
            const dateKey = current.toISOString().split('T')[0];
            days.push({
                date: new Date(current),
                isCurrentMonth: current.getMonth() === month,
                isToday: current.getTime() === today.getTime(),
                exams: examsByDate.get(dateKey) || [],
                events: eventsByDate.get(dateKey) || [],
            });
            current.setDate(current.getDate() + 1);
        }

        const monthName = firstDay.toLocaleDateString('tr-TR', { month: 'long' });
        return { days, monthName, year };
    }, [currentDate, state.courses, calendarEvents]);

    const goToPreviousMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const openAddModal = (dateISO: string) => {
        setSelectedDate(dateISO);
        setEditingEvent(null);
        setFormData({ title: '', description: '', color: '#6366f1', type: 'event' });
        setIsModalOpen(true);
    };

    const openEditModal = (event: CalendarEvent) => {
        setSelectedDate(event.dateISO);
        setEditingEvent(event);
        setFormData({
            title: event.title,
            description: event.description || '',
            color: event.color || '#6366f1',
            type: event.type || 'event',
        });
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.title.trim() || !selectedDate) return;

        if (editingEvent) {
            // Update event
            const updatedEvents = calendarEvents.map(e =>
                e.id === editingEvent.id
                    ? { ...e, ...formData, dateISO: selectedDate }
                    : e
            );
            setCalendarEvents(updatedEvents);
            saveCalendarEvents(updatedEvents);
        } else {
            // Add new event
            const newEvent: CalendarEvent = {
                id: generateId(),
                title: formData.title,
                dateISO: selectedDate,
                description: formData.description,
                color: formData.color,
                type: formData.type,
            };
            const updatedEvents = [...calendarEvents, newEvent];
            setCalendarEvents(updatedEvents);
            saveCalendarEvents(updatedEvents);
        }

        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleDelete = (eventId: string) => {
        const updatedEvents = calendarEvents.filter(e => e.id !== eventId);
        setCalendarEvents(updatedEvents);
        saveCalendarEvents(updatedEvents);
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const parseICSFile = (content: string): CalendarEvent[] => {
        const events: CalendarEvent[] = [];
        const lines = content.split(/\r?\n/);
        let currentEvent: Partial<CalendarEvent> | null = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line === 'BEGIN:VEVENT') {
                currentEvent = {
                    id: generateId(),
                    color: '#6366f1',
                    type: 'event',
                };
            } else if (line === 'END:VEVENT' && currentEvent) {
                if (currentEvent.title && currentEvent.dateISO) {
                    events.push(currentEvent as CalendarEvent);
                }
                currentEvent = null;
            } else if (currentEvent) {
                if (line.startsWith('SUMMARY:')) {
                    currentEvent.title = line.substring(8);
                } else if (line.startsWith('DESCRIPTION:')) {
                    currentEvent.description = line.substring(12);
                } else if (line.startsWith('DTSTART')) {
                    const dateMatch = line.match(/:(\\d{8})/);
                    if (dateMatch) {
                        const dateStr = dateMatch[1];
                        const year = dateStr.substring(0, 4);
                        const month = dateStr.substring(4, 6);
                        const day = dateStr.substring(6, 8);
                        currentEvent.dateISO = `${year}-${month}-${day}`;
                    }
                }
            }
        }

        return events;
    };

    const handleImportICS = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedEvents = parseICSFile(content);

                if (importedEvents.length > 0) {
                    const updatedEvents = [...calendarEvents, ...importedEvents];
                    setCalendarEvents(updatedEvents);
                    saveCalendarEvents(updatedEvents);
                    addToast('success', `${importedEvents.length} etkinlik içe aktarıldı`);
                } else {
                    addToast('error', 'ICS dosyasında etkinlik bulunamadı');
                }
            } catch (error) {
                addToast('error', 'ICS dosyası okunamadı');
            }
        };
        reader.readAsText(file);

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const weekDays = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

    // Get all upcoming items
    const upcomingItems = useMemo(() => {
        const items: Array<{
            id: string;
            title: string;
            dateISO: string;
            daysLeft: number;
            type: 'exam' | 'event';
            color: string;
            courseName?: string;
        }> = [];

        // Add exams
        state.courses.forEach(course => {
            course.exams.forEach(exam => {
                const daysLeft = getDaysUntil(exam.examDateISO);
                if (daysLeft >= 0 && daysLeft <= 30) {
                    items.push({
                        id: exam.id,
                        title: exam.title,
                        dateISO: exam.examDateISO,
                        daysLeft,
                        type: 'exam',
                        color: course.color || '#6366f1',
                        courseName: course.title,
                    });
                }
            });
        });

        // Add events
        calendarEvents.forEach(event => {
            const daysLeft = getDaysUntil(event.dateISO);
            if (daysLeft >= 0 && daysLeft <= 30) {
                items.push({
                    id: event.id,
                    title: event.title,
                    dateISO: event.dateISO,
                    daysLeft,
                    type: 'event',
                    color: event.color || '#6366f1',
                });
            }
        });

        return items.sort((a, b) => a.daysLeft - b.daysLeft);
    }, [state.courses, calendarEvents]);

    const colorOptions = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16',
        '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
        '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Takvim</h1>
                    <p className="text-secondary mt-1">Etkinlikler ve sınavlar</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={goToToday}>
                        Bugün
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".ics"
                        onChange={handleImportICS}
                        className="hidden"
                    />
                    <Button
                        variant="secondary"
                        leftIcon={<Upload className="w-4 h-4" />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        ICS İçe Aktar
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => openAddModal(new Date().toISOString().split('T')[0])}
                    >
                        Etkinlik Ekle
                    </Button>
                </div>
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
                        {days.map((day, index) => {
                            const dateISO = day.date.toISOString().split('T')[0];
                            const allItems = [...day.exams.map(e => ({ ...e, isExam: true })), ...day.events.map(e => ({ event: e, isExam: false }))];

                            return (
                                <div
                                    key={index}
                                    onClick={() => openAddModal(dateISO)}
                                    className={cn(
                                        'min-h-[90px] p-2 rounded-lg transition-colors cursor-pointer hover:bg-opacity-80',
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

                                    {/* Items */}
                                    <div className="mt-1 space-y-1">
                                        {day.exams.slice(0, 1).map(({ exam, course }) => (
                                            <div
                                                key={exam.id}
                                                onClick={(e) => e.stopPropagation()}
                                                className="text-xs px-1.5 py-0.5 rounded truncate"
                                                style={{ backgroundColor: `${course.color}30`, color: course.color }}
                                                title={`Sınav: ${exam.title}`}
                                            >
                                                📚 {exam.title}
                                            </div>
                                        ))}
                                        {day.events.slice(0, 1).map((event) => (
                                            <div
                                                key={event.id}
                                                className="group relative text-xs px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                                                style={{ backgroundColor: `${event.color}30`, color: event.color }}
                                                title={event.title}
                                            >
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(event);
                                                    }}
                                                    className="flex items-center justify-between gap-1"
                                                >
                                                    <span className="truncate">
                                                        {event.type === 'deadline' ? '⏰' : event.type === 'reminder' ? '🔔' : '📅'} {event.title}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(event.id);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 hover:scale-110 transition-all"
                                                        title="Sil"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {(day.exams.length + day.events.length) > 2 && (
                                            <div className="text-xs text-tertiary px-1">
                                                +{day.exams.length + day.events.length - 2} daha
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Upcoming Items Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5" />
                            Yaklaşan Etkinlikler
                        </h3>

                        {upcomingItems.length === 0 ? (
                            <p className="text-secondary text-sm text-center py-4">
                                Yaklaşan etkinlik yok
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {upcomingItems.slice(0, 10).map((item) => (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            'p-3 rounded-lg',
                                            item.daysLeft <= 3 ? 'bg-red-500/10' : item.daysLeft <= 7 ? 'bg-orange-500/10' : 'bg-secondary'
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <div
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-xs text-secondary truncate">
                                                {item.type === 'exam' ? '📚 Sınav' : '📅 Etkinlik'}
                                                {item.courseName && ` • ${item.courseName}`}
                                            </span>
                                        </div>
                                        <p className="font-medium text-primary text-sm">{item.title}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-xs text-secondary">
                                                {new Date(item.dateISO).toLocaleDateString('tr-TR', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                })}
                                            </span>
                                            <Badge
                                                size="sm"
                                                color={item.daysLeft <= 3 ? '#ef4444' : item.daysLeft <= 7 ? '#f97316' : '#6366f1'}
                                            >
                                                {item.daysLeft === 0 ? 'Bugün' : `${item.daysLeft} gün`}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add/Edit Event Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                }}
                title={editingEvent ? 'Etkinliği Düzenle' : 'Yeni Etkinlik'}
            >
                <div className="space-y-4">
                    <Input
                        label="Başlık"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Etkinlik adı..."
                    />

                    <Input
                        type="date"
                        label="Tarih"
                        value={selectedDate || ''}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />

                    <Textarea
                        label="Açıklama (isteğe bağlı)"
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Açıklama..."
                        rows={3}
                    />

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Tür</label>
                        <div className="flex gap-2">
                            {[
                                { value: 'event', label: '📅 Etkinlik' },
                                { value: 'reminder', label: '🔔 Hatırlatma' },
                                { value: 'deadline', label: '⏰ Son Tarih' },
                            ].map(option => (
                                <button
                                    key={option.value}
                                    onClick={() => setFormData({ ...formData, type: option.value as any })}
                                    className={cn(
                                        'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        formData.type === option.value
                                            ? 'bg-[var(--color-accent)] text-white'
                                            : 'bg-secondary text-secondary hover:text-primary'
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-secondary mb-2">Renk</label>
                        <div className="flex gap-2 flex-wrap">
                            {colorOptions.map(color => (
                                <button
                                    key={color}
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

                    <div className="flex gap-3 pt-4">
                        {editingEvent && (
                            <Button
                                variant="danger"
                                onClick={() => handleDelete(editingEvent.id)}
                                leftIcon={<Trash2 className="w-4 h-4" />}
                            >
                                Sil
                            </Button>
                        )}
                        <div className="flex-1" />
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                            İptal
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleSave}
                            disabled={!formData.title.trim()}
                        >
                            {editingEvent ? 'Güncelle' : 'Ekle'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
