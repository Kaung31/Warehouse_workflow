import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily:    'var(--font-mono)',
          fontSize:      13,
          color:         'var(--accent)',
          letterSpacing: '0.15em',
          marginBottom:  32,
          textTransform: 'uppercase',
        }}>
          ◆ ScooterHub
        </div>
        <SignUp appearance={{
          variables: {
            colorBackground:      '#161b22',
            colorText:            '#e6edf3',
            colorInputBackground: '#1c2128',
            colorInputText:       '#e6edf3',
            colorPrimary:         '#58a6ff',
          },
        }} />
      </div>
    </div>
  )
}