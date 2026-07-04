// Loop detection, trapped transformations, orange rewards, and trap geometry.

function updateTrappedCrush(enemySnake, trapLoop, now) {
  if (!trapLoop) {
    enemySnake.crushStartedAt = 0
    enemySnake.crushProgress = 0
    return false
  }

  if (!enemySnake.crushStartedAt) enemySnake.crushStartedAt = now
  enemySnake.crushProgress = Math.min(1, (now - enemySnake.crushStartedAt) / trappedCrushDuration)

  if (enemySnake.crushProgress < 1) return false

  crushBadSnake(enemySnake)
  return true
}

function updateTrappedFoods(snakeTrapLoops) {
  var now = Date.now()

  for (var i = foods.length - 1; i >= 0; i--) {
    var food = foods[i]
    if (food.type === 'centipede-orb') continue

    var trapLoop = getPointTrapLoop(food.x, food.y, snakeTrapLoops)
    food.trapLoopArea = trapLoop ? trapLoop.area : 0

    if (trapLoop) {
      if (food.expiresAt) {
        food.trapRemainingLifetime = Math.max(1000, food.expiresAt - now)
      } else if (food.leavingArena && !food.trapRemainingLifetime) {
        food.trapRemainingLifetime = 5000
      }

      food.expiresAt = 0
      food.leavingArena = false
      food.enteringArena = false
    } else if (food.trapRemainingLifetime) {
      food.expiresAt = now + food.trapRemainingLifetime
      food.trapRemainingLifetime = 0
    }

    if (updateTrappedFoodCrush(food, trapLoop, now)) {
      foods[i] = createOrangeRewardOrb(food, Math.max(1, food.growthValue || 1))
    } else {
      food.isTrapped = Boolean(trapLoop)
    }
  }
}

function updateTrappedFoodCrush(food, trapLoop, now) {
  if (!trapLoop) {
    food.crushStartedAt = 0
    food.crushProgress = 0
    return false
  }

  if (!food.crushStartedAt) food.crushStartedAt = now
  food.crushProgress = Math.min(1, (now - food.crushStartedAt) / trappedCrushDuration)

  if (food.crushProgress < 1) return false

  spawnOrangePoof([{ x: food.x, y: food.y }])
  return true
}

function nudgeTrappedBadSnake(enemySnake, contactX, contactY, enemyContactX, enemyContactY) {
  if (!Number.isFinite(enemyContactX) || !Number.isFinite(enemyContactY)) {
    enemyContactX = enemySnake.head.x
    enemyContactY = enemySnake.head.y
  }

  var normal = getCollisionNormal(
    enemyContactX - contactX,
    enemyContactY - contactY,
    enemySnake.heading
  )

  moveBadSnake(enemySnake, normal.x * 2.5 * renderScale, normal.y * 2.5 * renderScale)
  enemySnake.heading = getReflectedHeading(enemySnake.heading, normal.x, normal.y)
  enemySnake.wanderAngle = enemySnake.heading
  enemySnake.nextWanderAt = Date.now() + 350
}

function crushBadSnake(enemySnake) {
  spawnCentipedePoof(enemySnake)
  spawnCentipedeOrbs(enemySnake)
  removeBadSnake(enemySnake)
  playGameSound('eat')
}

function spawnCentipedePoof(enemySnake) {
  spawnOrangePoof([enemySnake.head].concat(enemySnake.segments))
}

function spawnOrangePoof(points) {
  var centerX = 0
  var centerY = 0

  for (var i = 0; i < points.length; i++) {
    centerX += points[i].x
    centerY += points[i].y
  }

  centipedePoofs.push({
    x: centerX / points.length,
    y: centerY / points.length,
    startedAt: Date.now(),
    particles: points.map(function (point, index) {
      var angle = Math.atan2(point.y - centerY / points.length, point.x - centerX / points.length)
      if (!Number.isFinite(angle)) angle = index / points.length * Math.PI * 2

      return {
        x: point.x,
        y: point.y,
        angle: angle,
        speed: 9 + Math.random() * 9,
      }
    }),
  })
}

