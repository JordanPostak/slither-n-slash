// Per-frame game orchestration and entity consumption rules.

function animate() {
  if (playing) {
    if (a === 0) {
      if (arenaResizePending) {
        arenaResizePending = false
        resizeCanvas()
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      updateGamepadControls()
      updateBerserkerStatus()
      updateBoostEnergy()
      updateBoostMeterStatus()
      foodRandom()
      updateFireball()
      updateGoldenMouse()
      moveSnakeHead()
      var snakeTrapLoops = getSnakeTrapLoops()
      updateTrappedFoods(snakeTrapLoops)
      updateBadSnakes(snakeTrapLoops)
      updateCentipedePoofs()
      applyEntityBounces()

      for (var i = 0; i < foods.length; i++) {
        var entitySwallowRadius = foods[i].swallowRadius || swallowRadius

        if (isSnakeTouchingEntity(foods[i], entitySwallowRadius)) {
          if (foods[i].isTrapped || foods[i].crushStartedAt) {
            drawFood(foods[i])
            continue
          }

          if (isPoisonBeetleSpawnProtected(foods[i])) {
            repelEntityFromSnake(foods[i], entitySwallowRadius + 12 * renderScale)
            drawFood(foods[i])
            continue
          }

          if (isBerserkerRecoveryActive()) {
            repelEntityFromSnake(foods[i], entitySwallowRadius + 12 * renderScale)
            drawFood(foods[i])
            continue
          }

          if (foods[i].isBurning) {
            drawFood(foods[i])
            continue
          }

          if (foods[i].isBad && !isBerserkerActive()) {
            var poisonDamage = Math.max(1, Math.round(n * poisonBeetleDamageFraction))
            removePlayerSegments(poisonDamage)
            playSound('badFoodSound')
          } else {
            var growthValue = foods[i].isBad ? 1 : foods[i].growthValue || 1

            n += growthValue
            score += growthValue
            updateScoreDisplay()
            addSnakeSegments(growthValue)
            playSound('goodFoodSound')
          }

          if (score > highScore) {
            setHighScore(score)
          }

          foods.splice(i, 1)
          i--
          continue
        }

        drawFood(foods[i])
      }

      if (fireball) {
        if (isSnakeTouchingEntity(fireball, 22 * renderScale)) {
          if (isBerserkerRecoveryActive()) {
            repelEntityFromSnake(fireball, 34 * renderScale)
            drawFireball(fireball)
          } else {
            burnPoisonBeetles()
            fireball = undefined
            scheduleNextFireball()
          }
        } else {
          drawFireball(fireball)
        }
      }


      if (goldenMouse) {
        var goldenMouseSwallowRadius = goldenMouse.swallowRadius || 24 * renderScale

        if (isSnakeTouchingEntity(goldenMouse, goldenMouseSwallowRadius)) {
          if (isBerserkerRecoveryActive()) {
            repelEntityFromSnake(goldenMouse, goldenMouseSwallowRadius + 12 * renderScale)
            drawGoldenMouse(goldenMouse)
          } else {
            var goldenMouseGrowth = goldenMouse.growthValue || mouseGrowthValue

            n += goldenMouseGrowth
            score += goldenMouseGrowth
            updateScoreDisplay()
            addSnakeSegments(goldenMouseGrowth)
            if (score > highScore) setHighScore(score)
            activateBerserker()
            goldenMouse = undefined
            scheduleNextGoldenMouse()
            playGameSound('eat')
          }
        } else {
          drawGoldenMouse(goldenMouse)
        }
      }

      drawBerserkerAura()
      drawSnake()
    }

    animationRequestId = requestAnimationFrame(animate)
  }
}
