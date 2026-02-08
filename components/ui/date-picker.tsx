'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Format for displaying the date in the input field */
  displayFormat?: string;
}

export function DatePicker({ value, onChange, className, placeholder = "Pick a date", disabled, displayFormat = "PPP" }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, displayFormat) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(selectedDate) => {
            // Ensure we're passing the exact date selected, without time zone shifts
            if (selectedDate) {
              // Create a new date object to ensure we're not modifying the original
              const selected = new Date(selectedDate);
              // Set hours to noon to avoid timezone-related date shifts
              selected.setHours(12, 0, 0, 0);
              onChange?.(selected);
              // Close the popover after selection
              setOpen(false);
            } else {
              onChange?.(undefined);
              setOpen(false);
            }
          }}
          initialFocus
          disabled={disabled}
          captionLayout="dropdown"
          fromYear={2020}
          toYear={new Date().getFullYear() + 1}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}