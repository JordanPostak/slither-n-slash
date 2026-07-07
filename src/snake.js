// Player snake rendering, face and tail art, trail following, and corner cutting.

var playerTongueNextFlickAt = Date.now() + 700 + Math.random() * 1800
var playerTongueFlickStartedAt = 0
var playerTongueDoubleFlick = false

function drawSnake() {
  var renderStride = getSnakeRenderStride()
  var lastBodyIndex = Math.max(0, x.length - 2)

  if (x.length > 0) {
    drawSnakeSegment(0)
  }

  var lastRenderedIndex = 0
  for (var i = 1; i <= lastBodyIndex; i += renderStride) {
    drawSnakeSegment(i)
    lastRenderedIndex = i
  }

  if (lastBodyIndex > 0 && lastRenderedIndex !== lastBodyIndex) {
    drawSnakeSegment(lastBodyIndex)
  }

  drawSnakeTail()
  drawSnakeFrontOverlaps(renderStride)
}

function getSnakeRenderStride() {
  return Math.min(3, Math.max(1, Math.ceil(x.length / 250)))
}

function getPlayerSizeScale() {
  // The canvas expands as the arena grows, which visually zooms the world out.
  // Counter-scale the player, then add a gentle visible thickness increase so
  // a very long snake still looks substantial without overwhelming the arena.
  var extraSegments = Math.max(0, getPlayerProgressLength() - startingSegments)
  var visibleThicknessGrowth = 1 + Math.log1p(extraSegments) * 0.025
  return getArenaExpansionScale() * visibleThicknessGrowth
}

function getArenaExpansionScale() {
  var extraSegments = Math.max(0, getPlayerProgressLength() - startingSegments)
  return 1 + Math.log1p(extraSegments) * 0.18
}

function getPlayerTurnRate() {
  return turnRate
}

function getPlayerSpeedScale() {
  // Match arena expansion so movement remains constant after canvas zoom-out.
  return getArenaExpansionScale()
}

function drawSnakeSegment(i) {
  var pose = getSnakeSegmentRenderPose(i)
  var angle = pose.angle
  var playerSizeScale = pose.sizeScale

  ctx.save()
  ctx.translate(pose.x, pose.y)
  ctx.rotate(angle + Math.PI)

  var segmentImage = i === 0
    ? wormHeadImage
    : wormBodyImages[(i - 1) % wormBodyImages.length]
  var imageReady = segmentImage.complete && segmentImage.naturalWidth > 0
  var segmentWidth = (i === 0 ? 44 : 30) * renderScale * playerSizeScale
  var segmentHeight = (i === 0 ? 24 : 18) * renderScale * playerSizeScale

  if (imageReady) {
    ctx.drawImage(
      segmentImage,
      -segmentWidth / 2,
      -segmentHeight / 2,
      segmentWidth,
      segmentHeight
    )
    if (i === 0) {
      drawPlayerSnakeTongue(segmentWidth, renderScale * playerSizeScale)
    }
    ctx.restore()
    return
  }

  var segColor

  if (i === 0) segColor = 'red'
  else if (i % 3 === 1) segColor = 'rgba(255, 255, 255, 255)'
  else if (i % 3 === 2) segColor = 'rgba(255, 0, 255, 255)'
  else segColor = 'rgba(0, 0, 255, 255)'

  ctx.fillStyle = segColor
  ctx.beginPath()
  ctx.arc(0, 0, playerSegmentSpacing / 2 * playerSizeScale, 0, Math.PI * 2)
  ctx.fill()

  if (i === 0) {
    drawSnakeFace(28 * renderScale, 46 * renderScale)
  }

  ctx.restore()
}

