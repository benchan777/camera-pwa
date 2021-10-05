// DATABASE SETUP
// Creates new database with the name 'image_db' and set version to 1
let openRequest = indexedDB.open('image_db', 1);
let db;

// Check if opened database already has an objectstore. If not, create one
openRequest.onupgradeneeded = event => {
  let db = event.target.result; // assign opened databse to db variable

  // Create ObjectStore with the name 'images' and key set as 'name' if it doesn't already exist
  if (!db.objectStoreNames.contains('images')) {
    db.createObjectStore('images');
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

export { db };
