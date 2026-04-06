import { clsx } from 'clsx';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-lg border border-border-default bg-surface-raised p-6', className)}>
      {children}
    </div>
  );
}
