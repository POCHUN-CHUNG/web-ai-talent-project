import re

# 【問卷題庫與轉換規則】14 題題庫、作答驗證、作答衝突檢查、四項核心指標、事實（facts）與交叉分析（findings）。
# 全部是固定規則（查表與取最低），不含評分加總，也不呼叫 AI；規則依 spec/04-behavior.md §4.2。
# facts 與 findings 產生後原樣存進資料庫，也原樣送給 AI，格式以 spec/prompts/risk_profile_system.md 為準。

QUESTIONNAIRE_VERSION = "1.0.0"  # 問卷版本
RULES_VERSION = "1.1.0"  # 轉換規則版本（須與 Prompt 開頭的 rules_version 一致）


def _opts(*labels: str) -> list[dict]:
    # 【組選項】依序把文字配上 A、B、C… 的代號。參數：labels=各選項文字
    return [{"value": chr(65 + i), "label": t} for i, t in enumerate(labels)]


# 題庫：id、題目、型態（single 單選／multiple 複選）、選項。文字以《風險評估問卷(調整後).md》為準，
# 「%」前一律加半形空格；選項原文同時是存進 facts 的 value_text，改字時 Prompt 字典要同步修改
QUESTIONS: list[dict] = [
    {"id": "Q1", "title": "您的年齡？", "type": "single",
     "options": _opts("18 - 29 歲", "30 - 44 歲", "45 - 54 歲", "55 - 64 歲", "65 歲以上")},
    {"id": "Q2", "title": "個人稅前年所得（新臺幣）？", "type": "single",
     "options": _opts("未滿 50 萬元", "50 - 99 萬元", "100 - 199 萬元", "200 - 299 萬元", "300 萬元以上")},
    {"id": "Q3", "title": "扣除每月必要生活開銷與還款後，您的資金結餘狀況？", "type": "single",
     "options": _opts("經常透支或還款困難", "收支相抵，幾乎無結餘", "略有結餘，可少量儲蓄或投資",
                      "穩定結餘，可定期儲蓄或投資", "結餘充裕，即使投資虧損也不影響生活")},
    {"id": "Q4", "title": "您的緊急預備金（現金或活存）約可支應幾個月的必要生活費？", "type": "single",
     "options": _opts("未滿 1 個月（或未準備）", "1 - 2 個月", "3 - 5 個月", "6 - 11 個月", "12 個月以上")},
    {"id": "Q5", "title": "目前投資金額占可動用金融資產的比例？", "type": "single",
     "options": _opts("60 % 以上", "40 - 59 %", "20 - 39 %", "10 - 19 %", "未滿 10 %")},
    {"id": "Q6", "title": "您最主要的投資目標？", "type": "single",
     "options": _opts("保本穩定，抗通膨即可", "獲取穩定配息或現金流", "累積特定目標資金（如購屋、教育）",
                      "累積長期目標資產（如退休金）", "追求長期資產增值與財富累積")},
    {"id": "Q7", "title": "您目前的投資資金，整體而言預計多久不需動用？", "type": "single",
     "options": _opts("未滿 1 年", "1 - 2 年", "3 - 4 年", "5 - 9 年", "10 年以上")},
    {"id": "Q8", "title": "未來 1 年內，從投資中提領資金的機率？", "type": "single",
     "options": _opts("極高，可能提領過半或全部", "偏高，可能提領部分資金", "中等，但能優先以其他備用金支應",
                      "偏低，不太需要動用", "極低，完全不打算提領")},
    {"id": "Q9", "title": "若整體投資 1 年內下跌 20 %，對您的財務影響程度？", "type": "single",
     "options": _opts("極為嚴重，需借款或嚴重衝擊生活", "壓力顯著，需大幅削減日常支出", "有一定負擔，但仍可維持基本生活",
                      "影響輕微，在可承受範圍內", "毫無影響，其他資產與所得足以支應")},
    {"id": "Q10", "title": "您的實際投資經驗？", "type": "single",
     "options": _opts("無任何經驗", "未滿 1 年", "1 - 2 年", "3 - 4 年", "5 年以上")},
    {"id": "Q11", "title": "曾實際投資過的商品？（可複選）", "type": "multiple",
     "exclusiveOption": "K", "otherOption": "J",
     "options": _opts("定期存款（銀行定存、大額存單）", "股票（台股、美股上市櫃股票）", "指數股票型基金（ETF）",
                      "共同基金（理專或基金平台申購）", "債券（公債、公司債、債券型基金）", "外幣（外幣存款、換匯操作）",
                      "貴金屬或原物料（黃金存摺、白銀、原油）", "衍生性商品（期貨、選擇權、差價合約）",
                      "結構型商品（雙元貨幣、連動債）", "其他商品", "從未投資過任何金融商品")},
    {"id": "Q12", "title": "關於「分散投資」的概念，下列何者較為正確？", "type": "single",
     "options": _opts("只要同時持有 20 檔以上不同公司的股票，就能完全消除整體投資組合的虧損風險",
                      "分散配置於股票、債券、房地產與黃金等資產，即可保證年化報酬率維持正值",
                      "買入包含 500 檔成分股的指數型 ETF，遇到全面性股災時仍可能產生大幅虧損",
                      "只要精選 3 至 5 檔基本面優良的產業龍頭股，其風險分散效果即等同全市場配置", "不確定")},
    {"id": "Q13", "title": "1 年內能承受的最大投資跌幅？", "type": "single",
     "options": _opts("未滿 5 %", "5 - 9 %", "10 - 19 %", "20 - 29 %", "30 % 以上")},
    {"id": "Q14", "title": "若投資組合在 1 個月內急跌 15 %，您第一時間最可能的反應？", "type": "single",
     "options": _opts("立即賣出全部或大部分部位，避免虧損擴大", "賣出部分部位，降低整體風險", "暫不操作，持續觀察市場",
                      "檢視投資理由與風險，若無重大變化則維持持有", "檢視投資理由與資產配置，依既定策略評估是否調整",
                      "無法判斷")},
]
_LABELS = {q["id"]: {o["value"]: o["label"] for o in q["options"]} for q in QUESTIONS}  # 題號→代號→選項原文
OTHER_MAX_LEN = 100  # Q11「其他商品」自由文字上限（字）
_OTHER_PATTERN = re.compile(r"^[A-Za-z0-9一-鿿　-〿＀-￯]+$")  # 僅限中英數與全形標點（擋掉半形 < > { } 等可偽造標籤或指令的符號）
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f-\x9f  ]")  # 換行與控制字元
_PARENTHESES = re.compile(r"（[^）]*）")  # Q11 選項的全形括號補充說明，送給 AI 前拿掉

