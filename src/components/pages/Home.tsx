interface HomeProps {
  onNavigateToSandbox: () => void
  onNavigateToPractice: () => void
}

function Home({ onNavigateToSandbox, onNavigateToPractice }: HomeProps) {
  return (
    <div>
      <h1>Keplear</h1>
    </div>
  )
}

export default Home
