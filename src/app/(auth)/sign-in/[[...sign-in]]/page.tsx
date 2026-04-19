import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--accent)', letterSpacing: '0.15em',
          marginBottom: 32, textTransform: 'uppercase',
        }}>
          ◆ ScooterHub
        </div>
        <SignIn appearance={{
          variables: {
            colorBackground:      '#171717',
            colorText:            '#f0f0f0',
            colorInputBackground: '#1f1f1f',
            colorInputText:       '#f0f0f0',
            colorPrimary:         '#e8ff47',
          },
        }} />
      </div>
    </div>
  )
}