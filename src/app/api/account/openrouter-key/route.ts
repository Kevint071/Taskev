import { keyRoutes } from "@/lib/ai/key-routes";
import { openrouter } from "@/lib/ai/openrouter";

const routes = keyRoutes("openrouter", openrouter);

export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
