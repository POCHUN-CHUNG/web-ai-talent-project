import { CSSProperties, InputHTMLAttributes } from "react";
import styles from "./Slider.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number; // 目前的值
  min: number; // 最小值
  max: number; // 最大值
  onChange: (value: number) => void; // 拖動或按方向鍵改變時呼叫
};

const THUMB_WIDTH = 34; // 圓鈕寬度（橢圓形，寬大於高，見 Slider.module.css）

// 【滑桿】依 DESIGN.md 的 slider token：8px 高的淡主色軌道、已選取的部分為主色、圓鈕為橢圓形不透明白色。
// 用原生 <input type="range">，鍵盤（方向鍵、Home／End）與螢幕報讀器都能直接操作。
// 參數：value=目前的值、min／max=範圍、onChange=值改變時呼叫，其餘同原生 <input>（如 step、aria-label）
export default function Slider({ value, min, max, onChange, className, style, ...rest }: Props) {
  // 已選取部分的長度：圓鈕中心從軌道左端半個圓鈕寬移到右端半個圓鈕寬，填色要停在圓鈕中心
  const ratio = max > min ? (value - min) / (max - min) : 0;
  const half = THUMB_WIDTH / 2;
  const fill = { "--slider-fill": `calc(${half}px + (100% - ${THUMB_WIDTH}px) * ${ratio})` } as CSSProperties;
  return (
    <input
      type="range"
      className={[styles.slider, className].filter(Boolean).join(" ")}
      style={{ ...fill, ...style }}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      {...rest}
    />
  );
}
