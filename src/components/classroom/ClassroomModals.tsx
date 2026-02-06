/**
 * ClassroomModals - Portal modals for classroom CRUD operations
 * Extracted from Classroom.tsx for maintainability
 */

import { createPortal } from 'react-dom'
import { useTranslation } from '../../contexts/TranslationContext'
import styles from '../../styles/Classroom.module.css'
import practiceStyles from '../../styles/Practice.module.css'

interface CreateModalProps {
  readonly isOpen: boolean
  readonly isDarkMode: boolean
  readonly error: string | null
  readonly title: string
  readonly description: string
  readonly isPublic: boolean
  readonly creating: boolean
  readonly onTitleChange: (val: string) => void
  readonly onDescriptionChange: (val: string) => void
  readonly onPublicChange: (val: boolean) => void
  readonly onSubmit: (e: React.FormEvent) => void
  readonly onClose: () => void
}

interface JoinModalProps {
  readonly isOpen: boolean
  readonly isDarkMode: boolean
  readonly joinError: string | null
  readonly joinCode: string
  readonly isJoining: boolean
  readonly onCodeChange: (val: string) => void
  readonly onSubmit: (e: React.FormEvent) => void
  readonly onClose: () => void
}

interface AssignTitleModalProps {
  readonly isOpen: boolean
  readonly isEditing: boolean
  readonly assignmentError: string | null
  readonly title: string
  readonly instrumentName: string
  readonly bpm: number
  readonly beats: number
  readonly hasChords: boolean
  readonly isSaving: boolean
  readonly onTitleChange: (val: string) => void
  readonly onSave: () => void
  readonly onClose: () => void
}

export function CreateClassroomModal({
  isOpen,
  isDarkMode,
  error,
  title,
  description,
  isPublic,
  creating,
  onTitleChange,
  onDescriptionChange,
  onPublicChange,
  onSubmit,
  onClose,
}: CreateModalProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return createPortal(
    <div
      className={`${styles.modalOverlay} ${isDarkMode ? 'dark' : ''}`}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`${styles.modal} ${isDarkMode ? 'dark' : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('classroom.createClass')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomTitle">
              {t('classroom.className')}
            </label>
            <input
              id="classroomTitle"
              type="text"
              className={styles.formInput}
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder={t('classroom.enterClassName')}
              autoFocus
              disabled={creating}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomDescription">
              {t('classroom.classDescription')}
            </label>
            <textarea
              id="classroomDescription"
              className={styles.formTextarea}
              value={description}
              onChange={e => onDescriptionChange(e.target.value)}
              placeholder={t('classroom.enterDescription')}
              disabled={creating}
              rows={3}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('classroom.visibility')}</label>
            <div className={styles.visibilityOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isPublic}
                  onChange={() => onPublicChange(true)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>{t('classroom.publicDescription')}</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={!isPublic}
                  onChange={() => onPublicChange(false)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>{t('classroom.privateDescription')}</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={creating || !title.trim()}
          >
            {creating ? t('classroom.creating') : t('classroom.createClass')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

export function JoinClassroomModal({
  isOpen,
  isDarkMode,
  joinError,
  joinCode,
  isJoining,
  onCodeChange,
  onSubmit,
  onClose,
}: JoinModalProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return createPortal(
    <div
      className={`${styles.modalOverlay} ${isDarkMode ? 'dark' : ''}`}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={`${styles.modal} ${isDarkMode ? 'dark' : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('classroom.joinClass')}</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          {joinError && <div className={styles.errorMessage}>{joinError}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="joinCode">
              {t('classroom.classCode')}
            </label>
            <input
              id="joinCode"
              type="text"
              className={`${styles.formInput} ${styles.codeInput}`}
              value={joinCode}
              onChange={e => onCodeChange(e.target.value.toUpperCase())}
              placeholder={t('classroom.enterCode')}
              autoFocus
              disabled={isJoining}
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isJoining || !joinCode.trim()}
          >
            {isJoining ? t('classroom.joining') : t('classroom.joinClass')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

export function AssignmentTitleModal({
  isOpen,
  isEditing,
  assignmentError,
  title,
  instrumentName,
  bpm,
  beats,
  hasChords,
  isSaving,
  onTitleChange,
  onSave,
  onClose,
}: AssignTitleModalProps) {
  const { t } = useTranslation()
  if (!isOpen) return null

  return createPortal(
    <div
      className={practiceStyles.modalOverlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className={practiceStyles.assignModal}>
        <div className={practiceStyles.assignModalHeader}>
          <h2 className={practiceStyles.assignModalTitle}>
            {isEditing ? t('classroom.assignment.update') : t('sandbox.createAssignment')}
          </h2>
          <button
            className={practiceStyles.assignModalClose}
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>
        <div className={practiceStyles.assignModalContent}>
          {assignmentError && (
            <div className={practiceStyles.assignModalError}>{assignmentError}</div>
          )}
          <div className={practiceStyles.assignModalField}>
            <label className={practiceStyles.assignModalLabel} htmlFor="assignmentTitle">
              {t('sandbox.assignmentTitle')}
            </label>
            <input
              id="assignmentTitle"
              type="text"
              className={practiceStyles.assignModalInput}
              value={title}
              onChange={e => onTitleChange(e.target.value)}
              placeholder={t('sandbox.enterAssignmentTitle')}
              autoFocus
              disabled={isSaving}
            />
          </div>
          <div className={practiceStyles.assignModalInfo}>
            <p>
              <strong>{t('sandbox.instrument')}:</strong> {instrumentName}
            </p>
            <p>
              <strong>{t('sandbox.bpm')}:</strong> {bpm}
            </p>
            <p>
              <strong>{t('sandbox.beats')}:</strong> {beats}
            </p>
            <p>
              <strong>{t('sandbox.type')}:</strong>{' '}
              {hasChords ? t('sandbox.chords') : t('sandbox.melodies')}
            </p>
          </div>
          <button
            className={practiceStyles.assignModalSubmit}
            onClick={onSave}
            disabled={isSaving || !title.trim()}
          >
            {isSaving
              ? t('sandbox.saving')
              : isEditing
                ? t('classroom.assignment.update')
                : t('sandbox.createAssignment')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
