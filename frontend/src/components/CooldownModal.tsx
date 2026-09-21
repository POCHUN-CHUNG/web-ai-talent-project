import { useEffect, useState } from "react";

// 【冷卻提示視窗】剛送出過問卷、時間過短時彈出：告知還要等幾秒才能重新填寫，使用者仍可查看結果。
// 參數：seconds=剩餘秒數、onClose=按「關閉」時執行
export default function CooldownModal({ seconds, onClose }: { seconds: number; onClose: () => void }) {
  const [left, setLeft] = useState(seconds);

  // 每秒倒數一次（到 0 停止）
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <div style={{ background: "#fff", padding: "1.5rem 2rem", maxWidth: 380, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>填寫的時間過短</h3>
        {left > 0 ? <p>請於 {left} 秒後再嘗試重新填寫問卷。</p> : <p>現在可以重新填寫了，請再按一次「重新填寫問卷」。</p>}
        <button onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}
