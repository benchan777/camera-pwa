let model;

tf.loadGraphModel('./model/model.json', {
  onProgress: progress => {
    // Updating progress bar
    let value = Math.round(parseFloat(progress) * 100)
    document.getElementById('model_prog').setAttribute('aria-valuenow', value)
    document.getElementById('model_prog').style.width = `${value}%`
  }
})
  .then(loadedModel => {
    model = loadedModel;
  })

// Hiding progress bar and enabling 'play' and 'view' buttons after model has loaded
setTimeout(function(){ 
  document.getElementById('model_prog_main').style.display = 'none'
  document.getElementById('play').disabled = false
  document.getElementById('view').disabled = false

}, 500)

export { model };
