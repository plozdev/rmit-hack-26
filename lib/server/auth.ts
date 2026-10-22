import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { verifyTideCloakToken } from '@tidecloak/nextjs/server'
import tcConfig from '../../tidecloak.json'
import { verifyDpopProof } from '../verify-dpop'

export type Principal = { sub: string; name: string; roles: string[] }
type AuthResult = { principal: Principal; error?: never } | { principal?: never; error: NextResponse }

export async function authenticate(request: NextRequest): Promise<AuthResult> {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('DPoP ')) {
    return { error: NextResponse.json({ error: 'DPoP token required' }, { status: 401 }) }
  }
  const token = header.slice(5)
  try {
    const claims = await verifyTideCloakToken(tcConfig, token) as Record<string, unknown> | null
    if (!claims || typeof claims.sub !== 'string') {
      return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) }
    }
    const boundJkt = (claims.cnf as Record<string, unknown> | undefined)?.jkt
    if (!await verifyDpopProof(request.headers.get('dpop'), token, boundJkt, request.method, request.url)) {
      return { error: NextResponse.json({ error: 'Invalid DPoP proof' }, { status: 401 }) }
    }
    const access = claims.realm_access as { roles?: unknown } | undefined
    const roles = Array.isArray(access?.roles) ? access.roles.filter((value): value is string => typeof value === 'string') : []
    return { principal: {
      sub: claims.sub,
      name: typeof claims.preferred_username === 'string' ? claims.preferred_username : claims.sub,
      roles,
    } }
  } catch {
    return { error: NextResponse.json({ error: 'Token verification failed' }, { status: 401 }) }
  }
}

export function hasRole(principal: Principal, role: string): boolean {
  return principal.roles.includes(role)
}
