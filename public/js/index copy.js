/* eslint-disable */

import { displayMap } from './mapbox.js';
import { login } from './login';

// DOM

const mapBox = document.getElementById('map');
const loginForm = document.querySelector('form');

// VALUES

const email = document.getElementById('email').value;
const password = document.getElementById('password').value;

if (mapBox) {
  const locations = JSON.parse(mapBox.dataset.locations);
  displayMap(locations);
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    login(email, password);
  });
}
