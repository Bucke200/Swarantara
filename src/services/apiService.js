// Get your Sarvam AI API subscription key here: https://dashboard.sarvam.ai/admin

// API endpoints
const API_BASE_URL = "https://api.sarvam.ai"
const STT_ENDPOINT = `${API_BASE_URL}/speech-to-text`
const TRANSLATION_ENDPOINT = `${API_BASE_URL}/translate`
const TTS_ENDPOINT = `${API_BASE_URL}/text-to-speech`

// Language codes
const LANGUAGES = {
  ENGLISH: "en-IN",
  HINDI: "hi-IN",
  BENGALI: "bn-IN",
  GUJARATI: "gu-IN",
  KANNADA: "kn-IN",
  MALAYALAM: "ml-IN",
  MARATHI: "mr-IN",
  ODIA: "od-IN",
  PUNJABI: "pa-IN",
  TAMIL: "ta-IN",
  TELUGU: "te-IN"
}

// Language display names for UI
const LANGUAGE_NAMES = {
  "en-IN": "English",
  "hi-IN": "Hindi",
  "bn-IN": "Bengali",
  "gu-IN": "Gujarati",
  "kn-IN": "Kannada",
  "ml-IN": "Malayalam",
  "mr-IN": "Marathi",
  "od-IN": "Odia",
  "pa-IN": "Punjabi",
  "ta-IN": "Tamil",
  "te-IN": "Telugu"
}

// Get API key from environment variable
const API_KEY = import.meta.env.VITE_SARVAM_API_KEY

if (!API_KEY) {
  console.error("Sarvam AI API key is missing. Please set VITE_SARVAM_API_KEY in your .env file")
}

/**
 * Get the display name of a language from its code
 * 
 * @param {string} languageCode - The language code (e.g., 'hi-IN')
 * @returns {string} - The display name of the language
 */
export const getLanguageDisplayName = (languageCode) => {
  return LANGUAGE_NAMES[languageCode] || languageCode
}

/**
 * Get all supported language codes and their display names
 * 
 * @returns {Array<{code: string, name: string}>} - Array of language objects
 */
export const getSupportedLanguages = () => {
  return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
    code,
    name
  }))
}

/**
 * Converts speech audio to text using Saarika API
 *
 * @param {Blob} audioBlob - The recorded audio blob
 * @param {string} sourceLanguage - Source language code (e.g., 'hi-IN', 'en-IN')
 * @returns {Promise<string>} - Transcribed text
 */
export const speechToText = async (audioBlob, sourceLanguage = LANGUAGES.ENGLISH) => {
  try {
    const formData = new FormData()
    formData.append("file", audioBlob, "recording.wav")
    formData.append("model", "saarika:v2")
    formData.append("language_code", sourceLanguage)
    formData.append("with_timestamps", "false")

    console.log("Sending request to:", STT_ENDPOINT)
    console.log("With API key:", API_KEY ? "Present" : "Missing")
    console.log("Audio blob size:", audioBlob.size)
    console.log("Source language:", sourceLanguage)

    const response = await fetch(STT_ENDPOINT, {
      method: "POST",
      headers: {
        "api-subscription-key": API_KEY,
        Accept: "application/json",
      },
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Speech-to-text error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`,
      )
    }

    const data = await response.json()
    console.log("Speech-to-text API response:", data)

    // Check for different possible response formats
    if (!data) {
      console.error("Empty response from API")
      throw new Error("Empty response from speech-to-text API")
    }

    // Try different possible response formats
    const transcribedText = data.text || data.transcript || data.result || data.data?.text

    if (!transcribedText) {
      console.error("Invalid response format:", data)
      throw new Error("Could not find transcribed text in API response")
    }

    return transcribedText
  } catch (error) {
    console.error("Speech-to-text API error:", error)
    throw error
  }
}

/**
 * Translates text using Mayura API
 *
 * @param {string} text - Text to translate
 * @param {string} sourceLanguage - Source language code (e.g., 'en-IN')
 * @param {string} targetLanguage - Target language code (e.g., 'hi-IN', 'gu-IN')
 * @returns {Promise<string>} - Translated text
 */
export const translateText = async (text, sourceLanguage = LANGUAGES.ENGLISH, targetLanguage = LANGUAGES.HINDI) => {
  try {
    // Validate input text
    if (!text || typeof text !== "string") {
      throw new Error("Translation input text is required and must be a string")
    }

    console.log("Translating text:", text)
    console.log("Source language:", sourceLanguage)
    console.log("Target language:", targetLanguage)

    // Format the target language with region if needed
    const formattedTargetLang = targetLanguage.includes("-") ? targetLanguage : `${targetLanguage}-IN`

    const payload = {
      input: text,
      source_language_code: sourceLanguage,
      target_language_code: formattedTargetLang,
      speaker_gender: "Female",
      mode: "formal",
      model: "mayura:v1",
      enable_preprocessing: false,
    }

    console.log("Translation payload:", payload)

    const response = await fetch(TRANSLATION_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": API_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Translation error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`,
      )
    }

    const data = await response.json()
    return data.translated_text
  } catch (error) {
    console.error("Translation API error:", error)
    throw error
  }
}

