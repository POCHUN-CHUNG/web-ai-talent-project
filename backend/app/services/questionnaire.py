import re

# 【問卷題庫與轉換規則】14 題題庫、作答驗證、四項核心指標、事實、交叉分析與資料一致性檢查。
# 全部是固定規則（查表與取最低），不含任何評分加總，也不呼叫 AI；規則依 spec/04-behavior.md §4.2。

QUESTIONNAIRE_VERSION = "1.0.0"  # 問卷版本
RULES_VERSION = "1.0.0"  # 轉換規則版本（給 AI 的 payload 使用）


def _opts(*labels: str) -> list[dict]:
    # 【組選項】依序把文字配上 A、B、C… 的代號。參數：labels=各選項文字
    return [{"value": chr(65 + i), "label": t} for i, t in enumerate(labels)]


# 題庫：id、題目、補充說明（note）、型態（single 單選／multiple 複選）、選項。文字以《風險評估問卷.md》為準
QUESTIONS: list[dict] = [
    {"id": "Q1", "title": "您的年齡區間為何？", "note": None, "type": "single",
     "options": _opts("18 歲以上，未滿 30 歲", "30 歲以上，未滿 45 歲", "45 歲以上，未滿 55 歲",
                      "55 歲以上，未滿 65 歲", "65 歲以上")},
    {"id": "Q2", "title": "您最近一年度的個人稅前年所得約為多少？", "note": "請以新臺幣計算", "type": "single",
     "options": _opts("未滿 50 萬元", "50 萬元以上，未滿 100 萬元", "100 萬元以上，未滿 200 萬元",
                      "200 萬元以上，未滿 300 萬元", "300 萬元以上")},
    {"id": "Q3", "title": "扣除每月必要生活支出及債務還款後，您的剩餘資金狀況為何？", "note": None, "type": "single",
     "options": _opts("經常入不敷出，或目前已有還款困難", "收支大致相抵，幾乎沒有剩餘資金",
                      "略有結餘，可用於少量儲蓄或投資", "有穩定結餘，可定期儲蓄或投資",
                      "結餘充足，即使投資發生一定損失，也不致影響基本生活及正常償債能力")},
    {"id": "Q4", "title": "目前保留的緊急預備金，約可支應多久的必要生活支出？",
     "note": "緊急預備金是指可於短期內動用，且未投入股票、ETF、基金或其他可能產生價格波動之投資的現金或存款。",
     "type": "single",
     "options": _opts("尚未準備，或不足 1 個月", "1 個月以上，未滿 3 個月", "3 個月以上，未滿 6 個月",
                      "6 個月以上，未滿 12 個月", "12 個月以上")},
    {"id": "Q5", "title": "目前全部投資金額約占您可動用金融資產的多少比例？",
     "note": "可動用金融資產包括現金、存款、股票、基金、ETF 及債券等，不包括自用住宅、必要生活費及緊急預備金。",
     "type": "single",
     "options": _opts("60% 以上", "40% 以上，未滿 60%", "20% 以上，未滿 40%", "10% 以上，未滿 20%", "未滿 10%")},
    {"id": "Q6", "title": "您目前最主要的投資目的為何？", "note": None, "type": "single",
     "options": _opts("維持本金穩定，降低資產波動", "取得定期或相對穩定的收益",
                      "為購屋、教育、醫療或其他特定支出累積資金", "為退休或其他中長期目標累積資產",
                      "進行長期資產增值與財富累積")},
    {"id": "Q7", "title": "這筆投資資金預計多久之內不需要使用？", "note": None, "type": "single",
     "options": _opts("1 年以內", "1 年以上，未滿 3 年", "3 年以上，未滿 5 年", "5 年以上，未滿 10 年", "10 年以上")},
    {"id": "Q8", "title": "未來一年內，您需要從這筆投資中取回資金的可能性為何？", "note": None, "type": "single",
     "options": _opts("很可能需要，而且可能取回大部分或全部資金", "可能需要取回部分資金",
                      "有可能需要，但可以優先使用其他資金", "不太可能需要取回", "目前沒有預期在一年內取回資金")},
    {"id": "Q9", "title": "如果您的整體投資組合在一年內下跌 20%，對基本生活或重要財務規劃會造成多大影響？",
     "note": "本題所列 20% 僅為評估投資損失承受能力的假設情境，不代表任何金融商品的最大可能損失。",
     "type": "single",
     "options": _opts("會嚴重影響基本生活，或可能需要借款因應", "會造成明顯財務壓力，需要大幅調整支出或財務規劃",
                      "會造成一定影響，但仍可維持基本生活", "影響不大，仍在可以承受的範圍內",
                      "幾乎沒有影響，其他所得或資產足以支應需要")},
    {"id": "Q10", "title": "您的實際投資經驗約有多久？", "note": None, "type": "single",
     "options": _opts("沒有任何投資經驗", "未滿 1 年", "1 年以上，未滿 3 年", "3 年以上，未滿 5 年", "5 年以上")},
    {"id": "Q11", "title": "您曾實際投資或交易過哪些金融商品？（可複選）", "note": None, "type": "multiple",
     "exclusiveOption": "K", "otherOption": "J",
     "options": _opts("銀行存款或定期存款", "股票", "指數股票型基金（ETF）", "共同基金", "債券", "外幣",
                      "黃金或原物料", "期貨或選擇權等衍生性金融商品", "結構型商品", "其他", "尚未投資過任何金融商品")},
    {"id": "Q12", "title": "下列哪一項最能正確描述「分散投資」？", "note": None, "type": "single",
     "options": _opts("只要購買多檔不同公司的股票，就能消除所有投資風險",
                      "將資金集中在近期表現最好的少數投資標的，可以有效降低風險",
                      "將資金分散於不同資產類別或相關性較低的投資標的，可以降低單一標的對整體投資組合的影響，但不能完全消除市場風險",
                      "只要進行分散投資，投資組合就不會發生損失", "不確定")},
    {"id": "Q13", "title": "在不影響基本生活及重要財務目標的前提下，您最多願意承受整體投資組合在一年內下跌多少？",
     "note": None, "type": "single",
     "options": _opts("未滿 5%", "5% 以上，未滿 10%", "10% 以上，未滿 20%", "20% 以上，未滿 30%", "30% 以上")},
    {"id": "Q14", "title": "如果您的整體投資組合在一個月內下跌 15%，您最可能採取何種行動？",
     "note": "請假設原投資目的、預定投資期間、商品條件及個人財務狀況均未發生重大改變。本題沒有固定的正確答案。實際行動仍應依投資目的、投資期間、商品條件、資產配置及個人財務狀況綜合判斷。",
     "type": "single",
     "options": _opts("立即賣出全部或大部分投資，以避免損失繼續擴大", "賣出部分投資，以降低整體投資風險",
                      "暫時不進行操作，先觀察市場情況後再決定", "重新檢查原投資理由與相關風險，若未發生重大改變，則依原定計畫持有",
                      "重新檢查原投資理由、相關風險及整體資產配置後，再依既定策略決定是否調整部位", "尚無法判斷")},
]
_LABELS = {q["id"]: {o["value"]: o["label"] for o in q["options"]} for q in QUESTIONS}  # 題號→代號→選項文字
OTHER_MAX_LEN = 100  # Q11 選項 J 的自由文字上限（字）
_OTHER_PATTERN = re.compile(r"^[A-Za-z0-9一-鿿　-〿＀-￯]+$")  # 僅限中英數與全形標點
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f-\x9f\u2028\u2029]")  # 換行與控制字元

