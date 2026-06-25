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
var fireballSpawnMinDelay = 55000
var fireballSpawnMaxDelay = 85000
var fireballMinBeetles = 5
var beetleBurnDuration = 1400
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
var boostDurationPerSegment = 35
var maxBoostDuration = 1500
var boostCooldown = 3000
var boostEnergy = baseBoostDuration
var lastBoostUpdateAt = Date.now()
var touchBoosting = false
var pressedKeys = {}
var turnRate = 0.052
var animationRequestId
var foodSpawnIntervalId
var playing = false
var wormHeadImage = new Image()
var wormBodyImage = new Image()
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

playSnakeGameBtn.addEventListener('click', function () {
  if (!playing) {
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
    resetBoost()
  }
})

function resizeCanvas() {
  var rect = gameStage.getBoundingClientRect()
  canvas.width = Math.max(getCanvasMinSide(), Math.floor(rect.width))
  canvas.height = Math.max(getCanvasMinSide(), Math.floor(rect.height))
  renderScale = getRenderScale()
  motionScale = getMotionScale()
  segLength = 10 * renderScale
  arenaCornerRadius = getArenaCornerRadius()
  snakeBodyBounceRadius = 18 * renderScale
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

  document.getElementById('high-score').innerHTML = getHighScore()

  if (foods.length === 0) {
    foods.push(generateFood())
  }

  if (!nextFireballSpawnAt) {
    scheduleNextFireball()
  }

  startFoodTimer()
  lastBoostUpdateAt = Date.now()
  requestAnimationFrame(animate)
}

function setupControls() {
  setupTouchJoystick()

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
  })
}

function setupTouchJoystick() {
  joystickBox = document.querySelector('[data-mobile-control="joystick"]')
  boostBox = document.querySelector('[data-mobile-control="boost"]')
  joystickOrigin = document.getElementById('joystick-origin')
  joystickHandle = document.getElementById('joystick-handle')
  boostControlGauges = document.querySelectorAll('.boost-control-gauge')
  boostVisualStates = document.querySelectorAll('.boost-visual-state')

  if (joystickBox) {
    joystickBox.addEventListener('pointerdown', handleJoystickPointerDown)
    joystickBox.addEventListener('pointermove', handleJoystickPointerMove)
    joystickBox.addEventListener('pointerup', handleJoystickPointerUp)
    joystickBox.addEventListener('pointercancel', handleJoystickPointerUp)
    joystickBox.addEventListener('lostpointercapture', handleJoystickPointerUp)
  }

  if (boostBox) {
    boostBox.addEventListener('pointerdown', handleBoostPointerDown)
    boostBox.addEventListener('pointerup', handleBoostPointerUp)
    boostBox.addEventListener('pointercancel', handleBoostPointerUp)
    boostBox.addEventListener('lostpointercapture', handleBoostPointerUp)
  }
}

function handleJoystickPointerDown(evt) {
  if (joystickActive) return

  evt.preventDefault()
  joystickActive = true
  joystickTouchId = evt.pointerId
  joystickCurrentX = evt.clientX
  joystickCurrentY = evt.clientY
  evt.currentTarget.setPointerCapture(evt.pointerId)
  steerTarget = undefined
  updateJoystickVisual()
}

function handleJoystickPointerMove(evt) {
  if (evt.pointerId === joystickTouchId && joystickActive) {
    evt.preventDefault()
    joystickCurrentX = evt.clientX
    joystickCurrentY = evt.clientY
    var joystickRect = joystickBox.getBoundingClientRect()
    
    // Calculate distance from start
    var deltaX = joystickCurrentX - (joystickRect.left + joystickRect.width / 2)
    var deltaY = joystickCurrentY - (joystickRect.top + joystickRect.height / 2)
    var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Only apply steering if beyond deadzone
    if (distance > joystickDeadzone) {
      steerAngleTarget = Math.atan2(deltaY, deltaX)
    }

    updateJoystickVisual()
  }
}

