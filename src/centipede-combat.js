// Player-centipede collision response, bites, segment transfer, and removal.

function bouncePlayerOffBadSnake(contactX, contactY, predatorScale) {
  var normal = getCollisionNormal(
    snakeHead.x - contactX,
    snakeHead.y - contactY,
    headingAngle
  )
  predatorScale = predatorScale || 1
  var effectiveScale = Math.sqrt(predatorScale)
  deflectPlayerSnakeFromContact(normal.x, normal.y, getPlayerTurnRate() * 1.65 * effectiveScale)
}

function bounceSnakeHeadsApart(enemySnake) {
  var normal = getCollisionNormal(
    snakeHead.x - enemySnake.head.x,
    snakeHead.y - enemySnake.head.y,
    headingAngle
  )
  var predatorScale = enemySnake.collisionScale || 1
  var pushDistance = 3 * renderScale * Math.sqrt(predatorScale)

  moveBadSnake(enemySnake, -normal.x * pushDistance, -normal.y * pushDistance)

  deflectPlayerSnakeFromContact(normal.x, normal.y, getPlayerTurnRate() * 1.65)
  enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, -normal.x, -normal.y, badSnakeTurnRate * 2.2)
  enemySnake.wanderAngle = enemySnake.heading
  enemySnake.nextWanderAt = Date.now() + 500
}

function slidePlayerOffBadSnake(contactX, contactY, predatorScale) {
  var normal = getCollisionNormal(
    snakeHead.x - contactX,
    snakeHead.y - contactY,
    headingAngle
  )
  var effectiveScale = Math.sqrt(predatorScale || 1)
  deflectPlayerSnakeFromContact(normal.x, normal.y, getPlayerTurnRate() * 1.25 * effectiveScale)
}

function slideSnakeHeadsApart(enemySnake) {
  var normal = getCollisionNormal(
    snakeHead.x - enemySnake.head.x,
    snakeHead.y - enemySnake.head.y,
    headingAngle
  )
  var pushDistance = 2.6 * renderScale * Math.sqrt(enemySnake.collisionScale || 1)

  moveBadSnake(enemySnake, -normal.x * pushDistance, -normal.y * pushDistance)
  deflectPlayerSnakeFromContact(normal.x, normal.y, getPlayerTurnRate() * 1.25)
  enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, -normal.x, -normal.y, badSnakeTurnRate * 1.6)
  enemySnake.wanderAngle = enemySnake.heading
  enemySnake.nextWanderAt = Date.now() + 350
}

function deflectPlayerSnakeFromContact(normalX, normalY, maxTurn) {
  lastPlayerEnemyContactAt = Date.now()
  headingAngle = getSoftCollisionHeading(headingAngle, normalX, normalY, maxTurn)
  steerTarget = undefined
  steerAngleTarget = undefined
}

function pushBadSnakeAwayFromDominantPlayer(enemySnake, playerContactX, playerContactY, enemyContactX, enemyContactY) {
  var normal = getCollisionNormal(
    enemyContactX - playerContactX,
    enemyContactY - playerContactY,
    enemySnake.heading
  )
  var pushDistance = 16 * renderScale * Math.sqrt(enemySnake.collisionScale || 1)

  moveBadSnake(enemySnake, normal.x * pushDistance, normal.y * pushDistance)
  enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, normal.x, normal.y, badSnakeTurnRate * 2.5)
  enemySnake.wanderAngle = enemySnake.heading
  enemySnake.nextWanderAt = Date.now() + 500
}

function getCollisionNormal(dx, dy, incomingHeading) {
  var distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < 0.001) {
    return {
      x: -Math.cos(incomingHeading),
      y: -Math.sin(incomingHeading),
    }
  }

  return {
    x: dx / distance,
    y: dy / distance,
  }
}

function getSoftCollisionHeading(incomingHeading, normalX, normalY, maxTurn) {
  var velocityX = Math.cos(incomingHeading)
  var velocityY = Math.sin(incomingHeading)
  var velocityAlongNormal = velocityX * normalX + velocityY * normalY
  var tangentA = Math.atan2(normalY, normalX) + Math.PI / 2
  var tangentB = tangentA + Math.PI
  var awayAngle = Math.atan2(normalY, normalX)
  var targetAngle = velocityAlongNormal < -0.15
    ? getClosestAngle(incomingHeading, tangentA, tangentB)
    : awayAngle

  return turnTowardAngle(incomingHeading, targetAngle, maxTurn)
}