/**
 * Converts text to speech using Bulbul API
 *
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code (e.g., 'hi-IN', 'gu-IN')
 * @returns {Promise<Blob>} - Audio blob
 */
export const textToSpeech = async (text, language = LANGUAGES.HINDI) => {
  try {
    // Validate input text
    if (!text || typeof text !== "string") {
      throw new Error("Text-to-speech input text is required and must be a string")
    }

    console.log("Converting text to speech:", text)
    console.log("Target language:", language)

    // Format the language with region if needed
    const formattedLang = language.includes("-") ? language : `${language}-IN`

    console.log("Using target language code:", formattedLang)

    const payload = {
      inputs: [text],
      target_language_code: formattedLang,
      speaker: "meera",
      pitch: 0,
      pace: 0.9,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: false,
      model: "bulbul:v1",
    }

    console.log("Text-to-speech payload:", payload)

    const response = await fetch(TTS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": API_KEY,
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    // Log the response content type for debugging
    const contentType = response.headers.get("content-type")
    console.log("TTS response content type:", contentType)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Text-to-speech error: ${response.status} ${response.statusText}. Details: ${JSON.stringify(errorData)}`,
      )
    }

    // The API returns JSON with audio data
    const jsonData = await response.json()
    console.log("TTS API response structure:", Object.keys(jsonData))

    // Check if response has the expected format
    if (!jsonData.audios || !Array.isArray(jsonData.audios) || jsonData.audios.length === 0) {
      console.error("Unexpected API response format:", jsonData)
      throw new Error("API response missing audio data")
    }

    // Extract audio data from the response
    const audioData = jsonData.audios[0]
    console.log("Audio data found in response")

    // Check if audio data is base64 encoded
    if (typeof audioData === "string") {
      // Convert base64 to binary data
      const binaryData = atob(audioData)
      const arrayBuffer = new ArrayBuffer(binaryData.length)
      const uint8Array = new Uint8Array(arrayBuffer)

      for (let i = 0; i < binaryData.length; i++) {
        uint8Array[i] = binaryData.charCodeAt(i)
      }

      console.log("Converted base64 to binary data, size:", arrayBuffer.byteLength)

      // Create audio blob
      const audioBlob = new Blob([arrayBuffer], { type: "audio/wav" })
      console.log("Created audio blob with size:", audioBlob.size)

      return audioBlob
    }
    // If it's already a binary array
    else if (audioData instanceof Uint8Array || Array.isArray(audioData)) {
      const audioBlob = new Blob([audioData], { type: "audio/wav" })
      console.log("Created audio blob from array data, size:", audioBlob.size)
      return audioBlob
    }
    // If it's an object with URL
    else if (typeof audioData === "object" && audioData.url) {
      console.log("Audio data contains URL, fetching audio from:", audioData.url)
      // Fetch the audio from the provided URL
      const audioResponse = await fetch(audioData.url)
      if (!audioResponse.ok) {
        throw new Error(`Failed to fetch audio from URL: ${audioResponse.status}`)
      }

      const audioBlob = await audioResponse.blob()
      console.log("Fetched audio blob with size:", audioBlob.size)
      return audioBlob
    }

    throw new Error("Unable to process audio data: format not recognized")
  } catch (error) {
    console.error("Text-to-speech API error:", error)
    throw error
  }
}

