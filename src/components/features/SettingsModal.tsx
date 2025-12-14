import {
    AlertTriangle,
    Clock,
    Download,
    Keyboard,
    Upload,
    Volume2
} from 'lucide-react';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useHabits } from '../../context/HabitsContext';
import { usePlanner } from '../../context/PlannerContext';
import { getAllHabitLogs } from '../../lib/storage';
import { cn, downloadFile, formatDate } from '../../lib/utils';
import { BackupData, BackupDataSchema } from '../../types';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';

export function SettingsModal() {
    const { isSettingsOpen, setIsSettingsOpen, settings, updateSettings, addToast } = useApp();
    const { state: plannerState, importData } = usePlanner();
    const { state: habitsState, importHabits } = useHabits();

    const [activeTab, setActiveTab] = useState<'general' | 'pomodoro' | 'backup' | 'shortcuts'>('general');
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const tabs = [
        { id: 'general', label: 'Genel', icon: <Volume2 className="w-4 h-4" /> },
        { id: 'pomodoro', label: 'Pomodoro', icon: <Clock className="w-4 h-4" /> },
        { id: 'backup', label: 'Yedekleme', icon: <Download className="w-4 h-4" /> },
        { id: 'shortcuts', label: 'Kısayollar', icon: <Keyboard className="w-4 h-4" /> },
    ] as const;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const habitLogs = await getAllHabitLogs();

            const backup: BackupData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                courses: plannerState.courses,
                completionState: plannerState.completionState,
                personalTasks: plannerState.personalTasks,
                habits: habitsState.habits,
                settings: settings,
                lectureNotesMeta: plannerState.lectureNotesMeta,
            };

            const json = JSON.stringify(backup, null, 2);
            const filename = `planex-backup-${formatDate(new Date())}.json`;
            downloadFile(json, filename, 'application/json');

            updateSettings({ lastBackupISO: new Date().toISOString() });
            addToast('success', 'Yedekleme başarıyla indirildi');
        } catch (error) {
            console.error('Export failed:', error);
            addToast('error', 'Yedekleme oluşturulamadı');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const result = BackupDataSchema.safeParse(data);
            if (!result.success) {
                throw new Error('Geçersiz yedekleme dosyası');
            }

            const backup = result.data;

            // Import planner data
            importData(backup.courses, backup.completionState, backup.personalTasks);

            // Import habits (logs would need to be handled separately if included)
            if (backup.habits) {
                importHabits(backup.habits, []);
            }

            // Update settings
            if (backup.settings) {
                updateSettings(backup.settings);
            }

            addToast('success', 'Yedekleme başarıyla geri yüklendi');
            setIsSettingsOpen(false);
        } catch (error) {
            console.error('Import failed:', error);
            addToast('error', 'Yedekleme geri yüklenemedi. Dosya formatını kontrol edin.');
        } finally {
            setIsImporting(false);
            // Reset input
            event.target.value = '';
        }
    };

    const shortcuts = [
        { keys: 'Ctrl + K', description: 'Arama' },
        { keys: 'Ctrl + ,', description: 'Ayarlar' },
        { keys: 'Ctrl + S', description: 'Yedekle' },
        { keys: 'Ctrl + Z', description: 'Geri Al' },
        { keys: 'Ctrl + Shift + D', description: 'Tema Değiştir' },
        { keys: 'Ctrl + N', description: 'Hızlı Görev Ekle' },
        { keys: 'Escape', description: 'Modal Kapat' },
    ];

    return (
        <Modal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            title="Ayarlar"
            size="lg"
        >
            <div className="flex gap-6">
                {/* Tabs */}
                <div className="w-40 flex-shrink-0 space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)]'
                                    : 'text-secondary hover:bg-secondary hover:text-primary'
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 min-h-[300px]">
                    {/* General */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-primary mb-3">Tema</h3>
                                <Select
                                    value={settings.theme}
                                    onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })}
                                    options={[
                                        { value: 'system', label: 'Sistem' },
                                        { value: 'light', label: 'Açık' },
                                        { value: 'dark', label: 'Koyu' },
                                    ]}
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-primary mb-3">Ses</h3>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.soundEnabled}
                                        onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                                        className="w-4 h-4 rounded border-default text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                    />
                                    <span className="text-secondary">Bildirim sesleri</span>
                                </label>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-primary mb-3">Bildirimler</h3>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.notifications.enabled}
                                        onChange={(e) =>
                                            updateSettings({
                                                notifications: { ...settings.notifications, enabled: e.target.checked },
                                            })
                                        }
                                        className="w-4 h-4 rounded border-default text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                    />
                                    <span className="text-secondary">Web bildirimleri</span>
                                </label>

                                {settings.notifications.enabled && (
                                    <div className="mt-3 ml-7">
                                        <Input
                                            type="time"
                                            label="Hatırlatma saati"
                                            value={settings.notifications.habitReminderTime || '20:00'}
                                            onChange={(e) =>
                                                updateSettings({
                                                    notifications: { ...settings.notifications, habitReminderTime: e.target.value },
                                                })
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Pomodoro */}
                    {activeTab === 'pomodoro' && (
                        <div className="space-y-4">
                            <Input
                                type="number"
                                label="Çalışma süresi (dakika)"
                                value={settings.pomodoro.workDuration}
                                onChange={(e) =>
                                    updateSettings({
                                        pomodoro: { ...settings.pomodoro, workDuration: parseInt(e.target.value) || 25 },
                                    })
                                }
                                min={1}
                                max={120}
                            />

                            <Input
                                type="number"
                                label="Kısa mola (dakika)"
                                value={settings.pomodoro.shortBreakDuration}
                                onChange={(e) =>
                                    updateSettings({
                                        pomodoro: { ...settings.pomodoro, shortBreakDuration: parseInt(e.target.value) || 5 },
                                    })
                                }
                                min={1}
                                max={60}
                            />

                            <Input
                                type="number"
                                label="Uzun mola (dakika)"
                                value={settings.pomodoro.longBreakDuration}
                                onChange={(e) =>
                                    updateSettings({
                                        pomodoro: { ...settings.pomodoro, longBreakDuration: parseInt(e.target.value) || 15 },
                                    })
                                }
                                min={1}
                                max={120}
                            />

                            <Input
                                type="number"
                                label="Uzun mola öncesi oturum sayısı"
                                value={settings.pomodoro.sessionsUntilLongBreak}
                                onChange={(e) =>
                                    updateSettings({
                                        pomodoro: { ...settings.pomodoro, sessionsUntilLongBreak: parseInt(e.target.value) || 4 },
                                    })
                                }
                                min={1}
                                max={10}
                            />

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.pomodoro.autoStartBreaks}
                                    onChange={(e) =>
                                        updateSettings({
                                            pomodoro: { ...settings.pomodoro, autoStartBreaks: e.target.checked },
                                        })
                                    }
                                    className="w-4 h-4 rounded border-default text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                />
                                <span className="text-secondary">Molaları otomatik başlat</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.pomodoro.autoStartWork}
                                    onChange={(e) =>
                                        updateSettings({
                                            pomodoro: { ...settings.pomodoro, autoStartWork: e.target.checked },
                                        })
                                    }
                                    className="w-4 h-4 rounded border-default text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                                />
                                <span className="text-secondary">Çalışmayı otomatik başlat</span>
                            </label>
                        </div>
                    )}

                    {/* Backup */}
                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            {/* Backup Warning */}
                            {settings.lastBackupISO && (
                                <div className="p-4 rounded-lg bg-secondary">
                                    <p className="text-sm text-secondary">
                                        Son yedekleme: {new Date(settings.lastBackupISO).toLocaleDateString('tr-TR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </p>
                                </div>
                            )}

                            {!settings.lastBackupISO && (
                                <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                                        Henüz yedekleme yapılmamış. Verilerinizi kaybetmemek için yedekleme alın.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleExport}
                                    isLoading={isExporting}
                                    leftIcon={<Download className="w-4 h-4" />}
                                >
                                    Yedekle (JSON)
                                </Button>

                                <label className="cursor-pointer">
                                    <span className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 px-4 py-2 text-sm bg-secondary text-primary hover:bg-[var(--color-bg-hover)] border border-default focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2">
                                        <Upload className="w-4 h-4" />
                                        {isImporting ? 'Yükleniyor...' : 'İçe Aktar'}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImport}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            <div className="pt-4 border-t border-default">
                                <p className="text-sm text-secondary mb-2">Yedekleme şunları içerir:</p>
                                <ul className="text-sm text-tertiary space-y-1 list-disc list-inside">
                                    <li>Tüm dersler ve görevler</li>
                                    <li>Sınav tarihleri</li>
                                    <li>Tamamlanma durumları</li>
                                    <li>Kişisel görevler</li>
                                    <li>Alışkanlıklar</li>
                                    <li>Ayarlar</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Shortcuts */}
                    {activeTab === 'shortcuts' && (
                        <div className="space-y-2">
                            {shortcuts.map((shortcut) => (
                                <div
                                    key={shortcut.keys}
                                    className="flex items-center justify-between py-2 border-b border-default last:border-0"
                                >
                                    <span className="text-secondary">{shortcut.description}</span>
                                    <kbd className="px-2 py-1 text-sm bg-secondary rounded border border-default">
                                        {shortcut.keys}
                                    </kbd>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