function handleJoystickPointerUp(evt) {
  if (evt.pointerId === joystickTouchId) {
    joystickActive = false
    joystickTouchId = null
    steerAngleTarget = undefined
    updateJoystickVisual()
  }
}

function handleBoostPointerDown(evt) {
  if (boostTouchActive) return

  evt.preventDefault()
  boostTouchActive = true
  boostTouchId = evt.pointerId
  evt.currentTarget.setPointerCapture(evt.pointerId)
  updateBoostMeterStatus()
}

function handleBoostPointerUp(evt) {
  if (evt.pointerId === boostTouchId) {
    boostTouchActive = false
    boostTouchId = null
    updateBoostMeterStatus()
  }
}

function releaseMobileControls() {
  joystickActive = false
  joystickTouchId = null
  boostTouchActive = false
  boostTouchId = null
  mobileControls.left = false
  mobileControls.right = false
  mobileControls.boost = false
  touchBoosting = false
  steerAngleTarget = undefined
  updateJoystickVisual()
  updateBoostMeterStatus()
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

function generateFood(forceBad) {
  var velocity = getRandomFoodVelocity()
  var isBad = forceBad === undefined ? Math.random() < 0.38 : forceBad
  var foodMargin = 20 * renderScale

  return {
    x: foodMargin / 2 + Math.random() * (canvas.width - foodMargin),
    y: foodMargin / 2 + Math.random() * (canvas.height - foodMargin),
    dx: velocity.dx,
    dy: velocity.dy,
    facingAngle: Math.atan2(velocity.dy, velocity.dx),
    isBad: isBad,
    initialized: true,
    pauseUntil: 0,
    nextTurnAt: Date.now() + 500 + Math.random() * 1300,
    fleeEnergy: mouseFleeStamina,
  }
}

function getRandomFoodVelocity() {
  var angle = Math.random() * Math.PI * 2
  var speed = (0.9 + Math.random() * 1.05) * motionScale

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
  foodSpawnIntervalId = window.setInterval(function () {
    if (playing) {
      foods.push(generateFood())
    }
  }, 15000)
}

function stopFoodTimer() {
  if (foodSpawnIntervalId) {
    window.clearInterval(foodSpawnIntervalId)
    foodSpawnIntervalId = undefined
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
      updateBoostEnergy()
      updateBoostMeterStatus()
      foodRandom()
      updateFireball()
      moveSnakeHead()

      for (var i = 0; i < foods.length; i++) {
        if (
          snakeHead.x > foods[i].x - renderScale &&
          snakeHead.x < foods[i].x + 18 * renderScale &&
          snakeHead.y > foods[i].y - renderScale &&
          snakeHead.y < foods[i].y + 18 * renderScale
        ) {
          if (foods[i].isBurning) {
            drawFood(foods[i])
            continue
          }

          if (foods[i].isBad) {
            n = startingSegments
            x = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
            y = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
            resetSnakeBody()
            score = 0
            document.getElementById('score').innerHTML = score
            playSound('badFoodSound')
          } else {
            n += 1
            score += 1
            document.getElementById('score').innerHTML = score
            changes(n)
            playSound('goodFoodSound')
          }

          if (score > getHighScore()) {
            setHighScore(score)
          }

          foods[i] = generateFood()
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

      document.getElementById('high-score').innerHTML = getHighScore()
      drawSnake(snakeHead.x, snakeHead.y)
    }

    animationRequestId = requestAnimationFrame(animate)
  }
}

function drawFood(food) {
  if (food.isBad) {
    drawBadFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle, food.isBurning)
  } else {
    drawGoodFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle)
  }
}

function isSnakeTouchingEntity(entity, radius) {
  var dx = snakeHead.x - entity.x
  var dy = snakeHead.y - entity.y
  return dx * dx + dy * dy < radius * radius
}

