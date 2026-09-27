import numpy as np

def calculate_effective_number_of_constituents(weights: np.ndarray) -> float:
    """
    計算有效持股檔數 (Effective Number of Constituents, ENC)
    
    參數:
    weights (np.ndarray): 投資組合中各資產的權重 (總和應為 1)
    
    回傳:
    float: 有效持股檔數 (通常為 1 到 N 之間的實數)
    """
    # 確保權重為 numpy 陣列
    weights = np.array(weights)
    
    # 過濾掉權重為 0 或負數的部分以避免對數計算錯誤 (實務上權重可能極小)
    weights = weights[weights > 0]
    
    # 正規化權重 (確保總和為 1)
    weights = weights / np.sum(weights)
    
    # 計算 Herfindahl-Hirschman 指數 (HHI)
    hhi = np.sum(weights ** 2)
    
    # 有效持股檔數為 HHI 的倒數
    enc = 1 / hhi if hhi != 0 else 0.0
    
    return enc
