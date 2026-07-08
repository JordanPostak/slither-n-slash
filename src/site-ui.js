// Landing-page navigation, play mode, settings, and adjustable mobile controls.

var snakeSkinPreviewAnimationId = 0
var snakePickerTongueNextFlickAt = 0
var snakePickerTongueFlickStartedAt = 0
var snakePickerTongueDoubleFlick = false

function handlePrimaryGameToggle() {
  if (!document.body.classList.contains('is-game-mode')) {
    enterGameMode(false)
  }

  requestGamePlayback()
}

function requestGamePlayback() {
  if (!playing && !controlsReady) {
    showSnakeSelection()
    return
  }

  toggleGamePlayback()
}

function enterGameMode(shouldStart) {
  var gameContainer = document.getElementById('game-container')

  document.documentElement.classList.add('is-game-mode')
  document.body.classList.add('is-game-mode')
  gameContainer.classList.add('is-play-mode')
  gameModePauseButton.innerText = playing ? 'Pause' : (controlsReady ? 'Resume' : 'Start')
  updateActiveSectionNavigation('play')

  window.requestAnimationFrame(function () {
    refreshMobileControlPositions()
    resizeCanvas()
    window.requestAnimationFrame(resizeCanvas)
  })

  if (shouldStart && !playing) {
    requestGamePlayback()
  }
}

function exitGameMode() {
  var gameContainer = document.getElementById('game-container')

  if (playing) {
    toggleGamePlayback()
  }

  hideSnakeSelection()

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function () {})
  }

  document.documentElement.classList.remove('is-game-mode')
  document.body.classList.remove('is-game-mode')
  gameContainer.classList.remove('is-play-mode')

  window.requestAnimationFrame(function () {
    var playSection = document.getElementById('play')
    var headerOffset = 90
    window.scrollTo(0, Math.max(0, playSection.offsetTop - headerOffset))
  })
}

function toggleGamePlayback() {
  if (!playing) {
    prepareGameAudio()
    playing = true
    playSnakeGameBtn.innerText = 'Pause'
    settingsPauseButton.innerText = 'Pause Game'
    gameModePauseButton.innerText = 'Pause'
    document.body.classList.add('is-playing')
    snakeGamePanel.insertBefore(playSnakeGameBtn, snakeGamePanel.children[1])
    init()
  } else {
    playing = false
    playSnakeGameBtn.innerText = 'Resume Game'
    settingsPauseButton.innerText = 'Resume Game'
    gameModePauseButton.innerText = 'Resume'
    document.body.classList.remove('is-playing')
    cancelAnimationFrame(animationRequestId)
    stopFoodTimer()
    stopBadSnakeTimer()
    resetBoost()
  }
}

function setupSiteControls() {
  var navToggle = document.querySelector('.nav-toggle')
  var siteNavigation = document.getElementById('site-navigation')
  var settingsButton = document.getElementById('settings-button')
  var settingsMenu = document.getElementById('game-settings')
  var fullscreenButton = document.getElementById('fullscreen-button')
  var fullscreenExitButton = document.getElementById('fullscreen-exit-button')
  var gameContainer = document.getElementById('game-container')
  var soundSetting = document.getElementById('sound-setting')
  var motionSetting = document.getElementById('motion-setting')
  var copyrightYear = document.getElementById('copyright-year')

  copyrightYear.textContent = new Date().getFullYear()
  setupSectionNavigation()
  setupAdjustableMobileControls()
  setupSnakeSkinSelection()

  navToggle.addEventListener('click', function () {
    var isOpen = siteNavigation.classList.toggle('is-open')
    navToggle.setAttribute('aria-expanded', String(isOpen))
  })

  siteNavigation.addEventListener('click', function (event) {
    if (!event.target.closest('a')) return
    siteNavigation.classList.remove('is-open')
    navToggle.setAttribute('aria-expanded', 'false')
  })

  document.addEventListener('click', function (event) {
    var playLink = event.target.closest('a[href="#play"]')
    if (!playLink) return

    event.preventDefault()
    siteNavigation.classList.remove('is-open')
    navToggle.setAttribute('aria-expanded', 'false')
    enterGameMode(true)
  })

  settingsButton.addEventListener('click', function () {
    var willOpen = settingsMenu.hidden
    settingsMenu.hidden = !willOpen
    settingsButton.setAttribute('aria-expanded', String(willOpen))
  })

  soundSetting.addEventListener('change', function () {
    soundEnabled = soundSetting.checked

    if (!soundEnabled && gameAudioContext) {
      gameAudioContext.suspend().catch(function () {})
    }
  })

  motionSetting.addEventListener('change', function () {
    document.body.classList.toggle('reduce-effects', motionSetting.checked)
  })

  fullscreenButton.addEventListener('click', function () {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {})
      return
    }

    enterGameMode(false)
    gameContainer.requestFullscreen().catch(function () {})
  })

  fullscreenExitButton.addEventListener('click', function () {
    exitGameMode()
  })

  document.addEventListener('fullscreenchange', function () {
    fullscreenButton.innerText = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen'
    window.setTimeout(resizeCanvas, 60)
  })

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !document.body.classList.contains('is-game-mode')) return
    if (document.fullscreenElement) return

    exitGameMode()
  })
}

