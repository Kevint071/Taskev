import { MAX_GROUP_NAME_LENGTH } from "@/lib/constraints";
import {
  deleteGroupById,
  type Group,
  type GroupChanges,
  insertGroup,
  updateGroupById,
} from "@/lib/data/repositories/groups";
import { type Body, fail, type MutationResult } from "./result";

export async function createGroup(
  userId: string,
  body: Body,
): Promise<MutationResult<Group>> {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description =
    typeof body?.description === "string" ? body.description : null;

  if (!name) {
    return fail(400, "El nombre del grupo es requerido");
  }

  if (name.length > MAX_GROUP_NAME_LENGTH) {
    return fail(
      400,
      `El nombre no puede tener más de ${MAX_GROUP_NAME_LENGTH} caracteres`,
    );
  }

  const created = await insertGroup({ userId, name, description });

  return { ok: true, value: created };
}

export async function updateGroup(
  groupId: string,
  body: Body,
): Promise<MutationResult<Group>> {
  const updates: GroupChanges = {};

  if (body?.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return fail(400, "El nombre del grupo no puede estar vacío");
    }
    updates.name = name;
  }

  if (body?.description !== undefined) {
    updates.description =
      typeof body.description === "string" ? body.description : null;
  }

  if (body?.archived !== undefined) {
    updates.archivedAt = body.archived ? new Date() : null;
  }

  const updated = await updateGroupById(groupId, updates);

  return { ok: true, value: updated };
}

export async function deleteGroup(
  groupId: string,
): Promise<MutationResult<null>> {
  await deleteGroupById(groupId);
  return { ok: true, value: null };
}