function drawPlayerSnakeTongue(segmentWidth, tongueScale) {
  var now = Date.now()

  if (!playerTongueFlickStartedAt) {
    if (now < playerTongueNextFlickAt) return
    playerTongueFlickStartedAt = now
    playerTongueDoubleFlick = Math.random() < 0.36
  }

  var elapsed = now - playerTongueFlickStartedAt
  var flickDuration = 300
  var secondFlickStart = 375
  var sequenceDuration = playerTongueDoubleFlick
    ? secondFlickStart + flickDuration
    : flickDuration

  if (elapsed >= sequenceDuration) {
    playerTongueFlickStartedAt = 0
    playerTongueNextFlickAt = now + 650 + Math.random() * 2850
    return
  }

  var flickElapsed = elapsed
  if (playerTongueDoubleFlick) {
    if (elapsed >= flickDuration && elapsed < secondFlickStart) return
    if (elapsed >= secondFlickStart) flickElapsed = elapsed - secondFlickStart
  }

  var flickProgress = Math.sin(flickElapsed / flickDuration * Math.PI)
  var tongueReach = 12 * flickProgress * tongueScale
  var tongueStartX = -segmentWidth / 2 + tongueScale
  var tongueEndX = tongueStartX - tongueReach
  var forkLength = 3.5 * flickProgress * tongueScale

  ctx.save()
  ctx.strokeStyle = '#ff4a63'
  ctx.lineWidth = 1.6 * tongueScale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  ctx.beginPath()
  ctx.moveTo(tongueStartX, 0)
  ctx.quadraticCurveTo(tongueStartX - tongueReach * 0.5, tongueScale, tongueEndX, 0)
  ctx.moveTo(tongueEndX, 0)
  ctx.lineTo(tongueEndX - forkLength, -forkLength * 0.65)
  ctx.moveTo(tongueEndX, 0)
  ctx.lineTo(tongueEndX - forkLength, forkLength * 0.65)
  ctx.stroke()
  ctx.restore()
}

function getSnakeSegmentRenderPose(i) {
  var leaderX = i === 0 ? snakeHead.x : x[i - 1]
  var leaderY = i === 0 ? snakeHead.y : y[i - 1]
  var followerX = i < x.length - 1 ? x[i + 1] : x[i]
  var followerY = i < y.length - 1 ? y[i + 1] : y[i]
  var angle = i === 0
    ? Math.atan2(leaderY - y[i], leaderX - x[i])
    : Math.atan2(leaderY - followerY, leaderX - followerX)
  var playerSizeScale = getPlayerSizeScale()
  var headOffset = i === 0 ? 14 * renderScale * playerSizeScale : 0
  var bodyPivotOffset = i === 0 ? 0 : 2.5 * renderScale * playerSizeScale

  return {
    x: x[i] + Math.cos(angle) * (headOffset - bodyPivotOffset),
    y: y[i] + Math.sin(angle) * (headOffset - bodyPivotOffset),
    angle: angle,
    sizeScale: playerSizeScale,
  }
}

function drawSnakeFace(segmentWidth, segmentHeight) {
  drawSnakeFaceOnContext(ctx, segmentWidth, segmentHeight, renderScale)
}

