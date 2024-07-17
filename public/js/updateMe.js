import axios from 'axios';
import { showAlert } from './alerts';

// type is either password or data
export const updateData = async (data, type) => {
  try {
    const url =
      type === 'password'
        ? '/api/v1/users/update-my-password'
        : '/api/v1/users/update-me';
    const response = await axios({
      method: 'PATCH',
      url,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      data,
    });

    if (response.data.status === 'success') {
      showAlert('success', `${type.toUpperCase()} successfully updated`);
      window.location.reload(true);
    }
  } catch (error) {
    return showAlert('error', error.response.data.message);
  }
};