function drawGoodFood(centerX, centerY, angle) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(232, 209, 184, 0.18)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#c99b83'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-13, 2)
  ctx.quadraticCurveTo(-23, 6, -28, 0)
  ctx.quadraticCurveTo(-31, -4, -35, -2)
  ctx.stroke()

  ctx.fillStyle = '#9d8d83'
  ctx.beginPath()
  ctx.ellipse(-3, 0, 12, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#c3b4aa'
  ctx.beginPath()
  ctx.ellipse(11, 0, 7, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#9d8d83'
  ctx.beginPath()
  ctx.arc(8, -5, 2.6, 0, Math.PI * 2)
  ctx.arc(8, 5, 2.6, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e1c3bd'
  ctx.beginPath()
  ctx.arc(8, -5, 1.4, 0, Math.PI * 2)
  ctx.arc(8, 5, 1.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2a1b18'
  ctx.beginPath()
  ctx.arc(16, 0, 1.2, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#d9cbc0'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(15, -1)
  ctx.lineTo(20, -3)
  ctx.moveTo(15, 1)
  ctx.lineTo(20, 3)
  ctx.stroke()

  ctx.fillStyle = '#7f7068'
  ctx.beginPath()
  ctx.ellipse(-5, -8, 2.2, 1.1, 0, 0, Math.PI * 2)
  ctx.ellipse(2, -8, 2.2, 1.1, 0, 0, Math.PI * 2)
  ctx.ellipse(-5, 8, 2.2, 1.1, 0, 0, Math.PI * 2)
  ctx.ellipse(2, 8, 2.2, 1.1, 0, 0, Math.PI * 2)
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

  ctx.strokeStyle = '#1b080f'
  ctx.lineWidth = 2
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
  var velocity = getRandomFoodVelocity()
  var fireballMargin = 40 * renderScale

  return {
    x: fireballMargin / 2 + Math.random() * (canvas.width - fireballMargin),
    y: fireballMargin / 2 + Math.random() * (canvas.height - fireballMargin),
    dx: velocity.dx * 1.12,
    dy: velocity.dy * 1.12,
    facingAngle: Math.atan2(velocity.dy, velocity.dx),
    expiresAt: Date.now() + fireballLifetime,
  }
}

function scheduleNextFireball() {
  nextFireballSpawnAt = Date.now() + fireballSpawnMinDelay + Math.random() * (fireballSpawnMaxDelay - fireballSpawnMinDelay)
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
  var burnedAny = false

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad && !foods[i].isBurning) {
      foods[i].isBurning = true
      foods[i].burnUntil = now + beetleBurnDuration
      foods[i].dx = 0
      foods[i].dy = 0
      foods[i].pauseUntil = foods[i].burnUntil
      burnedAny = true
    }
  }

  if (burnedAny) {
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

  if (steerTarget) {
    var targetAngle = Math.atan2(steerTarget.y - snakeHead.y, steerTarget.x - snakeHead.x)
    headingAngle = turnTowardAngle(headingAngle, targetAngle, turnRate)
  } else if (steerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, steerAngleTarget, turnRate)
  }

  var currentSpeed = snakeSpeed * motionScale
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
    mobileControls.boost
  )
}

function resetBoost() {
  boostCoolingDown = false
  boostEnergy = getBoostDuration()
  touchBoosting = false
  releaseMobileControls()
  lastBoostUpdateAt = Date.now()
  setBoosting(false)
  updateBoostMeterStatus()
}

function setBoosting(nextBoosting) {
  boosting = nextBoosting
  document.body.classList.toggle('is-boosting', boosting)
  updateBoostMeterStatus()
}

function updateBoostMeterStatus() {
  var boostMeterFill = document.getElementById('boost-meter-fill')

  var maxEnergy = getBoostDuration()
  var boostProgress = boostEnergy / maxEnergy
  var boostHeld = isBoostControlActive()
  var boostState = 'ready'

  if (boosting) {
    boostState = 'active'
    updateBoostMeter(boostMeterFill, boostProgress, boostState)
    updateBoostControlVisual(boostProgress, boostState)
    return
  }

  if (boostHeld && boostEnergy <= 0) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, 0, boostState)
    updateBoostControlVisual(0, boostState)
    return
  }

  if (boostCoolingDown) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, boostProgress, boostState)
    updateBoostControlVisual(boostProgress, boostState)
    return
  }

  updateBoostMeter(boostMeterFill, 1, boostState)
  updateBoostControlVisual(1, boostState)
}

