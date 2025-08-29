import ThemeToggle from './ThemeToggle'
import NotesToggle from './NotesToggle'
import '../../styles/Header.css'

interface HeaderProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  showNotes: boolean
  onToggleNotes: () => void
}

function Header({ isDarkMode, onToggleTheme, showNotes, onToggleNotes }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <div className="header-brand">
            <h1 className="header-title">Keplear</h1>
            <p className="header-slogan">Interactive tools for musical ear training</p>
          </div>
        </div>
        
        <div className="header-right">
          <NotesToggle showNotes={showNotes} onToggle={onToggleNotes} />
          <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  )
}

export default Header