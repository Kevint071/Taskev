"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  focusTaskComposer,
  isNewTaskShortcut,
  NewTaskButton,
  NewTaskFab,
  TaskComposer,
} from "@/components/groups/add-task-form";
import { BackLink } from "@/components/groups/back-link";
import { GroupDetailHeader } from "@/components/groups/group-detail-header";
import { GroupTaskList } from "@/components/groups/group-task-list";
import { GroupTaskTabs } from "@/components/groups/group-task-tabs";
import { useGroupDetail } from "@/components/groups/use-group-detail";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { EmptyState, LoadingRows } from "@/components/ui/panel";
import { Toast } from "@/components/ui/toast";
import {
  GROUP_TASK_VIEW_PARAM,
  type GroupTaskView,
  groupTaskViewHref,
  parseGroupTaskView,
  splitGroupTasks,
} from "@/lib/group-task-views";

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    group,
    tasks,
    syncState,
    toast,
    showToast,
    dismissToast,
    addTask,
    updateTask,
  } = useGroupDetail(id);
  const [rowNow] = useState(() => new Date());
  const [composing, setComposing] = useState(false);
  // The URL holds the view, so a reload or the browser's back button keeps it.
  const searchParams = useSearchParams();
  const view = parseGroupTaskView(searchParams.get(GROUP_TASK_VIEW_PARAM));

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isNewTaskShortcut(event)) return;
      event.preventDefault();
      setComposing(true);
      focusTaskComposer();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openComposer() {
    setComposing(true);
    focusTaskComposer();
  }

  function selectView(next: GroupTaskView) {
    // Replace rather than push: switching tabs shouldn't fill the back stack.
    window.history.replaceState(null, "", groupTaskViewHref(id, next));
  }

  function handleAdd(title: string): boolean {
    if (!addTask(title)) return false;
    // New tasks have no due date or priority yet: follow them to where they land.
    selectView("no_programadas");
    return true;
  }

  if (!group) {
    return (
      <>
        <div className="-mx-2 flex h-11 items-center">
          <BackLink />
        </div>
        <LoadingRows rows={4} />
      </>
    );
  }

  const openCount = tasks.filter((t) => t.status !== "completada").length;
  const byView = splitGroupTasks(tasks);
  const newTaskAction = composing ? undefined : (
    <Button variant="primary" onClick={openComposer}>
      <PlusIcon />
      Nueva tarea
    </Button>
  );

  return (
    <>
      <GroupDetailHeader
        group={group}
        taskCount={tasks.length}
        openCount={openCount}
        syncState={syncState}
        action={<NewTaskButton onClick={openComposer} />}
      />

      {/* Tabs sit closer to the list they filter than to the header. */}
      <div className="flex flex-col gap-4 md:gap-5">
        {tasks.length > 0 && (
          <GroupTaskTabs
            active={view}
            counts={{
              pendientes: byView.pendientes.length,
              completadas: byView.completadas.length,
              no_programadas: byView.no_programadas.length,
            }}
            onChange={selectView}
          />
        )}

        {composing && (
          <TaskComposer
            onAdd={handleAdd}
            onTitleTooLong={showToast}
            onClose={() => setComposing(false)}
          />
        )}

        {tasks.length === 0 ? (
          <EmptyState
            title="Este grupo no tiene tareas"
            description="Crea la primera y empieza a avanzar."
            action={newTaskAction}
          />
        ) : (
          <GroupTaskList
            view={view}
            tasks={byView[view]}
            now={rowNow}
            onTaskChange={updateTask}
            onBlocked={showToast}
            emptyAction={
              view === "pendientes" && byView.no_programadas.length > 0 ? (
                <Button onClick={() => selectView("no_programadas")}>
                  Ver {byView.no_programadas.length} sin programar
                </Button>
              ) : view === "completadas" ? undefined : (
                newTaskAction
              )
            }
          />
        )}
      </div>

      {/* Room so the floating button never covers the last row. */}
      <div aria-hidden="true" className="h-1 md:hidden" />
      {/* An empty group already offers its own call to action. */}
      {!composing && tasks.length > 0 && <NewTaskFab onClick={openComposer} />}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
