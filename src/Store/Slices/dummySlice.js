import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  userDetails: [],
  currentUser: {},
};

const userSlice = createSlice({
  name: 'userSlice',
  initialState,
  reducers: {
    setUserDetails: (state, action) => {
      state.userDetails = action.payload;
    },
    signInUser: {
      reducer: (state, action) => {
        state.currentUser = action.payload.data.username;
      },
      prepare: (data, successCallback, failureCallback) => ({
        payload: {
          data,
          successCallback,
          failureCallback,
        },
      }),
    },
  },
});

const {actions, reducer} = userSlice;

export const {setUserDetails, signInUser} = actions;

export default reducer;
