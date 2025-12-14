import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { cn, formatDuration } from '../../lib/utils';
import { Button, IconButton } from '../ui/Button';
import { ProgressRing } from '../ui/Card';

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

interface PomodoroDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

// Web Audio API ile white noise üretimi
class WhiteNoiseGenerator {
    private audioContext: AudioContext | null = null;
    private noiseNode: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private isPlaying = false;

    start(volume: number = 0.3) {
        if (this.isPlaying) return;

        this.audioContext = new AudioContext();
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        this.noiseNode = this.audioContext.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = volume;

        this.noiseNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        this.noiseNode.start();
        this.isPlaying = true;
    }

    stop() {
        if (!this.isPlaying) return;

        if (this.noiseNode) {
            this.noiseNode.stop();
            this.noiseNode.disconnect();
            this.noiseNode = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.isPlaying = false;
    }

    setVolume(volume: number) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    get playing() {
        return this.isPlaying;
    }
}

export function PomodoroDrawer({ isOpen, onClose }: PomodoroDrawerProps) {
    const { settings, updateSettings, addToast } = useApp();

    const [mode, setMode] = useState<TimerMode>('work');
    const [isRunning, setIsRunning] = useState(false);
    const [timeLeft, setTimeLeft] = useState(settings.pomodoro.workDuration * 60);
    const [sessions, setSessions] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [whiteNoiseOn, setWhiteNoiseOn] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const whiteNoiseRef = useRef<WhiteNoiseGenerator>(new WhiteNoiseGenerator());

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

        return () => {
            whiteNoiseRef.current.stop();
        };
    }, []);

    // White noise toggle
    const toggleWhiteNoise = () => {
        if (whiteNoiseOn) {
            whiteNoiseRef.current.stop();
            setWhiteNoiseOn(false);
        } else {
            whiteNoiseRef.current.start(0.2);
            setWhiteNoiseOn(true);
        }
    };

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

                    // Save session to localStorage for statistics
                    if (mode === 'work') {
                        const today = new Date().toISOString().split('T')[0];
                        const storedSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
                        storedSessions[today] = (storedSessions[today] || 0) + 1;
                        localStorage.setItem('pomodoroSessions', JSON.stringify(storedSessions));
                    }

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

    // Get today's sessions from localStorage
    const getTodaySessions = () => {
        const today = new Date().toISOString().split('T')[0];
        const storedSessions = JSON.parse(localStorage.getItem('pomodoroSessions') || '{}');
        return storedSessions[today] || 0;
    };

    const todaySessions = getTodaySessions();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed right-0 top-0 h-full w-[350px] max-w-[90vw] bg-card border-l border-default z-50 shadow-2xl overflow-y-auto"
                    >
                        <div className="p-6">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-primary">Pomodoro</h2>
                                <IconButton onClick={onClose} variant="ghost" size="sm">
                                    <X className="w-5 h-5" />
                                </IconButton>
                            </div>

                            {/* Mode Selector */}
                            <div className="flex gap-2 mb-6">
                                {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => switchMode(m)}
                                        className={cn(
                                            'flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors',
                                            mode === m
                                                ? 'text-white'
                                                : 'bg-secondary text-secondary hover:text-primary'
                                        )}
                                        style={{
                                            backgroundColor: mode === m ? modeColors[m] : undefined,
                                        }}
                                    >
                                        {modeLabels[m]}
                                    </button>
                                ))}
                            </div>

                            {/* Timer Display */}
                            <div className="flex justify-center mb-6">
                                <ProgressRing
                                    value={progress}
                                    size={200}
                                    strokeWidth={10}
                                    color={modeColors[mode]}
                                >
                                    <div className="text-center">
                                        <p className="text-4xl font-bold text-primary font-mono">
                                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                                        </p>
                                        <p className="text-sm text-secondary mt-1">{modeLabels[mode]}</p>
                                    </div>
                                </ProgressRing>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-4 mb-6">
                                <IconButton
                                    size="lg"
                                    variant="secondary"
                                    onClick={resetTimer}
                                    title="Sıfırla"
                                >
                                    <RotateCcw className="w-5 h-5" />
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
                                        <Volume2 className="w-5 h-5" />
                                    ) : (
                                        <VolumeX className="w-5 h-5" />
                                    )}
                                </IconButton>
                            </div>

                            {/* Sessions Progress */}
                            <div className="flex items-center justify-center gap-2 mb-6">
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
                            <p className="text-sm text-secondary text-center mb-6">
                                {sessions}/{settings.pomodoro.sessionsUntilLongBreak} oturum
                            </p>

                            {/* White Noise */}
                            <div className="p-4 bg-secondary rounded-lg mb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-primary">White Noise</p>
                                        <p className="text-xs text-secondary">Odaklanma için arka plan sesi</p>
                                    </div>
                                    <button
                                        onClick={toggleWhiteNoise}
                                        className={cn(
                                            'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                                            whiteNoiseOn
                                                ? 'bg-[var(--color-accent)] text-white'
                                                : 'bg-card text-secondary hover:text-primary'
                                        )}
                                    >
                                        {whiteNoiseOn ? 'Kapat' : 'Aç'}
                                    </button>
                                </div>
                            </div>

                            {/* Today Summary */}
                            <div className="p-4 bg-secondary rounded-lg">
                                <h3 className="font-medium text-primary mb-3">Bugünkü Özet</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Tamamlanan Oturum</span>
                                        <span className="font-medium text-primary">{todaySessions + sessions}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-secondary">Toplam Çalışma</span>
                                        <span className="font-medium text-primary">
                                            {formatDuration((todaySessions + sessions) * settings.pomodoro.workDuration * 60)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
