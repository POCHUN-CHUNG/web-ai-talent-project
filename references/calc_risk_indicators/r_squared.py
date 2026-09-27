import numpy as np
import pandas as pd
from scipy import stats

def calculate_r_squared(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    """
    計算判定係數 (Coefficient of Determination, R-squared)
    
    參數:
    asset_returns (pd.Series): 資產或投資組合的報酬率序列
    benchmark_returns (pd.Series): 基準(如大盤)的報酬率序列
    
    回傳:
    float: R-squared (介於 0 到 1 之間，代表基準能解釋資產變異的比例)
    """
    # 確保兩者的索引一致並剔除缺失值
    data = pd.concat([asset_returns, benchmark_returns], axis=1).dropna()
    y = data.iloc[:, 0] # Asset (依變數)
    x = data.iloc[:, 1] # Benchmark (自變數)
    
    # 使用 scipy.stats 進行線性回歸
    slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
    
    # R-squared 為相關係數 (r_value) 的平方
    r_squared = r_value ** 2
    return r_squared
