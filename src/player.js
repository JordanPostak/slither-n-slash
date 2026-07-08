// Player head movement, steering, boost energy, and boost UI state.

function moveSnakeHead() {
  var currentTurnRate = getPlayerTurnRate()
  var aimingTurnRate = isCoilSlashCharging()
    ? currentTurnRate * coilSlashAimTurnMultiplier
    : currentTurnRate
  applyKeyboardControls(aimingTurnRate)

  if (gamepadSteerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, gamepadSteerAngleTarget, aimingTurnRate)
  } else if (steerTarget) {
    var targetAngle = Math.atan2(steerTarget.y - snakeHead.y, steerTarget.x - snakeHead.x)
    headingAngle = turnTowardAngle(headingAngle, targetAngle, aimingTurnRate)
  } else if (steerAngleTarget !== undefined) {
    headingAngle = turnTowardAngle(headingAngle, steerAngleTarget, aimingTurnRate)
  }

  if (isCoilSlashCharging()) {
    if (isCoilSlashEntryActive()) {
      moveSnakeHeadThroughCoilEntry()
      applyRoundedSnakeBounds()
      recordSnakeHeadTrail()
      updateSnakeBodyFromTrail()
      return
    }

    coilSlashEntryStrikeAngle = headingAngle
    updateSnakeBodyFromTrail()
    return
  }

  if (isCoilSlashStriking()) {
    moveSnakeHeadForCoilSlashStrike()
    applyRoundedSnakeBounds()
    recordSnakeHeadTrail()
    updateSnakeBodyFromTrail()
    return
  }

  var currentSpeed = snakeSpeed * motionScale * getPlayerSpeedScale()
  if (isBerserkerActive()) currentSpeed *= berserkerSpeedMultiplier
  if (boosting) currentSpeed *= boostMultiplier

  snakeHead.x += Math.cos(headingAngle) * currentSpeed
  snakeHead.y += Math.sin(headingAngle) * currentSpeed

  softenPlayerWallTurn(currentTurnRate)

  applyRoundedSnakeBounds()
  recordSnakeHeadTrail()
  updateSnakeBodyFromTrail()
}

function softenPlayerWallTurn(currentTurnRate) {
  var wallTurnRate = currentTurnRate * 2.4

  if (snakeHead.x < 0) {
    snakeHead.x = 0
    headingAngle = getSoftWallHeading(headingAngle, 1, 0, wallTurnRate)
  }

  if (snakeHead.x > canvas.width) {
    snakeHead.x = canvas.width
    headingAngle = getSoftWallHeading(headingAngle, -1, 0, wallTurnRate)
  }

  if (snakeHead.y < 0) {
    snakeHead.y = 0
    headingAngle = getSoftWallHeading(headingAngle, 0, 1, wallTurnRate)
  }

  if (snakeHead.y > canvas.height) {
    snakeHead.y = canvas.height
    headingAngle = getSoftWallHeading(headingAngle, 0, -1, wallTurnRate)
  }
}

function getSoftWallHeading(incomingHeading, normalX, normalY, maxTurn) {
  return getSoftCollisionHeading(incomingHeading, normalX, normalY, maxTurn)
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
  return getBoostDurationForSegmentCount(getPlayerProgressLength())
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
  var coilHeld = isCoilSlashControlActive()

  lastBoostUpdateAt = now

  if (boostEnergy > maxEnergy) {
    boostEnergy = maxEnergy
  }

  if (coilHeld && !isCoilSlashStriking()) {
    if (boostEnergy > 0 || isCoilSlashCharging()) {
      if (!isCoilSlashCharging()) {
        startCoilSlashEntry(now)
      }

      setBoosting(false)
      setCoilSlashCharging(true)
      coilSlashChargeProgress = getCoilSlashChargeProgress(now)
      boostEnergy = Math.max(0, maxEnergy * (1 - coilSlashChargeProgress))
    }
  } else {
    if (isCoilSlashCharging()) {
      releaseCoilSlash()
    }

    if (boostHeld && !isCoilSlashStriking() && boostEnergy > 0) {
      setBoosting(true)
      boostEnergy = Math.max(0, boostEnergy - elapsed)
    } else {
      setBoosting(false)
    }

    if (!boostHeld && !isCoilSlashStriking()) {
      boostEnergy = Math.min(maxEnergy, boostEnergy + getBoostRechargeRate() * elapsed)
    }
  }

  boostCoolingDown = !boosting && !isCoilSlashCharging() && boostEnergy < maxEnergy
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
    (boostTouchActive && !mobileCoilSlashActive) ||
    mobileControls.boost ||
    gamepadBoosting
  )
}

