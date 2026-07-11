// Centipede spawning, AI, movement, feeding, and contact routing.

function spawnBadSnakes() {
  badSnakes = []
  nextTreeSnakeSpawnAt = 0

  for (var i = 0; i < badSnakeStartCount; i++) {
    spawnBadSnake()
  }
}

function spawnBadSnake() {
  if (countBadSnakesBySpecies('centipede') >= badSnakeMaxCount) return

  badSnakes.push(createBadSnake())
}

function createBadSnake() {
  var spawn = getRandomPredatorEntry()
  var headX = spawn.x
  var headY = spawn.y
  var heading = spawn.heading
  var enemySnake = {
    species: 'centipede',
    head: { x: headX, y: headY },
    heading: heading,
    segments: [],
    wanderAngle: heading,
    nextWanderAt: 0,
    cutCooldownUntil: 0,
    collisionScale: 1.15,
    segmentSpacingScale: 1.18,
    slitherPhase: Math.random() * Math.PI * 2,
    slitherDirection: Math.random() < 0.5 ? -1 : 1,
    lastSlitherWaveAt: Date.now(),
    palette: { head: '#431b1f', body: '#7a2d32', stripe: '#ffb657' },
  }

  var startingEnemySegments = badSnakeStartSegments + getProgressiveCentipedeLengthBonus()
  addInitialPredatorSegments(enemySnake, startingEnemySegments)
  return enemySnake
}

function createTreeSnake() {
  var spawn = getRandomPredatorEntry()
  var enemySnake = {
    species: 'tree-snake',
    head: { x: spawn.x, y: spawn.y },
    heading: spawn.heading,
    segments: [],
    trail: [],
    tailPoint: { x: spawn.x, y: spawn.y },
    segmentGrowthProgress: [],
    segmentGrowthStartedAt: [],
    wanderAngle: spawn.heading,
    nextWanderAt: 0,
    cutCooldownUntil: 0,
    collisionScale: getTreeSnakeStartScale(),
    segmentSpacingScale: getTreeSnakeStartScale(),
    slitherPhase: Math.random() * Math.PI * 2,
    slitherDirection: Math.random() < 0.5 ? -1 : 1,
    lastSlitherWaveAt: Date.now(),
    slitherStartedAt: Date.now(),
  }
  var extraLength = Math.max(0, getPlayerProgressLength() - treeSnakeUnlockLength)
  var lengthBonus = Math.floor(Math.log1p(extraLength) * 1.8)
  var startingSegments = Math.min(treeSnakeMaxSegments, treeSnakeStartSegments + lengthBonus)

  refreshTreeSnakeScale(enemySnake, startingSegments)
  addInitialPredatorSegments(enemySnake, startingSegments)
  resetTreeSnakeBodyTrail(enemySnake)
  return enemySnake
}

function getRandomPredatorEntry() {
  var edgePadding = Math.min(
    Math.min(canvas.width, canvas.height) * 0.35,
    Math.max(54 * renderScale, arenaCornerRadius)
  )
  var side = Math.floor(Math.random() * 4)
  var horizontalRange = Math.max(0, canvas.width - edgePadding * 2)
  var verticalRange = Math.max(0, canvas.height - edgePadding * 2)
  var headX
  var headY

  if (side === 0) {
    headX = 0
    headY = edgePadding + Math.random() * verticalRange
  } else if (side === 1) {
    headX = canvas.width
    headY = edgePadding + Math.random() * verticalRange
  } else if (side === 2) {
    headX = edgePadding + Math.random() * horizontalRange
    headY = 0
  } else {
    headX = edgePadding + Math.random() * horizontalRange
    headY = canvas.height
  }

  var entryTargetX = canvas.width * (0.3 + Math.random() * 0.4)
  var entryTargetY = canvas.height * (0.3 + Math.random() * 0.4)
  return {
    x: headX,
    y: headY,
    heading: Math.atan2(entryTargetY - headY, entryTargetX - headX),
  }
}

function addInitialPredatorSegments(enemySnake, count) {
  var spacing = getBadSnakeSegmentSpacing(enemySnake)

  for (var i = 0; i < count; i++) {
    enemySnake.segments.push({
      x: enemySnake.head.x - Math.cos(enemySnake.heading) * spacing * (i + 1),
      y: enemySnake.head.y - Math.sin(enemySnake.heading) * spacing * (i + 1),
    })
  }
}

