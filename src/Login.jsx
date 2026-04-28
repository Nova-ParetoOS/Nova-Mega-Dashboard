import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './index.css';

import { SparklesCore } from './components/ui/sparkles';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Conta criada! Verifique seu e-mail para confirmar.');
        setMode('login');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        alert('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
        setMode('login');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-sans p-6">
      
      {/* BACKGROUND ESTELAR */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#818cf8"
        />
      </div>

      {/* ORBS */}
      <div className="absolute w-[500px] h-[500px] bg-indigo-600/20 blur-[120px] rounded-full top-[-150px] right-[-150px] pointer-events-none z-0" />
      <div className="absolute w-[350px] h-[350px] bg-purple-600/10 blur-[100px] rounded-full bottom-[-100px] left-[-100px] pointer-events-none z-0" />

      {/* CARD GLASSMORPHISM */}
      <div className={`backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 shadow-2xl rounded-2xl w-full max-w-md p-8 relative z-10 transition-all duration-700 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
        
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold tracking-widest uppercase mb-4">
            Sistema Interno
          </div>
          <h1 className="text-3xl font-black mb-1 text-white tracking-tight">
            Nova <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Pareto</span>
          </h1>
          <p className="text-sm font-medium text-slate-400 tracking-wide">
            DashboardOS
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
              E-mail
            </label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              placeholder="seu@email.com"
            />
          </div>
          
          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Senha
                </label>
                {mode === 'login' && (
                  <button type="button" onClick={() => setMode('forgot')} className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-slate-950/50 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium px-4 py-3 rounded-xl flex items-start gap-2 mt-4 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm px-4 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Aguarde...
                </span>
              ) : mode === 'login' ? 'Prosseguir →' : mode === 'register' ? 'Criar Conta →' : 'Recuperar Senha →'}
            </button>
          </div>
        </form>

        {mode === 'login' && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-6 opacity-60">
              <div className="h-px bg-slate-700 flex-1"></div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ou</span>
              <div className="h-px bg-slate-700 flex-1"></div>
            </div>
            
            <button 
              onClick={handleGoogleLogin} 
              type="button" 
              className="w-full border border-slate-700/60 bg-slate-900/50 hover:bg-slate-800 text-slate-200 font-medium text-sm px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-3 backdrop-blur-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar com Google
            </button>
          </div>
        )}

        <div className="text-center mt-8 text-xs font-medium text-slate-500">
          {mode === 'login' ? (
            <>
              Acesso exclusivo para funcionários.{' '}
              <button className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors ml-1" onClick={() => setMode('register')}>Solicitar Ingresso</button>
            </>
          ) : (
            <>
              Voltar ao {' '}
              <button className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors ml-1" onClick={() => setMode('login')}>Painel de Login</button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}