function setupSnakeSkinSelection() {
  var selectionScreen = document.getElementById('snake-select-screen')
  var skinOptions = Array.from(document.querySelectorAll('[data-snake-skin]'))
  var startButton = document.getElementById('snake-select-start')
  var cancelButton = document.getElementById('snake-select-cancel')
  var carouselButtons = Array.from(document.querySelectorAll('[data-snake-carousel]'))

  if (!selectionScreen || !startButton || !cancelButton) return

  function getSelectedSkinIndex() {
    for (var optionIndex = 0; optionIndex < skinOptions.length; optionIndex++) {
      if (Number(skinOptions[optionIndex].dataset.snakeSkin) === selectedSnakeSkin) return optionIndex
    }

    return 0
  }

  function centerSelectedSkin() {
    var selectedOption = skinOptions[getSelectedSkinIndex()]
    if (!selectedOption) return
    selectedOption.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    window.requestAnimationFrame(updateSnakeSkinPreviewSpines)
  }

  function selectSkin(skinNumber, shouldCenter) {
    selectedSnakeSkin = Number(skinNumber) || 1

    for (var optionIndex = 0; optionIndex < skinOptions.length; optionIndex++) {
      var option = skinOptions[optionIndex]
      var isSelected = Number(option.dataset.snakeSkin) === selectedSnakeSkin
      option.classList.toggle('is-selected', isSelected)
      option.setAttribute('aria-checked', String(isSelected))
    }

    if (shouldCenter) centerSelectedSkin()
  }

  for (var optionIndex = 0; optionIndex < skinOptions.length; optionIndex++) {
    skinOptions[optionIndex].addEventListener('click', function (event) {
      selectSkin(event.currentTarget.dataset.snakeSkin, true)
    })
  }

  for (var carouselButtonIndex = 0; carouselButtonIndex < carouselButtons.length; carouselButtonIndex++) {
    carouselButtons[carouselButtonIndex].addEventListener('click', function (event) {
      var direction = event.currentTarget.dataset.snakeCarousel === 'previous' ? -1 : 1
      var nextIndex = (getSelectedSkinIndex() + direction + skinOptions.length) % skinOptions.length
      selectSkin(skinOptions[nextIndex].dataset.snakeSkin, true)
      skinOptions[nextIndex].focus({ preventScroll: true })
    })
  }

  selectionScreen.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    var direction = event.key === 'ArrowLeft' ? -1 : 1
    var nextIndex = (getSelectedSkinIndex() + direction + skinOptions.length) % skinOptions.length
    selectSkin(skinOptions[nextIndex].dataset.snakeSkin, true)
    skinOptions[nextIndex].focus({ preventScroll: true })
  })

  startButton.addEventListener('click', function () {
    startButton.disabled = true
    startButton.textContent = 'Loading...'

    loadPlayerSnakeSkin(selectedSnakeSkin).then(function () {
      var shouldStartGame = document.body.classList.contains('is-snake-selecting')
      hideSnakeSelection()
      startButton.disabled = false
      startButton.textContent = 'Start Run'
      if (shouldStartGame) toggleGamePlayback()
    })
  })

  cancelButton.addEventListener('click', function () {
    exitGameMode()
  })

  selectSkin(selectedSnakeSkin)
  window.requestAnimationFrame(updateSnakeSkinPreviewSpines)
}

