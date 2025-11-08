import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Form, Link, Outlet, useOutletContext } from "react-router";

export default function Header() {
  const { user } = useOutletContext();
  const { theme, setTheme, systemTheme } = useTheme();
  const [hideDropdown, setHideDropdown] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const themeColor = theme === "dark" ? "#020817" : "#fff";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
  }, [theme]);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setHideDropdown(true);
      }
    }
    document.addEventListener("mouseup", onClickOutside);
    return () => document.removeEventListener("mouseup", onClickOutside);
  }, []);
  function contraryTheme(theme: string | undefined) {
    if (theme === "light") return "dark";
    if (theme === "dark") return "light";
    if (systemTheme === "light") return "dark";
    return "light";
  }
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-background border-border dark:border-b shadow-sm dark:shadow-none z-10 flex items-center text-text-muted h-16 relative">
        <Link
          to="/"
          className="text-xl font-bold text-text py-4 pl-6 pr-4 hover:text-primary"
        >
          Number Matcher
        </Link>
        <HeaderItem>
          <Link className="flex items-center px-4" to="play">
            Play
          </Link>
        </HeaderItem>
        <HeaderItem>
          <Link className="flex items-center px-4" to="rules">
            Rules
          </Link>
        </HeaderItem>
        <button
          className="h-full hover:text-text hover:cursor-pointer px-2 ml-auto"
          onClick={() => setTheme(contraryTheme(theme))}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="100"
            height="100"
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="currentColor"
          >
            <path d="M 11 0 L 11 3 L 13 3 L 13 0 L 11 0 z M 4.2226562 2.8085938 L 2.8085938 4.2226562 L 4.9296875 6.34375 L 6.34375 4.9296875 L 4.2226562 2.8085938 z M 19.777344 2.8085938 L 17.65625 4.9296875 L 19.070312 6.34375 L 21.191406 4.2226562 L 19.777344 2.8085938 z M 12 5 C 8.1458514 5 5 8.1458514 5 12 C 5 15.854149 8.1458514 19 12 19 C 15.854149 19 19 15.854149 19 12 C 19 8.1458514 15.854149 5 12 5 z M 12 7 C 14.773268 7 17 9.2267316 17 12 C 17 14.773268 14.773268 17 12 17 C 9.2267316 17 7 14.773268 7 12 C 7 9.2267316 9.2267316 7 12 7 z M 0 11 L 0 13 L 3 13 L 3 11 L 0 11 z M 21 11 L 21 13 L 24 13 L 24 11 L 21 11 z M 4.9296875 17.65625 L 2.8085938 19.777344 L 4.2226562 21.191406 L 6.34375 19.070312 L 4.9296875 17.65625 z M 19.070312 17.65625 L 17.65625 19.070312 L 19.777344 21.191406 L 21.191406 19.777344 L 19.070312 17.65625 z M 11 21 L 11 24 L 13 24 L 13 21 L 11 21 z"></path>
          </svg>
        </button>
        {user ? (
          <div ref={ref} className="h-full">
            <button
              onClick={() => setHideDropdown((prev) => !prev)}
              className="flex items-center px-2 hover:text-text hover:cursor-pointer h-full justify-center relative"
            >
              {user.user_metadata.nickname}
            </button>
            <Form
              method="POST"
              action="/logout"
              className="absolute right-0 top-full"
              hidden={hideDropdown}
            >
              <button type="submit" className="hover:cursor-pointer">
                Log Out
              </button>
            </Form>
          </div>
        ) : (
          <>
            <Link
              className="flex items-center pl-2 px-4 hover:text-text hover:cursor-pointer h-full justify-center"
              to="login"
            >
              Log In
            </Link>
          </>
        )}
      </header>
      <main className="flex-grow p-6 bg-background-dark">
        <Outlet context={{ user }} />
      </main>
    </div>
  );
}

function HeaderItem({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={`hover:text-text hover:cursor-pointer hover:bg-background-dark dark:hover:bg-background-light h-full flex items-stretch justify-center ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
