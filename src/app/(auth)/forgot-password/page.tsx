import { redirect } from "next/navigation";

// Password recovery is disabled for now (see PASSWORD_RESET_ENABLED).
export default function Page() {
  redirect("/login");
}