function startSnakeSkinPreviewAnimation() {
  if (snakeSkinPreviewAnimationId) return

  function animateSnakeSkinPreviews(timestamp) {
    updateSnakeSkinPreviewSpines(timestamp)

    var selectionScreen = document.getElementById('snake-select-screen')
    if (!selectionScreen || selectionScreen.hidden) {
      snakeSkinPreviewAnimationId = 0
      return
    }

    snakeSkinPreviewAnimationId = window.requestAnimationFrame(animateSnakeSkinPreviews)
  }

  snakeSkinPreviewAnimationId = window.requestAnimationFrame(animateSnakeSkinPreviews)
}

function stopSnakeSkinPreviewAnimation() {
  if (!snakeSkinPreviewAnimationId) return
  window.cancelAnimationFrame(snakeSkinPreviewAnimationId)
  snakeSkinPreviewAnimationId = 0
}

function updateSnakeSkinPreviewSpines(timestamp) {
  var previews = document.querySelectorAll('.snake-skin-preview')
  var animationTime = Number(timestamp) || window.performance.now()
  var shouldReduceMotion = document.body.classList.contains('reduce-effects')

  for (var previewIndex = 0; previewIndex < previews.length; previewIndex++) {
    var preview = previews[previewIndex]
    var option = preview.closest('.snake-skin-option')
    var pieces = Array.from(preview.querySelectorAll('img'))
    var pickerTongue = getSnakePickerTongue(preview)
    if (!option || pieces.length === 0 || preview.clientWidth <= 0 || preview.clientHeight <= 0) continue

    var isSelected = option.classList.contains('is-selected')
    var shouldAnimate = isSelected && !shouldReduceMotion
    var skinNumber = Number(option.dataset.snakeSkin) || 1
    var isCompactPreview = preview.clientWidth < 360
    var compactStepScale = isCompactPreview ? 0.88 : 1
    var bodyStepScale = (skinNumber === 4 ? 0.8 : 0.86) * compactStepScale
    var headStepScale = (skinNumber === 4 ? 0.82 : 0.88) * compactStepScale
    var tailStepScale = (skinNumber === 4 ? 0.68 : 0.74) * compactStepScale
    var pieceSteps = []
    var totalLength = 0

    for (var pieceIndex = 0; pieceIndex < pieces.length; pieceIndex++) {
      var pieceWidth = pieces[pieceIndex].offsetWidth || 48
      var isHead = pieceIndex === 0
      var isTail = pieceIndex === pieces.length - 1
      var step = pieceWidth * (isHead ? headStepScale : (isTail ? tailStepScale : bodyStepScale))
      pieceSteps.push(step)
      if (!isTail) totalLength += step
    }

    var headPiece = pieces[0]
    var headWidth = headPiece ? (headPiece.offsetWidth || 60) : 0
    var headForwardOverhang = headWidth * 0.72
    var tongueClearance = 18
    var tailClearance = 16
    var tailPiece = pieces[pieces.length - 1]
    var tailWidth = tailPiece ? (tailPiece.offsetWidth || 64) : 0
    var visualLength = tongueClearance + headForwardOverhang + totalLength + tailWidth + tailClearance
    var startX = Math.max(
      8 + tongueClearance + headForwardOverhang,
      (preview.clientWidth - visualLength) / 2 + tongueClearance + headForwardOverhang
    )
    var jointX = startX
    var jointY = preview.clientHeight * 0.08
    var waveSpeed = animationTime * 0.0058
    var selectedLift = shouldAnimate ? Math.sin(waveSpeed) * 2 : 0

    for (var segmentIndex = 0; segmentIndex < pieces.length; segmentIndex++) {
      var piece = pieces[segmentIndex]
      var pieceHeight = piece.offsetHeight || 28
      var pieceWidth = piece.offsetWidth || 48
      var isHeadPiece = segmentIndex === 0
      var isLastPiece = segmentIndex === pieces.length - 1
      var angle = shouldAnimate
        ? Math.sin(waveSpeed - segmentIndex * 0.72) * (isHeadPiece ? 0.035 : 0.18)
        : 0
      var frontX = isHeadPiece ? jointX - pieceWidth * 0.72 : jointX
      var frontY = jointY + selectedLift

      piece.style.transform = 'translate(' + frontX.toFixed(2) + 'px, ' +
        (frontY - pieceHeight / 2).toFixed(2) + 'px) rotate(' + angle.toFixed(4) + 'rad)'

      if (isHeadPiece) {
        updateSnakePickerTongue(pickerTongue, preview, frontX, angle, shouldAnimate, animationTime)
      }

      if (!isLastPiece) {
        if (isHeadPiece) {
          jointX = frontX + Math.cos(angle) * pieceWidth * 0.88
          jointY = frontY + Math.sin(angle) * pieceWidth * 0.16
        } else {
          jointX = jointX + Math.cos(angle) * pieceSteps[segmentIndex]
          jointY = jointY + Math.sin(angle) * pieceSteps[segmentIndex]
        }
      }
    }
  }
}

function getSnakePickerTongue(preview) {
  var tongue = preview.querySelector('.snake-picker-tongue')
  if (tongue) return tongue

  tongue = document.createElement('span')
  tongue.className = 'snake-picker-tongue'
  tongue.setAttribute('aria-hidden', 'true')
  tongue.innerHTML = '<i class="tongue-main"></i><i class="tongue-fork-one"></i><i class="tongue-fork-two"></i>'
  preview.appendChild(tongue)
  return tongue
}

function updateSnakePickerTongue(tongue, preview, headX, headAngle, shouldAnimate, animationTime) {
  if (!tongue) return

  var flickProgress = 0

  if (shouldAnimate) {
    if (!snakePickerTongueNextFlickAt) {
      snakePickerTongueNextFlickAt = animationTime + 300 + Math.random() * 900
    }

    if (!snakePickerTongueFlickStartedAt && animationTime >= snakePickerTongueNextFlickAt) {
      snakePickerTongueFlickStartedAt = animationTime
      snakePickerTongueDoubleFlick = Math.random() < 0.34
    }

    if (snakePickerTongueFlickStartedAt) {
      var flickAge = animationTime - snakePickerTongueFlickStartedAt
      var flickDuration = snakePickerTongueDoubleFlick ? 620 : 330
      var flickPhase = snakePickerTongueDoubleFlick && flickAge > 300 ? flickAge - 300 : flickAge

      if (flickAge <= flickDuration && flickPhase <= 300) {
        flickProgress = Math.sin(flickPhase / 300 * Math.PI)
      } else if (flickAge > flickDuration) {
        snakePickerTongueFlickStartedAt = 0
        snakePickerTongueNextFlickAt = animationTime + 450 + Math.random() * 1500
      }
    }
  }

  var tongueWidth = 24
  var noseX = headX
  var noseY = preview.clientHeight / 2 + 8
  var scaleX = 0.45 + flickProgress * 0.75

  tongue.style.left = (noseX - tongueWidth + 6).toFixed(2) + 'px'
  tongue.style.top = (noseY - 7).toFixed(2) + 'px'
  tongue.style.opacity = flickProgress > 0.02 ? String(Math.min(1, flickProgress * 1.35)) : '0'
  tongue.style.transform = 'rotate(' + headAngle.toFixed(4) + 'rad) scaleX(' + scaleX.toFixed(3) + ')'
}

function showSnakeSelection() {
  var selectionScreen = document.getElementById('snake-select-screen')
  if (!selectionScreen) return

  var skinOptions = document.querySelectorAll('[data-snake-skin]')
  for (var optionIndex = 0; optionIndex < skinOptions.length; optionIndex++) {
    var isSelected = Number(skinOptions[optionIndex].dataset.snakeSkin) === selectedSnakeSkin
    skinOptions[optionIndex].classList.toggle('is-selected', isSelected)
    skinOptions[optionIndex].setAttribute('aria-checked', String(isSelected))
  }

  selectionScreen.hidden = false
  document.body.classList.add('is-snake-selecting')
  var selectedOption = selectionScreen.querySelector('.snake-skin-option.is-selected')
  if (selectedOption) {
    selectedOption.focus()
    selectedOption.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
  }

  startSnakeSkinPreviewAnimation()
}

