import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, ProgressRing } from '../components/ui/Card';
import { useApp } from '../context/AppContext';
import { cn, formatDuration } from '../lib/utils';

type TimerMode = 'work' | 'shortBreak' | 'longBreak';

const modeLabels: Record<TimerMode, string> = {
    work: 'Çalışma',
    shortBreak: 'Kısa Mola',
    longBreak: 'Uzun Mola',
};

const modeColors: Record<TimerMode, string> = {
    work: '#6366f1',
    shortBreak: '#22c55e',
    longBreak: '#3b82f6',
};

export function ProductivityPage() {
    const { settings, updateSettings, addToast } = useApp();

    const [mode, setMode] = useState<TimerMode>('work');
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(settings.pomodoro.workDuration * 60);
    const [sessions, setSessions] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Get duration for current mode
    const getDuration = useCallback((m: TimerMode) => {
        switch (m) {
            case 'work':
                return settings.pomodoro.workDuration * 60;
            case 'shortBreak':
                return settings.pomodoro.shortBreakDuration * 60;
            case 'longBreak':
                return settings.pomodoro.longBreakDuration * 60;
        }
    }, [settings.pomodoro]);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.5;
    }, []);

    // Timer logic using Date.now for accuracy
    useEffect(() => {
        if (isRunning && startTime) {
            intervalRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const duration = getDuration(mode);
                const remaining = duration - elapsed;

                if (remaining <= 0) {
                    // Timer finished
                    setIsRunning(false);
                    setStartTime(null);
                    setTimeLeft(0);

                    // Play sound
                    if (settings.soundEnabled && audioRef.current) {
                        audioRef.current.play().catch(() => { });
                    }

                    // Show notification
                    addToast('success', `${modeLabels[mode]} tamamlandı!`);

                    // Handle mode transition
                    if (mode === 'work') {
                        const newSessions = sessions + 1;
                        setSessions(newSessions);

                        if (newSessions >= settings.pomodoro.sessionsUntilLongBreak) {
                            setMode('longBreak');
                            setTimeLeft(getDuration('longBreak'));
                            if (settings.pomodoro.autoStartBreaks) {
                                setIsRunning(true);
                                setStartTime(Date.now());
                            }
                        } else {
                            setMode('shortBreak');
                            setTimeLeft(getDuration('shortBreak'));
                            if (settings.pomodoro.autoStartBreaks) {
                                setIsRunning(true);
                                setStartTime(Date.now());
                            }
                        }
                    } else {
                        if (mode === 'longBreak') {
                            setSessions(0);
                        }
                        setMode('work');
                        setTimeLeft(getDuration('work'));
                        if (settings.pomodoro.autoStartWork) {
                            setIsRunning(true);
                            setStartTime(Date.now());
                        }
                    }
                } else {
                    setTimeLeft(remaining);
                }
            }, 100);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, startTime, mode, sessions, settings, addToast, getDuration]);

    // Update timeLeft when settings change
    useEffect(() => {
        if (!isRunning) {
            setTimeLeft(getDuration(mode));
        }
    }, [settings.pomodoro, mode, isRunning, getDuration]);

    const toggleTimer = () => {
        if (isRunning) {
            // Pause - calculate remaining time
            if (startTime) {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setTimeLeft(getDuration(mode) - elapsed);
            }
            setIsRunning(false);
            setStartTime(null);
        } else {
            // Start/Resume
            const duration = getDuration(mode);
            const remainingRatio = timeLeft / duration;
            setStartTime(Date.now() - (duration - timeLeft) * 1000);
            setIsRunning(true);
        }
    };

    const resetTimer = () => {
        setIsRunning(false);
        setStartTime(null);
        setTimeLeft(getDuration(mode));
    };

    const switchMode = (newMode: TimerMode) => {
        if (isRunning) {
            setIsRunning(false);
            setStartTime(null);
        }
        setMode(newMode);
        setTimeLeft(getDuration(newMode));
    };

    const progress = (timeLeft / getDuration(mode)) * 100;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-primary">Üretkenlik</h1>
                <p className="text-secondary mt-1">Pomodoro zamanlayıcı</p>
            </div>

            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
                {/* Timer */}
                <Card className="flex flex-col items-center py-8">
                    {/* Mode Selector */}
                    <div className="flex gap-2 mb-8">
                        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
                            <Button
                                key={m}
                                variant={mode === m ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => switchMode(m)}
                                style={{
                                    backgroundColor: mode === m ? modeColors[m] : undefined,
                                }}
                            >
                                {modeLabels[m]}
                            </Button>
                        ))}
                    </div>

                    {/* Timer Display */}
                    <ProgressRing
                        value={progress}
                        size={280}
                        strokeWidth={12}
                        color={modeColors[mode]}
                    >
                        <div className="text-center">
                            <p className="text-6xl font-bold text-primary font-mono">
                                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                            </p>
                            <p className="text-lg text-secondary mt-2">{modeLabels[mode]}</p>
                        </div>
                    </ProgressRing>

                    {/* Controls */}
                    <div className="flex items-center gap-4 mt-8">
                        <IconButton
                            size="lg"
                            variant="secondary"
                            onClick={resetTimer}
                            title="Sıfırla"
                        >
                            <RotateCcw className="w-6 h-6" />
                        </IconButton>

                        <Button
                            size="lg"
                            onClick={toggleTimer}
                            leftIcon={isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            style={{ backgroundColor: modeColors[mode] }}
                            className="px-8"
                        >
                            {isRunning ? 'Durdur' : 'Başlat'}
                        </Button>

                        <IconButton
                            size="lg"
                            variant="secondary"
                            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
                            title={settings.soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
                        >
                            {settings.soundEnabled ? (
                                <Volume2 className="w-6 h-6" />
                            ) : (
                                <VolumeX className="w-6 h-6" />
                            )}
                        </IconButton>
                    </div>

                    {/* Sessions */}
                    <div className="flex items-center gap-2 mt-8">
                        {Array.from({ length: settings.pomodoro.sessionsUntilLongBreak }).map((_, i) => (
                            <div
                                key={i}
                                className={cn(
                                    'w-3 h-3 rounded-full transition-colors',
                                    i < sessions ? 'bg-[var(--color-accent)]' : 'bg-secondary'
                                )}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-secondary mt-2">
                        {sessions}/{settings.pomodoro.sessionsUntilLongBreak} oturum
                    </p>
                </Card>

                {/* Settings Sidebar */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader title="Zamanlayıcı Ayarları" />

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Çalışma Süresi
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        value={settings.pomodoro.workDuration}
                                        onChange={(e) =>
                                            updateSettings({
                                                pomodoro: { ...settings.pomodoro, workDuration: parseInt(e.target.value) },
                                            })
                                        }
                                        className="flex-1"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm font-medium text-primary w-12 text-right">
                                        {settings.pomodoro.workDuration} dk
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Kısa Mola
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={settings.pomodoro.shortBreakDuration}
                                        onChange={(e) =>
                                            updateSettings({
                                                pomodoro: { ...settings.pomodoro, shortBreakDuration: parseInt(e.target.value) },
                                            })
                                        }
                                        className="flex-1"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm font-medium text-primary w-12 text-right">
                                        {settings.pomodoro.shortBreakDuration} dk
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-secondary mb-1">
                                    Uzun Mola
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="1"
                                        max="60"
                                        value={settings.pomodoro.longBreakDuration}
                                        onChange={(e) =>
                                            updateSettings({
                                                pomodoro: { ...settings.pomodoro, longBreakDuration: parseInt(e.target.value) },
                                            })
                                        }
                                        className="flex-1"
                                        disabled={isRunning}
                                    />
                                    <span className="text-sm font-medium text-primary w-12 text-right">
                                        {settings.pomodoro.longBreakDuration} dk
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="Bugünkü Özet" />

                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-secondary">Tamamlanan Oturum</span>
                                <span className="font-medium text-primary">{sessions}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-secondary">Toplam Çalışma</span>
                                <span className="font-medium text-primary">
                                    {formatDuration(sessions * settings.pomodoro.workDuration * 60)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
