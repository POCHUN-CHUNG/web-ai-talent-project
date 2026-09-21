import logging

from bs4 import BeautifulSoup
from curl_cffi import requests

from app.services.n8n_result import with_retry

logger = logging.getLogger(__name__)


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
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
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


# 銀行代號 → 爬取函式
BANK_FETCHERS = {
    "taiwan_bank": get_taiwan_bank_rate,
    "tcb_bank": get_tcb_bank_rate,
    "land_bank": get_land_bank_rate,
    "huanan_bank": get_huanan_bank_rate,
    "first_bank": get_first_bank_rate,
}
MAX_REASONABLE_RATE = 10  # 1 年期定存利率超過這個值（%）視為網頁解析錯誤，不寫入


def fetch_five_bank_rates() -> tuple[dict[str, float], dict[str, str]]:
    # 【彙整五家銀行利率】無參數。逐家爬取（單家失敗會自動重試），回傳（成功的利率, 失敗的原因）兩份對照表，
    # 皆以「銀行代號」為鍵。利率不合理（≤ 0 或過高）視為解析錯誤而算失敗，避免把爬歪的數字寫進資料庫。
    rates: dict[str, float] = {}
    errors: dict[str, str] = {}
    for bank, fetcher in BANK_FETCHERS.items():
        # 1. 抓取並自動重試
        try:
            rate = with_retry(fetcher, f"銀行利率 {bank}", logger)
            # 2. 檢查數值合理
            if not 0 < rate < MAX_REASONABLE_RATE:
                raise ValueError(f"利率數值不合理：{rate}")
            rates[bank] = rate
        except Exception as exc:  # noqa: BLE001  網頁改版、逾時、被擋等都算該家失敗
            errors[bank] = f"{type(exc).__name__}: {exc}"[:200]
    return rates, errors
