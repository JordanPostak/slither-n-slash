var canvas, ctx
var startingSegments = 6
var n = startingSegments
var score = 0
var a = 0
var segLength = 10
var foods = []
var fireball
var nextFireballSpawnAt = 0
var fireballLifetime = 10000
var fireballSpawnMinDelay = 60000
var fireballSpawnMaxDelay = 60000
var fireballMinBeetles = 2
var goldenMouse
var nextGoldenMouseSpawnAt = 0
var goldenMouseLifetime = 12000
var goldenMouseSpawnMinDelay = 150000
var goldenMouseSpawnMaxDelay = 240000
var berserkerDuration = 10000
var berserkerUntil = 0
var berserkerSpeedMultiplier = 1.35
var beetleBurnDuration = 1400
var swallowRadius = 24
var grubLifetime = 30000
var mouseLifetime = 20000
var grubSpawnInterval = 10000
var mouseSpawnInterval = 20000
var beetleSpawnInterval = 15000
var x = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var y = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var steerTarget
var steerAngleTarget
var snakeHead = { x: 0, y: 0 }
var headingAngle = 0
var snakeSpeed = 3.05
var boostMultiplier = 1.85
var mouseFleeRadius = 145
var mouseFleeSpeed = 3.7
var mouseFleeStamina = 1200
var mouseEdgeAvoidance = 70
var arenaCornerRadius = 76
var snakeBodyBounceRadius = 18
var boosting = false
var boostCoolingDown = false
var baseBoostDuration = 500
var boostDurationPerSegment = 45
var maxBoostDuration = 1800
var boostCooldown = 3000
var boostEnergy = baseBoostDuration
var lastBoostUpdateAt = Date.now()
var touchBoosting = false
var pressedKeys = {}
var turnRate = 0.065
var gamepadSteerAngleTarget
var gamepadBoosting = false
var gamepadDeadzone = 0.2
var gamepadMenuButtonPressed = false
var animationRequestId
var foodSpawnIntervalIds = []
var playing = false
var badSnakes = []
var badSnakeStartCount = 1
var badSnakeMaxCount = 4
var badSnakeSpawnInterval = 40000
var badSnakeSpawnIntervalId
var badSnakeStartSegments = 4
var badSnakeBaseSpeed = 1.02
var badSnakeSpeedPerSegment = 0.075
var badSnakePlayerSpeedPerSegment = 0.025
var badSnakeMaxSpeed = 2.35
var badSnakeTurnRate = 0.024
var snakeBiteSegments = 3
var snakeCutCooldown = 1650
var wormHeadImage = new Image()
var wormBodyImage = new Image()
var gameAudioContext
var rivalAudioContext
var scoreElement = document.getElementById('score')
var highScoreElement = document.getElementById('high-score')
var berserkerStatusElement = document.getElementById('berserker-status')
var berserkerTimeElement = document.getElementById('berserker-time')
var lastBerserkerSeconds = -1
var highScore = getHighScore()
var highScoreSaveTimer
var controlsReady = false
var mobileControls = {
  left: false,
  right: false,
  boost: false,
}
var renderScale = 1
var motionScale = 1

// Mobile joystick controls
var joystickActive = false
var joystickTouchId = null
var joystickCurrentX = 0
var joystickCurrentY = 0
var boostTouchActive = false
var boostTouchId = null
var joystickDeadzone = 10 // minimum movement before joystick activates
var joystickBox
var boostBox
var joystickOrigin
var joystickHandle
var boostControlGauges = []
var boostVisualStates = []
var boostMeterFill
var lastBoostVisualUpdateAt = 0
var lastBoostVisualProgress = -1
var lastBoostVisualState = ''
var boostVisualUpdateInterval = 50
var mobileControlMediaQuery

wormHeadImage.src = './assets/snake_head.png'
wormBodyImage.src = './assets/snake_body.png'

canvas = document.getElementById('myCanvas')
var gameStage = document.querySelector('.game-stage')
resizeCanvas()

window.addEventListener('resize', function () {
  resizeCanvas()
})

var playSnakeGameBtn = document.querySelector('.play-snake-game-btn')
var snakeGamePanel = document.querySelector('.snake-game-panel')

playSnakeGameBtn.addEventListener('click', toggleGamePlayback)

function toggleGamePlayback() {
  if (!playing) {
    prepareGameAudio()
    playing = true
    playSnakeGameBtn.innerText = 'Pause'
    document.body.classList.add('is-playing')
    snakeGamePanel.insertBefore(playSnakeGameBtn, snakeGamePanel.children[1])
    init()
  } else {
    playing = false
    playSnakeGameBtn.innerText = 'Resume Game'
    document.body.classList.remove('is-playing')
    cancelAnimationFrame(animationRequestId)
    stopFoodTimer()
    stopBadSnakeTimer()
    resetBoost()
  }
}

function resizeCanvas() {
  var rect = gameStage.getBoundingClientRect()
  canvas.width = Math.max(getCanvasMinSide(), Math.floor(rect.width))
  canvas.height = Math.max(getCanvasMinSide(), Math.floor(rect.height))
  renderScale = getRenderScale()
  motionScale = getMotionScale()
  segLength = 10 * renderScale
  arenaCornerRadius = getArenaCornerRadius()
  snakeBodyBounceRadius = 18 * renderScale
  swallowRadius = 24 * renderScale
  gameStage.style.setProperty('--arena-corner-radius', arenaCornerRadius + 'px')
}

function init() {
  ctx = canvas.getContext('2d')

  if (!controlsReady) {
    setupControls()
    controlsReady = true
  }

  if (snakeHead.x === 0 && snakeHead.y === 0) {
    snakeHead = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    }

    for (var i = 0; i < x.length; i++) {
      x[i] = snakeHead.x - i * segLength
      y[i] = snakeHead.y
    }
  }

  updateHighScoreDisplay()

  if (!nextFireballSpawnAt) {
    scheduleNextFireball()
  }

  if (!nextGoldenMouseSpawnAt) {
    scheduleNextGoldenMouse()
  }

  if (badSnakes.length === 0) {
    spawnBadSnakes()
  }

  startFoodTimer()
  startBadSnakeTimer()
  lastBoostUpdateAt = Date.now()
  requestAnimationFrame(animate)
}

function setupControls() {
  setupTouchJoystick()
  requestAnimationFrame(updateGamepadPauseControl)

  window.addEventListener('keydown', function (evt) {
    if (evt.key === 'Shift' || evt.key === ' ') {
      evt.preventDefault()
      pressedKeys[evt.key] = true
      return
    }

    if (!isMovementKey(evt.key)) return

    evt.preventDefault()
    pressedKeys[evt.key] = true
    steerTarget = undefined
  })

  window.addEventListener('keyup', function (evt) {
    if (evt.key === 'Shift' || evt.key === ' ') {
      evt.preventDefault()
      pressedKeys[evt.key] = false
    }

    if (!isMovementKey(evt.key)) return

    evt.preventDefault()
    pressedKeys[evt.key] = false
  })

  canvas.addEventListener('pointermove', function (evt) {
    if (evt.pointerType !== 'mouse') return

    steerTarget = getPointerPos(canvas, evt.clientX, evt.clientY)
  })

  canvas.addEventListener('pointerleave', function (evt) {
    if (evt.pointerType !== 'mouse') return

    steerTarget = undefined
  })

  window.addEventListener('blur', function () {
    releaseMobileControls()
    releaseGamepadControls()
  })
}

function updateGamepadControls() {
  if (!navigator.getGamepads) return

  var gamepad = getActiveGamepad()

  if (!gamepad) {
    releaseGamepadControls()
    return
  }

  var stickX = gamepad.axes[0] || 0
  var stickY = gamepad.axes[1] || 0
  var stickDistance = Math.sqrt(stickX * stickX + stickY * stickY)

  if (stickDistance > gamepadDeadzone) {
    gamepadSteerAngleTarget = Math.atan2(stickY, stickX)
    steerTarget = undefined
  } else {
    gamepadSteerAngleTarget = undefined
  }

  var boostButton = gamepad.buttons[0]
  gamepadBoosting = Boolean(boostButton && (boostButton.pressed || boostButton.value > 0.5))
}

function updateGamepadPauseControl() {
  var gamepad = getActiveGamepad()
  var menuButton = gamepad && gamepad.buttons[9]
  var menuButtonPressed = Boolean(
    menuButton && (menuButton.pressed || menuButton.value > 0.5)
  )

  if (menuButtonPressed && !gamepadMenuButtonPressed) {
    toggleGamePlayback()
  }

  gamepadMenuButtonPressed = menuButtonPressed
  requestAnimationFrame(updateGamepadPauseControl)
}

function getActiveGamepad() {
  if (!navigator.getGamepads) return

  var gamepads = navigator.getGamepads()

  for (var i = 0; i < gamepads.length; i++) {
    if (gamepads[i] && gamepads[i].connected) {
      return gamepads[i]
    }
  }
}

function releaseGamepadControls() {
  gamepadSteerAngleTarget = undefined
  gamepadBoosting = false
}

function setupTouchJoystick() {
  joystickBox = document.querySelector('[data-mobile-control="joystick"]')
  boostBox = document.querySelector('[data-mobile-control="boost"]')
  joystickOrigin = document.getElementById('joystick-origin')
  joystickHandle = document.getElementById('joystick-handle')
  boostMeterFill = document.getElementById('boost-meter-fill')
  boostControlGauges = document.querySelectorAll('.boost-control-gauge')
  boostVisualStates = document.querySelectorAll('.boost-visual-state')

  if (joystickBox) {
    joystickBox.addEventListener('pointerdown', handleJoystickPointerDown)
    joystickBox.addEventListener('pointermove', handleJoystickPointerMove)
  }

  if (boostBox) {
    boostBox.addEventListener('pointerdown', handleBoostPointerDown)
  }

  document.addEventListener('pointermove', handleActiveTouchPointerMove)
  document.addEventListener('pointerup', handleActiveTouchPointerUp)
  document.addEventListener('pointercancel', handleActiveTouchPointerUp)
}

function handleJoystickPointerDown(evt) {
  if (evt.pointerType === 'mouse' || joystickActive) return

  evt.preventDefault()
  evt.stopPropagation()
  joystickActive = true
  joystickTouchId = evt.pointerId
  joystickCurrentX = evt.clientX
  joystickCurrentY = evt.clientY
  capturePointer(evt.currentTarget, evt.pointerId)
  steerTarget = undefined
  updateJoystickTargetFromPointer(evt.clientX, evt.clientY)
  updateJoystickVisual()
}

function handleJoystickPointerMove(evt) {
  if (evt.pointerId !== joystickTouchId || !joystickActive) return

  evt.preventDefault()
  evt.stopPropagation()
  updateJoystickTargetFromPointer(evt.clientX, evt.clientY)
}

function handleJoystickPointerUp(evt) {
  if (evt.pointerId !== joystickTouchId) return

  evt.preventDefault()
  evt.stopPropagation()
  releaseJoystickControl()
}

function handleBoostPointerDown(evt) {
  if (evt.pointerType === 'mouse' || boostTouchActive) return

  evt.preventDefault()
  evt.stopPropagation()
  boostTouchActive = true
  boostTouchId = evt.pointerId
  boostBox.classList.add('is-pressed')
  capturePointer(evt.currentTarget, evt.pointerId)
  updateBoostMeterStatus(true)
}

