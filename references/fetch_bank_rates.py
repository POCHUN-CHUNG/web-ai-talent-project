import time
from bs4 import BeautifulSoup
from curl_cffi import requests


def get_taiwan_bank_rate() -> float:
    """臺灣銀行 1年期定期存款機動利率"""
    url = "https://rate.bot.com.tw/twd"
    params = {"Lang": "zh-TW"}
    session = requests.Session(impersonate="chrome")
    response = session.get(url, params=params, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

    category_td = soup.find(
        lambda tag: tag.name == "td" and tag.get_text(strip=True) == "定期存款"
    )
    target_th = category_td.find_parent("tr").find_next(
        lambda tag: tag.name == "td" and "一年 ~ 未滿二年" in tag.get_text()
    )
    target_rate = target_th.find_next_siblings("td")[1].get_text(strip=True)
    return float(target_rate)


def get_tcb_bank_rate() -> float:
    """合作金庫銀行 1年期定期存款機動利率"""
    url = "https://www.tcb-bank.com.tw/personal-banking/deposit-exchange/deposit-rate/deposit-loans-rate/twd-deposit-rate"
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

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

    if target_rate is None:
        raise ValueError("未找到合作金庫銀行定期存款機動利率")

    return float(target_rate.replace("%", "").strip())


def get_land_bank_rate() -> float:
    """臺灣土地銀行 1年期定期存款機動利率"""
    url = "https://rate.landbank.com.tw/zh-TW/TWDInfo"
    params = {"mid": "23"}
    session = requests.Session(impersonate="chrome")
    response = session.get(url, params=params, timeout=15)
    soup = BeautifulSoup(response.text, "lxml")

    target_rate = soup.select_one('td[headers="regular r9 change"]').get_text(
        strip=True
    )
    return float(target_rate)


def get_huanan_bank_rate() -> float:
    """華南銀行 1年期定期存款機動利率"""
    url = "https://www.hncb.com.tw/hncb/rest/inRateTW/imm"
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
    data = response.json()

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
    """第一銀行 1年期定期存款機動利率"""
    url = "https://ebank.firstbank.com.tw/BATcpibWeb/html/FQ1001.html"
    session = requests.Session(impersonate="chrome")
    response = session.get(url, timeout=15)
    response.encoding = "big5"
    soup = BeautifulSoup(response.text, "lxml")

    target_th = soup.find(
        lambda tag: tag.name == "th" and tag.get_text(strip=True) == "定期存款"
    )
    target_tr = target_th.find_parent("tr")
    while target_tr:
        if "一年" in target_tr.get_text().replace(" ", ""):
            break
        target_tr = target_tr.find_next_sibling("tr")
    target_rate = target_tr.find_all("td")[2].text.strip()
    return float(target_rate)


def main():
    taiwan_rate = get_taiwan_bank_rate()
    tcb_rate = get_tcb_bank_rate()
    land_rate = get_land_bank_rate()
    huanan_rate = get_huanan_bank_rate()
    first_rate = get_first_bank_rate()

    # 使用 dict (key-value) 儲存五個輸出的值，方便後續寫入資料庫
    rate_dict = {
        "taiwan_bank": taiwan_rate,
        "tcb_bank": tcb_rate,
        "land_bank": land_rate,
        "huanan_bank": huanan_rate,
        "first_bank": first_rate,
    }

    print(rate_dict)
    return rate_dict


if __name__ == "__main__":
    main()
