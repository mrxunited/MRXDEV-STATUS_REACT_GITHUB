
import React, { useState, useEffect } from 'react';
import { AdminUser, FormMode } from '../../../types';

interface UserFormProps {
  mode: FormMode;
  initialData?: AdminUser | null;
  onSave: (userData: AdminUser | Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

const UserForm: React.FC<UserFormProps> = ({ mode, initialData, onSave, isSubmitting }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Admin' | 'Support' | 'Viewer'>('Viewer');
  const [appwriteAuthUserId, setAppwriteAuthUserId] = useState(''); // New state for Appwrite Auth User ID
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === FormMode.EDIT && initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setRole(initialData.role);
      setAppwriteAuthUserId(initialData.id); // Set Appwrite Auth User ID for edit mode
    } else {
      setName('');
      setEmail('');
      setRole('Viewer');
      setAppwriteAuthUserId(''); // Clear for add mode
    }
  }, [mode, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !email.trim()) {
      setFormError('Name and Email are required.');
      return;
    }
    if (mode === FormMode.ADD && !appwriteAuthUserId.trim()) {
      setFormError('Appwrite Auth User ID is required for new users.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFormError('Please enter a valid email address.');
        return;
    }

    const userData = { 
        id: appwriteAuthUserId, // Use state for id
        name, 
        email, 
        role 
    };

    if (mode === FormMode.EDIT && initialData) {
      // In edit mode, we don't want to change the email or id.
      const updatePayload: Partial<AdminUser> = { name, role };
      await onSave({ ...initialData, ...updatePayload });
    } else {
      // For ADD mode, AdminUser.id is the Appwrite Auth User ID.
      // The Omit type should ensure 'id' is expected in the payload.
      await onSave(userData as Omit<AdminUser, '$id' | 'createdAt' | 'updatedAt'>);
    }
  };
  
  const inputBaseClass = "w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm transition-colors";
  const inputBorderClass = "border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)]";
  const inputFocusClass = "focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)]";
  const inputBgTextPlaceholderClass = "bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)]";
  const labelClass = "block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1";


  return (
    <form onSubmit={handleSubmit} id="user-form-id" className="space-y-4">
      {formError && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm"><i className="fas fa-exclamation-circle mr-2"></i>{formError}</div>}
      
      {mode === FormMode.ADD && (
        <div>
            <label htmlFor="user-appwrite-auth-id" className={labelClass}>Appwrite Auth User ID <span className="text-red-500">*</span></label>
            <input
            type="text"
            id="user-appwrite-auth-id"
            value={appwriteAuthUserId}
            onChange={(e) => setAppwriteAuthUserId(e.target.value)}
            className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
            required={mode === FormMode.ADD}
            disabled={isSubmitting}
            placeholder="Enter existing Appwrite Auth User ID"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This must be the ID of an existing user in Appwrite Authentication. This system does not create Auth users.
            </p>
        </div>
      )}

      {mode === FormMode.EDIT && initialData && (
         <div>
            <label htmlFor="user-appwrite-auth-id-display" className={labelClass}>Appwrite Auth User ID</label>
            <input
            type="text"
            id="user-appwrite-auth-id-display"
            value={initialData.id}
            className={`${inputBaseClass} ${inputBorderClass} disabled:opacity-70 disabled:cursor-not-allowed dark:disabled:bg-slate-700`}
            readOnly
            disabled
            />
        </div>
      )}
      
      <div>
        <label htmlFor="user-name" className={labelClass}>Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          id="user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label htmlFor="user-email" className={labelClass}>Email Address <span className="text-red-500">*</span></label>
        <input
          type="email"
          id="user-email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass} ${mode === FormMode.EDIT ? 'disabled:opacity-70 disabled:cursor-not-allowed dark:disabled:bg-slate-700' : ''}`}
          required
          readOnly={mode === FormMode.EDIT} 
          disabled={isSubmitting || mode === FormMode.EDIT}
        />
         {mode === FormMode.EDIT && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed after user creation as it's linked to the Appwrite Auth user record.</p>}
      </div>
      
      <div>
        <label htmlFor="user-role" className={labelClass}>Role</label>
        <select
          id="user-role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'Admin' | 'Support' | 'Viewer')}
          className={`${inputBaseClass} ${inputBorderClass} ${inputFocusClass} ${inputBgTextPlaceholderClass}`}
          disabled={isSubmitting}
        >
          <option value="Viewer">Viewer</option>
          <option value="Support">Support</option>
          <option value="Admin">Admin</option>
        </select>
      </div>
    </form>
  );
};

export default UserForm;
