import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth } from "./auth";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Settings from "./pages/Settings";

// 【App 根元件】決定「哪個網址顯示哪個頁面」。
export default function App() {
  return (
    // 1. 全站共用登入狀態
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 2. 公開頁面：登入、註冊（同一元件，以 mode 區分） */}
          <Route path="/login" element={<Landing key="login" mode="login" />} />
          <Route path="/register" element={<Landing key="register" mode="register" />} />
          {/* 3. 需登入頁面：首頁、使用者設定（未登入會被導到登入頁） */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Home />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          {/* 4. 其他網址一律導回首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
