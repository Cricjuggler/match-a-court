import { AuthView } from '@neondatabase/neon-js/auth/react';
import { useParams } from 'react-router-dom';

export function AuthPage() {
  const { pathname } = useParams<{ pathname: string }>();
  return (
    <div style={{ maxWidth: 420, margin: '20px auto' }}>
      <AuthView path={pathname} />
    </div>
  );
}