function countBadSnakesBySpecies(species) {
  var count = 0

  for (var i = 0; i < badSnakes.length; i++) {
    if (badSnakes[i].species === species) count++
  }

  return count
}

function ensureTreeSnakePredator() {
  if (getPlayerProgressLength() < treeSnakeUnlockLength) return
  if (countBadSnakesBySpecies('tree-snake') >= treeSnakeMaxCount) return
  if (Date.now() < nextTreeSnakeSpawnAt) return

  badSnakes.push(createTreeSnake())
}

function getProgressiveCentipedeLengthBonus() {
  var extraPlayerSegments = Math.max(0, getPlayerProgressLength() - startingSegments)
  return Math.floor(Math.log1p(extraPlayerSegments) * 0.72)
}

function updateBadSnakes(snakeTrapLoops) {
  ensureTreeSnakePredator()

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
    enemyVelocity.x = Math.max(0, Math.min(canvas.width, enemyVelocity.x))
    enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, enemyVelocity.x <= 0 ? 1 : -1, 0, badSnakeTurnRate * 3)
    enemyVelocity.dx = Math.cos(enemySnake.heading) * speed
    enemyVelocity.dy = Math.sin(enemySnake.heading) * speed
  }

  if (enemyVelocity.y < 0 || enemyVelocity.y > canvas.height) {
    enemyVelocity.y = Math.max(0, Math.min(canvas.height, enemyVelocity.y))
    enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, 0, enemyVelocity.y <= 0 ? 1 : -1, badSnakeTurnRate * 3)
    enemyVelocity.dx = Math.cos(enemySnake.heading) * speed
    enemyVelocity.dy = Math.sin(enemySnake.heading) * speed
  }

  enemySnake.head.x = enemyVelocity.x
  enemySnake.head.y = enemyVelocity.y
  enemySnake.heading = Math.atan2(enemyVelocity.dy, enemyVelocity.dx)
  dragBadSnakeSegments(enemySnake)
}

function getBadSnakeSpeed(enemySnake) {
  var enemyExtraLength = Math.max(0, enemySnake.segments.length - badSnakeStartSegments)
  var playerExtraLength = Math.max(0, getPlayerProgressLength() - startingSegments)
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

  if (!isPlayerNearBadSnake(enemySnake)) {
    return closestFood
  }

  if (!closestFood || playerDistanceSquared < closestDistanceSquared) {
    return playerTarget
  }

  return closestFood
}

function isPlayerNearBadSnake(enemySnake) {
  var aggroDistance = badSnakePlayerAggroDistance * renderScale
  var aggroDistanceSquared = aggroDistance * aggroDistance
  var headDx = snakeHead.x - enemySnake.head.x
  var headDy = snakeHead.y - enemySnake.head.y

  if (headDx * headDx + headDy * headDy <= aggroDistanceSquared) return true

  for (var bodyIndex = 0; bodyIndex < x.length; bodyIndex += 2) {
    var bodyDx = x[bodyIndex] - enemySnake.head.x
    var bodyDy = y[bodyIndex] - enemySnake.head.y

    if (bodyDx * bodyDx + bodyDy * bodyDy <= aggroDistanceSquared) return true
  }

  return false
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
  if (enemySnake.species === 'tree-snake') {
    recordBadSnakeHeadTrail(enemySnake)
    updateTreeSnakeBodyFromTrail(enemySnake)
    return
  }

  var leadX = enemySnake.head.x
  var leadY = enemySnake.head.y
  var enemySegLength = getBadSnakeSegmentSpacing(enemySnake)

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

  applyBadSnakeSpinalSlither(enemySnake)
}