function isCoilSlashControlActive() {
  return Boolean(
    pressedKeys.ArrowDown ||
    pressedKeys.s ||
    pressedKeys.S ||
    mobileCoilSlashActive
  )
}

function resetBoost() {
  boostCoolingDown = false
  boostEnergy = getBoostDuration()
  coilSlashChargeProgress = 0
  coilSlashHoldStartedAt = 0
  coilSlashEntryStartedAt = 0
  coilSlashEntryStartAngle = 0
  coilSlashEntryStrikeAngle = 0
  coilSlashEntryDirection = 1
  coilSlashNextEntryDirection = 1
  coilSlashEntryTurned = 0
  coilSlashEntrySettleProgress = 0
  coilSlashPivotX = 0
  coilSlashPivotY = 0
  coilSlashStrikeDistanceRemaining = 0
  coilSlashStrikeDistanceTotal = 0
  coilSlashStrikeCharge = 0
  mobileCoilSlashActive = false
  touchBoosting = false
  releaseMobileControls()
  lastBoostUpdateAt = Date.now()
  setBoosting(false)
  setCoilSlashCharging(false)
  updateBoostMeterStatus(true)
}

function setBoosting(nextBoosting) {
  if (boosting === nextBoosting) return

  boosting = nextBoosting
  document.body.classList.toggle('is-boosting', boosting)
  updateBoostMeterStatus(true)
}

function setCoilSlashCharging(nextCharging) {
  if (coilSlashCharging === nextCharging) return

  coilSlashCharging = nextCharging
  document.body.classList.toggle('is-coil-slashing', coilSlashCharging)
  updateBoostMeterStatus(true)
}

function isCoilSlashCharging() {
  return coilSlashCharging
}

function isCoilSlashStriking() {
  return coilSlashStrikeDistanceRemaining > 0
}

function startCoilSlashEntry(now) {
  coilSlashEntryStartedAt = now
  coilSlashHoldStartedAt = now
  coilSlashEntryStartAngle = headingAngle
  coilSlashEntryStrikeAngle = headingAngle
  var turningLeft = pressedKeys.ArrowLeft || pressedKeys.a || pressedKeys.A
  var turningRight = pressedKeys.ArrowRight || pressedKeys.d || pressedKeys.D

  if (turningLeft && !turningRight) {
    coilSlashEntryDirection = -1
  } else if (turningRight && !turningLeft) {
    coilSlashEntryDirection = 1
  } else {
    coilSlashEntryDirection = coilSlashNextEntryDirection
  }

  coilSlashNextEntryDirection = -coilSlashEntryDirection
  coilSlashEntryTurned = coilSlashEntryTargetTurn
  coilSlashEntrySettleProgress = 1
  coilSlashPivotX = snakeHead.x
  coilSlashPivotY = snakeHead.y
}

function isCoilSlashEntryActive() {
  if (!coilSlashEntryStartedAt) return false
  return coilSlashEntryTurned < coilSlashEntryTargetTurn || coilSlashEntrySettleProgress < 1
}

function getCoilSlashEntryProgress(now) {
  if (!coilSlashEntryStartedAt) return 1
  return Math.max(0, Math.min(1, coilSlashEntryTurned / coilSlashEntryTargetTurn))
}

