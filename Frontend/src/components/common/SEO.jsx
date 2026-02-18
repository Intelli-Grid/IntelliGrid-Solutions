import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://www.intelligrid.online'
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`

export default function SEO({
    title = 'IntelliGrid - Discover the Best AI Tools',
    description = 'Explore 3,690+ curated AI tools for every need. Find, compare, and discover the perfect AI solutions for your business. Updated daily with the latest AI innovations.',
    keywords = 'AI tools, artificial intelligence, AI directory, AI software, machine learning tools, AI solutions, AI platforms, AI applications',
    ogImage = DEFAULT_OG_IMAGE,
    ogType = 'website',
    twitterCard = 'summary_large_image',
    canonicalUrl,
    noindex = false,
    structuredData = null,
}) {
    const fullUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : SITE_URL)

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <meta name="author" content="IntelliGrid" />

            {/* Robots */}
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

            {/* Canonical URL */}
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:site_name" content="IntelliGrid" />
            <meta property="og:locale" content="en_US" />

            {/* Twitter / X */}
            <meta property="twitter:card" content={twitterCard} />
            <meta property="twitter:site" content="@intelligrid_ai" />
            <meta property="twitter:creator" content="@intelligrid_ai" />
            <meta property="twitter:url" content={fullUrl} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={ogImage} />

            {/* Additional */}
            <meta name="theme-color" content="#0A0E27" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="language" content="English" />

            {/* Custom Structured Data */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    )
}
