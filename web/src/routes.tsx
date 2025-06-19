import { Navigate, redirect, RouteDefinition } from "@solidjs/router";
import Home from "@/components/Home";
import MediaPlayer from "@/components/MediaPlayer";

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
  {
    path: "/player/*uri",
    component: () => <MediaPlayer />,
  },
];

export default routes;
