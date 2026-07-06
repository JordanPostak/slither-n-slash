// Animated snake artwork used by the landing-page hero.

function setupHeroSnakePreview() {
  wormHeadImage.addEventListener('load', drawHeroSnakePreview)
  wormTailImage.addEventListener('load', drawHeroSnakePreview)

  for (var i = 0; i < wormBodyImages.length; i++) {
    wormBodyImages[i].addEventListener('load', drawHeroSnakePreview)
  }

  drawHeroSnakePreview()
}

function drawHeroSnakePreview() {
  var heroCanvas = document.getElementById('hero-snake-canvas')
  if (!heroCanvas || !areSnakePreviewImagesReady()) return

  var rect = heroCanvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  var pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
  heroCanvas.width = Math.round(rect.width * pixelRatio)
  heroCanvas.height = Math.round(rect.height * pixelRatio)

  var heroContext = heroCanvas.getContext('2d')
  heroContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  heroContext.clearRect(0, 0, rect.width, rect.height)
  heroContext.imageSmoothingEnabled = true
  heroContext.imageSmoothingQuality = 'high'

  var points = getHeroSnakePreviewPoints(rect.width, rect.height, 6)
  var previewScale = Math.min(rect.width, rect.height) / 215

  var headPoint = points[points.length - 1]
  var beforeHead = points[points.length - 2]
  var headAngle = Math.atan2(headPoint.y - beforeHead.y, headPoint.x - beforeHead.x)
  var renderedHeadPoint = {
    x: headPoint.x + Math.cos(headAngle) * 14 * previewScale,
    y: headPoint.y + Math.sin(headAngle) * 14 * previewScale,
  }
  drawHeroSnakePreviewSegment(heroContext, wormHeadImage, renderedHeadPoint, headAngle, 44, 24, previewScale)

  for (var i = points.length - 2; i >= 0; i--) {
    var nextPoint = points[Math.min(points.length - 1, i + 1)]
    var previousPoint = points[Math.max(0, i - 1)]
    var bodyAngle = Math.atan2(nextPoint.y - previousPoint.y, nextPoint.x - previousPoint.x)
    var bodySequenceIndex = points.length - 2 - i
    var bodyImage = wormBodyImages[bodySequenceIndex % wormBodyImages.length]
    drawHeroSnakePreviewSegment(heroContext, bodyImage, points[i], bodyAngle, 30, 18, previewScale)
  }

  drawHeroSnakePreviewTail(heroContext, points[0], points[1], previewScale)
}

function areSnakePreviewImagesReady() {
  if (!wormHeadImage.complete || !wormHeadImage.naturalWidth) return false
  if (!wormTailImage.complete || !wormTailImage.naturalWidth) return false

  for (var i = 0; i < wormBodyImages.length; i++) {
    if (!wormBodyImages[i].complete || !wormBodyImages[i].naturalWidth) return false
  }

  return true
}

function getHeroSnakePreviewPoints(width, height, pointCount) {
  var curvePoints = []
  var cumulativeLengths = [0]
  var sampleCount = 120
  var totalLength = 0

  for (var i = 0; i <= sampleCount; i++) {
    var progress = i / sampleCount
    var curvePoint = getHeroSnakePreviewCurvePoint(width, height, progress)
    curvePoints.push(curvePoint)

    if (i > 0) {
      var previousCurvePoint = curvePoints[i - 1]
      totalLength += Math.hypot(curvePoint.x - previousCurvePoint.x, curvePoint.y - previousCurvePoint.y)
      cumulativeLengths.push(totalLength)
    }
  }

  var points = []

  for (var pointIndex = 0; pointIndex < pointCount; pointIndex++) {
    var targetLength = totalLength * pointIndex / (pointCount - 1)
    var sampleIndex = 1

    while (sampleIndex < cumulativeLengths.length && cumulativeLengths[sampleIndex] < targetLength) {
      sampleIndex++
    }

    var previousLength = cumulativeLengths[Math.max(0, sampleIndex - 1)]
    var nextLength = cumulativeLengths[Math.min(sampleIndex, cumulativeLengths.length - 1)]
    var lengthRange = Math.max(0.0001, nextLength - previousLength)
    var blend = (targetLength - previousLength) / lengthRange
    var previousPoint = curvePoints[Math.max(0, sampleIndex - 1)]
    var nextPoint = curvePoints[Math.min(sampleIndex, curvePoints.length - 1)]

    points.push({
      x: previousPoint.x + (nextPoint.x - previousPoint.x) * blend,
      y: previousPoint.y + (nextPoint.y - previousPoint.y) * blend,
    })
  }

  return points
}

function getHeroSnakePreviewCurvePoint(width, height, progress) {
  return {
    x: width * (0.31 + 0.36 * progress + 0.055 * Math.sin(progress * Math.PI * 2)),
    y: height * (0.69 - 0.38 * progress),
  }
}

function drawHeroSnakePreviewSegment(heroContext, image, point, angle, width, height, scale) {
  heroContext.save()
  heroContext.translate(point.x, point.y)
  heroContext.rotate(angle + Math.PI)
  heroContext.drawImage(image, -width * scale / 2, -height * scale / 2, width * scale, height * scale)

  heroContext.restore()
}

function drawHeroSnakePreviewTail(heroContext, tailPoint, nextPoint, scale) {
  var tailAngle = Math.atan2(tailPoint.y - nextPoint.y, tailPoint.x - nextPoint.x)
  var tailX = tailPoint.x + Math.cos(tailAngle) * 24 * scale
  var tailY = tailPoint.y + Math.sin(tailAngle) * 24 * scale
  var tailWidth = 52 * scale
  var tailHeight = 18 * scale

  heroContext.save()
  heroContext.translate(tailX, tailY)
  heroContext.rotate(tailAngle)
  heroContext.drawImage(
    wormTailImage,
    -tailWidth / 2,
    -tailHeight / 2,
    tailWidth,
    tailHeight
  )
  heroContext.restore()
}
