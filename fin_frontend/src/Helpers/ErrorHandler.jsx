import axios from "axios";
import { toast } from "react-toastify";

export const handleError = (error) => {
  if (axios.isAxiosError(error)) {
    const err = error.response;

    if (!err) {
      toast.warning("Could not reach the API. Check the backend and try again.");
      return;
    }

    if (Array.isArray(err?.data)) {
      for (const val of err.data) {
        toast.warning(typeof val === "string" ? val : val.description);
      }
    } else if (Array.isArray(err?.data?.errors)) {
      for (let val of err.data.errors) {
        toast.warning(val.description);
      }
    } else if (typeof err?.data?.errors === "object" && err?.data?.errors !== null) {
      for (let e in err.data.errors) {
        toast.warning(err.data.errors[e][0]);
      }
    } else if (typeof err.data === "string") {
      toast.warning(err.data);
    } else if (err.data?.title) {
      toast.warning(err.data.title);
    } else if (err?.status === 401) {
      toast.warning("Please login");
      window.history.pushState({}, "LoginPage", "/login");
    } else {
      toast.warning(`API request failed (${err.status}).`);
    }
  } else {
    toast.warning(error?.message || "An unexpected API error occurred.");
  }
};
