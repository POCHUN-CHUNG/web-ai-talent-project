import { flushSync } from "react-dom";

// 【收合時維持畫面位置】「顯示其餘 N 檔／收合」這類按鈕共用：
// 1. 展開：內容往下長，頁面不動，新出現的列就接在使用者正在看的位置下方。
// 2. 收合：上方的列被收起，按鈕會往上跳、整段可能捲出畫面；這裡在收合後把頁面捲回，讓按鈕停在原本的螢幕位置，
//    使用者不會找不到原本的段落。
// 參數：el=按鈕本身、collapsing=這次是否為收合、change=切換展開狀態的函式
export function toggleKeepingPlace(el: HTMLElement, collapsing: boolean, change: () => void): void {
  if (!collapsing) {
    change();
    return;
  }
  const before = el.getBoundingClientRect().top;
  flushSync(change); // 立刻套用收合，才量得到收合後的位置
  const after = el.getBoundingClientRect().top;
  window.scrollBy({ top: after - before, behavior: "instant" as ScrollBehavior });
}
