// Shared entity, food, player-body, and centipede collision helpers.

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
  return entity.type !== 'centipede-orb' && !entity.isBurning && !entity.enteringArena && !entity.leavingArena
}

function getEntityBounceRadius(entity) {
  if (entity.type === 'centipede-orb') return 7 * renderScale
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
  if (!enemySnake.isTrapped) {
    moveBadSnake(enemySnake, -normalX * overlap * 0.25, -normalY * overlap * 0.25)
  }

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

  var firstPushShare = firstSnake.isTrapped ? 0 : secondSnake.isTrapped ? 1 : 0.5
  var secondPushShare = secondSnake.isTrapped ? 0 : firstSnake.isTrapped ? 1 : 0.5

  moveBadSnake(firstSnake, -normalX * overlap * firstPushShare, -normalY * overlap * firstPushShare)
  moveBadSnake(secondSnake, normalX * overlap * secondPushShare, normalY * overlap * secondPushShare)
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
