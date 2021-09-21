// const cameraControls = document.querySelector('.video-controls');
const video = document.querySelector('video');
const img = document.querySelector('img');
// const screenshot = document.querySelector('.save-image')
// const buttons = [...cameraControls.querySelectorAll('button')];
// const [play, pause, saveImage, viewPhotos] = buttons;
// const play = document.getElementById('play');
// const pause = document.getElementById('pause');
// const saveImage = document.getElementById('save-image');
// const viewPhotos = document.getElementById('view');
// const installApp = document.getElementById('installApp');

let cameraOn = false;
let imageCapture;
let model = undefined;
let children = [];
let imageCount = 0;
let deferredPrompt;

const names = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
               'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
               'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
               'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
               'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
               'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
               'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
               'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
               'hair drier', 'toothbrush']

// Triggers browser to prompt user to install the PWA
// Save event deferred event in case user doesn't take default install prompt
// and wants to install at a later time. (Doesn't work on iOS)
window.addEventListener('beforeinstallprompt', e => {
  deferredPrompt = e;
});

// DATABASE SETUP
// Creates new database with the name 'image_db' and set version to 1
let openRequest = indexedDB.open('image_db', 1);
let db;

// Check if opened database already has an objectstore. If not, create one
openRequest.onupgradeneeded = event => {
  let db = event.target.result; // assign opened databse to db variable

  // Create ObjectStore with the name 'images' and key set as 'name' if it doesn't already exist
  if (!db.objectStoreNames.contains('images')) {
    const storeOS = db.createObjectStore('images');
  }
};

openRequest.onsuccess = event => {
  console.log('db opened successfully');
  db = event.target.result;
};

openRequest.onerror = event => {
  console.log(event)
  document.getElementById('errorMessage').innerHTML = `Unable to open IndexedDB. Error message: ${event}`
};

// Load coco-ssd (object detection model) 
// cocoSsd.load()
// .then( loadedModel => {
//   model = loadedModel;
//   document.getElementById('information').innerHTML = 'Model has been loaded! You can now start the camera.'
// })

// Load yolov5 model
tf.loadGraphModel('/get-model')
.then( loadedModel => {
  model = loadedModel;
  document.getElementById('information').innerHTML = 'Model has been loaded! You can now start the camera.'
})

