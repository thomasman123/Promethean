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
	const initialDate = React.useMemo(() => (value ? new Date(value) : undefined), [value]);
	const [date, setDate] = React.useState<Date | undefined>(initialDate);
	const [time, setTime] = React.useState<string>(
		initialDate ? `${String(initialDate.getHours()).padStart(2, "0")}:${String(initialDate.getMinutes()).padStart(2, "0")}` : ""
	);

	React.useEffect(() => {
		if (value) {
			const d = new Date(value);
			if (!isNaN(d.getTime())) {
				setDate(d);
				setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	const emitChange = (d?: Date, t?: string) => {
		const dd = d ?? date;
		const tt = t ?? time;
		if (dd && tt) {
			const [hh, mm] = tt.split(":").map((v) => parseInt(v || "0", 10));
			const composed = new Date(dd);
			composed.setHours(hh || 0, mm || 0, 0, 0);
			onChange?.(composed.toISOString());
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
				<PopoverContent className="w-auto p-3" align="start">
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