function updateBoostMeter(meterFill, progress, state) {
  if (!meterFill) return

  meterFill.style.width = Math.max(0, Math.min(1, progress)) * 100 + '%'
  meterFill.className = 'boost-meter-fill ' + state
}

function updateBoostControlVisual(progress, state) {
  var clampedProgress = Math.max(0, Math.min(1, progress))

  for (var i = 0; i < boostControlGauges.length; i++) {
    boostControlGauges[i].style.setProperty('--boost-progress', clampedProgress * 100 + '%')
  }

  for (var j = 0; j < boostVisualStates.length; j++) {
    boostVisualStates[j].classList.toggle('is-active', state === 'active')
    boostVisualStates[j].classList.toggle('is-cooling', state === 'cooldown')
  }
}

function turnTowardAngle(current, target, amount) {
  var difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  var turnAmount = Math.max(-amount, Math.min(amount, difference))
  return current + turnAmount
}

function playSound(id) {
  var sound = document.getElementById(id)
  if (!sound) return

  sound.currentTime = 0
  sound.play().catch(function () {})
}

function updateHighScore(nextScore) {
  if (nextScore > getHighScore()) {
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
  try {
    localStorage.setItem('high-score', nextScore)
  } catch {}
}

function drawSnake(posX, posY) {
  dragSegment(0, posX, posY)

  for (var i = 0; i < x.length - 1; i++) {
    dragSegment(i + 1, x[i], y[i])
  }
}

function dragSegment(i, xin, yin) {
  var dx = xin - x[i]
  var dy = yin - y[i]
  var angle = Math.atan2(dy, dx)

  x[i] = xin - Math.cos(angle) * segLength
  y[i] = yin - Math.sin(angle) * segLength

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

  ctx.rotate(-Math.PI / 2)
  drawLine(0, 0, segLength, 0, segColor, 10)

  ctx.restore()
}

function changes(length) {
  x[length - 1] = x[length - 2]
  y[length - 1] = y[length - 2]
}

function resetSnakeBody() {
  for (var i = 0; i < x.length; i++) {
    x[i] = snakeHead.x - Math.cos(headingAngle) * segLength * (i + 1)
    y[i] = snakeHead.y - Math.sin(headingAngle) * segLength * (i + 1)
  }
}

function foodRandom() {
  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBurning) {
      if (Date.now() >= foods[i].burnUntil) {
        foods[i] = generateFood(false)
      } else {
        foods[i].dx = 0
        foods[i].dy = 0
        continue
      }
    }

    if (!foods[i].initialized) {
      foods[i].x = Math.random() * canvas.width
      foods[i].y = Math.random() * canvas.height
      var velocity = getRandomFoodVelocity()
      foods[i].dx = velocity.dx
      foods[i].dy = velocity.dy
      foods[i].facingAngle = Math.atan2(velocity.dy, velocity.dx)
      foods[i].pauseUntil = 0
      foods[i].nextTurnAt = Date.now() + 500 + Math.random() * 1300
      foods[i].fleeEnergy = mouseFleeStamina
      foods[i].lastMouseUpdateAt = Date.now()
      foods[i].initialized = true
    }

    if (!foods[i].isBad) {
      updateMouseMovement(foods[i])
    }

    foods[i].x += foods[i].dx
    foods[i].y += foods[i].dy

    var foodEdgeSize = 13 * renderScale

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

  if (distanceFromSnake < fleeRadius && food.fleeEnergy > 0) {
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
  var correction = getRoundedArenaCorrection(snakeHead.x, snakeHead.y, segLength * 1.8)
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
