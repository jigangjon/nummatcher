import { redirect } from "react-router";
import { userContext } from "~/context";
import { createClient } from "~/lib/supabase/server";

export const authMiddleware = async ({ request, context }) => {
  const { supabase } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw redirect("/not-implemented");
  }

  context.set(userContext, user);
};
