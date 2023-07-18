import AsyncStorage from '@react-native-async-storage/async-storage';
import {configureStore} from '@reduxjs/toolkit';
import {createLogger} from 'redux-logger';
import {persistStore, persistReducer} from 'redux-persist';
import createSagaMiddleware from 'redux-saga';

import Sagas from './Sagas';
import {RootSliceReducer} from './Slices';

const config = {
  key: 'root',
  storage: AsyncStorage,
  blacklist: ['stockData', 'BottomTab'],
  debug: true,
};

const middleware = [];

const sagaMiddleware = createSagaMiddleware();

middleware.push(sagaMiddleware);

if (__DEV__) {
  middleware.push(
    createLogger({
      collapsed: true,
      duration: true,
      timestamp: true,
      colors: {
        title: () => '#F2789F',
        prevState: () => '#de6f0d',
        action: () => '#CAB8FF',
        nextState: () => '#1a9134',
      },
    }),
  );
}

const persistedReducer = persistReducer(config, RootSliceReducer);

const enhancers = [...middleware];

const persistConfig = {...enhancers};

const store = configureStore({
  reducer: persistedReducer,
  middleware: enhancers,
});

const persistor = persistStore(store, persistConfig, () => {});

sagaMiddleware.run(Sagas);

export {store, persistor};