function handleBoostPointerUp(evt) {
  if (evt.pointerId !== boostTouchId) return

  evt.preventDefault()
  evt.stopPropagation()
  releaseBoostControl()
}

function handleActiveTouchPointerMove(evt) {
  if (evt.pointerId === joystickTouchId) {
    handleJoystickPointerMove(evt)
  }
}

function handleActiveTouchPointerUp(evt) {
  if (evt.pointerId === joystickTouchId) {
    handleJoystickPointerUp(evt)
  }

  if (evt.pointerId === boostTouchId) {
    handleBoostPointerUp(evt)
  }
}

function updateJoystickTargetFromPointer(clientX, clientY) {
  joystickCurrentX = clientX
  joystickCurrentY = clientY

  var joystickRect = joystickBox.getBoundingClientRect()
  var deltaX = joystickCurrentX - (joystickRect.left + joystickRect.width / 2)
  var deltaY = joystickCurrentY - (joystickRect.top + joystickRect.height / 2)
  var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (distance > joystickDeadzone) {
    steerAngleTarget = Math.atan2(deltaY, deltaX)
  } else {
    steerAngleTarget = undefined
  }

  updateJoystickVisual()
}

function releaseJoystickControl() {
  joystickActive = false
  joystickTouchId = null
  steerAngleTarget = undefined
  updateJoystickVisual()
}

function releaseBoostControl() {
  boostTouchActive = false
  boostTouchId = null
  if (boostBox) {
    boostBox.classList.remove('is-pressed')
  }
  updateBoostMeterStatus(true)
}

function capturePointer(element, pointerId) {
  if (!element || !element.setPointerCapture) return

  try {
    element.setPointerCapture(pointerId)
  } catch {}
}

function releaseMobileControls() {
  releaseJoystickControl()
  releaseBoostControl()
  mobileControls.left = false
  mobileControls.right = false
  mobileControls.boost = false
  touchBoosting = false
  steerAngleTarget = undefined
}

function updateJoystickVisual() {
  if (!joystickBox || !joystickOrigin || !joystickHandle) return

  if (!joystickActive) {
    joystickBox.classList.remove('is-active')
    joystickOrigin.style.opacity = 1
    joystickOrigin.style.left = '50%'
    joystickOrigin.style.top = '50%'
    joystickHandle.style.opacity = 0
    return
  }

  var boxRect = joystickBox.getBoundingClientRect()
  var startX = boxRect.width / 2
  var startY = boxRect.height / 2
  var currentX = joystickCurrentX - boxRect.left
  var currentY = joystickCurrentY - boxRect.top
  var maxTravel = Math.min(boxRect.width, boxRect.height) * 0.34
  var deltaX = currentX - startX
  var deltaY = currentY - startY
  var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (distance > maxTravel) {
    deltaX = deltaX / distance * maxTravel
    deltaY = deltaY / distance * maxTravel
    currentX = startX + deltaX
    currentY = startY + deltaY
  }

  joystickBox.classList.add('is-active')
  joystickOrigin.style.opacity = 1
  joystickHandle.style.opacity = 1
  joystickOrigin.style.left = startX + 'px'
  joystickOrigin.style.top = startY + 'px'
  joystickHandle.style.left = currentX + 'px'
  joystickHandle.style.top = currentY + 'px'
}

function isMovementKey(key) {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'a' ||
    key === 'A' ||
    key === 'd' ||
    key === 'D' ||
    key === 'w' ||
    key === 'W'
  )
}

function generateFood(foodType) {
  if (foodType === true) foodType = 'beetle'
  if (foodType === false) foodType = 'mouse'
  if (!foodType) foodType = 'grub'

  var isBad = foodType === 'beetle'
  var isGrub = foodType === 'grub'
  var spawn = getOffscreenSpawn(isGrub ? getRandomGrubSpeed() : getRandomFoodSpeed(), 24 * renderScale)
  var now = Date.now()

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    type: foodType,
    growthValue: isBad ? 0 : isGrub ? 1 : 3,
    swallowRadius: (isGrub ? 30 : 24) * renderScale,
    expiresAt: getFoodExpiresAt(foodType, now),
    isBad: isBad,
    initialized: true,
    enteringArena: true,
    pauseUntil: 0,
    nextTurnAt: Date.now() + 500 + Math.random() * 1300,
    fleeEnergy: mouseFleeStamina,
  }
}

function getRandomFoodVelocity() {
  var angle = Math.random() * Math.PI * 2
  var speed = getRandomFoodSpeed()

  return {
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  }
}

function getRandomMouseVelocity() {
  var angle = Math.random() * Math.PI * 2
  var speed = (0.55 + Math.random() * 1.1) * motionScale

  return {
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  }
}

function startFoodTimer() {
  stopFoodTimer()

  spawnTimedFood('grub')
  foodSpawnIntervalIds.push(window.setInterval(function () {
    if (playing) {
      spawnTimedFood('grub')
    }
  }, grubSpawnInterval))

  foodSpawnIntervalIds.push(window.setInterval(function () {
    if (playing) {
      spawnTimedFood('beetle')
    }
  }, beetleSpawnInterval))

  foodSpawnIntervalIds.push(window.setInterval(function () {
    if (playing) {
      spawnTimedFood('mouse')
    }
  }, mouseSpawnInterval))
}

function spawnTimedFood(foodType) {
  foods.push(generateFood(foodType))
}

function stopFoodTimer() {
  for (var i = 0; i < foodSpawnIntervalIds.length; i++) {
    window.clearInterval(foodSpawnIntervalIds[i])
  }

  foodSpawnIntervalIds = []
}

function startBadSnakeTimer() {
  stopBadSnakeTimer()
  badSnakeSpawnIntervalId = window.setInterval(function () {
    if (playing) {
      spawnBadSnake()
    }
  }, badSnakeSpawnInterval)
}

function stopBadSnakeTimer() {
  if (badSnakeSpawnIntervalId) {
    window.clearInterval(badSnakeSpawnIntervalId)
    badSnakeSpawnIntervalId = undefined
  }
}

function getPointerPos(canvasElement, clientX, clientY) {
  var rect = canvasElement.getBoundingClientRect()
  var pointerX = Math.max(0, Math.min(canvas.width - 1, clientX - rect.left))
  var pointerY = Math.max(0, Math.min(canvas.height - 1, clientY - rect.top))

  return {
    x: pointerX,
    y: pointerY,
  }
}

function animate() {
  if (playing) {
    if (a === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      updateGamepadControls()
      updateBerserkerStatus()
      updateBoostEnergy()
      updateBoostMeterStatus()
      foodRandom()
      updateFireball()
      updateGoldenMouse()
      moveSnakeHead()
      updateBadSnakes()
      applyEntityBounces()

      for (var i = 0; i < foods.length; i++) {
        var entitySwallowRadius = foods[i].swallowRadius || swallowRadius

        if (isSnakeTouchingEntity(foods[i], entitySwallowRadius)) {
          if (foods[i].isBurning) {
            drawFood(foods[i])
            continue
          }

          if (foods[i].isBad && !isBerserkerActive()) {
            n = startingSegments
            x = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
            y = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
            resetSnakeBody()
            score = 0
            updateScoreDisplay()
            playSound('badFoodSound')
          } else {
            var growthValue = foods[i].isBad ? 1 : foods[i].growthValue || 1

            n += growthValue
            score += growthValue
            updateScoreDisplay()
            addSnakeSegments(growthValue)
            playSound('goodFoodSound')
          }

          if (score > highScore) {
            setHighScore(score)
          }

          foods.splice(i, 1)
          i--
          continue
        }

        drawFood(foods[i])
      }

      if (fireball) {
        if (isSnakeTouchingEntity(fireball, 22 * renderScale)) {
          burnPoisonBeetles()
          fireball = undefined
          scheduleNextFireball()
        } else {
          drawFireball(fireball)
        }
      }


      if (goldenMouse) {
        if (isSnakeTouchingEntity(goldenMouse, 24 * renderScale)) {
          activateBerserker()
          goldenMouse = undefined
          scheduleNextGoldenMouse()
          playGameSound('eat')
        } else {
          drawGoldenMouse(goldenMouse)
        }
      }

      drawBerserkerAura()
      drawSnake(snakeHead.x, snakeHead.y)
    }

    animationRequestId = requestAnimationFrame(animate)
  }
}

function drawFood(food) {
  if (food.isBad) {
    drawBadFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle, food.isBurning)
  } else if (food.type === 'grub') {
    drawGrubFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle)
  } else {
    drawGoodFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle, isEntityMoving(food))
  }
}