function resetTreeSnakeBodyTrail(enemySnake) {
  enemySnake.trail = []

  var spacing = getBadSnakeSegmentSpacing(enemySnake)
  var tailPadding = 30 * renderScale
  var requiredLength = enemySnake.segments.length * spacing + getTreeSnakeTailFollowDistance(enemySnake) + tailPadding
  var trailPoints = Math.max(2, Math.ceil(requiredLength / Math.max(1.5, 2.5 * renderScale)))

  for (var i = trailPoints; i >= 0; i--) {
    enemySnake.trail.push({
      x: enemySnake.head.x - Math.cos(enemySnake.heading) * i * Math.max(1.5, 2.5 * renderScale),
      y: enemySnake.head.y - Math.sin(enemySnake.heading) * i * Math.max(1.5, 2.5 * renderScale),
    })
  }

  var initialTailPoint = enemySnake.segments[enemySnake.segments.length - 1] || enemySnake.head
  enemySnake.tailPoint = { x: initialTailPoint.x, y: initialTailPoint.y }
  updateTreeSnakeBodyFromTrail(enemySnake)
}

function recordBadSnakeHeadTrail(enemySnake) {
  if (!enemySnake.trail || enemySnake.trail.length === 0) {
    resetTreeSnakeBodyTrail(enemySnake)
    return
  }

  var lastPoint = enemySnake.trail[enemySnake.trail.length - 1]
  var deltaX = enemySnake.head.x - lastPoint.x
  var deltaY = enemySnake.head.y - lastPoint.y
  var distance = Math.hypot(deltaX, deltaY)

  if (distance < 0.001) return

  var maxPointSpacing = Math.max(1.5, 2.5 * renderScale)
  var steps = Math.max(1, Math.ceil(distance / maxPointSpacing))

  for (var step = 1; step <= steps; step++) {
    var progress = step / steps
    enemySnake.trail.push({
      x: lastPoint.x + deltaX * progress,
      y: lastPoint.y + deltaY * progress,
    })
  }

  trimBadSnakeTrail(enemySnake)
}

function trimBadSnakeTrail(enemySnake) {
  var spacing = getBadSnakeSegmentSpacing(enemySnake)
  var requiredLength = enemySnake.segments.length * spacing + getTreeSnakeTailFollowDistance(enemySnake) + 30 * renderScale
  var accumulatedLength = 0
  var keepFromIndex = 0

  for (var i = enemySnake.trail.length - 2; i >= 0; i--) {
    var newerPoint = enemySnake.trail[i + 1]
    var olderPoint = enemySnake.trail[i]
    accumulatedLength += Math.hypot(newerPoint.x - olderPoint.x, newerPoint.y - olderPoint.y)

    if (accumulatedLength >= requiredLength) {
      keepFromIndex = i
      break
    }
  }

  if (keepFromIndex > 0) {
    enemySnake.trail.splice(0, keepFromIndex)
  }
}

function updateTreeSnakeBodyFromTrail(enemySnake, skipSlither) {
  if (!enemySnake.trail || enemySnake.trail.length === 0) return

  updateTreeSnakeSegmentGrowthProgress(enemySnake)

  var newestPointIndex = enemySnake.trail.length - 1
  var newerPoint = enemySnake.trail[newestPointIndex]
  var olderPointIndex = newestPointIndex - 1
  var accumulatedLength = 0

  for (var segmentIndex = 0; segmentIndex <= enemySnake.segments.length; segmentIndex++) {
    var isTailPoint = segmentIndex === enemySnake.segments.length
    var targetDistance = getTreeSnakeSegmentTrailDistance(enemySnake, segmentIndex, isTailPoint)
    var positionFound = false

    while (olderPointIndex >= 0) {
      var olderPoint = enemySnake.trail[olderPointIndex]
      var edgeLength = Math.hypot(newerPoint.x - olderPoint.x, newerPoint.y - olderPoint.y)

      if (edgeLength > 0 && accumulatedLength + edgeLength >= targetDistance) {
        var edgeProgress = (targetDistance - accumulatedLength) / edgeLength
        var sampledX = newerPoint.x + (olderPoint.x - newerPoint.x) * edgeProgress
        var sampledY = newerPoint.y + (olderPoint.y - newerPoint.y) * edgeProgress

        if (isTailPoint) {
          enemySnake.tailPoint.x = sampledX
          enemySnake.tailPoint.y = sampledY
        } else {
          enemySnake.segments[segmentIndex].x = sampledX
          enemySnake.segments[segmentIndex].y = sampledY
        }

        positionFound = true
        break
      }

      accumulatedLength += edgeLength
      newerPoint = olderPoint
      olderPointIndex--
    }

    if (!positionFound) {
      var oldestPoint = enemySnake.trail[0]
      if (isTailPoint) {
        enemySnake.tailPoint.x = oldestPoint.x
        enemySnake.tailPoint.y = oldestPoint.y
      } else {
        enemySnake.segments[segmentIndex].x = oldestPoint.x
        enemySnake.segments[segmentIndex].y = oldestPoint.y
      }
    }
  }

  if (!skipSlither) applyBadSnakeSpinalSlither(enemySnake)
}

function getTreeSnakeSegmentTrailDistance(enemySnake, segmentIndex, isTailPoint) {
  return getTreeSnakeSegmentTrailDistanceForLength(
    enemySnake,
    segmentIndex,
    isTailPoint,
    enemySnake.segments.length
  )
}

function getTreeSnakeSegmentTrailDistanceForLength(enemySnake, segmentIndex, isTailPoint, segmentCount) {
  var distance = 0
  var maxSegmentIndex = isTailPoint ? segmentCount : segmentIndex + 1

  for (var i = 0; i < maxSegmentIndex; i++) {
    distance += getBadSnakeSegmentSpacing(enemySnake) * getTreeSnakeSegmentGrowthScale(enemySnake, i)
  }

  if (isTailPoint) {
    return distance + getTreeSnakeTailFollowDistance(enemySnake)
  }

  return distance
}

function getTreeSnakeSegmentGrowthScale(enemySnake, segmentIndex) {
  if (!enemySnake.segmentGrowthProgress) return 1

  var progress = enemySnake.segmentGrowthProgress[segmentIndex]
  if (progress === undefined) return 1

  var easedProgress = progress * progress * (3 - 2 * progress)
  return 0.18 + easedProgress * 0.82
}

function queueTreeSnakeSegmentGrowth(enemySnake, startIndex, count) {
  if (!enemySnake.segmentGrowthProgress) enemySnake.segmentGrowthProgress = []
  if (!enemySnake.segmentGrowthStartedAt) enemySnake.segmentGrowthStartedAt = []

  var now = Date.now()

  for (var i = 0; i < count; i++) {
    var segmentIndex = startIndex + i
    enemySnake.segmentGrowthProgress[segmentIndex] = 0
    enemySnake.segmentGrowthStartedAt[segmentIndex] = now + i * snakeSegmentGrowthStagger
  }
}

function updateTreeSnakeSegmentGrowthProgress(enemySnake) {
  if (!enemySnake.segmentGrowthProgress) enemySnake.segmentGrowthProgress = []
  if (!enemySnake.segmentGrowthStartedAt) enemySnake.segmentGrowthStartedAt = []

  if (enemySnake.segmentGrowthProgress.length > enemySnake.segments.length) {
    enemySnake.segmentGrowthProgress.splice(enemySnake.segments.length)
    enemySnake.segmentGrowthStartedAt.splice(enemySnake.segments.length)
  }

  var now = Date.now()

  for (var i = 0; i < enemySnake.segmentGrowthProgress.length; i++) {
    if (enemySnake.segmentGrowthProgress[i] === undefined) continue

    var startedAt = enemySnake.segmentGrowthStartedAt[i] || now
    var progress = Math.max(0, Math.min(1, (now - startedAt) / snakeSegmentGrowthDuration))
    enemySnake.segmentGrowthProgress[i] = progress

    if (progress >= 1) {
      enemySnake.segmentGrowthProgress[i] = undefined
      enemySnake.segmentGrowthStartedAt[i] = undefined
    }
  }
}

