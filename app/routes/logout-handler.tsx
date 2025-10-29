import { createClient } from "~/lib/supabase/server";
import type { Route } from "./+types/logout-handler";
import { redirect } from "react-router";

export default function LogoutHandler() {
  return <></>;
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase, headers } = createClient(request);
  const { error } = await supabase.auth.signOut();

  return redirect("/login", { headers });
}
