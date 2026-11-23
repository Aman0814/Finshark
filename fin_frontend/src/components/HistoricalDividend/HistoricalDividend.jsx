import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getApiErrorMessage, getHistoricalDividend } from "../../api";
import SimpleLineChart from "../SimpleLineChart/SimpleLineChart";

const HistoricalDividend = () => {
  const ticker = useOutletContext();

  const [dividend, setDividend] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchHistoricalDividend = async () => {
      setDividend(null);
      setErrorMessage(null);
      try {
        const value = await getHistoricalDividend(ticker);

        const historicalData = value?.data?.historical;

        if (historicalData && historicalData.length > 0) {
          const sortedData = historicalData
            .slice(0, 18)
            .sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);

              return dateA - dateB;
            });

          if (active) {
            setDividend(sortedData);
          }
        } else {
          if (active) {
            setDividend([]);
          }
        }
      } catch (error) {
        console.error("Error fetching historical dividends:", error);
        if (active) {
          setErrorMessage(
            getApiErrorMessage(error, "Unable to load dividend history.")
          );
        }
      }
    };

    fetchHistoricalDividend();

    return () => {
      active = false;
    };
  }, [ticker]);

  return (
    <>
      {errorMessage ? (
        <p className="m-4 rounded bg-white p-3 text-red-700">{errorMessage}</p>
      ) : dividend === null ? (
        <h1 className="ml-3">Loading...</h1>
      ) : dividend.length > 0 ? (
        <SimpleLineChart
          data={dividend}
          xAxis="label"
          dataKey="dividend"
        />
      ) : (
        <p className="m-4 rounded bg-white p-3 text-gray-700">
          No dividend history was returned for {ticker}.
        </p>
      )}
    </>
  );
};

export default HistoricalDividend;
