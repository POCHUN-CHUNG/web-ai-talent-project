import numpy as np
import pandas as pd

def calculate_sortino_ratio(returns: pd.Series, risk_free_rate: float = 0.0, target_return: float = 0.0, periods_per_year: int = 252) -> float:
    """
    計算年化索丁諾比率 (Sortino Ratio)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    risk_free_rate (float): 無風險利率 (年化，預設為 0.0)
    target_return (float): 目標報酬率 (通常設為 0 或無風險利率)
    periods_per_year (int): 一年中的交易期數 (預設為 252 天)
    
    回傳:
    float: 年化索丁諾比率
    """
    # 將年化無風險利率與目標報酬率轉換為單期
    per_period_rf = (1 + risk_free_rate) ** (1 / periods_per_year) - 1
    per_period_target = (1 + target_return) ** (1 / periods_per_year) - 1
    
    # 計算超額報酬
    excess_returns = returns - per_period_rf
    
    # 計算下行報酬 (僅取小於目標報酬的部分，其餘視為 0)
    downside_returns = np.minimum(returns - per_period_target, 0)
    
    # 計算下行標準差 (Downside Deviation)，這裡的 np.mean 會正確除以總期數 N
    downside_deviation = np.sqrt(np.mean(downside_returns ** 2))
    
    # 計算索丁諾比率
    mean_excess_return = excess_returns.mean()
    sortino_ratio = mean_excess_return / downside_deviation if downside_deviation != 0 else 0.0
    
    # 年化索丁諾比率
    annualized_sortino = sortino_ratio * np.sqrt(periods_per_year)
    return annualized_sortino
