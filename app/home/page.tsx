'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import rawConfig from '../../tidecloak.json'

type CaseRecord = { id: string; title: string; summary: string; source: string; sealed: boolean }
type AccessRequest = { id: number; case_id: string; requester_name: string; purpose: string; created_at: string }
const CASE_ID = 'case-001'
const TAG = 'case001'
const ENCRYPT_ROLE = `_tide_${TAG}.selfencrypt`
const DECRYPT_ROLE = `_tide_${TAG}.selfdecrypt`
const DEMO_EVIDENCE = `SIMULATED RECORD — CASE-001\nIntersection 7 surveillance feed, 20:00–22:00 Oct 21, 2026.\nTimestamp recorded: 20:43. Vehicle simulated crossing lane B.\nAll persons and data in this record are purely fictitious.`
const config = rawConfig as unknown as { realm?: string; 'auth-server-url'?: string }
const consoleUrl = `${(config['auth-server-url'] || 'http://localhost:8080/').replace(/\/$/, '')}/realms/${config.realm || 'nextjs-test'}/tide-console/`

export default function HomePage() {
  const { authenticated, isInitializing, token, secureFetch, doEncrypt, doDecrypt, hasRealmRole, getValueFromIdToken, logout } = useTideCloak()
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [requestScope, setRequestScope] = useState('mine')
  const [purpose, setPurpose] = useState('Request to inspect frame at 20:43 in simulated record CASE-001.')
  const [draft, setDraft] = useState(DEMO_EVIDENCE)
  const [plaintext, setPlaintext] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const name = String(getValueFromIdToken('preferred_username') || 'User')
  const canEncrypt = hasRealmRole(ENCRYPT_ROLE)
  const canDecrypt = hasRealmRole(DECRYPT_ROLE)

  const api = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await secureFetch(new URL(path, window.location.origin).href, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`${response.status}: ${body.error || response.statusText}`)
    return body
  }, [secureFetch, token])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [caseData, requestData] = await Promise.all([api('/api/cases'), api('/api/requests')])
      setCaseRecord((caseData.cases as CaseRecord[]).find((item) => item.id === CASE_ID) || null)
      setRequests(requestData.requests as AccessRequest[])
      setRequestScope(requestData.scope)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load data')
    } finally { setLoading(false) }
  }, [api, token])
  useEffect(() => { void refresh() }, [refresh])

  const sealEvidence = async () => {
    if (!draft.trim()) return
    setBusy(true); setMessage('')
    try {
      const [encrypted] = await doEncrypt([{ data: draft.trim(), tags: [TAG] }])
      if (typeof encrypted !== 'string') throw new Error('SDK returned a non-text ciphertext')
      await api(`/api/cases/${CASE_ID}/evidence`, { method: 'PUT', body: JSON.stringify({ ciphertext: encrypted }) })
      setDraft('')
      setMessage('Evidence has been encrypted in-browser and stored as ciphertext.')
      await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Sealing failed') }
    finally { setBusy(false) }
  }

  const requestAccess = async () => {
    setBusy(true); setMessage('')
    try {
      await api('/api/requests', { method: 'POST', body: JSON.stringify({ caseId: CASE_ID, purpose }) })
      setMessage('Request recorded in app. Admin must assign role via Tide Console; QEA blocks until quorum is met.')
      await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to submit request') }
    finally { setBusy(false) }
  }

  const openEvidence = async () => {
    setBusy(true); setMessage(''); setPlaintext(''); setCiphertext('')
    try {
      const record = await api(`/api/cases/${CASE_ID}/evidence`)
      setCiphertext(record.ciphertext)
      const [decrypted] = await doDecrypt([{ encrypted: record.ciphertext, tags: record.tags }])
      setPlaintext(String(decrypted))
      setMessage('Tide has verified decryption privileges for the current session.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Access denied') }
    finally { setBusy(false) }
  }

  if (isInitializing || !authenticated) return <main className="shell"><p>Authenticating with TideCloak…</p></main>
  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">◈</span><span>PROOF<span className="brand-muted">/</span>GATE</span></div><div className="topbar-right"><span className="live-dot" /> REALM {config.realm || 'nextjs-test'} <span className="divider" /> {name} <button className="text-button" onClick={() => logout()}>Sign out</button></div></header>
    <section className="hero"><div className="eyebrow">JUDICIAL EVIDENCE ACCESS · PROTOTYPE</div><h1>Evidence access rights<br /><em>do not belong to a single person.</em></h1><p>Simulated case sealed with Tide. Granting decryption rights requires multi-party QEA governance across independent admins.</p></section>
    <div className="layout-grid">
      <section className="panel case-panel"><div className="panel-head"><span>01 / CASE FILE</span><span className="case-id">CASE-001</span></div><h2>{caseRecord?.title || 'Loading case…'}</h2><p className="muted">{caseRecord?.summary}</p><div className="facts"><div><span>SOURCE</span><strong>{caseRecord?.source}</strong></div><div><span>STATUS</span><strong>{caseRecord?.sealed ? 'Sealed' : 'Unsealed'}</strong></div></div>
        {!loading && !caseRecord?.sealed && <div className="action-block"><h3>Seal sample evidence</h3><p className="muted small">The custodian sealing the evidence is also the requester in this MVP. Content is encrypted in the browser before being sent to the database.</p><textarea aria-label="Simulated evidence content" value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} /><button className="primary" disabled={busy || !canEncrypt} onClick={sealEvidence}>{busy ? 'Processing…' : 'Encrypt & Seal'}</button>{!canEncrypt && <p className="warning">Role {ENCRYPT_ROLE} is required for this account.</p>}</div>}
      </section>
      <section className="panel gate-panel"><div className="panel-head"><span>02 / ACCESS GATE</span><span className={canDecrypt ? 'status ok' : 'status locked'}>{canDecrypt ? 'ROLE ACTIVE' : 'ROLE LOCKED'}</span></div><h2>{canDecrypt ? 'Access Granted' : 'Evidence is Locked'}</h2><p className="muted">Actual permissions are verified by the API and Tide SDK. Updating roles may require signing out and in again to obtain a new token.</p><div className="role-line"><span>DECRYPTION ROLE</span><code>{DECRYPT_ROLE}</code></div><button className="primary full" disabled={busy || !caseRecord?.sealed} onClick={openEvidence}>{busy ? 'Authenticating…' : 'Attempt to Open Evidence'}</button>{!canDecrypt && <p className="hint">Try before QEA approval to observe the actual 403 Forbidden response from the server.</p>}{ciphertext && <div className="data-box"><label>CIPHERTEXT STORED IN DB</label><code>{ciphertext.slice(0, 210)}{ciphertext.length > 210 ? '…' : ''}</code></div>}{plaintext && <div className="data-box revealed"><label>DECRYPTED CONTENT IN BROWSER</label><pre>{plaintext}</pre></div>}</section>
    </div>
    <section className="panel request-panel"><div className="panel-head"><span>03 / ACCESS REQUEST</span><span className="case-id">APP RECORD ≠ QEA CHANGE REQUEST</span></div><div className="request-grid"><div><h2>Submit reason for opening</h2><p className="muted">This request records purpose within the app. Admins must still trigger role assignment via Tide Console; approvals are not mocked.</p><textarea aria-label="Access reason" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} /><button className="secondary" disabled={busy || !caseRecord?.sealed || purpose.trim().length < 12} onClick={requestAccess}>Submit Request</button></div><div className="steps"><h3>Demo workflow in Tide</h3><ol><li>Admin A searches for user <strong>{name}</strong> and assigns <code>{DECRYPT_ROLE}</code>.</li><li>Change Request becomes <strong>Pending</strong>; Admin A approves 1/2.</li><li>Admin B signs in independently and approves 2/2.</li><li>Custodian re-logins and clicks “Attempt to Open Evidence”.</li></ol><a className="external" href={consoleUrl} target="_blank" rel="noreferrer">Open Tide Console ↗</a></div></div>{message && <p className="feedback" role="status">{message}</p>}<div className="request-list"><h3>{requestScope === 'all' ? 'Requests from all accounts' : 'Your requests'}</h3>{requests.length === 0 ? <p className="muted">No requests recorded yet.</p> : requests.map((request) => <div className="request-row" key={request.id}><span>#{request.id} · {request.requester_name}</span><span>{request.purpose}</span><time>{request.created_at}</time></div>)}</div></section>
    <footer>PROOF/GATE · Simulated data and scenario. Roles are governed by QEA; judicial warrants or user-to-user E2EE are not part of this MVP.</footer>
  </main>
}
