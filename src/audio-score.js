// Sound synthesis, audio effects, score display, and local high-score storage.

function playSound(id) {
  if (!soundEnabled) return

  if (id === 'goodFoodSound') {
    playGameSound('eat')
    return
  }

  if (id === 'badFoodSound') {
    playGameSound('hurt')
    return
  }

  var sound = document.getElementById(id)
  if (!sound) return

  sound.currentTime = 0
  sound.play().catch(function () {})
}

function playGameSound(type) {
  if (!soundEnabled) return

  prepareGameAudio()
  if (!gameAudioContext) return

  gameAudioContext.resume().catch(function () {})

  if (type === 'eat') {
    playGameTone(260, 430, 0.1, 'sine', 0.15, 0)
    playGameTone(390, 660, 0.12, 'triangle', 0.13, 0.045)
    playGameTone(520, 780, 0.1, 'sine', 0.08, 0.105)
  } else if (type === 'hurt') {
    playGameTone(138, 44, 0.28, 'sawtooth', 0.22, 0)
    playGameTone(78, 34, 0.22, 'triangle', 0.15, 0.035)
    playGameTone(42, 28, 0.18, 'sine', 0.09, 0)
  }
}

function prepareGameAudio() {
  if (!soundEnabled) return

  if (gameAudioContext) return

  var AudioContextConstructor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextConstructor) return

  gameAudioContext = new AudioContextConstructor()
  rivalAudioContext = gameAudioContext
  gameAudioContext.resume().catch(function () {})
}

function playGameTone(startFrequency, endFrequency, duration, type, volume, delay) {
  if (!gameAudioContext) return

  var startAt = gameAudioContext.currentTime + delay
  var oscillator = gameAudioContext.createOscillator()
  var gain = gameAudioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, startAt)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), startAt + duration)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  oscillator.connect(gain)
  gain.connect(gameAudioContext.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.03)
}

function playRivalSound(type) {
  if (!soundEnabled) return

  prepareGameAudio()
  if (!rivalAudioContext) return

  rivalAudioContext.resume().catch(function () {})

  if (type === 'bite') {
    playRivalTone(150, 82, 0.16, 'sawtooth', 0.13)
    playRivalTone(92, 58, 0.2, 'square', 0.06)
  } else if (type === 'hurt') {
    playRivalTone(520, 310, 0.12, 'triangle', 0.1)
    playRivalTone(760, 420, 0.08, 'square', 0.045)
  } else if (type === 'burn') {
    playRivalTone(240, 54, 0.36, 'sawtooth', 0.11)
    playRivalTone(118, 42, 0.28, 'square', 0.055)
  } else {
    playRivalTone(360, 190, 0.1, 'square', 0.06)
  }
}

function playRivalTone(startFrequency, endFrequency, duration, type, volume) {
  if (!rivalAudioContext) return

  var now = rivalAudioContext.currentTime
  var oscillator = rivalAudioContext.createOscillator()
  var gain = rivalAudioContext.createGain()

  oscillator.type = type
  oscillator.frequency.setValueAtTime(startFrequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

  oscillator.connect(gain)
  gain.connect(rivalAudioContext.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.03)
}

function updateHighScore(nextScore) {
  if (nextScore > highScore) {
    setHighScore(nextScore)
  }
}

function getHighScore() {
  try {
    var highScore = localStorage.getItem('high-score')
    return highScore ? parseInt(highScore, 10) : 0
  } catch {
    return 0
  }
}

function setHighScore(nextScore) {
  if (nextScore <= highScore) return

  highScore = nextScore
  updateHighScoreDisplay()

  window.clearTimeout(highScoreSaveTimer)
  highScoreSaveTimer = window.setTimeout(persistHighScore, 250)
}

function updateScoreDisplay() {
  if (scoreElement) scoreElement.textContent = score
}

function updateHighScoreDisplay() {
  if (highScoreElement) highScoreElement.textContent = highScore
}

function persistHighScore() {
  window.clearTimeout(highScoreSaveTimer)
  highScoreSaveTimer = undefined

  try {
    localStorage.setItem('high-score', highScore)
  } catch {}
}

window.addEventListener('pagehide', function () {
  if (highScoreSaveTimer) persistHighScore()
})
