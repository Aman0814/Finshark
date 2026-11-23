
import axios from "axios";
import { handleError } from "../Helpers/ErrorHandler";

const api = `${import.meta.env.VITE_API_URL || "http://localhost:5167"}/api/portfolio/`;

export const portfolioAddAPI = async (symbol) => {
  try {
    const data = await axios.post(api + `?symbol=${symbol}`);
    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const portfolioDeleteAPI = async (symbol) => {
  try {
    const data = await axios.delete(api + `?symbol=${symbol}`);
    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const portfolioGetAPI = async () => {
  try {
    const data = await axios.get(api);
    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};