# ── 等級對照（只在後端運算時使用；存進 facts 的直接對應題目一律是選項原文）──
LIQUIDITY_ORDER = ["低", "中等", "高", "極高"]  # 流動性需求由低到高
LIQUIDITY_BASE = dict(zip("ABCDE", ["極高", "高", "中等", "低", "低"]))  # Q8 決定的基礎等級
RESERVE_FLOOR = dict(zip("ABCDE", ["高", "中等", "低", "低", "低"]))  # Q4 設定的最低等級（「低」代表不另外限制）
CAP_ORDER = ["低", "中等", "高"]  # 財務能力三級（由低到高）
CAP_Q3 = dict(zip("ABCDE", ["低", "中等", "中等", "高", "高"]))  # Q3 現金流分級
CAP_Q4 = dict(zip("ABCDE", ["低", "中等", "中等", "高", "高"]))  # Q4 預備金分級
CAP_Q9 = dict(zip("ABCDE", ["低", "低", "中等", "高", "高"]))  # Q9 20 % 損失影響分級
RESILIENCE_ORDER = ["低", "中低", "中高", "高"]  # 短期韌性四級（由低到高）
RESILIENCE_MAP = {"A": "低", "B": "中低", "C": "中高", "D": "高", "E": "高"}  # Q3、Q4、Q8 共用的分級
KNOWLEDGE_TEXT = {"C": "已正確理解", "E": "表示不確定"}  # Q12：C 為正確答案、E 為不確定，其餘皆為「未正確回答」
WILLINGNESS_3 = {"A": "低", "B": "低", "C": "中", "D": "高", "E": "高"}  # Q13 簡化三級（僅供意願－能力比較）
# 意願－能力關係表：GAP_MATRIX[財務能力][風險意願]
GAP_MATRIX = {
    "低": {"低": "大致一致", "中": "意願高於能力", "高": "意願明顯高於能力"},
    "中等": {"低": "意願低於能力", "中": "大致一致", "高": "意願高於能力"},
    "高": {"低": "意願明顯低於能力", "中": "意願低於能力", "高": "大致一致"},
}
# 期限－流動性一致性表：HORIZON_MATRIX[Q7][Q8]
HORIZON_MATRIX = {
    "A": dict(zip("ABCDE", ["一致", "一致", "需注意", "衝突", "衝突"])),
    "B": dict(zip("ABCDE", ["需注意", "需注意", "一致", "一致", "一致"])),
    "C": dict(zip("ABCDE", ["需注意", "需注意", "一致", "一致", "一致"])),
    "D": dict(zip("ABCDE", ["衝突", "衝突", "需注意", "一致", "一致"])),
    "E": dict(zip("ABCDE", ["衝突", "衝突", "需注意", "一致", "一致"])),
}
# 知識－商品經驗一致性表：KNOWLEDGE_MATRIX[Q12 是否答對][商品經驗分類]
KNOWLEDGE_MATRIX = {
    True: {"無經驗": "基礎分散概念已理解", "一般商品經驗": "基礎分散概念已理解", "複雜商品經驗": "經驗與基本概念無明顯衝突"},
    False: {"無經驗": "新手，採基礎解釋", "一般商品經驗": "需補充分散投資概念", "複雜商品經驗": "知識與商品經驗存在落差"},
}
# 承受意願－下跌反應一致性表：BEHAVIOR_MATRIX[Q13 簡化三級][Q14]。
# Q14 情境是「1 個月急跌 15 %」：意願高（能承受 20 % 以上）卻立即賣出全部或大部分，代表實際反應可能比自述的承受度更早退出
BEHAVIOR_MATRIX = {
    "低": dict(zip("ABCDEF", ["大致一致", "大致一致", "大致一致", "大致一致", "大致一致", "無法判斷"])),
    "中": dict(zip("ABCDEF", ["需注意", "大致一致", "大致一致", "大致一致", "大致一致", "無法判斷"])),
    "高": dict(zip("ABCDEF", ["明顯不一致", "需注意", "大致一致", "大致一致", "大致一致", "無法判斷"])),
}
COMPLEX_PRODUCTS = set("HI")  # Q11：衍生性商品、結構型商品
NO_CONSTRAINT_LABEL = "無明顯限制"  # 主要財務限制一項都沒觸發時的標籤


