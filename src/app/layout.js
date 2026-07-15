import './globals.css';

export const metadata = {
  title: 'EthioPayroll — Payroll & HR for Ethiopian Businesses',
  description:
    'ERCA-compliant payroll, leave, overtime, and HR management built for businesses operating in Ethiopia.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
