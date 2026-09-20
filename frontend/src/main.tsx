import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// 【前端進入點】把 App 畫面放進網頁中 id 為 root 的位置（StrictMode 會在開發時多做檢查）
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
