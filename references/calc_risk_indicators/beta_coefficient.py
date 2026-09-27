import numpy as np
import pandas as pd

def calculate_beta_coefficient(asset_returns: pd.Series, benchmark_returns: pd.Series) -> float:
    """
    計算 Beta 係數 (Beta Coefficient)
    
    參數:
    asset_returns (pd.Series): 資產或投資組合的報酬率序列
    benchmark_returns (pd.Series): 基準(如大盤)的報酬率序列
    
    回傳:
    float: Beta 係數 (衡量資產對基準的敏感度)
    """
    # 確保兩者的索引一致並剔除缺失值
    data = pd.concat([asset_returns, benchmark_returns], axis=1).dropna()
    asset = data.iloc[:, 0]
    benchmark = data.iloc[:, 1]
    
    # 計算共變異數
    covariance = asset.cov(benchmark)
    # 計算基準的變異數
    benchmark_variance = benchmark.var()
    
    # Beta = Cov(Asset, Benchmark) / Var(Benchmark)
    beta = covariance / benchmark_variance
    return beta
