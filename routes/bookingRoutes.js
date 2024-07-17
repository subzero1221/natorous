const express = require('express');
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController');

const {
  getCheckoutSession,
  getBooking,
  updateBooking,
  deleteBooking,
  createBooking,
  getAllBookings,
} = bookingController;
const { protect, restrictTo } = authController;

const router = express.Router();

// protect all routes
router.use(protect);

router.get('/checkout-session/:tourId', getCheckoutSession);

// restrict next routes to admin and lead-guide only
router.use(restrictTo('admin', 'lead-guide'));

router.route('/:id').get(getBooking).patch(updateBooking).delete(deleteBooking);
router.route('/').post(createBooking).get(getAllBookings);

module.exports = router;
