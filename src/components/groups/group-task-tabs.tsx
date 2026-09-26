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

export function groupTaskTabId(view: GroupTaskView) {
  return `group-tab-${view}`;
}

export function groupTaskPanelId(view: GroupTaskView) {
  return `group-panel-${view}`;
}

/**
 * Tabs above a group's task list, on a hairline rule. An underline in the
 * active view's color slides between tabs; each tab carries its count.
 */
export function GroupTaskTabs({
  active,
  counts,
  onChange,
}: {
  active: GroupTaskView;
  counts: Record<GroupTaskView, number>;
  onChange: (view: GroupTaskView) => void;
}) {
  const tabRefs = useRef(new Map<GroupTaskView, HTMLButtonElement>());
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
        ? GROUP_TASK_VIEWS[0].value
        : event.key === "End"
          ? GROUP_TASK_VIEWS[GROUP_TASK_VIEWS.length - 1].value
          : null;
    if (!step && !edge) return;
    event.preventDefault();
    const index = GROUP_TASK_VIEWS.findIndex((view) => view.value === active);
    const next =
      edge ??
      GROUP_TASK_VIEWS[
        (index + step + GROUP_TASK_VIEWS.length) % GROUP_TASK_VIEWS.length
      ].value;
    onChange(next);
    tabRefs.current.get(next)?.focus();
  }

  const activeColor = VIEW_STYLE[active].color;

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label="Filtrar tareas del grupo"
      onKeyDown={handleKeyDown}
      className="relative flex w-full gap-1 border-b border-line md:gap-2"
    >
      {GROUP_TASK_VIEWS.map((view) => {
        const selected = view.value === active;
        const { icon: Icon, color } = VIEW_STYLE[view.value];
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
            id={groupTaskTabId(view.value)}
            aria-selected={selected}
            aria-controls={groupTaskPanelId(view.value)}
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
                className={`tabular hidden h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition-colors md:inline-flex ${
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
