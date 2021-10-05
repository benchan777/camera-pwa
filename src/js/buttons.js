import { startVideo, takePhoto, addItem, getItem, track } from './functions.js';

const video = document.querySelector('video');
const canvas = document.querySelector('canvas');

let cameraOn = false;
let imageCount = 0;
let deferredPrompt;
let videoConstraints;

// Start video when play button is clicked
document.getElementById('play').onclick = () => {
  if (cameraOn == true) {
    video.play();
    return;
  }

  // Check if camera exists. If it does, start video stream with set constraints
  if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const cameras = devices.filter(device => device.kind === 'videoinput');
        const camera = cameras[cameras.length - 1];

        videoConstraints = {
          video: {
            // These width and height dimensions are specific to the test yolov5 model
            // May need to modify later to be compatible with other models
            width: { exact: 320 },
            height: { exact: 320 },
            deviceId: camera.deviceId,
            facingMode: 'environment',
            zoom: true
          }
        }

        startVideo(videoConstraints);

        document.getElementById('save-image').disabled = false
      })
  } else {
    document.getElementById('errorMessage').innerHTML = 'getUserMedia() is not supported by this browser.'
  }
};

// Pause video stream when pause button is clicked
document.getElementById('pause').onclick = () => {
  video.pause();
  // tfTest();
};

// Display all images located in IndexedDB
document.getElementById('view').onclick = () => {
  getItem();
  video.pause()

  // Only attempt to turn of flashlight if the video stream was on in the first place
  if (track) {
    track.applyConstraints({
      advanced: [{ torch: false }]
    })
      .catch(err => {
        document.getElementById('errorMessage').innerHTML = `Unable to turn off flashlight. Error message: ${err}`
      })
  }

  document.getElementById('save-image').disabled = true
};

// Clear any old images from modal to prevent duplicates
$('#imagesModal').on('hidden.bs.modal', function (e) {
  document.getElementById('img-gal').innerHTML = ''
})

// Take full resolution images and save to the database
document.getElementById('save-image').onclick = async () => {
  takePhoto() // Call function to take full res photo
    .then(photo => {
      imageCount += 1;
      addItem(`image${imageCount}`, photo); // Store image into IndexedDB

      // Video stream has new constraints after taking full resolution photo that may
      // cause errors. Manually start video stream again with proper constraints for
      // proper object detection
      startVideo(videoConstraints);
    })
    .catch(error => {
      document.getElementById('errorMessage').innerHTML = `Error at :${error}`
      console.log(error)
    })
};

// Install the PWA
document.getElementById('installApp').onclick = async () => {
  if (deferredPrompt !== null) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
    }
  }
};
