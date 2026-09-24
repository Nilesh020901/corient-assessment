import React from 'react';
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  AlertCircle,
  CircleDot,
  FileText,
  CheckCheck
} from 'lucide-react';

export default function StatusBadge({ status, label, style = {} }) {
  const normalized = (status || '').toUpperCase();

  let badgeClass = 'badge-gray';
  let Icon = CircleDot;
  let text = label || status?.replace('_', ' ') || 'UNKNOWN';

  switch (normalized) {
    case 'COMPLETED':
      badgeClass = 'badge-green';
      Icon = CheckCircle2;
      break;
    case 'IN_PROGRESS':
      badgeClass = 'badge-blue';
      Icon = Clock;
      break;
    case 'ON_HOLD':
      badgeClass = 'badge-yellow';
      Icon = PauseCircle;
      break;
    case 'BLOCKED':
      badgeClass = 'badge-red';
      Icon = AlertCircle;
      break;
    case 'NOT_STARTED':
    case 'PENDING':
      badgeClass = 'badge-gray';
      Icon = CircleDot;
      break;
    case 'PUBLISHED':
      badgeClass = 'badge-green';
      Icon = CheckCheck;
      break;
    case 'DRAFT':
      badgeClass = 'badge-yellow';
      Icon = FileText;
      break;
    default:
      badgeClass = 'badge-gray';
      Icon = CircleDot;
  }

  return (
    <span className={`badge ${badgeClass}`} style={style}>
      <Icon size={12} strokeWidth={2.2} />
      <span>{text}</span>
    </span>
  );
}
