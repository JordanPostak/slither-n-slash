// Loop detection, trapped transformations, orange rewards, and trap geometry.

function updateTrappedCrush(enemySnake, trapLoop, now) {
  if (!trapLoop) {
    enemySnake.crushStartedAt = 0
    enemySnake.crushProgress = 0
    enemySnake.crushDuration = 0
    return false
  }

  if (!enemySnake.crushStartedAt) {
    enemySnake.crushStartedAt = now
    enemySnake.crushDuration = getTrappedCrushDuration(enemySnake)
  }
  enemySnake.crushProgress = Math.min(1, (now - enemySnake.crushStartedAt) / enemySnake.crushDuration)

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
      foods[i] = createOrangeRewardOrb(
        food,
        Math.max(1, food.growthValue || Math.round(food.sizeScale || 1))
      )
    } else {
      food.isTrapped = Boolean(trapLoop)
    }
  }
}

function updateTrappedFoodCrush(food, trapLoop, now) {
  if (!trapLoop) {
    food.crushStartedAt = 0
    food.crushProgress = 0
    food.crushDuration = 0
    return false
  }

  if (!food.crushStartedAt) {
    food.crushStartedAt = now
    food.crushDuration = getTrappedCrushDuration(food)
  }
  food.crushProgress = Math.min(1, (now - food.crushStartedAt) / food.crushDuration)

  if (food.crushProgress < 1) return false

  spawnOrangePoof([{ x: food.x, y: food.y }])
  return true
}

function getTrappedCrushDuration(entity) {
  var playerMass = Math.max(1, getPlayerProgressLength() * getPlayerSizeScale())
  var entityScale = entity.collisionScale || entity.sizeScale || 1
  var entityMass

  if (entity.segments) {
    entityMass = (entity.segments.length + 1) * entityScale * entityScale
  } else {
    var foodMass = entity.type === 'mouse' ? 3 : entity.isBad ? 1.4 : 1
    entityMass = foodMass * entityScale * entityScale
  }

  return trappedCrushDuration * (0.75 + Math.sqrt(entityMass / playerMass))
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

  var predatorScale = enemySnake.collisionScale || 1
  moveBadSnake(enemySnake, normal.x * 2.5 * renderScale * predatorScale, normal.y * 2.5 * renderScale * predatorScale)
  enemySnake.heading = getSoftCollisionHeading(enemySnake.heading, normal.x, normal.y, badSnakeTurnRate * 3)
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

function createOrangeRewardOrb(source, growthValue, sizeScale) {
  var rewardSizeScale = sizeScale || source.sizeScale || 1

  return {
    x: source.x,
    y: source.y,
    dx: 0,
    dy: 0,
    facingAngle: 0,
    type: 'centipede-orb',
    sizeScale: rewardSizeScale,
    growthValue: growthValue,
    swallowRadius: 17 * renderScale * rewardSizeScale,
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
  var predatorScale = enemySnake.collisionScale || 1
  var separation = 24 * renderScale * predatorScale
  var distance = Math.hypot(enemySnake.head.x - contactX, enemySnake.head.y - contactY)
  var pushDistance = Math.max(2 * renderScale * predatorScale, Math.min(9 * renderScale * predatorScale, (separation - distance) * 0.5))
  var softHeading = getSoftCollisionHeading(enemySnake.heading, normal.x, normal.y, badSnakeTurnRate * 4)

  moveBadSnake(enemySnake, normal.x * pushDistance, normal.y * pushDistance)
  enemySnake.heading = softHeading
  enemySnake.wanderAngle = softHeading
  enemySnake.nextWanderAt = Date.now() + 650
}

function getSnakeTrapLoops() {
  var now = Date.now()
  if (now < nextSnakeTrapScanAt) return cachedSnakeTrapLoops

  var snakePoints = [{ x: snakeHead.x, y: snakeHead.y }]
  var pointStride = Math.max(1, Math.ceil(x.length / snakeTrapMaxPoints))
  var minimumPointSeparation = Math.max(4, Math.ceil(8 / pointStride))
  var closureDistance = 27 * renderScale * getPlayerSizeScale()
  var closureDistanceSquared = closureDistance * closureDistance
  var minimumCandidateArea = 520 * renderScale * renderScale
  var bucketSize = closureDistance
  var pointBuckets = {}
  var trapLoops = []
  var crossPrefix = [0]

  for (var bodyIndex = 0; bodyIndex < x.length; bodyIndex += pointStride) {
    snakePoints.push({ x: x[bodyIndex], y: y[bodyIndex] })
  }

  var lastBodyIndex = x.length - 1
  var lastSample = snakePoints[snakePoints.length - 1]
  if (lastBodyIndex >= 0 && (lastSample.x !== x[lastBodyIndex] || lastSample.y !== y[lastBodyIndex])) {
    snakePoints.push({ x: x[lastBodyIndex], y: y[lastBodyIndex] })
  }

  for (var prefixIndex = 1; prefixIndex < snakePoints.length; prefixIndex++) {
    var prefixPrevious = snakePoints[prefixIndex - 1]
    var prefixCurrent = snakePoints[prefixIndex]
    crossPrefix[prefixIndex] = crossPrefix[prefixIndex - 1] +
      prefixPrevious.x * prefixCurrent.y - prefixCurrent.x * prefixPrevious.y
  }

  for (var endIndex = 0; endIndex < snakePoints.length; endIndex++) {
    var endPoint = snakePoints[endIndex]
    var bucketX = Math.floor(endPoint.x / bucketSize)
    var bucketY = Math.floor(endPoint.y / bucketSize)
    var bestStartIndex = -1
    var bestLoopArea = Infinity

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

          var openChainArea = crossPrefix[endIndex] - crossPrefix[startIndex]
          var closingEdgeArea = endPoint.x * startPoint.y - startPoint.x * endPoint.y
          var loopArea = Math.abs((openChainArea + closingEdgeArea) / 2)
          if (loopArea < minimumCandidateArea) continue

          if (loopArea < bestLoopArea) {
            bestStartIndex = startIndex
            bestLoopArea = loopArea
          }
        }
      }
    }

    if (bestStartIndex >= 0) {
      addLimitedTrapLoop(
        trapLoops,
        createTrapLoop(snakePoints.slice(bestStartIndex, endIndex + 1), bestLoopArea)
      )
    }

    var bucketKey = bucketX + ':' + bucketY
    if (!pointBuckets[bucketKey]) pointBuckets[bucketKey] = []
    pointBuckets[bucketKey].push(endIndex)
  }

  cachedSnakeTrapLoops = trapLoops
  nextSnakeTrapScanAt = now + snakeTrapScanInterval
  return cachedSnakeTrapLoops
}

function addLimitedTrapLoop(trapLoops, trapLoop) {
  if (trapLoops.length < maxSnakeTrapLoops) {
    trapLoops.push(trapLoop)
    return
  }

  var largestLoopIndex = 0
  for (var i = 1; i < trapLoops.length; i++) {
    if (trapLoops[i].area > trapLoops[largestLoopIndex].area) largestLoopIndex = i
  }

  if (trapLoop.area < trapLoops[largestLoopIndex].area) {
    trapLoops[largestLoopIndex] = trapLoop
  }
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