function updateCentipedePoofs() {
  var now = Date.now()

  for (var i = centipedePoofs.length - 1; i >= 0; i--) {
    var poof = centipedePoofs[i]
    var progress = (now - poof.startedAt) / centipedePoofDuration

    if (progress >= 1) {
      centipedePoofs.splice(i, 1)
      continue
    }

    var alpha = 1 - progress
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 154, 61, ' + alpha * 0.75 + ')'
    ctx.lineWidth = 3 * renderScale * alpha
    ctx.beginPath()
    ctx.arc(poof.x, poof.y, (12 + progress * 32) * renderScale, 0, Math.PI * 2)
    ctx.stroke()

    for (var particleIndex = 0; particleIndex < poof.particles.length; particleIndex++) {
      var particle = poof.particles[particleIndex]
      var travel = particle.speed * progress * renderScale

      ctx.fillStyle = 'rgba(255, 176, 72, ' + alpha + ')'
      ctx.beginPath()
      ctx.arc(
        particle.x + Math.cos(particle.angle) * travel,
        particle.y + Math.sin(particle.angle) * travel,
        (2.5 + alpha * 2.5) * renderScale,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }

    ctx.restore()
  }
}

function spawnCentipedeOrbs(enemySnake) {
  var rewardPoints = enemySnake.segments.slice()

  if (rewardPoints.length === 0) rewardPoints.push(enemySnake.head)

  for (var i = 0; i < rewardPoints.length; i++) {
    foods.push(createOrangeRewardOrb(rewardPoints[i], 1))
  }
}

function createOrangeRewardOrb(source, growthValue) {
  return {
    x: source.x,
    y: source.y,
    dx: 0,
    dy: 0,
    facingAngle: 0,
    type: 'centipede-orb',
    growthValue: growthValue,
    swallowRadius: 17 * renderScale,
    expiresAt: 0,
    isBad: false,
    initialized: true,
    enteringArena: false,
    leavingArena: false,
    pauseUntil: 0,
    nextTurnAt: 0,
    pulseOffset: Math.random() * Math.PI * 2,
  }
}

function bounceBadSnakeOffPlayer(enemySnake, contactX, contactY) {
  var normal = getCollisionNormal(
    enemySnake.head.x - contactX,
    enemySnake.head.y - contactY,
    enemySnake.heading
  )
  var separation = 24 * renderScale
  var distance = Math.hypot(enemySnake.head.x - contactX, enemySnake.head.y - contactY)
  var pushDistance = Math.max(5 * renderScale, separation - distance)
  var reflectedHeading = getReflectedHeading(enemySnake.heading, normal.x, normal.y)

  moveBadSnake(enemySnake, normal.x * pushDistance, normal.y * pushDistance)
  enemySnake.heading = reflectedHeading
  enemySnake.wanderAngle = reflectedHeading
  enemySnake.nextWanderAt = Date.now() + 650
}

function getSnakeTrapLoops() {
  var snakePoints = [{ x: snakeHead.x, y: snakeHead.y }]
  var minimumPointSeparation = Math.max(8, Math.ceil(70 * renderScale / segLength))
  var closureDistance = 27 * renderScale
  var closureDistanceSquared = closureDistance * closureDistance
  var minimumCandidateArea = 520 * renderScale * renderScale
  var bucketSize = closureDistance
  var pointBuckets = {}
  var trapLoops = []

  for (var bodyIndex = 0; bodyIndex < x.length; bodyIndex++) {
    snakePoints.push({ x: x[bodyIndex], y: y[bodyIndex] })
  }

  for (var endIndex = 0; endIndex < snakePoints.length; endIndex++) {
    var endPoint = snakePoints[endIndex]
    var bucketX = Math.floor(endPoint.x / bucketSize)
    var bucketY = Math.floor(endPoint.y / bucketSize)

    for (var offsetX = -1; offsetX <= 1; offsetX++) {
      for (var offsetY = -1; offsetY <= 1; offsetY++) {
        var nearbyIndexes = pointBuckets[(bucketX + offsetX) + ':' + (bucketY + offsetY)] || []

        for (var nearbyIndex = 0; nearbyIndex < nearbyIndexes.length; nearbyIndex++) {
          var startIndex = nearbyIndexes[nearbyIndex]
          if (endIndex - startIndex < minimumPointSeparation) continue

          var startPoint = snakePoints[startIndex]
          var closureDx = endPoint.x - startPoint.x
          var closureDy = endPoint.y - startPoint.y
          if (closureDx * closureDx + closureDy * closureDy > closureDistanceSquared) continue

          var trapPolygon = snakePoints.slice(startIndex, endIndex + 1)
          var loopArea = Math.abs(getPolygonArea(trapPolygon))
          if (loopArea < minimumCandidateArea) continue

          trapLoops.push(createTrapLoop(trapPolygon, loopArea))
        }
      }
    }

    var bucketKey = bucketX + ':' + bucketY
    if (!pointBuckets[bucketKey]) pointBuckets[bucketKey] = []
    pointBuckets[bucketKey].push(endIndex)
  }

  return trapLoops
}

