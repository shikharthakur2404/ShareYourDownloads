import {createNavigationContainerRef} from '@react-navigation/native';
import {CommonActions} from '@react-navigation/native';

export const navRef = createNavigationContainerRef();

const goBack = () => {
  navRef.goBack();
};

const navigate = (name, params) => {
  navRef.navigate(name, params);
};
const navigateAndSimpleReset = (name, index = 0) => {
  if (navRef.isReady()) {
    navRef.dispatch(
      CommonActions.reset({
        index,
        routes: [{name}],
      }),
    );
  }
};
export default {navigate, goBack, navigateAndSimpleReset};
