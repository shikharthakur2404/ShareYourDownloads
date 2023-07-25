import {call, put} from 'redux-saga/effects';

import {setUserDetails} from 'app/Store/Slices/userDataSlice';
import {signInUserAPI} from 'services/authenticationApi';

const fakeapi = () => {};

function* signInSaga({payload}) {
  try {
    const response = yield call(signInUserAPI, payload.data);
    if (response.status === 200) {
      yield put(setUserDetails(response.data));
      payload.successCallback(response.data);
    } else if (
      response.status === 401 ||
      response.status === 400 ||
      response.status === 500
    ) {
      payload.failureCallback({
        message: response?.data?.detail,
      });
    }
  } catch (error) {
    payload.failureCallback(error);
  }
}

export default signInSaga;