function drawSnakeFaceOnContext(drawingContext, segmentWidth, segmentHeight, faceScale, emphasizeTongue) {
  var eyeY = -segmentHeight * 0.2
  var eyeX = segmentWidth * 0.18
  var tongueCycle = Date.now() % 1800
  var tongueVisible = emphasizeTongue || tongueCycle < 520

  drawingContext.save()
  drawingContext.lineCap = 'round'

  if (tongueVisible) {
    var tongueReach = emphasizeTongue
      ? 15 * faceScale
      : (8 + Math.sin(tongueCycle / 520 * Math.PI) * 7) * faceScale
    var tongueStartY = -segmentHeight * 0.48
    var tongueEndY = tongueStartY - tongueReach

    drawingContext.strokeStyle = '#ff4a63'
    drawingContext.lineWidth = 1.7 * faceScale
    drawingContext.beginPath()
    drawingContext.moveTo(0, tongueStartY)
    drawingContext.quadraticCurveTo(1.5 * faceScale, tongueStartY - tongueReach * 0.45, 0, tongueEndY)
    drawingContext.stroke()

    drawingContext.beginPath()
    drawingContext.moveTo(0, tongueEndY)
    drawingContext.lineTo(-4 * faceScale, tongueEndY - 4 * faceScale)
    drawingContext.moveTo(0, tongueEndY)
    drawingContext.lineTo(4 * faceScale, tongueEndY - 4 * faceScale)
    drawingContext.stroke()
  }

  drawingContext.fillStyle = '#1a1409'
  drawingContext.strokeStyle = '#3a2409'
  drawingContext.lineWidth = 0.8 * faceScale
  drawingContext.beginPath()
  drawingContext.ellipse(-eyeX, eyeY, 3.1 * faceScale, 4 * faceScale, -0.15, 0, Math.PI * 2)
  drawingContext.ellipse(eyeX, eyeY, 3.1 * faceScale, 4 * faceScale, 0.15, 0, Math.PI * 2)
  drawingContext.fill()
  drawingContext.stroke()

  drawingContext.fillStyle = '#050403'
  drawingContext.beginPath()
  drawingContext.arc(-eyeX, eyeY + 0.2 * faceScale, 2.2 * faceScale, 0, Math.PI * 2)
  drawingContext.arc(eyeX, eyeY + 0.2 * faceScale, 2.2 * faceScale, 0, Math.PI * 2)
  drawingContext.fill()

  drawingContext.fillStyle = 'rgba(255, 255, 255, 0.85)'
  drawingContext.beginPath()
  drawingContext.arc(-eyeX - 0.7 * faceScale, eyeY - 0.9 * faceScale, 0.45 * faceScale, 0, Math.PI * 2)
  drawingContext.arc(eyeX - 0.7 * faceScale, eyeY - 0.9 * faceScale, 0.45 * faceScale, 0, Math.PI * 2)
  drawingContext.fill()

  drawingContext.restore()
}

function drawSnakeTail() {
  if (x.length < 2) return

  var tailPose = getSnakeTailRenderPose()
  var tailAngle = tailPose.angle
  var playerSizeScale = tailPose.sizeScale
  var tailX = tailPose.x
  var tailY = tailPose.y

  if (wormTailImage.complete && wormTailImage.naturalWidth > 0) {
    var tailWidth = 52 * renderScale * playerSizeScale
    var tailHeight = 18 * renderScale * playerSizeScale

    ctx.save()
    ctx.translate(tailX, tailY)
    ctx.rotate(tailAngle)
    ctx.drawImage(
      wormTailImage,
      -tailWidth / 2,
      -tailHeight / 2,
      tailWidth,
      tailHeight
    )
    ctx.restore()
    return
  }

  ctx.save()
  ctx.translate(tailX, tailY)
  ctx.rotate(tailAngle)
  ctx.scale(renderScale, renderScale)

  ctx.beginPath()
  ctx.moveTo(-12, -11)
  ctx.quadraticCurveTo(3, -8, 16, 0)
  ctx.quadraticCurveTo(3, 8, -12, 11)
  ctx.quadraticCurveTo(-7, 4, -7, -4)
  ctx.closePath()

  ctx.fillStyle = '#e4c84c'
  ctx.fill()

  ctx.strokeStyle = '#7c5f12'
  ctx.lineWidth = 1.2
  ctx.stroke()

  ctx.strokeStyle = '#14110a'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-9, 0)
  ctx.quadraticCurveTo(2, -1.6, 12, 0)
  ctx.stroke()

  ctx.restore()
}

