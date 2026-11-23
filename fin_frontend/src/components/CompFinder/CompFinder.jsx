
import { useEffect, useState } from "react";
import CompFinderItem from "./CompanyItem/CompFinderItem";
import { getCompData } from "../../api";
import Spinner from "../Spinners/Spinner";

const CompFinder = ({ ticker }) => {
  const [companyData, setCompanyData] = useState(null);

  useEffect(() => {
    const getComps = async () => {
      try {
        const value = await getCompData(ticker);
        setCompanyData(value?.data?.[0] || null);
      } catch (error) {
        console.error("Error fetching competitors:", error);
        setCompanyData(null);
      }
    };

    getComps();
  }, [ticker]);

  return (
    <div className="inline-flex rounded-md shadow-sm m-4" role="group">
      {companyData ? (
        companyData.peersList.map((peerTicker) => {
          return (
            <CompFinderItem
              key={peerTicker}
              ticker={peerTicker}
            />
          );
        })
      ) : (
        <Spinner />
      )}
    </div>
  );
};

export default CompFinder;
