// Procedural green tree snake predator used after the player reaches 100 segments.

function drawTreeSnakePredator(enemySnake) {
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
  var predatorScale = enemySnake.collisionScale || treeSnakeFixedScale
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
