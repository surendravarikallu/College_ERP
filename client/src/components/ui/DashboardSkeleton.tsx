import React from 'react';

export const DashboardSkeleton = () => {
  return (
    <div className="animate-pulse space-y-8">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-3">
          <div className="h-8 w-64 bg-slate-200  rounded-lg"></div>
          <div className="h-4 w-48 bg-slate-100  rounded-md"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-200  rounded-lg"></div>
          <div className="h-10 w-32 bg-slate-200  rounded-lg"></div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl border border-slate-200 ">
            <div className="h-12 w-12 bg-slate-200  rounded-xl mb-4"></div>
            <div className="h-4 w-24 bg-slate-100  rounded mb-2"></div>
            <div className="h-8 w-32 bg-slate-200  rounded-lg"></div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 border border-slate-200  h-[350px]">
            <div className="h-6 w-48 bg-slate-200  rounded mb-6"></div>
            <div className="h-full w-full bg-slate-50  rounded-xl"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MetricCardSkeleton = () => (
  <div className="bg-white border border-slate-200 shadow-sm p-6 rounded-2xl border border-slate-200  animate-pulse">
    <div className="h-12 w-12 bg-slate-200  rounded-xl mb-4"></div>
    <div className="h-4 w-24 bg-slate-100  rounded mb-2"></div>
    <div className="h-8 w-32 bg-slate-200  rounded-lg"></div>
  </div>
);