function drawGoldenMouse(mouse) {
  var pulse = 0.72 + Math.sin(Date.now() * 0.012) * 0.18

  ctx.save()
  ctx.fillStyle = 'rgba(255, 208, 62, ' + pulse * 0.26 + ')'
  ctx.shadowColor = '#ffd43b'
  ctx.shadowBlur = 20 * renderScale
  ctx.beginPath()
  ctx.arc(mouse.x + 6 * renderScale, mouse.y + 5 * renderScale, 23 * renderScale, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  drawGoodFood(
    mouse.x + 6 * renderScale,
    mouse.y + 5 * renderScale,
    mouse.facingAngle,
    isEntityMoving(mouse),
    true
  )
}

function getFoodExpiresAt(foodType, now) {
  if (foodType === 'grub') return now + grubLifetime
  if (foodType === 'mouse') return now + mouseLifetime
  return 0
}

function getRandomFoodSpeed() {
  return (0.9 + Math.random() * 1.05) * motionScale
}

function getRandomGrubSpeed() {
  return (0.22 + Math.random() * 0.38) * motionScale
}

function getOffscreenSpawn(speed, offset) {
  var side = Math.floor(Math.random() * 4)
  var startX
  var startY

  if (side === 0) {
    startX = -offset
    startY = Math.random() * canvas.height
  } else if (side === 1) {
    startX = canvas.width + offset
    startY = Math.random() * canvas.height
  } else if (side === 2) {
    startX = Math.random() * canvas.width
    startY = -offset
  } else {
    startX = Math.random() * canvas.width
    startY = canvas.height + offset
  }

  var targetX = canvas.width * (0.25 + Math.random() * 0.5)
  var targetY = canvas.height * (0.25 + Math.random() * 0.5)
  var dx = targetX - startX
  var dy = targetY - startY
  var distance = Math.sqrt(dx * dx + dy * dy) || 1

  return {
    x: startX,
    y: startY,
    dx: dx / distance * speed,
    dy: dy / distance * speed,
  }
}

function sendEntityToNearestExit(entity) {
  var exitOffset = 24 * renderScale
  var exits = [
    { x: -exitOffset, y: entity.y, distance: entity.x },
    { x: canvas.width + exitOffset, y: entity.y, distance: canvas.width - entity.x },
    { x: entity.x, y: -exitOffset, distance: entity.y },
    { x: entity.x, y: canvas.height + exitOffset, distance: canvas.height - entity.y },
  ]
  var nearestExit = exits[0]

  for (var i = 1; i < exits.length; i++) {
    if (exits[i].distance < nearestExit.distance) {
      nearestExit = exits[i]
    }
  }

  var speed = entity.type === 'grub' ? getRandomGrubSpeed() * 1.3 : getRandomFoodSpeed()
  var dx = nearestExit.x - entity.x
  var dy = nearestExit.y - entity.y
  var distance = Math.sqrt(dx * dx + dy * dy) || 1

  entity.dx = dx / distance * speed
  entity.dy = dy / distance * speed
  entity.facingAngle = Math.atan2(entity.dy, entity.dx)
  entity.leavingArena = true
  entity.enteringArena = false
  entity.expiresAt = 0
  entity.pauseUntil = 0
}

function getRandomGrubVelocity() {
  var angle = Math.random() * Math.PI * 2
  var speed = getRandomGrubSpeed()

  return {
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  }
}

function isSnakeTouchingEntity(entity, radius) {
  var dx = snakeHead.x - entity.x
  var dy = snakeHead.y - entity.y
  return dx * dx + dy * dy < radius * radius
}

function isEntityInsideArena(entity, padding) {
  return (
    entity.x >= padding &&
    entity.x <= canvas.width - padding &&
    entity.y >= padding &&
    entity.y <= canvas.height - padding
  )
}

function isEntityOutsideArena(entity, padding) {
  return (
    entity.x < -padding ||
    entity.x > canvas.width + padding ||
    entity.y < -padding ||
    entity.y > canvas.height + padding
  )
}

function isEntityMoving(entity) {
  return entity.dx * entity.dx + entity.dy * entity.dy > 0.04
}

function drawGoodFood(centerX, centerY, angle, isMoving, isGolden) {
  var legStep = isMoving ? Math.sin(Date.now() * 0.026 + centerX * 0.04 + centerY * 0.03) * 1.2 : 0
  var tailWiggle = isMoving ? Math.sin(Date.now() * 0.02 + centerX * 0.04) * 2.4 : 0

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.scale(renderScale * 1.14, renderScale * 1.14)

  ctx.fillStyle = isGolden ? 'rgba(255, 217, 71, 0.3)' : 'rgba(232, 209, 184, 0.16)'
  ctx.beginPath()
  ctx.ellipse(-1, 1, 18, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = isGolden ? '#ffe98a' : '#cfa791'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-15, 1)
  ctx.quadraticCurveTo(-24, 5 + tailWiggle, -31, tailWiggle * 0.35)
  ctx.quadraticCurveTo(-36, -4 + tailWiggle, -39, -2)
  ctx.stroke()

  drawMouseLegs(legStep, isGolden)

  ctx.fillStyle = isGolden ? '#d99b16' : '#8e8179'
  ctx.strokeStyle = isGolden ? '#6f4300' : '#5b4e49'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(-5, 0, 13.5, 8.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = isGolden ? '#ffd84d' : '#b6aaa2'
  ctx.strokeStyle = isGolden ? '#6f4300' : '#5b4e49'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(9, 0, 8.5, 5.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = isGolden ? '#d99b16' : '#8e8179'
  ctx.strokeStyle = isGolden ? '#6f4300' : '#5b4e49'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  ctx.arc(6.5, -5.2, 3, 0, Math.PI * 2)
  ctx.arc(6.5, 5.2, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = isGolden ? '#fff0a3' : '#d9b9b1'
  ctx.beginPath()
  ctx.arc(6.9, -5.2, 1.45, 0, Math.PI * 2)
  ctx.arc(6.9, 5.2, 1.45, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#1d1412'
  ctx.beginPath()
  ctx.arc(16.2, 0, 1.35, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = isGolden ? '#fff4bd' : '#eadbd1'
  ctx.lineWidth = 0.85
  ctx.beginPath()
  ctx.moveTo(13.5, -1.2)
  ctx.lineTo(21, -4)
  ctx.moveTo(13.5, -0.2)
  ctx.lineTo(21, -1)
  ctx.moveTo(13.5, 1.2)
  ctx.lineTo(21, 4)
  ctx.moveTo(13.5, 0.2)
  ctx.lineTo(21, 1)
  ctx.stroke()

  ctx.restore()
}

function drawMouseLegs(legStep, isGolden) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(54, 39, 34, 0.88)'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  drawMouseLegPath(legStep)
  ctx.stroke()

  ctx.strokeStyle = isGolden ? '#ffe98a' : '#cfa791'
  ctx.lineWidth = 1.15
  ctx.beginPath()
  drawMouseLegPath(legStep)
  ctx.stroke()
}

function drawMouseLegPath(legStep) {
  ctx.moveTo(-10, -5.2)
  ctx.lineTo(-13 - legStep, -7.8)
  ctx.lineTo(-15.5 - legStep, -7.1)
  ctx.moveTo(-1, -5.8)
  ctx.lineTo(1.7 + legStep, -8.1)
  ctx.lineTo(4.4 + legStep, -7.5)
  ctx.moveTo(-10, 5.2)
  ctx.lineTo(-13 + legStep, 7.8)
  ctx.lineTo(-15.5 + legStep, 7.1)
  ctx.moveTo(-1, 5.8)
  ctx.lineTo(1.7 - legStep, 8.1)
  ctx.lineTo(4.4 - legStep, 7.5)
}

function drawGrubFood(centerX, centerY, angle) {
  var wiggle = Math.sin(Date.now() * 0.01 + centerX * 0.03) * 1.8

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(255, 230, 120, 0.14)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 17, 12, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e7c986'
  ctx.strokeStyle = '#705536'
  ctx.lineWidth = 1.7
  ctx.beginPath()
  ctx.ellipse(-3, wiggle * 0.2, 13, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = 'rgba(112, 85, 54, 0.55)'
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(-9, -5)
  ctx.quadraticCurveTo(-6, 0, -9, 5)
  ctx.moveTo(-3, -7)
  ctx.quadraticCurveTo(0, 0, -3, 7)
  ctx.moveTo(3, -6)
  ctx.quadraticCurveTo(6, 0, 3, 6)
  ctx.stroke()

  ctx.fillStyle = '#f9e7a9'
  ctx.beginPath()
  ctx.ellipse(9, 0, 6, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2e2115'
  ctx.beginPath()
  ctx.arc(11, -1.4, 1, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawBadFood(centerX, centerY, angle, isBurning) {
  var now = Date.now()
  var legStep = isBurning ? 0 : Math.sin(now * 0.018 + centerX * 0.04 + centerY * 0.03) * 2.4
  var flameStep = Math.sin(now * 0.032 + centerX * 0.04) * 2

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle + Math.PI / 2)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(120, 255, 86, 0.12)'
  ctx.beginPath()
  ctx.arc(0, 0, 18, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(12, 5, 8, 0.72)'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(-10, -8)
  ctx.lineTo(-16, -13 + legStep)
  ctx.moveTo(10, -8)
  ctx.lineTo(16, -13 - legStep)
  ctx.moveTo(-12, 0)
  ctx.lineTo(-18, legStep)
  ctx.moveTo(12, 0)
  ctx.lineTo(18, -legStep)
  ctx.moveTo(-9, 8)
  ctx.lineTo(-15, 13 - legStep)
  ctx.moveTo(9, 8)
  ctx.lineTo(15, 13 + legStep)
  ctx.stroke()

  ctx.strokeStyle = '#dfff70'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-10, -8)
  ctx.lineTo(-16, -13 + legStep)
  ctx.moveTo(10, -8)
  ctx.lineTo(16, -13 - legStep)
  ctx.moveTo(-12, 0)
  ctx.lineTo(-18, legStep)
  ctx.moveTo(12, 0)
  ctx.lineTo(18, -legStep)
  ctx.moveTo(-9, 8)
  ctx.lineTo(-15, 13 - legStep)
  ctx.moveTo(9, 8)
  ctx.lineTo(15, 13 + legStep)
  ctx.stroke()

  ctx.fillStyle = '#231015'
  ctx.strokeStyle = '#260710'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.ellipse(0, 1, 12, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#861936'
  ctx.beginPath()
  ctx.ellipse(0, -2, 9, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#b7e24a'
  ctx.beginPath()
  ctx.arc(-4, -6, 2.5, 0, Math.PI * 2)
  ctx.arc(4, -6, 2.5, 0, Math.PI * 2)
  ctx.arc(-5, 2, 2, 0, Math.PI * 2)
  ctx.arc(5, 2, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#d5ff62'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.lineTo(0, 12)
  ctx.moveTo(-7, -1)
  ctx.lineTo(7, -1)
  ctx.stroke()

  ctx.fillStyle = '#2eff6e'
  ctx.beginPath()
  ctx.arc(-4, -12, 1.4, 0, Math.PI * 2)
  ctx.arc(4, -12, 1.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#8cff52'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-4, -14)
  ctx.lineTo(-8, -18)
  ctx.moveTo(4, -14)
  ctx.lineTo(8, -18)
  ctx.stroke()

  if (isBurning) {
    ctx.fillStyle = 'rgba(255, 116, 35, 0.2)'
    ctx.beginPath()
    ctx.arc(0, 0, 21 + flameStep, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#ff6f21'
    ctx.strokeStyle = '#ffe36c'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(-9, 5)
    ctx.bezierCurveTo(-15, -2, -9, -10 - flameStep, -4, -6)
    ctx.bezierCurveTo(-4, -15, 4, -13, 2, -5)
    ctx.bezierCurveTo(9, -12, 15, -3, 9, 5)
    ctx.bezierCurveTo(5, 10, -5, 10, -9, 5)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffe76a'
    ctx.beginPath()
    ctx.moveTo(-3, 4)
    ctx.bezierCurveTo(-6, -1, -2, -7, 1, -3)
    ctx.bezierCurveTo(6, -7, 8, 1, 4, 5)
    ctx.bezierCurveTo(2, 7, -1, 7, -3, 4)
    ctx.fill()
  }

  ctx.restore()
}

function updateFireball() {
  var now = Date.now()

  if (!fireball && now >= nextFireballSpawnAt) {
    if (getActiveBeetleCount() >= fireballMinBeetles) {
      fireball = generateFireball()
    } else {
      scheduleNextFireball()
    }
  }

  if (!fireball) return

  if (now > fireball.expiresAt) {
    fireball = undefined
    scheduleNextFireball()
    return
  }

  fireball.x += fireball.dx
  fireball.y += fireball.dy
  fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)

  var fireballEdgeSize = 18 * renderScale

  if (fireball.enteringArena) {
    if (isEntityInsideArena(fireball, fireballEdgeSize)) {
      fireball.enteringArena = false
    } else {
      return
    }
  }

  applySnakeBodyBounce(fireball)
  applyRoundedArenaBounds(fireball, fireballEdgeSize)

  if (fireball.x < 0 || fireball.x > canvas.width - fireballEdgeSize) {
    fireball.dx *= -1
    fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)
    fireball.x = Math.max(0, Math.min(canvas.width - fireballEdgeSize, fireball.x))
  }

  if (fireball.y < 0 || fireball.y > canvas.height - fireballEdgeSize) {
    fireball.dy *= -1
    fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)
    fireball.y = Math.max(0, Math.min(canvas.height - fireballEdgeSize, fireball.y))
  }
}

function generateFireball() {
  var spawn = getOffscreenSpawn(getRandomFoodSpeed() * 1.12, 42 * renderScale)

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    enteringArena: true,
    expiresAt: Date.now() + fireballLifetime,
  }
}

function scheduleNextFireball() {
  nextFireballSpawnAt = Date.now() + fireballSpawnMinDelay + Math.random() * (fireballSpawnMaxDelay - fireballSpawnMinDelay)
}

function updateGoldenMouse() {
  var now = Date.now()

  if (!goldenMouse && now >= nextGoldenMouseSpawnAt) {
    goldenMouse = generateGoldenMouse()
  }

  if (!goldenMouse) return

  if (now >= goldenMouse.expiresAt) {
    goldenMouse = undefined
    scheduleNextGoldenMouse()
    return
  }

  if (!goldenMouse.enteringArena) {
    updateMouseMovement(goldenMouse)
  }

  goldenMouse.x += goldenMouse.dx
  goldenMouse.y += goldenMouse.dy
  goldenMouse.facingAngle = Math.atan2(goldenMouse.dy, goldenMouse.dx)

  var edgeSize = 16 * renderScale

  if (goldenMouse.enteringArena) {
    if (isEntityInsideArena(goldenMouse, edgeSize)) {
      goldenMouse.enteringArena = false
    } else {
      return
    }
  }

  applySnakeBodyBounce(goldenMouse)
  applyRoundedArenaBounds(goldenMouse, edgeSize)

  if (goldenMouse.x < 0 || goldenMouse.x > canvas.width - edgeSize) {
    goldenMouse.dx *= -1
    goldenMouse.x = Math.max(0, Math.min(canvas.width - edgeSize, goldenMouse.x))
  }

  if (goldenMouse.y < 0 || goldenMouse.y > canvas.height - edgeSize) {
    goldenMouse.dy *= -1
    goldenMouse.y = Math.max(0, Math.min(canvas.height - edgeSize, goldenMouse.y))
  }

  goldenMouse.facingAngle = Math.atan2(goldenMouse.dy, goldenMouse.dx)
}

function generateGoldenMouse() {
  var spawn = getOffscreenSpawn(getRandomFoodSpeed() * 1.08, 28 * renderScale)

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    type: 'golden-mouse',
    enteringArena: true,
    expiresAt: Date.now() + goldenMouseLifetime,
    fleeEnergy: mouseFleeStamina,
    pauseUntil: 0,
    nextTurnAt: Date.now() + 500,
    lastMouseUpdateAt: Date.now(),
  }
}

function scheduleNextGoldenMouse() {
  nextGoldenMouseSpawnAt = Date.now() + goldenMouseSpawnMinDelay + Math.random() * (goldenMouseSpawnMaxDelay - goldenMouseSpawnMinDelay)
}

function activateBerserker() {
  berserkerUntil = Date.now() + berserkerDuration
  lastBerserkerSeconds = -1
  document.body.classList.add('is-berserker')
  calmMiceForBerserker()
  updateBerserkerStatus()
}

function calmMiceForBerserker() {
  var now = Date.now()

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].type !== 'mouse') continue
    foods[i].fleeEnergy = mouseFleeStamina
    foods[i].nextTurnAt = now
  }
}

function isBerserkerActive() {
  return Date.now() < berserkerUntil
}

function updateBerserkerStatus() {
  var remaining = Math.max(0, berserkerUntil - Date.now())

  if (remaining <= 0) {
    document.body.classList.remove('is-berserker')
    if (berserkerStatusElement) berserkerStatusElement.hidden = true
    lastBerserkerSeconds = -1
    return
  }

  var seconds = Math.ceil(remaining / 1000)
  document.body.classList.add('is-berserker')
  if (berserkerStatusElement) berserkerStatusElement.hidden = false

  if (berserkerTimeElement && seconds !== lastBerserkerSeconds) {
    berserkerTimeElement.textContent = seconds
    lastBerserkerSeconds = seconds
  }
}

function drawBerserkerAura() {
  if (!isBerserkerActive()) return

  var pulse = 1 + Math.sin(Date.now() * 0.015) * 0.12

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 210, 55, 0.72)'
  ctx.fillStyle = 'rgba(255, 155, 20, 0.1)'
  ctx.lineWidth = 3 * renderScale
  ctx.shadowColor = '#ffb515'
  ctx.shadowBlur = 18 * renderScale
  ctx.beginPath()
  ctx.arc(snakeHead.x, snakeHead.y, 22 * renderScale * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function getActiveBeetleCount() {
  var beetleCount = 0

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad && !foods[i].isBurning) {
      beetleCount += 1
    }
  }

  return beetleCount
}

function burnPoisonBeetles() {
  var now = Date.now()
  var burnedBeetles = false
  var burnedRivals = false

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad && !foods[i].isBurning) {
      foods[i].isBurning = true
      foods[i].burnUntil = now + beetleBurnDuration
      foods[i].dx = 0
      foods[i].dy = 0
      foods[i].pauseUntil = foods[i].burnUntil
      burnedBeetles = true
    }
  }

  for (var rivalIndex = 0; rivalIndex < badSnakes.length; rivalIndex++) {
    if (!badSnakes[rivalIndex].isBurning) {
      badSnakes[rivalIndex].isBurning = true
      badSnakes[rivalIndex].burnUntil = now + beetleBurnDuration
      badSnakes[rivalIndex].cutCooldownUntil = badSnakes[rivalIndex].burnUntil
      burnedRivals = true
    }
  }

  if (burnedRivals) {
    playRivalSound('burn')
  }

  if (burnedBeetles) {
    playSound('goodFoodSound')
  }
}

function drawFireball(powerup) {
  var flicker = Math.sin(Date.now() * 0.024 + powerup.x * 0.03) * 2

  ctx.save()
  ctx.translate(powerup.x, powerup.y)
  ctx.rotate(powerup.facingAngle)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(255, 116, 35, 0.16)'
  ctx.beginPath()
  ctx.arc(0, 0, 22 + flicker, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ff6f21'
  ctx.strokeStyle = '#ffe36c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.bezierCurveTo(5, -14 - flicker, -10, -12, -16, -2)
  ctx.bezierCurveTo(-8, 0, -12, 9 + flicker, 0, 15)
  ctx.bezierCurveTo(8, 10, 15, 7, 14, 0)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffe76a'
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.bezierCurveTo(2, -7, -5, -5, -8, 1)
  ctx.bezierCurveTo(-4, 6, 1, 8, 7, 3)
  ctx.fill()

  ctx.restore()
}

function moveSnakeHead() {
  applyKeyboardControls()

  if (gamepadSteerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, gamepadSteerAngleTarget, turnRate)
  } else if (steerTarget) {
    var targetAngle = Math.atan2(steerTarget.y - snakeHead.y, steerTarget.x - snakeHead.x)
    headingAngle = turnTowardAngle(headingAngle, targetAngle, turnRate)
  } else if (steerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, steerAngleTarget, turnRate)
  }

  var currentSpeed = snakeSpeed * motionScale
  if (isBerserkerActive()) currentSpeed *= berserkerSpeedMultiplier
  if (boosting) currentSpeed *= boostMultiplier

  snakeHead.x += Math.cos(headingAngle) * currentSpeed
  snakeHead.y += Math.sin(headingAngle) * currentSpeed

  if (snakeHead.x < 0) {
    snakeHead.x = 0
    headingAngle = Math.PI - headingAngle
  }

  if (snakeHead.x > canvas.width) {
    snakeHead.x = canvas.width
    headingAngle = Math.PI - headingAngle
  }

  if (snakeHead.y < 0) {
    snakeHead.y = 0
    headingAngle = -headingAngle
  }

  if (snakeHead.y > canvas.height) {
    snakeHead.y = canvas.height
    headingAngle = -headingAngle
  }

  applyRoundedSnakeBounds()
}

function applyKeyboardControls() {
  var turningLeft = pressedKeys.ArrowLeft || pressedKeys.a || pressedKeys.A
  var turningRight = pressedKeys.ArrowRight || pressedKeys.d || pressedKeys.D

  if (turningLeft && !turningRight) {
    headingAngle -= turnRate
    steerTarget = undefined
    steerAngleTarget = undefined
  }

  if (turningRight && !turningLeft) {
    headingAngle += turnRate
    steerTarget = undefined
    steerAngleTarget = undefined
  }
}

function getBoostDuration() {
  var extraSegments = Math.max(0, n - startingSegments)
  return Math.min(maxBoostDuration, baseBoostDuration + extraSegments * boostDurationPerSegment)
}

function updateBoostEnergy() {
  var now = Date.now()
  var elapsed = now - lastBoostUpdateAt
  var maxEnergy = getBoostDuration()
  var boostHeld = isBoostControlActive()

  lastBoostUpdateAt = now

  if (boostEnergy > maxEnergy) {
    boostEnergy = maxEnergy
  }

  if (boostHeld) {
    if (boostEnergy > 0) {
      boostEnergy = Math.max(0, boostEnergy - elapsed)
      setBoosting(true)
    } else {
      setBoosting(false)
    }
  } else {
    boostEnergy = Math.min(maxEnergy, boostEnergy + getBoostRechargeRate() * elapsed)
    setBoosting(false)
  }

  boostCoolingDown = !boosting && boostEnergy < maxEnergy
}

function getBoostRechargeRate() {
  return getBoostDuration() / boostCooldown
}

function isBoostControlActive() {
  return Boolean(
    pressedKeys.Shift ||
    pressedKeys[' '] ||
    pressedKeys.ArrowUp ||
    pressedKeys.w ||
    pressedKeys.W ||
    touchBoosting ||
    boostTouchActive ||
    mobileControls.boost ||
    gamepadBoosting
  )
}

function resetBoost() {
  boostCoolingDown = false
  boostEnergy = getBoostDuration()
  touchBoosting = false
  releaseMobileControls()
  lastBoostUpdateAt = Date.now()
  setBoosting(false)
  updateBoostMeterStatus(true)
}

function setBoosting(nextBoosting) {
  if (boosting === nextBoosting) return

  boosting = nextBoosting
  document.body.classList.toggle('is-boosting', boosting)
  updateBoostMeterStatus(true)
}

function updateBoostMeterStatus(forceUpdate) {
  var maxEnergy = getBoostDuration()
  var boostProgress = boostEnergy / maxEnergy
  var boostHeld = isBoostControlActive()
  var boostState = 'ready'

  if (boosting) {
    boostState = 'active'
    updateBoostMeter(boostMeterFill, boostProgress, boostState, forceUpdate)
    updateBoostControlVisual(boostProgress, boostState, forceUpdate)
    return
  }

  if (boostHeld && boostEnergy <= 0) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, 0, boostState, forceUpdate)
    updateBoostControlVisual(0, boostState, forceUpdate)
    return
  }

  if (boostCoolingDown) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, boostProgress, boostState, forceUpdate)
    updateBoostControlVisual(boostProgress, boostState, forceUpdate)
    return
  }

  updateBoostMeter(boostMeterFill, 1, boostState, forceUpdate)
  updateBoostControlVisual(1, boostState, forceUpdate)
}

