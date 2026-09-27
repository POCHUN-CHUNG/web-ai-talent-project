import { KeyboardEvent } from "react";

// 【Enter 跳下一格】掛在 <form onKeyDown> 上：在輸入框按 Enter 時，若後面還有輸入框就移到下一格；
// 已經是最後一格就不攔截，交給表單原生的「按 Enter 送出」（等同按下送出按鈕），使用者不必再點按鈕。
// 輸入法選字中（例如注音、倉頡按 Enter 確認選字）不處理，避免選字時被跳格或誤送出。
// 參數：e=表單的鍵盤事件
export function enterToNextField(e: KeyboardEvent<HTMLFormElement>) {
  // 1. 只處理 Enter，且不在輸入法選字中
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  // 2. 找出表單內所有可輸入的文字類欄位（略過隱藏、停用、勾選框與單選鈕）
  const fields = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>("input")).filter(
    (el) => !el.disabled && el.type !== "hidden" && el.type !== "checkbox" && el.type !== "radio",
  );
  // 3. 不是最後一格：移到下一格並擋下原生送出；最後一格：交給表單送出
  const i = fields.indexOf(target);
  if (i >= 0 && i < fields.length - 1) {
    e.preventDefault();
    fields[i + 1].focus();
  }
}
