import { createBrowserRouter, Navigate } from "react-router-dom";
import Home from "@/components/Home.tsx";

const routes = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to={"/browse"} />,
  },
  {
    path: "/browse/*",
    element: <Home />,
  },
]);

export default routes;
