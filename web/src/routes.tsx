import { Navigate, redirect, RouteDefinition } from "@solidjs/router";
import Home from "@/components/Home";

const routes: RouteDefinition[] = [
  {
    path: "/",
    component: () => <Navigate href={"/browse"} />,
  },
  {
    path: "/browse/*path",
    component: () => <Home />,
  },
  {
    path: "/browse",
    component: () => <Home />,
  },
];

export default routes;
