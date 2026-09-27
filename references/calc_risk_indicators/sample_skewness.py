import pandas as pd

def calculate_sample_skewness(returns: pd.Series) -> float:
    """
    計算樣本偏態係數 (Sample Skewness)
    衡量報酬率分配的不對稱性。
    大於 0 表示右偏 (長尾在右)，小於 0 表示左偏 (長尾在左)。
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    
    回傳:
    float: 樣本偏態係數
    """
    # 使用 pandas 內建函數計算無偏樣本偏態 (Fisher-Pearson 標準化動差)
    skewness = returns.skew()
    return skewness