function updateBoostMeter(meterFill, progress, state, forceUpdate) {
  if (!meterFill) return
  if (isMobileControlLayout()) return
  if (!forceUpdate && !shouldUpdateBoostVisual(progress, state)) return

  meterFill.style.width = Math.max(0, Math.min(1, progress)) * 100 + '%'
  meterFill.className = 'boost-meter-fill ' + state
}

function updateBoostControlVisual(progress, state, forceUpdate) {
  var clampedProgress = Math.max(0, Math.min(1, progress))
  var quantizedProgress = Math.round(clampedProgress * 20) / 20

  if (isMobileControlLayout()) {
    if (!forceUpdate && !shouldUpdateBoostVisual(clampedProgress, state)) return

    lastBoostVisualUpdateAt = Date.now()
    lastBoostVisualProgress = clampedProgress
    lastBoostVisualState = state

    var mobileGaugeScale = 0.18 + clampedProgress * 0.82
    for (var mobileGaugeIndex = 0; mobileGaugeIndex < boostControlGauges.length; mobileGaugeIndex++) {
      boostControlGauges[mobileGaugeIndex].style.setProperty('--boost-scale', mobileGaugeScale)
    }

    for (var mobileStateIndex = 0; mobileStateIndex < boostVisualStates.length; mobileStateIndex++) {
      boostVisualStates[mobileStateIndex].classList.toggle('is-active', state === 'active')
      boostVisualStates[mobileStateIndex].classList.toggle('is-cooling', state === 'cooldown')
    }

    return
  }

  if (!forceUpdate && !shouldUpdateBoostVisual(quantizedProgress, state)) return

  lastBoostVisualUpdateAt = Date.now()
  lastBoostVisualProgress = quantizedProgress
  lastBoostVisualState = state

  var gaugeScale = 0.18 + quantizedProgress * 0.82
  for (var i = 0; i < boostControlGauges.length; i++) {
    boostControlGauges[i].style.setProperty('--boost-scale', gaugeScale)
  }

  for (var j = 0; j < boostVisualStates.length; j++) {
    boostVisualStates[j].classList.toggle('is-active', state === 'active')
    boostVisualStates[j].classList.toggle('is-cooling', state === 'cooldown')
  }
}