function createTrapLoop(polygon, area) {
  var bounds = {
    left: polygon[0].x,
    right: polygon[0].x,
    top: polygon[0].y,
    bottom: polygon[0].y,
  }

  for (var i = 1; i < polygon.length; i++) {
    bounds.left = Math.min(bounds.left, polygon[i].x)
    bounds.right = Math.max(bounds.right, polygon[i].x)
    bounds.top = Math.min(bounds.top, polygon[i].y)
    bounds.bottom = Math.max(bounds.bottom, polygon[i].y)
  }

  return {
    polygon: polygon,
    area: area,
    bounds: bounds,
  }
}

function getBadSnakeTrapLoop(enemySnake, snakeTrapLoops) {
  var minimumLoopArea = 520 * renderScale * renderScale
  var smallestEnclosingLoop

  for (var loopIndex = 0; loopIndex < snakeTrapLoops.length; loopIndex++) {
    var trapLoop = snakeTrapLoops[loopIndex]
    if (trapLoop.area < minimumLoopArea) continue
    if (smallestEnclosingLoop && trapLoop.area >= smallestEnclosingLoop.area) continue
    if (!isPointInsideTrapLoop(enemySnake.head.x, enemySnake.head.y, trapLoop)) continue

    var allSegmentsInside = true
    for (var segmentIndex = 0; segmentIndex < enemySnake.segments.length; segmentIndex++) {
      var segment = enemySnake.segments[segmentIndex]
      if (!isPointInsideTrapLoop(segment.x, segment.y, trapLoop)) {
        allSegmentsInside = false
        break
      }
    }

    if (allSegmentsInside) smallestEnclosingLoop = trapLoop
  }

  return smallestEnclosingLoop
}

function getPointTrapLoop(pointX, pointY, snakeTrapLoops) {
  var smallestEnclosingLoop

  for (var loopIndex = 0; loopIndex < snakeTrapLoops.length; loopIndex++) {
    var trapLoop = snakeTrapLoops[loopIndex]
    if (smallestEnclosingLoop && trapLoop.area >= smallestEnclosingLoop.area) continue
    if (!isPointInsideTrapLoop(pointX, pointY, trapLoop)) continue

    smallestEnclosingLoop = trapLoop
  }

  return smallestEnclosingLoop
}

function isPointInsideTrapLoop(pointX, pointY, trapLoop) {
  var bounds = trapLoop.bounds

  if (
    pointX < bounds.left ||
    pointX > bounds.right ||
    pointY < bounds.top ||
    pointY > bounds.bottom
  ) {
    return false
  }

  return isPointInsidePolygon(pointX, pointY, trapLoop.polygon)
}

function getPolygonArea(points) {
  var area = 0

  for (var i = 0; i < points.length; i++) {
    var nextIndex = (i + 1) % points.length
    area += points[i].x * points[nextIndex].y - points[nextIndex].x * points[i].y
  }

  return area / 2
}

function isPointInsidePolygon(pointX, pointY, polygon) {
  var inside = false

  for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    var firstPoint = polygon[i]
    var secondPoint = polygon[j]
    var crossesRay = (firstPoint.y > pointY) !== (secondPoint.y > pointY) &&
      pointX < (secondPoint.x - firstPoint.x) * (pointY - firstPoint.y) /
        (secondPoint.y - firstPoint.y) + firstPoint.x

    if (crossesRay) inside = !inside
  }

  return inside
}