function applyBadSnakeSpinalSlither(enemySnake) {
  if (enemySnake.species !== 'tree-snake') return
  if (enemySnake.segments.length === 0) return

  var now = Date.now()
  var elapsed = Math.max(0, Math.min(48, now - (enemySnake.lastSlitherWaveAt || now)))
  enemySnake.lastSlitherWaveAt = now
  enemySnake.slitherPhase = (enemySnake.slitherPhase || 0) + elapsed * regularSlitherSpeed

  var waveAmplitude = Math.min(
    6 * renderScale,
    playerSegmentSpacing * regularSlitherAmplitude * 0.62
  ) * Math.max(0, 1 - (enemySnake.crushProgress || 0) * 0.7)
  var slitherAge = now - (enemySnake.slitherStartedAt || now)
  var warmupProgress = Math.max(0, Math.min(1, slitherAge / treeSnakeSlitherWarmupDuration))
  waveAmplitude *= warmupProgress * warmupProgress * (3 - 2 * warmupProgress)

  for (var waveIndex = 0; waveIndex < enemySnake.segments.length; waveIndex++) {
    var waveSegment = enemySnake.segments[waveIndex]
    var leader = waveIndex === 0 ? enemySnake.head : enemySnake.segments[waveIndex - 1]
    var follower = waveIndex < enemySnake.segments.length - 1
      ? enemySnake.segments[waveIndex + 1]
      : waveSegment
    var tangentX = leader.x - follower.x
    var tangentY = leader.y - follower.y
    var tangentLength = Math.hypot(tangentX, tangentY)

    if (tangentLength <= 0.001) continue

    var normalX = -tangentY / tangentLength
    var normalY = tangentX / tangentLength
    var headStability = Math.max(0, Math.min(1, (waveIndex - 2) / 7))
    var wave = Math.sin(enemySnake.slitherPhase - waveIndex * regularSlitherPhase) *
      waveAmplitude *
      headStability *
      (enemySnake.slitherDirection || 1)

    waveSegment.x += normalX * wave
    waveSegment.y += normalY * wave
  }

  constrainBadSnakeSegmentSpacing(enemySnake)
}

function constrainBadSnakeSegmentSpacing(enemySnake) {
  var leadX = enemySnake.head.x
  var leadY = enemySnake.head.y
  var spacing = getBadSnakeSegmentSpacing(enemySnake)

  for (var segmentIndex = 0; segmentIndex < enemySnake.segments.length; segmentIndex++) {
    var segment = enemySnake.segments[segmentIndex]
    var dx = segment.x - leadX
    var dy = segment.y - leadY
    var distance = Math.hypot(dx, dy)
    var segmentSpacing = spacing * getTreeSnakeSegmentGrowthScale(enemySnake, segmentIndex)

    if (distance > 0.001) {
      segment.x = leadX + dx / distance * segmentSpacing
      segment.y = leadY + dy / distance * segmentSpacing
    }

    leadX = segment.x
    leadY = segment.y
  }

  if (enemySnake.tailPoint) {
    var tailDx = enemySnake.tailPoint.x - leadX
    var tailDy = enemySnake.tailPoint.y - leadY
    var tailDistance = Math.hypot(tailDx, tailDy)
    var tailSpacing = getTreeSnakeTailFollowDistance(enemySnake)

    if (tailDistance > 0.001) {
      enemySnake.tailPoint.x = leadX + tailDx / tailDistance * tailSpacing
      enemySnake.tailPoint.y = leadY + tailDy / tailDistance * tailSpacing
    }
  }
}

function updateTreeSnakeTailPointFromSpine(enemySnake) {
  if (!enemySnake.tailPoint || enemySnake.segments.length === 0) return

  var lastSegmentIndex = enemySnake.segments.length - 1
  var lastSegment = enemySnake.segments[lastSegmentIndex]
  var previousSegment = lastSegmentIndex > 0
    ? enemySnake.segments[lastSegmentIndex - 1]
    : enemySnake.head
  var tailAngle = Math.atan2(lastSegment.y - previousSegment.y, lastSegment.x - previousSegment.x)

  if (!Number.isFinite(tailAngle)) tailAngle = enemySnake.heading + Math.PI

  enemySnake.tailPoint.x = lastSegment.x + Math.cos(tailAngle) * getTreeSnakeTailFollowDistance(enemySnake)
  enemySnake.tailPoint.y = lastSegment.y + Math.sin(tailAngle) * getTreeSnakeTailFollowDistance(enemySnake)
}

function getBadSnakeSegmentSpacing(enemySnake) {
  if (enemySnake.species === 'tree-snake') {
    return 19 * renderScale * getTreeSnakeSpacingScale(enemySnake)
  }

  return segLength * (enemySnake.segmentSpacingScale || 1)
}

function getTreeSnakeTailFollowDistance(enemySnake) {
  return 39 * renderScale * getTreeSnakeSpacingScale(enemySnake)
}

