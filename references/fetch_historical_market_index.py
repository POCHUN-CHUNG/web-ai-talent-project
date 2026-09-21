import time
from datetime import datetime
from typing import List
from dateutil.relativedelta import relativedelta
import pandas as pd
import requests


def generate_monthly_dates(years: int = 1) -> List[str]:
    """生成回溯指定年數的每月 1 號日期字串清單 (YYYYMM01)"""
    base_month = datetime.now().replace(day=1)
    date_list = []
    for i in range(years * 12 + 1):
        target_month = base_month - relativedelta(months=i)
        date_list.append(target_month.strftime("%Y%m01"))
    return date_list[::-1]


def roc_to_ad_date(roc_date_str: str) -> str:
    """民國年日期字串轉為西元格式 (YYYY-MM-DD)"""
    parts = roc_date_str.strip().split("/")
    year = int(parts[0]) + 1911
    return f"{year}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"


def fetch_monthly_data(date: str) -> list:
    """向臺灣證券交易所抓取指定月份的發行量加權股價報酬指數"""
    url = f"https://www.twse.com.tw/rwd/zh/TAIEX/MFI94U?response=json&date={date}"
    try:
        response = requests.get(url, timeout=15)
        data = response.json()
        if data.get("stat") == "OK" and data.get("data"):
            return data["data"]
    except Exception as e:
        print(f"[{date}] 抓取異常: {e}")
    return []


def fetch_daily_data(dates: List[str]) -> pd.DataFrame:
    """逐月抓取大盤報酬指數資料並整理成 DataFrame"""
    all_data = []

    for date in dates:
        print(f"正在抓取 {date} ...")
        month_data = fetch_monthly_data(date)
        all_data.extend(month_data)
        time.sleep(2)

    df = pd.DataFrame(all_data, columns=["date", "return_index"])
    df["date"] = df["date"].apply(roc_to_ad_date)
    df["return_index"] = df["return_index"].str.replace(",", "").astype(float)
    return df


def main():
    dates = generate_monthly_dates(2)
    df = fetch_daily_data(dates)
    print(df)
    return df


if __name__ == "__main__":
    main()
