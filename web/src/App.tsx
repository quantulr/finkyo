import type { Component } from "solid-js";

import { Router } from "@solidjs/router";
import routes from "@/routes";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const App: Component = () => {
  return (
    <QueryClientProvider client={client}>
      <Router>{routes}</Router>
    </QueryClientProvider>
  );
};

export default App;
