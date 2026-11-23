import axios from "axios";

const api = `${import.meta.env.VITE_API_URL || "http://localhost:5167"}/api/stock`;

export const getStockListAPI = (pageNumber, pageSize) =>
  axios.get(`${api}?PageNumber=${pageNumber}&PageSize=${pageSize}`);
