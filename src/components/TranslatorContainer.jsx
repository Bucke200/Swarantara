"use client"

import { useState, useRef, useEffect } from "react"
import { speechToText, translateText, textToSpeech } from "../services/apiService"
import "./TranslatorContainer.css"
import { MdSwapHoriz, MdPlayCircle } from "react-icons/md"
import { FaMicrophone, FaRedoAlt } from "react-icons/fa"

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
  const [isSpacebarPressed, setIsSpacebarPressed] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const inputAudioRef = useRef(null)
  const outputAudioRef = useRef(null)

  // Space bar recording handlers
  useEffect(() => {
    let recordingTimeout = null;
    const MIN_RECORDING_TIME = 3000; // Increase to 3 seconds minimum
    
    const handleKeyDown = (e) => {
      // Only trigger if it's the space bar key and we're not already recording
      // Also check if target is not an input, textarea, or select to avoid conflicts
      if (e.code === 'Space' && !isRecording && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault(); // Prevent page scroll
        setIsSpacebarPressed(true);
        startRecording();
      }
    };

    const handleKeyUp = (e) => {
      // Only trigger if it's the space bar key and we're currently recording
      if (e.code === 'Space' && isRecording) {
        e.preventDefault();
        setIsSpacebarPressed(false);
        
        // Only stop if we've been recording for the minimum time
        const recordingDuration = Date.now() - mediaRecorderRef.current?.startTime;
        console.log(`Recording duration: ${recordingDuration}ms, chunks: ${audioChunksRef.current.length}`);
        
        if (recordingDuration >= MIN_RECORDING_TIME) {
          stopRecording();
        } else {
          // If released too quickly, wait until minimum time has passed
          const remainingTime = MIN_RECORDING_TIME - recordingDuration;
          console.log(`Recording too short, continuing for ${remainingTime}ms more`);
          
          // Show feedback to user
          setStatus("listening_min_time");
          
          recordingTimeout = setTimeout(() => {
            stopRecording();
          }, remainingTime);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (recordingTimeout) {
        clearTimeout(recordingTimeout);
      }
    };
  }, [isRecording]); // Re-add listeners when recording state changes

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

      console.log("Attempting to access microphone...")
      
      // Try with simpler constraints first for better browser compatibility
      let stream;
      try {
        // First try with basic audio constraints - more reliable
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true
        })
        console.log("Microphone access granted with basic constraints")
      } catch (initialError) {
        console.error("Failed to access microphone:", initialError)
        setError(`Microphone access issue: ${initialError.message}. Please enable microphone access and refresh the page.`)
        setStatus("idle")
        setIsRecording(false)
        return
      }

      // Check what MIME types are supported
      const mimeTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        ''  // Empty string as fallback, uses browser default
      ]
      
      let selectedType = null
      for (const type of mimeTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          selectedType = type
          console.log(`Using MIME type: ${type || "browser default"}`)
          break
        }
      }

      // Create options based on browser compatibility
      const options = selectedType ? { mimeType: selectedType } : {}
      console.log("MediaRecorder options:", options)
      
      try {
        const mediaRecorder = new MediaRecorder(stream, options)
        
        // Track the start time for minimum recording duration
        mediaRecorder.startTime = Date.now()
        
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []
  
        console.log("MediaRecorder created with state:", mediaRecorder.state)
        
        mediaRecorder.ondataavailable = (event) => {
          console.log("Data available event triggered, data size:", event.data?.size || 0)
          if (event.data && event.data.size > 0) {
            console.log("Audio chunk received:", event.data.size, "bytes")
            audioChunksRef.current.push(event.data)
          } else {
            console.warn("Received empty audio chunk, MIME type may not be compatible")
          }
        }
  
        // Additional event handlers for better debugging
        mediaRecorder.onstart = () => console.log("MediaRecorder started successfully")
        mediaRecorder.onstop = () => console.log("MediaRecorder stopped")
        mediaRecorder.onerror = (e) => console.error("MediaRecorder error:", e)
  
        // Start collecting data - crucial part
        mediaRecorder.start(100)  // Collect in smaller chunks
        console.log("Recording started with MIME type:", selectedType || "browser default")
      } catch (recorderError) {
        console.error("Error creating MediaRecorder:", recorderError)
        setError(`Browser recording error: ${recorderError.message}. Try using a different browser like Chrome.`)
        setStatus("idle")
        setIsRecording(false)
        // Make sure to stop any streams that might be running
        stream.getTracks().forEach(track => track.stop())
      }
    } catch (error) {
      console.error("Error in recording setup:", error)
      setError(`Recording setup failed: ${error.message || "Unknown error"}. Please try again or use a different browser.`)
      setStatus("idle")
      setIsRecording(false)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log("Stopping recording...", "Current state:", mediaRecorderRef.current.state)
      
      try {
        // Request one final chunk of data before stopping
        mediaRecorderRef.current.requestData()
        
        // Stop the recorder
        mediaRecorderRef.current.stop()
        console.log("MediaRecorder stopped")
        
        // Stop all tracks on the stream
        mediaRecorderRef.current.stream.getTracks().forEach((track) => {
          track.stop()
          console.log("Audio track stopped")
        })
        
        setIsRecording(false)
        setStatus("translating")
  
        // Process the recording after a short delay to ensure all data is collected
        console.log("Waiting for all data before processing...")
        setTimeout(() => {
          console.log("Processing recording with", audioChunksRef.current.length, "chunks")
          processRecording()
        }, 800)  // Increased delay for better data collection
      } catch (stopError) {
        console.error("Error stopping recorder:", stopError)
        setError(`Error stopping recording: ${stopError.message}. Please refresh and try again.`)
        setStatus("idle")
        setIsRecording(false)
      }
    } else {
      console.warn("Cannot stop recording: MediaRecorder is not active or not initialized")
      setStatus("idle")
      setIsRecording(false)
    }
  }

  // Process the recording
  const processRecording = async () => {
    try {
      setLoading(true)
      setError(null)
      cleanupPreviousUrl()

      // Check if we have any audio chunks
      if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
        setError("No audio recorded. Please try again and ensure your microphone is working.")
        setStatus("idle")
        setLoading(false)
        return
      }

      // Filter out any empty chunks
      const validChunks = audioChunksRef.current.filter(chunk => chunk.size > 0)
      console.log(`Found ${validChunks.length} valid chunks out of ${audioChunksRef.current.length} total chunks`)
      
      if (validChunks.length === 0) {
        setError("Recording captured but no audio data was received. Please check your microphone permissions and try again.")
        setStatus("idle")
        setLoading(false)
        return
      }

      // Try different MIME types for the blob
      let audioBlob;
      const mimeTypesToTry = [
        "audio/webm",
        "audio/ogg",
        "audio/wav",
        "audio/mp4",
        ""  // Default
      ];
      
      for (const mimeType of mimeTypesToTry) {
        try {
          audioBlob = new Blob(validChunks, mimeType ? { type: mimeType } : undefined)
          console.log(`Created blob with MIME type ${mimeType || "default"}, size: ${audioBlob.size} bytes`)
          
          if (audioBlob.size > 100) {
            // Found a working MIME type with reasonable size
            break
          }
        } catch (blobError) {
          console.warn(`Failed to create blob with MIME type ${mimeType}:`, blobError)
        }
      }
      
      console.log("Final audio blob size:", audioBlob.size, "bytes from", validChunks.length, "chunks")

      // Further reduced minimum size requirement
      if (!audioBlob || audioBlob.size < 100) {
        setError("The recording was too quiet or too short. Please speak louder and hold for at least 3 seconds.")
        setStatus("idle")
        setLoading(false)
        return
      }

      // Create a downloadable link for debugging
      const debugAudioUrl = URL.createObjectURL(audioBlob)
      console.log("Debug audio URL:", debugAudioUrl)
      
      // Store raw audio for playback in case conversion fails
      if (inputAudioRef.current) {
        inputAudioRef.current.src = debugAudioUrl
      }

      try {
        // Convert to WAV format
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        console.log("Created audio context")
        
        const arrayBuffer = await audioBlob.arrayBuffer()
        console.log("Converted blob to ArrayBuffer, size:", arrayBuffer.byteLength, "bytes")

        // Decode the audio data with error handling
        let audioBuffer
        try {
          audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          console.log("Audio decoded successfully. Duration:", audioBuffer.duration, "seconds, channels:", audioBuffer.numberOfChannels)
        } catch (decodeError) {
          console.error("Error decoding audio:", decodeError)
          
          // If decoding fails, try sending the raw blob to the API
          console.log("Decode failed, attempting to use raw audio...")
          return await processRawAudio(audioBlob);
        }

        // Check if audio is silent (all samples below threshold)
        const channelData = audioBuffer.getChannelData(0)
        let maxAmplitude = 0
        for (let i = 0; i < channelData.length; i++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i]))
        }
        
        console.log("Maximum audio amplitude:", maxAmplitude)
        
        if (maxAmplitude < 0.01) {
          setError("Audio appears to be silent. Please speak louder or check your microphone.")
          setStatus("idle")
          setLoading(false)
          return
        }

        // Create WAV file
        const wavBlob = await audioBufferToWav(audioBuffer)
        console.log("Converted to WAV. Size:", wavBlob.size, "bytes")

        // Store input audio for playback
        const inputAudioUrl = URL.createObjectURL(wavBlob)
        if (inputAudioRef.current) {
          inputAudioRef.current.src = inputAudioUrl
        }

        // Continue with API calls...
        return await processAudioWithAPI(wavBlob);

      } catch (err) {
        console.error("Error processing audio:", err)
        setError("Error processing your recording. Please try again with a longer or clearer recording.")
        setStatus("idle")
        setLoading(false)
      }
    } catch (err) {
      console.error("Detailed error:", err)
      setError(`Recording error: ${err.message || "Unknown error"}. Please try again.`)
      setStatus("idle")
      setLoading(false)
    }
  }

  // Process raw audio directly (fallback)
  const processRawAudio = async (audioBlob) => {
    try {
      console.log("Processing raw audio blob, size:", audioBlob.size)
      
      // Step 1: Convert speech to text directly from blob
      console.log("Starting speech-to-text with raw audio...")
      const sourceLanguageCode = `${inputLanguage}-IN`
      const text = await speechToText(audioBlob, sourceLanguageCode)
      if (!text) {
        throw new Error("No text was transcribed from the audio. Please try again and speak clearly.")
      }
      console.log("Speech-to-text result:", text)
      setTranscript(text)

      // Continue with the rest of the process...
      return await processTranscript(text, sourceLanguageCode);
    } catch (error) {
      console.error("Error in raw audio processing:", error)
      throw error; // Let the parent function handle the error
    }
  }

  // Process audio with API after successful conversion
  const processAudioWithAPI = async (wavBlob) => {
    try {
      // Step 1: Convert speech to text
      console.log("Starting speech-to-text conversion...")
      const sourceLanguageCode = `${inputLanguage}-IN`
      const text = await speechToText(wavBlob, sourceLanguageCode)
      if (!text) {
        throw new Error("No text was transcribed from the audio. Please try again and speak clearly.")
      }
      console.log("Speech-to-text result:", text)
      setTranscript(text)

      // Continue with the rest of the process...
      return await processTranscript(text, sourceLanguageCode);
    } catch (error) {
      console.error("Error in API processing:", error)
      throw error; // Let the parent function handle the error
    }
  }

  // Process the transcript (common part for both paths)
  const processTranscript = async (text, sourceLanguageCode) => {
    try {
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
        setLoading(false)
      }, 100)
    } catch (error) {
      console.error("Error processing transcript:", error)
      
      let userErrorMessage = "An error occurred during the translation process. Please try again."
      if (error.message) {
        userErrorMessage = `Error: ${error.message}`
      }
      
      setError(userErrorMessage)
      setStatus("idle")
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
                    <MdPlayCircle size={36} />
                  </button>
                )}
              </>
            ) : (
              <p className="placeholder-text">Hold the space bar and speak...</p>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <button className="swap-button" onClick={handleSwapLanguages} aria-label="Swap languages">
          <MdSwapHoriz size={40} />
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
                    <MdPlayCircle size={36} />
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
        {status === "listening" && <span>Listening... {isSpacebarPressed ? "(Keep holding spacebar)" : ""}</span>}
        {status === "listening_min_time" && <span>Continue recording... (minimum 3 seconds required)</span>}
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
          <FaMicrophone size={40} />
        </button>
        <p className="record-label">Hold space bar or click to speak (minimum 3 seconds)</p>

        {(transcript || translation) && (
          <button className="reset-button" onClick={resetTranslation} aria-label="Reset translation">
            <FaRedoAlt size={32} />
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

