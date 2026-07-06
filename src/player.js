// Player head movement, steering, boost energy, and boost UI state.

function moveSnakeHead() {
  var currentTurnRate = getPlayerTurnRate()
  applyKeyboardControls(currentTurnRate)

  if (gamepadSteerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, gamepadSteerAngleTarget, currentTurnRate)
  } else if (steerTarget) {
    var targetAngle = Math.atan2(steerTarget.y - snakeHead.y, steerTarget.x - snakeHead.x)
    headingAngle = turnTowardAngle(headingAngle, targetAngle, currentTurnRate)
  } else if (steerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, steerAngleTarget, currentTurnRate)
  }

  var currentSpeed = snakeSpeed * motionScale * getPlayerSpeedScale()
  if (isBerserkerActive()) currentSpeed *= berserkerSpeedMultiplier
  if (boosting) currentSpeed *= boostMultiplier

  snakeHead.x += Math.cos(headingAngle) * currentSpeed
  snakeHead.y += Math.sin(headingAngle) * currentSpeed

  if (snakeHead.x < 0) {
    snakeHead.x = 0
    headingAngle = Math.PI - headingAngle
  }

  if (snakeHead.x > canvas.width) {
    snakeHead.x = canvas.width
    headingAngle = Math.PI - headingAngle
  }

  if (snakeHead.y < 0) {
    snakeHead.y = 0
    headingAngle = -headingAngle
  }

  if (snakeHead.y > canvas.height) {
    snakeHead.y = canvas.height
    headingAngle = -headingAngle
  }

  applyRoundedSnakeBounds()
  recordSnakeHeadTrail()
  updateSnakeBodyFromTrail()
}

function applyKeyboardControls(currentTurnRate) {
  var turningLeft = pressedKeys.ArrowLeft || pressedKeys.a || pressedKeys.A
  var turningRight = pressedKeys.ArrowRight || pressedKeys.d || pressedKeys.D

  if (turningLeft && !turningRight) {
    headingAngle -= currentTurnRate
    steerTarget = undefined
    steerAngleTarget = undefined
  }

  if (turningRight && !turningLeft) {
    headingAngle += currentTurnRate
    steerTarget = undefined
    steerAngleTarget = undefined
  }
}

function getBoostDuration() {
  return getBoostDurationForSegmentCount(n)
}

function getBoostDurationForSegmentCount(segmentCount) {
  var extraSegments = Math.max(0, segmentCount - startingSegments)
  return Math.min(maxBoostDuration, baseBoostDuration + extraSegments * boostDurationPerSegment)
}

function updateBoostEnergy() {
  var now = Date.now()
  var elapsed = now - lastBoostUpdateAt
  var maxEnergy = getBoostDuration()
  var boostHeld = isBoostControlActive()

  lastBoostUpdateAt = now

  if (boostEnergy > maxEnergy) {
    boostEnergy = maxEnergy
  }

  if (boostHeld) {
    if (boostEnergy > 0) {
      boostEnergy = Math.max(0, boostEnergy - elapsed)
      setBoosting(true)
    } else {
      setBoosting(false)
    }
  } else {
    boostEnergy = Math.min(maxEnergy, boostEnergy + getBoostRechargeRate() * elapsed)
    setBoosting(false)
  }

  boostCoolingDown = !boosting && boostEnergy < maxEnergy
}

function getBoostRechargeRate() {
  return getBoostDuration() / boostCooldown
}

function isBoostControlActive() {
  return Boolean(
    pressedKeys.Shift ||
    pressedKeys[' '] ||
    pressedKeys.ArrowUp ||
    pressedKeys.w ||
    pressedKeys.W ||
    touchBoosting ||
    boostTouchActive ||
    mobileControls.boost ||
    gamepadBoosting
  )
}

function resetBoost() {
  boostCoolingDown = false
  boostEnergy = getBoostDuration()
  touchBoosting = false
  releaseMobileControls()
  lastBoostUpdateAt = Date.now()
  setBoosting(false)
  updateBoostMeterStatus(true)
}

function setBoosting(nextBoosting) {
  if (boosting === nextBoosting) return

  boosting = nextBoosting
  document.body.classList.toggle('is-boosting', boosting)
  updateBoostMeterStatus(true)
}