function getTreeSnakeSpacingScale(enemySnake) {
  return getTreeSnakeSpacingScaleForLength(getTreeSnakeScaleLength(enemySnake))
}

function getTreeSnakeSizeScale(enemySnake) {
  return getTreeSnakeSizeScaleForLength(getTreeSnakeScaleLength(enemySnake))
}

function getTreeSnakeScaleLength(enemySnake) {
  if (!enemySnake || enemySnake.species !== 'tree-snake') return treeSnakeStartSegments
  return Math.max(treeSnakeStartSegments, Math.min(treeSnakeMaxSegments, enemySnake.segments.length || treeSnakeStartSegments))
}

function getTreeSnakeSpacingScaleForLength(segmentCount) {
  var clampedSegmentCount = Math.max(treeSnakeStartSegments, Math.min(treeSnakeMaxSegments, segmentCount))
  var growthRange = Math.max(1, treeSnakeMaxSegments - treeSnakeStartSegments)
  var progress = (clampedSegmentCount - treeSnakeStartSegments) / growthRange
  var startScale = getTreeSnakeStartScale()
  var maxScale = getTreeSnakeMaxScale()
  return startScale + (maxScale - startScale) * progress
}

function getTreeSnakeSizeScaleForLength(segmentCount) {
  return getTreeSnakeSpacingScaleForLength(segmentCount)
}

function refreshTreeSnakeScale(enemySnake, segmentCountOverride) {
  if (!enemySnake || enemySnake.species !== 'tree-snake') return

  var segmentCount = segmentCountOverride || enemySnake.segments.length || treeSnakeStartSegments
  enemySnake.segmentSpacingScale = getTreeSnakeSpacingScaleForLength(segmentCount)
  enemySnake.collisionScale = getTreeSnakeSizeScaleForLength(segmentCount)
}

function getTreeSnakeStartScale() {
  return getPlayerSizeScaleForScore(treeSnakeScaleMatchScore)
}

function getTreeSnakeMaxScale() {
  return getPlayerSizeScaleForScore(treeSnakeMaxScaleScore)
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
  var maxGrowthCount = count

  if (enemySnake.species === 'tree-snake') {
    maxGrowthCount = Math.max(0, Math.min(count, treeSnakeMaxSegments - enemySnake.segments.length))
    addTreeSnakeSegmentsFromTrail(enemySnake, maxGrowthCount)
    return
  }

  for (var i = 0; i < maxGrowthCount; i++) {
    enemySnake.segments.push({ x: tail.x, y: tail.y })
  }
}

function addTreeSnakeSegmentsFromTrail(enemySnake, count) {
  if (count <= 0) return

  var previousSegmentCount = enemySnake.segments.length

  for (var i = 0; i < count; i++) {
    var tail = enemySnake.segments[enemySnake.segments.length - 1] || enemySnake.head
    enemySnake.segments.push({ x: tail.x, y: tail.y })
  }

  queueTreeSnakeSegmentGrowth(enemySnake, previousSegmentCount, count)
  refreshTreeSnakeScale(enemySnake)
  repairTreeSnakeSpineFromTrail(enemySnake)
}

function repairTreeSnakeAfterSegmentLoss(enemySnake) {
  if (!enemySnake || enemySnake.species !== 'tree-snake') return
  if (!enemySnake.segments.length) return

  refreshTreeSnakeScale(enemySnake)
  updateTreeSnakeSegmentGrowthProgress(enemySnake)
  repairTreeSnakeSpineFromTrail(enemySnake)
}

function repairTreeSnakeSpineFromTrail(enemySnake) {
  ensureTreeSnakeTrailLength(enemySnake)
  trimBadSnakeTrail(enemySnake)
  updateTreeSnakeBodyFromTrail(enemySnake, true)
  lockTreeSnakeFrontAnchor(enemySnake)
}

function lockTreeSnakeFrontAnchor(enemySnake) {
  if (!enemySnake || enemySnake.species !== 'tree-snake' || enemySnake.segments.length === 0) return

  var spacing = getBadSnakeSegmentSpacing(enemySnake)
  enemySnake.segments[0].x = enemySnake.head.x - Math.cos(enemySnake.heading) * spacing
  enemySnake.segments[0].y = enemySnake.head.y - Math.sin(enemySnake.heading) * spacing
}

