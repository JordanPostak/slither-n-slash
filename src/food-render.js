// Food, prey, poison beetle, protection, and orange-reward rendering.

function drawFood(food) {
  var foodSizeScale = food.sizeScale || 1

  ctx.save()
  ctx.translate(food.x, food.y)
  ctx.scale(foodSizeScale, foodSizeScale)
  ctx.translate(-food.x, -food.y)

  if (food.type === 'centipede-orb') {
    drawCentipedeOrb(food)
  } else if (food.isBad) {
    drawBadFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle, food.isBurning)
  } else if (food.type === 'grub') {
    drawGrubFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle)
  } else {
    drawGoodFood(food.x + 6 * renderScale, food.y + 5 * renderScale, food.facingAngle, isEntityMoving(food))
  }

  if (food.crushProgress > 0 && food.type !== 'centipede-orb') {
    drawFoodCrushTransformation(food)
  }

  if (isPoisonBeetleSpawnProtected(food)) {
    drawPoisonBeetleSpawnProtection(food)
  }

  ctx.restore()
}

function isPoisonBeetleSpawnProtected(food) {
  return Boolean(food && food.isBad && food.spawnProtectionUntil > Date.now())
}

function drawPoisonBeetleSpawnProtection(food) {
  var remaining = Math.max(0, food.spawnProtectionUntil - Date.now())
  var progress = remaining / poisonBeetleSpawnProtectionDuration
  var pulse = 1 + Math.sin(Date.now() * 0.018) * 0.08

  ctx.save()
  ctx.strokeStyle = 'rgba(107, 218, 255, ' + (0.35 + progress * 0.45) + ')'
  ctx.lineWidth = 2 * renderScale
  ctx.setLineDash([4 * renderScale, 3 * renderScale])
  ctx.beginPath()
  ctx.arc(food.x + 6 * renderScale, food.y + 5 * renderScale, 18 * renderScale * pulse, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawFoodCrushTransformation(food) {
  var progress = food.crushProgress || 0
  var centerX = food.x + 6 * renderScale
  var centerY = food.y + 5 * renderScale
  var radiusX = food.type === 'mouse' ? 16 : food.type === 'grub' ? 12 : 13
  var radiusY = food.type === 'mouse' ? 9 : food.type === 'grub' ? 6 : 9

  ctx.save()
  ctx.globalAlpha = progress * 0.9
  ctx.fillStyle = '#f47c20'
  ctx.beginPath()
  ctx.ellipse(
    centerX,
    centerY,
    radiusX * renderScale,
    radiusY * renderScale,
    food.facingAngle || 0,
    0,
    Math.PI * 2
  )
  ctx.fill()
  ctx.restore()
}

function drawCentipedeOrb(orb) {
  var pulse = 0.86 + Math.sin(Date.now() * 0.014 + (orb.pulseOffset || 0)) * 0.14
  var radius = 7 * renderScale * pulse

  ctx.save()
  ctx.translate(orb.x, orb.y)
  ctx.fillStyle = 'rgba(255, 111, 22, 0.18)'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 2.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 138, 36, 0.42)'
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ff8a24'
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffd071'
  ctx.beginPath()
  ctx.arc(-2 * renderScale, -2 * renderScale, radius * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawGoldenMouse(mouse) {
  var pulse = 0.72 + Math.sin(Date.now() * 0.012) * 0.18
  var mouseSizeScale = mouse.sizeScale || 1

  ctx.save()
  ctx.translate(mouse.x, mouse.y)
  ctx.scale(mouseSizeScale, mouseSizeScale)
  ctx.translate(-mouse.x, -mouse.y)
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
  ctx.restore()
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

function isSnakeTouchingEntity(entity, radius) {
  var dx = snakeHead.x - entity.x
  var dy = snakeHead.y - entity.y
  radius += 10 * renderScale * (getPlayerSizeScale() - 1)
  return dx * dx + dy * dy < radius * radius
}

function repelEntityFromSnake(entity, minimumDistance) {
  var dx = entity.x - snakeHead.x
  var dy = entity.y - snakeHead.y
  var distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < 0.001) {
    dx = -Math.cos(headingAngle)
    dy = -Math.sin(headingAngle)
    distance = 1
  }

  var normalX = dx / distance
  var normalY = dy / distance
  var pushSpeed = 4.2 * motionScale

  entity.x = snakeHead.x + normalX * minimumDistance
  entity.y = snakeHead.y + normalY * minimumDistance
  entity.dx = normalX * pushSpeed
  entity.dy = normalY * pushSpeed
  entity.facingAngle = Math.atan2(entity.dy, entity.dx)
  entity.pauseUntil = 0
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
