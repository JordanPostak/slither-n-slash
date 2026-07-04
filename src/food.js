// Food creation, spawn scheduling, and basic prey velocities.

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
    spawnProtectionUntil: 0,
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
