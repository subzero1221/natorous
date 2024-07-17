const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const getToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const verifyToken = async (token) =>
  promisify(jwt.verify)(token, process.env.JWT_SECRET);

const createSendToken = (user, statusCode, res) => {
  const token = getToken(user._id);

  const cookieOptions = {
    // give the cookie an expiry date.
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // prevents cookie from being accessed or modified by the browser
    httpOnly: true,
  };

  // in production, only send cookie if its https (encrypted/secure).
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // attach cookie to response object
  // res.cookie('nameOfCookie', dataToSend, cookieOptions);
  res.cookie('jwt', token, cookieOptions);

  // remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const user = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(user, url).sendWelcome();
  createSendToken(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide an email and a password', 400));
  }
  // 2) check if the user exists && password is correct
  // here, email is the field we search by and password is the additional field we need
  // the + tells it that we also need the password
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password, user.password)))
    return next(new AppError('Incorrect email or password', 401));

  // 3) send a token back to the client
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Get token if it exists
  let token;
  const auth = req.headers.authorization;

  if (auth && auth.startsWith('Bearer')) {
    token = auth.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('You are not logged in', 401));

  // 2) Validate token
  const decoded = await verifyToken(token).catch(() =>
    next(new AppError('You are not logged in', 401))
  );

  // 3) Check if the user still exists
  const user = await User.findById(decoded.id);
  if (!user) return next(new AppError('User no longer exists', 401));

  // 4) Check if the user changed password since the token was issued
  if (user.changedPasswordAfter(decoded.iat))
    return next(new AppError('Password has changed, login again', 401));

  // grant access
  req.user = user;
  res.locals.user = user;
  next();
});

// Logout

exports.logout = (req, res) => {
  // res.cookie('jwt', 'loggedout', {
  //   expires: new Date(Date.now() + 10 * 1000),
  //   httpOnly: true,
  // });
  res.clearCookie('jwt');
  res.status(200).json({
    status: 'success',
  });
};

// NOTES: check login state for rendered pages. No errors.
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      const token = req.cookies.jwt;
      // 1) Validate cookie
      const decoded = await verifyToken(token);
      // 2) Check if the user still exists
      const user = await User.findById(decoded.id);
      if (!user) return next();
      // 3) Check if the user changed password since the token was issued
      if (user.changedPasswordAfter(decoded.iat)) return next();
      // 4) grant access
      res.locals.user = user; // make the user available to pug
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // req.user exists because we add it in the protect middleware
    if (!roles.includes(req.user.roles)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with that email', 404));
  }
  // create reset token
  const resetToken = user.getPasswordResetToken();
  // validateBeforeSave stops the validation of data when saving.
  // this will try to save it in the same way as a new user so the validations will fail otherwise.
  await user.save({ validateBeforeSave: false });

  try {
    // create password reset url with token.
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/reset-password/${resetToken}`;

    await new Email(user, resetUrl).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return new AppError('Email could not be sent', 500);
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // get user based on reset token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // set new password if the token is valid & user ex
  if (!user)
    return next(
      new AppError('Password reset token is invalid or has expired', 400)
    );

  user.password = req.body.password;
  user.passwordConfirmation = req.body.passwordConfirmation;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // update password change date on user
  // log user in
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get the user from the collection
  const { id } = req.user;
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = await User.findById(id).select('+password');

  // check if the password is correct
  if (!user || !(await user.matchPassword(currentPassword, user.password)))
    return next(new AppError('Current password incorrect', 401));

  // update the password
  user.password = newPassword;
  user.passwordConfirmation = confirmNewPassword;

  await user.save();

  // log the user in

  createSendToken(user, 200, res);
});
