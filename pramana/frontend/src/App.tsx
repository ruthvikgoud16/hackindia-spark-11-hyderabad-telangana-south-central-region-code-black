import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { ThemeProvider } from "./theme/ThemeContext";
import { AccountPage } from "./pages/AccountPage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { ChatPage } from "./pages/ChatPage";
import { ContactPage } from "./pages/ContactPage";
import { InspectionPage } from "./pages/InspectionPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="boot">Opening Pramana…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/oauth/callback" element={<AuthCallbackPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route
            path="/app"
            element={
              <Guard>
                <ChatPage />
              </Guard>
            }
          />
          <Route
            path="/app/account"
            element={
              <Guard>
                <AccountPage />
              </Guard>
            }
          />
          <Route
            path="/app/:chatId/inspect/:messageId"
            element={
              <Guard>
                <InspectionPage />
              </Guard>
            }
          />
          <Route
            path="/app/:chatId"
            element={
              <Guard>
                <ChatPage />
              </Guard>
            }
          />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