# ── 固定轉換表 ──
LOSS_TOLERANCE = {"A": "未滿5%", "B": "5%～10%", "C": "10%～20%", "D": "20%～30%", "E": "30%以上"}  # Q13，不取中點
INVESTMENT_HORIZON = {"A": "1年以內", "B": "1～3年", "C": "3～5年", "D": "5～10年", "E": "10年以上"}  # Q7
LIQUIDITY_ORDER = ["低", "中等", "高", "極高"]  # 流動性需求由低到高
# 流動性需求矩陣：LIQUIDITY_MATRIX[Q4][Q8]（已含 Q4 對 Q8 的最低限制）
LIQUIDITY_MATRIX = {
    "A": dict(zip("ABCDE", ["極高", "高", "高", "高", "高"])),
    "B": dict(zip("ABCDE", ["極高", "高", "中等", "中等", "中等"])),
    "C": dict(zip("ABCDE", ["極高", "高", "中等", "低", "低"])),
    "D": dict(zip("ABCDE", ["極高", "高", "中等", "低", "低"])),
    "E": dict(zip("ABCDE", ["極高", "高", "中等", "低", "低"])),
}
CAP_ORDER = ["低", "中等", "高"]  # 財務能力三級（由低到高）
CAP_Q3 = dict(zip("ABCDE", ["低", "中等", "中等", "高", "高"]))  # Q3 現金流分級
CAP_Q4 = dict(zip("ABCDE", ["低", "中等", "中等", "高", "高"]))  # Q4 預備金分級
CAP_Q9 = dict(zip("ABCDE", ["低", "低", "中等", "高", "高"]))  # Q9 20% 損失影響分級（三級）
LOSS_IMPACT_5 = dict(zip("ABCDE", ["極低", "低", "中等", "高", "很高"]))  # Q9 五級（僅供輔助說明）
RESILIENCE_ORDER = ["低", "中低", "中高", "高"]  # 短期韌性四級（由低到高）
RESILIENCE_MAP = {"A": "低", "B": "中低", "C": "中高", "D": "高", "E": "高"}  # Q3、Q4、Q8 共用的分級
DECLINE_BEHAVIOR = dict(zip("ABCDEF", ["大幅退出", "部分降低曝險", "暫時觀察", "檢視理由後持有", "依策略重新配置", "無法判斷"]))
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
# 知識－商品經驗一致性表：KNOWLEDGE_MATRIX[Q12 是否答對][商品經驗]
KNOWLEDGE_MATRIX = {
    True: {"無經驗": "基礎分散概念已理解", "一般商品經驗": "基礎分散概念已理解", "複雜商品經驗": "經驗與基本概念無明顯衝突"},
    False: {"無經驗": "新手，採基礎解釋", "一般商品經驗": "需補充分散投資概念", "複雜商品經驗": "知識與商品經驗存在落差"},
}
GENERAL_PRODUCTS = set("ABCDEFG")  # Q11：一般商品
COMPLEX_PRODUCTS = set("HI")  # Q11：複雜商品（J 其他不參與分類、K 為尚未投資）


