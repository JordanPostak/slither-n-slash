// Shared game configuration, mutable state, cached elements, and runtime flags.

var canvas, ctx
var startingSegments = 6
var n = startingSegments
var score = 0
var a = 0
var segLength = 10
var foods = []
var centipedePoofs = []
var fireball
var nextFireballSpawnAt = 0
var fireballLifetime = 10000
var fireballSpawnMinDelay = 60000
var fireballSpawnMaxDelay = 60000
var fireballMinBeetles = 2
var goldenMouse
var nextGoldenMouseSpawnAt = 0
var goldenMouseLifetime = 12000
var goldenMouseSpawnMinDelay = 150000
var goldenMouseSpawnMaxDelay = 240000
var berserkerDuration = 10000
var berserkerUntil = 0
var berserkerRecoveryDuration = 2000
var berserkerRecoveryUntil = 0
var berserkerWasActive = false
var berserkerSpeedMultiplier = 1.35
var beetleBurnDuration = 1400
var swallowRadius = 24
var grubLifetime = 30000
var mouseLifetime = 20000
var grubSpawnInterval = 10000
var mouseSpawnInterval = 20000
var beetleSpawnInterval = 15000
var poisonBeetleSpawnProtectionDuration = 2000
var x = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var y = Array.apply(null, Array(n)).map(Number.prototype.valueOf, 0)
var snakeTrail = []
var steerTarget
var steerAngleTarget
var snakeHead = { x: 0, y: 0 }
var headingAngle = 0
var snakeSpeed = 3.05
var boostMultiplier = 1.85
var mouseFleeRadius = 145
var mouseFleeSpeed = 3.7
var mouseFleeStamina = 1200
var mouseEdgeAvoidance = 70
var arenaCornerRadius = 76
var snakeBodyBounceRadius = 18
var boosting = false
var boostCoolingDown = false
var baseBoostDuration = 500
var boostDurationPerSegment = 45
var maxBoostDuration = 1800
var boostCooldown = 3000
var boostEnergy = baseBoostDuration
var lastBoostUpdateAt = Date.now()
var touchBoosting = false
var pressedKeys = {}
var turnRate = 0.065
var gamepadSteerAngleTarget
var gamepadBoosting = false
var gamepadDeadzone = 0.2
var gamepadMenuButtonPressed = false
var animationRequestId
var foodSpawnIntervalIds = []
var playing = false
var badSnakes = []
var badSnakeStartCount = 1
var badSnakeMaxCount = 4
var badSnakeSpawnInterval = 40000
var badSnakeSpawnIntervalId
var badSnakeStartSegments = 4
var badSnakeBaseSpeed = 1.02
var badSnakeSpeedPerSegment = 0.075
var badSnakePlayerSpeedPerSegment = 0.025
var badSnakeMaxSpeed = 2.35
var badSnakeTurnRate = 0.024
var snakeBiteSegments = 3
var snakeCutCooldown = 1650
var snakeCornerCutStrength = 0.15
var trappedCrushDuration = 3000
var centipedePoofDuration = 460
var wormHeadImage = new Image()
var wormBodyImage = new Image()
var gameAudioContext
var rivalAudioContext
var scoreElement = document.getElementById('score')
var highScoreElement = document.getElementById('high-score')
var berserkerStatusElement = document.getElementById('berserker-status')
var berserkerStatusLabelElement = document.querySelector('.berserker-status-label')
var berserkerTimeElement = document.getElementById('berserker-time')
var lastBerserkerSeconds = -1
var highScore = 0
var highScoreSaveTimer
var controlsReady = false
var mobileControls = {
  left: false,
  right: false,
  boost: false,
}
var renderScale = 1
var motionScale = 1
var arenaMovementSpeedMultiplier = 0.8
var soundEnabled = true

// Mobile joystick controls
var joystickActive = false
var joystickTouchId = null
var joystickCurrentX = 0
var joystickCurrentY = 0
var boostTouchActive = false
var boostTouchId = null
var joystickDeadzone = 10 // minimum movement before joystick activates
var joystickBox
var boostBox
var joystickOrigin
var joystickHandle
var boostControlGauges = []
var boostVisualStates = []
var boostMeterFill
var lastBoostVisualUpdateAt = 0
var lastBoostVisualProgress = -1
var lastBoostVisualState = ''
var boostVisualUpdateInterval = 50
var mobileControlMediaQuery
var adjustableControlDrag
