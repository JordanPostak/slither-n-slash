// Centipede bodies, progressive orange transformation, legs, and flame effects.

function drawBadSnake(enemySnake) {
  if (enemySnake.species === 'tree-snake') {
    drawTreeSnakePredator(enemySnake)
    return
  }

  drawBadCentipedeSegment(enemySnake.head.x, enemySnake.head.y, enemySnake.heading, true, false, enemySnake.palette, 0, enemySnake.isBurning, enemySnake.crushProgress)

  for (var i = 0; i < enemySnake.segments.length; i++) {
    var segment = enemySnake.segments[i]
    var leader = i === 0 ? enemySnake.head : enemySnake.segments[i - 1]
    var angle = Math.atan2(leader.y - segment.y, leader.x - segment.x)
    drawBadCentipedeSegment(segment.x, segment.y, angle, false, i === enemySnake.segments.length - 1, enemySnake.palette, i + 1, enemySnake.isBurning, enemySnake.crushProgress)
  }

}

function drawBadCentipedeSegment(posX, posY, angle, isHead, isTail, palette, segmentIndex, isBurning, crushProgress) {
  var now = Date.now()
  var flameStep = Math.sin(now * 0.032 + segmentIndex * 0.7) * 2
  var legReach = isHead ? 13 : 15
  var walkAmount = isBurning ? 0 : (1 - (crushProgress || 0))

  ctx.save()
  ctx.translate(posX, posY)
  ctx.rotate(angle)
  ctx.scale(renderScale, renderScale)

  drawCentipedeLegs(isHead, isTail, palette, legReach, segmentIndex, now, walkAmount)

  if (drawCentipedeSpriteSegment(isHead, isTail, segmentIndex, isBurning, crushProgress)) {
    if (isBurning) drawCentipedeFlames(segmentIndex, flameStep)
    ctx.restore()
    return
  }

  drawProceduralCentipedeBody(isHead, isTail, palette, segmentIndex, isBurning, crushProgress, flameStep)
  ctx.restore()
}

function drawCentipedeLegs(isHead, isTail, palette, legReach, segmentIndex, now, walkAmount) {
  var legRoots = isHead
    ? [-7, -1, 6]
    : (isTail ? [-8, -2, 5] : [-8, -1, 7])

  drawCentipedePointedLegSet(legRoots, legReach, segmentIndex, now, walkAmount, 1)
  drawCentipedePointedLegSet(legRoots, legReach, segmentIndex, now, walkAmount, -1)

  drawCentipedeFeelers(isHead, isTail, palette, segmentIndex, now, walkAmount)
}

function drawCentipedePointedLegSet(legRoots, legReach, segmentIndex, now, walkAmount, sideSign) {
  for (var i = 0; i < legRoots.length; i++) {
    var rootX = legRoots[i]
    var phase = now * 0.012 + segmentIndex * 0.82 + i * 2.05 + (sideSign < 0 ? Math.PI : 0)
    var cycle = Math.sin(phase)
    var liftCycle = Math.max(0, Math.cos(phase))
    var stride = cycle * 7.4 * walkAmount
    var lift = liftCycle * liftCycle * 7.2 * walkAmount
    var plantPress = Math.max(0, -Math.cos(phase)) * 2.4 * walkAmount
    var frontness = i / Math.max(1, legRoots.length - 1)
    var sweep = frontness * 8.2 - 4.6
    var rootY = sideSign * 7.4
    var baseHalfWidth = 1.9
    var kneeX = rootX + sweep * 0.34 + stride * 0.36
    var kneeY = sideSign * (legReach * 0.52 - lift * 0.46 + plantPress * 0.45)
    var tipX = rootX + sweep - 7.8 - stride * 0.78
    var tipY = sideSign * (legReach + 2.6 - lift + plantPress)

    ctx.fillStyle = 'rgba(74, 37, 8, 0.88)'
    ctx.beginPath()
    ctx.moveTo(rootX - 0.8, rootY - sideSign * baseHalfWidth)
    ctx.quadraticCurveTo(kneeX - 1.4, kneeY, tipX, tipY)
    ctx.quadraticCurveTo(kneeX + 1.8, kneeY - sideSign * 1.2, rootX + 0.9, rootY + sideSign * baseHalfWidth)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#c4872e'
    ctx.beginPath()
    ctx.moveTo(rootX - 0.25, rootY - sideSign * (baseHalfWidth * 0.52))
    ctx.quadraticCurveTo(kneeX - 0.5, kneeY, tipX - 0.8, tipY - sideSign * 0.45)
    ctx.quadraticCurveTo(kneeX + 0.7, kneeY - sideSign * 0.5, rootX + 0.35, rootY + sideSign * (baseHalfWidth * 0.52))
    ctx.closePath()
    ctx.fill()
  }
}

