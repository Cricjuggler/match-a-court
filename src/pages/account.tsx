import { AccountView } from '@neondatabase/neon-js/auth/react';
import { useParams } from 'react-router-dom';

export function AccountPage() {
  const { pathname } = useParams<{ pathname: string }>();
  return (
    <div style={{ maxWidth: 520, margin: '20px auto' }}>
      <AccountView path={pathname} />
    </div>
  );
}
