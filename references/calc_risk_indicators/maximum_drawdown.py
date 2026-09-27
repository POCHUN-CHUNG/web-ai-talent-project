import numpy as np
import pandas as pd

def calculate_maximum_drawdown(returns: pd.Series) -> float:
    """
    計算最大回撤 (Maximum Drawdown)
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    
    回傳:
    float: 最大回撤值 (正數表示，如 0.20 表示 20% 的回撤)
    """
    # 計算累積報酬
    cumulative_returns = (1 + returns).cumprod()
    # 計算迄今為止的最高累積報酬
    rolling_max = cumulative_returns.cummax()
    # 計算回撤 (Drawdown)
    drawdowns = (cumulative_returns - rolling_max) / rolling_max
    # 回傳最大回撤的絕對值
    max_drawdown = drawdowns.min()
    return abs(max_drawdown)
