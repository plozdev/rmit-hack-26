import { NextRequest, NextResponse } from 'next/server'
import { authenticate, hasRole } from '../../../../../lib/server/auth'
import { createEvidence, getCase, getEvidence } from '../../../../../lib/server/db'

export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error
  const { id } = await context.params
  if (!getCase(id)) return NextResponse.json({ error: 'Unknown case' }, { status: 404 })
  const evidence = getEvidence(id)
  if (!evidence) return NextResponse.json({ error: 'Evidence not sealed yet' }, { status: 404 })
  if (evidence.custodian_sub !== auth.principal.sub || !hasRole(auth.principal, `_tide_${id.replaceAll('-', '')}.selfdecrypt`)) {
    return NextResponse.json({ error: 'Tide decrypt role not granted to this custodian' }, { status: 403 })
  }
  return NextResponse.json({ ciphertext: evidence.ciphertext, tags: [id.replaceAll('-', '')], createdAt: evidence.created_at })
}

export async function PUT(request: NextRequest, context: Context) {
  const auth = await authenticate(request)
  if (auth.error) return auth.error
  const { id } = await context.params
  if (!getCase(id)) return NextResponse.json({ error: 'Unknown case' }, { status: 404 })
  if (!hasRole(auth.principal, `_tide_${id.replaceAll('-', '')}.selfencrypt`)) {
    return NextResponse.json({ error: 'Tide encrypt role required' }, { status: 403 })
  }
  if (getEvidence(id)) return NextResponse.json({ error: 'Already sealed' }, { status: 409 })
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
  const ciphertext = body && typeof body === 'object' ? (body as Record<string, unknown>).ciphertext : undefined
  if (typeof ciphertext !== 'string' || ciphertext.length < 16 || ciphertext.length > 200_000) {
    return NextResponse.json({ error: 'Invalid ciphertext' }, { status: 400 })
  }
  try {
    createEvidence(id, auth.principal.sub, ciphertext)
  } catch {
    return NextResponse.json({ error: 'Evidence already sealed' }, { status: 409 })
  }
  return NextResponse.json({ sealed: true }, { status: 201 })
}
