import numpy as np
import pandas as pd

def calculate_downside_volatility(returns: pd.Series, target_return: float = 0.0, periods_per_year: int = 252) -> float:
    """
    計算年化下行波動度 (Annualized Downside Volatility / Downside Risk)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    target_return (float): 目標報酬率 (通常設為 0 或無風險利率)
    periods_per_year (int): 一年中的交易期數 (預設為 252 天)
    
    回傳:
    float: 年化下行波動度
    """
    # 將年化目標報酬率轉換為單期目標報酬率
    per_period_target = (1 + target_return) ** (1 / periods_per_year) - 1
    
    # 計算下行報酬 (僅取小於目標報酬的部分，其餘視為 0)
    downside_returns = np.minimum(returns - per_period_target, 0)
    
    # 計算下行標準差
    downside_variance = np.mean(downside_returns ** 2)
    downside_volatility = np.sqrt(downside_variance)
    
    # 年化下行波動度
    annualized_downside_volatility = downside_volatility * np.sqrt(periods_per_year)
    return annualized_downside_volatility
