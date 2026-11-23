
import { useEffect, useState } from "react";
import { getTenK } from "../../api";
import TenKFinderItem from "./TenKFinderItem/TenKFinderItem";
import Spinner from "../Spinners/Spinner";

const TenKFinder = ({ ticker }) => {
  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
    const getTenKData = async () => {
      try {
        const value = await getTenK(ticker);
        setCompanyData(value?.data || []);
      } catch (error) {
        console.error("Error fetching 10-K data:", error);
        setCompanyData([]);
      }
    };

    getTenKData();
  }, [ticker]);

  return (
    <div className="inline-flex rounded-md shadow-sm m-4" role="group">
      {companyData === null ? (
        <Spinner />
      ) : (
        companyData.slice(0, 5).map((tenK, index) => (
          <TenKFinderItem
            key={`${tenK?.symbol || ticker}-${tenK?.fillingDate || tenK?.date || index}`}
            tenK={tenK}
          />
        ))
      )}
    </div>
  );
};

export default TenKFinder;