def _clean_text(text: str) -> str:
    # 【清洗自由文字】移除換行與控制字元並去頭尾空白。參數：text=使用者輸入的文字
    return _CONTROL_CHARS.sub("", text).strip()


def validate_answers(raw: object) -> dict:
    # 【驗證作答】檢查 14 題是否齊全且選項合法，回傳整理後的作答；不合規則丟 ValueError（訊息為中文）。
    # 參數：raw=前端送來的 answers 物件（鍵為 q1～q14、q11Other）
    if not isinstance(raw, dict):
        raise ValueError("作答格式不正確")
    # 1. 不允許多餘的鍵
    allowed = {f"q{i}" for i in range(1, 15)} | {"q11Other"}
    extra = set(raw) - allowed
    if extra:
        raise ValueError(f"含有不允許的欄位：{sorted(extra)[0]}")
    answers: dict = {}
    for q in QUESTIONS:
        key = q["id"].lower()
        valid = _LABELS[q["id"]]
        value = raw.get(key)
        # 2. 每題必填
        if value is None or value == [] or value == "":
            raise ValueError(f"{q['id']} 尚未作答")
        if q["type"] == "single":
            # 3. 單選題：必須是字串且在選項內
            if not isinstance(value, str) or value not in valid:
                raise ValueError(f"{q['id']} 的選項不正確")
            answers[key] = value
        else:
            # 4. Q11 複選：清單、不重複、皆在選項內
            if not isinstance(value, list) or not all(isinstance(v, str) and v in valid for v in value) \
                    or len(set(value)) != len(value):
                raise ValueError("Q11 的選項不正確")
            # 5. 選「從未投資過任何金融商品」（K）時不得再選其他
            if "K" in value and len(value) > 1:
                raise ValueError("Q11 選「從未投資過任何金融商品」時不能再勾選其他項目")
            answers[key] = sorted(value)
    # 6. 選「其他商品」（J）需填說明，未選則不得帶說明
    other = raw.get("q11Other")
    if "J" in answers["q11"]:
        if not isinstance(other, str) or not _clean_text(other):
            raise ValueError("Q11 選「其他商品」時必須填寫說明")
        other = _clean_text(other)
        if len(other) > OTHER_MAX_LEN or not _OTHER_PATTERN.match(other):
            raise ValueError(f"Q11 的其他說明最長 {OTHER_MAX_LEN} 字，且僅限中英文、數字與全形標點")
        answers["q11_other"] = other
    else:
        if other not in (None, ""):
            raise ValueError("Q11 未選「其他商品」時不得填寫說明")
        answers["q11_other"] = None
    return answers


