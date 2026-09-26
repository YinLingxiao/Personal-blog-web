import AccountMenu from './account/AccountMenu';

export default function AuthMenu({ compact = false }: { compact?: boolean }) {
  return <AccountMenu site="note" compact={compact} />;
}
