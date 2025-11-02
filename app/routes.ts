import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layouts/header.tsx", [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("signup", "routes/signup.tsx"),
    route("rules", "routes/rules.tsx"),
    route("create-game", "routes/create-game.tsx"),
    route("game/:gameId", "routes/game.tsx"),
    route("account", "routes/account.tsx"),
    route("play", "routes/play.tsx"),
    route("test", "routes/test.tsx"),
  ]),
  route("logout", "routes/logout-handler.tsx"),
] satisfies RouteConfig;

// TODO: authentication with providers
// TODO: improve user experience