function shouldUpdateBoostVisual(progress, state) {
  var now = Date.now()

  if (state !== lastBoostVisualState) return true
  if (Math.abs(progress - lastBoostVisualProgress) >= 0.01) return true
  return now - lastBoostVisualUpdateAt >= boostVisualUpdateInterval
}

function isMobileControlLayout() {
  if (!mobileControlMediaQuery) {
    mobileControlMediaQuery = window.matchMedia('(max-width: 820px), (max-width: 1024px) and (max-height: 540px) and (orientation: landscape)')
  }

  return mobileControlMediaQuery.matches
}

function turnTowardAngle(current, target, amount) {
  var difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  var turnAmount = Math.max(-amount, Math.min(amount, difference))
  return current + turnAmount
}

function playSound(id) {
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

function spawnBadSnakes() {
  badSnakes = []

  for (var i = 0; i < badSnakeStartCount; i++) {
    spawnBadSnake()
  }
}

function spawnBadSnake() {
  if (badSnakes.length >= badSnakeMaxCount) return

  badSnakes.push(createBadSnake(badSnakes.length))
}

function createBadSnake(index) {
  var margin = 54 * renderScale
  var side = index % 4
  var headX
  var headY

  if (side === 0) {
    headX = margin
    headY = margin
  } else if (side === 1) {
    headX = canvas.width - margin
    headY = canvas.height - margin
  } else if (side === 2) {
    headX = canvas.width - margin
    headY = margin
  } else {
    headX = margin
    headY = canvas.height - margin
  }

  var heading = Math.atan2(canvas.height / 2 - headY, canvas.width / 2 - headX)
  var enemySnake = {
    head: { x: headX, y: headY },
    heading: heading,
    segments: [],
    wanderAngle: heading,
    nextWanderAt: 0,
    cutCooldownUntil: 0,
    palette: index % 2 === 0
      ? { head: '#431b1f', body: '#7a2d32', stripe: '#ffb657' }
      : { head: '#2a2438', body: '#5a375d', stripe: '#b6ff70' },
  }

  for (var i = 0; i < badSnakeStartSegments; i++) {
    enemySnake.segments.push({
      x: headX - Math.cos(heading) * segLength * (i + 1),
      y: headY - Math.sin(heading) * segLength * (i + 1),
    })
  }

  return enemySnake
}

function updateBadSnakes() {
  for (var i = 0; i < badSnakes.length; i++) {
    var enemySnake = badSnakes[i]

    if (enemySnake.isBurning) {
      if (Date.now() >= enemySnake.burnUntil) {
        removeBadSnake(enemySnake)
        i--
        continue
      }

      drawBadSnake(enemySnake)
      continue
    }

    updateBadSnake(enemySnake)
    handleBadSnakeFood(enemySnake)
    handleBadSnakeCuts(enemySnake)

    if (badSnakes.indexOf(enemySnake) === -1) {
      i--
      continue
    }
  }

  applyBadSnakeBounces()

  for (var drawIndex = 0; drawIndex < badSnakes.length; drawIndex++) {
    if (badSnakes[drawIndex].isBurning) continue
    drawBadSnake(badSnakes[drawIndex])
  }
}

function updateBadSnake(enemySnake) {
  var target = getBadSnakeTarget(enemySnake)
  var now = Date.now()

  if (target) {
    var targetAngle = Math.atan2(target.y - enemySnake.head.y, target.x - enemySnake.head.x)
    enemySnake.heading = turnTowardAngle(enemySnake.heading, targetAngle, badSnakeTurnRate)
  } else {
    if (now >= enemySnake.nextWanderAt) {
      enemySnake.wanderAngle += -0.75 + Math.random() * 1.5
      enemySnake.nextWanderAt = now + 900 + Math.random() * 1600
    }

    enemySnake.heading = turnTowardAngle(enemySnake.heading, enemySnake.wanderAngle, badSnakeTurnRate * 0.75)
  }

  var edgeVector = getEdgeAvoidanceVector(enemySnake.head)
  if (edgeVector.x || edgeVector.y) {
    var edgeAngle = Math.atan2(edgeVector.y, edgeVector.x)
    enemySnake.heading = turnTowardAngle(enemySnake.heading, edgeAngle, badSnakeTurnRate * 1.35)
  }

  var speed = getBadSnakeSpeed(enemySnake)
  var enemyVelocity = {
    x: enemySnake.head.x,
    y: enemySnake.head.y,
    dx: Math.cos(enemySnake.heading) * speed,
    dy: Math.sin(enemySnake.heading) * speed,
    facingAngle: enemySnake.heading,
  }

  enemyVelocity.x += enemyVelocity.dx
  enemyVelocity.y += enemyVelocity.dy
  applyRoundedArenaBounds(enemyVelocity, 0)

  if (enemyVelocity.x < 0 || enemyVelocity.x > canvas.width) {
    enemyVelocity.dx *= -1
    enemyVelocity.x = Math.max(0, Math.min(canvas.width, enemyVelocity.x))
  }

  if (enemyVelocity.y < 0 || enemyVelocity.y > canvas.height) {
    enemyVelocity.dy *= -1
    enemyVelocity.y = Math.max(0, Math.min(canvas.height, enemyVelocity.y))
  }

  enemySnake.head.x = enemyVelocity.x
  enemySnake.head.y = enemyVelocity.y
  enemySnake.heading = Math.atan2(enemyVelocity.dy, enemyVelocity.dx)
  dragBadSnakeSegments(enemySnake)
}

function getBadSnakeSpeed(enemySnake) {
  var enemyExtraLength = Math.max(0, enemySnake.segments.length - badSnakeStartSegments)
  var playerExtraLength = Math.max(0, n - startingSegments)
  var lengthSpeed = enemyExtraLength * badSnakeSpeedPerSegment
  var playerPressureSpeed = playerExtraLength * badSnakePlayerSpeedPerSegment

  return Math.min(badSnakeMaxSpeed, (badSnakeBaseSpeed + lengthSpeed + playerPressureSpeed) * motionScale)
}

function getBadSnakeTarget(enemySnake) {
  var closestFood
  var closestDistanceSquared = Infinity

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad || foods[i].isBurning) continue

    var dxToFood = foods[i].x - enemySnake.head.x
    var dyToFood = foods[i].y - enemySnake.head.y
    var distanceSquared = dxToFood * dxToFood + dyToFood * dyToFood

    if (distanceSquared < closestDistanceSquared) {
      closestFood = foods[i]
      closestDistanceSquared = distanceSquared
    }
  }

  var playerTarget = getPlayerSideAttackTarget(enemySnake)
  var dxToPlayer = playerTarget.x - enemySnake.head.x
  var dyToPlayer = playerTarget.y - enemySnake.head.y
  var playerDistanceSquared = dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer

  if (!closestFood || playerDistanceSquared < closestDistanceSquared) {
    return playerTarget
  }

  return closestFood
}

function getPlayerSideAttackTarget(enemySnake) {
  var bodyIndex = Math.min(Math.max(2, Math.floor(x.length * 0.38)), x.length - 1)
  var baseX = x[bodyIndex] || snakeHead.x
  var baseY = y[bodyIndex] || snakeHead.y
  var sideOffset = 22 * renderScale
  var sideX = -Math.sin(headingAngle)
  var sideY = Math.cos(headingAngle)
  var leftTarget = {
    x: baseX + sideX * sideOffset,
    y: baseY + sideY * sideOffset,
  }
  var rightTarget = {
    x: baseX - sideX * sideOffset,
    y: baseY - sideY * sideOffset,
  }
  var leftDx = leftTarget.x - enemySnake.head.x
  var leftDy = leftTarget.y - enemySnake.head.y
  var rightDx = rightTarget.x - enemySnake.head.x
  var rightDy = rightTarget.y - enemySnake.head.y
  var leftDistanceSquared = leftDx * leftDx + leftDy * leftDy
  var rightDistanceSquared = rightDx * rightDx + rightDy * rightDy

  return leftDistanceSquared < rightDistanceSquared ? leftTarget : rightTarget
}

function dragBadSnakeSegments(enemySnake) {
  var leadX = enemySnake.head.x
  var leadY = enemySnake.head.y
  var enemySegLength = segLength * 0.94

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    var dx = leadX - segment.x
    var dy = leadY - segment.y
    var angle = Math.atan2(dy, dx)

    segment.x = leadX - Math.cos(angle) * enemySegLength
    segment.y = leadY - Math.sin(angle) * enemySegLength
    leadX = segment.x
    leadY = segment.y
  }
}

function handleBadSnakeFood(enemySnake) {
  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad || foods[i].isBurning) continue

    var eatRadius = foods[i].swallowRadius || swallowRadius
    if (!arePointsTouching(enemySnake.head.x, enemySnake.head.y, foods[i].x, foods[i].y, eatRadius)) continue

    growBadSnake(enemySnake, foods[i].growthValue || 1)
    foods.splice(i, 1)
    i--
    playRivalSound('feed')
    break
  }
}

function growBadSnake(enemySnake, count) {
  var tail = enemySnake.segments[enemySnake.segments.length - 1] || enemySnake.head

  for (var i = 0; i < count; i++) {
    enemySnake.segments.push({ x: tail.x, y: tail.y })
  }
}

