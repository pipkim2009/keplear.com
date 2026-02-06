/* eslint-disable react-refresh/only-export-components */
import React, { useState, useRef, useEffect } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface UseCustomDropdownProps {
  options: DropdownOption[]
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

/**
 * Custom hook for creating W3Schools-style dropdowns in React
 * Provides both the dropdown component and utility functions
 */
export const useCustomDropdown = ({
  options,
  defaultValue = '',
  onChange,
  placeholder = 'Select...',
  className = '',
}: UseCustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close other dropdowns when this one opens
  useEffect(() => {
    if (isOpen) {
      // Close all other custom dropdowns
      const allDropdowns = document.querySelectorAll('.custom-dropdown')
      allDropdowns.forEach(dropdown => {
        if (dropdown !== dropdownRef.current) {
          dropdown.classList.remove('open')
          const content = dropdown.querySelector('.custom-dropdown-content')
          if (content) {
            content.classList.remove('show')
          }
        }
      })
    }
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleSelect = (value: string) => {
    setSelectedValue(value)
    setIsOpen(false)
    if (onChange) {
      onChange(value)
    }
  }

  const getSelectedLabel = () => {
    const selectedOption = options.find(option => option.value === selectedValue)
    return selectedOption ? selectedOption.label : placeholder
  }

  const DropdownComponent = (
    <div ref={dropdownRef} className={`custom-dropdown ${isOpen ? 'open' : ''} ${className}`}>
      <button
        type="button"
        className="custom-dropbtn"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="button-text">{getSelectedLabel()}</span>
      </button>
      <div className={`custom-dropdown-content ${isOpen ? 'show' : ''}`} role="listbox">
        {options.map(option => (
          <div
            key={option.value}
            className={`custom-dropdown-item ${selectedValue === option.value ? 'selected' : ''}`}
            onClick={() => handleSelect(option.value)}
            data-value={option.value}
            role="option"
            aria-selected={selectedValue === option.value}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  )

  return {
    DropdownComponent,
    selectedValue,
    setSelectedValue,
    isOpen,
    setIsOpen,
  }
}

/**
 * Higher-order component to wrap existing select elements with custom dropdown styling
 */
interface CustomDropdownWrapperProps {
  children: React.ReactElement<HTMLSelectElement>
  className?: string
}

export const CustomDropdownWrapper: React.FC<CustomDropdownWrapperProps> = ({
  children,
  className = '',
}) => {
  const selectElement = React.Children.only(children)
  const options = React.Children.toArray(selectElement.props.children)
    .filter((child): child is React.ReactElement => React.isValidElement(child))
    .map(option => ({
      value: option.props.value,
      label: option.props.children,
    }))

  const { DropdownComponent } = useCustomDropdown({
    options,
    defaultValue: selectElement.props.value,
    onChange: selectElement.props.onChange
      ? value => {
          // Create a synthetic event to match the original select onChange
          const syntheticEvent = {
            target: { value },
            currentTarget: { value },
          } as React.ChangeEvent<HTMLSelectElement>
          selectElement.props.onChange(syntheticEvent)
        }
      : undefined,
    className: className || selectElement.props.className,
  })

  return DropdownComponent
}

/**
 * Direct replacement component for select elements
 */
interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: DropdownOption[]
  className?: string
  placeholder?: string
  'aria-label'?: string
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Select...',
  'aria-label': ariaLabel,
}) => {
  const { DropdownComponent } = useCustomDropdown({
    options,
    defaultValue: value,
    onChange,
    placeholder,
    className,
  })

  return <div aria-label={ariaLabel}>{DropdownComponent}</div>
}
