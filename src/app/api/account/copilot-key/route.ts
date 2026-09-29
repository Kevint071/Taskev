import { copilot } from "@/lib/ai/copilot";
import { keyRoutes } from "@/lib/ai/key-routes";

const routes = keyRoutes("copilot", copilot);

export const GET = routes.GET;
export const PUT = routes.PUT;
export const DELETE = routes.DELETE;
