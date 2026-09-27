import { FormEvent, useState } from "react";
import { api, ApiError } from "../api";
import { enterToNextField } from "../formKeys";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Modal from "./ui/Modal";
import modalStyles from "./ui/Modal.module.css";
import styles from "./PortfolioDialogs.module.css";
import Chip from "./ui/Chip";

// 【投資組合共用視窗】改名與確認刪除兩個彈出視窗，投資組合清單頁（卡片右上角選單）與組合詳情頁共用。

const NAME_MAX = 30; // 組合名稱最長字數（與後端一致）

// 【改名視窗】輸入新名稱後儲存。參數：portfolioId=組合編號、current=目前名稱、onClose=關閉、onDone=改名成功
export function RenameDialog({ portfolioId, current, onClose, onDone }: { portfolioId: number; current: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(current);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // 【儲存】檢查長度後送出
  async function save(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 1 || n.length > NAME_MAX) return setErr(`組合名稱須為 1～${NAME_MAX} 字`);
    if (n === current) return onClose();
    setBusy(true);
    try {
      await api(`/portfolios/${portfolioId}`, { name: n }, "PATCH");
      onDone();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "改名失敗");
      setBusy(false);
    }
  }

  return (
    <Modal title="修改組合名稱" onCancel={() => { if (!busy) onClose(); }}>
      <form onSubmit={save} onKeyDown={enterToNextField} className={styles.dialogForm}>
        <Input id="renamePortfolio" label="名稱" placeholder="請輸入投資組合名稱" value={name} maxLength={NAME_MAX} autoFocus disabled={busy} onChange={(e) => setName(e.target.value)} />
        {err && <Chip variant="error">{err}</Chip>}
        <div className={modalStyles.actions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>取消</Button>
          <Button type="submit" busy={busy}>儲存</Button>
        </div>
      </form>
    </Modal>
  );
}

// 【確認刪除視窗】取代瀏覽器原生確認框，失敗時在視窗內顯示原因。參數：title=標題、message=說明、confirmLabel=確認鈕文字、onClose=取消、onConfirm=確認後執行
export function ConfirmDialog({ title, message, confirmLabel, onClose, onConfirm }: {
  title: string; message: string; confirmLabel: string; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // 【確認】執行刪除；失敗就留在視窗顯示原因
  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "刪除失敗");
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onCancel={() => { if (!busy) onClose(); }}>
      <p className={styles.dialogText}>{message}</p>
      {err && <Chip variant="error">{err}</Chip>}
      <div className={modalStyles.actions}>
        <Button variant="secondary" onClick={onClose} disabled={busy}>取消</Button>
        <Button variant="danger" onClick={confirm} busy={busy}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
