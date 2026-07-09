// Food creation, spawn scheduling, and basic prey velocities.

function generateFood(foodType) {
  if (foodType === true) foodType = 'beetle'
  if (foodType === false) foodType = 'mouse'
  if (!foodType) foodType = 'grub'

  var isBad = foodType === 'beetle'
  var isGrub = foodType === 'grub'
  var isMouse = foodType === 'mouse'
  var sizeScale = isMouse ? mouseBaseSizeScale : 1
  var baseGrowthValue = isBad ? 0 : isGrub ? 1 : mouseGrowthValue
  var spawn = getOffscreenSpawn(
    isGrub ? getRandomGrubSpeed() : isMouse ? getRandomMouseTravelSpeed() : getRandomFoodSpeed(),
    24 * renderScale * sizeScale
  )
  var now = Date.now()

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    type: foodType,
    sizeScale: sizeScale,
    growthValue: isMouse
      ? mouseGrowthValue
      : baseGrowthValue ? Math.max(baseGrowthValue, Math.round(baseGrowthValue * sizeScale)) : 0,
    swallowRadius: (isGrub ? 30 : 24) * renderScale * sizeScale,
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
  var speed = getRandomMouseTravelSpeed()

  return {
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
  }
}

function getRandomMouseTravelSpeed() {
  return (2.35 + Math.random() * 1.95) * motionScale
}

function startFoodTimer() {
  stopFoodTimer()

  var activeGrubCount = 0
  for (var foodIndex = 0; foodIndex < foods.length; foodIndex++) {
    if (foods[foodIndex].type === 'grub') activeGrubCount++
  }

  for (var grubIndex = activeGrubCount; grubIndex < grubStartCount; grubIndex++) {
    spawnTimedFood('grub')
  }

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
  if (foodType === 'mouse' && getPlayerProgressLength() < mouseUnlockLength) return

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
  var scaleX = canvas.width / Math.max(1, rect.width)
  var scaleY = canvas.height / Math.max(1, rect.height)
  var pointerX = Math.max(0, Math.min(canvas.width - 1, (clientX - rect.left) * scaleX))
  var pointerY = Math.max(0, Math.min(canvas.height - 1, (clientY - rect.top) * scaleY))

  return {
    x: pointerX,
    y: pointerY,
  }
}