def find_conflicts(a: dict) -> list[dict]:
    # 【作答衝突檢查】找出互相矛盾的回答，回傳 [{message, question_ids}]，沒有衝突回空清單（可能同時有多項）。
    # 有衝突的作答不存進資料庫，由前端標示題號請使用者修正。參數：a=已驗證的作答
    # 說明文字直接寫出題號，讓使用者知道要回頭看哪兩題
    rules = [
        # 1. 沒有投資經驗，卻勾了投資過的商品（含「其他商品」）
        (a["q10"] == "A" and a["q11"] != ["K"], ["Q10", "Q11"],
         "第 10 題（投資經驗）選了「無任何經驗」，但第 11 題（曾投資過的商品）有勾選金融商品。"),
        # 2. 填了投資經驗年數，卻只勾「從未投資過任何金融商品」
        (a["q10"] != "A" and a["q11"] == ["K"], ["Q10", "Q11"],
         "第 10 題（投資經驗）填了經驗年數，但第 11 題（曾投資過的商品）勾選「從未投資過任何金融商品」。"),
        # 3. 經常透支，卻表示其他資產與所得足以支應 20 % 的損失
        (a["q3"] == "A" and a["q9"] == "E", ["Q3", "Q9"],
         "第 3 題（資金結餘）選了「經常透支或還款困難」，但第 9 題（下跌 20 % 的影響）選了「毫無影響，其他資產與所得足以支應」。"),
    ]
    return [{"message": msg, "question_ids": qids} for hit, qids, msg in rules if hit]


def product_class(q11: list[str]) -> str:
    # 【商品經驗分類】只供知識－經驗交叉分析使用，不送給 AI：只勾 K 為無經驗；有 H 或 I 為複雜商品經驗；
    # 其餘（包含只勾「其他商品」）為一般商品經驗。參數：q11=Q11 勾選代號清單
    if q11 == ["K"]:
        return "無經驗"
    if set(q11) & COMPLEX_PRODUCTS:
        return "複雜商品經驗"
    return "一般商品經驗"


def product_names(q11: list[str]) -> str:
    # 【商品清單文字】把勾選的選項拿掉括號補充後以「、」連接，例如「股票、指數股票型基金、其他商品」。參數：q11=Q11 勾選代號清單
    return "、".join(_PARENTHESES.sub("", _LABELS["Q11"][v]) for v in q11)


def liquidity_need(q4: str, q8: str) -> tuple[str, bool]:
    # 【資金流動性需求】Q8 決定基礎等級、Q4 設定最低等級，取較高者；回傳 (等級, 是否被預備金拉高)。
    # 參數：q4=預備金答案、q8=提款可能性答案
    base, floor = LIQUIDITY_BASE[q8], RESERVE_FLOOR[q4]
    raised = LIQUIDITY_ORDER.index(floor) > LIQUIDITY_ORDER.index(base)
    return (floor if raised else base), raised


def _lowest(order: list[str], levels: dict[str, str]) -> tuple[str, list[str]]:
    # 【取最低等級】非補償式：只要一項偏低，整體就偏低。回傳 (整體等級, 限制因素)；
    # 限制因素是落在最低等級的事實代號，整體已是最高等級時為空陣列。參數：order=由低到高的等級、levels=事實代號→等級
    result = min(levels.values(), key=order.index)
    limiting = [] if result == order[-1] else [fid for fid, lv in levels.items() if lv == result]
    return result, limiting


def financial_capacity(q3: str, q4: str, q9: str) -> tuple[str, list[str]]:
    # 【財務風險承受能力】Q3、Q4、Q9 各自分三級後取最低。參數：q3=現金流、q4=預備金、q9=20 % 損失影響
    return _lowest(CAP_ORDER, {"cash_flow": CAP_Q3[q3], "emergency_reserve": CAP_Q4[q4], "loss_impact_20pct": CAP_Q9[q9]})


