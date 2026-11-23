import axios from "axios";

const api = `${import.meta.env.VITE_API_URL || "http://localhost:5167"}/api/`;

export const loginAPI = async (username, password) => {
  return axios.post(api + "account/login", {
    username,
    password,
  });
};

export const registerAPI = async (email, username, password) => {
  return axios.post(api + "account/register", {
    email,
    username,
    password,
  });
};