// Function that starts the video stream with input constraints, then displays it on the page
const startVideo = async (constraints) => {
  // Ensure model is loaded before allowing video stream to start
  if (!model) {
      return;
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const track = stream.getVideoTracks()[0]
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
  video.addEventListener('loadeddata', objectDetection);
  // video.addEventListener('loadeddata', predictWebcam);

  // Turn on flashlight
  track.applyConstraints({
    advanced: [{ torch: true }]
  })
  .catch( err => {
    document.getElementById('errorMessage').innerHTML = `Unable to turn on flashlight. Error message: ${err}`
  })
}

// Function that can take a full resolution photo with the camera
const takePhoto = () => {
  return new Promise( (resolve, reject) => {
    if (imageCount > 1) { // Number of photos to take before stopping
      imageCount = 0;
      document.getElementById('information').innerHTML = 'All images have been taken. Click on the View Photos button to view them!'
      return
    }

    navigator.mediaDevices.enumerateDevices()
    .then( devices => {
      const cameras = devices.filter( device => device.kind === 'videoinput');
      const camera = cameras[cameras.length - 1];
  
      const videoConstraints = {
        video: {
          deviceId: camera.deviceId,
          facingMode: 'environment'
        }
      }
  
      navigator.mediaDevices.getUserMedia(videoConstraints)
      .then( stream => {
        video.srcObject = stream;
        const track = stream.getVideoTracks()[0];
  
        // Create new ImageCapture object which can be used to take a full resolution photo
        imageCapture = new ImageCapture(track);
  
        imageCapture.takePhoto()
        .then( blob => {
          resolve(blob)
        })
        .catch( error => {
          reject(error)
        })
      })
      .catch( error => {
        reject(error)
      })
    })
    .catch( error => {
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
    for (let i = 0; i < imageArray.length; i ++) {
      const img = document.createElement('IMG');
      img.src = URL.createObjectURL(imageArray[i]);
      document.body.appendChild(img);
    }
  }
};

// Function to clear IndexedDB
const clearDb = () => {
  return new Promise( (resolve, reject) => {
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

const tfTest = () => {
  const tonsil = document.getElementById('tonsil');
  const input = tf.image.resizeBilinear(tf.browser.fromPixels(tonsil), [320, 320]).div(255.0).expandDims().toFloat();
  model.executeAsync(input)
  .then( predictions => {
    // const [boxes, scores, classes, valid_detections] = predictions;
    const [valid_detections, boxes, classes, scores] = predictions;
    // console.log(predictions)
    console.log(boxes.dataSync())
    console.log(scores.dataSync())
    console.log(classes.dataSync())
    console.log(valid_detections.dataSync())
    // for (let i = 0; i < valid_detections.dataSync()[0]; i ++) {
    //   let [x1, y1, x2, y2] = boxes.dataSync().slice(i * 4, (i + 1) * 4);
    //   // const objectName = names[classes.dataSync()[i]];
    //   const objectName = classes.dataSync()[i];
    //   const score = scores.dataSync()[i];
      
    //   if(score > 0.01) {
    //     const p = document.createElement('p');
    //     p.innerText = objectName + ' - with '
    //     + Math.round(parseFloat(score) * 100) 
    //     + '% confidence.';
    //     p.style = 'margin-left: ' + x1 + 'px; margin-top: '
    //       + ((y1 * 255) - 10) + 'px; width: ' 
    //       + ((x2 * 255) - 10) + 'px; top: 0; left: 0;';

    //     // Draw box around detected object
    //     const highlighter = document.createElement('div');
    //     highlighter.setAttribute('class', 'highlighter');
    //     highlighter.style = 'left: ' + (x1 * 255) + 'px; top: '
    //       + (y1 * 255) + 'px; width: ' 
    //       + (x2 * 255) + 'px; height: '
    //       + (y2 * 255) + 'px;';

    //     liveVideo.appendChild(highlighter);
    //     liveVideo.appendChild(p);
    //     children.push(highlighter);
    //     children.push(p);
    //   }
    // }
  })
}

// New object detection function for new model format
const objectDetection = () => {
  // Convert video frames to tensors so that TF can analyze them
  const tensors = tf.tidy( () => {
    const input = tf.browser.fromPixels(video)
    return input.div(255.0).expandDims(0).toFloat()
  });
  
  model.executeAsync(tensors)
  .then( predictions => {
    // const [boxes, scores, classes, valid_detections] = predictions; // for original example model
    // const [classes, boxes, valid_detections, scores] = predictions; // for new 640x640 model
    // const [boxes, valid_detections, scores, classes] = predictions; // for new 320x320 model
    const [valid_detections, classes, scores, boxes] = predictions;

    for (let i = 0; i < children.length; i++) {
      liveVideo.removeChild(children[i]);
    }
    children.splice(0);

    for (let i = 0; i < valid_detections.dataSync()[0]; i ++) {
      let [x1, y1, x2, y2] = boxes.dataSync().slice(i * 4, (i + 1) * 4);
      const objectName = names[classes.dataSync()[i]];
      const score = scores.dataSync()[i];
      
      if(score > 0.60) {
        const p = document.createElement('p');
        p.innerText = objectName + ' - with '
        + Math.round(parseFloat(score) * 100) 
        + '% confidence.';
        p.style = 'margin-left: ' + x1 + 'px; margin-top: '
          + ((y1 * 255) - 10) + 'px; width: ' 
          + ((x2 * 255) - 10) + 'px; top: 0; left: 0;';

        // Draw box around detected object
        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.style = 'left: ' + (x1 * 255) + 'px; top: '
          + (y1 * 255) + 'px; width: ' 
          + (x2 * 255) + 'px; height: '
          + (y2 * 255) + 'px;';

        liveVideo.appendChild(highlighter);
        liveVideo.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }
  });
  tf.dispose(tensors)
  window.requestAnimationFrame(objectDetection)
}

// Draws a frame around the subject based on confidence score returned by tensorflow
const predictWebcam = () => {
  // Now let's start classifying a frame in the stream.
  model.detect(video)
  .then( predictions => {
    // console.log(predictions)
    for (let i = 0; i < children.length; i++) {
      liveVideo.removeChild(children[i]);
    }
    children.splice(0);

    // Loop through predictions and draw them to the live view if they
    // have a high confidence score
    for (let n = 0; n < predictions.length; n++ ) {
      if(predictions[n].score > 0.66) {
        // Display name of object detected along with confidence score
        const p = document.createElement('p');
        p.innerText = predictions[n].class  + ' - with ' 
          + Math.round(parseFloat(predictions[n].score) * 100) 
          + '% confidence.';
        p.style = 'margin-left: ' + predictions[n].bbox[0] + 'px; margin-top: '
          + (predictions[n].bbox[1] - 10) + 'px; width: ' 
          + (predictions[n].bbox[2] - 10) + 'px; top: 0; left: 0;';

        // Draw box around detected object
        const highlighter = document.createElement('div');
        highlighter.setAttribute('class', 'highlighter');
        highlighter.style = 'left: ' + predictions[n].bbox[0] + 'px; top: '
          + predictions[n].bbox[1] + 'px; width: ' 
          + predictions[n].bbox[2] + 'px; height: '
          + predictions[n].bbox[3] + 'px;';

        liveVideo.appendChild(highlighter);
        liveVideo.appendChild(p);
        children.push(highlighter);
        children.push(p);
      }
    }

    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
  });
};

// Start video when play button is clicked
document.getElementById('play').onclick = () => {
  if (cameraOn == true) {
      video.play();
      return;
  } 

  // Check if camera exists. If it does, start video stream with set constraints
  if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.enumerateDevices()
    .then( devices => {
      const cameras = devices.filter( device => device.kind === 'videoinput');
      const camera = cameras[cameras.length - 1];

      const videoConstraints = {
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
    })
  } else {
    document.getElementById('errorMessage').innerHTML = 'getUserMedia() is not supported by this browser.'
  }
};

// Pause video stream when pause button is clicked
document.getElementById('pause').onclick = () => {
  // video.pause();
  tfTest();
};

// Display all images located in IndexedDB
document.getElementById('view').onclick = () => {
  // location.href = '/show-photos'
  getItem();
};

// Take full resolution images and save to the database
document.getElementById('save-image').onclick = async () => {  
  takePhoto() // Call function to take full res photo
  .then( photo => {
    imageCount += 1;
    addItem(`image${imageCount}`, photo); // Store image into IndexedDB
    setTimeout( () => {
      document.getElementById('save-image').click(); // Delay 500ms, then take another photo
    }, 1)
  })
  .catch( error => {
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