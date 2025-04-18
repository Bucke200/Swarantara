"use client"
import "./LanguageSelector.css"

const LanguageSelector = ({ selectedLanguage, onLanguageChange }) => {
  const languages = [
    { code: "hi", name: "Hindi" },
    { code: "kn", name: "Kannada" },
    { code: "ta", name: "Tamil" },
    { code: "bn", name: "Bengali" },
  ]

  return (
    <div className="language-selector">
      <label htmlFor="language-select">Select Target Language:</label>
      <select id="language-select" value={selectedLanguage} onChange={(e) => onLanguageChange(e.target.value)}>
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector

