"use client";

import { useState } from "react";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { ProjectFilterTabs } from "@/components/projects/project-filter-tabs";
import { ProjectGrid } from "@/components/projects/project-grid";
import { useProjects } from "@/components/projects/use-projects";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/panel";

export default function ProjectsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const { projects, loading, reload } = useProjects(showArchived);

  function handleCreated() {
    setCreating(false);
    if (showArchived) setShowArchived(false);
    else reload();
  }

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Agrupa tus tareas por objetivo. Archiva lo que ya no está activo."
        actions={
          !creating && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon />
              Nuevo proyecto
            </Button>
          )
        }
      />

      {creating && (
        <CreateProjectForm
          onClose={() => setCreating(false)}
          onCreated={handleCreated}
        />
      )}

      <section className="flex flex-col gap-3">
        <ProjectFilterTabs
          showArchived={showArchived}
          onChange={setShowArchived}
        />
        <ProjectGrid
          projects={projects}
          loading={loading}
          showArchived={showArchived}
        />
      </section>
    </>
  );
}
