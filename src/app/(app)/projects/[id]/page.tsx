"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  focusTaskComposer,
  isNewTaskShortcut,
  NewTaskButton,
  NewTaskFab,
  TaskComposer,
} from "@/components/projects/add-task-form";
import { BackLink } from "@/components/projects/back-link";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectTaskList } from "@/components/projects/project-task-list";
import { useProjectDetail } from "@/components/projects/use-project-detail";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { LoadingRows } from "@/components/ui/panel";
import { Toast } from "@/components/ui/toast";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    project,
    tasks,
    syncState,
    toast,
    showToast,
    dismissToast,
    addTask,
    updateTask,
  } = useProjectDetail(id);
  const [rowNow] = useState(() => new Date());
  const [composing, setComposing] = useState(false);

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

  if (!project) {
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

  return (
    <>
      <ProjectDetailHeader
        project={project}
        taskCount={tasks.length}
        openCount={openCount}
        syncState={syncState}
        action={<NewTaskButton onClick={openComposer} />}
      />

      {composing && (
        <TaskComposer
          onAdd={addTask}
          onTitleTooLong={showToast}
          onClose={() => setComposing(false)}
        />
      )}

      <ProjectTaskList
        tasks={tasks}
        now={rowNow}
        onTaskChange={updateTask}
        onBlocked={showToast}
        emptyAction={
          composing ? undefined : (
            <Button variant="primary" onClick={openComposer}>
              <PlusIcon />
              Nueva tarea
            </Button>
          )
        }
      />

      {/* Room so the floating button never covers the last row. */}
      <div aria-hidden="true" className="h-1 md:hidden" />
      {/* An empty project already offers its own call to action. */}
      {!composing && tasks.length > 0 && <NewTaskFab onClick={openComposer} />}

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
