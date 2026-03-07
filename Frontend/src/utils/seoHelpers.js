
/**
 * Generates a rich JSON-LD SoftwareApplication schema for a tool page.
 * Uses Batch-2 enrichment fields when available and falls back gracefully.
 *
 * @param {Object} tool - The tool document from the API.
 * @returns {string|null} Serialised JSON-LD string, or null if tool is falsy.
 */
export const generateToolSchema = (tool) => {
    if (!tool) return null

    const categoryName = typeof tool.category === 'object'
        ? tool.category.name
        : tool.category || 'BusinessApplication'

    // Pricing label: prefer explicit startingPrice, else derive from pricing enum
    const priceLabel = tool.startingPrice
        || (tool.pricing === 'Free' ? 'Free'
            : tool.pricing === 'Freemium' ? 'Free plan available'
                : tool.pricing === 'Trial' ? 'Free trial available'
                    : tool.pricing === 'Paid' ? 'Paid'
                        : 'See website for pricing')

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: tool.name,
        description: tool.metaDescription || tool.shortDescription,
        url: `https://www.intelligrid.online/tools/${tool.slug}`,
        applicationCategory: categoryName,
        operatingSystem: 'Web, Windows, macOS, Linux, iOS, Android',
        offers: {
            '@type': 'Offer',
            priceSpecification: {
                '@type': 'PriceSpecification',
                ...(tool.pricing === 'Free' ? { price: '0', priceCurrency: 'USD' } : {}),
                description: priceLabel,
            },
            availability: 'https://schema.org/InStock',
            url: tool.affiliateUrl || tool.officialUrl || `https://www.intelligrid.online/tools/${tool.slug}`,
        },
    }

    // Logo / image — prefer screenshot (real page visual), fall back to logo
    const logoSrc = tool.screenshotUrl || tool.logo || tool.metadata?.logo
    if (logoSrc) {
        schema.image = { '@type': 'ImageObject', url: logoSrc, width: 1200, height: 630 }
        schema.thumbnailUrl = tool.logo || tool.metadata?.logo || logoSrc
    }

    // aggregateRating — only include when there are real reviews (avoids Google Search Console warnings)
    if (tool.ratings?.count > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: tool.ratings.average.toFixed(1),
            ratingCount: tool.ratings.count,
            bestRating: '5',
            worstRating: '1',
        }
    }

    // Optional Batch-2 enrichment
    if (tool.targetAudience) schema.audience = { '@type': 'Audience', audienceType: tool.targetAudience }
    if (tool.launchedAt) schema.datePublished = new Date(tool.launchedAt).toISOString().split('T')[0]
    if (tool.hasFreeTier != null) schema.isAccessibleForFree = tool.hasFreeTier

    return JSON.stringify(schema)
}

/**
 * Generates JSON-LD schema for a Category Page.
 *
 * @param {Object} category - The category object.
 * @param {Array}  tools    - List of tools in this category.
 * @returns {string|null} JSON-LD structured data.
 */
export const generateCategorySchema = (category, tools = []) => {
    if (!category) return null

    tools = tools || []

    let totalRating = 0
    let totalReviews = 0

    tools.forEach(tool => {
        if (tool.ratings && tool.ratings.count > 0) {
            totalRating += (tool.ratings.average || 0) * tool.ratings.count
            totalReviews += tool.ratings.count
        }
    })

    const avgRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : '0'

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${category.name} AI Tools`,
        description: `Discover the best ${category.name} AI tools. Compare pricing, features, and reviews.`,
        url: `https://www.intelligrid.online/category/${category.slug}`,
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: tools.map((tool, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                url: `https://www.intelligrid.online/tools/${tool.slug}`,
                name: tool.name,
            })),
        },
    }

    if (totalReviews > 0) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: avgRating,
            ratingCount: totalReviews,
            bestRating: '5',
            worstRating: '1',
        }
    }

    return JSON.stringify(schema)
}


/**
 * Generates JSON-LD schema for a Comparison Page (Tool A vs Tool B).
 */
export const generateComparisonSchema = (tool1, tool2) => {
    if (!tool1 || !tool2) return null

    const schema = [
        {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${tool1.name} vs ${tool2.name} — AI Tool Comparison`,
            description: `Compare ${tool1.name} and ${tool2.name} side by side — pricing, features, ratings, and user reviews.`,
            url: `https://www.intelligrid.online/compare/${tool1.slug}-vs-${tool2.slug}`,
            numberOfItems: 2,
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: tool1.name,
                    url: `https://www.intelligrid.online/tools/${tool1.slug}`,
                    item: {
                        '@type': 'SoftwareApplication',
                        name: tool1.name,
                        description: tool1.shortDescription,
                        applicationCategory: typeof tool1.category === 'object' ? tool1.category?.name : tool1.category,
                        ...(tool1.ratings?.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: tool1.ratings.average.toFixed(1), ratingCount: tool1.ratings.count, bestRating: '5', worstRating: '1' } } : {}),
                    },
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: tool2.name,
                    url: `https://www.intelligrid.online/tools/${tool2.slug}`,
                    item: {
                        '@type': 'SoftwareApplication',
                        name: tool2.name,
                        description: tool2.shortDescription,
                        applicationCategory: typeof tool2.category === 'object' ? tool2.category?.name : tool2.category,
                        ...(tool2.ratings?.count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: tool2.ratings.average.toFixed(1), ratingCount: tool2.ratings.count, bestRating: '5', worstRating: '1' } } : {}),
                    },
                },
            ],
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: `What is the difference between ${tool1.name} and ${tool2.name}?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `${tool1.name} is ${tool1.shortDescription || 'an AI tool'}. ${tool2.name} is ${tool2.shortDescription || 'an AI tool'}. The main difference lies in their focus areas, pricing models (${tool1.pricing || 'varies'} vs ${tool2.pricing || 'varies'}), and target audiences.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: `Is ${tool1.name} better than ${tool2.name}?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `It depends on your use case. ${tool1.name} has a rating of ${tool1.ratings?.average?.toFixed(1) || 'N/A'}/5 from ${tool1.ratings?.count || 0} users, while ${tool2.name} is rated ${tool2.ratings?.average?.toFixed(1) || 'N/A'}/5 from ${tool2.ratings?.count || 0} users. Visit each tool's page on IntelliGrid to see detailed reviews and decide which fits your needs best.`,
                    },
                },
                {
                    '@type': 'Question',
                    name: `Does ${tool1.name} have a free plan?`,
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: `${tool1.name} is listed as "${tool1.pricing || 'See website'}" on IntelliGrid. Check the official website for the latest pricing details.`,
                    },
                },
            ],
        },
    ]

    return JSON.stringify(schema)
}

/**
 * Generates JSON-LD BreadcrumbList schema.
 *
 * @param {Array} items - Array of { name, url } objects in order.
 * @returns {string|null} JSON-LD structured data.
 */
export const generateBreadcrumbSchema = (items) => {
    if (!items || items.length === 0) return null

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }

    return JSON.stringify(schema)
}
