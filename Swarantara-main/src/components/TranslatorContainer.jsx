"use client"

import { useState, useRef } from "react"
import { speechToText, translateText, textToSpeech } from "../services/apiService"
import "./TranslatorContainer.css"
import { ArrowRight, Mic, Play, RotateCcw } from "lucide-react"

const TranslatorContainer = () => {
  const [inputLanguage, setInputLanguage] = useState("hi")
  const [outputLanguage, setOutputLanguage] = useState("ta")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [transcript, setTranscript] = useState("")
  const [translation, setTranslation] = useState("")
  const [audioUrl, setAudioUrl] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState("idle") // idle, listening, translating, ready

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const inputAudioRef = useRef(null)
  const outputAudioRef = useRef(null)

  // Language options
  const languages = [
    { code: "hi", name: "Hindi", native: "हिंदी" },
    { code: "ta", name: "Tamil", native: "தமிழ்" },
    { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
    { code: "bn", name: "Bengali", native: "বাংলা" },
    { code: "te", name: "Telugu", native: "తెలుగు" },
    { code: "ml", name: "Malayalam", native: "മലയാളം" },
    { code: "mr", name: "Marathi", native: "मराठी" },
    { code: "gu", name: "Gujarati", native: "ગુજરાતી" },
    { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  ]

  // Clean up previous object URL when creating a new one
  const cleanupPreviousUrl = () => {
    if (audioUrl) {
      try {
        URL.revokeObjectURL(audioUrl)
        console.log("Revoked previous audio URL")
      } catch (err) {
        console.warn("Error revoking URL:", err)
      }
    }
  }

  // Swap languages
  const handleSwapLanguages = () => {
    setInputLanguage(outputLanguage)
    setOutputLanguage(inputLanguage)
    // Clear previous results
    resetTranslation()
  }

  // Reset translation
  const resetTranslation = () => {
    setTranscript("")
    setTranslation("")
    setAudioUrl("")
    setError(null)
    setStatus("idle")
  }

  // Start recording
  const startRecording = async () => {
    try {
      resetTranslation()
      setStatus("listening")
      setIsRecording(true)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 16000,
      })

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log("Audio chunk received:", event.data.size, "bytes")
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      console.log("Recording started")
    } catch (error) {
      console.error("Error starting recording:", error)
      setError("Microphone access denied. Please enable microphone access in your browser settings.")
      setStatus("idle")
      setIsRecording(false)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStatus("translating")

      // Stop all tracks on the stream
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())

      // Process the recording after a short delay to ensure all data is collected
      setTimeout(() => {
        processRecording()
      }, 500)
    }
  }

  // Process the recording
  const processRecording = async () => {
    try {
      setLoading(true)
      setError(null)
      cleanupPreviousUrl()

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      console.log("Recording complete. Total size:", audioBlob.size, "bytes")

      if (audioBlob.size === 0) {
        throw new Error("No audio recorded. Please try again and speak clearly.")
      }

      // Convert to WAV format
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const arrayBuffer = await audioBlob.arrayBuffer()

      // Decode the audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

      // Create WAV file
      const wavBlob = await audioBufferToWav(audioBuffer)
      console.log("Converted to WAV. Size:", wavBlob.size, "bytes")

      // Store input audio for playback
      const inputAudioUrl = URL.createObjectURL(wavBlob)
      if (inputAudioRef.current) {
        inputAudioRef.current.src = inputAudioUrl
      }

      // Step 1: Convert speech to text
      console.log("Starting speech-to-text conversion...")
      const sourceLanguageCode = `${inputLanguage}-IN`
      const text = await speechToText(wavBlob, sourceLanguageCode)
      if (!text) {
        throw new Error("No text was transcribed from the audio. Please try again and speak clearly.")
      }
      console.log("Speech-to-text result:", text)
      setTranscript(text)

      // Step 2: Translate text
      console.log("Starting translation...")
      const targetLanguageCode = outputLanguage
      const translatedText = await translateText(text, sourceLanguageCode, targetLanguageCode)
      if (!translatedText) {
        throw new Error("Translation failed. Please try again later.")
      }
      console.log("Translation result:", translatedText)
      setTranslation(translatedText)

      // Step 3: Convert translated text to speech
      console.log("Starting text-to-speech conversion...")
      const ttsBlob = await textToSpeech(translatedText, targetLanguageCode)
      if (!ttsBlob || ttsBlob.size === 0) {
        throw new Error("Text-to-speech conversion failed. Please try again later.")
      }
      console.log("Text-to-speech result received, size:", ttsBlob.size)

      // Create URL for audio playback
      const url = URL.createObjectURL(ttsBlob)
      console.log("Created audio URL:", url)

      // Set the audio URL with a small delay
      setTimeout(() => {
        setAudioUrl(url)
        if (outputAudioRef.current) {
          outputAudioRef.current.src = url
        }
        setStatus("ready")
      }, 100)
    } catch (err) {
      console.error("Detailed error:", err)

      // Format a user-friendly error message
      let userErrorMessage = "An error occurred during the translation process. Please try again."

      if (err.message.includes("API error:")) {
        userErrorMessage = err.message
      } else if (err.message.includes("format")) {
        userErrorMessage =
          "The translation service returned an unexpected format. Please try again or select a different language."
      } else if (err.message) {
        userErrorMessage = `Error: ${err.message}`
      }

      setError(userErrorMessage)
      setStatus("idle")
    } finally {
      setLoading(false)
    }
  }

  // Helper function to convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const format = 1 // PCM
    const bitDepth = 16

    const bytesPerSample = bitDepth / 8
    const blockAlign = numChannels * bytesPerSample

    const wav = new ArrayBuffer(44 + buffer.length * blockAlign)
    const view = new DataView(wav)

    // Write WAV header
    writeString(view, 0, "RIFF")
    view.setUint32(4, 36 + buffer.length * blockAlign, true)
    writeString(view, 8, "WAVE")
    writeString(view, 12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, format, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * blockAlign, true)
    view.setUint16(32, blockAlign, true)
    view.setUint16(34, bitDepth, true)
    writeString(view, 36, "data")
    view.setUint32(40, buffer.length * blockAlign, true)

    // Write audio data
    const data = new Float32Array(buffer.length)
    const channelData = buffer.getChannelData(0)
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      data[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
    }

    let offset = 44
    for (let i = 0; i < data.length; i++) {
      view.setInt16(offset, data[i], true)
      offset += 2
    }

    return new Blob([wav], { type: "audio/wav" })
  }

  // Helper function to write strings to DataView
  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i))
    }
  }

  // Play input audio
  const playInputAudio = () => {
    if (inputAudioRef.current) {
      inputAudioRef.current.play()
    }
  }

  // Play output audio
  const playOutputAudio = () => {
    if (outputAudioRef.current) {
      outputAudioRef.current.play()
    }
  }

  return (
    <div className="translator-container">
      <header className="translator-header">
        <h1 className="logo">Swarantara</h1>
        <span className="beta-tag">Beta</span>
      </header>

      <div className="panels-container">
        {/* Input Panel */}
        <div className="panel input-panel">
          <div className="panel-header">
            <label htmlFor="input-language">Input Language</label>
            <select
              id="input-language"
              value={inputLanguage}
              onChange={(e) => setInputLanguage(e.target.value)}
              className="language-selector"
            >
              {languages.map((lang) => (
                <option key={`input-${lang.code}`} value={lang.code}>
                  {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>

          <div className="panel-content">
            {transcript ? (
              <>
                <p className="transcript-text">{transcript}</p>
                {inputAudioRef && (
                  <button className="play-button" onClick={playInputAudio} aria-label="Play original audio">
                    <Play size={16} />
                  </button>
                )}
              </>
            ) : (
              <p className="placeholder-text">Hold the microphone button and speak...</p>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <button className="swap-button" onClick={handleSwapLanguages} aria-label="Swap languages">
          <ArrowRight size={20} />
        </button>

        {/* Output Panel */}
        <div className="panel output-panel">
          <div className="panel-header">
            <label htmlFor="output-language">Output Language</label>
            <select
              id="output-language"
              value={outputLanguage}
              onChange={(e) => setOutputLanguage(e.target.value)}
              className="language-selector"
            >
              {languages.map((lang) => (
                <option key={`output-${lang.code}`} value={lang.code}>
                  {lang.name} ({lang.native})
                </option>
              ))}
            </select>
          </div>

          <div className="panel-content">
            {translation ? (
              <>
                <p className="translation-text">{translation}</p>
                {audioUrl && (
                  <button className="play-button" onClick={playOutputAudio} aria-label="Play translated audio">
                    <Play size={16} />
                  </button>
                )}
              </>
            ) : (
              <p className="placeholder-text">Translation will appear here...</p>
            )}
          </div>
        </div>
      </div>

      {/* Status and Error Messages */}
      {error && <div className="error-message">{error}</div>}

      <div className="status-indicator">
        {status === "listening" && <span>Listening...</span>}
        {status === "translating" && <span>Translating...</span>}
        {status === "ready" && <span>Translation Ready</span>}
      </div>

      {/* Controls */}
      <div className="controls">
        <button
          className={`record-button ${isRecording ? "recording" : ""}`}
          onClick={isRecording ? stopRecording : startRecording}
          disabled={loading}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <Mic size={24} />
        </button>
        <p className="record-label">{isRecording ? "Click to stop" : "Click to speak"}</p>

        {(transcript || translation) && (
          <button className="reset-button" onClick={resetTranslation} aria-label="Reset translation">
            <RotateCcw size={20} />
          </button>
        )}
      </div>

      {/* Hidden audio elements */}
      <audio ref={inputAudioRef} className="hidden-audio" />
      <audio ref={outputAudioRef} className="hidden-audio" />
    </div>
  )
}

export default TranslatorContainer

