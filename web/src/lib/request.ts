import axios from "axios";
import { redirect } from "@solidjs/router";

const request = axios.create({
  // baseURL: '/files'
});

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default request;
