
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCompanyProfile } from "../../api";
import Sidebar from "../../components/Sidebar/Sidebar";
import CompanyDashboard from "../../components/CompanyDashbord/CompanyDashboard";
import Tile from "../../components/Tile/Tile";
import Spinner from "../../components/Spinners/Spinner";
import CompFinder from "../../components/CompFinder/CompFinder";
import TenKFinder from "../../components/TenKFinder/TenKFinder";

const CompanyPage = () => {
  const { ticker } = useParams();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let active = true;
    const getProfileInit = async () => {
      setLoading(true);
      setProfileError(null);
      try {
        const result = await getCompanyProfile(ticker);
        const profile = result?.data?.[0] || null;
        if (active) {
          setCompany(profile);
          if (!profile) {
            setProfileError(
              "The company profile could not be loaded. Check the API notification and backend configuration."
            );
          }
        }
      } catch (error) {
        console.error("Error fetching company profile:", error);
        if (active) {
          setCompany(null);
          setProfileError(error.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (ticker) {
      getProfileInit();
    }

    return () => {
      active = false;
    };
  }, [ticker]);

  const formattedPrice = company?.price != null
    ? new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: company.currency || "USD",
      }).format(Number(company.price))
    : "Unavailable";
  const hasFmpData = !["SEC EDGAR", "Yahoo Finance"].includes(
    company?.dataProvider
  );
  const hasSecData = company?.dataProvider === "SEC EDGAR";

  return (
    <>
      {loading ? (
        <Spinner />
      ) : profileError ? (
        <p className="m-4 rounded bg-white p-3 text-red-700">{profileError}</p>
      ) : company ? (
        <div className="w-full relative flex ct-docs-disable-sidebar-content overflow-x-hidden">
          <Sidebar />

          <CompanyDashboard ticker={ticker}>
            <Tile title="Company Name" subTitle={company.companyName} />
            <Tile title="Price" subTitle={formattedPrice} />
            <Tile
              title="DCF"
              subTitle={
                company.dcf == null
                  ? "Not provided by this data source"
                  : `$${company.dcf}`
              }
            />
            <Tile
              title="Sector"
              subTitle={company.sector || "Not provided by this data source"}
            />
            {company.industry && (
              <Tile title="Industry" subTitle={company.industry} />
            )}
            {company.exchangeShortName && (
              <Tile title="Exchange" subTitle={company.exchangeShortName} />
            )}
            {company.cik && <Tile title="SEC CIK" subTitle={company.cik} />}
            {company.phone && <Tile title="Phone" subTitle={company.phone} />}
            {company.website && (
              <Tile title="Website" subTitle={company.website} />
            )}
            {(company.address || company.city || company.state || company.zip) && (
              <Tile
                title="Location"
                subTitle={[
                  company.address,
                  company.city,
                  company.state,
                  company.zip,
                ]
                  .filter(Boolean)
                  .join(", ")}
              />
            )}

            {hasFmpData ? (
              <>
                <CompFinder ticker={company.symbol} />
                <TenKFinder ticker={company.symbol} />
              </>
            ) : hasSecData ? (
              <>
                <TenKFinder ticker={company.symbol} />
                <p className="m-4 rounded bg-white p-3 text-gray-700">
                  Annual reports and financial statements are sourced from SEC
                  EDGAR. DCF, sector, and peer data are not provided by SEC
                  company filings.
                </p>
              </>
            ) : (
              <p className="m-4 rounded bg-white p-3 text-gray-700">
                Reports for U.S. filers are available through the SEC fallback
                after SECUserAgent is configured. Peer data requires an FMP API
                key.
              </p>
            )}

            {company.description ? (
              <p className="bg-white shadow rounded text-medium font-medium text-gray-900 p-3 mt-1 m-4">
                {company.description}
              </p>
            ) : hasSecData ? (
              <p className="bg-white shadow rounded text-medium font-medium text-gray-700 p-3 mt-1 m-4">
                SEC EDGAR provides regulatory filings, not a general company
                description.
              </p>
            ) : null}
            {company.quoteError && (
              <p className="m-4 rounded bg-white p-3 text-gray-700">
                Live quote unavailable: {company.quoteError}
              </p>
            )}
          </CompanyDashboard>
        </div>
      ) : (
        <p className="m-4 rounded bg-white p-3 text-red-700">
          No company profile was returned for {ticker}.
        </p>
      )}
    </>
  );
};

export default CompanyPage;
