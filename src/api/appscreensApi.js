// below are dummy formatted apis

import {ApiConfig, commonApiFunction} from '../configs';

export const getUserBalanceAPI = token => {
  const url = ApiConfig.API_BASE_URL + ApiConfig.GET_USER_BALANCE;
  return commonApiFunction('get', url, token, null);
};

export const getAllTransactionsAPI = (token, payload) => {
  const url =
    ApiConfig.API_BASE_URL +
    ApiConfig.GET_USER_TRANSACTIONS +
    '?iscompleted=' +
    payload;
  return commonApiFunction('get', url, token, payload);
};

export const orderCancelAPI = (token, payload) => {
  const url = ApiConfig.API_BASE_URL + ApiConfig.ORDER_CANCEL;
  return commonApiFunction('delete', url, token, payload);
};

export const tokenRefreshAPI = (payload, contentType) => {
  const url = ApiConfig.API_BASE_URL + ApiConfig.TOKEN_REFRESH;
  return commonApiFunction('post', url, null, payload, contentType);
};
