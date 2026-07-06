// Fireball, Golden Mouse, Berserker, and recovery behavior and rendering.

function updateFireball() {
  var now = Date.now()

  if (!fireball && now >= nextFireballSpawnAt) {
    if (getActiveBeetleCount() >= fireballMinBeetles) {
      fireball = generateFireball()
    } else {
      scheduleNextFireball()
    }
  }

  if (!fireball) return

  if (now > fireball.expiresAt) {
    fireball = undefined
    scheduleNextFireball()
    return
  }

  fireball.x += fireball.dx
  fireball.y += fireball.dy
  fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)

  var fireballEdgeSize = 18 * renderScale

  if (fireball.enteringArena) {
    if (isEntityInsideArena(fireball, fireballEdgeSize)) {
      fireball.enteringArena = false
    } else {
      return
    }
  }

  applySnakeBodyBounce(fireball)
  applyRoundedArenaBounds(fireball, fireballEdgeSize)

  if (fireball.x < 0 || fireball.x > canvas.width - fireballEdgeSize) {
    fireball.dx *= -1
    fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)
    fireball.x = Math.max(0, Math.min(canvas.width - fireballEdgeSize, fireball.x))
  }

  if (fireball.y < 0 || fireball.y > canvas.height - fireballEdgeSize) {
    fireball.dy *= -1
    fireball.facingAngle = Math.atan2(fireball.dy, fireball.dx)
    fireball.y = Math.max(0, Math.min(canvas.height - fireballEdgeSize, fireball.y))
  }
}

function generateFireball() {
  var spawn = getOffscreenSpawn(getRandomFoodSpeed() * 1.12, 42 * renderScale)

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    enteringArena: true,
    expiresAt: Date.now() + fireballLifetime,
  }
}

function scheduleNextFireball() {
  nextFireballSpawnAt = Date.now() + fireballSpawnMinDelay + Math.random() * (fireballSpawnMaxDelay - fireballSpawnMinDelay)
}

function updateGoldenMouse() {
  var now = Date.now()

  if (!goldenMouse && n >= mouseUnlockLength && now >= nextGoldenMouseSpawnAt) {
    goldenMouse = generateGoldenMouse()
  }

  if (!goldenMouse) return

  if (now >= goldenMouse.expiresAt) {
    goldenMouse = undefined
    scheduleNextGoldenMouse()
    return
  }

  if (!goldenMouse.enteringArena) {
    updateMouseMovement(goldenMouse)
  }

  goldenMouse.x += goldenMouse.dx
  goldenMouse.y += goldenMouse.dy
  goldenMouse.facingAngle = Math.atan2(goldenMouse.dy, goldenMouse.dx)

  var edgeSize = 16 * renderScale * (goldenMouse.sizeScale || 1)

  if (goldenMouse.enteringArena) {
    if (isEntityInsideArena(goldenMouse, edgeSize)) {
      goldenMouse.enteringArena = false
    } else {
      return
    }
  }

  applySnakeBodyBounce(goldenMouse)
  applyRoundedArenaBounds(goldenMouse, edgeSize)

  if (goldenMouse.x < 0 || goldenMouse.x > canvas.width - edgeSize) {
    goldenMouse.dx *= -1
    goldenMouse.x = Math.max(0, Math.min(canvas.width - edgeSize, goldenMouse.x))
  }

  if (goldenMouse.y < 0 || goldenMouse.y > canvas.height - edgeSize) {
    goldenMouse.dy *= -1
    goldenMouse.y = Math.max(0, Math.min(canvas.height - edgeSize, goldenMouse.y))
  }

  goldenMouse.facingAngle = Math.atan2(goldenMouse.dy, goldenMouse.dx)
}

function generateGoldenMouse() {
  var sizeScale = mouseBaseSizeScale
  var spawn = getOffscreenSpawn(getRandomFoodSpeed() * 1.08, 28 * renderScale * sizeScale)

  return {
    x: spawn.x,
    y: spawn.y,
    dx: spawn.dx,
    dy: spawn.dy,
    facingAngle: Math.atan2(spawn.dy, spawn.dx),
    type: 'golden-mouse',
    sizeScale: sizeScale,
    growthValue: mouseGrowthValue,
    swallowRadius: 24 * renderScale * sizeScale,
    enteringArena: true,
    expiresAt: Date.now() + goldenMouseLifetime,
    fleeEnergy: mouseFleeStamina,
    pauseUntil: 0,
    nextTurnAt: Date.now() + 500,
    lastMouseUpdateAt: Date.now(),
  }
}

function scheduleNextGoldenMouse() {
  nextGoldenMouseSpawnAt = Date.now() + goldenMouseSpawnMinDelay + Math.random() * (goldenMouseSpawnMaxDelay - goldenMouseSpawnMinDelay)
}

function activateBerserker() {
  berserkerUntil = Date.now() + berserkerDuration
  berserkerRecoveryUntil = 0
  berserkerWasActive = true
  lastBerserkerSeconds = -1
  document.body.classList.add('is-berserker')
  document.body.classList.remove('is-berserker-recovery')
  calmMiceForBerserker()
  updateBerserkerStatus()
}

