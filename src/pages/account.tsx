import { AccountView } from '@neondatabase/neon-js/auth/react';
import { useParams } from 'react-router-dom';

export function AccountPage() {
  const { pathname } = useParams<{ pathname: string }>();
  return (
    <div style={{ maxWidth: 520, margin: '20px auto' }}>
      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore path prop is a string union in the SDK */}
      <AccountView path={pathname} />
    </div>
  );
}