function getClosestAngle(referenceAngle, firstAngle, secondAngle) {
  return Math.abs(getAngleDifference(referenceAngle, firstAngle)) <= Math.abs(getAngleDifference(referenceAngle, secondAngle))
    ? firstAngle
    : secondAngle
}

function getAngleDifference(fromAngle, toAngle) {
  return Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle))
}

function repelBadSnakeDuringRecovery(enemySnake, playerHitIndex, enemyHitIndex) {
  var collisionX = snakeHead.x
  var collisionY = snakeHead.y
  var enemyContactX = enemySnake.head.x
  var enemyContactY = enemySnake.head.y

  if (playerHitIndex >= 0) {
    collisionX = x[playerHitIndex]
    collisionY = y[playerHitIndex]
  } else if (enemyHitIndex >= 0) {
    enemyContactX = enemySnake.segments[enemyHitIndex].x
    enemyContactY = enemySnake.segments[enemyHitIndex].y
  }

  var dx = enemyContactX - collisionX
  var dy = enemyContactY - collisionY
  var distance = Math.sqrt(dx * dx + dy * dy)

  if (distance < 0.001) {
    dx = -Math.cos(headingAngle)
    dy = -Math.sin(headingAngle)
    distance = 1
  }

  var normalX = dx / distance
  var normalY = dy / distance
  var pushDistance = 14 * renderScale * Math.sqrt(enemySnake.collisionScale || 1)

  moveBadSnake(enemySnake, normalX * pushDistance, normalY * pushDistance)
  enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, normalX, normalY, badSnakeTurnRate * 2.5)
  enemySnake.wanderAngle = enemySnake.heading
  enemySnake.nextWanderAt = Date.now() + 500
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
  radius *= Math.max(getPlayerSizeScale(), Math.sqrt(enemySnake.collisionScale || 1))

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    if (arePointsTouching(pointX, pointY, segment.x, segment.y, radius)) return i
  }

  return -1
}

function removePlayerSegments(count) {
  if (score <= 0) return 0

  var removedSegments = Math.min(count, score)

  score = Math.max(0, score - removedSegments)

  var nextVisibleSegments = getPlayerVisibleSegmentCount()
  if (nextVisibleSegments < n) {
    n = nextVisibleSegments
    x.splice(n)
    y.splice(n)
    snakeSegmentGrowthProgress.splice(n)
    snakeSegmentGrowthStartedAt.splice(n)
    snakeSlitherWaveAvailability.splice(n)
  }

  updateSnakeBodyFromTrail()
  updateScoreDisplay()

  var nextMaxEnergy = getBoostDuration()
  boostEnergy = Math.min(boostEnergy, nextMaxEnergy)
  boostCoolingDown = !boosting && boostEnergy < nextMaxEnergy
  updateBoostMeterStatus(true)
  requestArenaResize()

  return removedSegments
}

function removeBadSnakeSegments(enemySnake, count) {
  if (enemySnake.segments.length <= 0) return 0

  var removedSegments = Math.min(count, enemySnake.segments.length)

  enemySnake.segments.splice(enemySnake.segments.length - removedSegments, removedSegments)

  if (enemySnake.segments.length === 0) {
    removeBadSnake(enemySnake)
  } else if (enemySnake.species === 'tree-snake') {
    repairTreeSnakeAfterSegmentLoss(enemySnake)
  }

  return removedSegments
}

function getPlayerBiteSegments() {
  var biteSegments = getPlayerProgressLength() >= playerBiteUpgradeLength
    ? upgradedPlayerBiteSegments
    : snakeBiteSegments

  if (isCoilSlashStriking() && coilSlashStrikeDistanceTotal > 0) {
    var chargeMultiplier = 1 + Math.max(0, Math.min(1, coilSlashStrikeCharge)) * 1.5
    return Math.max(biteSegments + 1, Math.ceil(biteSegments * chargeMultiplier))
  }

  return biteSegments
}

function removeBadSnake(enemySnake) {
  var index = badSnakes.indexOf(enemySnake)
  if (index >= 0) {
    badSnakes.splice(index, 1)
    if (enemySnake.species === 'tree-snake') {
      nextTreeSnakeSpawnAt = Date.now() + treeSnakeRespawnDelay
    }
  }
}

function addPlayerSegments(count) {
  if (count <= 0) return

  var previousProgressLength = getPlayerProgressLength()
  var previousVisibleSegments = n

  score += count
  n = getPlayerVisibleSegmentCount()

  updateScoreDisplay()
  addSnakeSegments(Math.max(0, n - previousVisibleSegments), previousProgressLength)
  updateHighScore(score)
}
