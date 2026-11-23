import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getApiErrorMessage, getCashFlow } from "../../api";
import Table from "../Table/Table";
import Spinner from "../Spinners/Spinner";
import { formatLargeMonetaryNumber } from "../../Helpers/numberFormatting";

const config = [
  {
    label: "Date",
    render: (company) => company.date,
  },
  {
    label: "Operating Cashflow",
    render: (company) =>
      formatLargeMonetaryNumber(company.operatingCashFlow),
  },
  {
    label: "Investing Cashflow",
    render: (company) =>
      formatLargeMonetaryNumber(company.netCashUsedForInvestingActivites),
  },
  {
    label: "Financing Cashflow",
    render: (company) =>
      formatLargeMonetaryNumber(
        company.netCashUsedProvidedByFinancingActivities
      ),
  },
  {
    label: "Cash At End of Period",
    render: (company) =>
      formatLargeMonetaryNumber(company.cashAtEndOfPeriod),
  },
  {
    label: "CapEX",
    render: (company) =>
      formatLargeMonetaryNumber(company.capitalExpenditure),
  },
  {
    label: "Issuance Of Stock",
    render: (company) =>
      formatLargeMonetaryNumber(company.commonStockIssued),
  },
  {
    label: "Free Cash Flow",
    render: (company) =>
      formatLargeMonetaryNumber(company.freeCashFlow),
  },
];

const CashflowStatement = () => {
  const ticker = useOutletContext();

  const [cashFlowData, setCashFlowData] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const getRatios = async () => {
      setCashFlowData(null);
      setErrorMessage(null);
      try {
        const result = await getCashFlow(ticker);
        if (active) {
          setCashFlowData(result?.data || []);
        }
      } catch (error) {
        console.error("Error fetching cash flow:", error);
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, "Unable to load the cash flow statement.")
          );
        }
      }
    };

    getRatios();

    return () => {
      active = false;
    };
  }, [ticker]);

  return errorMessage ? (
    <p className="m-4 rounded bg-white p-3 text-red-700">{errorMessage}</p>
  ) : cashFlowData !== null && cashFlowData.length > 0 ? (
    <Table config={config} data={cashFlowData} />
  ) : cashFlowData !== null ? (
    <p className="m-4 rounded bg-white p-3 text-gray-700">
      No annual cash flow data was returned for {ticker}.
    </p>
  ) : (
    <Spinner />
  );
};

export default CashflowStatement;