function handleBadSnakeCuts(enemySnake) {
  var now = Date.now()

  if (isBerserkerActive()) {
    var centipedeHitPlayer = getPlayerBodyHitIndex(enemySnake.head.x, enemySnake.head.y, 13 * renderScale) >= 0
    var playerHitCentipede = (
      getEnemyBodyHitIndex(enemySnake, snakeHead.x, snakeHead.y, 17 * renderScale) >= 0 ||
      arePointsTouching(snakeHead.x, snakeHead.y, enemySnake.head.x, enemySnake.head.y, 17 * renderScale)
    )

    if (centipedeHitPlayer || playerHitCentipede) {
      eatBadSnakeWhole(enemySnake)
    }
    return
  }

  if (now >= enemySnake.cutCooldownUntil) {
    var playerHitIndex = getPlayerBodyHitIndex(enemySnake.head.x, enemySnake.head.y, 13 * renderScale)

    if (playerHitIndex >= 0) {
      var stolenPlayerSegments = removePlayerSegments(snakeBiteSegments)
      if (stolenPlayerSegments) {
        growBadSnake(enemySnake, stolenPlayerSegments)
      }

      enemySnake.cutCooldownUntil = now + snakeCutCooldown
      playGameSound('hurt')
      return
    }
  }

  if (now < enemySnake.cutCooldownUntil) return

  var enemyHitIndex = getEnemyBodyHitIndex(enemySnake, snakeHead.x, snakeHead.y, 15 * renderScale)

  if (enemyHitIndex >= 0) {
    var recoveredSegments = removeBadSnakeSegments(enemySnake, snakeBiteSegments)
    addPlayerSegments(recoveredSegments)
    enemySnake.cutCooldownUntil = now + snakeCutCooldown
    playGameSound('eat')
  }
}

function eatBadSnakeWhole(enemySnake) {
  var recoveredSegments = Math.max(1, enemySnake.segments.length)
  removeBadSnake(enemySnake)
  addPlayerSegments(recoveredSegments)
  playGameSound('eat')
}

function getPlayerBodyHitIndex(pointX, pointY, radius) {
  for (var i = 2; i < x.length; i++) {
    if (arePointsTouching(pointX, pointY, x[i], y[i], radius)) return i
  }

  return -1
}

function getEnemyBodyHitIndex(enemySnake, pointX, pointY, radius) {
  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    if (arePointsTouching(pointX, pointY, segment.x, segment.y, radius)) return i
  }

  return -1
}

function removePlayerSegments(count) {
  if (n <= startingSegments) return 0

  var removedSegments = Math.min(count, n - startingSegments)

  n -= removedSegments
  x.splice(n)
  y.splice(n)
  score = Math.max(0, score - removedSegments)
  updateScoreDisplay()

  return removedSegments
}

function removeBadSnakeSegments(enemySnake, count) {
  if (enemySnake.segments.length <= 0) return 0

  var removedSegments = Math.min(count, enemySnake.segments.length)

  enemySnake.segments.splice(enemySnake.segments.length - removedSegments, removedSegments)

  if (enemySnake.segments.length === 0) {
    removeBadSnake(enemySnake)
  }

  return removedSegments
}

function removeBadSnake(enemySnake) {
  var index = badSnakes.indexOf(enemySnake)
  if (index >= 0) {
    badSnakes.splice(index, 1)
  }
}

function addPlayerSegments(count) {
  if (count <= 0) return

  n += count
  score += count
  updateScoreDisplay()
  addSnakeSegments(count)
  updateHighScore(score)
}

function drawBadSnake(enemySnake) {
  drawBadCentipedeSegment(enemySnake.head.x, enemySnake.head.y, enemySnake.heading, true, enemySnake.palette, 0, enemySnake.isBurning)

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    var leader = i === 0 ? enemySnake.head : enemySnake.segments[i - 1]
    var angle = Math.atan2(leader.y - segment.y, leader.x - segment.x)
    drawBadCentipedeSegment(segment.x, segment.y, angle, false, enemySnake.palette, i + 1, enemySnake.isBurning)
  }
}

