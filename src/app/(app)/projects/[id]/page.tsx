"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AddTaskForm } from "@/components/projects/add-task-form";
import { BackLink } from "@/components/projects/back-link";
import { ProjectDetailHeader } from "@/components/projects/project-detail-header";
import { ProjectTaskList } from "@/components/projects/project-task-list";
import { useProjectDetail } from "@/components/projects/use-project-detail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingRows } from "@/components/ui/panel";
import { Toast } from "@/components/ui/toast";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const {
    project,
    tasks,
    syncState,
    toast,
    deleting,
    showToast,
    dismissToast,
    addTask,
    updateTask,
    toggleArchive,
    deleteProject,
  } = useProjectDetail(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rowNow] = useState(() => new Date());

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
        onToggleArchive={toggleArchive}
        onDelete={() => setConfirmDelete(true)}
      />

      <AddTaskForm onAdd={addTask} onTitleTooLong={showToast} />

      <ProjectTaskList
        tasks={tasks}
        now={rowNow}
        onTaskChange={updateTask}
        onBlocked={showToast}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="¿Eliminar este proyecto?"
        description={
          <>
            Se borrarán <strong className="text-ink">{project.name}</strong> y
            todas sus tareas y comentarios. No se puede deshacer.
          </>
        }
        confirmLabel="Eliminar proyecto"
        pending={deleting}
        onConfirm={deleteProject}
        onClose={() => setConfirmDelete(false)}
      />

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
