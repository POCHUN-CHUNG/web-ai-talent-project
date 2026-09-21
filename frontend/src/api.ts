// 後端網址（可由環境變數 VITE_API_BASE_URL 覆蓋）
const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001";

// 【API 錯誤】帶有 HTTP 狀態碼的錯誤，供畫面顯示訊息。
// 參數：status=狀態碼（如 401）、message=錯誤說明、code=後端錯誤碼（如 NOT_FOUND，舊端點沒有）
export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

// 【呼叫後端】統一的請求函式，預設有帶資料就用 POST、否則用 GET；修改與刪除請明確指定 method。
// 參數：path=API 路徑（如 "/auth/me"）、body=要送出的資料（可省略）、method=指定 HTTP 方法（可省略，如 "PATCH"、"DELETE"）
export async function api<T = unknown>(path: string, body?: unknown, method?: "GET" | "POST" | "PATCH" | "DELETE"): Promise<T> {
  // 1. 送出請求（credentials=一併帶上登入通行證）
  const res = await fetch(`${BASE}${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  // 2. 204 代表成功且無內容
  if (res.status === 204) return undefined as T;
  // 3. 讀取回應內容（讀取失敗視為空）
  const data = await res.json().catch(() => ({}));
  // 4. 失敗時丟出錯誤：新格式 {code, message}、舊格式為文字；都沒有就視為輸入格式不符
  if (!res.ok) {
    const d = data.detail;
    if (d && typeof d === "object" && typeof d.message === "string") throw new ApiError(res.status, d.message, d.code);
    throw new ApiError(res.status, typeof d === "string" ? d : "輸入格式不正確（僅限英文與數字）");
  }
  return data as T;
}
