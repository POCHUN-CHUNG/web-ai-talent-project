import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, RequireAuth, RequireProfile } from "./auth";
import Login from "./pages/Login";
import Portfolios from "./pages/Portfolios";
import PortfolioDetail from "./pages/PortfolioDetail";
import Settings from "./pages/Settings";
import Questionnaire from "./pages/Questionnaire";
import RiskProfile from "./pages/RiskProfile";
import RiskAnalysis from "./pages/RiskAnalysis";
import History from "./pages/History";
import TabsLayout from "./components/layout/TabsLayout";
import ScrollbarOverlay from "./components/layout/ScrollbarOverlay";

// 【App 根元件】決定「哪個網址顯示哪個頁面」。
export default function App() {
  return (
    // 1. 全站共用登入狀態
    <AuthProvider>
      {/* 自訂捲軸疊在所有頁面之上，跟路由無關，掛在最外層一次就好 */}
      <ScrollbarOverlay />
      <BrowserRouter>
        <Routes>
          {/* 2. 公開頁面：登入、註冊（同一元件，以 mode 區分） */}
          <Route path="/login" element={<Login key="login" mode="login" />} />
          <Route path="/register" element={<Login key="register" mode="register" />} />
          {/* 3. 需登入頁面（未登入會被導到登入頁）：風險屬性、問卷與設定頁隨時可進入 */}
          <Route element={<RequireAuth />}>
            {/* 4. 有頂端 Tab 列的頁面共用同一個 TabsLayout，切換分頁時 TopBar 不重新掛載，動畫才會順 */}
            <Route element={<TabsLayout />}>
              <Route path="/risk-profile" element={<RiskProfile />} />
              <Route path="/questionnaire" element={<Questionnaire />} />
              {/* 設定頁（帳號、改密碼、登出）與風險屬性無關，尚未完成評估也可進入 */}
              <Route path="/settings" element={<Settings />} />
              {/* 5. 其餘頁面須先有可用的風險屬性，否則導向風險屬性頁（該頁會引導去填問卷） */}
              <Route element={<RequireProfile />}>
                {/* 投資組合為子路由（非根路由），保留給之後新增的首頁使用；目前根路由先導向投資組合頁 */}
                <Route path="/portfolios" element={<Portfolios />} />
                <Route path="/analysis" element={<RiskAnalysis />} />
                <Route path="/history" element={<History />} />
                <Route path="/" element={<Navigate to="/portfolios" replace />} />
              </Route>
            </Route>
            {/* 投資組合明細頁不在頂端 Tab 列範圍內，維持獨立版面 */}
            <Route element={<RequireProfile />}>
              <Route path="/portfolios/:portfolioId" element={<PortfolioDetail />} />
            </Route>
          </Route>
          {/* 6. 其他網址一律導回投資組合頁 */}
          <Route path="*" element={<Navigate to="/portfolios" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
