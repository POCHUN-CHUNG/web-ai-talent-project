import time
from datetime import datetime, timedelta
from typing import List
import pandas as pd
import yfinance as yf


def fetch_historical_stock_prices(
    symbols: List[str] = None,
) -> pd.DataFrame:
    """抓取歷史股票收盤價（Yahoo Finance）"""
    if symbols is None:
        symbols = ["2330.TW", "8299.TWO"]

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=365 * 10 + 31)).strftime("%Y-%m-%d")

    chunk_size = 50
    chunks = [symbols[i : i + chunk_size] for i in range(0, len(symbols), chunk_size)]

    all_dfs = []

    for batch in chunks:
        df = yf.download(batch, start=start_date, end=end_date, auto_adjust=True)

        df = (
            df["Close"]
            .reset_index()
            .melt(id_vars="Date", var_name="symbol", value_name="close")
        )
        df["date"] = df["Date"].dt.strftime("%Y-%m-%d")
        all_dfs.append(df[["symbol", "close", "date"]])
        time.sleep(1)

    df = pd.concat(all_dfs, ignore_index=True)
    return df


def main():
    df = fetch_historical_stock_prices()
    print(df)
    return df


if __name__ == "__main__":
    main()