function getSnakeTailRenderPose() {
  var tailIndex = Math.max(0, x.length - 2)
  var playerSizeScale = getPlayerSizeScale()
  var lastBodyPose = getSnakeSegmentRenderPose(tailIndex)
  var lastBodyWidth = tailIndex === 0 ? 44 : 30
  var bodyRearDistance = Math.max(7, lastBodyWidth / 2 - 2) * renderScale * playerSizeScale
  var jointX = lastBodyPose.x - Math.cos(lastBodyPose.angle) * bodyRearDistance
  var jointY = lastBodyPose.y - Math.sin(lastBodyPose.angle) * bodyRearDistance
  var tailAngle = Math.atan2(snakeTailPoint.y - jointY, snakeTailPoint.x - jointX)
  var tailCenterDistance = 23 * renderScale * playerSizeScale

  return {
    x: jointX + Math.cos(tailAngle) * tailCenterDistance,
    y: jointY + Math.sin(tailAngle) * tailCenterDistance,
    angle: tailAngle,
    sizeScale: playerSizeScale,
  }
}

function getSnakeTailFollowDistance() {
  return 39 * renderScale * getPlayerSizeScale()
}

function drawSnakeFrontOverlaps(renderStride) {
  if (x.length < 6) return

  var playerSizeScale = getPlayerSizeScale()
  var bodyRadius = 15 * renderScale * playerSizeScale
  var headRadius = 22 * renderScale * playerSizeScale
  var tailRadius = 26 * renderScale * playerSizeScale
  var bucketSize = Math.max(1, bodyRadius * 2)
  var bucketSearchRadius = Math.ceil((headRadius + tailRadius) / bucketSize)
  var layerPoints = []
  var buckets = {}
  var overlapPairs = []

  var lastBodyIndex = x.length - 2
  for (var segmentIndex = 0; segmentIndex <= lastBodyIndex; segmentIndex += renderStride) {
    var segmentPose = getSnakeSegmentRenderPose(segmentIndex)
    var layerPoint = {
      index: segmentIndex,
      x: segmentPose.x,
      y: segmentPose.y,
      radius: segmentIndex === 0 ? headRadius : bodyRadius,
    }
    layerPoints.push(layerPoint)
    addSnakeLayerPointToBucket(layerPoint, bucketSize, buckets)
  }

  if (layerPoints[layerPoints.length - 1].index !== lastBodyIndex) {
    var lastSegmentPose = getSnakeSegmentRenderPose(lastBodyIndex)
    var lastLayerPoint = {
      index: lastBodyIndex,
      x: lastSegmentPose.x,
      y: lastSegmentPose.y,
      radius: bodyRadius,
    }
    layerPoints.push(lastLayerPoint)
    addSnakeLayerPointToBucket(lastLayerPoint, bucketSize, buckets)
  }

  var tailPose = getSnakeTailRenderPose()
  addSnakeLayerPointToBucket({
    index: x.length,
    x: tailPose.x,
    y: tailPose.y,
    radius: tailRadius,
  }, bucketSize, buckets)

  for (var frontIndex = layerPoints.length - 1; frontIndex >= 0; frontIndex--) {
    var frontPoint = layerPoints[frontIndex]
    var bucketX = Math.floor(frontPoint.x / bucketSize)
    var bucketY = Math.floor(frontPoint.y / bucketSize)

    for (var offsetX = -bucketSearchRadius; offsetX <= bucketSearchRadius; offsetX++) {
      for (var offsetY = -bucketSearchRadius; offsetY <= bucketSearchRadius; offsetY++) {
        var bucket = buckets[(bucketX + offsetX) + ':' + (bucketY + offsetY)] || []

        for (var candidateIndex = 0; candidateIndex < bucket.length; candidateIndex++) {
          var backPoint = bucket[candidateIndex]
          if (backPoint.index < frontPoint.index + 5) continue

          var dx = backPoint.x - frontPoint.x
          var dy = backPoint.y - frontPoint.y
          var overlapDistance = frontPoint.radius + backPoint.radius
          var distanceSquared = dx * dx + dy * dy
          if (distanceSquared >= overlapDistance * overlapDistance) continue

          overlapPairs.push({
            frontPoint: frontPoint,
            backPoint: backPoint,
            distanceSquared: distanceSquared,
          })
        }
      }
    }
  }

  overlapPairs.sort(function (firstPair, secondPair) {
    return firstPair.frontPoint.index - secondPair.frontPoint.index ||
      firstPair.distanceSquared - secondPair.distanceSquared
  })
  if (overlapPairs.length > maxSnakeOverlapRedraws) {
    overlapPairs.length = maxSnakeOverlapRedraws
  }
  overlapPairs.sort(function (firstPair, secondPair) {
    return secondPair.frontPoint.index - firstPair.frontPoint.index
  })

  for (var pairIndex = 0; pairIndex < overlapPairs.length; pairIndex++) {
    var overlapPair = overlapPairs[pairIndex]
    var overlapBackPoint = overlapPair.backPoint

    ctx.save()
    ctx.beginPath()
    ctx.arc(overlapBackPoint.x, overlapBackPoint.y, overlapBackPoint.radius, 0, Math.PI * 2)
    ctx.clip()
    drawSnakeSegment(overlapPair.frontPoint.index)
    ctx.restore()
  }
}

