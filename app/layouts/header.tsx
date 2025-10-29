import { Form, Link, Outlet } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/header";
import { createClient } from "~/lib/supabase/server";

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
}

export default function Header({ loaderData }: Route.ComponentProps) {
  const { user } = loaderData;
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow p-4 flex items-center space-x-4">
        <Link to="/" className="text-xl font-bold hover:text-shadow-sm">
          Number Matcher
        </Link>
        <Link to="play" className="hover:text-shadow-sm">
          Play
        </Link>
        <Link to="rules" className="hover:text-shadow-sm">
          Rules
        </Link>
        {user ? (
          <>
            <Link className="ml-auto hover:text-shadow-sm" to="account">
              Account
            </Link>
            <Form method="POST" action="/logout">
              <Button type="submit">Log Out</Button>
            </Form>
          </>
        ) : (
          <>
            <Link className="ml-auto hover:text-shadow-sm" to="login">
              Log In
            </Link>
            <Link className="hover:text-shadow-sm" to="signup">
              Sign Up
            </Link>
          </>
        )}
      </header>
      <main className="flex-grow p-6">
        <Outlet />
      </main>
    </div>
  );
}
