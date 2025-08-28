import React, { useState } from 'react'
import '../../styles/Guitar.css'

const Guitar: React.FC = () => {
  const [stringCheckboxes, setStringCheckboxes] = useState<boolean[]>(new Array(6).fill(false))
  const [fretCheckboxes, setFretCheckboxes] = useState<boolean[]>(new Array(12).fill(false))

  // Check if at least one string is selected
  const hasStringSelected = stringCheckboxes.some(checked => checked)

  const handleStringCheckboxChange = (index: number) => {
    const newCheckboxes = [...stringCheckboxes]
    newCheckboxes[index] = !newCheckboxes[index]
    setStringCheckboxes(newCheckboxes)
    
    // If no strings are selected, clear all fret selections
    if (!newCheckboxes.some(checked => checked)) {
      setFretCheckboxes(new Array(12).fill(false))
    }
  }

  const handleFretCheckboxChange = (index: number) => {
    // Only allow fret changes if at least one string is selected
    if (!hasStringSelected) return
    
    const newCheckboxes = [...fretCheckboxes]
    newCheckboxes[index] = !newCheckboxes[index]
    setFretCheckboxes(newCheckboxes)
  }

  return (
    <div className="guitar-container">
      <div className="fretboard">
        {/* Frets */}
        {[...Array(12)].map((_, index) => (
          <div key={index} className="fret" style={{ left: `${(index + 1) * 60}px` }}>
            <div className="fret-wire"></div>
            {/* Fret markers on 3rd, 5th, 7th, 9th frets */}
            {[3, 5, 7, 9].includes(index + 1) && (
              <div className="fret-marker"></div>
            )}
            {/* Double marker on 12th fret */}
            {index + 1 === 12 && (
              <>
                <div className="fret-marker double-marker-1"></div>
                <div className="fret-marker double-marker-2"></div>
              </>
            )}
            {/* Checkbox beneath each fret */}
            <div className="fret-checkbox-container">
              <input
                type="checkbox"
                id={`fret-${index}`}
                className={`fret-checkbox ${!hasStringSelected ? 'disabled' : ''}`}
                checked={fretCheckboxes[index]}
                onChange={() => handleFretCheckboxChange(index)}
                disabled={!hasStringSelected}
              />
              <label htmlFor={`fret-${index}`} className={`fret-checkbox-label ${!hasStringSelected ? 'disabled' : ''}`}>{index + 1}</label>
            </div>
          </div>
        ))}
        
        {/* Strings */}
        {[...Array(6)].map((_, index) => (
          <div 
            key={index} 
            className="guitar-string" 
            style={{ top: `${15 + index * 28}px` }}
          ></div>
        ))}

        {/* String checkboxes beside each string */}
        {[...Array(6)].map((_, index) => (
          <div 
            key={`string-checkbox-${index}`}
            className="string-checkbox-container"
            style={{ top: `${15 + index * 28}px` }}
          >
            <input
              type="checkbox"
              id={`string-${index}`}
              className="string-checkbox"
              checked={stringCheckboxes[index]}
              onChange={() => handleStringCheckboxChange(index)}
            />
            <label htmlFor={`string-${index}`} className="string-checkbox-label">{6 - index}</label>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Guitar