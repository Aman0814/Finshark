import axios from "axios";
import { handleError } from "./Helpers/ErrorHandler";

const api = `${import.meta.env.VITE_API_URL || "http://localhost:5167"}/api/stock-data`;

const get = async (path) => {
  try {
    return await axios.get(`${api}${path}`);
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const getApiErrorMessage = (error, fallback) => {
  const responseData = error?.response?.data;
  if (typeof responseData === "string") {
    return responseData;
  }

  return responseData?.title || error?.message || fallback;
};

const symbolPath = (symbol, dataType) =>
  `/${encodeURIComponent(symbol)}/${dataType}`;

export const searchCompanies = async (query) => {
  return get(`/search?query=${encodeURIComponent(query)}`);
};

export const getCompanyProfile = (symbol) =>
  get(symbolPath(symbol, "profile"));

export const getKeyMetrics = (symbol) =>
  get(symbolPath(symbol, "key-metrics"));

export const getIncomeStatement = (symbol) =>
  get(symbolPath(symbol, "income-statement"));

export const getBalanceSheet = (symbol) =>
  get(symbolPath(symbol, "balance-sheet"));

export const getCashFlow = (symbol) =>
  get(symbolPath(symbol, "cash-flow"));

export const getCompData = (symbol) =>
  get(symbolPath(symbol, "peers"));

export const getTenK = (symbol) =>
  get(symbolPath(symbol, "ten-k"));

export const getHistoricalDividend = (symbol) =>
  get(symbolPath(symbol, "dividends"));
