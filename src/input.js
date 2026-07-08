// Canvas setup plus keyboard, gamepad, pointer, and mobile input handling.

function resizeCanvas() {
  var rect = gameStage.getBoundingClientRect()
  var oldWidth = canvas.width
  var oldHeight = canvas.height
  var arenaExpansionScale = getArenaExpansionScale()
  var nextWidth = Math.max(getCanvasMinSide(), Math.floor(rect.width * arenaExpansionScale))
  var nextHeight = Math.max(getCanvasMinSide(), Math.floor(rect.height * arenaExpansionScale))
  var hasActiveWorld = snakeHead.x !== 0 || snakeHead.y !== 0

  canvas.width = nextWidth
  canvas.height = nextHeight

  if (hasActiveWorld && (oldWidth !== nextWidth || oldHeight !== nextHeight)) {
    shiftWorldForArenaResize((nextWidth - oldWidth) / 2, (nextHeight - oldHeight) / 2)
  }

  renderScale = getRenderScale()
  motionScale = getMotionScale()
  segLength = 10 * renderScale
  // Keep every player section the same apparent length as the arena zooms out.
  playerSegmentSpacing = 19 * renderScale * arenaExpansionScale
  arenaCornerRadius = getArenaCornerRadius()
  snakeBodyBounceRadius = 18 * renderScale
  swallowRadius = 24 * renderScale
  var baseArenaTileSize = parseFloat(window.getComputedStyle(gameStage).getPropertyValue('--arena-tile-size')) || 420
  gameStage.style.setProperty('--arena-corner-radius', arenaCornerRadius / arenaExpansionScale + 'px')
  gameStage.style.setProperty('--arena-background-tile-size', baseArenaTileSize / arenaExpansionScale + 'px')
  nextSnakeTrapScanAt = 0
}

function requestArenaResize() {
  arenaResizePending = true
}

function shiftWorldForArenaResize(offsetX, offsetY) {
  snakeHead.x += offsetX
  snakeHead.y += offsetY

  for (var segmentIndex = 0; segmentIndex < x.length; segmentIndex++) {
    x[segmentIndex] += offsetX
    y[segmentIndex] += offsetY
  }

  snakeTailPoint.x += offsetX
  snakeTailPoint.y += offsetY

  for (var trailIndex = 0; trailIndex < snakeTrail.length; trailIndex++) {
    snakeTrail[trailIndex].x += offsetX
    snakeTrail[trailIndex].y += offsetY
  }

  for (var foodIndex = 0; foodIndex < foods.length; foodIndex++) {
    foods[foodIndex].x += offsetX
    foods[foodIndex].y += offsetY
  }

  for (var enemyIndex = 0; enemyIndex < badSnakes.length; enemyIndex++) {
    moveBadSnake(badSnakes[enemyIndex], offsetX, offsetY)
  }

  for (var poofIndex = 0; poofIndex < centipedePoofs.length; poofIndex++) {
    var poof = centipedePoofs[poofIndex]
    poof.x += offsetX
    poof.y += offsetY

    for (var particleIndex = 0; particleIndex < poof.particles.length; particleIndex++) {
      poof.particles[particleIndex].x += offsetX
      poof.particles[particleIndex].y += offsetY
    }
  }

  if (fireball) {
    fireball.x += offsetX
    fireball.y += offsetY
  }

  if (goldenMouse) {
    goldenMouse.x += offsetX
    goldenMouse.y += offsetY
  }

  if (steerTarget) {
    steerTarget.x += offsetX
    steerTarget.y += offsetY
  }
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

    resetSnakeBody()
  } else if (snakeTrail.length === 0) {
    resetSnakeBody()
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
    if (!shouldCaptureGameKeyboard(evt)) return

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
    var isGameKey = evt.key === 'Shift' || evt.key === ' ' || isMovementKey(evt.key)
    if (!isGameKey) return

    pressedKeys[evt.key] = false

    if (!shouldCaptureGameKeyboard(evt)) return

    if (evt.key === 'Shift' || evt.key === ' ') {
      evt.preventDefault()
    }

    if (!isMovementKey(evt.key)) return

    evt.preventDefault()
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

function shouldCaptureGameKeyboard(evt) {
  if (!playing) return false

  var target = evt.target
  if (target && target.closest && target.closest('input, textarea, select, button, a, [contenteditable="true"]')) {
    return false
  }

  var rect = gameStage.getBoundingClientRect()
  var visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)
  var requiredVisibleHeight = Math.min(rect.height * 0.35, window.innerHeight * 0.35)

  return visibleHeight >= requiredVisibleHeight
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
    handlePrimaryGameToggle()
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
  boostCapacityElements = document.querySelectorAll('[data-boost-capacity]')

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
  if (!playing || evt.pointerType === 'mouse' || joystickActive) return

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
  if (!playing || evt.pointerType === 'mouse' || boostTouchActive) return

  evt.preventDefault()
  evt.stopPropagation()
  boostTouchActive = true
  boostTouchId = evt.pointerId
  boostTouchStartY = evt.clientY
  boostTouchCurrentY = evt.clientY
  mobileCoilSlashActive = false
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

  if (evt.pointerId === boostTouchId) {
    handleBoostPointerMove(evt)
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
  boostTouchStartY = 0
  boostTouchCurrentY = 0
  mobileCoilSlashActive = false
  if (boostBox) {
    boostBox.classList.remove('is-pressed')
    boostBox.classList.remove('is-coil-input')
  }
  updateBoostMeterStatus(true)
}

function handleBoostPointerMove(evt) {
  if (evt.pointerId !== boostTouchId || !boostTouchActive) return

  evt.preventDefault()
  evt.stopPropagation()
  boostTouchCurrentY = evt.clientY

  var dragDownDistance = boostTouchCurrentY - boostTouchStartY
  var coilDragThreshold = Math.max(28, (boostBox ? boostBox.offsetHeight : 96) * 0.24)

  mobileCoilSlashActive = dragDownDistance >= coilDragThreshold
  if (boostBox) boostBox.classList.toggle('is-coil-input', mobileCoilSlashActive)
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
  mobileCoilSlashActive = false
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
    key === 'ArrowDown' ||
    key === 'a' ||
    key === 'A' ||
    key === 'd' ||
    key === 'D' ||
    key === 'w' ||
    key === 'W' ||
    key === 's' ||
    key === 'S'
  )
}
