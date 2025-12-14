import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { IconButton } from '../ui/Button';
import { Card } from '../ui/Card';

const QUICK_NOTES_KEY = 'planex-quick-notes';

interface Note {
    id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

function getQuickNotes(): Note[] {
    try {
        const data = localStorage.getItem(QUICK_NOTES_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveQuickNotes(notes: Note[]): void {
    localStorage.setItem(QUICK_NOTES_KEY, JSON.stringify(notes));
}

export function QuickNotes() {
    const [notes, setNotes] = useState<Note[]>(getQuickNotes);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        saveQuickNotes(notes);
    }, [notes]);

    const addNote = () => {
        if (!newNoteContent.trim()) return;

        const note: Note = {
            id: `${Date.now()}`,
            content: newNoteContent.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setNotes([note, ...notes]);
        setNewNoteContent('');
    };

    const deleteNote = (id: string) => {
        setNotes(notes.filter(n => n.id !== id));
    };

    const startEdit = (note: Note) => {
        setEditingId(note.id);
        setEditContent(note.content);
    };

    const saveEdit = (id: string) => {
        if (!editContent.trim()) {
            deleteNote(id);
        } else {
            setNotes(notes.map(n =>
                n.id === id
                    ? { ...n, content: editContent.trim(), updatedAt: new Date().toISOString() }
                    : n
            ));
        }
        setEditingId(null);
        setEditContent('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    return (
        <Card>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary">📝 Hızlı Notlar</h3>
                <span className="text-xs text-tertiary">{notes.length} not</span>
            </div>

            {/* Add Note */}
            <div className="mb-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addNote();
                            }
                        }}
                        placeholder="Hızlı bir not ekle..."
                        className="flex-1 px-3 py-2 text-sm bg-secondary rounded-lg border border-default focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                    <IconButton
                        onClick={addNote}
                        disabled={!newNoteContent.trim()}
                        className={cn(!newNoteContent.trim() && 'opacity-50 cursor-not-allowed')}
                    >
                        <Save className="w-4 h-4" />
                    </IconButton>
                </div>
            </div>

            {/* Notes List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notes.length === 0 ? (
                    <p className="text-sm text-tertiary text-center py-4">
                        Henüz not yok. İlk notunuzu ekleyin!
                    </p>
                ) : (
                    notes.map((note) => (
                        <div
                            key={note.id}
                            className="group p-3 bg-secondary rounded-lg hover:bg-opacity-80 transition-colors"
                        >
                            {editingId === note.id ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                saveEdit(note.id);
                                            } else if (e.key === 'Escape') {
                                                cancelEdit();
                                            }
                                        }}
                                        autoFocus
                                        className="flex-1 px-2 py-1 text-sm bg-primary rounded border border-default focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                                    />
                                    <button
                                        onClick={() => saveEdit(note.id)}
                                        className="text-green-500 hover:text-green-600 px-2"
                                        title="Kaydet (Enter)"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={cancelEdit}
                                        className="text-secondary hover:text-primary px-2"
                                        title="İptal (Esc)"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between gap-2">
                                    <p
                                        className="flex-1 text-sm text-primary cursor-pointer"
                                        onClick={() => startEdit(note)}
                                    >
                                        {note.content}
                                    </p>
                                    <button
                                        onClick={() => deleteNote(note.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600"
                                        title="Sil"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            {editingId !== note.id && (
                                <p className="text-xs text-tertiary mt-1">
                                    {new Date(note.updatedAt).toLocaleDateString('tr-TR', {
                                        day: 'numeric',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
}