function updateBoostMeterStatus(forceUpdate) {
  var maxEnergy = getBoostDuration()
  var boostProgress = boostEnergy / maxEnergy
  var boostHeld = isBoostControlActive()
  var boostState = 'ready'

  updateBoostCapacityDisplay(maxEnergy)

  if (boosting) {
    boostState = 'active'
    updateBoostMeter(boostMeterFill, boostProgress, boostState, forceUpdate)
    updateBoostControlVisual(boostProgress, boostState, forceUpdate)
    return
  }

  if (boostHeld && boostEnergy <= 0) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, 0, boostState, forceUpdate)
    updateBoostControlVisual(0, boostState, forceUpdate)
    return
  }

  if (boostCoolingDown) {
    boostState = 'cooldown'
    updateBoostMeter(boostMeterFill, boostProgress, boostState, forceUpdate)
    updateBoostControlVisual(boostProgress, boostState, forceUpdate)
    return
  }

  updateBoostMeter(boostMeterFill, 1, boostState, forceUpdate)
  updateBoostControlVisual(1, boostState, forceUpdate)
}

function updateBoostCapacityDisplay(maxEnergy) {
  if (maxEnergy === lastBoostCapacityDisplay) return

  lastBoostCapacityDisplay = maxEnergy
  var durationLabel = (maxEnergy / 1000).toFixed(1) + 's'

  for (var i = 0; i < boostCapacityElements.length; i++) {
    boostCapacityElements[i].textContent = durationLabel
  }
}

function updateBoostMeter(meterFill, progress, state, forceUpdate) {
  if (!meterFill) return
  if (isMobileControlLayout()) return
  if (!forceUpdate && !shouldUpdateBoostVisual(progress, state)) return

  meterFill.style.width = Math.max(0, Math.min(1, progress)) * 100 + '%'
  meterFill.className = 'boost-meter-fill ' + state
}

function updateBoostControlVisual(progress, state, forceUpdate) {
  var clampedProgress = Math.max(0, Math.min(1, progress))
  var quantizedProgress = Math.round(clampedProgress * 20) / 20

  if (isMobileControlLayout()) {
    if (!forceUpdate && !shouldUpdateBoostVisual(clampedProgress, state)) return

    lastBoostVisualUpdateAt = Date.now()
    lastBoostVisualProgress = clampedProgress
    lastBoostVisualState = state

    var mobileGaugeScale = 0.18 + clampedProgress * 0.82
    var mobileGauge = boostBox ? boostBox.querySelector('.boost-control-gauge') : undefined
    if (mobileGauge) mobileGauge.style.setProperty('--boost-scale', mobileGaugeScale)

    if (boostBox) {
      boostBox.classList.toggle('is-active', state === 'active')
      boostBox.classList.toggle('is-cooling', state === 'cooldown')
    }

    return
  }

  if (!forceUpdate && !shouldUpdateBoostVisual(quantizedProgress, state)) return

  lastBoostVisualUpdateAt = Date.now()
  lastBoostVisualProgress = quantizedProgress
  lastBoostVisualState = state

  var gaugeScale = 0.18 + quantizedProgress * 0.82
  for (var i = 0; i < boostControlGauges.length; i++) {
    boostControlGauges[i].style.setProperty('--boost-scale', gaugeScale)
  }

  for (var j = 0; j < boostVisualStates.length; j++) {
    boostVisualStates[j].classList.toggle('is-active', state === 'active')
    boostVisualStates[j].classList.toggle('is-cooling', state === 'cooldown')
  }
}

function shouldUpdateBoostVisual(progress, state) {
  var now = Date.now()

  if (state !== lastBoostVisualState) return true
  if (Math.abs(progress - lastBoostVisualProgress) >= 0.01) return true
  return now - lastBoostVisualUpdateAt >= boostVisualUpdateInterval
}

function isMobileControlLayout() {
  if (!mobileControlMediaQuery) {
    mobileControlMediaQuery = window.matchMedia('(max-width: 820px), (max-width: 1024px) and (max-height: 540px) and (orientation: landscape)')
  }

  return mobileControlMediaQuery.matches
}

function turnTowardAngle(current, target, amount) {
  var difference = Math.atan2(Math.sin(target - current), Math.cos(target - current))
  var turnAmount = Math.max(-amount, Math.min(amount, difference))
  return current + turnAmount
}
