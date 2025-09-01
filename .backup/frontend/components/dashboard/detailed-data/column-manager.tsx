"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Eye,
  EyeOff,
  Pin,
  Plus,
  Calculator,
  Columns,
  Search,
} from "lucide-react";
import { useDetailedDataStore, type ColumnConfig, type ComputedColumn } from "@/lib/dashboard/detailed-data-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SortableColumnItemProps {
  column: ColumnConfig;
  onToggle: () => void;
  onPin: (position: 'left' | 'right' | false) => void;
}

function SortableColumnItem({ column, onToggle, onPin }: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 bg-background border rounded-lg",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="cursor-grab hover:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex-1">
        <div className="font-medium">{column.id.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</div>
        {column.pinned && (
          <Badge variant="secondary" className="text-xs mt-1">
            Pinned {column.pinned}
          </Badge>
        )}
      </div>
      
      <Select
        value={column.pinned || "none"}
        onValueChange={(value) => onPin(value === "none" ? false : value as 'left' | 'right')}
      >
        <SelectTrigger className="w-24 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="right">Right</SelectItem>
        </SelectContent>
      </Select>
      
      <Switch
        checked={column.visible}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${column.id} visibility`}
      />
    </div>
  );
}

export function ColumnManager({ open, onOpenChange }: ColumnManagerProps) {
  const {
    columns,
    computedColumns,
    toggleColumn,
    reorderColumns,
    pinColumn,
    addComputedColumn,
    removeComputedColumn,
    recordType,
  } = useDetailedDataStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("columns");
  
  // Computed column form state
  const [computedName, setComputedName] = useState("");
  const [computedFormula, setComputedFormula] = useState("");
  const [computedType, setComputedType] = useState<ComputedColumn["type"]>("ratio");
  const [computedInputs, setComputedInputs] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      reorderColumns(oldIndex, newIndex);
    }
  };

  const filteredColumns = columns.filter((col) =>
    col.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddComputedColumn = () => {
    if (!computedName.trim()) {
      toast.error("Please enter a column name");
      return;
    }

    if (!computedFormula.trim()) {
      toast.error("Please enter a formula");
      return;
    }

    addComputedColumn({
      name: computedName,
      formula: computedFormula,
      type: computedType,
      inputs: computedInputs,
    });

    // Reset form
    setComputedName("");
    setComputedFormula("");
    setComputedType("ratio");
    setComputedInputs([]);

    toast.success("Computed column added");
  };

  const visibleCount = columns.filter((col) => col.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns className="h-5 w-5" />
            Column Manager
          </DialogTitle>
          <DialogDescription>
            Customize which columns are visible and their order
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="columns">
              Columns ({visibleCount}/{columns.length})
            </TabsTrigger>
            <TabsTrigger value="computed">
              Computed ({computedColumns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="columns" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredColumns.map((col) => col.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {filteredColumns
                      .sort((a, b) => a.order - b.order)
                      .map((column) => (
                        <SortableColumnItem
                          key={column.id}
                          column={column}
                          onToggle={() => toggleColumn(column.id)}
                          onPin={(position) => pinColumn(column.id, position)}
                        />
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>

            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Drag to reorder • Toggle to show/hide</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  columns.forEach((col) => {
                    if (!col.visible) toggleColumn(col.id);
                  });
                }}
              >
                Show All
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="computed" className="space-y-4">
            <div className="space-y-4 border rounded-lg p-4">
              <h4 className="font-medium flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Computed Column
              </h4>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="computed-name">Column Name</Label>
                  <Input
                    id="computed-name"
                    value={computedName}
                    onChange={(e) => setComputedName(e.target.value)}
                    placeholder="e.g., Show Rate %"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="computed-type">Type</Label>
                  <Select
                    value={computedType}
                    onValueChange={(value) => setComputedType(value as ComputedColumn["type"])}
                  >
                    <SelectTrigger id="computed-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ratio">Ratio (A/B)</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="rolling">Rolling Window</SelectItem>
                      <SelectItem value="cumulative">Cumulative</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="computed-formula">Formula</Label>
                  <Input
                    id="computed-formula"
                    value={computedFormula}
                    onChange={(e) => setComputedFormula(e.target.value)}
                    placeholder="e.g., shows / appointments * 100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use column names in your formula
                  </p>
                </div>

                <Button onClick={handleAddComputedColumn}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {computedColumns.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No computed columns yet
                  </p>
                ) : (
                  computedColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{column.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          {column.formula}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeComputedColumn(column.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 