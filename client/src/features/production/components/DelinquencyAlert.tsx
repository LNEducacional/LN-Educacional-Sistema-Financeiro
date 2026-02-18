import { AlertTriangle } from 'lucide-react';

interface DelinquencyAlertProps {
  isDelinquent: boolean;
  className?: string;
}

export function DelinquencyAlert({ isDelinquent, className = '' }: DelinquencyAlertProps) {
  if (!isDelinquent) return null;

  return (
    <span
      className={`inline-flex items-center text-amber-500 ${className}`}
      title="Aluno Inadimplente - Nao Entregar"
    >
      <AlertTriangle className="h-4 w-4" />
    </span>
  );
}
