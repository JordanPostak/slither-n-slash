// Player-style snake predator used after the player reaches 100 segments.

function drawTreeSnakePredator(enemySnake) {
  if (isTreeSnakeSkinReady()) {
    drawPlayerStyleTreeSnake(enemySnake)
    return
  }

  drawFallbackTreeSnakePredator(enemySnake)
}

function isTreeSnakeSkinReady() {
  if (!treeSnakeHeadImage.complete || !treeSnakeHeadImage.naturalWidth) return false
  if (!treeSnakeTailImage.complete || !treeSnakeTailImage.naturalWidth) return false
  if (!treeSnakeBodyImages.length) return false

  for (var i = 0; i < treeSnakeBodyImages.length; i++) {
    if (!treeSnakeBodyImages[i].complete || !treeSnakeBodyImages[i].naturalWidth) return false
  }

  return true
}

function drawPlayerStyleTreeSnake(enemySnake) {
  if (enemySnake.segments.length <= 0) return

  drawPlayerStyleTreeSnakeSegment(enemySnake, 0)

  var lastBodyIndex = Math.max(0, enemySnake.segments.length - 2)
  for (var i = 1; i <= lastBodyIndex; i++) {
    drawPlayerStyleTreeSnakeSegment(enemySnake, i)
  }

  drawPlayerStyleTreeSnakeTail(enemySnake)
}

function drawPlayerStyleTreeSnakeSegment(enemySnake, segmentIndex) {
  var pose = getTreeSnakeSegmentRenderPose(enemySnake, segmentIndex)
  var isHead = segmentIndex === 0
  var segmentImage = isHead
    ? treeSnakeHeadImage
    : treeSnakeBodyImages[(segmentIndex - 1) % treeSnakeBodyImages.length]
  var treeSnakeSizeScale = getTreeSnakeSizeScale(enemySnake)
  var treeSnakeRenderScale = renderScale * treeSnakeSizeScale
  var segmentWidth = (isHead ? 44 : 30) * treeSnakeRenderScale
  var segmentHeight = (isHead ? 24 : 18) * treeSnakeRenderScale

  ctx.save()
  ctx.translate(pose.x, pose.y)
  ctx.rotate(pose.angle + Math.PI)
  ctx.globalAlpha = getTreeSnakeCrushAlpha(enemySnake)
  ctx.drawImage(
    segmentImage,
    -segmentWidth / 2,
    -segmentHeight / 2,
    segmentWidth,
    segmentHeight
  )

  if (isHead) {
    drawPlayerSnakeTongue(segmentWidth, treeSnakeRenderScale)
  }

  if (enemySnake.crushProgress > 0) {
    drawTreeSnakeCrushOverlay(enemySnake.crushProgress, (isHead ? 17 : 11) * treeSnakeRenderScale, (isHead ? 9 : 6.8) * treeSnakeRenderScale)
  }

  ctx.restore()
}

function getTreeSnakeSegmentRenderPose(enemySnake, segmentIndex) {
  var segment = enemySnake.segments[segmentIndex]

  if (segmentIndex === 0) {
    var headAngle = Math.atan2(enemySnake.head.y - segment.y, enemySnake.head.x - segment.x)
    if (!Number.isFinite(headAngle)) headAngle = enemySnake.heading
    var headOffset = 14 * renderScale * getTreeSnakeSizeScale(enemySnake)

    return {
      x: segment.x + Math.cos(headAngle) * headOffset,
      y: segment.y + Math.sin(headAngle) * headOffset,
      angle: headAngle,
    }
  }

  var leader = enemySnake.segments[segmentIndex - 1]
  var follower = segmentIndex < enemySnake.segments.length - 1
    ? enemySnake.segments[segmentIndex + 1]
    : segment
  var angle = Math.atan2(leader.y - follower.y, leader.x - follower.x)
  var bodyPivotOffset = 2.5 * renderScale * getTreeSnakeSizeScale(enemySnake)

  return {
    x: segment.x - Math.cos(angle) * bodyPivotOffset,
    y: segment.y - Math.sin(angle) * bodyPivotOffset,
    angle: angle,
  }
}

