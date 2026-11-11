"use client";

// FlowHub 칸반 보드 (@dnd-kit)

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Calendar as CalIcon } from "lucide-react";
import { cn, priorityColor, priorityLabel, taskStatusLabel, formatDate } from "@/lib/utils";
import { IntegrationBadge } from "@/components/badge/IntegrationBadge";
import type { Task, TaskStatus } from "@/types";

const columns: { key: TaskStatus; label: string; color: string }[] = [
  { key: "REQUESTED", label: "요청", color: "border-t-slate-400" },
  { key: "IN_PROGRESS", label: "진행", color: "border-t-blue-500" },
  { key: "PAUSED", label: "일시정지", color: "border-t-amber-500" },
  { key: "DONE", label: "완료", color: "border-t-green-500" },
];

interface KanbanBoardProps {
  tasks: Task[];
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onTaskClick?: (task: Task) => void;
}

export function KanbanBoard({ tasks, onStatusChange, onTaskClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const taskId = String(active.id);
    const overId = String(over.id);
    // over가 컬럼이면 해당 상태로 이동
    const targetCol = columns.find((c) => c.key === overId);
    if (targetCol) {
      onStatusChange(taskId, targetCol.key);
      return;
    }
    // over가 카드면 그 카드의 컬럼으로 이동
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask) {
      onStatusChange(taskId, overTask.status);
    }
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className={cn("flex flex-col rounded-lg border bg-slate-100 border-t-4 border-slate-200 dark:border-slate-800 dark:bg-[#111827]", col.color)}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {colTasks.length}
                  </span>
                </div>
              </div>
              <SortableContext
                id={col.key}
                items={colTasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className="flex-1 space-y-2 p-2 min-h-[200px]"
                  data-column={col.key}
                >
                  {colTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      onClick={() => onTaskClick?.(t)}
                    />
                  ))}
                  {/* Drop zone marker for empty columns */}
                  {colTasks.length === 0 && (
                    <div
                      id={col.key}
                      className="flex h-24 items-center justify-center rounded-md border-2 border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500"
                    >
                      여기에 드롭
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? <KanbanCard task={activeTask} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanCard({
  task,
  onClick,
  dragging = false,
}: {
  task: Task;
  onClick?: () => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        "rounded-md border border-slate-200 bg-white p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900",
        dragging && "shadow-lg ring-2 ring-blue-400"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-slate-300 hover:text-slate-500 cursor-grab"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: priorityColor[task.priority] }}
              title={priorityLabel[task.priority]}
            />
            <span className="truncate text-sm font-medium text-slate-900">{task.title}</span>
          </div>
          {task.content && (
            <p className="mb-2 line-clamp-2 text-xs text-slate-500">{task.content}</p>
          )}
          <div className="flex items-center justify-between">
            <AvatarStackPlaceholder assigneeIds={task.assigneeIds} />
            <div className="flex items-center gap-1.5">
              {task.endDate && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                  <CalIcon className="h-3 w-3" />
                  {formatDate(task.endDate)}
                </span>
              )}
            </div>
          </div>
          {task.progress > 0 && task.progress < 100 && (
            <div className="mt-2 h-1 w-full rounded-full bg-slate-100">
              <div
                className="h-1 rounded-full bg-blue-500"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarStackPlaceholder({ assigneeIds }: { assigneeIds: string[] }) {
  if (assigneeIds.length === 0) return null;
  return (
    <div className="flex -space-x-1.5">
      {assigneeIds.slice(0, 3).map((id, i) => (
        <div
          key={id}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 ring-2 ring-white"
        >
          {id.replace("u", "U")}
        </div>
      ))}
      {assigneeIds.length > 3 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600 ring-2 ring-white">
          +{assigneeIds.length - 3}
        </div>
      )}
    </div>
  );
}
