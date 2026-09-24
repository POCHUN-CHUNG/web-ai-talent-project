// 【圖示】包裝 Material Symbols 字型圖示，避免每處都要重複打 class 名稱。
// 參數：name=Material Symbols 圖示名稱（如 "visibility"）、size=字級（預設 20px）、className=額外的 class
export default function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <span className={`material-symbols-outlined${className ? ` ${className}` : ""}`} style={{ fontSize: size }} aria-hidden="true">
      {name}
    </span>
  );
}
