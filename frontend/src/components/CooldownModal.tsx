import { useEffect, useState } from "react";
import AlertDialog from "./ui/AlertDialog";

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

  const message = left > 0 
    ? `請於 ${left} 秒後再嘗試重新填寫問卷。` 
    : "現在可以重新填寫，請再次點擊「重新評估」。";

  return (
    <AlertDialog
      open={true}
      title="填寫的時間過短"
      messages={[message]}
      confirmLabel="關閉"
      onConfirm={onClose}
    />
  );
}
