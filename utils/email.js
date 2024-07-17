const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Leon Lonsdale ${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // sendgrid
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASS,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    // === Send email
    // 1. Render HTML for email based on PUG template
    const html = pug.renderFile(
      `${__dirname}/../views/emails/${template}.pug`,
      {
        firstName: this.firstName,
        url: this.url,
        subject,
      }
    );
    // 2. Define email options

    const mailOptions = {
      from: this.from, // sender address
      to: this.to, // list of receivers
      subject, // Subject line
      text: htmlToText.convert(html), // plain text body
      html, // html body
    };
    // 3. Create transport and send email
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to Natours');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Password reset request');
  }
};

// const sendEmail = async (options) => {
//   // create reusable transporter object using the default SMTP transport
//   const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });

//   // Define email options
//   const mailOptions = {
//     from: 'leon.dev@icloud.com', // sender address
//     to: options.email, // list of receivers
//     subject: options.subject, // Subject line
//     text: options.message, // plain text body
//     // html: options.html, // html body
//   };

//   // Send the email
//   await transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
