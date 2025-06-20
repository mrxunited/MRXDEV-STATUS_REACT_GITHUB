
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../../ui/Card';
import { LOCAL_STORAGE_QUICK_NOTES_KEY } from '../../../../constants';
import { useAuth } from '../../../../contexts/AuthContext'; // To potentially scope notes per user

const QuickNotesWidget: React.FC = () => {
  const { user } = useAuth(); // Get current user
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Use a user-specific key if user is available, otherwise a generic key
  const getStorageKey = useCallback(() => {
    return user ? `${LOCAL_STORAGE_QUICK_NOTES_KEY}_${user.id}` : LOCAL_STORAGE_QUICK_NOTES_KEY;
  }, [user]);

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem(getStorageKey());
      if (savedNotes) {
        setNotes(savedNotes);
      }
    } catch (error) {
        console.error("Failed to load notes from localStorage:", error);
    }
  }, [getStorageKey]);

  const handleSaveNotes = () => {
    try {
        localStorage.setItem(getStorageKey(), notes);
        setIsEditing(false);
        setStatusMessage('Notes saved!');
        setTimeout(() => setStatusMessage(''), 2000);
    } catch (error) {
        console.error("Failed to save notes to localStorage:", error);
        setStatusMessage('Error saving notes.');
        setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";


  return (
    <Card title="Quick Notes" titleIcon="fa-sticky-note">
      <div className="space-y-3">
        {isEditing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} min-h-[100px]`}
            placeholder="Type your notes here..."
          />
        ) : (
          <div 
            className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[100px] border border-dashed border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] rounded-md cursor-text bg-gray-50 dark:bg-slate-700/30"
            onClick={() => setIsEditing(true)}
            onKeyDown={(e) => {if(e.key === 'Enter') setIsEditing(true)}}
            tabIndex={0}
            role="button"
            aria-label="Edit notes"
            >
            {notes ? (
                notes.split('\n').map((line, index) => <p key={index} className="my-0.5">{line || <>&nbsp;</>}</p> )
            ) : (
                <p className="italic text-gray-400 dark:text-gray-500">Click to add notes...</p>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
            {statusMessage && <p className="text-xs text-green-600 dark:text-green-400">{statusMessage}</p>}
            {!statusMessage && <div/>} {/* Placeholder to keep alignment */}
            {isEditing ? (
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            // Optionally, revert to last saved notes if no save
                            const savedNotes = localStorage.getItem(getStorageKey());
                            if (savedNotes) setNotes(savedNotes);
                        }}
                        className="px-3 py-1 text-xs font-medium rounded-md shadow-sm bg-[var(--color-light-button-secondary-bg)] dark:bg-[var(--color-dark-button-secondary-bg)] text-[var(--color-light-button-secondary-text)] dark:text-[var(--color-dark-button-secondary-text)] border border-[var(--color-light-button-secondary-border)] dark:border-[var(--color-dark-button-secondary-border)] hover:bg-[var(--color-light-button-secondary-hover-bg)] dark:hover:bg-[var(--color-dark-button-secondary-hover-bg)]"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1 text-xs font-medium text-white bg-[var(--color-primary-blue)] rounded-md hover:bg-[var(--color-primary-blue-hover)]"
                    >
                        Save Notes
                    </button>
                </div>
            ) : (
                 <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-xs font-medium text-[var(--color-primary-blue)] border border-[var(--color-primary-blue)] rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/40"
                    >
                    <i className="fas fa-pencil-alt mr-1"></i> Edit
                </button>
            )}
        </div>
      </div>
    </Card>
  );
};

export default QuickNotesWidget;
