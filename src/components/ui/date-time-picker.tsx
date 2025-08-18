"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateTimePickerProps {
	value?: string | null;
	onChange?: (isoString: string | null) => void;
	placeholder?: string;
	className?: string;
}

export function DateTimePicker({ value, onChange, placeholder = "Pick date & time", className }: DateTimePickerProps) {
	
	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState<Date | undefined>(() => (value ? new Date(value) : undefined));
	const [time, setTime] = React.useState<string>(value ? new Date(value).toISOString().slice(11,16) : "");

	const emitChange = (d?: Date, tt?: string) => {
		const dd = d ?? date;
		const t = tt ?? time;
		if (dd && t) {
			const [hh, mm] = t.split(":");
			const withTime = new Date(dd);
			withTime.setHours(Number(hh));
			withTime.setMinutes(Number(mm));
			onChange?.(withTime.toISOString());
		} else if (!dd && !tt) {
			onChange?.(null);
		}
	};

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className={cn("justify-start text-left font-normal", !(date && time) && "text-muted-foreground")}> 
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date && time ? (
							<>{format(date, "LLL dd, y")} at {time}</>
						) : (
							<span>{placeholder}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent inPortal={false} className="w-auto p-3" align="start">
					<div className="grid gap-3">
						<Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); emitChange(d, undefined); }} initialFocus />
						<div className="grid gap-2">
							<Label htmlFor="time">Time</Label>
							<Input id="time" type="time" value={time} onChange={(e) => { setTime(e.target.value); emitChange(undefined, e.target.value); }} />
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
} 