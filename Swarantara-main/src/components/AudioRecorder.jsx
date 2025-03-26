"use client"

import { useState, useRef } from "react"
import "./AudioRecorder.css"

const AudioRecorder = ({ onRecordingComplete, selectedLanguage }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStatus, setRecordingStatus] = useState("idle")
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
        },
      })

      setRecordingStatus("recording")
      setIsRecording(true)

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

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          console.log("Recording complete. Total size:", audioBlob.size, "bytes")

          // Convert to WAV format
          const audioContext = new (window.AudioContext || window.webkitAudioContext)()
          const arrayBuffer = await audioBlob.arrayBuffer()

          // Decode the audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Create WAV file
          const wavBlob = await audioBufferToWav(audioBuffer)
          console.log("Converted to WAV. Size:", wavBlob.size, "bytes")

          onRecordingComplete(wavBlob, selectedLanguage)
          setRecordingStatus("processed")
        } catch (error) {
          console.error("Error processing audio:", error)
          setRecordingStatus("error")
        }
      }

      mediaRecorder.start(1000) // Collect data every second
      console.log("Recording started")
    } catch (error) {
      console.error("Error starting recording:", error)
      setRecordingStatus("error")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingStatus("processing")

      // Stop all tracks on the stream
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
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

  return (
    <div className="audio-recorder">
      <button
        className={`record-button ${isRecording ? "recording" : ""}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>
      <div className="recording-status">
        {recordingStatus === "recording" && <span>Recording in progress...</span>}
        {recordingStatus === "processing" && <span>Processing audio...</span>}
        {recordingStatus === "processed" && <span>Recording processed!</span>}
        {recordingStatus === "error" && <span>Error recording audio</span>}
      </div>
    </div>
  )
}

export default AudioRecorder

