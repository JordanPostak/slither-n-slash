// Bootstrap the fully defined game after all deferred subsystem scripts load.

var snakeSkinConfigs = {
  1: { folder: 'Snake1', prefix: 'snake1', bodyCount: 5 },
  2: { folder: 'Snake2', prefix: 'snake2', bodyCount: 4 },
  3: { folder: 'Snake3', prefix: 'snake3', bodyCount: 5 },
  4: { folder: 'Snake4', prefix: 'snake4', bodyCount: 6 },
  5: { folder: 'Snake5', prefix: 'snake5', bodyCount: 5 },
}

function loadPlayerSnakeSkin(skinNumber) {
  var resolvedSkinNumber = snakeSkinConfigs[Number(skinNumber)] ? Number(skinNumber) : 1
  var loadedSkin = loadSnakeSkinImages(resolvedSkinNumber)

  selectedSnakeSkin = resolvedSkinNumber
  wormHeadImage = loadedSkin.head
  wormTailImage = loadedSkin.tail
  wormBodyImages = loadedSkin.bodies

  try {
    window.localStorage.setItem('slitherNSlashPlayerSkin', String(selectedSnakeSkin))
  } catch (error) {}

  setupHeroSnakePreview()
  return Promise.all(loadedSkin.images.map(waitForPlayerSkinImage)).then(function () {
    drawHeroSnakePreview()
  })
}

function loadTreeSnakeSkin(skinNumber) {
  var resolvedSkinNumber = snakeSkinConfigs[Number(skinNumber)] ? Number(skinNumber) : 1
  var loadedSkin = loadSnakeSkinImages(resolvedSkinNumber)

  treeSnakeSkinNumber = resolvedSkinNumber
  treeSnakeHeadImage = loadedSkin.head
  treeSnakeTailImage = loadedSkin.tail
  treeSnakeBodyImages = loadedSkin.bodies

  return Promise.all(loadedSkin.images.map(waitForPlayerSkinImage))
}

function loadSnakeSkinImages(skinNumber) {
  var config = snakeSkinConfigs[skinNumber]
  var basePath = './assets/' + config.folder + '/' + config.prefix
  var headImage = new Image()
  var tailImage = new Image()
  var bodyImages = []
  var skinImages = [headImage, tailImage]

  headImage.src = basePath + '-head.png'
  tailImage.src = basePath + '-tail.png'

  for (var bodyIndex = 1; bodyIndex <= config.bodyCount; bodyIndex++) {
    var bodyImage = new Image()
    bodyImage.src = basePath + '-body' + bodyIndex + '.png'
    bodyImages.push(bodyImage)
    skinImages.push(bodyImage)
  }

  return {
    head: headImage,
    tail: tailImage,
    bodies: bodyImages,
    images: skinImages,
  }
}

function waitForPlayerSkinImage(image) {
  if (image.complete) return Promise.resolve()

  return new Promise(function (resolve) {
    image.addEventListener('load', resolve, { once: true })
    image.addEventListener('error', resolve, { once: true })
  })
}

function loadCentipedeSprites() {
  centipedeHeadImage = new Image()
  centipedeBodyImage = new Image()
  centipedeTailImage = new Image()

  centipedeHeadImage.src = './assets/centipede-head.png'
  centipedeBodyImage.src = './assets/centipede-body.png'
  centipedeTailImage.src = './assets/centipede-tail.png'
}

function loadFoodSprites() {
  mouseImage = new Image()
  mealWormImage = new Image()
  blisterBeetleImage = new Image()

  mouseImage.src = './assets/mouse.png'
  mealWormImage.src = './assets/meal-worm.png'
  blisterBeetleImage.src = './assets/blister-beetle.png'
}

function getSavedPlayerSnakeSkin() {
  try {
    var storedSkin = Number(window.localStorage.getItem('slitherNSlashPlayerSkin'))
    if (snakeSkinConfigs[storedSkin]) return storedSkin
  } catch (error) {}

  return 1
}

selectedSnakeSkin = getSavedPlayerSnakeSkin()
loadPlayerSnakeSkin(selectedSnakeSkin)
loadTreeSnakeSkin(treeSnakeSkinNumber)
loadCentipedeSprites()
loadFoodSprites()
highScore = getHighScore()

canvas = document.getElementById('myCanvas')
var gameStage = document.querySelector('.game-stage')
resizeCanvas()

window.addEventListener('resize', function () {
  resizeCanvas()
  drawHeroSnakePreview()
})

var playSnakeGameBtn = document.getElementById('game-toggle')
var snakeGamePanel = document.querySelector('.snake-game-panel')
var settingsPauseButton = document.getElementById('settings-pause-button')
var gameModePauseButton = document.getElementById('game-mode-pause-button')

playSnakeGameBtn.addEventListener('click', handlePrimaryGameToggle)
settingsPauseButton.addEventListener('click', handlePrimaryGameToggle)
gameModePauseButton.addEventListener('click', handlePrimaryGameToggle)

setupSiteControls()
