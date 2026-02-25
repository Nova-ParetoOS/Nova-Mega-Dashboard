import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './index.css';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mode, setMode]         = useState('login');
  const [visible, setVisible]   = useState(false);

  useEffect(() => { 
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Conta criada! Verifique seu e-mail para confirmar.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', system-ui, sans-serif",
      position: 'relative',
      overflow: 'hidden',
    },
    orb1: {
      position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
      top: '-100px', right: '-100px', pointerEvents: 'none',
    },
    orb2: {
      position: 'absolute', width: '300px', height: '300px', borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
      bottom: '-80px', left: '-80px', pointerEvents: 'none',
    },
    card: {
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '24px',
      padding: '48px 40px',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    },
    logoWrap: { textAlign: 'center', marginBottom: '36px' },
    badge: {
      display: 'inline-block',
      background: 'rgba(99,102,241,0.15)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: '100px',
      padding: '4px 16px',
      fontSize: '11px',
      color: '#a5b4fc',
      letterSpacing: '2px',
      textTransform: 'uppercase',
      marginBottom: '16px',
    },
    logoText: {
      fontSize: '32px', fontWeight: '800', color: '#ffffff',
      letterSpacing: '-1px', lineHeight: 1, marginBottom: '6px',
    },
    logoAccent: { color: '#818cf8' },
    logoSub: { fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.5px' },
    label: {
      display: 'block', fontSize: '11px', fontWeight: '600',
      color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
      letterSpacing: '1.5px', marginBottom: '8px',
    },
    input: {
      width: '100%', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
      padding: '14px 16px', fontSize: '14px', color: '#ffffff',
      outline: 'none', boxSizing: 'border-box',
    },
    btn: {
      width: '100%',
      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      border: 'none', borderRadius: '12px', padding: '15px',
      fontSize: '15px', fontWeight: '700', color: '#ffffff',
      cursor: 'pointer',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.badge}>Sistema Interno</div>
          <div style={s.logoText}>MEGA <span style={s.logoAccent}>JEANS</span></div>
          <div style={s.logoSub}>Gestão de Estoque & Resultados</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>E-mail</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={s.input} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={s.label}>Senha</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={s.input} />
          </div>
          {error && <div style={{ color: '#fca5a5', marginBottom: '20px' }}>⚠️ {error}</div>}
          <button type="submit" disabled={loading} style={{...s.btn, opacity: loading ? 0.6 : 1}}>
            {loading ? 'Aguarde...' : mode === 'login' ? '→ Entrar' : '→ Criar Conta'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
          {mode === 'login' ? (
            <>Não tem conta? <button style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('register')}>Criar agora</button></>
          ) : (
            <>Já tem conta? <button style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer' }} onClick={() => setMode('login')}>Fazer login</button></>
          )}
        </div>
      </div>
    </div>
  );
}