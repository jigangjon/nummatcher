import { Form, redirect } from "react-router";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/signup";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { userContext } from "~/context";
import { authMiddleware } from "~/middlewares/auth";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return redirect("/");
  }

  return user;
}

export default function Signup() {
  return (
    <>
      <h1>Sign Up</h1>
      <Form method="POST">
        <Input placeholder="nickname" type="text" name="nickname" required />
        <Input placeholder="Email" type="email" name="email" required />
        <Input
          placeholder="Password"
          type="password"
          name="password"
          required
        />
        <Button type="submit">Sign Up</Button>
      </Form>
    </>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const nickname = String(formData.get("nickname"));

  const { supabase, headers } = createClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname,
      },
    },
  });

  if (error) {
    console.error("Signup error:", error.message);
  }

  return redirect("/login");
}
