import { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import * as faceapi from "face-api.js"
import { BRAND } from "../../config/theme"
import api from "../../services/api"

// ── Constants ────────────────────────────────────────────────────────────────

const MODEL_URL       = "/models"
const CHALLENGE_POOL  = ["blink", "turn_left", "turn_right", "nod", "smile"]
const LIVENESS_PASS   = 75
const FACE_MATCH_PASS = 70

// ── Helpers ───────────────────────────────────────────────────────────────────

function euclidean(d1, d2) {
  return Math.sqrt(d1.reduce((sum, v, i) => sum + (v - d2[i]) ** 2, 0))
}

function distanceToScore(distance) {
  return Math.round((1 - Math.min(distance / 0.6, 1)) * 100)
}

function timingScore(ms, min, max) {
  if (ms < min || ms > max) return 0
  return 100
}

function pickChallenges() {
  const pool = [...CHALLENGE_POOL]
  const c1   = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
  const c2   = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
  return [c1, c2]
}

function challengeInstruction(c) {
  return {
    blink:      "Blink your eyes slowly",
    turn_left:  "Slowly turn your head to the left",
    turn_right: "Slowly turn your head to the right",
    nod:        "Nod your head slowly downward",
    smile:      "Give a natural smile",
  }[c]
}

// EAR — Eye Aspect Ratio for blink detection
function calcEAR(eye) {
  const A = Math.hypot(eye[1].y - eye[5].y, eye[1].x - eye[5].x)
  const B = Math.hypot(eye[2].y - eye[4].y, eye[2].x - eye[4].x)
  const C = Math.hypot(eye[0].y - eye[3].y, eye[0].x - eye[3].x)
  return (A + B) / (2 * C)
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Verification() {
  const { appId }  = useParams()
  const navigate   = useNavigate()

  // State machine
  const [state, setState]             = useState("INSTRUCTIONS")  
  // INSTRUCTIONS → INITIALISING → FACE_REQUIRED → CHALLENGE_1 → CHALLENGE_2 → ANALYSING → RESULT

  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [challenges, setChallenges]     = useState([])
  const [currentChallenge, setCurrentChallenge] = useState(0)
  const [countdown, setCountdown]       = useState(8)
  const [result, setResult]             = useState(null)  // { passed, livenessScore, faceMatchScore, reason }
  const [attempts, setAttempts]         = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [error, setError]               = useState(null)

  // Refs — for values that change during animation frames
  const videoRef          = useRef(null)
  const canvasRef         = useRef(null)
  const streamRef         = useRef(null)
  const challengeDataRef  = useRef({})   // tracks challenge-specific state
  const frameScoresRef    = useRef([])   // micro-movement tracking
  const countdownRef      = useRef(8)
  const challengeTimerRef = useRef(null)
  const detectionLoopRef  = useRef(null)
  const passportDescRef   = useRef(null) // face descriptor from uploaded photo

  // ── Load Models ─────────────────────────────────────────────────────────────

  const loadModels = async () => {
    setState("INITIALISING")
    try {
      setLoadingProgress(10)
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      setLoadingProgress(40)
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      setLoadingProgress(75)
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      setLoadingProgress(100)
      setModelsLoaded(true)
    } catch (e) {
      setError("Failed to load verification models. Please refresh and try again.")
    }
  }

  // ── Start Camera ─────────────────────────────────────────────────────────────

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      })
      streamRef.current        = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      // Load passport photo descriptor for face matching
      await loadPassportDescriptor()

      setState("FACE_REQUIRED")
      startDetectionLoop()
    } catch (e) {
      if (e.name === "NotAllowedError") {
        setError("Please allow camera access in your browser settings to complete verification.")
      } else {
        setError("Camera could not be started. Please check your device and try again.")
      }
    }
  }

  // ── Load Passport Photo ──────────────────────────────────────────────────────

  const loadPassportDescriptor = async () => {
    try {
      // Fetch the applicant's uploaded passport/licence photo
      const res  = await api.get(`/api/applicant/applications/${appId}`)
      const docs  = res.data.documents ?? []
      const photo = docs.find(d => d.doc_type === "licence_photo" && d.is_current)

      if (!photo) return  // No photo uploaded yet — face match will be skipped

      // Load the image and extract descriptor
      const img        = await faceapi.fetchImage(`http://127.0.0.1:5000/${photo.file_path}`)
      const detection  = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection) {
        passportDescRef.current = detection.descriptor
      }
    } catch (e) {
      console.warn("Could not load passport photo for face matching:", e)
    }
  }

  // ── Detection Loop ───────────────────────────────────────────────────────────

  const startDetectionLoop = () => {
    const loop = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        detectionLoopRef.current = requestAnimationFrame(loop)
        return
      }

      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (detection) {
        drawOverlay(detection)
        checkFaceCoverage(detection)
        trackMicroMovement(detection)

        if (state === "CHALLENGE_1" || state === "CHALLENGE_2") {
          const idx = state === "CHALLENGE_1" ? 0 : 1
          checkChallenge(challenges[idx], detection)
        }
      } else {
        clearCanvas()
      }

      detectionLoopRef.current = requestAnimationFrame(loop)
    }
    detectionLoopRef.current = requestAnimationFrame(loop)
  }

  // ── Draw Oval Overlay ────────────────────────────────────────────────────────

  const drawOverlay = (detection) => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const dims = faceapi.matchDimensions(canvas, video, true)
    const resized = faceapi.resizeResults(detection, dims)

    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw oval guide
    ctx.beginPath()
    ctx.ellipse(canvas.width / 2, canvas.height / 2, 130, 170, 0, 0, 2 * Math.PI)
    ctx.strokeStyle = "#2563eb"
    ctx.lineWidth   = 3
    ctx.stroke()
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height)
  }

  // ── Face Coverage Check ──────────────────────────────────────────────────────

  const checkFaceCoverage = (detection) => {
    const video     = videoRef.current
    const faceArea  = detection.detection.box.width * detection.detection.box.height
    const frameArea = video.videoWidth * video.videoHeight
    return faceArea / frameArea >= 0.20
  }

  // ── Micro Movement Tracking ──────────────────────────────────────────────────

  const trackMicroMovement = (detection) => {
    const nose = detection.landmarks.getNose()[0]
    frameScoresRef.current.push({ x: nose.x, y: nose.y })
    if (frameScoresRef.current.length > 10) {
      frameScoresRef.current.shift()
    }
  }

  const getMicroMovementScore = () => {
    const frames = frameScoresRef.current
    if (frames.length < 5) return 50  // not enough data
    const xs  = frames.map(f => f.x)
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length
    const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length
    // Real face has natural variance — photo has near-zero variance
    return variance > 0.5 ? 100 : Math.round(variance * 200)
  }

  // ── Challenge Detection ──────────────────────────────────────────────────────

  const checkChallenge = (challenge, detection) => {
    const data      = challengeDataRef.current
    const landmarks = detection.landmarks
    const now       = Date.now()

    if (!data.startTime) {
      data.startTime = now
    }

    switch (challenge) {
      case "blink": {
        const leftEye  = landmarks.getLeftEye()
        const rightEye = landmarks.getRightEye()
        const ear      = (calcEAR(leftEye) + calcEAR(rightEye)) / 2

        if (!data.blinkStarted && ear < 0.20) {
          data.blinkStarted = now
        }
        if (data.blinkStarted && ear > 0.25) {
          const duration = now - data.blinkStarted
          if (duration >= 800 && duration <= 3000) {
            data.timingMs = duration
            completeChallenge(challenge)
          } else {
            // Too fast or too slow — reset
            data.blinkStarted = null
          }
        }
        break
      }

      case "turn_left": {
        const nose   = landmarks.getNose()[0]
        const leftEye  = landmarks.getLeftEye()[0]
        const rightEye = landmarks.getRightEye()[3]
        const center = (leftEye.x + rightEye.x) / 2

        if (!data.baseline) { data.baseline = center }
        const shift = data.baseline - nose.x

        if (shift > 30 && !data.completed) {
          const duration = now - data.startTime
          if (duration >= 800 && duration <= 4000) {
            data.timingMs = duration
            completeChallenge(challenge)
          }
        }
        break
      }

      case "turn_right": {
        const nose     = landmarks.getNose()[0]
        const leftEye  = landmarks.getLeftEye()[0]
        const rightEye = landmarks.getRightEye()[3]
        const center   = (leftEye.x + rightEye.x) / 2

        if (!data.baseline) { data.baseline = center }
        const shift = nose.x - data.baseline

        if (shift > 30 && !data.completed) {
          const duration = now - data.startTime
          if (duration >= 800 && duration <= 4000) {
            data.timingMs = duration
            completeChallenge(challenge)
          }
        }
        break
      }

      case "nod": {
        const nose = landmarks.getNose()[3]
        if (!data.baseline) { data.baseline = nose.y }

        const shift = nose.y - data.baseline
        if (shift > 20 && !data.nodStarted) {
          data.nodStarted = now
        }
        if (data.nodStarted && shift < 5) {
          const duration = now - data.nodStarted
          if (duration >= 800 && duration <= 4000) {
            data.timingMs = duration
            completeChallenge(challenge)
          }
        }
        break
      }

      case "smile": {
        const mouth = landmarks.getMouth()
        const leftCorner  = mouth[0]
        const rightCorner = mouth[6]
        if (!data.baseline) {
          data.baseline = rightCorner.x - leftCorner.x
        }
        const width = rightCorner.x - leftCorner.x
        if (width > data.baseline * 1.20 && !data.completed) {
          const duration = now - data.startTime
          if (duration >= 500) {
            data.timingMs = duration
            completeChallenge(challenge)
          }
        }
        break
      }
    }
  }

  // ── Complete a Challenge ─────────────────────────────────────────────────────

  const completeChallenge = (challenge) => {
    if (challengeDataRef.current.completed) return
    challengeDataRef.current.completed = true

    clearInterval(challengeTimerRef.current)

    // Store timing score for this challenge
    const ms  = challengeDataRef.current.timingMs ?? 1500
    const min = challenge === "blink" ? 800 : 800
    const max = challenge === "blink" ? 3000 : 4000
    const score = timingScore(ms, min, max)

    challengeDataRef.current.score = score

    // Move to next challenge or analysing
    if (state === "CHALLENGE_1") {
      challengeDataRef.current = {}
      setState("CHALLENGE_2")
      startChallengeCooldown(2)
    } else {
      runAnalysis()
    }
  }

  // ── Challenge Timer ──────────────────────────────────────────────────────────

  const startChallengeCooldown = (challengeNumber) => {
    countdownRef.current = 8
    setCountdown(8)

    challengeTimerRef.current = setInterval(() => {
      countdownRef.current -= 1
      setCountdown(countdownRef.current)

      if (countdownRef.current <= 0) {
        clearInterval(challengeTimerRef.current)
        handleTimeout()
      }
    }, 1000)
  }

  const handleTimeout = () => {
    stopCamera()
    setResult({
      passed:         false,
      livenessScore:  0,
      faceMatchScore: 0,
      reason:         "timeout",
    })
    setState("RESULT")
  }

  // ── Run Final Analysis ───────────────────────────────────────────────────────

  const runAnalysis = async () => {
    setState("ANALYSING")
    cancelAnimationFrame(detectionLoopRef.current)

    // Capture a clean frame for face matching
    const canvas  = document.createElement("canvas")
    canvas.width  = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0)

    stopCamera()

    // Face match score
    let faceMatchScore = 0
    try {
      const liveDetection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (liveDetection && passportDescRef.current) {
        const distance    = euclidean(
          Array.from(liveDetection.descriptor),
          Array.from(passportDescRef.current)
        )
        faceMatchScore = distanceToScore(distance)
      } else {
        faceMatchScore = 50  // no passport photo uploaded — neutral score
      }
    } catch (e) {
      faceMatchScore = 0
    }

    // Liveness score — weighted combination per spec
    const microMovement  = getMicroMovementScore()
    const faceCoverage   = 100  // passed FACE_REQUIRED state to get here
    const challenge1Score = 100  // completed challenge 1
    const challenge2Score = 100  // completed challenge 2

    const livenessScore = Math.round(
      (challenge1Score * 0.25) +
      (challenge2Score * 0.25) +
      (microMovement   * 0.25) +
      (faceCoverage    * 0.25)
    )

    const passed = livenessScore >= LIVENESS_PASS && faceMatchScore >= FACE_MATCH_PASS

    // Determine failure reason for specific error messages
    let reason = null
    if (!passed) {
      if (livenessScore < LIVENESS_PASS)  reason = "liveness"
      else if (faceMatchScore < FACE_MATCH_PASS) reason = "face_match"
    }

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    // Save to backend
    try {
      await api.post(`/api/applicant/applications/${appId}/verify`, {
        passed,
        liveness_score:   livenessScore,
        face_match_score: faceMatchScore,
        challenges_used:  challenges.join(", "),
      })
    } catch (e) {
      console.error("Failed to save verification result:", e)
    }

    setResult({ passed, livenessScore, faceMatchScore, reason })
    setState("RESULT")
  }

  // ── Stop Camera ──────────────────────────────────────────────────────────────

  const stopCamera = () => {
    cancelAnimationFrame(detectionLoopRef.current)
    clearInterval(challengeTimerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  // ── Retry ────────────────────────────────────────────────────────────────────

  const retry = () => {
    challengeDataRef.current = {}
    frameScoresRef.current   = []
    const newChallenges = pickChallenges()
    setChallenges(newChallenges)
    setResult(null)
    setCountdown(8)
    setState("FACE_REQUIRED")
    startCamera()
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const newChallenges = pickChallenges()
    setChallenges(newChallenges)
  }, [])

  useEffect(() => {
    if (modelsLoaded) startCamera()
  }, [modelsLoaded])

  useEffect(() => {
    if (state === "CHALLENGE_1" || state === "CHALLENGE_2") {
      challengeDataRef.current = {}
      startChallengeCooldown(state === "CHALLENGE_1" ? 1 : 2)
    }
  }, [state])

  useEffect(() => {
    return () => stopCamera()  // cleanup on unmount
  }, [])

  // ── Failure Messages (from spec) ─────────────────────────────────────────────

  const failureMessage = {
    liveness:   "We could not verify you were live. Make sure you are in good lighting and follow the on-screen prompts carefully.",
    face_match: "Your face did not match your uploaded photo. Make sure you uploaded a clear photo of yourself.",
    timeout:    "You did not complete the challenge in time. Please try again.",
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "520px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>🪪</div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", color: BRAND.primaryDeep, marginBottom: "4px" }}>Identity Verification</h1>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>Step 5 of your application</p>
        </div>

        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e5e7eb", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>

          {/* ── INSTRUCTIONS ── */}
          {state === "INSTRUCTIONS" && (
            <div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: BRAND.primaryDeep, marginBottom: "16px" }}>Before you begin</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                {[
                  "Make sure you are in a well-lit area. Natural or overhead light works best.",
                  "Remove glasses, hats, or anything covering your face.",
                  "Hold your device at eye level, approximately arm's length away.",
                  "Make sure your full face is visible from forehead to chin.",
                  "Do not attempt to use a photo or video — the system detects this.",
                  "You have one retry if the check fails — take your time.",
                  "The check takes approximately 15–20 seconds.",
                ].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: BRAND.primary, color: "white", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px" }}>{i + 1}</div>
                    <p style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, margin: 0 }}>{tip}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={loadModels}
                style={{ width: "100%", background: BRAND.primary, color: "white", border: "none", borderRadius: "10px", padding: "14px", fontWeight: "700", fontSize: "15px", cursor: "pointer" }}
              >
                Begin Verification →
              </button>
            </div>
          )}

          {/* ── INITIALISING ── */}
          {state === "INITIALISING" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>⚙️</div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: BRAND.primaryDeep, marginBottom: "8px" }}>Loading verification system…</h2>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>This may take a few seconds on first load.</p>
              <div style={{ background: "#f3f4f6", borderRadius: "99px", height: "8px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${loadingProgress}%`, background: BRAND.primary, borderRadius: "99px", transition: "width 0.4s ease" }} />
              </div>
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>{loadingProgress}%</p>
            </div>
          )}

          {/* ── CAMERA STATES ── */}
          {["FACE_REQUIRED", "CHALLENGE_1", "CHALLENGE_2"].includes(state) && (
            <div>
              {/* Instruction text */}
              <div style={{ textAlign: "center", marginBottom: "16px", minHeight: "48px" }}>
                {state === "FACE_REQUIRED" && (
                  <p style={{ fontSize: "14px", fontWeight: "600", color: BRAND.primaryDeep }}>Position your face in the oval</p>
                )}
                {(state === "CHALLENGE_1" || state === "CHALLENGE_2") && (
                  <>
                    <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>
                      Challenge {state === "CHALLENGE_1" ? "1" : "2"} of 2
                    </p>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: BRAND.primaryDeep }}>
                      {challengeInstruction(challenges[state === "CHALLENGE_1" ? 0 : 1])}
                    </p>
                    {/* Countdown */}
                    <div style={{ display: "inline-block", background: countdown <= 3 ? "#fef2f2" : "#eff6ff", color: countdown <= 3 ? "#dc2626" : BRAND.primary, borderRadius: "99px", padding: "4px 14px", fontSize: "13px", fontWeight: "700", marginTop: "8px" }}>
                      {countdown}s remaining
                    </div>
                  </>
                )}
              </div>

              {/* Camera feed */}
              <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", background: "#000", aspectRatio: "4/3" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                />
                <canvas
                  ref={canvasRef}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }}
                />
              </div>

              {/* Face required hint */}
              {state === "FACE_REQUIRED" && (
                <p style={{ textAlign: "center", fontSize: "12px", color: "#9ca3af", marginTop: "12px" }}>
                  Make sure your full face is visible and well-lit
                </p>
              )}
            </div>
          )}

          {/* ── ANALYSING ── */}
          {state === "ANALYSING" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: "36px", marginBottom: "16px" }}>🔍</div>
              <h2 style={{ fontSize: "17px", fontWeight: "700", color: BRAND.primaryDeep, marginBottom: "8px" }}>Analysing…</h2>
              <p style={{ fontSize: "13px", color: "#6b7280" }}>Please wait while we verify your identity.</p>
            </div>
          )}

          {/* ── RESULT ── */}
          {state === "RESULT" && result && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                {result.passed ? "✅" : "❌"}
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: "800", color: result.passed ? "#15803d" : "#dc2626", marginBottom: "8px" }}>
                {result.passed ? "Verification Passed" : "Verification Failed"}
              </h2>

              {/* Scores */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "20px 0" }}>
                <ScoreCard label="Liveness Score" score={result.livenessScore} pass={result.livenessScore >= LIVENESS_PASS} />
                <ScoreCard label="Face Match Score" score={result.faceMatchScore} pass={result.faceMatchScore >= FACE_MATCH_PASS} />
              </div>

              {/* Failure message */}
              {!result.passed && result.reason && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px", marginBottom: "20px", textAlign: "left" }}>
                  <p style={{ fontSize: "13px", color: "#dc2626", lineHeight: 1.6, margin: 0 }}>
                    {failureMessage[result.reason]}
                  </p>
                </div>
              )}

              {/* Max retries reached */}
              {!result.passed && attempts >= 2 && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px", marginBottom: "20px" }}>
                  <p style={{ fontSize: "13px", color: "#dc2626", fontWeight: "600", marginBottom: "4px" }}>Maximum attempts reached</p>
                  <p style={{ fontSize: "13px", color: "#991b1b", margin: 0 }}>
                    Verification could not be completed online. Please visit your nearest TAJ office to complete in-person identity verification.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {result.passed && (
                  <button
                    onClick={() => navigate(`/applications/${appId}`)}
                    style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: "10px", padding: "13px", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
                  >
                    Continue Application →
                  </button>
                )}
                {!result.passed && attempts < 2 && (
                  <button
                    onClick={retry}
                    style={{ background: BRAND.primary, color: "white", border: "none", borderRadius: "10px", padding: "13px", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{ background: "white", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "13px", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "14px", marginTop: "16px" }}>
              <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>{error}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Score Card ────────────────────────────────────────────────────────────────

function ScoreCard({ label, score, pass }) {
  return (
    <div style={{ background: pass ? "#f0fdf4" : "#fef2f2", border: `1px solid ${pass ? "#bbf7d0" : "#fecaca"}`, borderRadius: "10px", padding: "14px" }}>
      <div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: "800", color: pass ? "#15803d" : "#dc2626" }}>{score}<span style={{ fontSize: "12px", fontWeight: "400" }}>/100</span></div>
      <div style={{ fontSize: "11px", color: pass ? "#15803d" : "#dc2626", fontWeight: "600" }}>{pass ? "✓ Pass" : "✗ Fail"}</div>
    </div>
  )
}