function ensureTreeSnakeTrailLength(enemySnake) {
  if (!enemySnake.trail || enemySnake.trail.length === 0) {
    resetTreeSnakeBodyTrail(enemySnake)
    return
  }

  var requiredLength = enemySnake.segments.length * getBadSnakeSegmentSpacing(enemySnake) +
    getTreeSnakeTailFollowDistance(enemySnake) +
    30 * renderScale
  var currentLength = getBadSnakeTrailLength(enemySnake)
  var oldestPoint = enemySnake.trail[0]
  var nextPoint = enemySnake.trail[1] || enemySnake.head
  var backAngle = Math.atan2(oldestPoint.y - nextPoint.y, oldestPoint.x - nextPoint.x)

  if (!Number.isFinite(backAngle)) backAngle = enemySnake.heading + Math.PI

  while (currentLength < requiredLength) {
    var spacing = Math.max(1.5, 2.5 * renderScale)
    enemySnake.trail.unshift({
      x: enemySnake.trail[0].x + Math.cos(backAngle) * spacing,
      y: enemySnake.trail[0].y + Math.sin(backAngle) * spacing,
    })
    currentLength += spacing
  }
}

function getBadSnakeTrailLength(enemySnake) {
  var trailLength = 0

  for (var i = 1; i < enemySnake.trail.length; i++) {
    trailLength += Math.hypot(
      enemySnake.trail[i].x - enemySnake.trail[i - 1].x,
      enemySnake.trail[i].y - enemySnake.trail[i - 1].y
    )
  }

  return trailLength
}

function sampleBadSnakeTrailAtDistance(enemySnake, targetDistance) {
  return sampleTrailAtDistance(enemySnake.trail, targetDistance)
}

