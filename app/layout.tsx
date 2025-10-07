import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Chatbot',
  description: 'Simple AI Chatbot with GPT-4o',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

