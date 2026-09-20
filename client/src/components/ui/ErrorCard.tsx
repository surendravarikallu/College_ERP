import React from 'react';

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ message, onRetry  }: any) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 border border-red-200  bg-red-50/50 ">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-red-100  text-red-500 flex items-center justify-center font-bold text-lg">!</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-600 ">{message}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
          Retry
        </button>
      )}
    </div>
  </div>
);

export default ErrorCard;
