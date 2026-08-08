import { Navigate } from "react-router-dom";

/** Signup folds into OAuth login (Google / GitHub). */
export function SignupPage() {
  return <Navigate to="/login" replace />;
}
