import { Fragment } from 'react';

interface SortBarProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SortBar({ options, value, onChange, className }: SortBarProps) {
  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      <span className="text-sm text-[#6B7280] mr-2">Sort by:</span>
      {options.map((opt, i) => (
        <Fragment key={opt.value}>
          {i > 0 && <span className="text-[#6B7280]">·</span>}
          <button
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              value === opt.value ? 'bg-[#1A56DB] text-white' : 'text-[#6B7280] hover:bg-[#F5F6FA]'
            }`}
          >
            {opt.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
