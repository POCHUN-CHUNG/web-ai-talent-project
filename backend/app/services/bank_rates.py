import time

from bs4 import BeautifulSoup
from curl_cffi import requests


# 以下各函式皆為「爬取」：模擬瀏覽器開啟銀行牌告利率網頁，從中挖出 1 年期定期存款機動利率（%，回傳數字）。
# 網頁改版時，這裡的定位方式需要跟著調整。


def get_taiwan_bank_rate() -> float:
    # 【臺灣銀行】無參數。
    # 1. 開啟牌告利率網頁
    url = "https://rate.bot.com.tw/twd"
    params = {"Lang": "zh-TW"}
    session = requests.Session(impersonate="chrome")
    response = session.get(url, params=params, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

    # 2. 找到「定期存款」區塊
    category_td = soup.find(
        lambda tag: tag.name == "td" and tag.get_text(strip=True) == "定期存款"
    )
    # 3. 在該區塊找「一年 ~ 未滿二年」那一列
    target_th = category_td.find_parent("tr").find_next(
        lambda tag: tag.name == "td" and "一年 ~ 未滿二年" in tag.get_text()
    )
    # 4. 取出機動利率
    target_rate = target_th.find_next_siblings("td")[1].get_text(strip=True)
    return float(target_rate)


def get_tcb_bank_rate() -> float:
    # 【合作金庫銀行】無參數。
    # 1. 開啟牌告利率網頁
    url = "https://www.tcb-bank.com.tw/personal-banking/deposit-exchange/deposit-rate/deposit-loans-rate/twd-deposit-rate"
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

    # 2. 逐列尋找「定期存款」且「一年」的那一列
    target_rate = None
    for tr in soup.find_all("tr"):
        category = tr.find("td", attrs={"data-title": "類別"})
        period = tr.find("td", attrs={"data-title": "對象別"})

        if category and period:
            if "定期存款" in category.get_text() and "一年" in period.get_text():
                target_td = tr.find("td", attrs={"data-title": "機動利率"})
                if target_td:
                    target_rate = target_td.get_text(strip=True)
                    break

    # 3. 找不到就報錯
    if target_rate is None:
        raise ValueError("未找到合作金庫銀行定期存款機動利率")

    # 4. 去掉 % 符號後轉為數字
    return float(target_rate.replace("%", "").strip())


def get_land_bank_rate() -> float:
    # 【臺灣土地銀行】無參數。
    # 1. 開啟牌告利率網頁
    url = "https://rate.landbank.com.tw/zh-TW/TWDInfo"
    params = {"mid": "23"}
    session = requests.Session(impersonate="chrome")
    response = session.get(url, params=params, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

    # 2. 直接取出定期存款一年期的機動利率欄位
    target_rate = soup.select_one('td[headers="regular r9 change"]').get_text(
        strip=True
    )
    return float(target_rate)


def get_huanan_bank_rate() -> float:
    # 【華南銀行】無參數。
    # 1. 向銀行的資料介面取得利率清單（時間戳記避免拿到舊快取）
    url = "https://www.hncb.com.tw/hncb/rest/inRateTW/imm"
    params = {
        "_": int(time.time() * 1000),
    }
    session = requests.Session(impersonate="chrome")
    response = session.get(url, params=params, timeout=15)
    data = response.json()

    # 2. 從清單挑出「定期存款一年～未滿二年」（且無金額門檻）那一筆
    target_rate = next(
        (
            item["VARRATE"]
            for item in data
            if item["DESC"].strip() == "定期存款一年～未滿二年"
            and float(item["FOAAMT"]) == 0.0
        ),
        None,
    )
    return float(target_rate)


def get_first_bank_rate() -> float:
    # 【第一銀行】無參數。
    # 1. 開啟牌告利率網頁（網頁為 big5 編碼，需指定才不會亂碼）
    url = "https://ebank.firstbank.com.tw/BATcpibWeb/html/FQ1001.html"
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
    response.encoding = "big5"
    soup = BeautifulSoup(response.text, "lxml")

    # 2. 找到「定期存款」區塊
    target_th = soup.find(
        lambda tag: tag.name == "th" and tag.get_text(strip=True) == "定期存款"
    )
    # 3. 往下逐列找到含「一年」的那一列
    target_tr = target_th.find_parent("tr")
    while target_tr:
        if "一年" in target_tr.get_text().replace(" ", ""):
            break
        target_tr = target_tr.find_next_sibling("tr")
    # 4. 取出機動利率
    target_rate = target_tr.find_all("td")[2].text.strip()
    return float(target_rate)


def fetch_five_bank_rates() -> dict[str, float]:
    # 【彙整五家銀行利率】無參數，回傳「銀行代號 → 利率」的對照表。
    return {
        "taiwan_bank": get_taiwan_bank_rate(),
        "tcb_bank": get_tcb_bank_rate(),
        "land_bank": get_land_bank_rate(),
        "huanan_bank": get_huanan_bank_rate(),
        "first_bank": get_first_bank_rate(),
    }
