// Player snake rendering, face and tail art, trail following, and corner cutting.

function drawSnake() {
  drawSnakeTail()

  for (var i = x.length - 2; i >= 0; i--) {
    drawSnakeSegment(i)
  }
}

function drawSnakeSegment(i) {
  var leaderX = i === 0 ? snakeHead.x : x[i - 1]
  var leaderY = i === 0 ? snakeHead.y : y[i - 1]
  var angle = Math.atan2(leaderY - y[i], leaderX - x[i])

  ctx.save()
  ctx.translate(x[i], y[i])
  ctx.rotate(angle + Math.PI / 2)

  var segmentImage = i === 0 ? wormHeadImage : wormBodyImage
  var imageReady = segmentImage.complete && segmentImage.naturalWidth > 0
  var segmentWidth = (i === 0 ? 28 : 24) * renderScale
  var segmentHeight = (i === 0 ? 46 : 34) * renderScale

  if (imageReady) {
    ctx.drawImage(
      segmentImage,
      -segmentWidth / 2,
      -segmentHeight / 2,
      segmentWidth,
      segmentHeight
    )
    if (i === 0) {
      drawSnakeFace(segmentWidth, segmentHeight)
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
  ctx.arc(0, 0, segLength / 2, 0, Math.PI * 2)
  ctx.fill()

  if (i === 0) {
    drawSnakeFace(28 * renderScale, 46 * renderScale)
  }

  ctx.restore()
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

  var tailIndex = x.length - 1
  var beforeTailIndex = tailIndex - 1
  var tailAngle = Math.atan2(y[tailIndex] - y[beforeTailIndex], x[tailIndex] - x[beforeTailIndex])
  var tailX = x[tailIndex] + Math.cos(tailAngle) * 8 * renderScale
  var tailY = y[tailIndex] + Math.sin(tailAngle) * 8 * renderScale

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

  var bodyImageReady = wormBodyImage.complete && wormBodyImage.naturalWidth > 0

  if (bodyImageReady) {
    ctx.save()
    ctx.clip()
    ctx.rotate(Math.PI / 2)
    ctx.drawImage(wormBodyImage, -17, -13, 34, 26)
    ctx.restore()
  } else {
    ctx.fillStyle = '#e4c84c'
    ctx.fill()
  }

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
  var requiredLength = (n + 3) * segLength + 30 * renderScale
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

  for (var segmentIndex = 0; segmentIndex < n; segmentIndex++) {
    var targetDistance = (segmentIndex + 1) * segLength
    var positionFound = false

    while (olderPointIndex >= 0) {
      var olderPoint = snakeTrail[olderPointIndex]
      var edgeLength = Math.hypot(newerPoint.x - olderPoint.x, newerPoint.y - olderPoint.y)

      if (edgeLength > 0 && accumulatedLength + edgeLength >= targetDistance) {
        var edgeProgress = (targetDistance - accumulatedLength) / edgeLength
        x[segmentIndex] = newerPoint.x + (olderPoint.x - newerPoint.x) * edgeProgress
        y[segmentIndex] = newerPoint.y + (olderPoint.y - newerPoint.y) * edgeProgress
        positionFound = true
        break
      }

      accumulatedLength += edgeLength
      newerPoint = olderPoint
      olderPointIndex--
    }

    if (!positionFound) {
      var oldestPoint = snakeTrail[0]
      x[segmentIndex] = oldestPoint.x
      y[segmentIndex] = oldestPoint.y
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
      var shortcutX = leadX - dx / distance * segLength
      var shortcutY = leadY - dy / distance * segLength
      x[segmentIndex] += (shortcutX - x[segmentIndex]) * snakeCornerCutStrength
      y[segmentIndex] += (shortcutY - y[segmentIndex]) * snakeCornerCutStrength
    }

    leadX = x[segmentIndex]
    leadY = y[segmentIndex]
  }
}

function addSnakeSegments(count) {
  for (var i = 0; i < count; i++) {
    changes(n - count + i + 1)
  }

  var previousMaxEnergy = getBoostDurationForSegmentCount(n - count)
  var nextMaxEnergy = getBoostDuration()
  var addedCapacity = Math.max(0, nextMaxEnergy - previousMaxEnergy)

  boostEnergy = Math.min(nextMaxEnergy, boostEnergy + addedCapacity)
  boostCoolingDown = !boosting && boostEnergy < nextMaxEnergy
  updateSnakeBodyFromTrail()
}

function resetSnakeBody() {
  snakeTrail = []

  var trailLength = (n + 3) * segLength
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
