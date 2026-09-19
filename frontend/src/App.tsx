import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Landing key="login" mode="login" />} />
          <Route path="/register" element={<Landing key="register" mode="register" />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
