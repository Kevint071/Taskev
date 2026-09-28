import { groq } from "@/lib/ai/groq";
import { keyRoutes } from "@/lib/ai/key-routes";

const routes = keyRoutes("groq", groq);

export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
