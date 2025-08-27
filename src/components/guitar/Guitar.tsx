import React from 'react'
import '../../styles/Guitar.css'

const Guitar: React.FC = () => {
  return (
    <div className="guitar-container">
      <div className="guitar-neck">
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
            </div>
          ))}
          
          {/* Strings */}
          {[...Array(6)].map((_, index) => (
            <div 
              key={index} 
              className="guitar-string" 
              style={{ top: `${20 + index * 25}px` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Guitar