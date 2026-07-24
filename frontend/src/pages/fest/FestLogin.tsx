import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, AlertCircle, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function FestLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(username, password);
      // Redirect based on role
      const stored = localStorage.getItem('user');
      if (stored) {
        const user = JSON.parse(stored);
        
        // Allowed roles for Fest Module
        if (user.role === 'admin') navigate('/admin/fest');
        else if (user.role === 'stage_admin') navigate('/stage-admin');
        else if (user.role === 'judge') navigate('/judge');
        else if (user.role === 'green_room') navigate('/green-room');
        else if (user.role === 'announcer') navigate('/announcer');
        else {
          await logout();
          setError('Access Denied: Your account does not have Fest privileges.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#14532D]/10 text-[#14532D] mb-4">
          <Calendar size={24} />
        </div>
        <h1 className="text-center text-2xl font-bold text-slate-900">Alif Dawa Fest Portal</h1>
        <p className="mt-1 text-center text-sm text-slate-500">Staff & Judge Login</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 border border-slate-200 rounded-lg sm:px-10">
          
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-sm font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm placeholder-slate-400
                  focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D]"
                placeholder="Enter your assigned username"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 rounded-md text-sm placeholder-slate-400
                    focus:outline-none focus:ring-1 focus:ring-[#14532D] focus:border-[#14532D] pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-white
                bg-[#14532D] rounded-md hover:bg-[#166534] focus:outline-none focus:ring-2 focus:ring-offset-2
                focus:ring-[#14532D] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
             <a href="/fest" className="text-slate-500 hover:text-[#14532D] text-xs font-medium transition-colors">Return to Fest Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}
