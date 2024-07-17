const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

const {
  getReview,
  getAllReviews,
  createReview,
  deleteReview,
  updateReview,
  setTourUserIds,
} = reviewController;

const { protect, restrictTo } = authController;

const router = express.Router({ mergeParams: true });

router.use(protect);

router
  .route('/:id')
  .get(getReview)
  .delete(restrictTo('user', 'admin'), deleteReview)
  .patch(restrictTo('user', 'admin'), updateReview);
router
  .route('/')
  .get(getAllReviews)
  .post(restrictTo('user'), setTourUserIds, createReview);

module.exports = router;
