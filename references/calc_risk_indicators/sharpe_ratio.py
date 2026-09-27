import numpy as np
import pandas as pd

def calculate_sharpe_ratio(returns: pd.Series, risk_free_rate: float = 0.0, periods_per_year: int = 252) -> float:
    """
    計算年化夏普比率 (Sharpe Ratio)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    risk_free_rate (float): 無風險利率 (年化，預設為 0.0)
    periods_per_year (int): 一年中的交易期數 (預設為 252 天)
    
    回傳:
    float: 年化夏普比率
    """
    # 將年化無風險利率轉換為單期無風險利率
    per_period_rf = (1 + risk_free_rate) ** (1 / periods_per_year) - 1
    
    # 計算超額報酬
    excess_returns = returns - per_period_rf
    
    # 計算平均超額報酬與波動度
    mean_excess_return = excess_returns.mean()
    volatility = returns.std()
    
    # 計算單期夏普比率
    sharpe_ratio = mean_excess_return / volatility if volatility != 0 else 0.0
    
    # 年化夏普比率
    annualized_sharpe = sharpe_ratio * np.sqrt(periods_per_year)
    return annualized_sharpe
