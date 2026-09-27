import React from 'react';
import {
  CheckCircle2,
  Clock,
  PauseCircle,
  AlertCircle,
  CircleDot,
  FileText,
  CheckCheck,
  Shield
} from 'lucide-react';

export default function StatusBadge({ status, label, style = {}, size = 'md' }) {
  const normalized = (status || '').toUpperCase();

  let badgeClass = 'badge-gray';
  let Icon = CircleDot;
  let text = label || status?.replace(/_/g, ' ') || 'UNKNOWN';

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
    case 'ACTIVE':
      badgeClass = 'badge-green';
      Icon = CheckCircle2;
      break;
    case 'INACTIVE':
      badgeClass = 'badge-gray';
      Icon = CircleDot;
      break;
    case 'SUPER_ADMIN':
      badgeClass = 'badge-purple';
      Icon = Shield;
      break;
    case 'ADMIN':
      badgeClass = 'badge-blue';
      Icon = Shield;
      break;
    case 'IT_MEMBER':
      badgeClass = 'badge-green';
      Icon = CheckCircle2;
      break;
    case 'CLIENT':
      badgeClass = 'badge-gray';
      Icon = CircleDot;
      break;
    default:
      badgeClass = 'badge-gray';
      Icon = CircleDot;
  }

  const iconSize = size === 'sm' ? 11 : 12;

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
        padding: size === 'sm' ? '0.15rem 0.5rem' : '0.22rem 0.65rem',
        ...style
      }}
    >
      <Icon size={iconSize} strokeWidth={2.4} />
      <span>{text}</span>
    </span>
  );
}
