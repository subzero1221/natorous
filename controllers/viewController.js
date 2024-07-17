const Tour = require('../models/tourModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { capitaliseSlug } = require('../utils/utilityFunctions');

exports.getOverview = catchAsync(async (req, res, next) => {
  // get all tour data
  const tours = await Tour.find();
  // build template

  // render template
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const tour = await Tour.findOne({ slug: slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour)
    return next(
      new AppError(
        `'${capitaliseSlug(
          slug
        )}' cannot be found. Check the spelling and try again`,
        404
      )
    );

  res.status(200).render('tour', {
    title: tour.name,
    tour,
  });
});

exports.getLoginForm = (req, res, next) => {
  res.status(200).render('login', {
    title: 'Login',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('profile', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1. Find bookings
  const bookings = await Booking.find({ user: req.user.id });
  const tourIds = bookings.map((booking) => booking.tour);

  // 2. Find the tours for found bookings
  const tours = await Tour.find({ _id: { $in: tourIds } }); // find all the tours where the id is $in the array

  res.status(200).render('overview', {
    title: 'My Bookings',
    tours,
  });
});
