
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI, registerAPI } from "../Services/AuthService";
import { toast } from "react-toastify";
import axios from "axios";
import { UserContext } from "./AuthContext";
import { handleError } from "../Helpers/ErrorHandler";

export const UserProvider = ({ children }) => {
  const navigate = useNavigate();

  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      return null;
    }
  });

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const registerUser = async (email, username, password) => {
    try {
      const res = await registerAPI(email, username, password);

      if (!res.data?.token) {
        toast.error("Registration failed: the server did not return an authentication token.");
        return;
      }

      const userObj = { userName: res.data.userName, email: res.data.email };
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(userObj));
      setToken(res.data.token);
      setUser(userObj);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      toast.success("Registration successful!");
      navigate("/search");
    } catch (error) {
      handleError(error);
      if (!error?.response) {
        toast.error("Unable to reach the server. Please try again.");
      }
    }
  };

  const loginUser = async (username, password) => {
    try {
      const res = await loginAPI(username, password);

      if (!res.data?.token) {
        toast.error("Login failed: the server did not return an authentication token.");
        return;
      }

      const userObj = { userName: res.data.userName, email: res.data.email };
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(userObj));
      setToken(res.data.token);
      setUser(userObj);
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;

      toast.success("Login successful!");
      navigate("/search");
    } catch (error) {
      handleError(error);
      if (!error?.response) {
        toast.error("Unable to reach the server. Please try again.");
      }
    }
  };

  const isLoggedIn = () => {
    return Boolean(token && user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    delete axios.defaults.headers.common["Authorization"];

    setUser(null);
    setToken(null);

    navigate("/");
  };

  return (
    <UserContext.Provider
      value={{
        loginUser,
        user,
        token,
        logout,
        isLoggedIn,
        registerUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
