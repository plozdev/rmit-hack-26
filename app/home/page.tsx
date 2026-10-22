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
const DEMO_EVIDENCE = `HỒ SƠ MÔ PHỎNG — CASE-001\nCamera nút giao số 7, 20:00–22:00 ngày 21/10/2026.\nDấu thời gian ghi nhận: 20:43. Phương tiện mô phỏng đi qua làn B.\nTất cả cá nhân và dữ liệu trong hồ sơ này đều hư cấu.`
const config = rawConfig as unknown as { realm?: string; 'auth-server-url'?: string }
const consoleUrl = `${(config['auth-server-url'] || 'http://localhost:8080/').replace(/\/$/, '')}/realms/${config.realm || 'nextjs-test'}/tide-console/`

export default function HomePage() {
  const { authenticated, isInitializing, token, secureFetch, doEncrypt, doDecrypt, hasRealmRole, getValueFromIdToken, logout } = useTideCloak()
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null)
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [requestScope, setRequestScope] = useState('mine')
  const [purpose, setPurpose] = useState('Cần kiểm tra khung hình 20:43 trong hồ sơ giả lập CASE-001.')
  const [draft, setDraft] = useState(DEMO_EVIDENCE)
  const [plaintext, setPlaintext] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const name = String(getValueFromIdToken('preferred_username') || 'Người dùng')
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
      setMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu')
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
      setMessage('Chứng cứ đã được mã hóa trong trình duyệt và lưu dưới dạng ciphertext.')
      await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Niêm phong thất bại') }
    finally { setBusy(false) }
  }

  const requestAccess = async () => {
    setBusy(true); setMessage('')
    try {
      await api('/api/requests', { method: 'POST', body: JSON.stringify({ caseId: CASE_ID, purpose }) })
      setMessage('Đã ghi yêu cầu trong app. Admin cần gán role qua Tide Console; QEA chặn đến khi đủ quorum.')
      await refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Gửi yêu cầu thất bại') }
    finally { setBusy(false) }
  }

  const openEvidence = async () => {
    setBusy(true); setMessage(''); setPlaintext(''); setCiphertext('')
    try {
      const record = await api(`/api/cases/${CASE_ID}/evidence`)
      setCiphertext(record.ciphertext)
      const [decrypted] = await doDecrypt([{ encrypted: record.ciphertext, tags: record.tags }])
      setPlaintext(String(decrypted))
      setMessage('Tide đã xác thực quyền giải mã của phiên hiện tại.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Truy cập bị từ chối') }
    finally { setBusy(false) }
  }

  if (isInitializing || !authenticated) return <main className="shell"><p>Đang xác thực với TideCloak…</p></main>
  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">◈</span><span>PROOF<span className="brand-muted">/</span>GATE</span></div><div className="topbar-right"><span className="live-dot" /> REALM {config.realm || 'nextjs-test'} <span className="divider" /> {name} <button className="text-button" onClick={() => logout()}>Đăng xuất</button></div></header>
    <section className="hero"><div className="eyebrow">JUDICIAL EVIDENCE ACCESS · PROTOTYPE</div><h1>Quyền truy cập chứng cứ<br /><em>không thuộc về một người.</em></h1><p>Hồ sơ giả lập được niêm phong bằng Tide. Thay đổi quyền giải mã phải đi qua quản trị QEA của nhiều admin độc lập.</p></section>
    <div className="layout-grid">
      <section className="panel case-panel"><div className="panel-head"><span>01 / HỒ SƠ</span><span className="case-id">CASE-001</span></div><h2>{caseRecord?.title || 'Đang tải hồ sơ…'}</h2><p className="muted">{caseRecord?.summary}</p><div className="facts"><div><span>NGUỒN</span><strong>{caseRecord?.source}</strong></div><div><span>TRẠNG THÁI</span><strong>{caseRecord?.sealed ? 'Đã niêm phong' : 'Chưa niêm phong'}</strong></div></div>
        {!loading && !caseRecord?.sealed && <div className="action-block"><h3>Niêm phong chứng cứ mẫu</h3><p className="muted small">Tài khoản niêm phong cũng là người yêu cầu mở hồ sơ trong MVP. Nội dung được mã hóa trong browser trước khi gửi lên DB.</p><textarea aria-label="Nội dung chứng cứ giả lập" value={draft} onChange={(event) => setDraft(event.target.value)} rows={6} /><button className="primary" disabled={busy || !canEncrypt} onClick={sealEvidence}>{busy ? 'Đang xử lý…' : 'Mã hóa & niêm phong'}</button>{!canEncrypt && <p className="warning">Cần role {ENCRYPT_ROLE} trên tài khoản này.</p>}</div>}
      </section>
      <section className="panel gate-panel"><div className="panel-head"><span>02 / CỔNG TRUY CẬP</span><span className={canDecrypt ? 'status ok' : 'status locked'}>{canDecrypt ? 'ROLE ACTIVE' : 'ROLE LOCKED'}</span></div><h2>{canDecrypt ? 'Quyền đã được cấp' : 'Chứng cứ đang được khóa'}</h2><p className="muted">Quyền thực tế được kiểm tra ở API và Tide SDK. Cập nhật role có thể cần đăng xuất/đăng nhập lại để nhận token mới.</p><div className="role-line"><span>ROLE GIẢI MÃ</span><code>{DECRYPT_ROLE}</code></div><button className="primary full" disabled={busy || !caseRecord?.sealed} onClick={openEvidence}>{busy ? 'Đang xác thực…' : 'Thử mở chứng cứ'}</button>{!canDecrypt && <p className="hint">Thử trước khi QEA duyệt để thấy phản hồi 403 thật từ BE.</p>}{ciphertext && <div className="data-box"><label>CIPHERTEXT LƯU TRONG DB</label><code>{ciphertext.slice(0, 210)}{ciphertext.length > 210 ? '…' : ''}</code></div>}{plaintext && <div className="data-box revealed"><label>NỘI DUNG ĐÃ GIẢI MÃ TRONG BROWSER</label><pre>{plaintext}</pre></div>}</section>
    </div>
    <section className="panel request-panel"><div className="panel-head"><span>03 / YÊU CẦU TRUY CẬP</span><span className="case-id">APP RECORD ≠ QEA CHANGE REQUEST</span></div><div className="request-grid"><div><h2>Gửi lý do mở hồ sơ</h2><p className="muted">Yêu cầu này ghi mục đích trong app. Admin vẫn phải tạo thay đổi role trong Tide Console; không có phê duyệt giả.</p><textarea aria-label="Lý do truy cập" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} /><button className="secondary" disabled={busy || !caseRecord?.sealed || purpose.trim().length < 12} onClick={requestAccess}>Ghi yêu cầu</button></div><div className="steps"><h3>Quy trình demo trong Tide</h3><ol><li>Admin A tìm user <strong>{name}</strong> và gán <code>{DECRYPT_ROLE}</code>.</li><li>Change Request chuyển <strong>Pending</strong>; Admin A duyệt 1/2.</li><li>Admin B đăng nhập độc lập và duyệt 2/2.</li><li>Custodian đăng nhập lại, bấm “Thử mở chứng cứ”.</li></ol><a className="external" href={consoleUrl} target="_blank" rel="noreferrer">Mở Tide Console ↗</a></div></div>{message && <p className="feedback" role="status">{message}</p>}<div className="request-list"><h3>{requestScope === 'all' ? 'Yêu cầu từ tất cả tài khoản' : 'Yêu cầu của bạn'}</h3>{requests.length === 0 ? <p className="muted">Chưa có yêu cầu.</p> : requests.map((request) => <div className="request-row" key={request.id}><span>#{request.id} · {request.requester_name}</span><span>{request.purpose}</span><time>{request.created_at}</time></div>)}</div></section>
    <footer>PROOF/GATE · Dữ liệu và nghiệp vụ đều giả lập. QEA quản trị role; app chưa triển khai lệnh tư pháp hay chia sẻ E2EE giữa hai người dùng.</footer>
  </main>
}
