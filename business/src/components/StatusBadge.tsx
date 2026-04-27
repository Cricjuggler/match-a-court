interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toLowerCase() ?? 'pending'
  return (
    <span className={`status-badge ${normalized}`}>
      {status}
    </span>
  )
}