function drawBadCentipedeSegment(posX, posY, angle, isHead, palette, segmentIndex, isBurning) {
  var now = Date.now()
  var walkPhase = isBurning ? 0 : Math.sin(now * 0.016 + segmentIndex * 0.85)
  var flameStep = Math.sin(now * 0.032 + segmentIndex * 0.7) * 2
  var legReach = isHead ? 10 : 12
  var legLift = walkPhase * 3

  ctx.save()
  ctx.translate(posX, posY)
  ctx.rotate(angle)
  ctx.scale(renderScale, renderScale)

  ctx.strokeStyle = 'rgba(12, 5, 8, 0.74)'
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(-10 - legLift, -legReach)
  ctx.moveTo(2, -6)
  ctx.lineTo(9 + legLift, -legReach)
  ctx.moveTo(-4, 6)
  ctx.lineTo(-10 + legLift, legReach)
  ctx.moveTo(2, 6)
  ctx.lineTo(9 - legLift, legReach)
  ctx.stroke()

  ctx.strokeStyle = palette.stripe
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(-10 - legLift, -legReach)
  ctx.moveTo(2, -6)
  ctx.lineTo(9 + legLift, -legReach)
  ctx.moveTo(-4, 6)
  ctx.lineTo(-10 + legLift, legReach)
  ctx.moveTo(2, 6)
  ctx.lineTo(9 - legLift, legReach)
  ctx.stroke()

  ctx.fillStyle = isHead ? palette.head : palette.body
  ctx.strokeStyle = '#1a0d12'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(0, 0, isHead ? 13 : 10.5, isHead ? 8.5 : 7.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = palette.stripe
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-6, -2.5)
  ctx.quadraticCurveTo(0, 2, 7, -1.5)
  ctx.moveTo(-6, 2.5)
  ctx.quadraticCurveTo(0, -2, 7, 1.5)
  ctx.stroke()

  if (isHead) {
    ctx.fillStyle = '#ffd2a1'
    ctx.beginPath()
    ctx.arc(5, -3.5, 1.5, 0, Math.PI * 2)
    ctx.arc(5, 3.5, 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = palette.stripe
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(10, -4)
    ctx.lineTo(15, -8)
    ctx.moveTo(10, 4)
    ctx.lineTo(15, 8)
    ctx.stroke()
  }

  if (isBurning) {
    drawCentipedeFlames(segmentIndex, flameStep)
  }

  ctx.restore()
}

function drawCentipedeFlames(segmentIndex, flameStep) {
  ctx.fillStyle = 'rgba(255, 116, 35, 0.2)'
  ctx.beginPath()
  ctx.arc(0, 0, 15 + flameStep, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ff6f21'
  ctx.strokeStyle = '#ffe36c'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-8, 5)
  ctx.bezierCurveTo(-13, 0, -8, -9 - flameStep, -3, -5)
  ctx.bezierCurveTo(-1, -14, 5, -10, 3, -4)
  ctx.bezierCurveTo(10, -9, 13, 0, 8, 5)
  ctx.bezierCurveTo(4, 9, -4, 9, -8, 5)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffe76a'
  ctx.beginPath()
  ctx.moveTo(-2, 4)
  ctx.bezierCurveTo(-5, 0, -2, -6, 1, -3)
  ctx.bezierCurveTo(5, -6, 7, 1, 3, 5)
  ctx.bezierCurveTo(1, 7, -1, 6, -2, 4)
  ctx.fill()
}

function arePointsTouching(ax, ay, bx, by, radius) {
  var dx = ax - bx
  var dy = ay - by
  return dx * dx + dy * dy <= radius * radius
}

function applyEntityBounces() {
  var bounceEntities = []

  for (var i = 0; i < foods.length; i++) {
    if (!canEntityBounce(foods[i])) continue

    bounceEntities.push({
      entity: foods[i],
      radius: getEntityBounceRadius(foods[i]),
    })
  }

  if (fireball && !fireball.enteringArena) {
    bounceEntities.push({
      entity: fireball,
      radius: 18 * renderScale,
    })
  }

  if (goldenMouse && !goldenMouse.enteringArena) {
    bounceEntities.push({
      entity: goldenMouse,
      radius: 16 * renderScale,
    })
  }

  for (var firstIndex = 0; firstIndex < bounceEntities.length; firstIndex++) {
    for (var secondIndex = firstIndex + 1; secondIndex < bounceEntities.length; secondIndex++) {
      applyBounceBetweenEntities(
        bounceEntities[firstIndex].entity,
        bounceEntities[secondIndex].entity,
        bounceEntities[firstIndex].radius,
        bounceEntities[secondIndex].radius
      )
    }
  }

  applyFoodCentipedeBounces()
}

function canEntityBounce(entity) {
  return !entity.isBurning && !entity.enteringArena && !entity.leavingArena
}

function getEntityBounceRadius(entity) {
  if (entity.type === 'grub') return 14 * renderScale
  if (entity.type === 'mouse') return 16 * renderScale
  if (entity.isBad) return 14 * renderScale
  return 14 * renderScale
}

function applyBounceBetweenEntities(firstEntity, secondEntity, firstRadius, secondRadius) {
  var dx = secondEntity.x - firstEntity.x
  var dy = secondEntity.y - firstEntity.y
  var minDistance = firstRadius + secondRadius
  var distanceSquared = dx * dx + dy * dy

  if (distanceSquared <= 0 || distanceSquared >= minDistance * minDistance) return

  var distance = Math.sqrt(distanceSquared) || 0.001
  var normalX = dx / distance
  var normalY = dy / distance
  var overlap = minDistance - distance

  firstEntity.x -= normalX * overlap * 0.5
  firstEntity.y -= normalY * overlap * 0.5
  secondEntity.x += normalX * overlap * 0.5
  secondEntity.y += normalY * overlap * 0.5

  var relativeVelocityX = secondEntity.dx - firstEntity.dx
  var relativeVelocityY = secondEntity.dy - firstEntity.dy
  var velocityAlongNormal = relativeVelocityX * normalX + relativeVelocityY * normalY

  if (velocityAlongNormal < 0) {
    firstEntity.dx += velocityAlongNormal * normalX
    firstEntity.dy += velocityAlongNormal * normalY
    secondEntity.dx -= velocityAlongNormal * normalX
    secondEntity.dy -= velocityAlongNormal * normalY
  } else {
    firstEntity.dx -= normalX * 0.08
    firstEntity.dy -= normalY * 0.08
    secondEntity.dx += normalX * 0.08
    secondEntity.dy += normalY * 0.08
  }

  updateEntityFacing(firstEntity)
  updateEntityFacing(secondEntity)
}

function updateEntityFacing(entity) {
  if (Math.abs(entity.dx) + Math.abs(entity.dy) < 0.01) return

  entity.facingAngle = Math.atan2(entity.dy, entity.dx)
}

function applyFoodCentipedeBounces() {
  for (var foodIndex = 0; foodIndex < foods.length; foodIndex++) {
    var food = foods[foodIndex]
    if (!canEntityBounce(food)) continue

    for (var snakeIndex = 0; snakeIndex < badSnakes.length; snakeIndex++) {
      var enemySnake = badSnakes[snakeIndex]
      if (enemySnake.isBurning) continue

      applyFoodCentipedeBounce(food, enemySnake)
    }
  }
}

function applyFoodCentipedeBounce(food, enemySnake) {
  var collisionPoints = getBadSnakeCollisionPoints(enemySnake)
  var foodRadius = getEntityBounceRadius(food)
  var centipedeRadius = 9 * renderScale
  var minDistance = foodRadius + centipedeRadius
  var minDistanceSquared = minDistance * minDistance
  var closestHit

  for (var i = 0; i < collisionPoints.length; i++) {
    var dx = food.x - collisionPoints[i].x
    var dy = food.y - collisionPoints[i].y
    var distanceSquared = dx * dx + dy * dy

    if (distanceSquared < minDistanceSquared && (!closestHit || distanceSquared < closestHit.distanceSquared)) {
      closestHit = {
        dx: dx,
        dy: dy,
        distanceSquared: distanceSquared,
      }
    }
  }

  if (!closestHit) return

  var distance = Math.sqrt(closestHit.distanceSquared) || 0.001
  var normalX = closestHit.dx / distance
  var normalY = closestHit.dy / distance
  var overlap = minDistance - distance

  food.x += normalX * overlap * 0.75
  food.y += normalY * overlap * 0.75
  moveBadSnake(enemySnake, -normalX * overlap * 0.25, -normalY * overlap * 0.25)

  var velocityIntoCentipede = food.dx * -normalX + food.dy * -normalY
  if (velocityIntoCentipede > 0) {
    food.dx += 2 * velocityIntoCentipede * normalX
    food.dy += 2 * velocityIntoCentipede * normalY
  } else {
    food.dx += normalX * 0.14
    food.dy += normalY * 0.14
  }

  updateEntityFacing(food)
  enemySnake.heading = turnTowardAngle(enemySnake.heading, Math.atan2(-normalY, -normalX), badSnakeTurnRate * 2)
}

function applyBadSnakeBounces() {
  for (var firstIndex = 0; firstIndex < badSnakes.length; firstIndex++) {
    var firstSnake = badSnakes[firstIndex]
    if (firstSnake.isBurning) continue

    for (var secondIndex = firstIndex + 1; secondIndex < badSnakes.length; secondIndex++) {
      var secondSnake = badSnakes[secondIndex]
      if (secondSnake.isBurning) continue

      applyBadSnakeBounce(firstSnake, secondSnake)
    }
  }
}

function applyBadSnakeBounce(firstSnake, secondSnake) {
  var firstPoints = getBadSnakeCollisionPoints(firstSnake)
  var secondPoints = getBadSnakeCollisionPoints(secondSnake)
  var minDistance = 17 * renderScale
  var minDistanceSquared = minDistance * minDistance
  var closestHit

  for (var i = 0; i < firstPoints.length; i++) {
    for (var j = 0; j < secondPoints.length; j++) {
      var dx = secondPoints[j].x - firstPoints[i].x
      var dy = secondPoints[j].y - firstPoints[i].y
      var distanceSquared = dx * dx + dy * dy

      if (distanceSquared < minDistanceSquared && (!closestHit || distanceSquared < closestHit.distanceSquared)) {
        closestHit = {
          dx: dx,
          dy: dy,
          distanceSquared: distanceSquared,
        }
      }
    }
  }

  if (!closestHit) return

  var distance = Math.sqrt(closestHit.distanceSquared) || 0.001
  var normalX = closestHit.dx / distance
  var normalY = closestHit.dy / distance
  var overlap = minDistance - distance

  moveBadSnake(firstSnake, -normalX * overlap * 0.5, -normalY * overlap * 0.5)
  moveBadSnake(secondSnake, normalX * overlap * 0.5, normalY * overlap * 0.5)
  firstSnake.heading = turnTowardAngle(firstSnake.heading, Math.atan2(-normalY, -normalX), badSnakeTurnRate * 3)
  secondSnake.heading = turnTowardAngle(secondSnake.heading, Math.atan2(normalY, normalX), badSnakeTurnRate * 3)
}

function getBadSnakeCollisionPoints(enemySnake) {
  var points = [enemySnake.head]

  for (var i = 0; i < enemySnake.segments.length; i += 2) {
    points.push(enemySnake.segments[i])
  }

  return points
}

function moveBadSnake(enemySnake, offsetX, offsetY) {
  enemySnake.head.x += offsetX
  enemySnake.head.y += offsetY

  for (var i = 0; i < enemySnake.segments.length; i++) {
    enemySnake.segments[i].x += offsetX
    enemySnake.segments[i].y += offsetY
  }
}

function drawSnake(posX, posY) {
  dragSegment(0, posX, posY)

  for (var i = 0; i < x.length - 1; i++) {
    dragSegment(i + 1, x[i], y[i], i < x.length - 2)
  }

  drawSnakeTail()
}

function dragSegment(i, xin, yin, shouldDraw) {
  var dx = xin - x[i]
  var dy = yin - y[i]
  var angle = Math.atan2(dy, dx)

  x[i] = xin - Math.cos(angle) * segLength
  y[i] = yin - Math.sin(angle) * segLength

  if (shouldDraw === false) return

  ctx.save()
  ctx.translate(x[i], y[i])
  ctx.rotate(angle + Math.PI / 2)

  var segmentImage = i === 0 ? wormHeadImage : wormBodyImage
  var imageReady = segmentImage.complete && segmentImage.naturalWidth > 0
  var segmentWidth = (i === 0 ? 28 : 24) * renderScale
  var segmentHeight = (i === 0 ? 46 : 34) * renderScale

  if (imageReady) {
    ctx.drawImage(
      segmentImage,
      -segmentWidth / 2,
      -segmentHeight / 2,
      segmentWidth,
      segmentHeight
    )
    if (i === 0) {
      drawSnakeFace(segmentWidth, segmentHeight)
    }
    ctx.restore()
    return
  }

  var segColor

  if (i === 0) segColor = 'red'
  else if (i % 3 === 1) segColor = 'rgba(255, 255, 255, 255)'
  else if (i % 3 === 2) segColor = 'rgba(255, 0, 255, 255)'
  else segColor = 'rgba(0, 0, 255, 255)'

  ctx.fillStyle = segColor
  ctx.beginPath()
  ctx.arc(0, 0, segLength / 2, 0, Math.PI * 2)
  ctx.fill()

  if (i === 0) {
    drawSnakeFace(28 * renderScale, 46 * renderScale)
  }

  ctx.rotate(-Math.PI / 2)
  drawLine(0, 0, segLength, 0, segColor, 10)

  ctx.restore()
}

function drawSnakeFace(segmentWidth, segmentHeight) {
  var faceScale = renderScale
  var eyeY = -segmentHeight * 0.2
  var eyeX = segmentWidth * 0.18
  var tongueCycle = Date.now() % 1800
  var tongueVisible = tongueCycle < 520

  ctx.save()
  ctx.lineCap = 'round'

  if (tongueVisible) {
    var tongueReach = (8 + Math.sin(tongueCycle / 520 * Math.PI) * 7) * faceScale
    var tongueStartY = -segmentHeight * 0.48
    var tongueEndY = tongueStartY - tongueReach

    ctx.strokeStyle = '#ff4a63'
    ctx.lineWidth = 1.7 * faceScale
    ctx.beginPath()
    ctx.moveTo(0, tongueStartY)
    ctx.quadraticCurveTo(1.5 * faceScale, tongueStartY - tongueReach * 0.45, 0, tongueEndY)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, tongueEndY)
    ctx.lineTo(-4 * faceScale, tongueEndY - 4 * faceScale)
    ctx.moveTo(0, tongueEndY)
    ctx.lineTo(4 * faceScale, tongueEndY - 4 * faceScale)
    ctx.stroke()
  }

  ctx.fillStyle = '#1a1409'
  ctx.strokeStyle = '#3a2409'
  ctx.lineWidth = 0.8 * faceScale
  ctx.beginPath()
  ctx.ellipse(-eyeX, eyeY, 3.1 * faceScale, 4 * faceScale, -0.15, 0, Math.PI * 2)
  ctx.ellipse(eyeX, eyeY, 3.1 * faceScale, 4 * faceScale, 0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#050403'
  ctx.beginPath()
  ctx.arc(-eyeX, eyeY + 0.2 * faceScale, 2.2 * faceScale, 0, Math.PI * 2)
  ctx.arc(eyeX, eyeY + 0.2 * faceScale, 2.2 * faceScale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.beginPath()
  ctx.arc(-eyeX - 0.7 * faceScale, eyeY - 0.9 * faceScale, 0.45 * faceScale, 0, Math.PI * 2)
  ctx.arc(eyeX - 0.7 * faceScale, eyeY - 0.9 * faceScale, 0.45 * faceScale, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawSnakeTail() {
  if (x.length < 2) return

  var tailIndex = x.length - 1
  var beforeTailIndex = tailIndex - 1
  var tailAngle = Math.atan2(y[tailIndex] - y[beforeTailIndex], x[tailIndex] - x[beforeTailIndex])
  var tailX = x[tailIndex] + Math.cos(tailAngle) * 8 * renderScale
  var tailY = y[tailIndex] + Math.sin(tailAngle) * 8 * renderScale

  ctx.save()
  ctx.translate(tailX, tailY)
  ctx.rotate(tailAngle)
  ctx.scale(renderScale, renderScale)

  ctx.beginPath()
  ctx.moveTo(-12, -11)
  ctx.quadraticCurveTo(3, -8, 16, 0)
  ctx.quadraticCurveTo(3, 8, -12, 11)
  ctx.quadraticCurveTo(-7, 4, -7, -4)
  ctx.closePath()

  var bodyImageReady = wormBodyImage.complete && wormBodyImage.naturalWidth > 0

  if (bodyImageReady) {
    ctx.save()
    ctx.clip()
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(wormBodyImage, -17, -13, 34, 26)
    ctx.restore()
  } else {
    ctx.fillStyle = '#e4c84c'
    ctx.fill()
  }

  ctx.strokeStyle = '#7c5f12'
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.strokeStyle = '#14110a'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-9, 0)
  ctx.quadraticCurveTo(2, -1.6, 12, 0)
  ctx.stroke()

  ctx.restore()
}

function changes(length) {
  x[length - 1] = x[length - 2]
  y[length - 1] = y[length - 2]
}

function addSnakeSegments(count) {
  for (var i = 0; i < count; i++) {
    changes(n - count + i + 1)
  }
}

function resetSnakeBody() {
  for (var i = 0; i < x.length; i++) {
    x[i] = snakeHead.x - Math.cos(headingAngle) * segLength * (i + 1)
    y[i] = snakeHead.y - Math.sin(headingAngle) * segLength * (i + 1)
  }
}

function foodRandom() {
  for (var i = 0; i < foods.length; i++) {
    if (foods[i].expiresAt && Date.now() >= foods[i].expiresAt && !foods[i].leavingArena) {
      sendEntityToNearestExit(foods[i])
    }

    if (foods[i].isBurning) {
      if (Date.now() >= foods[i].burnUntil) {
        foods.splice(i, 1)
        i--
        continue
      } else {
        foods[i].dx = 0
        foods[i].dy = 0
        continue
      }
    }

    if (!foods[i].initialized) {
      var spawn = getOffscreenSpawn(getRandomFoodSpeed(), 24 * renderScale)
      foods[i].x = spawn.x
      foods[i].y = spawn.y
      foods[i].dx = spawn.dx
      foods[i].dy = spawn.dy
      foods[i].facingAngle = Math.atan2(spawn.dy, spawn.dx)
      foods[i].pauseUntil = 0
      foods[i].nextTurnAt = Date.now() + 500 + Math.random() * 1300
      foods[i].fleeEnergy = mouseFleeStamina
      foods[i].lastMouseUpdateAt = Date.now()
      foods[i].initialized = true
      foods[i].enteringArena = true
    }

    if (foods[i].type === 'mouse' && !foods[i].enteringArena && !foods[i].leavingArena) {
      updateMouseMovement(foods[i])
    }

    foods[i].x += foods[i].dx
    foods[i].y += foods[i].dy

    var foodEdgeSize = 13 * renderScale

    if (foods[i].leavingArena) {
      foods[i].facingAngle = Math.atan2(foods[i].dy, foods[i].dx)

      if (isEntityOutsideArena(foods[i], foodEdgeSize + 18 * renderScale)) {
        foods.splice(i, 1)
        i--
      }

      continue
    }

    if (foods[i].enteringArena) {
      foods[i].facingAngle = Math.atan2(foods[i].dy, foods[i].dx)

      if (isEntityInsideArena(foods[i], foodEdgeSize)) {
        foods[i].enteringArena = false
      } else {
        continue
      }
    }

    applySnakeBodyBounce(foods[i])
    applyRoundedArenaBounds(foods[i], foodEdgeSize)

    if (foods[i].x < 0 || foods[i].x > canvas.width - foodEdgeSize) {
      foods[i].dx *= -1
      foods[i].facingAngle = Math.atan2(foods[i].dy, foods[i].dx)
      foods[i].x = Math.max(0, Math.min(canvas.width - foodEdgeSize, foods[i].x))
    }

    if (foods[i].y < 0 || foods[i].y > canvas.height - foodEdgeSize) {
      foods[i].dy *= -1
      foods[i].facingAngle = Math.atan2(foods[i].dy, foods[i].dx)
      foods[i].y = Math.max(0, Math.min(canvas.height - foodEdgeSize, foods[i].y))
    }

  }
}

function applySnakeBodyBounce(entity) {
  var entityRadius = 9 * renderScale
  var minDistance = snakeBodyBounceRadius + entityRadius
  var minDistanceSquared = minDistance * minDistance
  var nearestSegment = null
  var nearestDistanceSquared = Infinity

  for (var i = 0; i < x.length; i++) {
    var dxFromSegment = entity.x - x[i]
    var dyFromSegment = entity.y - y[i]
    var distanceSquared = dxFromSegment * dxFromSegment + dyFromSegment * dyFromSegment

    if (distanceSquared < minDistanceSquared && distanceSquared < nearestDistanceSquared) {
      nearestSegment = {
        dx: dxFromSegment,
        dy: dyFromSegment,
      }
      nearestDistanceSquared = distanceSquared
    }
  }

  if (!nearestSegment) return

  var distance = Math.sqrt(nearestDistanceSquared) || 0.001
  var normalX = nearestSegment.dx / distance
  var normalY = nearestSegment.dy / distance
  var overlap = minDistance - distance

  entity.x += normalX * overlap
  entity.y += normalY * overlap

  var velocityIntoBody = entity.dx * normalX + entity.dy * normalY
  if (velocityIntoBody < 0) {
    entity.dx -= 2 * velocityIntoBody * normalX
    entity.dy -= 2 * velocityIntoBody * normalY
  } else if (Math.abs(entity.dx) + Math.abs(entity.dy) < 0.01) {
    entity.dx = normalX * 1.2
    entity.dy = normalY * 1.2
  }

  entity.dx += normalX * 0.08
  entity.dy += normalY * 0.08
  entity.facingAngle = Math.atan2(entity.dy, entity.dx)
  entity.pauseUntil = 0
}

function updateMouseMovement(food) {
  var now = Date.now()
  var elapsed = Math.min(120, now - (food.lastMouseUpdateAt || now))
  var dxFromSnake = food.x - snakeHead.x
  var dyFromSnake = food.y - snakeHead.y
  var distanceFromSnake = Math.sqrt(dxFromSnake * dxFromSnake + dyFromSnake * dyFromSnake)
  var edgeVector = getEdgeAvoidanceVector(food)

  food.lastMouseUpdateAt = now

  var fleeRadius = mouseFleeRadius * renderScale

  if (!isBerserkerActive() && distanceFromSnake < fleeRadius && food.fleeEnergy > 0) {
    food.fleeEnergy = Math.max(0, food.fleeEnergy - elapsed)

    var fleeX = dxFromSnake
    var fleeY = dyFromSnake
    var sideStep = Math.sin(now * 0.011 + food.x * 0.03 + food.y * 0.02) * 0.45
    fleeX += -dyFromSnake * sideStep
    fleeY += dxFromSnake * sideStep

    if (edgeVector.x || edgeVector.y) {
      fleeX += edgeVector.x * 4.2
      fleeY += edgeVector.y * 4.2
    }

    var fleeAngle = Math.atan2(fleeY, fleeX)
    var panic = 1 - distanceFromSnake / fleeRadius
    var staminaScale = 0.55 + 0.45 * (food.fleeEnergy / mouseFleeStamina)
    var speed = (mouseFleeSpeed + panic * 0.45) * staminaScale * motionScale

    food.dx = Math.cos(fleeAngle) * speed
    food.dy = Math.sin(fleeAngle) * speed
    food.facingAngle = fleeAngle
    food.pauseUntil = 0
    food.nextTurnAt = now + 300
    return
  }

  food.fleeEnergy = Math.min(mouseFleeStamina, food.fleeEnergy + elapsed * 0.45)

  if (food.pauseUntil > now) {
    food.dx = 0
    food.dy = 0
    return
  }

  if (food.nextTurnAt > now) return

  if (Math.random() < 0.28) {
    food.pauseUntil = now + 350 + Math.random() * 900
    food.nextTurnAt = food.pauseUntil + 300 + Math.random() * 900
    food.dx = 0
    food.dy = 0
    return
  }

  var velocity = getRandomMouseVelocity()
  var wanderX = velocity.dx + edgeVector.x * 1.15
  var wanderY = velocity.dy + edgeVector.y * 1.15
  var wanderAngle = Math.atan2(wanderY, wanderX)
  var wanderSpeed = Math.sqrt(velocity.dx * velocity.dx + velocity.dy * velocity.dy)

  food.dx = Math.cos(wanderAngle) * wanderSpeed
  food.dy = Math.sin(wanderAngle) * wanderSpeed
  food.facingAngle = wanderAngle
  food.nextTurnAt = now + 450 + Math.random() * 1200
}

function getEdgeAvoidanceVector(food) {
  var xForce = 0
  var yForce = 0

  var edgeAvoidance = mouseEdgeAvoidance * renderScale
  var roundedCorrection = getRoundedArenaCorrection(food.x, food.y, 13 * renderScale)

  if (food.x < edgeAvoidance) {
    xForce += (edgeAvoidance - food.x) / edgeAvoidance
  } else if (food.x > canvas.width - edgeAvoidance) {
    xForce -= (food.x - (canvas.width - edgeAvoidance)) / edgeAvoidance
  }

  if (food.y < edgeAvoidance) {
    yForce += (edgeAvoidance - food.y) / edgeAvoidance
  } else if (food.y > canvas.height - edgeAvoidance) {
    yForce -= (food.y - (canvas.height - edgeAvoidance)) / edgeAvoidance
  }

  if (roundedCorrection) {
    xForce += roundedCorrection.normalX * roundedCorrection.strength * 2.25
    yForce += roundedCorrection.normalY * roundedCorrection.strength * 2.25
  }

  return {
    x: xForce,
    y: yForce,
  }
}

function applyRoundedArenaBounds(entity, padding) {
  var correction = getRoundedArenaCorrection(entity.x, entity.y, padding)
  if (!correction) return

  entity.x = correction.x
  entity.y = correction.y

  var velocityIntoWall = entity.dx * correction.normalX + entity.dy * correction.normalY
  if (velocityIntoWall <= 0) return

  entity.dx -= 2 * velocityIntoWall * correction.normalX
  entity.dy -= 2 * velocityIntoWall * correction.normalY
  entity.facingAngle = Math.atan2(entity.dy, entity.dx)
}

function applyRoundedSnakeBounds() {
  var correction = getRoundedArenaCorrection(snakeHead.x, snakeHead.y, 0)
  if (!correction) return

  snakeHead.x = correction.x
  snakeHead.y = correction.y

  var velocityX = Math.cos(headingAngle)
  var velocityY = Math.sin(headingAngle)
  var velocityIntoWall = velocityX * correction.normalX + velocityY * correction.normalY
  if (velocityIntoWall <= 0) return

  velocityX -= 2 * velocityIntoWall * correction.normalX
  velocityY -= 2 * velocityIntoWall * correction.normalY
  headingAngle = Math.atan2(velocityY, velocityX)
}

function getRoundedArenaCorrection(pointX, pointY, padding) {
  var radius = Math.max(padding + 8, arenaCornerRadius - padding)
  var left = padding
  var right = canvas.width - padding
  var top = padding
  var bottom = canvas.height - padding

  var cornerCenterX
  var cornerCenterY

  if (pointX < left + radius && pointY < top + radius) {
    cornerCenterX = left + radius
    cornerCenterY = top + radius
  } else if (pointX > right - radius && pointY < top + radius) {
    cornerCenterX = right - radius
    cornerCenterY = top + radius
  } else if (pointX < left + radius && pointY > bottom - radius) {
    cornerCenterX = left + radius
    cornerCenterY = bottom - radius
  } else if (pointX > right - radius && pointY > bottom - radius) {
    cornerCenterX = right - radius
    cornerCenterY = bottom - radius
  } else {
    return null
  }

  var dx = pointX - cornerCenterX
  var dy = pointY - cornerCenterY
  var distance = Math.sqrt(dx * dx + dy * dy)

  if (distance <= radius) return null

  var normalX = dx / distance
  var normalY = dy / distance
  var correctedX = cornerCenterX + normalX * radius
  var correctedY = cornerCenterY + normalY * radius

  return {
    x: correctedX,
    y: correctedY,
    normalX: normalX,
    normalY: normalY,
    strength: Math.min(1, (distance - radius) / radius),
  }
}

function getCanvasMinSide() {
  return window.matchMedia('(max-width: 820px)').matches ? 180 : 320
}

function getRenderScale() {
  var shortestSide = Math.min(canvas.width, canvas.height)
  return Math.max(0.52, Math.min(1, shortestSide / 620))
}

function getMotionScale() {
  var shortestSide = Math.min(canvas.width, canvas.height)
  return Math.max(0.56, Math.min(1, shortestSide / 700))
}

function getArenaCornerRadius() {
  var shortestSide = Math.min(canvas.width, canvas.height)
  return Math.max(34 * renderScale, Math.min(92 * renderScale, shortestSide * 0.16))
}

function drawLine(x1, y1, x2, y2, color, width) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}
