import type { Metadata } from 'next'
import { Epilogue } from 'next/font/google'
import PlausibleProvider from 'next-plausible'
import './globals.css'
import { RootLoader } from '../components/root-loader'

const epilogue = Epilogue({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'Storacha Telegram Backups',
  description: 'Back up your Telegram account with Storacha!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <PlausibleProvider
      domain={process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'telegram.storacha.network'}
      trackLocalhost={true}
      trackOutboundLinks={true}
      taggedEvents={true}
      enabled={true}
    >
      <html lang="en">
        <body className={epilogue.className}>
          <RootLoader>{children}</RootLoader>
        </body>
      </html>
    </PlausibleProvider>
  )
}
