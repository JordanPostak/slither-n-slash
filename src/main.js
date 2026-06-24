var canvas, ctx
var n = 3
var score = 0
var a = 0
var segLength = 10
var foods = []
var x = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var y = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var steerTarget
var snakeHead = { x: 0, y: 0 }
var headingAngle = 0
var snakeSpeed = 3.8
var boostMultiplier = 2.05
var mouseFleeRadius = 145
var mouseFleeSpeed = 4.8
var mouseFleeStamina = 1200
var mouseEdgeAvoidance = 70
var boosting = false
var boostCoolingDown = false
var baseBoostDuration = 500
var boostDurationPerSegment = 35
var maxBoostDuration = 1500
var boostCooldown = 3000
var boostEnergy = baseBoostDuration
var lastBoostUpdateAt = Date.now()
var touchBoosting = false
var braking = false
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
  slow: false,
}
var renderScale = 1

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
  segLength = 10 * renderScale
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

  startFoodTimer()
  lastBoostUpdateAt = Date.now()
  requestAnimationFrame(animate)
}

function setupControls() {
  setupMobileControlButtons()

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
    braking = false
  })

  window.addEventListener('blur', function () {
    releaseMobileControls()
  })
}

function setupMobileControlButtons() {
  var controlButtons = document.querySelectorAll('[data-touch-control]')

  for (var i = 0; i < controlButtons.length; i++) {
    addMobileControlButton(controlButtons[i])
  }
}

function addMobileControlButton(button) {
  var controlName = button.getAttribute('data-touch-control')

  button.addEventListener('pointerdown', function (evt) {
    evt.preventDefault()
    button.setPointerCapture(evt.pointerId)
    setMobileControl(controlName, true)
  })

  button.addEventListener('pointerup', function (evt) {
    evt.preventDefault()
    setMobileControl(controlName, false)
  })

  button.addEventListener('pointercancel', function () {
    setMobileControl(controlName, false)
  })

  button.addEventListener('lostpointercapture', function () {
    setMobileControl(controlName, false)
  })
}

function setMobileControl(controlName, isActive) {
  if (!Object.prototype.hasOwnProperty.call(mobileControls, controlName)) return

  mobileControls[controlName] = isActive
  if (isActive && (controlName === 'left' || controlName === 'right')) {
    steerTarget = undefined
  }
}

function releaseMobileControls() {
  mobileControls.left = false
  mobileControls.right = false
  mobileControls.boost = false
  mobileControls.slow = false
  touchBoosting = false
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

function generateFood() {
  var velocity = getRandomFoodVelocity()
  var isBad = Math.random() < 0.38
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
  var speed = 1.35 + Math.random() * 1.45

  return {
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  }
}

function getRandomMouseVelocity() {
  var angle = Math.random() * Math.PI * 2
  var speed = 0.8 + Math.random() * 1.65

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
      moveSnakeHead()

      for (var i = 0; i < foods.length; i++) {
        if (
          snakeHead.x > foods[i].x - renderScale &&
          snakeHead.x < foods[i].x + 18 * renderScale &&
          snakeHead.y > foods[i].y - renderScale &&
          snakeHead.y < foods[i].y + 18 * renderScale
        ) {
          if (foods[i].isBad) {
            n = 3
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

      document.getElementById('high-score').innerHTML = getHighScore()
      drawSnake(snakeHead.x, snakeHead.y)
    }

    animationRequestId = requestAnimationFrame(animate)
  }
}

function drawFood(food) {
  if (food.isBad) {
    drawBadFood(food.x + 6 * renderScale, food.y + 5 * renderScale)
  } else {
    drawGoodFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle)
  }
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

function drawBadFood(centerX, centerY) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(120, 255, 86, 0.14)'
  ctx.beginPath()
  ctx.arc(0, 0, 17, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#6f1430'
  ctx.strokeStyle = '#260710'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#9e1c41'
  ctx.beginPath()
  ctx.arc(0, 0, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#2e2115'
  ctx.beginPath()
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#b7e24a'
  ctx.beginPath()
  ctx.arc(-5, -6, 2.1, 0, Math.PI * 2)
  ctx.arc(5, -5, 1.8, 0, Math.PI * 2)
  ctx.arc(7, 3, 2.3, 0, Math.PI * 2)
  ctx.arc(-6, 5, 1.7, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#d5ff62'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-8, -1)
  ctx.lineTo(-2, 1)
  ctx.lineTo(1, -4)
  ctx.moveTo(3, 2)
  ctx.lineTo(8, -1)
  ctx.moveTo(-1, 5)
  ctx.lineTo(4, 8)
  ctx.stroke()

  ctx.restore()
}

function moveSnakeHead() {
  applyKeyboardControls()

  if (steerTarget) {
    var targetAngle = Math.atan2(steerTarget.y - snakeHead.y, steerTarget.x - snakeHead.x)
    headingAngle = turnTowardAngle(headingAngle, targetAngle, 0.12)
  }

  var currentSpeed = snakeSpeed * (0.84 + renderScale * 0.16)
  if (boosting) currentSpeed *= boostMultiplier
  if (braking) currentSpeed *= 0.48

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
}

function applyKeyboardControls() {
  var turningLeft = pressedKeys.ArrowLeft || pressedKeys.a || pressedKeys.A || mobileControls.left
  var turningRight = pressedKeys.ArrowRight || pressedKeys.d || pressedKeys.D || mobileControls.right
  var brakingBackward = pressedKeys.ArrowDown || pressedKeys.s || pressedKeys.S || mobileControls.slow

  if (turningLeft && !turningRight) {
    headingAngle -= turnRate
    steerTarget = undefined
  }

  if (turningRight && !turningLeft) {
    headingAngle += turnRate
    steerTarget = undefined
  }

  braking = Boolean(brakingBackward)
}

function getBoostDuration() {
  var extraSegments = Math.max(0, n - 3)
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
  if (!boostMeterFill) return

  var maxEnergy = getBoostDuration()
  var boostProgress = boostEnergy / maxEnergy
  var boostHeld = isBoostControlActive()

  if (boosting) {
    updateBoostMeter(boostMeterFill, boostProgress, 'active')
    return
  }

  if (boostHeld && boostEnergy <= 0) {
    updateBoostMeter(boostMeterFill, 0, 'cooldown')
    return
  }

  if (boostCoolingDown) {
    updateBoostMeter(boostMeterFill, boostProgress, 'cooldown')
    return
  }

  updateBoostMeter(boostMeterFill, 1, 'ready')
}

function updateBoostMeter(meterFill, progress, state) {
  meterFill.style.width = Math.max(0, Math.min(1, progress)) * 100 + '%'
  meterFill.className = 'boost-meter-fill ' + state
}

function turnTowardAngle(current, target, amount) {
  var difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  return current + difference * amount
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
    var speed = (mouseFleeSpeed + panic * 0.6) * staminaScale

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

  return {
    x: xForce,
    y: yForce,
  }
}

function getCanvasMinSide() {
  return window.matchMedia('(max-width: 820px)').matches ? 180 : 320
}

function getRenderScale() {
  var shortestSide = Math.min(canvas.width, canvas.height)
  return Math.max(0.68, Math.min(1, shortestSide / 520))
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
