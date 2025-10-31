import { createClient } from "~/lib/supabase/server";
import type { Route } from "./+types/home";
import { redirect, useOutletContext } from "react-router";

export default function Home() {
  const { user } = useOutletContext();
  return <div>Welcome to Number Matcher!</div>;
}

export async function action({ request }: Route.ActionArgs) {
  const { supabase } = createClient(request);
  const { error } = await supabase.auth.signOut();

  return redirect("/login");
}