function drawPlayerStyleTreeSnakeTail(enemySnake) {
  if (enemySnake.segments.length < 2) return

  var tailPose = getTreeSnakeTailRenderPose(enemySnake)
  var treeSnakeRenderScale = renderScale * getTreeSnakeSizeScale(enemySnake)
  var tailWidth = 52 * treeSnakeRenderScale
  var tailHeight = 18 * treeSnakeRenderScale

  ctx.save()
  ctx.translate(tailPose.x, tailPose.y)
  ctx.rotate(tailPose.angle)
  ctx.globalAlpha = getTreeSnakeCrushAlpha(enemySnake)
  ctx.drawImage(
    treeSnakeTailImage,
    -tailWidth / 2,
    -tailHeight / 2,
    tailWidth,
    tailHeight
  )

  if (enemySnake.crushProgress > 0) {
    drawTreeSnakeCrushOverlay(enemySnake.crushProgress, 10 * treeSnakeRenderScale, 5.5 * treeSnakeRenderScale)
  }

  ctx.restore()
}

function getTreeSnakeTailRenderPose(enemySnake) {
  var tailIndex = Math.max(0, enemySnake.segments.length - 2)
  var lastBodyPose = getTreeSnakeSegmentRenderPose(enemySnake, tailIndex)
  var treeSnakeRenderScale = renderScale * getTreeSnakeSizeScale(enemySnake)
  var bodyRearDistance = Math.max(7, 30 / 2 - 2) * treeSnakeRenderScale
  var jointX = lastBodyPose.x - Math.cos(lastBodyPose.angle) * bodyRearDistance
  var jointY = lastBodyPose.y - Math.sin(lastBodyPose.angle) * bodyRearDistance
  var tailPoint = enemySnake.tailPoint || enemySnake.segments[enemySnake.segments.length - 1]
  var tailAngle = Math.atan2(tailPoint.y - jointY, tailPoint.x - jointX)
  if (!Number.isFinite(tailAngle)) tailAngle = enemySnake.heading
  var tailCenterDistance = 23 * treeSnakeRenderScale

  return {
    x: jointX + Math.cos(tailAngle) * tailCenterDistance,
    y: jointY + Math.sin(tailAngle) * tailCenterDistance,
    angle: tailAngle,
  }
}

function getTreeSnakeCrushAlpha(enemySnake) {
  return 1 - (enemySnake.crushProgress || 0) * 0.18
}

function drawFallbackTreeSnakePredator(enemySnake) {
  for (var i = enemySnake.segments.length - 1; i >= 0; i--) {
    var segment = enemySnake.segments[i]
    var leader = i === 0 ? enemySnake.head : enemySnake.segments[i - 1]
    var follower = i < enemySnake.segments.length - 1
      ? enemySnake.segments[i + 1]
      : segment
    var angle = Math.atan2(leader.y - follower.y, leader.x - follower.x)

    drawTreeSnakePredatorSegment(
      segment.x,
      segment.y,
      angle,
      false,
      i,
      i === enemySnake.segments.length - 1,
      enemySnake
    )
  }

  drawTreeSnakePredatorSegment(
    enemySnake.head.x,
    enemySnake.head.y,
    enemySnake.heading,
    true,
    0,
    false,
    enemySnake
  )
}

function drawTreeSnakePredatorSegment(posX, posY, angle, isHead, segmentIndex, isTail, enemySnake) {
  var predatorScale = enemySnake.collisionScale || getTreeSnakeStartScale()
  var crushProgress = enemySnake.crushProgress || 0

  ctx.save()
  ctx.translate(posX, posY)
  ctx.rotate(angle)
  ctx.scale(renderScale * predatorScale, renderScale * predatorScale)

  if (isHead) {
    drawTreeSnakeHead(crushProgress)
  } else if (isTail) {
    drawTreeSnakeTail(crushProgress)
  } else {
    drawTreeSnakeBody(segmentIndex, crushProgress)
  }

  ctx.restore()
}

