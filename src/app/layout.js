import './globals.css'

export const metadata = {
  title: 'HabeshaPay — Ethiopian Payroll',
  description: 'ERCA-compliant payroll software for Ethiopian businesses.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}