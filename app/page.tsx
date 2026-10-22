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
    try { await login() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Đăng nhập thất bại') }
  }, [login])
  return <main className="login-shell"><div className="login-panel"><div className="brand"><span className="brand-mark">◈</span>PROOF/GATE</div><div className="eyebrow">RMIT HACKATHON 2026 · TIDE UNLOCKED</div><h1>Chứng cứ cần<br /><em>đúng người, đúng quyền.</em></h1><p>Một bản demo về quản trị truy cập chứng cứ có nhiều bên phê duyệt. Dữ liệu hoàn toàn giả lập.</p><button className="primary" onClick={onLogin} disabled={isInitializing || Boolean(initError)}>{isInitializing ? 'Đang kết nối…' : 'Đăng nhập với TideCloak →'}</button>{(error || initError) && <p className="warning">{error || initError?.message}</p>}</div><div className="login-aside"><span>01 — ĐĂNG NHẬP</span><span>02 — NIÊM PHONG</span><span>03 — QEA 2/3</span><span>04 — GIẢI MÃ</span></div></main>
}
