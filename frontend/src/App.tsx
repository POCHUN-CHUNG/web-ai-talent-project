import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth, RequireProfile } from "./auth";
import Login from "./pages/Login";
import Home from "./pages/Home";
import PortfolioDetail from "./pages/PortfolioDetail";
import Settings from "./pages/Settings";
import Questionnaire from "./pages/Questionnaire";
import RiskProfile from "./pages/RiskProfile";

// 【App 根元件】決定「哪個網址顯示哪個頁面」。
export default function App() {
  return (
    // 1. 全站共用登入狀態
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 2. 公開頁面：登入、註冊（同一元件，以 mode 區分） */}
          <Route path="/login" element={<Login key="login" mode="login" />} />
          <Route path="/register" element={<Login key="register" mode="register" />} />
          {/* 3. 需登入頁面（未登入會被導到登入頁）：問卷與風險屬性結果頁隨時可進入 */}
          <Route element={<RequireAuth />}>
            <Route path="/questionnaire" element={<Questionnaire />} />
            <Route path="/risk-profile" element={<RiskProfile />} />
            {/* 4. 其餘頁面須先有可用的風險屬性，否則導向問卷 */}
            <Route element={<RequireProfile />}>
              <Route path="/" element={<Home />} />
              <Route path="/portfolios/:portfolioId" element={<PortfolioDetail />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          {/* 5. 其他網址一律導回首頁 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
