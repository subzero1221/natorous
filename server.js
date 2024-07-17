/* eslint-disable no-console */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' }); // must be before importing the app file.
const app = require('./app');

process.on('uncaughtException', (err) => {
  console.log('---[ Error: Uncaught Exception ]---');
  console.log('Error type:', err.name);
  console.log('Error reason:', err.message);
  console.log('Stack', err.stack);
  console.log('--[ Shutting down ]---');
  process.exit(1);
});

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

async function main() {
  await mongoose.connect(DB).then(() => console.log('Connected to database'));
}
main();

const port = process.env.PORT || 8080;

const server = app.listen(port, () => console.log(`App running on ${port}`));

process.on('unhandledRejection', (err) => {
  console.log('---[ Error: Unhandled Rejection ]---');
  console.log('Error type:', err.name);
  console.log('Error reason:', err.message);
  console.log('--[ Shutting down ]---');
  server.close(() => process.exit(1));
});

// NOTES sigterm handling

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});
