import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import Dashboard from './pages/Dashboard'
import CourseSearch from './pages/CourseSearch'
import StartRound from './pages/StartRound'
import HoleEntry from './pages/HoleEntry'
import RoundSummary from './pages/RoundSummary'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><CourseSearch /></ProtectedRoute>} />
      <Route path="/rounds/new" element={<ProtectedRoute><StartRound /></ProtectedRoute>} />
      <Route path="/rounds/:roundId/holes" element={<ProtectedRoute><HoleEntry /></ProtectedRoute>} />
      <Route path="/rounds/:roundId" element={<ProtectedRoute><RoundSummary /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
