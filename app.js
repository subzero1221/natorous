/* eslint-disable no-console */
// [Imports] ==============================================================
const path = require('path');

const express = require('express');

const app = express();
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const enforce = require('express-sslify');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const { webhookCheckout } = require('./controllers/bookingController');

// [ Template Engine ] ====================

app.set('view engine', 'pug'); // comes built-in
app.set('views', path.join(__dirname, 'views'));

// [Global Middleware] ===========================================================
// serve static files
app.use(express.static(path.join(__dirname, 'public'))); // public files include HTML, CSS, etc. Use this to allow access to these files from browser.
// trust proxies
app.enable('trust proxy');

// force https in production
if (process.env.NODE_ENV === 'production') app.use(enforce.HTTPS());

//CORS NOTES app.use(cors()) works for 'simple requests' -> get, post
// 'Non-simple requests: put, patch, delete, or requests that send cookies or use non-standard headers.
// Non-simple require pre-flight phase.
app.use(cors());
// 'Non-simple requests: put, patch, delete, or requests that send cookies or use non-standard headers.
// Non-simple require pre-flight phase -> before the real request, browser does an 'options' request to make sure the real request is safe
// so we need to respond to the options request - which is another http request. When we get an options request, we need to send back the same
// access control allow origin header, so the browser knows the request is safe to perform.
app.options('*', cors()); // use on all routes, but can specify a route (replace *)

// Set security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'worker-src': ['blob:'],
        'child-src': ['blob:', 'https://js.stripe.com/'],
        'img-src': ["'self'", 'data: image/webp'],
        'script-src': [
          "'self'",
          'https://api.mapbox.com',
          'https://cdnjs.cloudflare.com',
          'https://js.stripe.com/v3/',
          "'unsafe-inline'",
        ],
        'connect-src': [
          "'self'",
          'ws://localhost:*',
          'ws://127.0.0.1:*',
          'http://127.0.0.1:*',
          'http://localhost:*',
          'https://*.tiles.mapbox.com',
          'https://api.mapbox.com',
          'https://events.mapbox.com',
        ],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Development logging middleware
// console.log(`Starting app. Mode: ${process.env.NODE_ENV}`);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// limit requests from same IP
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // time window in milliseconds

  message: 'Too many requests from this IP, please try again in an hour',
});
app.use('/api', limiter);

// stripe checkout webhook
// NOTES use this here instead of bookingRouter, because we need the body in raw form:
// we do not want the body parsed to json - which the next line in this file will do.
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  webhookCheckout
);

// body parser
app.use(express.json({ limit: '10kb' })); // adds data from body to request object
// cookie parser
app.use(cookieParser());
// forms
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// data sanitisation against noSQL query injection
app.use(mongoSanitize());
// data sanitisation against XSS
app.use(xss());
// prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'price',
      'maxGroupSize',
      'difficulty',
    ],
  })
);

app.use(compression());
// [Routing] ==============================================================

// mount the routers

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// catch unhandled routes
app.all('*', (req, res, next) => {
  // if an argument is passed to next, express will assume that it is an error and trigger the error middleware
  next(new AppError(`${req.originalUrl} not found`, 404));
});

// by providing 4 argments, Express will automatically know that the middleware is for error handling.
app.use(globalErrorHandler);

// [Exports] ==============================================================

module.exports = app;
