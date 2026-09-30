"use client";

import {
  type ComponentType,
  type KeyboardEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { CalendarIcon, CheckIcon, InboxIcon } from "@/components/ui/icons";
import { GROUP_TASK_VIEWS, type GroupTaskView } from "@/lib/group-task-views";

const VIEW_STYLE: Record<
  GroupTaskView,
  { icon: ComponentType<{ className?: string }>; color: string }
> = {
  pendientes: { icon: CalendarIcon, color: "var(--accent)" },
  completadas: { icon: CheckIcon, color: "var(--status-done)" },
  no_programadas: { icon: InboxIcon, color: "var(--status-paused)" },
};

export type TaskTabItem<V extends string> = {
  value: V;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

const GROUP_TAB_ITEMS: TaskTabItem<GroupTaskView>[] = GROUP_TASK_VIEWS.map(
  ({ value, label }) => ({ value, label, ...VIEW_STYLE[value] }),
);

export function taskTabId(prefix: string, view: string) {
  return `${prefix}-tab-${view}`;
}

export function taskPanelId(prefix: string, view: string) {
  return `${prefix}-panel-${view}`;
}

export function groupTaskTabId(view: GroupTaskView) {
  return taskTabId("group", view);
}

export function groupTaskPanelId(view: GroupTaskView) {
  return taskPanelId("group", view);
}

/** Tabs above a group's task list. */
export function GroupTaskTabs({
  active,
  counts,
  onChange,
}: {
  active: GroupTaskView;
  counts: Record<GroupTaskView, number>;
  onChange: (view: GroupTaskView) => void;
}) {
  return (
    <TaskViewTabs
      items={GROUP_TAB_ITEMS}
      idPrefix="group"
      ariaLabel="Filtrar tareas del grupo"
      active={active}
      counts={counts}
      onChange={onChange}
    />
  );
}

/**
 * Tabs above a task list, on a hairline rule. An underline in the active
 * view's color slides between tabs; each tab carries its count.
 */
export function TaskViewTabs<V extends string>({
  items,
  idPrefix,
  ariaLabel,
  active,
  counts,
  onChange,
}: {
  items: TaskTabItem<V>[];
  /** Namespaces the tab/panel ids so two tab sets never collide. */
  idPrefix: string;
  ariaLabel: string;
  active: V;
  counts: Record<V, number>;
  onChange: (view: V) => void;
}) {
  const tabRefs = useRef(new Map<V, HTMLButtonElement>());
  const trackRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{
    left: number;
    width: number;
  } | null>(null);
  // The first placement snaps; only later moves animate.
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const tab = tabRefs.current.get(active);
    if (!track || !tab) return;
    function place() {
      if (!tab) return;
      setIndicator({ left: tab.offsetLeft, width: tab.offsetWidth });
    }
    place();
    // Counts and fonts change segment widths after the first paint.
    const observer = new ResizeObserver(place);
    observer.observe(track);
    for (const node of tabRefs.current.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  useLayoutEffect(() => {
    if (!indicator || animate) return;
    const frame = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [indicator, animate]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const edge =
      event.key === "Home"
        ? items[0].value
        : event.key === "End"
          ? items[items.length - 1].value
          : null;
    if (!step && !edge) return;
    event.preventDefault();
    const index = items.findIndex((view) => view.value === active);
    const next =
      edge ?? items[(index + step + items.length) % items.length].value;
    onChange(next);
    tabRefs.current.get(next)?.focus();
  }

  const activeColor = items.find((view) => view.value === active)?.color;

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className="relative flex w-full gap-1 border-b border-line md:gap-2"
    >
      {items.map((view) => {
        const selected = view.value === active;
        const { icon: Icon, color } = view;
        const count = counts[view.value];
        return (
          <button
            key={view.value}
            ref={(node) => {
              if (node) tabRefs.current.set(view.value, node);
              else tabRefs.current.delete(view.value);
            }}
            type="button"
            role="tab"
            id={taskTabId(idPrefix, view.value)}
            aria-selected={selected}
            aria-controls={taskPanelId(idPrefix, view.value)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(view.value)}
            className={`group flex h-11 min-w-0 flex-auto items-center justify-center text-meta font-medium transition-colors md:h-12 md:flex-none md:text-ui ${
              selected ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {/* Hover chip sits above the rule, so the underline stays crisp. */}
            <span className="flex min-w-0 items-center gap-2 rounded-control px-2 py-1.5 transition-colors group-hover:bg-sunken md:px-2.5">
              <span
                className="hidden transition-colors md:inline-flex"
                style={{ color: selected ? color : undefined }}
              >
                <Icon className="size-4" />
              </span>
              <span className="truncate">{view.label}</span>
              <span
                className={`tabular hidden h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.75rem] font-semibold transition-colors md:inline-flex ${
                  selected ? "" : "bg-sunken text-muted group-hover:bg-line"
                }`}
                style={
                  selected
                    ? {
                        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                        color,
                      }
                    : undefined
                }
              >
                {count}
              </span>
            </span>
          </button>
        );
      })}
      {indicator && (
        <span
          aria-hidden="true"
          className={`absolute -bottom-px left-0 h-0.5 rounded-full ${
            animate
              ? "transition-[transform,width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              : ""
          }`}
          style={{
            width: indicator.width,
            transform: `translateX(${indicator.left}px)`,
            backgroundColor: activeColor,
          }}
        />
      )}
    </div>
  );
}
