import styles from "./History.module.css";

// 【歷史紀錄頁】空頁面，之後補上實際內容。無參數。
export default function History() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>歷史紀錄</h1>
      <div className={styles.placeholder}>功能開發中，敬請期待。</div>
    </main>
  );
}