function calmMiceForBerserker() {
  var now = Date.now()

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].type !== 'mouse') continue
    foods[i].fleeEnergy = mouseFleeStamina
    foods[i].nextTurnAt = now
  }
}

function isBerserkerActive() {
  return Date.now() < berserkerUntil
}

function isBerserkerRecoveryActive() {
  return Date.now() < berserkerRecoveryUntil
}

function updateBerserkerStatus() {
  var now = Date.now()
  var remaining = Math.max(0, berserkerUntil - now)

  if (remaining <= 0) {
    document.body.classList.remove('is-berserker')

    if (berserkerWasActive) {
      berserkerRecoveryUntil = now + berserkerRecoveryDuration
      berserkerWasActive = false
      lastBerserkerSeconds = -1
    }

    var recoveryRemaining = Math.max(0, berserkerRecoveryUntil - now)
    if (recoveryRemaining > 0) {
      var recoverySeconds = Math.ceil(recoveryRemaining / 1000)
      document.body.classList.add('is-berserker-recovery')
      if (berserkerStatusElement) berserkerStatusElement.hidden = false
      if (berserkerStatusLabelElement) berserkerStatusLabelElement.textContent = 'Recovery'

      if (berserkerTimeElement && recoverySeconds !== lastBerserkerSeconds) {
        berserkerTimeElement.textContent = recoverySeconds
        lastBerserkerSeconds = recoverySeconds
      }
      return
    }

    document.body.classList.remove('is-berserker-recovery')
    if (berserkerStatusElement) berserkerStatusElement.hidden = true
    if (berserkerStatusLabelElement) berserkerStatusLabelElement.textContent = 'Berserker'
    lastBerserkerSeconds = -1
    return
  }

  var seconds = Math.ceil(remaining / 1000)
  document.body.classList.add('is-berserker')
  document.body.classList.remove('is-berserker-recovery')
  if (berserkerStatusElement) berserkerStatusElement.hidden = false
  if (berserkerStatusLabelElement) berserkerStatusLabelElement.textContent = 'Berserker'

  if (berserkerTimeElement && seconds !== lastBerserkerSeconds) {
    berserkerTimeElement.textContent = seconds
    lastBerserkerSeconds = seconds
  }
}

function drawBerserkerAura() {
  var recoveryActive = isBerserkerRecoveryActive()
  if (!isBerserkerActive() && !recoveryActive) return

  var pulse = 1 + Math.sin(Date.now() * 0.015) * 0.12

  ctx.save()
  ctx.strokeStyle = recoveryActive ? 'rgba(115, 226, 255, 0.78)' : 'rgba(255, 210, 55, 0.72)'
  ctx.fillStyle = recoveryActive ? 'rgba(80, 192, 255, 0.09)' : 'rgba(255, 155, 20, 0.1)'
  ctx.lineWidth = 3 * renderScale
  ctx.shadowColor = recoveryActive ? '#58cfff' : '#ffb515'
  ctx.shadowBlur = 18 * renderScale
  ctx.beginPath()
  ctx.arc(
    snakeHead.x,
    snakeHead.y,
    (recoveryActive ? 26 : 22) * renderScale * pulse,
    0,
    Math.PI * 2
  )
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function getActiveBeetleCount() {
  var beetleCount = 0

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad && !foods[i].isBurning) {
      beetleCount += 1
    }
  }

  return beetleCount
}

function burnPoisonBeetles() {
  var now = Date.now()
  var burnedBeetles = false

  for (var i = 0; i < foods.length; i++) {
    if (foods[i].isBad && !foods[i].isBurning) {
      foods[i].isBurning = true
      foods[i].burnUntil = now + beetleBurnDuration
      foods[i].dx = 0
      foods[i].dy = 0
      foods[i].pauseUntil = foods[i].burnUntil
      burnedBeetles = true
    }
  }

  if (burnedBeetles) {
    playSound('goodFoodSound')
  }
}

function drawFireball(powerup) {
  var flicker = Math.sin(Date.now() * 0.024 + powerup.x * 0.03) * 2

  ctx.save()
  ctx.translate(powerup.x, powerup.y)
  ctx.rotate(powerup.facingAngle)
  ctx.scale(renderScale, renderScale)

  ctx.fillStyle = 'rgba(255, 116, 35, 0.16)'
  ctx.beginPath()
  ctx.arc(0, 0, 22 + flicker, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#ff6f21'
  ctx.strokeStyle = '#ffe36c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.bezierCurveTo(5, -14 - flicker, -10, -12, -16, -2)
  ctx.bezierCurveTo(-8, 0, -12, 9 + flicker, 0, 15)
  ctx.bezierCurveTo(8, 10, 15, 7, 14, 0)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffe76a'
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.bezierCurveTo(2, -7, -5, -5, -8, 1)
  ctx.bezierCurveTo(-4, 6, 1, 8, 7, 3)
  ctx.fill()

  ctx.restore()
}
