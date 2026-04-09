import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon  }: any) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    {icon && <div className="text-slate-300 dark:text-slate-600 mb-4">{icon}</div>}
    <h4 className="text-lg font-semibold text-slate-500 dark:text-slate-400">{title}</h4>
    {description && <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 max-w-sm">{description}</p>}
  </div>
);

export default EmptyState;
