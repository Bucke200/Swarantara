"use client"

import { useEffect, useRef, useState } from "react"
import "./AudioPlayer.css"

const AudioPlayer = ({ audioUrl, transcript, translation }) => {
  const audioRef = useRef(null)
  const [error, setError] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // Reset error state when audioUrl changes
    setError(null)
    setIsPlaying(false)

    if (audioUrl && audioRef.current) {
      console.log("Audio URL received:", audioUrl)

      // Add event listeners for better debugging
      const audio = audioRef.current

      const handleCanPlay = () => {
        console.log("Audio can play now")
        setError(null)
      }

      const handlePlay = () => {
        console.log("Audio playback started")
        setIsPlaying(true)
      }

      const handleEnded = () => {
        console.log("Audio playback ended")
        setIsPlaying(false)
      }

      // Listen for events
      audio.addEventListener("canplay", handleCanPlay)
      audio.addEventListener("play", handlePlay)
      audio.addEventListener("ended", handleEnded)

      // Try to load the audio
      audio.load()

      // Cleanup
      return () => {
        audio.removeEventListener("canplay", handleCanPlay)
        audio.removeEventListener("play", handlePlay)
        audio.removeEventListener("ended", handleEnded)
      }
    }
  }, [audioUrl])

  // Handle retry with different format
  const handleRetry = () => {
    setError(null)
    if (audioRef.current) {
      audioRef.current.load()
    }
  }

  if (!audioUrl) {
    return null
  }

  return (
    <div className="audio-player">
      <h3>Translation Results</h3>

      {transcript && (
        <div className="transcript-container">
          <h4>Original Text:</h4>
          <p className="transcript">{transcript}</p>
        </div>
      )}

      {translation && (
        <div className="translation-container">
          <h4>Translated Text:</h4>
          <p className="translation">{translation}</p>
        </div>
      )}

      <div className="player-container">
        <h4>Translated Audio:</h4>
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="audio-control"
          preload="auto"
          onError={(e) => {
            console.error("Audio playback error:", e)
            console.error("Audio element error code:", audioRef.current?.error?.code)
            console.error("Audio element error message:", audioRef.current?.error?.message)
            setError("Failed to load audio. This may be due to an unsupported audio format.")
          }}
        >
          Your browser does not support the audio element.
        </audio>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={handleRetry} className="retry-button">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AudioPlayer

