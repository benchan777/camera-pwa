import { db } from './database.js';
import { model } from './model.js';

const video = document.querySelector('video');
const canvas = document.querySelector('canvas');

const names = ['pharynx', '', 'tonsil', 'tongue', 'uvula']
let track;

// Function that starts the video stream with input constraints, then displays it on the page
const startVideo = async (constraints) => {
  // Ensure model is loaded before allowing video stream to start
  if (!model) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  track = stream.getVideoTracks()[0]
  const cameraCapabilities = track.getCapabilities();
  // console.log(cameraCapabilities)
  const currentCameraSettings = track.getSettings();

  // Get current camera settings on button click
  document.getElementById('current-settings').onclick = () => {
    const settingsInfo = document.createElement('p');
    settingsInfo.innerText = `Current focus level: ${track.getSettings().focusDistance} // Current zoom level: ${track.getSettings().zoom}`
    document.body.appendChild(settingsInfo)
    console.log(track.getSettings())
  }

  const zoomInput = document.getElementById('zoom')
  const focusInput = document.getElementById('focus')

  // Add Zoom capabilities to the slider
  if ('zoom' in currentCameraSettings) {
    zoomInput.min = cameraCapabilities.zoom.min;
    zoomInput.max = cameraCapabilities.zoom.max;
    zoomInput.step = cameraCapabilities.zoom.step;
    zoomInput.value = currentCameraSettings.zoom;
    zoomInput.oninput = (event) => {
      track.applyConstraints({
        advanced: [{ zoom: event.target.value }]
      })
    }
  } else { // Hide zoom slider if zoom capabilities don't exist
    document.getElementById('zoom').style.display = 'none';
    console.log('This camera does not have zoom capabilities.')
  }

  // Add focus distance capabilities to the slider
  if ('focusDistance' in currentCameraSettings) {
    focusInput.min = cameraCapabilities.focusDistance.min;
    focusInput.max = cameraCapabilities.focusDistance.max;
    focusInput.step = cameraCapabilities.focusDistance.step;
    focusInput.value = currentCameraSettings.focusDistance;
    focusInput.oninput = event => {
      track.applyConstraints({
        advanced: [{ focusMode: 'manual', focusDistance: event.target.value }]
      })
    }
  } else { // Hide focus slider if focus capabilities don't exist
    document.getElementById('focus').style.display = 'none';
    console.log('This camera does not have focusDistance capabilities.')
  }

  video.srcObject = stream;
  video.setAttribute("playsinline", true);
  video.addEventListener('loadedmetadata', setCanvas); // Set canvas overlay to match video resolution
  video.addEventListener('loadeddata', objectDetection); // Begin object detection after video has loaded

  // Turn on flashlight
  track.applyConstraints({
    advanced: [{ torch: true }]
  })
    .catch(err => {
      document.getElementById('errorMessage').innerHTML = `Unable to turn on flashlight. Error message: ${err}`
    })
};

// Set canvas height and width to match video stream so that it overlays properly
const setCanvas = () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
};

// Draw information returned from tensorflow onto canvas overlay
const drawCanvas = (x, y, width, height, object, score) => {
  const ctx = canvas.getContext('2d');
  let boxColor;

  // Change box color depending on detected object
  if (object == 'pharynx') {
    boxColor = 'yellow';
  } else if (object == 'tonsil') {
    boxColor = 'blue';
  } else if (object == 'uvula') {
    boxColor = 'green';
  } else if (object == 'tongue') {
    boxColor = 'white';
  } else {
    boxColor = 'red';
  }

  // Offset dimension values by 50% to reduce box size a bit
  ctx.beginPath();
  ctx.strokeStyle = boxColor;
  ctx.rect(x + (width * 0.25), y + (height * 0.25), width * 0.5, height * 0.5);
  ctx.fillStyle = boxColor;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(x + (width * 0.25), y + (height * 0.25), width * 0.5, height * 0.5);
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = boxColor;
  ctx.fillText(`${object} - ${Math.round(parseFloat(score) * 100)}%`, x + (width * 0.25), y + (width * 0.25))
  ctx.stroke();
};

// Function that can take a full resolution photo with the camera
const takePhoto = () => {
  return new Promise((resolve, reject) => {
    const imageCapture = new ImageCapture(track);

    imageCapture.takePhoto()
      .then(blob => {
        resolve(blob)
      })
      .catch(error => {
        reject(error)
      })
  })
};

// Function that adds images to IndexedDB with a corresponding key
const addItem = (key, image) => {
  let transaction = db.transaction('images', 'readwrite'); // create new transaction object from 'images' objectStore. allow read/write
  let store = transaction.objectStore('images');
  let request = store.add(image, key);

  request.onerror = event => {
    console.log(event)
    console.log('Error', event.target.error.name);
  };

  request.onsuccess = event => {
    console.log('Item added to database successfully!')
  }
};

// Function that retrieves all images from the database and appends them onto the page
const getItem = () => {
  let transaction = db.transaction('images', 'readonly');
  let store = transaction.objectStore('images');
  let request = store.getAll();

  request.onerror = event => {
    console.log(event)
    console.log(`Error. Failed to get items. ${event}`)
  }

  request.onsuccess = event => {
    let imageArray = event.target.result
    for (let i = 0; i < imageArray.length; i++) {
      document.getElementById('img-gal').innerHTML += 
      '<div class="gallery">\n' +
        `<a target="_blank" href="${URL.createObjectURL(imageArray[i])}">\n` +
          `<img src="${URL.createObjectURL(imageArray[i])}" width="50%" height="auto">\n` +
        '</a>\n' +
      '</div>\n'
    }
  }
};

// Function to clear IndexedDB
const clearDb = () => {
  return new Promise((resolve, reject) => {
    let transaction = db.transaction('images', 'readwrite');
    let store = transaction.objectStore('images');
    let request = store.clear();

    request.onerror = event => {
      console.log('failed to clear db', event)
      reject(event);
    }

    request.onsuccess = event => {
      console.log('IndexedDB cleared successfully!')
      resolve(event);
    }
  })
};

// New object detection function for new model format
const objectDetection = () => {
  // Convert video frames to tensors so that TF can analyze them
  const tensors = tf.tidy(() => {
    const input = tf.browser.fromPixels(video)
    return input.div(255.0).expandDims(0).toFloat()
  });

  model.executeAsync(tensors)
    .then(predictions => {
      // Clear previously drawn boxes
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const [boxes, valid_detections, scores, classes] = predictions;

      for (let i = 0; i < valid_detections.dataSync()[0]; i++) {
        let [x1, y1, x2, y2] = boxes.dataSync().slice(i * 4, (i + 1) * 4);
        const objectName = names[classes.dataSync()[i]];
        const score = scores.dataSync()[i];

        if (score > 0.20) {
          const xCoordinate = x1 * 255;
          const yCoordinate = y1 * 255;
          const boxWidth = x2 * 255;
          const boxHeight = y2 * 255;

          drawCanvas(xCoordinate, yCoordinate, boxWidth, boxHeight, objectName, score)
        }
      }
    })
    .catch(error => {
      // Ensure previous boxes around detected object are removed even if no object is detected
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

  tf.dispose(tensors) // Remove old tensors to prevent memory leak
  window.requestAnimationFrame(objectDetection) // Call function again to loop
};

export {
  startVideo, setCanvas, drawCanvas, 
  takePhoto, addItem, getItem,
  clearDb, objectDetection, track
};