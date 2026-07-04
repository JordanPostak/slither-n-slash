// Centipede bodies, transformation indicators, legs, and flame effects.

function drawBadSnake(enemySnake) {
  drawBadCentipedeSegment(enemySnake.head.x, enemySnake.head.y, enemySnake.heading, true, enemySnake.palette, 0, enemySnake.isBurning, enemySnake.crushProgress)

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    var leader = i === 0 ? enemySnake.head : enemySnake.segments[i - 1]
    var angle = Math.atan2(leader.y - segment.y, leader.x - segment.x)
    drawBadCentipedeSegment(segment.x, segment.y, angle, false, enemySnake.palette, i + 1, enemySnake.isBurning, enemySnake.crushProgress)
  }

  if (enemySnake.crushProgress > 0 && !enemySnake.isBurning) {
    drawBadSnakeCrushTransformation(enemySnake)
  }

  if (enemySnake.isTrapped && !enemySnake.isBurning) {
    drawTrappedCentipedeIndicator(enemySnake)
  }
}

function drawBadSnakeCrushTransformation(enemySnake) {
  var points = [enemySnake.head].concat(enemySnake.segments)
  var progress = enemySnake.crushProgress || 0

  for (var i = 0; i < points.length; i++) {
    var stagger = points.length > 1 ? i / (points.length - 1) * 0.35 : 0
    var orbProgress = Math.max(0, Math.min(1, (progress - stagger) / 0.65))
    if (orbProgress <= 0) continue

    var point = points[i]
    var pulse = 1 + Math.sin(Date.now() * 0.018 + i) * 0.08 * orbProgress
    var radius = (i === 0 ? 10 : 8) * renderScale * pulse

    ctx.save()
    ctx.globalAlpha = orbProgress
    ctx.fillStyle = 'rgba(255, 116, 25, 0.24)'
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius * 1.65, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ff8128'
    ctx.beginPath()
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffd071'
    ctx.beginPath()
    ctx.arc(
      point.x - radius * 0.25,
      point.y - radius * 0.25,
      radius * 0.32,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.restore()
  }
}

function drawTrappedCentipedeIndicator(enemySnake) {
  var pulse = 0.82 + Math.sin(Date.now() * 0.012) * 0.18
  var crushProgress = enemySnake.crushProgress || 0

  ctx.save()
  ctx.translate(enemySnake.head.x, enemySnake.head.y)
  ctx.strokeStyle = 'rgba(115, 226, 255, ' + pulse + ')'
  ctx.lineWidth = 2 * renderScale
  ctx.setLineDash([4 * renderScale, 3 * renderScale])
  ctx.beginPath()
  ctx.arc(0, 0, 18 * renderScale, 0, Math.PI * 2)
  ctx.stroke()
  if (crushProgress > 0) {
    ctx.setLineDash([])
    ctx.strokeStyle = '#ff9a3d'
    ctx.lineWidth = 3 * renderScale
    ctx.beginPath()
    ctx.arc(0, 0, 21 * renderScale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * crushProgress)
    ctx.stroke()
  }
  ctx.setLineDash([])
  var statusText = crushProgress > 0 ? 'CRUSHING' : 'TRAPPED'
  ctx.fillStyle = crushProgress > 0 ? '#ffd29a' : '#dff8ff'
  ctx.strokeStyle = 'rgba(5, 18, 25, 0.92)'
  ctx.lineWidth = 2.5 * renderScale
  ctx.font = '800 ' + 8 * renderScale + 'px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.strokeText(statusText, 0, -20 * renderScale)
  ctx.fillText(statusText, 0, -20 * renderScale)
  ctx.restore()
}

function drawBadCentipedeSegment(posX, posY, angle, isHead, palette, segmentIndex, isBurning, crushProgress) {
  var now = Date.now()
  var walkPhase = isBurning ? 0 : Math.sin(now * 0.016 + segmentIndex * 0.85)
  var flameStep = Math.sin(now * 0.032 + segmentIndex * 0.7) * 2
  var legReach = isHead ? 10 : 12
  var legLift = walkPhase * 3 * (1 - (crushProgress || 0))

  ctx.save()
  ctx.translate(posX, posY)
  ctx.rotate(angle)
  ctx.scale(renderScale, renderScale)

  ctx.strokeStyle = 'rgba(12, 5, 8, 0.74)'
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(-10 - legLift, -legReach)
  ctx.moveTo(2, -6)
  ctx.lineTo(9 + legLift, -legReach)
  ctx.moveTo(-4, 6)
  ctx.lineTo(-10 + legLift, legReach)
  ctx.moveTo(2, 6)
  ctx.lineTo(9 - legLift, legReach)
  ctx.stroke()

  ctx.strokeStyle = palette.stripe
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(-4, -6)
  ctx.lineTo(-10 - legLift, -legReach)
  ctx.moveTo(2, -6)
  ctx.lineTo(9 + legLift, -legReach)
  ctx.moveTo(-4, 6)
  ctx.lineTo(-10 + legLift, legReach)
  ctx.moveTo(2, 6)
  ctx.lineTo(9 - legLift, legReach)
  ctx.stroke()

  ctx.fillStyle = isHead ? palette.head : palette.body
  ctx.strokeStyle = '#1a0d12'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(0, 0, isHead ? 13 : 10.5, isHead ? 8.5 : 7.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.strokeStyle = palette.stripe
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-6, -2.5)
  ctx.quadraticCurveTo(0, 2, 7, -1.5)
  ctx.moveTo(-6, 2.5)
  ctx.quadraticCurveTo(0, -2, 7, 1.5)
  ctx.stroke()

  if (isHead) {
    ctx.fillStyle = '#ffd2a1'
    ctx.beginPath()
    ctx.arc(5, -3.5, 1.5, 0, Math.PI * 2)
    ctx.arc(5, 3.5, 1.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = palette.stripe
    ctx.lineWidth = 1.1
    ctx.beginPath()
    ctx.moveTo(10, -4)
    ctx.lineTo(15, -8)
    ctx.moveTo(10, 4)
    ctx.lineTo(15, 8)
    ctx.stroke()
  }

  if (isBurning) {
    drawCentipedeFlames(segmentIndex, flameStep)
  }

  ctx.restore()
}

function drawCentipedeFlames(segmentIndex, flameStep) {
  ctx.fillStyle = 'rgba(255, 116, 35, 0.2)'
  ctx.beginPath()
  ctx.arc(0, 0, 15 + flameStep, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ff6f21'
  ctx.strokeStyle = '#ffe36c'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(-8, 5)
  ctx.bezierCurveTo(-13, 0, -8, -9 - flameStep, -3, -5)
  ctx.bezierCurveTo(-1, -14, 5, -10, 3, -4)
  ctx.bezierCurveTo(10, -9, 13, 0, 8, 5)
  ctx.bezierCurveTo(4, 9, -4, 9, -8, 5)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffe76a'
  ctx.beginPath()
  ctx.moveTo(-2, 4)
  ctx.bezierCurveTo(-5, 0, -2, -6, 1, -3)
  ctx.bezierCurveTo(5, -6, 7, 1, 3, 5)
  ctx.bezierCurveTo(1, 7, -1, 6, -2, 4)
  ctx.fill()
}
