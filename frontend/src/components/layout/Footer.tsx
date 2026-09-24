import styles from "./Footer.module.css";

// 【版權宣告】所有頁面共用、放在內容最下方；跟著頁面內容一起捲動，不是固定定位。無參數。
export default function Footer() {
  return <footer className={styles.footer}>© 2026 診股整股 All Rights Reserved.</footer>;
}
