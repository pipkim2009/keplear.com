import React, { useEffect } from 'react'
import { initializeCustomDropdowns } from '../../utils/customDropdown'

/**
 * Example Custom Dropdown Component
 * Following W3Schools dropdown guide with Keplear styling
 */
const CustomDropdownExample: React.FC = () => {
  useEffect(() => {
    // Initialize custom dropdowns after component mounts
    initializeCustomDropdowns()
  }, [])

  return (
    <div className="custom-dropdown-examples">
      <h3>Custom Dropdown Examples</h3>

      {/* Basic Dropdown */}
      <div className="custom-dropdown">
        <button className="custom-dropbtn">
          <span className="button-text">Select Scale</span>
        </button>
        <div className="custom-dropdown-content">
          <div className="custom-dropdown-item" data-value="major">Major</div>
          <div className="custom-dropdown-item selected" data-value="minor">Minor</div>
          <div className="custom-dropdown-item" data-value="pentatonic">Pentatonic</div>
          <div className="custom-dropdown-item" data-value="blues">Blues</div>
          <div className="custom-dropdown-item" data-value="dorian">Dorian</div>
        </div>
      </div>

      {/* Scale Options Dropdown */}
      <div className="custom-dropdown scale-dropdown">
        <button className="custom-dropbtn">
          <span className="button-text">Select Key</span>
        </button>
        <div className="custom-dropdown-content">
          <div className="custom-dropdown-item" data-value="C">C</div>
          <div className="custom-dropdown-item" data-value="C#">C#</div>
          <div className="custom-dropdown-item" data-value="D">D</div>
          <div className="custom-dropdown-item" data-value="D#">D#</div>
          <div className="custom-dropdown-item" data-value="E">E</div>
          <div className="custom-dropdown-item" data-value="F">F</div>
          <div className="custom-dropdown-item" data-value="F#">F#</div>
          <div className="custom-dropdown-item" data-value="G">G</div>
          <div className="custom-dropdown-item" data-value="G#">G#</div>
          <div className="custom-dropdown-item" data-value="A">A</div>
          <div className="custom-dropdown-item" data-value="A#">A#</div>
          <div className="custom-dropdown-item" data-value="B">B</div>
        </div>
      </div>

      {/* Instrument Dropdown */}
      <div className="custom-dropdown">
        <button className="custom-dropbtn">
          <span className="button-text">Instrument</span>
        </button>
        <div className="custom-dropdown-content">
          <div className="custom-dropdown-item selected" data-value="keyboard">Keyboard</div>
          <div className="custom-dropdown-item" data-value="guitar">Guitar</div>
          <div className="custom-dropdown-item" data-value="bass">Bass</div>
        </div>
      </div>
    </div>
  )
}

export default CustomDropdownExample