function handleBadSnakeCuts(enemySnake, snakeTrapLoops) {
  var now = Date.now()
  var headCollisionScale = Math.max(getPlayerSizeScale(), Math.sqrt(enemySnake.collisionScale || 1))
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
      15 * renderScale * headCollisionScale
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
      18 * renderScale * headCollisionScale
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
    var centipedeHitPlayer = getPlayerBodyHitIndex(enemySnake.head.x, enemySnake.head.y, 13 * renderScale * headCollisionScale) >= 0
    var playerHitCentipede = (
      getEnemyBodyHitIndex(enemySnake, snakeHead.x, snakeHead.y, 17 * renderScale) >= 0 ||
      arePointsTouching(snakeHead.x, snakeHead.y, enemySnake.head.x, enemySnake.head.y, 17 * renderScale * headCollisionScale)
    )

    if (centipedeHitPlayer || playerHitCentipede) {
      eatBadSnakeWhole(enemySnake)
    }
    return
  }

  var playerHitIndex = getPlayerBodyHitIndex(enemySnake.head.x, enemySnake.head.y, 15 * renderScale * headCollisionScale)
  var enemyHitIndex = getEnemyBodyHitIndex(enemySnake, snakeHead.x, snakeHead.y, 17 * renderScale)
  var headsColliding = arePointsTouching(
    snakeHead.x,
    snakeHead.y,
    enemySnake.head.x,
    enemySnake.head.y,
    18 * renderScale * headCollisionScale
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

  if (isCoilSlashCharging() || isCoilSlashStriking()) {
    if (enemyHitIndex >= 0) {
      var coilEnemyContactX = enemySnake.segments[enemyHitIndex].x
      var coilEnemyContactY = enemySnake.segments[enemyHitIndex].y
      var coilRecoveredSegments = removeBadSnakeSegments(enemySnake, getPlayerBiteSegments())
      addPlayerSegments(coilRecoveredSegments)

      if (badSnakes.indexOf(enemySnake) !== -1) {
        pushBadSnakeAwayFromDominantPlayer(
          enemySnake,
          snakeHead.x,
          snakeHead.y,
          coilEnemyContactX,
          coilEnemyContactY
        )
        enemySnake.cutCooldownUntil = now + snakeCutCooldown
      }

      if (coilRecoveredSegments) playGameSound('eat')
      return
    }

    if (headsColliding) {
      var coilHeadRecoveredSegments = removeBadSnakeSegments(enemySnake, getPlayerBiteSegments())
      addPlayerSegments(coilHeadRecoveredSegments)

      if (badSnakes.indexOf(enemySnake) !== -1) {
        pushBadSnakeAwayFromDominantPlayer(
          enemySnake,
          snakeHead.x,
          snakeHead.y,
          enemySnake.head.x,
          enemySnake.head.y
        )
        enemySnake.cutCooldownUntil = now + snakeCutCooldown
      }

      if (coilHeadRecoveredSegments) playGameSound('eat')
      return
    }

    if (playerHitIndex >= 0) {
      bounceBadSnakeOffPlayer(enemySnake, x[playerHitIndex], y[playerHitIndex])
    }

    return
  }

  if (enemySnake.species === 'centipede' && getPlayerProgressLength() >= playerBiteUpgradeLength) {
    handleDominantPlayerCentipedeContact(
      enemySnake,
      playerHitIndex,
      enemyHitIndex,
      headsColliding,
      now
    )
    return
  }

  if (now < enemySnake.cutCooldownUntil) {
    if (playerHitIndex >= 0) {
      bounceBadSnakeOffPlayer(enemySnake, x[playerHitIndex], y[playerHitIndex])
    } else if (enemyHitIndex >= 0) {
      if (enemySnake.species === 'tree-snake') {
        slidePlayerOffBadSnake(
          enemySnake.segments[enemyHitIndex].x,
          enemySnake.segments[enemyHitIndex].y,
          enemySnake.collisionScale
        )
      } else {
        bouncePlayerOffBadSnake(
          enemySnake.segments[enemyHitIndex].x,
          enemySnake.segments[enemyHitIndex].y,
          enemySnake.collisionScale
        )
      }
    } else if (headsColliding) {
      if (enemySnake.species === 'tree-snake') {
        slideSnakeHeadsApart(enemySnake)
      } else {
        bounceSnakeHeadsApart(enemySnake)
      }
    }
    return
  }

  if (playerHitIndex >= 0) {
    var playerContactX = x[playerHitIndex]
    var playerContactY = y[playerHitIndex]
    var predatorBiteSegments = enemySnake.species === 'centipede'
      ? centipedeBiteSegments
      : snakeBiteSegments
    var stolenPlayerSegments = removePlayerSegments(predatorBiteSegments)
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
    var recoveredSegments = removeBadSnakeSegments(enemySnake, getPlayerBiteSegments())
    addPlayerSegments(recoveredSegments)

    if (badSnakes.indexOf(enemySnake) !== -1) {
      if (enemySnake.species === 'tree-snake') {
        slidePlayerOffBadSnake(enemyContactX, enemyContactY, enemySnake.collisionScale)
      } else {
        bouncePlayerOffBadSnake(enemyContactX, enemyContactY, enemySnake.collisionScale)
      }
      enemySnake.cutCooldownUntil = now + snakeCutCooldown
    }

    playGameSound('eat')
    return
  }

  if (headsColliding) {
    if (enemySnake.species === 'tree-snake') {
      slideSnakeHeadsApart(enemySnake)
    } else {
      bounceSnakeHeadsApart(enemySnake)
    }
  }
}

function handleDominantPlayerCentipedeContact(enemySnake, playerHitIndex, enemyHitIndex, headsColliding, now) {
  if (enemyHitIndex >= 0 || headsColliding) {
    var enemyContact = enemyHitIndex >= 0
      ? enemySnake.segments[enemyHitIndex]
      : enemySnake.head

    pushBadSnakeAwayFromDominantPlayer(
      enemySnake,
      snakeHead.x,
      snakeHead.y,
      enemyContact.x,
      enemyContact.y
    )

    if (now >= enemySnake.cutCooldownUntil) {
      var eatenSegments = removeBadSnakeSegments(enemySnake, getPlayerBiteSegments())
      addPlayerSegments(eatenSegments)

      if (badSnakes.indexOf(enemySnake) !== -1) {
        enemySnake.cutCooldownUntil = now + snakeCutCooldown
      }

      if (eatenSegments) playGameSound('eat')
    }
    return
  }

  if (playerHitIndex >= 0) {
    pushBadSnakeAwayFromDominantPlayer(
      enemySnake,
      x[playerHitIndex],
      y[playerHitIndex],
      enemySnake.head.x,
      enemySnake.head.y
    )
  }
}
