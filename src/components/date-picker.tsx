'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear().toString().slice(2);
  return `${day} ${month}'${year}`;
}

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  maxDate?: Date;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', maxDate, className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? formatDate(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          value={value}
          onChange={(date) => {
            onChange(date);
            if (date) setOpen(false);
          }}
          maxDate={maxDate}
        />
      </PopoverContent>
    </Popover>
  );
}