function addSnakeLayerPointToBucket(point, bucketSize, buckets) {
  var key = Math.floor(point.x / bucketSize) + ':' + Math.floor(point.y / bucketSize)
  if (!buckets[key]) buckets[key] = []
  buckets[key].push(point)
}

function changes(length) {
  x[length - 1] = x[length - 2]
  y[length - 1] = y[length - 2]
}

function recordSnakeHeadTrail() {
  if (snakeTrail.length === 0) {
    resetSnakeBody()
    return
  }

  var lastPoint = snakeTrail[snakeTrail.length - 1]
  var deltaX = snakeHead.x - lastPoint.x
  var deltaY = snakeHead.y - lastPoint.y
  var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

  if (distance < 0.001) return

  var maxPointSpacing = Math.max(1.5, 2.5 * renderScale)
  var steps = Math.max(1, Math.ceil(distance / maxPointSpacing))

  for (var step = 1; step <= steps; step++) {
    var progress = step / steps
    snakeTrail.push({
      x: lastPoint.x + deltaX * progress,
      y: lastPoint.y + deltaY * progress,
    })
  }

  trimSnakeTrail()
}

function trimSnakeTrail() {
  var tailTrailPadding = Math.max(
    3 * playerSegmentSpacing + 30 * renderScale,
    getSnakeTailFollowDistance() + 30 * renderScale
  )
  var requiredLength = n * playerSegmentSpacing + tailTrailPadding
  var accumulatedLength = 0
  var keepFromIndex = 0

  for (var i = snakeTrail.length - 2; i >= 0; i--) {
    var newerPoint = snakeTrail[i + 1]
    var olderPoint = snakeTrail[i]
    accumulatedLength += Math.hypot(newerPoint.x - olderPoint.x, newerPoint.y - olderPoint.y)

    if (accumulatedLength >= requiredLength) {
      keepFromIndex = i
      break
    }
  }

  if (keepFromIndex > 0) {
    snakeTrail.splice(0, keepFromIndex)
  }
}