function moveSnakeHeadThroughCoilEntry() {
  var loopRadius = getCoilSlashLoopRadius()
  var forwardX = Math.cos(coilSlashEntryStrikeAngle)
  var forwardY = Math.sin(coilSlashEntryStrikeAngle)
  var sideX = -forwardY
  var sideY = forwardX

  if (coilSlashEntryTurned < coilSlashEntryTargetTurn) {
    var turnStep = Math.min(
      getPlayerTurnRate() * coilSlashEntrySpeedMultiplier,
      coilSlashEntryTargetTurn - coilSlashEntryTurned
    )
    coilSlashEntryTurned += turnStep

    var orbitAngle = Math.PI + coilSlashEntryTurned * coilSlashEntryDirection
    var tangentX = coilSlashEntryDirection * (
      -forwardX * Math.sin(orbitAngle) +
      sideX * Math.cos(orbitAngle)
    )
    var tangentY = coilSlashEntryDirection * (
      -forwardY * Math.sin(orbitAngle) +
      sideY * Math.cos(orbitAngle)
    )

    snakeHead.x = coilSlashPivotX + forwardX * Math.cos(orbitAngle) * loopRadius + sideX * Math.sin(orbitAngle) * loopRadius
    snakeHead.y = coilSlashPivotY + forwardY * Math.cos(orbitAngle) * loopRadius + sideY * Math.sin(orbitAngle) * loopRadius
    headingAngle = Math.atan2(tangentY, tangentX)
    return
  }

  moveSnakeHeadThroughCoilSettle(loopRadius, forwardX, forwardY, sideX, sideY)
}

function moveSnakeHeadThroughCoilSettle(loopRadius, forwardX, forwardY, sideX, sideY) {
  var settleSpeed = snakeSpeed * motionScale * getPlayerSpeedScale() * coilSlashEntrySpeedMultiplier
  if (isBerserkerActive()) settleSpeed *= berserkerSpeedMultiplier

  var settlePathDistance = loopRadius * 2.35
  coilSlashEntrySettleProgress = Math.min(
    1,
    coilSlashEntrySettleProgress + settleSpeed / Math.max(1, settlePathDistance)
  )

  var t = coilSlashEntrySettleProgress
  var sBend = Math.sin(t * Math.PI * 2) * loopRadius * 0.24 * coilSlashEntryDirection
  var along = -loopRadius + loopRadius * 2 * t
  var tangentSide = Math.cos(t * Math.PI * 2) * Math.PI * 2 * loopRadius * 0.24 * coilSlashEntryDirection
  var tangentForward = loopRadius * 2

  snakeHead.x = coilSlashPivotX + forwardX * along + sideX * sBend
  snakeHead.y = coilSlashPivotY + forwardY * along + sideY * sBend
  headingAngle = Math.atan2(
    forwardY * tangentForward + sideY * tangentSide,
    forwardX * tangentForward + sideX * tangentSide
  )

  if (coilSlashEntrySettleProgress >= 1) {
    headingAngle = coilSlashEntryStrikeAngle
    anchorCoilSlashHeadToPivot()
  }
}

function getCoilSlashHeadAnchorDistance() {
  return Math.max(
    playerSegmentSpacing * 0.82,
    15 * renderScale * getPlayerSizeScale()
  )
}

function getCoilSlashLoopRadius() {
  var turnStep = Math.max(0.001, getPlayerTurnRate() * coilSlashEntrySpeedMultiplier)
  var entrySpeed = snakeSpeed * motionScale * getPlayerSpeedScale() * coilSlashEntrySpeedMultiplier
  if (isBerserkerActive()) entrySpeed *= berserkerSpeedMultiplier
  return entrySpeed / turnStep
}

function getCoilSlashRangeScale() {
  return renderScale * getPlayerSizeScale()
}

function getCoilSlashLengthProgress() {
  var visibleLength = Math.min(playerMaxVisibleSegments, getPlayerProgressLength())
  var lengthRange = Math.max(1, playerMaxVisibleSegments - startingSegments)
  return Math.max(0, Math.min(1, (visibleLength - startingSegments) / lengthRange))
}

function getCoilSlashMaxDistance() {
  var lengthProgress = getCoilSlashLengthProgress()
  return coilSlashStartingMaxDistance +
    (coilSlashMaxDistance - coilSlashStartingMaxDistance) * lengthProgress
}

function setCoilSlashPivotFromHead() {
  var loopRadius = getCoilSlashLoopRadius()

  coilSlashPivotX = snakeHead.x + Math.cos(headingAngle) * loopRadius
  coilSlashPivotY = snakeHead.y + Math.sin(headingAngle) * loopRadius
}

