import { recordTaskEvent } from "@/lib/data/repositories/activity";
import { type Comment, insertComment } from "@/lib/data/repositories/comments";
import { type Body, fail, type MutationResult } from "./result";

export async function addComment(
  taskId: string,
  body: Body,
): Promise<MutationResult<Comment>> {
  const commentBody = typeof body?.body === "string" ? body.body.trim() : "";
  if (!commentBody) {
    return fail(400, "El comentario no puede estar vacío");
  }

  const created = await insertComment({ taskId, body: commentBody });

  await recordTaskEvent({
    taskId,
    type: "comment_added",
    body: commentBody,
  });

  return { ok: true, value: created };
}
