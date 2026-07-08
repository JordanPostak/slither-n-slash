// Food movement, mouse AI, arena bounds, responsive scaling, and world geometry.

function foodRandom() {
  for (var i = 0; i < foods.length; i++) {
    if (foods[i].expiresAt && Date.now() >= foods[i].expiresAt && !foods[i].leavingArena) {
      sendEntityToNearestExit(foods[i])
    }

    if (foods[i].isBurning) {
      if (Date.now() >= foods[i].burnUntil) {
        var burnedFood = foods[i]

        if (burnedFood.isBad) {
          spawnOrangePoof([{ x: burnedFood.x, y: burnedFood.y }])
          foods[i] = createOrangeRewardOrb(
            burnedFood,
            Math.max(1, Math.round(burnedFood.sizeScale || 1))
          )
        } else {
          foods.splice(i, 1)
          i--
        }

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

    if (foods[i].type === 'centipede-orb') {
      foods[i].dx = 0
      foods[i].dy = 0
      continue
    }

    if (foods[i].type === 'mouse' && !foods[i].enteringArena && !foods[i].leavingArena) {
      updateMouseMovement(foods[i])
    }

    var crushSpeedScale = 1 - (foods[i].crushProgress || 0) * 0.86
    foods[i].x += foods[i].dx * crushSpeedScale
    foods[i].y += foods[i].dy * crushSpeedScale

    var foodEdgeSize = 13 * renderScale * (foods[i].sizeScale || 1)

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
        if (foods[i].isBad) {
          foods[i].spawnProtectionUntil = Date.now() + poisonBeetleSpawnProtectionDuration
        }
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
  var entityRadius = 9 * renderScale * (entity.sizeScale || 1)
  var minDistance = snakeBodyBounceRadius * getPlayerSizeScale() + entityRadius
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

  var speed = Math.hypot(entity.dx, entity.dy)
  var softHeading = getSoftCollisionHeading(
    Math.atan2(entity.dy, entity.dx),
    -correction.normalX,
    -correction.normalY,
    0.12
  )
  entity.dx = Math.cos(softHeading) * speed
  entity.dy = Math.sin(softHeading) * speed
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

  headingAngle = getSoftCollisionHeading(
    headingAngle,
    -correction.normalX,
    -correction.normalY,
    getPlayerTurnRate() * 2.4
  )
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
  var shortestSide = Math.min(canvas.width, canvas.height) / getArenaExpansionScale()
  return Math.max(0.52, Math.min(1, shortestSide / 620))
}

function getMotionScale() {
  var shortestSide = Math.min(canvas.width, canvas.height) / getArenaExpansionScale()
  var responsiveMotionScale = Math.max(0.56, Math.min(1, shortestSide / 700))
  return responsiveMotionScale * arenaMovementSpeedMultiplier
}

function getArenaCornerRadius() {
  var shortestSide = Math.min(canvas.width, canvas.height)
  return Math.max(34 * renderScale, Math.min(92 * renderScale, shortestSide * 0.16))
}
