/* eslint-disable*/
import axios from 'axios';
import { showAlert } from './alerts';

// const stripe = Stripe(
//   'pk_test_51N3OlYEM2Ew3xulNYKnC4o7Ft0FGZnQsQqaph2Bkce1RfQkhVPXJkDG519OfbbwqCQ1vpdB1Klzc8j1qq4yF6aCk00C7v2UJnW'
// );

export const bookTour = async (tourId) => {
  try {
    // get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // direct to checkout form
    window.location.assign(session.data.session.url);
  } catch (err) {
    showAlert('error', err);
  }
};
