import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import "./styles/main.scss";
import App from "./App.tsx";

// Vite exposes browser-safe environment variables through import.meta.env.
// The VITE_ prefix matters because anything exposed here ships to the client bundle.
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in frontend/.env");
}

// Scene: golfer between holes on a sunny course, phone in one hand, glove on the other.
// That scene forces light mode. Dark mode has no place in this app's primary use case.
document.documentElement.setAttribute("data-theme", "light");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One quick retry on transient failure, not the default 3-with-backoff.
      // Search overrides this to `retry: false` for fail-fast behavior.
      retry: 1,
      retryDelay: 500,
    },
  },
});

// Provider order matters:
// Clerk owns auth context, React Query owns server cache, BrowserRouter owns route state.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>,
);
