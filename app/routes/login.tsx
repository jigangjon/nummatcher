import { Form, redirect } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Route } from "./+types/login";
import { createClient } from "~/lib/supabase/server";

export default function LogIn() {
  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Log In</h2>
      <Form method="POST" className="space-y-4">
        <Input type="email" placeholder="Email" name="email" required />
        <Input
          type="password"
          placeholder="Password"
          name="password"
          required
        />
        <Button type="submit" className="w-full hover:cursor-pointer">
          Log In
        </Button>
        <hr />
        <Button className="w-full hover:cursor-pointer">
          Log In with Google
        </Button>
      </Form>
    </div>
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const { supabase, headers } = createClient(request);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return redirect("/", { headers });
}
