
import axios from "axios";
import { handleError } from "../Helpers/ErrorHandler";

const api = `${import.meta.env.VITE_API_URL || "http://localhost:5167"}/api/comment/`;

export const commentPostAPI = async (title, content, symbol) => {
  try {
    const data = await axios.post(api + `${symbol}`, {
      title: title,
      content: content,
    });

    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};

export const commentGetAPI = async (symbol) => {
  try {
    const data = await axios.get(api + `?Symbol=${symbol}`);

    return data;
  } catch (error) {
    handleError(error);
    throw error;
  }
};
