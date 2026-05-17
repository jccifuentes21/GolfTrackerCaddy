import { Routes, Route, Navigate } from "react-router-dom";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  AuthenticateWithRedirectCallback,
} from "@clerk/clerk-react";
import Dashboard from "./pages/Dashboard";
import CourseSearch from "./pages/CourseSearch";
import StartRound from "./pages/StartRound";
import HoleEntry from "./pages/HoleEntry";
import RoundSummary from "./pages/RoundSummary";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import Toaster from "./components/Toaster";

// ProtectedRoute is a small auth boundary around pages that require a signed-in user.
// Keeping it here makes the route table easy to scan and avoids repeating Clerk checks per page.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

export default function App() {
  return (
    <>
      {/* React Router maps URLs to page components. Dynamic segments like :roundId
          become params that pages can read with useParams(). */}
      <Routes>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        {/* Clerk redirects OAuth and SSO providers back here before completing the session. */}
        <Route
          path="/sso-callback"
          element={<AuthenticateWithRedirectCallback />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/courses"
          element={
            <ProtectedRoute>
              <CourseSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rounds/new"
          element={
            <ProtectedRoute>
              <StartRound />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rounds/:roundId/holes"
          element={
            <ProtectedRoute>
              <HoleEntry />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rounds/:roundId"
          element={
            <ProtectedRoute>
              <RoundSummary />
            </ProtectedRoute>
          }
        />
        {/* Unknown URLs fall back to the app home instead of showing a blank page. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* The toaster is mounted once at app level so any page or hook can enqueue messages. */}
      <Toaster />
    </>
  );
}
