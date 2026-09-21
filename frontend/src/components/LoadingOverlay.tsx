// 【載入遮罩】蓋住整個畫面的半透明遮罩，中間顯示轉圈圈與「分析中」，讓使用者知道正在處理。無參數。
export default function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", inset: 0, background: "rgba(255,255,255,0.75)", zIndex: 1000,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem",
      }}
    >
      {/* 轉圈圈：以 CSS 動畫旋轉的圓環 */}
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
      <div style={{ width: 48, height: 48, border: "5px solid #ccc", borderTopColor: "#333", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <div style={{ fontSize: "1.1rem" }}>分析中</div>
    </div>
  );
}
