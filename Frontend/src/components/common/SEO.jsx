import { Helmet } from 'react-helmet-async'

export default function SEO({
    title = 'IntelliGrid - Discover the Best AI Tools',
    description = 'Explore 3,690+ curated AI tools for every need. Find, compare, and discover the perfect AI solutions for your business. Updated daily with the latest AI innovations.',
    keywords = 'AI tools, artificial intelligence, AI directory, AI software, machine learning tools, AI solutions, AI platforms, AI applications',
    ogImage = 'https://www.intelligrid.online/og-image.jpg',
    ogType = 'website',
    twitterCard = 'summary_large_image',
    canonicalUrl,
    noindex = false
}) {
    const siteUrl = 'https://www.intelligrid.online'
    const fullUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : siteUrl)

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{title}</title>
            <meta name="title" content={title} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Robots */}
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Canonical URL */}
            <link rel="canonical" href={fullUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={ogType} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={ogImage} />
            <meta property="og:site_name" content="IntelliGrid" />

            {/* Twitter */}
            <meta property="twitter:card" content={twitterCard} />
            <meta property="twitter:url" content={fullUrl} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={ogImage} />

            {/* Additional Meta Tags */}
            <meta name="author" content="IntelliGrid" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="language" content="English" />

            {/* Favicon */}
            <link rel="icon" type="image/x-icon" href="/favicon.ico" />

            {/* Theme Color */}
            <meta name="theme-color" content="#0A0E27" />
        </Helmet>
    )
}
