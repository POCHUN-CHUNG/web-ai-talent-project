import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 【前端開發伺服器設定】
export default defineConfig({
  plugins: [react()], // 啟用 React 支援
  server: {
    host: "0.0.0.0", // 允許從容器外部連線
    port: 5173, // 服務埠號
    watch: {
      usePolling: true, // 以輪詢偵測檔案變更（Docker 環境下才能自動重新載入）
    },
  },
});