function hideSnakeSelection() {
  var selectionScreen = document.getElementById('snake-select-screen')
  if (selectionScreen) selectionScreen.hidden = true
  document.body.classList.remove('is-snake-selecting')
  stopSnakeSkinPreviewAnimation()
}

function setupSectionNavigation() {
  var updateScheduled = false

  function scheduleNavigationUpdate() {
    if (updateScheduled || document.body.classList.contains('is-game-mode')) return

    updateScheduled = true
    window.requestAnimationFrame(function () {
      updateScheduled = false
      updateActiveSectionNavigation()
    })
  }

  window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true })
  window.addEventListener('resize', scheduleNavigationUpdate)
  updateActiveSectionNavigation()
}

function updateActiveSectionNavigation(forcedSectionId) {
  var navigationLinks = Array.from(document.querySelectorAll(
    '.site-nav a[href^="#"], .site-footer nav a[href^="#"]'
  ))
  var currentSectionLabel = document.getElementById('current-section-label')
  var sectionIds = []

  for (var i = 0; i < navigationLinks.length; i++) {
    var sectionId = navigationLinks[i].getAttribute('href').slice(1)
    if (sectionId && sectionIds.indexOf(sectionId) === -1 && document.getElementById(sectionId)) {
      sectionIds.push(sectionId)
    }
  }

  sectionIds.sort(function (firstId, secondId) {
    return document.getElementById(firstId).offsetTop - document.getElementById(secondId).offsetTop
  })

  var activeSectionId = forcedSectionId || sectionIds[0]

  if (!forcedSectionId) {
    var readingLine = window.scrollY + Math.min(window.innerHeight * 0.38, 300)

    for (var sectionIndex = 0; sectionIndex < sectionIds.length; sectionIndex++) {
      if (document.getElementById(sectionIds[sectionIndex]).offsetTop <= readingLine) {
        activeSectionId = sectionIds[sectionIndex]
      }
    }

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      activeSectionId = sectionIds[sectionIds.length - 1]
    }
  }

  for (var linkIndex = 0; linkIndex < navigationLinks.length; linkIndex++) {
    var isCurrent = navigationLinks[linkIndex].getAttribute('href') === '#' + activeSectionId
    navigationLinks[linkIndex].classList.toggle('is-current', isCurrent)

    if (isCurrent) {
      navigationLinks[linkIndex].setAttribute('aria-current', 'location')
      if (currentSectionLabel) currentSectionLabel.textContent = navigationLinks[linkIndex].textContent.trim()
    } else {
      navigationLinks[linkIndex].removeAttribute('aria-current')
    }
  }
}

function setupAdjustableMobileControls() {
  var controlBoxes = document.querySelectorAll('[data-mobile-control]')

  for (var i = 0; i < controlBoxes.length; i++) {
    restoreMobileControlPosition(controlBoxes[i])
    controlBoxes[i].addEventListener('pointerdown', beginMobileControlAdjustment, true)
  }

  document.addEventListener('pointermove', moveMobileControlAdjustment, true)
  document.addEventListener('pointerup', endMobileControlAdjustment, true)
  document.addEventListener('pointercancel', endMobileControlAdjustment, true)

  window.addEventListener('resize', function () {
    for (var boxIndex = 0; boxIndex < controlBoxes.length; boxIndex++) {
      applyMobileControlOffset(
        controlBoxes[boxIndex],
        getStoredMobileControlOffset(controlBoxes[boxIndex])
      )
    }
  })
}

function beginMobileControlAdjustment(event) {
  if (playing || !isAdjustableMobileControlLayout()) return

  event.preventDefault()
  event.stopImmediatePropagation()

  var controlBox = event.currentTarget
  var controlType = controlBox.dataset.mobileControl
  var startingOffset = getCurrentMobileControlOffset(controlBox)

  adjustableControlDrag = {
    box: controlBox,
    pointerId: event.pointerId,
    startY: event.clientY,
    startOffset: startingOffset,
    controlType: controlType,
  }

  controlBox.classList.add('is-repositioning')
  capturePointer(controlBox, event.pointerId)
}

