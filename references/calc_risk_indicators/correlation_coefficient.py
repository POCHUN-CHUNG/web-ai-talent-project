import numpy as np
import pandas as pd

def calculate_correlation_coefficient(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    """
    計算相關係數 (Correlation Coefficient)
    
    參數:
    asset_returns (pd.Series): 資產或投資組合的報酬率序列
    benchmark_returns (pd.Series): 基準(如大盤)的報酬率序列
    
    回傳:
    float: 兩者的相關係數 (介於 -1 到 1 之間)
    """
    # 確保兩者的索引一致並剔除缺失值
    data = pd.concat([asset_returns, benchmark_returns], axis=1).dropna()
    # 計算相關係數矩陣並取出相關係數
    correlation = data.iloc[:, 0].corr(data.iloc[:, 1])
    return correlation