def _lowest(order: list[str], values: list[str]) -> str:
    # 【取最低等級】非補償式：只要有一項偏低，結果就偏低。參數：order=由低到高的等級清單、values=各項等級
    return min(values, key=order.index)


def clean_other_text(text: str) -> str:
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
            # 5. 選「尚未投資過」（K）時不得再選其他
            if "K" in value and len(value) > 1:
                raise ValueError("Q11 選「尚未投資過」時不能再勾選其他項目")
            answers[key] = sorted(value)
    # 6. 選「其他」（J）需填說明，未選則不得帶說明
    other = raw.get("q11Other")
    if "J" in answers["q11"]:
        if not isinstance(other, str) or not clean_other_text(other):
            raise ValueError("Q11 選「其他」時必須填寫說明")
        other = clean_other_text(other)
        if len(other) > OTHER_MAX_LEN or not _OTHER_PATTERN.match(other):
            raise ValueError(f"Q11 的其他說明最長 {OTHER_MAX_LEN} 字，且僅限中英文、數字與全形標點")
        answers["q11_other"] = other
    else:
        if other not in (None, ""):
            raise ValueError("Q11 未選「其他」時不得填寫說明")
        answers["q11_other"] = None
    return answers


def product_experience(q11: list[str]) -> str:
    # 【商品經驗分類】依 Q11 判斷：無經驗／一般商品經驗／複雜商品經驗（同時有一般與複雜歸為複雜）。參數：q11=Q11 勾選代號清單
    picked = set(q11)
    if picked & COMPLEX_PRODUCTS:
        return "複雜商品經驗"
    if picked & GENERAL_PRODUCTS:
        return "一般商品經驗"
    return "無經驗"


