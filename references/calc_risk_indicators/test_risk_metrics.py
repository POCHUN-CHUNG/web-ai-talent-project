import numpy as np
import pandas as pd

# 匯入各項指標的計算函數
from maximum_drawdown import calculate_maximum_drawdown
from risk_contribution import calculate_risk_contribution
from correlation_coefficient import calculate_correlation_coefficient
from annualized_volatility import calculate_annualized_volatility
from beta_coefficient import calculate_beta_coefficient
from expected_shortfall_95 import calculate_expected_shortfall_95
from sharpe_ratio import calculate_sharpe_ratio
from sortino_ratio import calculate_sortino_ratio
from effective_number_of_constituents import calculate_effective_number_of_constituents
from downside_volatility import calculate_downside_volatility
from herfindahl_hirschman_index import calculate_herfindahl_hirschman_index
from r_squared import calculate_r_squared
from sample_skewness import calculate_sample_skewness
from sample_excess_kurtosis import calculate_sample_excess_kurtosis

def main():
    # 設定隨機種子以便重現結果
    np.random.seed(42)

    # 模擬 100 筆資料 (例如：每日報酬率)
    n_days = 100
    
    # 模擬 3 檔資產報酬率
    asset1 = np.random.normal(loc=0.0005, scale=0.015, size=n_days)
    asset2 = np.random.normal(loc=0.0003, scale=0.012, size=n_days)
    asset3 = np.random.normal(loc=0.0006, scale=0.018, size=n_days)
    
    assets_df = pd.DataFrame({
        'Asset1': asset1,
        'Asset2': asset2,
        'Asset3': asset3
    })
    
    # 設定投資組合中各資產的權重 (這裡假設為 40%, 30%, 30%)
    weights = np.array([0.4, 0.3, 0.3])
    
    # 計算投資組合的總報酬率
    portfolio_returns = assets_df.dot(weights)
    portfolio_returns.name = 'Portfolio'
    
    # 模擬大盤(基準)報酬率
    benchmark_data = 0.4 * asset1 + 0.3 * asset2 + 0.3 * asset3 + np.random.normal(loc=0.0001, scale=0.01, size=n_days)
    benchmark_returns = pd.Series(benchmark_data, name="Benchmark")

    # 將資料合併為 DataFrame 並輸出至 Excel
    export_df = pd.concat([assets_df, portfolio_returns, benchmark_returns], axis=1)
    export_df.to_excel("simulated_data.xlsx", index=False)
    print("已將模擬資料輸出至 simulated_data.xlsx\n")

    print("=" * 55)
    print("投資組合風險指標測試報告 (100筆隨機模擬資料)")
    print("=" * 55)

    # 1. 最大回撤 (針對投資組合)
    md = calculate_maximum_drawdown(portfolio_returns)
    print(f" 1. 最大回撤 (Maximum Drawdown)          : {md:.2%}")

    # 2. 風險貢獻度 (計算 3 檔資產在投資組合中的風險貢獻)
    cov_matrix = assets_df.cov()
    rc = calculate_risk_contribution(weights, cov_matrix)
    print(f" 2. 風險貢獻度 (Risk Contribution)         :")
    print(f"      - Asset1 (權重 40%): {rc.iloc[0]:.2%}")
    print(f"      - Asset2 (權重 30%): {rc.iloc[1]:.2%}")
    print(f"      - Asset3 (權重 30%): {rc.iloc[2]:.2%}")

    # 3. 相關係數 (投資組合與大盤)
    corr = calculate_correlation_coefficient(portfolio_returns, benchmark_returns)
    print(f" 3. 相關係數 (Correlation Coefficient)   : {corr:.4f}")

    # 4. 年化波動度 (投資組合)
    ann_vol = calculate_annualized_volatility(portfolio_returns)
    print(f" 4. 年化波動度 (Annualized Volatility)     : {ann_vol:.2%}")

    # 5. Beta係數 (投資組合對大盤)
    beta = calculate_beta_coefficient(portfolio_returns, benchmark_returns)
    print(f" 5. Beta係數 (Beta Coefficient)          : {beta:.4f}")

    # 6. 95%預期短缺 (投資組合)
    es_95 = calculate_expected_shortfall_95(portfolio_returns)
    print(f" 6. 95%預期短缺 (95% Expected Shortfall)   : {es_95:.2%}")

    # 7. 夏普比率 (無風險利率 0%)
    sharpe = calculate_sharpe_ratio(portfolio_returns, risk_free_rate=0.0)
    print(f" 7. 夏普比率 (Sharpe Ratio)              : {sharpe:.4f}")

    # 8. 索丁諾比率 (無風險利率 0%，目標報酬率 0%)
    sortino = calculate_sortino_ratio(portfolio_returns, risk_free_rate=0.0)
    print(f" 8. 索丁諾比率 (Sortino Ratio)           : {sortino:.4f}")

    # 9. 有效持股檔數
    enc = calculate_effective_number_of_constituents(weights)
    print(f" 9. 有效持股檔數 (Effective Number of ...) : {enc:.2f}")

    # 10. 下行波動度 (投資組合)
    down_vol = calculate_downside_volatility(portfolio_returns)
    print(f"10. 下行波動度 (Downside Volatility)       : {down_vol:.2%}")

    # 11. 赫芬達爾—赫希曼指數
    hhi = calculate_herfindahl_hirschman_index(weights)
    print(f"11. 赫芬達爾—赫希曼指數 (HHI)              : {hhi:.4f}")

    # 12. 判定係數 (投資組合對大盤)
    r2 = calculate_r_squared(portfolio_returns, benchmark_returns)
    print(f"12. 判定係數 (R-squared)                 : {r2:.4f}")

    # 13. 樣本偏態係數 (投資組合)
    skewness = calculate_sample_skewness(portfolio_returns)
    print(f"13. 樣本偏態係數 (Sample Skewness)         : {skewness:.4f}")

    # 14. 樣本超額峰度 (投資組合)
    kurtosis = calculate_sample_excess_kurtosis(portfolio_returns)
    print(f"14. 樣本超額峰度 (Sample Excess Kurtosis)  : {kurtosis:.4f}")
    
    print("=" * 55)

if __name__ == "__main__":
    main()
