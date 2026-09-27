import numpy as np

def calculate_herfindahl_hirschman_index(weights: np.ndarray) -> float:
    """
    計算赫芬達爾—赫希曼指數 (Herfindahl-Hirschman Index, HHI)
    常用於衡量投資組合的集中度 (Concentration)
    
    參數:
    weights (np.ndarray): 投資組合中各資產的權重 (總和應為 1)
    
    回傳:
    float: HHI 指數 (介於 1/N 到 1 之間，數值越大代表越集中)
    """
    weights = np.array(weights)
    
    # 確保權重總和為 1
    weights = weights / np.sum(weights)
    
    # HHI = 各資產權重的平方和
    hhi = np.sum(weights ** 2)
    
    return hhi
