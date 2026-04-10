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
  minYear?: number;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type View = 'day' | 'month-year';

export function Calendar({ value, onChange, className, maxDate, minYear = 1900 }: CalendarProps) {
  const today = new Date();
  const [viewDate, setViewDate] = React.useState(() => {
    const d = value ?? today;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [view, setView] = React.useState<View>('day');
  const [pickerYear, setPickerYear] = React.useState(() => (value ?? today).getFullYear());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const maxYear = maxDate ? maxDate.getFullYear() : today.getFullYear();
  const maxMonth = maxDate ? maxDate.getMonth() : today.getMonth();

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
    if (!maxDate || next <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1))
      setViewDate(next);
  }
  function selectDay(day: number) {
    const selected = new Date(year, month, day);
    if (maxDate && selected > maxDate) return;
    onChange(selected);
  }
  function isSelected(day: number) {
    if (!value) return false;
    return value.getFullYear() === year && value.getMonth() === month && value.getDate() === day;
  }
  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  }
  function isDisabled(day: number) {
    if (!maxDate) return false;
    return new Date(year, month, day) > maxDate;
  }
  function isMonthDisabled(m: number) {
    if (pickerYear > maxYear) return true;
    if (pickerYear === maxYear && m > maxMonth) return true;
    if (pickerYear < minYear) return true;
    return false;
  }
  function selectMonth(m: number) {
    if (isMonthDisabled(m)) return;
    setViewDate(new Date(pickerYear, m, 1));
    setView('day');
  }

  if (view === 'month-year') {
    return (
      <div className={cn('p-3 select-none w-[224px]', className)}>
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPickerYear((y) => Math.max(minYear, y - 1))}
            disabled={pickerYear <= minYear}
            className="h-7 w-7"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold">{pickerYear}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
            disabled={pickerYear >= maxYear}
            className="h-7 w-7"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS_SHORT.map((name, i) => {
            const disabled = isMonthDisabled(i);
            const active = pickerYear === year && i === month;
            return (
              <button
                key={name}
                onClick={() => selectMonth(i)}
                disabled={disabled}
                className={cn(
                  'h-9 rounded-lg text-sm font-medium transition-colors',
                  active && 'bg-primary text-primary-foreground',
                  !active && !disabled && 'hover:bg-accent',
                  disabled && 'opacity-30 cursor-not-allowed',
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('day')}
            className="text-xs text-muted-foreground h-7"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('p-3 select-none', className)}>
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-7 w-7">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button
          onClick={() => {
            setPickerYear(year);
            setView('month-year');
          }}
          className="text-sm font-medium hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-accent"
        >
          {MONTHS[month]} {year}
        </button>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground h-7"
          >
            Clear date
          </Button>
        </div>
      )}
    </div>
  );
}
