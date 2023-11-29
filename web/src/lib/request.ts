import axios, { AxiosError } from "axios";
import { createStandaloneToast } from "@chakra-ui/react";

const { toast } = createStandaloneToast();

const request = axios.create({
  // baseURL: import.meta.env.VITE_APP_BACKEND_BASE_URL,
});

request.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    return config;
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error);
  },
);

interface ErrorResponse {
  message: string;
}

request.interceptors.response.use(
  function (response) {
    // Do something with response data
    return response.data;
  },
  function (error: AxiosError<ErrorResponse>) {
    // Do something with response error
    toast({
      title: error.response?.data.message ?? error.message ?? "Error",
      status: "error",
      position: "top",
    });

    return Promise.reject(error);
  },
);

export default request;
