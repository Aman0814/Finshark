
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import Table from "../Table/Table";
import { getIncomeStatement } from "../../api";
import Spinner from "../Spinners/Spinner";
import {
  formatLargeMonetaryNumber,
  formatRatio,
} from "../../Helpers/numberFormatting";
import { getApiErrorMessage } from "../../api";

const configs = [
  {
    label: "Date",
    render: (company) => company.date,
  },
  {
    label: "Revenue",
    render: (company) =>
      formatLargeMonetaryNumber(company.revenue),
  },
  {
    label: "Cost Of Revenue",
    render: (company) =>
      formatLargeMonetaryNumber(company.costOfRevenue),
  },
  {
    label: "Depreciation",
    render: (company) =>
      formatLargeMonetaryNumber(company.depreciationAndAmortization),
  },
  {
    label: "Operating Income",
    render: (company) =>
      formatLargeMonetaryNumber(company.operatingIncome),
  },
  {
    label: "Income Before Taxes",
    render: (company) =>
      formatLargeMonetaryNumber(company.incomeBeforeTax),
  },
  {
    label: "Net Income",
    render: (company) =>
      formatLargeMonetaryNumber(company.netIncome),
  },
  {
    label: "Net Income Ratio",
    render: (company) =>
      formatRatio(company.netIncomeRatio),
  },
  {
    label: "Earnings Per Share",
    render: (company) => formatRatio(company.eps),
  },
  {
    label: "Earnings Per Diluted",
    render: (company) => formatRatio(company.epsdiluted),
  },
  {
    label: "Gross Profit Ratio",
    render: (company) =>
      formatRatio(company.grossProfitRatio),
  },
  {
    label: "Opearting Income Ratio",
    render: (company) =>
      formatRatio(company.operatingIncomeRatio),
  },
  {
    label: "Income Before Taxes Ratio",
    render: (company) =>
      formatRatio(company.incomeBeforeTaxRatio),
  },
];

const IncomeStatement = () => {
  const ticker = useOutletContext();

  const [incomeStatement, setIncomeStatement] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const getRatios = async () => {
      setIncomeStatement(null);
      setErrorMessage(null);
      try {
        const result = await getIncomeStatement(ticker);
        if (active) {
          setIncomeStatement(result?.data || []);
        }
      } catch (error) {
        console.error("Error fetching income statement:", error);
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, "Unable to load the income statement.")
          );
        }
      }
    };

    getRatios();

    return () => {
      active = false;
    };
  }, [ticker]);

  return (
    <>
      {errorMessage ? (
        <p className="m-4 rounded bg-white p-3 text-red-700">{errorMessage}</p>
      ) : incomeStatement !== null && incomeStatement.length > 0 ? (
        <Table config={configs} data={incomeStatement} />
      ) : incomeStatement !== null ? (
        <p className="m-4 rounded bg-white p-3 text-gray-700">
          No annual income statement data was returned for {ticker}.
        </p>
      ) : (
        <Spinner />
      )}
    </>
  );
};

export default IncomeStatement;
