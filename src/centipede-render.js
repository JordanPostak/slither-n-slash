// Centipede bodies, progressive orange transformation, legs, and flame effects.

function drawBadSnake(enemySnake) {
  if (enemySnake.species === 'tree-snake') {
    drawTreeSnakePredator(enemySnake)
    return
  }

  drawBadCentipedeSegment(enemySnake.head.x, enemySnake.head.y, enemySnake.heading, true, enemySnake.palette, 0, enemySnake.isBurning, enemySnake.crushProgress)

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    var leader = i === 0 ? enemySnake.head : enemySnake.segments[i - 1]
    var angle = Math.atan2(leader.y - segment.y, leader.x - segment.x)
    drawBadCentipedeSegment(segment.x, segment.y, angle, false, enemySnake.palette, i + 1, enemySnake.isBurning, enemySnake.crushProgress)
  }

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

  if (crushProgress > 0 && !isBurning) {
    ctx.save()
    ctx.globalAlpha = crushProgress * 0.88
    ctx.fillStyle = '#f47c20'
    ctx.beginPath()
    ctx.ellipse(0, 0, isHead ? 13 : 10.5, isHead ? 8.5 : 7.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
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