def liquidity_need(q4: str, q8: str) -> str:
    # 【資金流動性需求】以 Q8 為主、Q4 為下限的查表結果。參數：q4=預備金答案、q8=提款可能性答案
    return LIQUIDITY_MATRIX[q4][q8]


def financial_capacity(q3: str, q4: str, q9: str) -> str:
    # 【財務風險承受能力】三題各自分級後取最低（非補償式）。參數：q3=現金流、q4=預備金、q9=20% 損失影響
    return _lowest(CAP_ORDER, [CAP_Q3[q3], CAP_Q4[q4], CAP_Q9[q9]])


def short_term_resilience(q3: str, q4: str, q8: str) -> str:
    # 【短期財務韌性】Q3、Q4、Q8 各自分級（A 低、B 中低、C 中高、D/E 高）後取最低。參數：q3、q4、q8=各題答案
    return _lowest(RESILIENCE_ORDER, [RESILIENCE_MAP[q3], RESILIENCE_MAP[q4], RESILIENCE_MAP[q8]])


def willingness_capacity_gap(q13: str, capacity: str) -> str:
    # 【意願－能力關係】Q13 簡化為低／中／高後對照財務能力。參數：q13=可接受損失答案、capacity=財務承受能力等級
    return GAP_MATRIX[capacity][WILLINGNESS_3[q13]]


def horizon_consistency(q7: str, q8: str) -> str:
    # 【期限－流動性一致性】回傳「一致／需注意／衝突」。參數：q7=投資期限答案、q8=提款可能性答案
    return HORIZON_MATRIX[q7][q8]


def knowledge_consistency(q12: str, q11: list[str]) -> str:
    # 【知識－商品經驗一致性】Q12 = C 為答對；Q10 不參與。參數：q12=知識題答案、q11=Q11 勾選清單
    return KNOWLEDGE_MATRIX[q12 == "C"][product_experience(q11)]


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


def check_consistency(a: dict) -> list[dict]:
    # 【資料一致性檢查】Q10 與 Q11 互相矛盾時回傳 issue 清單（會使 readiness 為 limited）。參數：a=作答
    q10, q11 = a["q10"], a["q11"]
    invested = bool(set(q11) & (GENERAL_PRODUCTS | COMPLEX_PRODUCTS))  # Q11 勾了 A–I 任一項
    only_none = q11 == ["K"]
    if q10 == "A" and invested:
        desc = "投資經驗（Q10）選「無投資經驗」，但商品經驗（Q11）勾選了投資商品，請確認兩題。"
    elif q10 in ("D", "E") and only_none:
        desc = "投資經驗（Q10）為 3 年以上，但商品經驗（Q11）只勾選「尚未投資過」，請確認兩題。"
    else:
        return []
    return [{"id": "experience_conflict", "kind": "experience_conflict", "description": desc,
             "affectedFactIds": ["investment_experience", "product_experience"]}]


def _fact(fid: str, label: str, value: str, qids: list[str], basis: list[str] | None = None,
          availability: str = "available") -> dict:
    # 【組事實】依契約格式組出一筆 Fact。參數：fid=事實代號、label=顯示名稱、value=原始文字、qids=來源題號、basis=依據事實、availability=可用狀態
    return {"id": fid, "label": label, "valueText": value, "availability": availability,
            "sourceQuestionIds": qids, "basisFactIds": basis or []}


