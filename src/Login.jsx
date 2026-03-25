import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';
import './index.css';

import { SparklesCore } from './components/ui/sparkles';

// ─────────────────────────────────────────────────────────────────
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

  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative', overflow: 'hidden',
    },
    grid: {
      position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
      backgroundImage: 'radial-gradient(rgba(99,102,241,0.12) 1px, transparent 1px)',
      backgroundSize: '28px 28px',
    },
    orb1: { position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)', top: '-150px', right: '-150px', pointerEvents: 'none', zIndex: 1 },
    orb2: { position: 'absolute', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', bottom: '-100px', left: '-100px', pointerEvents: 'none', zIndex: 1 },
    card: {
      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.10)', borderRadius: '24px',
      padding: '48px 40px', width: '100%', maxWidth: '420px',
      boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease', position: 'relative', zIndex: 2,
    },
    logoWrap: { textAlign: 'center', marginBottom: '36px' },
    badge: { display: 'inline-block', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '100px', padding: '4px 16px', fontSize: '11px', color: '#a5b4fc', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' },
    logoText: { fontSize: '32px', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px' },
    logoAccent: { color: '#818cf8' },
    logoSub: { fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' },
    label: { display: 'block', fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' },
    input: { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '14px 16px', fontSize: '14px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' },
    btn: { width: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', borderRadius: '12px', padding: '15px', fontSize: '15px', fontWeight: '700', color: '#ffffff', cursor: 'pointer' },
  };

  return (
    <div style={s.page}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#a5b4fc"
        />
      </div>
      <div style={s.grid} />
      <div style={s.orb1} /><div style={s.orb2} />

      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.badge}>Sistema Interno</div>
          <div style={s.logoText}>MEGA <span style={s.logoAccent}>JEANS</span></div>
          <div style={s.logoSub}>Gestão de Estoque &amp; Resultados</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={s.input} />
          </div>
          {mode !== 'forgot' && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ ...s.label, marginBottom: 0 }}>Senha</label>
                {mode === 'login' && <button type="button" onClick={() => setMode('forgot')} style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: '11px', cursor: 'pointer', padding: 0 }}>Esqueceu a senha?</button>}
              </div>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={s.input} />
            </div>
          )}
          {error && <div style={{ color: '#fca5a5', marginBottom: '20px', fontSize: '13px' }}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Aguarde...' : mode === 'login' ? '→ Entrar' : mode === 'register' ? '→ Criar Conta' : '→ Recuperar Senha'}
          </button>
        </form>

        {mode === 'login' && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ padding: '0 10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>ou</div>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            </div>
            <button onClick={handleGoogleLogin} type="button" style={{ ...s.btn, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
              Entrar com Google
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          {mode === 'login' ? (
            <>Não tem conta? <button style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('register')}>Criar agora</button></>
          ) : (
            <>Voltar para <button style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('login')}>Login</button></>
          )}
        </div>
      </div>
    </div>
  );
}