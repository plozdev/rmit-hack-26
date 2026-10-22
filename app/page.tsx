'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const containerStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f5f5f5',
  margin: 0,
}

const cardStyle: CSSProperties = {
  background: '#fff',
  padding: '2rem',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  textAlign: 'center',
  maxWidth: '360px',
  width: '100%',
}

const buttonStyle: CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  borderRadius: '4px',
  border: 'none',
  background: '#0070f3',
  color: '#fff',
  cursor: 'pointer',
}

export default function LoginPage() {
  const { login, authenticated, isInitializing, initError } = useTideCloak()
  const [loginError, setLoginError] = useState<string | null>(null)
  const router = useRouter()

  const onLogin = useCallback(async () => {
    if (isInitializing || initError) return
    setLoginError(null)
    try {
      await login()
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed')
    }
  }, [login, isInitializing, initError])

  useEffect(() => {
    if (authenticated) {
      router.push('/home')
    }
  }, [authenticated, router])

  return (
    <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Welcome!</h1>
          <p style={{ color: '#555', marginTop: '0.5rem' }}>
            Please log in to continue.
          </p>
          {initError && <p role="alert">Authentication setup failed: {initError.message}</p>}
          {loginError && <p role="alert">{loginError}</p>}
          <button onClick={onLogin} disabled={isInitializing || Boolean(initError)} style={buttonStyle}>
            {isInitializing ? 'Loading...' : 'Log In'}
          </button>
        </div>
    </div>
  )
}
