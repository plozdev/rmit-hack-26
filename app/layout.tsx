import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  TideCloakProvider
} from '@tidecloak/nextjs'
import tcConfig from '../tidecloak.json'


export const metadata: Metadata = {
  title: 'My Tidecloak App',
  description: 'A Next.js starter with Tidecloak',
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  // The scaffold ships with {} until `npm run init` writes the adapter config.
  // Passing {} to the SDK makes it fetch its default /adapter.json URL instead.
  const isConfigured = Boolean(
    tcConfig && typeof tcConfig === 'object' &&
    ('realm' in tcConfig || 'url' in tcConfig || 'auth-server-url' in tcConfig || 'authServerUrl' in tcConfig)
  )

  return (
    <html lang="en">
      <body>
        {isConfigured ? (
          <TideCloakProvider config={tcConfig}>{children}</TideCloakProvider>
        ) : (
          <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
            <h1>TideCloak is not configured</h1>
            <p>Run <code>npm run init</code> from the app directory to generate <code>tidecloak.json</code>, then restart the Next.js server.</p>
          </main>
        )}
      </body>
    </html>
  )
}
