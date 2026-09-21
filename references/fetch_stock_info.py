import io
import pandas as pd
import requests


def fetch_stock_info() -> pd.DataFrame:
    """抓取臺灣證券交易所及證券櫃檯買賣中心之股票與 ETF 基本資料，並加入加權報酬指數"""
    # (1, 1): 上市 (含普通股、KY股) | (2, 4): 上櫃普通股
    # (1, 'I'): 上市 ETF | (2, 3): 上櫃 ETF
    targets = [(1, 1), (2, 4), (1, "I"), (2, 3)]
    data = []

    for m, i in targets:
        url = f"https://isin.twse.com.tw/isin/class_main.jsp?market={m}&issuetype={i}"
        # 這裡沿用 requests 即可，因 ISIN 網站目前無嚴格防爬蟲限制
        res = requests.get(url, timeout=10)
        # 直接使用 pandas 解析 HTML 表格，捨棄 BeautifulSoup
        df = pd.read_html(
            io.StringIO(res.text), header=[0], converters={"有價證券代號": str}
        )[0]
        data.append(df)

    df = pd.concat(data, ignore_index=True)

    # 萃取所需欄位並清除空白
    df["symbol"] = df["有價證券代號"].astype(str).str.strip()
    df["name"] = df["有價證券名稱"].astype(str).str.strip()
    df["market"] = df["市場別"].astype(str).str.strip()
    df["industry"] = df["產業別"].astype(str).str.strip()

    # 正規表示式：過濾出 4碼數字 或 00開頭的ETF，排除特別股與權證
    regex_pattern = r"^([1-9]\d{3}|00\d{2,3}[A-Za-z]?)$"
    valid_stocks = df[df["symbol"].str.fullmatch(regex_pattern)].copy()

    # 只保留我們需要的 4 個欄位
    clean_df = valid_stocks[["symbol", "name", "market", "industry"]]

    # 將加權指數加入 DataFrame
    index_row = pd.DataFrame(
        [
            {
                "symbol": "IR0001",
                "name": "加權報酬指數",
                "market": "指數",
                "industry": "大盤",
            }
        ]
    )
    stock_info = pd.concat([clean_df, index_row], ignore_index=True)

    # 新增更新時間 (updated) 於最後一個欄位 (僅保留日期)
    stock_info["updated"] = pd.Timestamp.now().date()
    return stock_info


def main():
    stock_info = fetch_stock_info()
    print(stock_info)
    return stock_info


if __name__ == "__main__":
    main()