function drawTreeSnakeHead(crushProgress) {
  ctx.fillStyle = '#174f2a'
  ctx.strokeStyle = '#082c1a'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(18, 0)
  ctx.bezierCurveTo(12, -10, -8, -12, -16, -6)
  ctx.quadraticCurveTo(-20, 0, -16, 6)
  ctx.bezierCurveTo(-8, 12, 12, 10, 18, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#58ad4f'
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.bezierCurveTo(7, -4, -5, -5, -14, -2)
  ctx.bezierCurveTo(-5, 2, 7, 4, 14, 0)
  ctx.fill()

  ctx.strokeStyle = '#b8dd6b'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-7, -7)
  ctx.quadraticCurveTo(0, -3, 7, -5)
  ctx.moveTo(-7, 7)
  ctx.quadraticCurveTo(0, 3, 7, 5)
  ctx.stroke()

  ctx.fillStyle = '#f4e56b'
  ctx.strokeStyle = '#0a1d10'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.ellipse(7, -4.5, 2.5, 1.8, 0, 0, Math.PI * 2)
  ctx.ellipse(7, 4.5, 2.5, 1.8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#11170e'
  ctx.beginPath()
  ctx.ellipse(7.7, -4.5, 0.65, 1.5, 0, 0, Math.PI * 2)
  ctx.ellipse(7.7, 4.5, 0.65, 1.5, 0, 0, Math.PI * 2)
  ctx.fill()

  var tonguePulse = (Date.now() % 1600) < 420 ? 1 : 0
  if (tonguePulse) {
    ctx.strokeStyle = '#ef5270'
    ctx.lineWidth = 1.1
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(17, 0)
    ctx.lineTo(24, 0)
    ctx.lineTo(28, -2.5)
    ctx.moveTo(24, 0)
    ctx.lineTo(28, 2.5)
    ctx.stroke()
  }

  drawTreeSnakeCrushOverlay(crushProgress, 17, 9)
}

function drawTreeSnakeBody(segmentIndex, crushProgress) {
  ctx.fillStyle = segmentIndex % 2 === 0 ? '#287a3d' : '#2f8842'
  ctx.strokeStyle = '#0b3a20'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(0, 0, 11.5, 7.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#65b84f'
  ctx.beginPath()
  ctx.ellipse(-1, 0, 7.5, 3.2, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = '#c1de73'
  ctx.lineWidth = 1.35
  ctx.beginPath()
  ctx.moveTo(-6, -5.4)
  ctx.quadraticCurveTo(-1, -1.5, 5.5, -4.8)
  ctx.moveTo(-6, 5.4)
  ctx.quadraticCurveTo(-1, 1.5, 5.5, 4.8)
  ctx.stroke()

  drawTreeSnakeCrushOverlay(crushProgress, 11, 6.8)
}

function drawTreeSnakeTail(crushProgress) {
  ctx.fillStyle = '#236d38'
  ctx.strokeStyle = '#0b3a20'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.quadraticCurveTo(1, -6.5, -15, -1.4)
  ctx.quadraticCurveTo(-18, 0, -15, 1.4)
  ctx.quadraticCurveTo(1, 6.5, 10, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  drawTreeSnakeCrushOverlay(crushProgress, 10, 5.5)
}

function drawTreeSnakeCrushOverlay(crushProgress, radiusX, radiusY) {
  if (crushProgress <= 0) return

  ctx.save()
  ctx.globalAlpha = crushProgress * 0.88
  ctx.fillStyle = '#ff8a2d'
  ctx.beginPath()
  ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
