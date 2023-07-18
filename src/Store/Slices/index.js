import {combineReducers} from '@reduxjs/toolkit';

import UserDataSlice from './userDataSlice';

export const RootSliceReducer = combineReducers({
  UserDataSlice,
});
