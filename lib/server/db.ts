import 'server-only'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export type CaseRecord = { id: string; title: string; summary: string; source: string; created_at: string }
export type EvidenceRecord = { case_id: string; custodian_sub: string; ciphertext: string; created_at: string }
export type AccessRequest = {
  id: number
  case_id: string
  requester_sub: string
  requester_name: string
  purpose: string
  created_at: string
}

const dbPath = process.env.APP_DB_PATH || join(process.cwd(), 'app-data', 'gateway.sqlite')
let connection: DatabaseSync | undefined

function database(): DatabaseSync {
  if (connection) return connection
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA busy_timeout = 5000;')
  db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS evidence (
    case_id TEXT PRIMARY KEY REFERENCES cases(id),
    custodian_sub TEXT NOT NULL,
    ciphertext TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS access_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_id TEXT NOT NULL REFERENCES cases(id),
    requester_sub TEXT NOT NULL,
    requester_name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  `)
  db.prepare(`INSERT OR IGNORE INTO cases (id, title, summary, source) VALUES (?, ?, ?, ?)`).run(
    'case-001',
    'Hồ sơ camera nút giao số 7',
    'Dữ liệu mô phỏng phục vụ thử nghiệm quy trình tiếp cận chứng cứ có kiểm soát.',
    'Đơn vị lưu giữ chứng cứ giả lập',
  )
  connection = db
  return db
}

export function getCases(): CaseRecord[] {
  return database().prepare('SELECT * FROM cases ORDER BY created_at DESC').all() as CaseRecord[]
}

export function getCase(id: string): CaseRecord | undefined {
  return database().prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRecord | undefined
}

export function getEvidence(caseId: string): EvidenceRecord | undefined {
  return database().prepare('SELECT * FROM evidence WHERE case_id = ?').get(caseId) as EvidenceRecord | undefined
}

export function createEvidence(caseId: string, custodianSub: string, ciphertext: string): void {
  database().prepare('INSERT INTO evidence (case_id, custodian_sub, ciphertext) VALUES (?, ?, ?)').run(caseId, custodianSub, ciphertext)
}

export function createRequest(caseId: string, sub: string, name: string, purpose: string): AccessRequest {
  const db = database()
  const result = db.prepare('INSERT INTO access_requests (case_id, requester_sub, requester_name, purpose) VALUES (?, ?, ?, ?)')
    .run(caseId, sub, name, purpose)
  return db.prepare('SELECT * FROM access_requests WHERE id = ?').get(Number(result.lastInsertRowid)) as AccessRequest
}

export function getRequests(sub?: string): AccessRequest[] {
  const db = database()
  if (sub) return db.prepare('SELECT * FROM access_requests WHERE requester_sub = ? ORDER BY id DESC').all(sub) as AccessRequest[]
  return db.prepare('SELECT * FROM access_requests ORDER BY id DESC').all() as AccessRequest[]
}
