import './globals.css'

export const metadata = {
  title: 'PedidoYa',
  description: 'Pedidos por QR y WhatsApp para restaurantes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
