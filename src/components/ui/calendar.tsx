'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface CalendarProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  maxDate?: Date;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function Calendar({ value, onChange, className, maxDate }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = React.useState(() => {
    const d = value ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    const next = new Date(year, month + 1, 1);
    if (!maxDate || next <= maxDate) setViewDate(next);
  }

  function selectDay(day: number) {
    const selected = new Date(year, month, day);
    if (maxDate && selected > maxDate) return;
    onChange(selected);
  }

  function isSelected(day: number) {
    if (!value) return false;
    return (
      value.getFullYear() === year &&
      value.getMonth() === month &&
      value.getDate() === day
    );
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  }

  function isDisabled(day: number) {
    if (!maxDate) return false;
    return new Date(year, month, day) > maxDate;
  }

  return (
    <div className={cn('p-3 select-none', className)}>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {MONTHS[month]} {year}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="h-7 w-7">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`empty-${i}`} />
          ) : (
            <button
              key={day}
              onClick={() => selectDay(day)}
              disabled={isDisabled(day)}
              className={cn(
                'h-8 w-8 rounded-full text-sm transition-colors flex items-center justify-center',
                isSelected(day) && 'bg-primary text-primary-foreground',
                !isSelected(day) && isToday(day) && 'border border-primary text-primary',
                !isSelected(day) && !isToday(day) && !isDisabled(day) && 'hover:bg-accent',
                isDisabled(day) && 'opacity-30 cursor-not-allowed',
              )}
            >
              {day}
            </button>
          ),
        )}
      </div>
      {value && (
        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} className="text-xs text-muted-foreground h-7">
            Clear date
          </Button>
        </div>
      )}
    </div>
  );
}