function anchorCoilSlashHeadToPivot() {
  if (!coilSlashPivotX && !coilSlashPivotY) {
    setCoilSlashPivotFromHead()
  }

  var loopRadius = getCoilSlashLoopRadius()

  snakeHead.x = coilSlashPivotX + Math.cos(headingAngle) * loopRadius
  snakeHead.y = coilSlashPivotY + Math.sin(headingAngle) * loopRadius
}

function getCoilSlashChargeProgress(now) {
  if (!coilSlashHoldStartedAt) return 0

  var feedDistance = getCoilSlashFeedDistance(now)
  var bodyLength = Math.max(
    playerSegmentSpacing,
    n * playerSegmentSpacing + getSnakeTailFollowDistance()
  )

  return Math.max(0, Math.min(1, feedDistance / bodyLength))
}

function getCoilSlashFeedDistance(now) {
  if (!coilSlashHoldStartedAt) return 0

  var elapsedSeconds = Math.max(0, (now - coilSlashHoldStartedAt) / 1000)
  var normalSpeed = snakeSpeed * motionScale * getPlayerSpeedScale()
  if (isBerserkerActive()) normalSpeed *= berserkerSpeedMultiplier

  var entryFeedDistance = coilSlashEntryStartedAt
    ? 0
    : 0
  var holdFeedDistance = elapsedSeconds * normalSpeed * coilSlashFeedSpeedMultiplier

  return Math.max(entryFeedDistance, holdFeedDistance)
}

function releaseCoilSlash() {
  coilSlashChargeProgress = getCoilSlashChargeProgress(Date.now())
  var releasedCharge = coilSlashEntryStartedAt
    ? Math.max(coilSlashChargeProgress, coilSlashMinChargeToStrike)
    : coilSlashChargeProgress

  setCoilSlashCharging(false)
  coilSlashChargeProgress = 0
  coilSlashHoldStartedAt = 0
  coilSlashEntryStartedAt = 0
  coilSlashEntryTurned = 0
  coilSlashEntrySettleProgress = 0

  if (releasedCharge < coilSlashMinChargeToStrike) return

  coilSlashStrikeCharge = releasedCharge
  var maxStrikeDistance = getCoilSlashMaxDistance()
  coilSlashStrikeDistanceTotal = (
    coilSlashMinDistance +
    (maxStrikeDistance - coilSlashMinDistance) * releasedCharge
  ) * getCoilSlashRangeScale()
  coilSlashStrikeDistanceRemaining = coilSlashStrikeDistanceTotal
}

function moveSnakeHeadForCoilSlashStrike() {
  var strikeSpeed = coilSlashStrikeSpeed * motionScale * getCoilSlashRangeScale()
  if (isBerserkerActive()) strikeSpeed *= berserkerSpeedMultiplier

  var travel = Math.min(coilSlashStrikeDistanceRemaining, strikeSpeed)
  snakeHead.x += Math.cos(headingAngle) * travel
  snakeHead.y += Math.sin(headingAngle) * travel
  coilSlashStrikeDistanceRemaining -= travel

  if (coilSlashStrikeDistanceRemaining <= 0) {
    coilSlashStrikeDistanceRemaining = 0
    coilSlashStrikeDistanceTotal = 0
    coilSlashStrikeCharge = 0
  }
}

function updateBoostMeterStatus(forceUpdate) {
  var maxEnergy = getBoostDuration()
  var boostProgress = boostEnergy / maxEnergy
  var boostHeld = isBoostControlActive()
  var coilHeld = isCoilSlashControlActive()
  var boostState = 'ready'

  updateBoostCapacityDisplay(maxEnergy)

  if (isCoilSlashCharging()) {
    boostState = 'active'
    updateBoostMeter(boostMeterFill, coilSlashChargeProgress, boostState, forceUpdate)
    updateBoostControlVisual(coilSlashChargeProgress, boostState, forceUpdate)
    return
  }

  if (boosting) {
    boostState = 'active'
    updateBoostMeter(boostMeterFill, boostProgress, boostState, forceUpdate)
    updateBoostControlVisual(boostProgress, boostState, forceUpdate)
    return
  }

  if ((boostHeld || coilHeld) && boostEnergy <= 0) {
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
