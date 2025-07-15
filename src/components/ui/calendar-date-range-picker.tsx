import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface CalendarDateRangePickerProps {
  onDateRangeChange: (range: DateRange | undefined) => void;
}

export function CalendarDateRangePicker({ onDateRangeChange }: CalendarDateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>();

  const handleDateSelect = (range: DateRange | undefined) => {
    setDate(range);
    onDateRangeChange(range);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {date?.from ? (
            date.to ? (
              `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
            ) : (
              date.from.toLocaleDateString()
            )
          ) : (
            'Select date range'
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={handleDateSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}