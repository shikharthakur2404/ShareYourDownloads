import {all, takeLatest} from 'redux-saga/effects';

import {
  signUpUser,
  signInUser,
  forgotPassword,
  otpVerify,
  resetPassword,
  getUserBalance,
  tokenRefresh,
} from 'app/Store/Slices/userDataSlice';

import {
  deleteFavouriteStocks,
  getFavouriteStocks,
  getSearchStockData,
  setFavouriteStocks,
} from 'app/Store/Slices/stockDataSlice';

import {
  buyStock,
  getListStocks,
  getTransactions,
  sellStock,
  stockListOrderDelete,
} from 'app/Store/Slices/stockAccountSlice';

import signUpSaga from './userSignUpSaga';
import signInSaga from './userSignInSaga';
import forgotPassworSaga from './userForgotPassword';
import otpVerifySaga from './userOtpVerify';
import resetPasswordSaga from './resetPassword';
import stockListSearchSaga from './userStockListSaga';
import addFavouriteStockSaga from './postFavouriteStockSaga';
import getFavouriteStockSaga from './getFavouriteStockSaga';
import deleteFavouriteStockSaga from './deleteFavouriteSaga';
import userBuyStockSaga from './buyStockSaga';
import userSellStockSaga from './sellStockSaga';
import userBalanceSaga from './getUserBalanceSaga';
import getAllTransactionsSaga from './getTransactionSaga';
import getStockListTransactionSaga from './getStockListTransactionSaga';
import deleteListStockSaga from './deleteStockListSaga';
import tokenRefreshSaga from './postTokenRefreshSaga';

const root = function* root() {
  yield all([takeLatest(signUpUser.type, signUpSaga)]);
  yield all([takeLatest(signInUser.type, signInSaga)]);
  yield all([takeLatest(forgotPassword.type, forgotPassworSaga)]);
  yield all([takeLatest(otpVerify.type, otpVerifySaga)]);
  yield all([takeLatest(resetPassword.type, resetPasswordSaga)]);
  yield all([takeLatest(getSearchStockData.type, stockListSearchSaga)]);
  yield all([takeLatest(setFavouriteStocks.type, addFavouriteStockSaga)]);
  yield all([takeLatest(getFavouriteStocks.type, getFavouriteStockSaga)]);
  yield all([takeLatest(deleteFavouriteStocks.type, deleteFavouriteStockSaga)]);
  yield all([takeLatest(buyStock.type, userBuyStockSaga)]);
  yield all([takeLatest(sellStock.type, userSellStockSaga)]);
  yield all([takeLatest(getUserBalance.type, userBalanceSaga)]);
  yield all([takeLatest(getTransactions.type, getAllTransactionsSaga)]);
  yield all([takeLatest(getListStocks.type, getStockListTransactionSaga)]);
  yield all([takeLatest(stockListOrderDelete.type, deleteListStockSaga)]);
  yield all([takeLatest(tokenRefresh.type, tokenRefreshSaga)]);
};

export default root;
