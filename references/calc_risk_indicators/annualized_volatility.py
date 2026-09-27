import numpy as np
import pandas as pd

def calculate_annualized_volatility(returns: pd.Series, periods_per_year: int = 252) -> float:
    """
    計算年化波動度 (Annualized Volatility)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    periods_per_year (int): 一年中的交易期數 (預設為 252 天)
    
    回傳:
    float: 年化波動度
    """
    # 計算樣本標準差
    daily_volatility = returns.std()
    # 乘上年化因子 (交易期數的平方根)
    annualized_volatility = daily_volatility * np.sqrt(periods_per_year)
    return annualized_volatility
