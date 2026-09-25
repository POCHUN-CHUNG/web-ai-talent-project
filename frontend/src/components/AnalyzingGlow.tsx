import styles from "./AnalyzingGlow.module.css";

// 【分析中外框光暈】AI 解析產生期間（送出問卷後、按「重新產生」後），沿著整個視窗外圍以背景漸層色呼吸閃爍，讓使用者知道系統正在處理；
// 分析完成後由頁面移除，光暈隨之消失。無參數。
export default function AnalyzingGlow() {
  return <div className={styles.glow} aria-hidden="true" />;
}
