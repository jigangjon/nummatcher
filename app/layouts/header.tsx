import { Form, Link, Outlet, useOutletContext } from "react-router";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/header";

export default function Header({ loaderData }: Route.ComponentProps) {
  const { user } = useOutletContext();
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
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}
