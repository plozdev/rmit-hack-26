'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'

export default function LoginPage() {
  const { login, authenticated, isInitializing, initError } = useTideCloak()
  const [error, setError] = useState('')
  const router = useRouter()
  useEffect(() => { if (authenticated) router.push('/home') }, [authenticated, router])
  const onLogin = useCallback(async () => {
    setError('')
    try { await login() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Login failed') }
  }, [login])
  return <main className="login-shell"><div className="login-panel"><div className="brand"><span className="brand-mark">◈</span>PROOF/GATE</div><div className="eyebrow">RMIT HACKATHON 2026 · TIDE UNLOCKED</div><h1>Evidence requires<br /><em>the right person, the right rights.</em></h1><p>A demo on multi-party approval governance for judicial evidence access. Data is completely simulated.</p><button className="primary" onClick={onLogin} disabled={isInitializing || Boolean(initError)}>{isInitializing ? 'Connecting…' : 'Sign in with TideCloak →'}</button>{(error || initError) && <p className="warning">{error || initError?.message}</p>}</div><div className="login-aside"><span>01 — SIGN IN</span><span>02 — SEAL</span><span>03 — QEA 2/3</span><span>04 — DECRYPT</span></div></main>
}
