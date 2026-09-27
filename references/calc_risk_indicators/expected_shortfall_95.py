import numpy as np
import pandas as pd

def calculate_expected_shortfall_95(returns: pd.Series) -> float:
    """
    計算 95% 預期短缺 (Expected Shortfall / Conditional VaR)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    
    回傳:
    float: 95% 預期短缺 (正數表示，代表在最差 5% 的情況下的平均損失)
    """
    # 計算 5% 的分位數 (即 95% VaR)
    var_95 = returns.quantile(0.05)
    
    # 篩選出小於或等於 95% VaR 的報酬率 (即尾部損失)
    tail_losses = returns[returns <= var_95]
    
    # 計算預期短缺 (平均尾部損失)
    expected_shortfall = tail_losses.mean()
    
    # 轉換為正數表示損失
    return abs(expected_shortfall)
