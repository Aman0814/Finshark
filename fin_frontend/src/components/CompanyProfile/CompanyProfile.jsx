
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getKeyMetrics } from "../../api";
import RatioList from "../RatioList/RatioList";
import Spinner from "../Spinners/Spinner";
import {
  formatLargeNonMonetaryNumber,
  formatRatio,
} from "../../Helpers/numberFormatting";
import StockComment from "../StockComment/StockComment";

const tableConfig = [
  {
    label: "Market Cap",
    render: (company) =>
      formatLargeNonMonetaryNumber(company.marketCapTTM),
    subTitle: "Total value of all a company's shares of stock",
  },
  {
    label: "Current Ratio",
    render: (company) => formatRatio(company.currentRatioTTM),
    subTitle:
      "Measures the companies ability to pay short term debt obligations",
  },
  {
    label: "Return On Equity",
    render: (company) => formatRatio(company.roeTTM),
    subTitle:
      "Return on equity is the measure of a company's net income divided by its shareholder's equity",
  },
  {
    label: "Return On Assets",
    render: (company) =>
      formatRatio(company.returnOnTangibleAssetsTTM),
    subTitle:
      "Return on assets is the measure of how effective a company is using its assets",
  },
  {
    label: "Free Cashflow Per Share",
    render: (company) =>
      formatRatio(company.freeCashFlowPerShareTTM),
    subTitle:
      "Return on assets is the measure of how effective a company is using its assets",
  },
  {
    label: "Book Value Per Share TTM",
    render: (company) =>
      formatRatio(company.bookValuePerShareTTM),
    subTitle:
      "Book value per share indicates a firm's net asset value (total assets - total liabilities) on per share basis",
  },
  {
    label: "Divdend Yield TTM",
    render: (company) =>
      formatRatio(company.dividendYieldTTM),
    subTitle:
      "Shows how much a company pays each year relative to stock price",
  },
  {
    label: "Capex Per Share TTM",
    render: (company) =>
      formatRatio(company.capexPerShareTTM),
    subTitle:
      "Capex is used by a company to aquire, upgrade, and maintain physical assets",
  },
  {
    label: "Graham Number",
    render: (company) =>
      formatRatio(company.grahamNumberTTM),
    subTitle:
      "This is the upperbouind of the price range that a defensive investor should pay for a stock",
  },
  {
    label: "PE Ratio",
    render: (company) => formatRatio(company.peRatioTTM),
    subTitle:
      "This is the upperbouind of the price range that a defensive investor should pay for a stock",
  },
];

const CompanyProfile = () => {
  const ticker = useOutletContext();

  const [metrics, setMetrics] = useState({ ticker: null, data: null });
  const isLoadingMetrics = metrics.ticker !== ticker;
  const companyData = isLoadingMetrics ? null : metrics.data;

  useEffect(() => {
    let active = true;

    const getCompanyKeyRatios = async () => {
      try {
        const value = await getKeyMetrics(ticker);
        if (active) {
          setMetrics({ ticker, data: value?.data?.[0] || null });
        }
      } catch (error) {
        console.error("Error fetching company key metrics:", error);
        if (active) {
          setMetrics({ ticker, data: null });
        }
      }
    };

    getCompanyKeyRatios();

    return () => {
      active = false;
    };
  }, [ticker]);

  return (
    <>
      {isLoadingMetrics ? (
        <Spinner />
      ) : companyData ? (
        <>
          {companyData.dataProvider === "SEC EDGAR" && (
            <p className="m-4 rounded bg-white p-3 text-gray-700">
              Ratios are calculated from the latest annual SEC filing where
              possible. Market valuation, dividend, and DCF metrics may be
              unavailable.
            </p>
          )}
          {companyData.quoteError && (
            <p className="m-4 rounded bg-white p-3 text-gray-700">
              Live quote unavailable: {companyData.quoteError}
            </p>
          )}
          <RatioList config={tableConfig} data={companyData} />
        </>
      ) : (
        <p className="m-4 rounded bg-white p-3 text-gray-700">
          SEC financial metrics are available for U.S. filers after
          SECUserAgent is configured. Other metrics require an FMP API key.
        </p>
      )}
      <StockComment stockSymbol={ticker} />
    </>
  );
};

export default CompanyProfile;
