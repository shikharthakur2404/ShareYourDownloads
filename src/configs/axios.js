import axios from 'axios';

const axiosInstance = axios.create({});
axiosInstance.interceptors.request.use(async request => {
  return request;
});

export default axiosInstance;