def short_term_resilience(q3: str, q4: str, q8: str) -> tuple[str, list[str]]:
    # 【短期財務韌性】Q3、Q4、Q8 各自分四級（A 低、B 中低、C 中高、D/E 高）後取最低。參數：q3、q4、q8=各題答案
    return _lowest(RESILIENCE_ORDER, {"cash_flow": RESILIENCE_MAP[q3], "emergency_reserve": RESILIENCE_MAP[q4],
                                      "withdrawal_need": RESILIENCE_MAP[q8]})


def willingness_capacity_gap(q13: str, capacity: str) -> str:
    # 【意願－能力關係】Q13 簡化為低／中／高後對照財務能力。參數：q13=可承受跌幅答案、capacity=財務承受能力等級
    return GAP_MATRIX[capacity][WILLINGNESS_3[q13]]


def horizon_consistency(q7: str, q8: str) -> str:
    # 【期限－流動性一致性】回傳「一致／需注意／衝突」。參數：q7=投資期限答案、q8=提款機率答案
    return HORIZON_MATRIX[q7][q8]


def behavior_consistency(q13: str, q14: str) -> str:
    # 【承受意願－下跌反應一致性】Q13 簡化為低／中／高後對照 Q14 的反應，回傳「大致一致／需注意／明顯不一致／無法判斷」。
    # 參數：q13=可承受跌幅答案、q14=急跌 15 % 時的反應答案
    return BEHAVIOR_MATRIX[WILLINGNESS_3[q13]][q14]


def knowledge_consistency(q12: str, q11: list[str]) -> str:
    # 【知識－商品經驗一致性】Q12 = C 為答對；Q10 不參與。參數：q12=知識題答案、q11=Q11 勾選清單
    return KNOWLEDGE_MATRIX[q12 == "C"][product_class(q11)]


def financial_constraints(a: dict, gap: str, horizon: str) -> list[tuple[str, list[str]]]:
    # 【主要財務限制標籤】逐一檢查 11 個條件，回傳 (標籤, 相關事實代號) 清單，可同時多項。
    # 參數：a=作答、gap=意願－能力關係結果、horizon=期限－流動性一致性結果
    rules = [
        (a["q3"] == "A", "現金流／償債能力限制", ["cash_flow"]),
        (a["q4"] == "A", "緊急預備金嚴重不足", ["emergency_reserve"]),
        (a["q4"] == "B", "緊急預備金偏低", ["emergency_reserve"]),
        (a["q5"] == "A", "大部分金融資產暴露於投資市場", ["investment_exposure"]),
        (a["q7"] == "A", "投資期限過短", ["investment_horizon"]),
        (a["q8"] == "A", "一年內高度提款需求", ["withdrawal_need"]),
        (a["q8"] == "B", "近期存在明顯資金需求", ["withdrawal_need"]),
        (a["q9"] == "A", "重大損失可能危及基本生活", ["loss_impact_20pct"]),
        (a["q9"] == "B", "重大損失可能造成明顯財務壓力", ["loss_impact_20pct"]),
        (gap in ("意願高於能力", "意願明顯高於能力"), "主觀風險意願高於客觀承受能力",
         ["loss_tolerance", "financial_capacity"]),
        (horizon == "衝突", "投資期限與短期資金需求存在落差", ["investment_horizon", "withdrawal_need"]),
    ]
    return [(label, ids) for hit, label, ids in rules if hit]


def _fact(fid: str, label: str, value: str, qids: list[str], basis: list[str] | None = None, **extra) -> dict:
    # 【組事實】依 Prompt 格式組出一筆 fact。
    # 參數：fid=事實代號、label=顯示名稱、value=值（直接對應題目時為選項原文）、qids=來源題號、basis=依據事實、extra=該事實特有欄位
    return {"id": fid, "label": label, "value_text": value, "source_question_ids": qids,
            "basis_fact_ids": basis or [], **extra}


