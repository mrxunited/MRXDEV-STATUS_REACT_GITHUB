import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Navigate, useLocation, Link } from 'react-router-dom';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || "/admin/dashboard";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      // Successful login will trigger useEffect to navigate
    } catch (err) {
      // Error message is directly from the auth service (Appwrite or custom)
      setError((err as Error).message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  if (authLoading || (!authLoading && user) ) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-light-bg)] dark:bg-[var(--color-dark-main-bg)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-900 p-4 relative">
      <Link 
        to="/" 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center px-3 py-2 text-sm font-medium rounded-lg
                   text-gray-700 bg-white dark:text-gray-200 dark:bg-slate-700 
                   hover:bg-gray-100 dark:hover:bg-slate-600 shadow-md hover:shadow-lg transition-all"
        title="Back to Public Status Page"
      >
        <i className="fas fa-arrow-left mr-2"></i>
        Back to Status Page
      </Link>

      <div className="bg-[var(--color-light-card-bg)] dark:bg-[var(--color-dark-card-bg)] p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <i className="fas fa-user-shield text-[var(--color-primary-blue)] text-5xl mb-3"></i>
          <h1 className="text-3xl font-bold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">MRX United Admin</h1>
          <p className="text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">Administrator Panel Login</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-md text-sm">
            <i className="fas fa-exclamation-circle mr-2"></i>{error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-envelope text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]"></i>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-3 pl-10 border rounded-lg shadow-sm 
                           border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)] 
                           bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] 
                           text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] 
                           placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)] 
                           focus:outline-none focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] sm:text-sm transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] mb-1">
              Password
            </label>
            <div className="relative">
               <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-lock text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]"></i>
              </span>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-3 pl-10 border rounded-lg shadow-sm 
                           border-[var(--color-light-input-border)] dark:border-[var(--color-dark-input-border)] 
                           bg-[var(--color-light-input-bg)] dark:bg-[var(--color-dark-input-bg)] 
                           text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)] 
                           placeholder-[var(--color-light-placeholder)] dark:placeholder-[var(--color-dark-placeholder)] 
                           focus:outline-none focus:ring-[var(--color-primary-blue)] focus:border-[var(--color-primary-blue)] sm:text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <div className="text-xs p-3 border rounded-md 
                        border-[var(--color-light-border)] dark:border-[var(--color-dark-border)] 
                        bg-gray-50 dark:bg-slate-800 
                        text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
            <p className="font-semibold mb-1 text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">For Live Appwrite Login:</p>
            <p>Ensure users exist in Appwrite Authentication and have corresponding entries in the 'admin_users' database collection with assigned roles.</p>
            <p className="mt-1 font-semibold text-[var(--color-light-text-primary)] dark:text-[var(--color-dark-text-primary)]">Mock Credentials (if Appwrite not configured & Mock Mode ON):</p>
            <p>Admin: <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-700 dark:text-gray-300">admin@mrx.com</code> / <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-700 dark:text-gray-300">password</code></p>
            <p className="mt-0.5">Support: <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-700 dark:text-gray-300">support@mrx.com</code> / <code className="bg-gray-200 dark:bg-slate-700 px-1 rounded text-gray-700 dark:text-gray-300">password</code></p>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || authLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white 
                         bg-[var(--color-primary-blue)] hover:bg-[var(--color-primary-blue-hover)] 
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-blue)] 
                         disabled:bg-opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? <LoadingSpinner size="sm" color="text-white"/> : 'Sign In'}
            </button>
          </div>
        </form>
         <p className="mt-8 text-center text-xs text-[var(--color-light-text-secondary)] dark:text-[var(--color-dark-text-secondary)]">
          &copy; {new Date().getFullYear()} MRX United. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