def compute_profile(a: dict) -> dict:
    # 【計算風險屬性】把已驗證的作答轉成核心指標、事實、交叉分析與資料問題，回傳
    # {readiness, coreIndicators, facts, findings, issues}。全為固定規則，無 AI。參數：a=已驗證的作答
    lbl = lambda q: _LABELS[q][a[q.lower()]]  # 取某題所選選項的原文
    issues = check_consistency(a)
    readiness = "limited" if issues else "ready"
    conflicted = {fid for i in issues for fid in i["affectedFactIds"]}
    exp_avail = lambda fid: "conflicted" if fid in conflicted else "available"

    core = {
        "lossTolerance": LOSS_TOLERANCE[a["q13"]],
        "investmentHorizon": INVESTMENT_HORIZON[a["q7"]],
        "liquidityNeed": liquidity_need(a["q4"], a["q8"]),
        "financialCapacity": financial_capacity(a["q3"], a["q4"], a["q9"]),
    }
    prod = product_experience(a["q11"])
    facts = [
        _fact("loss_tolerance", "可接受損失區間", core["lossTolerance"], ["Q13"]),
        _fact("investment_horizon", "投資期限", core["investmentHorizon"], ["Q7"]),
        _fact("liquidity_need", "資金流動性需求", core["liquidityNeed"], ["Q8", "Q4"],
              ["withdrawal_need", "emergency_reserve"]),
        _fact("financial_capacity", "財務風險承受能力", core["financialCapacity"], ["Q3", "Q4", "Q9"],
              ["cash_flow", "emergency_reserve", "loss_impact_20pct"]),
        _fact("cash_flow", "現金流", lbl("Q3"), ["Q3"]),
        _fact("emergency_reserve", "緊急預備金", lbl("Q4"), ["Q4"]),
        _fact("withdrawal_need", "一年內提款可能性", lbl("Q8"), ["Q8"]),
        _fact("investment_exposure", "投資占可動用金融資產比例", lbl("Q5"), ["Q5"]),
        _fact("loss_impact_20pct", "20%損失的財務影響", LOSS_IMPACT_5[a["q9"]], ["Q9"]),
        _fact("market_decline_behavior", "市場下跌時的自述反應", DECLINE_BEHAVIOR[a["q14"]], ["Q14"]),
        _fact("short_term_resilience", "短期財務韌性", short_term_resilience(a["q3"], a["q4"], a["q8"]),
              ["Q3", "Q4", "Q8"], ["cash_flow", "emergency_reserve", "withdrawal_need"]),
        _fact("diversification_knowledge", "分散投資概念", "正確" if a["q12"] == "C" else "錯誤或不確定", ["Q12"]),
        _fact("age", "年齡區間", lbl("Q1"), ["Q1"]),
        _fact("income", "年收入區間", lbl("Q2"), ["Q2"]),
        _fact("investment_goal", "投資目的", lbl("Q6"), ["Q6"]),
        _fact("investment_experience", "投資經驗", lbl("Q10"), ["Q10"], availability=exp_avail("investment_experience")),
        _fact("product_experience", "商品經驗", prod, ["Q11"], availability=exp_avail("product_experience")),
    ]

    gap = willingness_capacity_gap(a["q13"], core["financialCapacity"])
    horizon = horizon_consistency(a["q7"], a["q8"])
    knowledge = knowledge_consistency(a["q12"], a["q11"])
    labels = financial_constraints(a, gap, horizon)
    fact_ids = list(dict.fromkeys(fid for _, ids in labels for fid in ids))  # 去重並保留順序
    findings = [
        {"id": "primary_financial_constraints", "priority": 1,
         "statement": "、".join(l for l, _ in labels) if labels else "目前未偵測到明顯的財務限制",
         "factIds": fact_ids},
        {"id": "willingness_capacity_gap", "priority": 2, "statement": gap,
         "factIds": ["loss_tolerance", "financial_capacity"]},
        {"id": "horizon_liquidity_consistency", "priority": 3, "statement": horizon,
         "factIds": ["investment_horizon", "withdrawal_need"]},
        {"id": "knowledge_experience_consistency", "priority": 4, "statement": knowledge,
         "factIds": ["diversification_knowledge", "product_experience"]},
    ]
    return {"readiness": readiness, "coreIndicators": core, "facts": facts, "findings": findings, "issues": issues}
