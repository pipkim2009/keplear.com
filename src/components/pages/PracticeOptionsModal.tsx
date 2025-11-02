import { useState } from 'react'
import styles from '../../styles/PracticeOptionsModal.module.css'

interface PracticeOption {
  id: string
  label: string
  description: string
}

const practiceOptions: PracticeOption[] = [
  {
    id: 'simple-melodies',
    label: 'Simple Melodies',
    description: 'Practice creating basic melodic phrases'
  },
  {
    id: 'scales',
    label: 'Scales',
    description: 'Master scale patterns and fingerings'
  },
  {
    id: 'chord-progressions',
    label: 'Chord Progressions',
    description: 'Practice chord progressions and transitions'
  },
  {
    id: 'chord-arpeggios',
    label: 'Chord Arpeggios',
    description: 'Play broken chords and arpeggiated patterns'
  }
]

interface PracticeOptionsModalProps {
  instrumentName: string
  onStart: (selectedOptions: string[]) => void
  onCancel: () => void
}

const PracticeOptionsModal: React.FC<PracticeOptionsModalProps> = ({
  instrumentName,
  onStart,
  onCancel
}) => {
  const [selectedOption, setSelectedOption] = useState<string>('')

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId)
  }

  const handleStart = () => {
    if (selectedOption) {
      onStart([selectedOption])
    }
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2 className={styles.modalTitle}>
          {instrumentName} Practice Session
        </h2>

        <p className={styles.modalSubtitle}>
          What would you like to practice?
        </p>

        <div className={styles.optionsList}>
          {practiceOptions.map(option => (
            <label
              key={option.id}
              className={`${styles.optionItem} ${
                selectedOption === option.id ? styles.selected : ''
              }`}
            >
              <input
                type="radio"
                name="practice-option"
                checked={selectedOption === option.id}
                onChange={() => handleSelectOption(option.id)}
                className={styles.radio}
              />
              <div className={styles.optionContent}>
                <div className={styles.optionLabel}>{option.label}</div>
                <div className={styles.optionDescription}>
                  {option.description}
                </div>
              </div>
              <div className={styles.checkmark}>
                {selectedOption === option.id && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                  >
                    <path
                      d="M16.6667 5L7.50004 14.1667L3.33337 10"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </label>
          ))}
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={onCancel}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            onClick={handleStart}
            className={styles.startButton}
            disabled={!selectedOption}
          >
            Start Practice
          </button>
        </div>
      </div>
    </div>
  )
}

export default PracticeOptionsModal
