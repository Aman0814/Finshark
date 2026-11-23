
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import RatioList from "../RatioList/RatioList";
import { getApiErrorMessage, getBalanceSheet } from "../../api";
import Spinner from "../Spinners/Spinner";

import { formatLargeMonetaryNumber } from "../../Helpers/numberFormatting";

const config = [
  {
    label: "Total Assets",
    emphasized: true,
    render: (company) =>
      formatLargeMonetaryNumber(company.totalAssets),
  },
  {
    label: "Current Assets",
    render: (company) =>
      formatLargeMonetaryNumber(company.totalCurrentAssets),
  },
  {
    label: "Total Cash",
    render: (company) =>
      formatLargeMonetaryNumber(company.cashAndCashEquivalents),
  },
  {
    label: "Property & Equipment",
    render: (company) =>
      formatLargeMonetaryNumber(company.propertyPlantEquipmentNet),
  },
  {
    label: "Intangible Assets",
    render: (company) =>
      formatLargeMonetaryNumber(company.intangibleAssets),
  },
  {
    label: "Long Term Debt",
    render: (company) =>
      formatLargeMonetaryNumber(company.longTermDebt),
  },
  {
    label: "Total Debt",
    render: (company) =>
      formatLargeMonetaryNumber(company.otherCurrentLiabilities),
  },
  {
    label: "Total Liabilities",
    emphasized: true,
    render: (company) =>
      formatLargeMonetaryNumber(company.totalLiabilities),
  },
  {
    label: "Current Liabilities",
    render: (company) =>
      formatLargeMonetaryNumber(company.totalCurrentLiabilities),
  },
  {
    label: "Long-Term Debt",
    render: (company) =>
      formatLargeMonetaryNumber(company.longTermDebt),
  },
  {
    label: "Long-Term Income Taxes",
    render: (company) =>
      formatLargeMonetaryNumber(company.otherLiabilities),
  },
  {
    label: "Stakeholder's Equity",
    render: (company) =>
      formatLargeMonetaryNumber(company.totalStockholdersEquity),
  },
  {
    label: "Retained Earnings",
    render: (company) =>
      formatLargeMonetaryNumber(company.retainedEarnings),
  },
];

const BalanceSheet = () => {
  const ticker = useOutletContext();

  const [companyData, setCompanyData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const getCompanyData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const value = await getBalanceSheet(ticker);
        if (active) {
          setCompanyData(value?.data?.[0] || null);
        }
      } catch (error) {
        console.error("Error fetching balance sheet:", error);
        if (active) {
          setCompanyData(null);
          setErrorMessage(
            getApiErrorMessage(error, "Unable to load the balance sheet.")
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    getCompanyData();

    return () => {
      active = false;
    };
  }, [ticker]);

  return (
    <>
      {errorMessage ? (
        <p className="m-4 rounded bg-white p-3 text-red-700">{errorMessage}</p>
      ) : loading ? (
        <Spinner />
      ) : companyData ? (
        <RatioList config={config} data={companyData} />
      ) : (
        <p className="m-4 rounded bg-white p-3 text-gray-700">
          No annual balance sheet data was returned for {ticker}.
        </p>
      )}
    </>
  );
};

export default BalanceSheet;
