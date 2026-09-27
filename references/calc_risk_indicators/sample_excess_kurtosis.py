import pandas as pd

def calculate_sample_excess_kurtosis(returns: pd.Series) -> float:
    """
    計算樣本超額峰度 (Sample Excess Kurtosis)
    衡量報酬率分配的尾部厚度。
    常態分配的超額峰度為 0 (峰度為 3)。大於 0 表示肥尾 (Fat-tailed)。
    
    參數:
    returns (pd.Series): 資產或投資組合的報酬率序列
    
    回傳:
    float: 樣本超額峰度
    """
    # 使用 pandas 內建函數計算無偏樣本超額峰度
    # pandas.DataFrame.kurt() 預設計算的就是 Excess Kurtosis (Fisher's definition)
    excess_kurtosis = returns.kurt()
    return excess_kurtosis
