// Centipede spawning, AI, movement, feeding, and contact routing.

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

function updateBadSnakes(snakeTrapLoops) {
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
    handleBadSnakeCuts(enemySnake, snakeTrapLoops)

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

  var crushProgress = enemySnake.crushProgress || 0
  var crushSpeedScale = 1 - crushProgress * 0.9

  return Math.min(
    badSnakeMaxSpeed,
    (badSnakeBaseSpeed + lengthSpeed + playerPressureSpeed) * motionScale
  ) * crushSpeedScale
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

function handleBadSnakeCuts(enemySnake, snakeTrapLoops) {
  var now = Date.now()
  var enclosingTrapLoop = getBadSnakeTrapLoop(enemySnake, snakeTrapLoops)
  var centipedeIsTrapped = Boolean(enclosingTrapLoop)
  enemySnake.isTrapped = centipedeIsTrapped
  enemySnake.trapLoopArea = enclosingTrapLoop ? enclosingTrapLoop.area : 0

  if (updateTrappedCrush(enemySnake, enclosingTrapLoop, now)) return
  centipedeIsTrapped = Boolean(enclosingTrapLoop)
  enemySnake.isTrapped = centipedeIsTrapped

  if (isBerserkerRecoveryActive() && !centipedeIsTrapped) {
    var recoveryPlayerHitIndex = getPlayerBodyHitIndex(
      enemySnake.head.x,
      enemySnake.head.y,
      15 * renderScale
    )
    var recoveryEnemyHitIndex = getEnemyBodyHitIndex(
      enemySnake,
      snakeHead.x,
      snakeHead.y,
      18 * renderScale
    )
    var recoveryHeadHit = arePointsTouching(
      snakeHead.x,
      snakeHead.y,
      enemySnake.head.x,
      enemySnake.head.y,
      18 * renderScale
    )

    if (recoveryPlayerHitIndex >= 0 || recoveryEnemyHitIndex >= 0 || recoveryHeadHit) {
      repelBadSnakeDuringRecovery(
        enemySnake,
        recoveryPlayerHitIndex,
        recoveryEnemyHitIndex
      )
    }
    return
  }

  if (isBerserkerActive() && !centipedeIsTrapped) {
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

  var playerHitIndex = getPlayerBodyHitIndex(enemySnake.head.x, enemySnake.head.y, 15 * renderScale)
  var enemyHitIndex = getEnemyBodyHitIndex(enemySnake, snakeHead.x, snakeHead.y, 17 * renderScale)
  var headsColliding = arePointsTouching(
    snakeHead.x,
    snakeHead.y,
    enemySnake.head.x,
    enemySnake.head.y,
    18 * renderScale
  )
  if (centipedeIsTrapped) {
    if (playerHitIndex >= 0) {
      nudgeTrappedBadSnake(enemySnake, x[playerHitIndex], y[playerHitIndex])
    }

    if (enemyHitIndex >= 0) {
      var trappedEnemyContact = enemySnake.segments[enemyHitIndex]
      nudgeTrappedBadSnake(
        enemySnake,
        snakeHead.x,
        snakeHead.y,
        trappedEnemyContact.x,
        trappedEnemyContact.y
      )
    } else if (headsColliding) {
      nudgeTrappedBadSnake(
        enemySnake,
        snakeHead.x,
        snakeHead.y,
        enemySnake.head.x,
        enemySnake.head.y
      )
    }

    return
  }

  if (now < enemySnake.cutCooldownUntil) {
    if (playerHitIndex >= 0) {
      bounceBadSnakeOffPlayer(enemySnake, x[playerHitIndex], y[playerHitIndex])
    } else if (enemyHitIndex >= 0) {
      bouncePlayerOffBadSnake(
        enemySnake.segments[enemyHitIndex].x,
        enemySnake.segments[enemyHitIndex].y
      )
    } else if (headsColliding) {
      bounceSnakeHeadsApart(enemySnake)
    }
    return
  }

  if (playerHitIndex >= 0) {
    var playerContactX = x[playerHitIndex]
    var playerContactY = y[playerHitIndex]
    var stolenPlayerSegments = removePlayerSegments(snakeBiteSegments)
    if (stolenPlayerSegments) {
      growBadSnake(enemySnake, stolenPlayerSegments)
    }

    bounceBadSnakeOffPlayer(enemySnake, playerContactX, playerContactY)
    enemySnake.cutCooldownUntil = now + snakeCutCooldown
    playGameSound('hurt')
    return
  }

  if (enemyHitIndex >= 0) {
    var enemyContactX = enemySnake.segments[enemyHitIndex].x
    var enemyContactY = enemySnake.segments[enemyHitIndex].y
    var recoveredSegments = removeBadSnakeSegments(enemySnake, snakeBiteSegments)
    addPlayerSegments(recoveredSegments)

    if (badSnakes.indexOf(enemySnake) !== -1) {
      bouncePlayerOffBadSnake(enemyContactX, enemyContactY)
      enemySnake.cutCooldownUntil = now + snakeCutCooldown
    }

    playGameSound('eat')
    return
  }

  if (headsColliding) {
    bounceSnakeHeadsApart(enemySnake)
  }
}
