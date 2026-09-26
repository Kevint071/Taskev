import { notFound } from "next/navigation";
import { NewTaskView } from "@/components/task-detail/new-task-view";
import { getCurrentUser } from "@/lib/auth-guard";
import { getGroupById } from "@/lib/data/access";

export default async function NewTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, group] = await Promise.all([getCurrentUser(), getGroupById(id)]);
  if (!user || !group || group.userId !== user.id) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <NewTaskView group={{ id: group.id, name: group.name }} />
    </div>
  );
}
