import { Form, redirect } from "react-router";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/signup";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";

export default function Signup() {
  return (
    <>
      <h1>Sign Up</h1>
      <Form method="POST">
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

  const { supabase, headers } = createClient(request);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  return redirect("/login");
}
