// Bootstrap the fully defined game after all deferred subsystem scripts load.

wormHeadImage.src = './assets/snake_head.png'
wormBodyImage.src = './assets/snake_body.png'
highScore = getHighScore()
setupHeroSnakePreview()

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
settingsPauseButton.addEventListener('click', toggleGamePlayback)
gameModePauseButton.addEventListener('click', toggleGamePlayback)

setupSiteControls()
