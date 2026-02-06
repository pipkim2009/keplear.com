import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  title?: string
  description?: string
  path?: string
}

const BASE_TITLE = 'Keplear'
const BASE_URL = 'https://keplear.com'
const DEFAULT_DESCRIPTION =
  'Free interactive music ear training for keyboard, guitar, and bass. Practice scales, chords, and melodies with real-time feedback.'

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '',
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${BASE_TITLE}` : `${BASE_TITLE} - Music Ear Training`
  const canonicalUrl = `${BASE_URL}${path}`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Keplear" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  )
}