function updateSnakeBodyFromTrail(skipCornerCut) {
  if (snakeTrail.length === 0) return

  var previousX = x.slice()
  var previousY = y.slice()
  x.length = n
  y.length = n

  var newestPointIndex = snakeTrail.length - 1
  var newerPoint = snakeTrail[newestPointIndex]
  var olderPointIndex = newestPointIndex - 1
  var accumulatedLength = 0

  for (var segmentIndex = 0; segmentIndex <= n; segmentIndex++) {
    var isTailPoint = segmentIndex === n
    var targetDistance = isTailPoint
      ? Math.max(0, n - 1) * playerSegmentSpacing + getSnakeTailFollowDistance()
      : (segmentIndex + 1) * playerSegmentSpacing
    var positionFound = false

    while (olderPointIndex >= 0) {
      var olderPoint = snakeTrail[olderPointIndex]
      var edgeLength = Math.hypot(newerPoint.x - olderPoint.x, newerPoint.y - olderPoint.y)

      if (edgeLength > 0 && accumulatedLength + edgeLength >= targetDistance) {
        var edgeProgress = (targetDistance - accumulatedLength) / edgeLength
        var sampledX = newerPoint.x + (olderPoint.x - newerPoint.x) * edgeProgress
        var sampledY = newerPoint.y + (olderPoint.y - newerPoint.y) * edgeProgress

        if (isTailPoint) {
          snakeTailPoint.x = sampledX
          snakeTailPoint.y = sampledY
        } else {
          x[segmentIndex] = sampledX
          y[segmentIndex] = sampledY
        }
        positionFound = true
        break
      }

      accumulatedLength += edgeLength
      newerPoint = olderPoint
      olderPointIndex--
    }

    if (!positionFound) {
      var oldestPoint = snakeTrail[0]
      if (isTailPoint) {
        snakeTailPoint.x = oldestPoint.x
        snakeTailPoint.y = oldestPoint.y
      } else {
        x[segmentIndex] = oldestPoint.x
        y[segmentIndex] = oldestPoint.y
      }
    }
  }

  if (!skipCornerCut) applySnakeCornerCut(previousX, previousY)
}

function applySnakeCornerCut(previousX, previousY) {
  var leadX = snakeHead.x
  var leadY = snakeHead.y

  for (var segmentIndex = 0; segmentIndex < n; segmentIndex++) {
    var oldX = previousX[segmentIndex]
    var oldY = previousY[segmentIndex]

    if (!Number.isFinite(oldX) || !Number.isFinite(oldY)) {
      leadX = x[segmentIndex]
      leadY = y[segmentIndex]
      continue
    }

    var dx = leadX - oldX
    var dy = leadY - oldY
    var distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > 0.001) {
      var shortcutX = leadX - dx / distance * playerSegmentSpacing
      var shortcutY = leadY - dy / distance * playerSegmentSpacing
      x[segmentIndex] += (shortcutX - x[segmentIndex]) * snakeCornerCutStrength
      y[segmentIndex] += (shortcutY - y[segmentIndex]) * snakeCornerCutStrength
    }

    leadX = x[segmentIndex]
    leadY = y[segmentIndex]
  }
}

function addSnakeSegments(count, previousProgressLength) {
  for (var i = 0; i < count; i++) {
    changes(n - count + i + 1)
  }

  var previousMaxEnergy = getBoostDurationForSegmentCount(previousProgressLength || n - count)
  var nextMaxEnergy = getBoostDuration()
  var addedCapacity = Math.max(0, nextMaxEnergy - previousMaxEnergy)

  boostEnergy = Math.min(nextMaxEnergy, boostEnergy + addedCapacity)
  boostCoolingDown = !boosting && boostEnergy < nextMaxEnergy
  updateSnakeBodyFromTrail()
  updateBoostMeterStatus(true)
  requestArenaResize()
}

function resetSnakeBody() {
  snakeTrail = []

  var trailLength = Math.max(0, n - 1) * playerSegmentSpacing + getSnakeTailFollowDistance() + 30 * renderScale
  var pointSpacing = Math.max(1.5, 2.5 * renderScale)

  for (var distance = trailLength; distance > 0; distance -= pointSpacing) {
    snakeTrail.push({
      x: snakeHead.x - Math.cos(headingAngle) * distance,
      y: snakeHead.y - Math.sin(headingAngle) * distance,
    })
  }

  snakeTrail.push({ x: snakeHead.x, y: snakeHead.y })
  updateSnakeBodyFromTrail(true)
}