function moveMobileControlAdjustment(event) {
  if (!adjustableControlDrag || event.pointerId !== adjustableControlDrag.pointerId) return

  event.preventDefault()
  event.stopImmediatePropagation()

  var nextOffset = adjustableControlDrag.startOffset + event.clientY - adjustableControlDrag.startY
  applyMobileControlOffset(adjustableControlDrag.box, nextOffset)
}

function endMobileControlAdjustment(event) {
  if (!adjustableControlDrag || event.pointerId !== adjustableControlDrag.pointerId) return

  event.preventDefault()
  event.stopImmediatePropagation()

  var controlBox = adjustableControlDrag.box
  var finalOffset = getCurrentMobileControlOffset(controlBox)
  controlBox.classList.remove('is-repositioning')

  try {
    localStorage.setItem(getMobileControlStorageKey(controlBox), String(Math.round(finalOffset)))
  } catch {}

  adjustableControlDrag = undefined
}

function applyMobileControlOffset(controlBox, requestedOffset) {
  if (!isAdjustableMobileControlLayout()) {
    controlBox.style.setProperty('--control-y-offset', requestedOffset + 'px')
    controlBox.dataset.controlYOffset = String(requestedOffset)
    return
  }

  var currentOffset = getCurrentMobileControlOffset(controlBox)
  var rect = controlBox.getBoundingClientRect()
  var baseTop = rect.top - currentOffset
  var baseBottom = rect.bottom - currentOffset
  var safeTop = getMobileControlSafeTop(controlBox)
  var safeBottom = 6
  var minimumOffset = safeTop - baseTop
  var maximumOffset = window.innerHeight - safeBottom - baseBottom
  var nextOffset = Math.max(minimumOffset, Math.min(maximumOffset, requestedOffset || 0))

  controlBox.style.setProperty('--control-y-offset', nextOffset + 'px')
  controlBox.dataset.controlYOffset = String(nextOffset)
}

function getMobileControlSafeTop(controlBox) {
  var safeTop = 54

  if (controlBox.dataset.mobileControl === 'boost') {
    var toolbar = document.querySelector('.game-mode-toolbar')
    var toolbarRect = toolbar ? toolbar.getBoundingClientRect() : undefined
    if (toolbarRect && toolbarRect.height) {
      safeTop = Math.max(safeTop, toolbarRect.bottom + 44)
    }

  } else {
    var highScoreField = document.querySelector('.high-score-feild')
    var highScoreRect = highScoreField ? highScoreField.getBoundingClientRect() : undefined
    if (highScoreRect && highScoreRect.height) safeTop = Math.max(safeTop, highScoreRect.bottom + 6)
  }

  return safeTop
}

function refreshMobileControlPositions() {
  var controlBoxes = document.querySelectorAll('[data-mobile-control]')

  for (var i = 0; i < controlBoxes.length; i++) {
    applyMobileControlOffset(controlBoxes[i], getStoredMobileControlOffset(controlBoxes[i]))
  }
}

function restoreMobileControlPosition(controlBox) {
  applyMobileControlOffset(controlBox, getStoredMobileControlOffset(controlBox))
}

function getStoredMobileControlOffset(controlBox) {
  try {
    var storedOffset = localStorage.getItem(getMobileControlStorageKey(controlBox))
    return storedOffset ? parseFloat(storedOffset) || 0 : 0
  } catch {
    return 0
  }
}

function getCurrentMobileControlOffset(controlBox) {
  return parseFloat(controlBox.dataset.controlYOffset) || 0
}

function getMobileControlStorageKey(controlBox) {
  return 'mobile-control-' + controlBox.dataset.mobileControl + '-y'
}

function isAdjustableMobileControlLayout() {
  return document.body.classList.contains('is-game-mode') &&
    window.matchMedia('(max-width: 1024px) and (max-height: 540px) and (orientation: landscape)').matches
}
