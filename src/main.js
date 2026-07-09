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
  var config = snakeSkinConfigs[resolvedSkinNumber]
  var basePath = './assets/' + config.folder + '/' + config.prefix
  var skinImages = []

  selectedSnakeSkin = resolvedSkinNumber
  wormHeadImage = new Image()
  wormTailImage = new Image()
  wormBodyImages = []

  wormHeadImage.src = basePath + '-head.png'
  wormTailImage.src = basePath + '-tail.png'
  skinImages.push(wormHeadImage, wormTailImage)

  for (var bodyIndex = 1; bodyIndex <= config.bodyCount; bodyIndex++) {
    var bodyImage = new Image()
    bodyImage.src = basePath + '-body' + bodyIndex + '.png'
    wormBodyImages.push(bodyImage)
    skinImages.push(bodyImage)
  }

  try {
    window.localStorage.setItem('slitherNSlashPlayerSkin', String(selectedSnakeSkin))
  } catch (error) {}

  setupHeroSnakePreview()
  return Promise.all(skinImages.map(waitForPlayerSkinImage)).then(function () {
    drawHeroSnakePreview()
  })
}

function loadTreeSnakeSkin(skinNumber) {
  var resolvedSkinNumber = snakeSkinConfigs[Number(skinNumber)] ? Number(skinNumber) : 1
  var config = snakeSkinConfigs[resolvedSkinNumber]
  var basePath = './assets/' + config.folder + '/' + config.prefix
  var skinImages = []

  treeSnakeSkinNumber = resolvedSkinNumber
  treeSnakeHeadImage = new Image()
  treeSnakeTailImage = new Image()
  treeSnakeBodyImages = []

  treeSnakeHeadImage.src = basePath + '-head.png'
  treeSnakeTailImage.src = basePath + '-tail.png'
  skinImages.push(treeSnakeHeadImage, treeSnakeTailImage)

  for (var bodyIndex = 1; bodyIndex <= config.bodyCount; bodyIndex++) {
    var bodyImage = new Image()
    bodyImage.src = basePath + '-body' + bodyIndex + '.png'
    treeSnakeBodyImages.push(bodyImage)
    skinImages.push(bodyImage)
  }

  return Promise.all(skinImages.map(waitForPlayerSkinImage))
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
