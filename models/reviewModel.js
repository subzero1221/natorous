const mongoose = require('mongoose');
const Tour = require('./tourModel');
// const User = require('./userModel');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Rating is required'],
    },
    message: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// calculating number of reviews and average rating for tours.
// async because aggregate returns a promise.
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // match reviews where the tour field matches the tourId passed in as an argument.
    },
    {
      $group: {
        _id: '$tour', // group by the tour field
        nRating: { $sum: 1 }, // add 1 for each review found
        avgRating: { $avg: '$rating' }, // average all of the rating fields
      },
    },
  ]);
  // the resolved aggretate promise is an array of objects containing our results
  // [{_id:... , nRating: x, avgRating: y}] - if we did this for all tours each tour would be an object in the array.
  // persist results to the tours collection.

  if (stats.length) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};
// set up a post-save middleware hook that calls on the calcAverageRatings static
// post middleware does not get access to next().
reviewSchema.post('save', function () {
  // affects current review being saved
  // this.constructor gives us access to the methods added to the model through statics / instance methods.
  this.constructor.calcAverageRatings(this.tour);
});

// no document middleware available for editing / deleting a review. No access to the document
// no access to the doc in a pre-query hook as the query hasn't executed yet
// need to use a post-query hook to gain access to the doc.

reviewSchema.post(/^findOneAnd/, async (doc) => {
  if (doc) await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;

// -----[ old code ]

// need access to the current document to extract the tour ID.
// the hooks used to edit / delete are findByIdAndUpdate, and findByIdAndDelete
// these are both mongoose short-hands for the original findOneAndUpdate, and findOneAndDelete

// reviewSchema.pre(/^findOneAnd/, async function (next) {
//   // execute the query to give us the document we need
//   // save it as a property on 'this' so that it's available to post-middleware
//   this.r = await this.findOne();
//   next();
// });

// reviewSchema.post(/^findOneAnd/, async () => {
//   await this.r.constructor.calcAverageRatings(this.r.tour);
// });
