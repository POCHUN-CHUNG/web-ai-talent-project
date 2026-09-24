import styles from "./Switch.module.css";

type Props = {
  checked: boolean; // 目前是否為開啟狀態
  onChange: (checked: boolean) => void; // 切換時呼叫，帶入切換後的狀態
  label: string; // aria-label，說明這顆開關的用途
};

// 【開關】依 DESIGN.md 的 switch 元件 token（44×28 軌道、24px 圓形滑塊）。
// 參數：checked=是否開啟、onChange=切換時的callback、label=無障礙說明文字
export default function Switch({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={[styles.track, checked ? styles.on : ""].filter(Boolean).join(" ")}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