function drawCentipedeFeelers(isHead, isTail, palette, segmentIndex, now, walkAmount) {
  if (!isHead && !isTail) return

  var feelerWave = Math.sin(now * 0.009 + segmentIndex * 0.7) * 4.2 * walkAmount
  var feelerBounce = Math.cos(now * 0.013 + segmentIndex) * 2.8 * walkAmount

  ctx.strokeStyle = 'rgba(53, 26, 7, 0.92)'
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.beginPath()

  if (isHead) {
    drawCentipedeFeelerPath(13, -5.8, 20 + feelerWave * 0.5, -18 - feelerBounce, 31 + feelerWave, -30 - feelerBounce)
    drawCentipedeFeelerPath(13, 5.8, 20 - feelerWave * 0.5, 18 + feelerBounce, 31 - feelerWave, 30 + feelerBounce)
  }

  if (isTail) {
    drawCentipedeFeelerPath(-12, -4.8, -20 - feelerWave * 0.42, -15 - feelerBounce, -30 - feelerWave * 0.82, -25 - feelerBounce)
    drawCentipedeFeelerPath(-12, 4.8, -20 + feelerWave * 0.42, 15 + feelerBounce, -30 + feelerWave * 0.82, 25 + feelerBounce)
  }

  ctx.stroke()

  ctx.strokeStyle = '#c4872e'
  ctx.lineWidth = 1.45
  ctx.beginPath()

  if (isHead) {
    drawCentipedeFeelerPath(13, -5.8, 20 + feelerWave * 0.5, -18 - feelerBounce, 31 + feelerWave, -30 - feelerBounce)
    drawCentipedeFeelerPath(13, 5.8, 20 - feelerWave * 0.5, 18 + feelerBounce, 31 - feelerWave, 30 + feelerBounce)
  }

  if (isTail) {
    drawCentipedeFeelerPath(-12, -4.8, -20 - feelerWave * 0.42, -15 - feelerBounce, -30 - feelerWave * 0.82, -25 - feelerBounce)
    drawCentipedeFeelerPath(-12, 4.8, -20 + feelerWave * 0.42, 15 + feelerBounce, -30 + feelerWave * 0.82, 25 + feelerBounce)
  }

  ctx.stroke()
}

function drawCentipedeFeelerPath(startX, startY, bendX, bendY, endX, endY) {
  ctx.moveTo(startX, startY)
  ctx.quadraticCurveTo(bendX, bendY, endX, endY)
}

function drawCentipedeSpriteSegment(isHead, isTail, segmentIndex, isBurning, crushProgress) {
  var image = isHead
    ? centipedeHeadImage
    : (isTail ? centipedeTailImage : centipedeBodyImage)

  if (!image.complete || !image.naturalWidth) return false

  var width = isHead ? 28 : (isTail ? 23 : 25)
  var height = isHead ? 16 : 12.8

  ctx.drawImage(image, -width / 2, -height / 2, width, height)

  if (crushProgress > 0 && !isBurning) {
    drawCentipedeCrushOverlay(isHead, isTail, crushProgress)
  }

  return true
}

function drawCentipedeCrushOverlay(isHead, isTail, crushProgress) {
  ctx.save()
  ctx.globalAlpha = crushProgress * 0.78
  ctx.fillStyle = '#f47c20'
  ctx.beginPath()
  ctx.ellipse(0, 0, isHead ? 11.8 : (isTail ? 8.9 : 9.6), isHead ? 6.9 : 5.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawProceduralCentipedeBody(isHead, isTail, palette, segmentIndex, isBurning, crushProgress, flameStep) {
  var bodyRadiusX = isHead ? 11.8 : (isTail ? 8.9 : 9.6)
  var bodyRadiusY = isHead ? 6.9 : 5.4

  ctx.fillStyle = isHead ? palette.head : palette.body
  ctx.strokeStyle = '#1a0d12'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(0, 0, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2)
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
    drawCentipedeCrushOverlay(isHead, isTail, crushProgress)
  }

  if (isBurning) {
    drawCentipedeFlames(segmentIndex, flameStep)
  }
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
