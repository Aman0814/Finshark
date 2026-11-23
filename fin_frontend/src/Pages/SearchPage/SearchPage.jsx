
import { useCallback, useEffect, useState } from "react";
import { searchCompanies } from "../../api";
import Search from "../../components/Search/Search";
import ListPortfolio from "../../components/Portfolio/ListPortfolio/ListPortfolio";
import CardList from "../../components/CardList/CardList";
import {
  portfolioAddAPI,
  portfolioDeleteAPI,
  portfolioGetAPI,
} from "../../Services/PortfolioService";
import { getStockListAPI } from "../../Services/StockService";
import { toast } from "react-toastify";
import StockList from "../../components/StockList/StockList";

const STOCKS_PER_PAGE = 20;

const SearchPage = () => {
  const [search, setSearch] = useState("");
  const [portfolioValues, setPortfolioValues] = useState([]);
  const [searchResult, setSearchResult] = useState([]);
  const [serverError, setServerError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [stockPage, setStockPage] = useState(1);
  const [hasMoreStocks, setHasMoreStocks] = useState(false);
  const [stockListError, setStockListError] = useState(null);
  const [isLoadingStocks, setIsLoadingStocks] = useState(true);

  const getPortfolio = useCallback(() => {
    portfolioGetAPI()
      .then((res) => {
        if (res?.data) {
          setPortfolioValues(res.data);
        } else {
          setPortfolioValues([]);
        }
      })
      .catch(() => {
        setPortfolioValues([]);
      });
  }, []);

  const updateStockList = useCallback((res, pageNumber) => {
    if (!Array.isArray(res.data)) {
      throw new Error("The stock API returned an unexpected response.");
    }

    setStocks(res.data);
    setStockPage(pageNumber);
    setHasMoreStocks(res.data.length === STOCKS_PER_PAGE);
  }, []);

  const getStockList = useCallback(async (pageNumber = 1) => {
    setIsLoadingStocks(true);
    setStockListError(null);
    try {
      const res = await getStockListAPI(pageNumber, STOCKS_PER_PAGE);
      updateStockList(res, pageNumber);
    } catch (error) {
      setStocks([]);
      setHasMoreStocks(false);
      setStockListError(error.message || "Unable to load stocks from the API.");
    } finally {
      setIsLoadingStocks(false);
    }
  }, [updateStockList]);

  useEffect(() => {
    getPortfolio();
  }, [getPortfolio]);

  useEffect(() => {
    let active = true;

    getStockListAPI(1, STOCKS_PER_PAGE)
      .then((res) => {
        if (active) {
          updateStockList(res, 1);
        }
      })
      .catch((error) => {
        if (active) {
          setStocks([]);
          setHasMoreStocks(false);
          setStockListError(error.message || "Unable to load stocks from the API.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingStocks(false);
        }
      });

    return () => {
      active = false;
    };
  }, [updateStockList]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const onPortfolioCreate = (e) => {
    e.preventDefault();

    portfolioAddAPI(e.target[0].value)
      .then((res) => {
        if (res?.status === 201) {
          toast.success("Stock added to portfolio!");
          getPortfolio();
          getStockList(stockPage);
        }
      })
      .catch(() => {
        toast.warning("Could not add stock to portfolio!");
      });
  };

  const onPortfolioDelete = (e) => {
    e.preventDefault();

    portfolioDeleteAPI(e.target[0].value)
      .then((res) => {
        if (res?.status === 200) {
          toast.success("Stock deleted from portfolio!");
          getPortfolio();
        }
      })
      .catch(() => {
        toast.warning("Could not delete stock from portfolio!");
      });
  };

  const onSearchSubmit = async (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query || isSearching) return;

    setIsSearching(true);
    setServerError(null);
    setSearchResult([]);
    setHasSearched(true);
    try {
      const result = await searchCompanies(query);

      if (Array.isArray(result?.data)) {
        setSearchResult(result.data);
      } else {
        setServerError("The stock API returned an unexpected response.");
      }
    } catch (error) {
      setServerError(
        error?.response?.data ||
          error?.message ||
          "Unable to search stocks. Check the backend and stock data provider."
      );
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-slate-50 pb-12">
      <Search
        onSearchSubmit={onSearchSubmit}
        search={search}
        handleSearchChange={handleSearchChange}
        isSearching={isSearching}
      />

      <ListPortfolio
        portfolioValues={portfolioValues}
        onPortfolioDelete={onPortfolioDelete}
      />

      <StockList
        stocks={stocks}
        pageNumber={stockPage}
        hasMore={hasMoreStocks}
        isLoading={isLoadingStocks}
        error={stockListError}
        onPageChange={getStockList}
      />

      <CardList
        searchResults={searchResult}
        onPortfolioCreate={onPortfolioCreate}
      />

      {serverError && (
        <p role="alert" className="mx-auto max-w-4xl px-6 text-red-700">
          {serverError}
        </p>
      )}
      {!serverError && hasSearched && !isSearching && searchResult.length === 0 && (
        <p className="mx-auto max-w-4xl px-6 text-center text-slate-600">
          No companies matched "{search.trim()}".
        </p>
      )}
    </main>
  );
};

export default SearchPage;
