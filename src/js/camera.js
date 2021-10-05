/*
 * Currently loading tensorflow in index.html.
 * Otherwise, it can be installed via:
 * $ npm install @tensorflow/tfjs
 * and imported in this file via:
 * import * as tf from '@tensorflow/tfjs'
 */

const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
const liveVideo = document.getElementById('liveVideo')

let cameraOn = false;
let imageCapture;
let model = undefined;
let children = [];
let imageCount = 0;
let deferredPrompt;

const names = ['pharynx', '', 'tonsil', 'tongue', 'uvula']

// Triggers browser to prompt user to install the PWA
// Save event deferred event in case user doesn't take default install prompt
// and wants to install at a later time. (Doesn't work on iOS)
window.addEventListener('beforeinstallprompt', e => {
  deferredPrompt = e;
});

