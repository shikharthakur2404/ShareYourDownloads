import axiosInstance from './axios';

const commonApiFunction = (type, url, accessToken, payload, contentType) => {
  return axiosInstance(
    url,
    type === 'post' || type === 'put' || type == 'delete'
      ? {
          method: type,
          data: payload ? payload : {},
          headers: accessToken
            ? {
                Authorization: 'Bearer ' + accessToken,
                'Content-Type': contentType
                  ? contentType
                  : 'multipart/form-data',
              }
            : {
                'Content-Type': contentType
                  ? contentType
                  : 'multipart/form-data',
              },
        }
      : {
          method: type,
          headers: accessToken
            ? {
                Authorization: 'Bearer ' + accessToken,
              }
            : {},
        },
  )
    .then(response => {
      console.log('API_CALLED:- ', url, 'API_RESPONSE:- ', response);
      return response;
    })
    .catch(error => {
      console.log(
        'API_CALLED:- ',
        url,
        'API_ERROR_RESPONSE:- ',
        error.response ? error.response : error,
      );
      return error.response ? error.response : error;
    });
};
export default commonApiFunction;
