import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { ChefHat, Lock, LogIn, UserRound } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { counter, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (counter) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      await login({ username, password });
      navigate('/', { replace: true });
    } catch {
      setError('Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-radial from-slate-900 via-slate-950 to-black text-white p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="text-center mb-8 z-10"
      >
        <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 mb-4 shadow-xl backdrop-blur-md">
          <ChefHat className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          Fry Daddy
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base font-light">
          Secure counter login for live billing
        </p>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        onSubmit={handleSubmit}
        className="w-full max-w-md z-10 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl"
      >
        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Username</span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-emerald-400/60">
              <UserRound className="h-5 w-5 text-slate-500" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                placeholder="b1 or b2"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Password</span>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 focus-within:border-emerald-400/60">
              <Lock className="h-5 w-5 text-slate-500" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-600"
                placeholder="Enter password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <LogIn className="h-5 w-5" />
            {isLoading ? 'Signing in...' : 'Enter Dashboard'}
          </button>
        </div>
      </motion.form>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-slate-500 text-xs font-light tracking-wide z-10"
      >
        Local demo login: b1 / b1 or b2 / b2
      </motion.p>
    </div>
  );
};

