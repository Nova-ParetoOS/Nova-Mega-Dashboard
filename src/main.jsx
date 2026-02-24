import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { supabase } from './supabase'
import App from './App.jsx'
import Login from './Login.jsx'
import './index.css'

function Root() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Checa sessão existente ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecking(false)
    })
    // Escuta mudanças de login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <div className="text-white text-lg font-bold animate-pulse">Carregando...</div>
      </div>
    )
  }

  if (!session) return <Login />

  return <App userId={session.user.id} userEmail={session.user.email} />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
)