def compute_profile(a: dict) -> dict:
    # 【計算風險屬性】把已驗證、無衝突的作答轉成核心指標、事實與交叉分析，回傳 {coreIndicators, facts, findings}。
    # 全為固定規則，無 AI。參數：a=已驗證的作答
    lbl = lambda q: _LABELS[q][a[q.lower()]]  # 取某題所選選項的原文
    liquidity, raised = liquidity_need(a["q4"], a["q8"])
    capacity, capacity_limits = financial_capacity(a["q3"], a["q4"], a["q9"])
    resilience, resilience_limits = short_term_resilience(a["q3"], a["q4"], a["q8"])
    core = {
        "lossTolerance": lbl("Q13"),
        "investmentHorizon": lbl("Q7"),
        "liquidityNeed": liquidity,
        "financialCapacity": capacity,
    }
    product = {"other_text": a["q11_other"]} if a["q11_other"] else {}  # 有填「其他商品」才帶這個欄位
    # 依題號順序排列（Q1→Q14），方便對照問卷查看；由多題運算而來的三項放最後。
    # 程式與 AI 都以 id 查找 fact，順序不影響任何計算
    facts = [
        _fact("age", "年齡", lbl("Q1"), ["Q1"]),
        _fact("income", "稅前年所得", lbl("Q2"), ["Q2"]),
        _fact("cash_flow", "現金流", lbl("Q3"), ["Q3"]),
        _fact("emergency_reserve", "緊急預備金覆蓋水位", lbl("Q4"), ["Q4"]),
        _fact("investment_exposure", "投資資產曝險比例", lbl("Q5"), ["Q5"]),
        _fact("investment_goal", "投資目的", lbl("Q6"), ["Q6"]),
        _fact("investment_horizon", "投資期限", core["investmentHorizon"], ["Q7"]),
        _fact("withdrawal_need", "一年內提款可能性", lbl("Q8"), ["Q8"]),
        _fact("loss_impact_20pct", "20 % 投資損失情境財務承受度", lbl("Q9"), ["Q9"]),
        _fact("investment_experience", "投資經驗年數", lbl("Q10"), ["Q10"]),
        _fact("product_experience", "商品經驗", product_names(a["q11"]), ["Q11"], **product),
        _fact("diversification_knowledge", "分散投資知識", KNOWLEDGE_TEXT.get(a["q12"], "未正確回答"), ["Q12"]),
        _fact("loss_tolerance", "可接受損失區間", core["lossTolerance"], ["Q13"]),
        _fact("market_decline_behavior", "市場下跌行為反應", lbl("Q14"), ["Q14"]),
        _fact("liquidity_need", "資金流動性需求", liquidity, ["Q8", "Q4"], ["withdrawal_need", "emergency_reserve"],
              raised_by_reserve=raised),
        _fact("financial_capacity", "財務風險承受能力", capacity, ["Q3", "Q4", "Q9"],
              ["cash_flow", "emergency_reserve", "loss_impact_20pct"], limiting_fact_ids=capacity_limits),
        _fact("short_term_resilience", "短期財務韌性", resilience, ["Q3", "Q4", "Q8"],
              ["cash_flow", "emergency_reserve", "withdrawal_need"], limiting_fact_ids=resilience_limits),
    ]

    gap = willingness_capacity_gap(a["q13"], capacity)
    horizon = horizon_consistency(a["q7"], a["q8"])
    constraints = financial_constraints(a, gap, horizon)
    # 五項交叉分析全部送給 AI 說明，不做篩選，所以不需要優先順序
    findings = [
        {"id": "primary_financial_constraints",
         "labels": [label for label, _ in constraints] or [NO_CONSTRAINT_LABEL],
         "fact_ids": list(dict.fromkeys(fid for _, ids in constraints for fid in ids))},  # 去重並保留順序
        {"id": "willingness_capacity_gap", "result": gap,
         "fact_ids": ["loss_tolerance", "financial_capacity"]},
        {"id": "horizon_liquidity_consistency", "result": horizon,
         "fact_ids": ["investment_horizon", "withdrawal_need"]},
        {"id": "knowledge_experience_consistency", "result": knowledge_consistency(a["q12"], a["q11"]),
         "fact_ids": ["diversification_knowledge", "product_experience"]},
        {"id": "willingness_behavior_consistency", "result": behavior_consistency(a["q13"], a["q14"]),
         "fact_ids": ["loss_tolerance", "market_decline_behavior"]},
    ]
    return {"coreIndicators": core, "facts": facts, "findings": findings}
