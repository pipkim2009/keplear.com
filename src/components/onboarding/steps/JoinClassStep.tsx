import { useState, useEffect } from 'react'
import { PiBookOpenFill, PiUserFill, PiPianoKeysFill, PiUsersFill } from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { supabase } from '../../../lib/supabase'
import { useFindClassroomByCode, type Classroom } from '../../../hooks/useClassrooms'
import type { InstrumentType } from '../../../types/instrument'
import styles from '../Onboarding.module.css'

interface JoinClassStepProps {
  joinCode: string
  onJoinCodeChange: (code: string) => void
  selectedClassroomIds: string[]
  onToggleClassroom: (id: string) => void
  selectedInstruments: InstrumentType[]
  onNext: () => void
  onSkip: () => void
  onBack: () => void
}

interface AvailableClassroom {
  id: string
  title: string
  owner_username: string | null
  student_count: number
  instruments: string[]
}

const INSTRUMENT_ICONS: Record<string, React.ReactNode> = {
  keyboard: <PiPianoKeysFill />,
  guitar: <GiGuitarHead />,
  bass: <GiGuitarBassHead />
}

/**
 * Second onboarding step - optionally join a class
 * Shows applicable classrooms and allows joining via code
 */
const JoinClassStep = ({
  joinCode,
  onJoinCodeChange,
  selectedClassroomIds,
  onToggleClassroom,
  selectedInstruments,
  onNext,
  onSkip,
  onBack
}: JoinClassStepProps) => {
  const [debouncedCode, setDebouncedCode] = useState(joinCode)
  const [hasSearched, setHasSearched] = useState(false)
  const [availableClassrooms, setAvailableClassrooms] = useState<AvailableClassroom[]>([])
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true)

  // Debounce the join code input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(joinCode)
      if (joinCode.length > 0) {
        setHasSearched(true)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [joinCode])

  // Fetch available classrooms that match selected instruments
  useEffect(() => {
    const fetchClassrooms = async () => {
      setIsLoadingClassrooms(true)
      try {
        const { data, error } = await supabase
          .from('classrooms')
          .select(`
            id,
            title,
            profiles (username),
            classroom_students (user_id),
            assignments (instrument)
          `)
          .limit(10)

        if (error) throw error

        // Filter and transform classrooms
        const classrooms: AvailableClassroom[] = (data || [])
          .map((c: any) => {
            const instruments = [...new Set(c.assignments?.map((a: any) => a.instrument).filter(Boolean) || [])]
            return {
              id: c.id,
              title: c.title,
              owner_username: c.profiles?.username || null,
              student_count: c.classroom_students?.length || 0,
              instruments
            }
          })
          // Only show classrooms that have assignments for selected instruments
          .filter(c =>
            c.instruments.length > 0 &&
            c.instruments.some(i => selectedInstruments.includes(i as InstrumentType))
          )
          .slice(0, 5)

        setAvailableClassrooms(classrooms)
      } catch (err) {
        console.warn('Failed to fetch classrooms:', err)
        setAvailableClassrooms([])
      } finally {
        setIsLoadingClassrooms(false)
      }
    }

    if (selectedInstruments.length > 0) {
      fetchClassrooms()
    }
  }, [selectedInstruments])

  // Look up classroom by code
  const { data: classroom, isLoading, error } = useFindClassroomByCode(
    debouncedCode.length >= 20 ? debouncedCode : null,
    { enabled: debouncedCode.length >= 20 }
  )

  const isValidCode = !!classroom && !error
  const showError = hasSearched && debouncedCode.length > 0 && !isLoading && !isValidCode

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onJoinCodeChange(e.target.value.toUpperCase().trim())
  }

  const handleSelectClassroom = (classroomId: string) => {
    onToggleClassroom(classroomId)
  }

  const getInputClassName = () => {
    const classes = [styles.codeInput]
    if (isValidCode) classes.push(styles.inputValid)
    if (showError) classes.push(styles.inputError)
    return classes.join(' ')
  }

  return (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <span className={styles.stepIcon}>
          <PiBookOpenFill />
        </span>
        <h2 className={styles.stepTitle}>Join a Class</h2>
        <p className={styles.stepDescription}>
          Enter a class code or select from available classes
        </p>
      </div>

      <div className={styles.joinClassForm}>
        <div className={styles.formGroup}>
          <label htmlFor="join-code">Class Code</label>
          <input
            id="join-code"
            type="text"
            value={joinCode}
            onChange={handleInputChange}
            placeholder="ENTER CODE"
            className={getInputClassName()}
            autoComplete="off"
          />
        </div>

        {isLoading && debouncedCode.length >= 20 && (
          <div className={styles.classPreview}>
            <div className={styles.classPreviewLabel}>Looking up class...</div>
          </div>
        )}

        {isValidCode && classroom && (
          <div className={styles.classPreview}>
            <div className={styles.classPreviewLabel}>Class Found</div>
            <p className={styles.classPreviewName}>{classroom.title}</p>
            {classroom.profiles?.username && (
              <p className={styles.classPreviewTeacher}>
                <PiUserFill style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Teacher: {classroom.profiles.username}
              </p>
            )}
          </div>
        )}

        {showError && (
          <div className={styles.errorMessage}>
            No class found with this code. Please check and try again.
          </div>
        )}

        {/* Available classrooms for selected instruments */}
        {!isValidCode && availableClassrooms.length > 0 && (
          <div className={styles.availableClassrooms}>
            <div className={styles.availableClassroomsLabel}>
              Recommended Classes
            </div>
            <div className={styles.classroomList}>
              {availableClassrooms.map(c => (
                <button
                  key={c.id}
                  className={`${styles.classroomItem} ${selectedClassroomIds.includes(c.id) ? styles.selectedGreen : ''}`}
                  onClick={() => handleSelectClassroom(c.id)}
                  type="button"
                >
                  <div className={styles.classroomInfo}>
                    <span className={styles.classroomTitle}>{c.title}</span>
                    {c.owner_username && (
                      <span className={styles.classroomTeacher}>
                        <PiUserFill /> {c.owner_username}
                      </span>
                    )}
                  </div>
                  <div className={styles.classroomMeta}>
                    <span className={styles.classroomInstruments}>
                      {c.instruments.map(i => (
                        <span key={i} className={styles.instrumentIcon} title={i}>
                          {INSTRUMENT_ICONS[i]}
                        </span>
                      ))}
                    </span>
                    <span className={styles.studentCount}>
                      <PiUsersFill /> {c.student_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!isValidCode && !isLoadingClassrooms && availableClassrooms.length === 0 && !joinCode && (
          <div className={styles.noClassrooms}>
            No public classes available for your instruments yet.
          </div>
        )}
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.secondaryButton}
          onClick={onBack}
          type="button"
        >
          Back
        </button>
        <button
          className={styles.primaryButton}
          onClick={onNext}
          disabled={joinCode.length > 0 && !isValidCode}
          type="button"
        >
          {isValidCode || selectedClassroomIds.length > 0 ? 'Join & Continue' : 'Next'}
        </button>
      </div>

      <button
        className={styles.skipButton}
        onClick={onSkip}
        type="button"
      >
        Skip - I'll join a class later
      </button>
    </div>
  )
}

export default JoinClassStep
