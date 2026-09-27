import numpy as np
import pandas as pd

def calculate_risk_contribution(weights: np.ndarray, cov_matrix: pd.DataFrame) -> pd.Series:
    """
    計算風險貢獻度 (Risk Contribution)
    
    參數:
    weights (np.ndarray): 投資組合中各資產的權重
    cov_matrix (pd.DataFrame): 資產的共變異數矩陣 (Covariance Matrix)
    
    回傳:
    pd.Series: 各資產的風險貢獻度 (百分比)
    """
    # 計算投資組合的總變異數
    portfolio_variance = np.dot(weights.T, np.dot(cov_matrix, weights))
    # 計算投資組合的標準差 (波動度)
    portfolio_volatility = np.sqrt(portfolio_variance)
    
    # 計算邊際風險貢獻 (Marginal Risk Contribution)
    marginal_risk_contribution = np.dot(cov_matrix, weights) / portfolio_volatility
    
    # 計算各資產的風險貢獻 (Risk Contribution)
    risk_contribution = weights * marginal_risk_contribution
    
    # 將風險貢獻轉換為百分比 (加總為 100%)
    risk_contribution_percent = risk_contribution / portfolio_volatility
    
    return pd.Series(risk_contribution_percent, index=cov_matrix.index)
