type Status = 'pending' | 'approved' | 'rejected'

const ICONS: Record<Status, string> = {
  pending: '⏳',
  approved: '✅',
  rejected: '❌',
}

interface StatusBadgeProps {
  status: Status | string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() as Status
  const icon = ICONS[normalized] ?? '•'

  return (
    <span className={`status-badge ${normalized}`}>
      {icon} {normalized}
    </span>
  )
}
