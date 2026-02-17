
/**
 * Generates JSON-LD schema for a Software Application.
 * This helps Google understand the tool as a product with ratings, pricing, and category.
 * 
 * @param {Object} tool - The tool object.
 * @returns {string} JSON-LD structured data.
 */
export const generateToolSchema = (tool) => {
    if (!tool) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": tool.name,
        "description": tool.shortDescription,
        "url": `https://intelligrid.online/tools/${tool.slug}`,
        "applicationCategory": typeof tool.category === 'object' ? tool.category.name : tool.category || "BusinessApplication",
        "operatingSystem": "All",
        "offers": {
            "@type": "Offer",
            "price": tool.pricing?.amount || "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": tool.officialUrl || `https://intelligrid.online/tools/${tool.slug}`
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": tool.ratings?.average?.toFixed(1) || "5.0",
            "ratingCount": tool.ratings?.count || 1,
            "bestRating": "5",
            "worstRating": "1"
        }
    };

    return JSON.stringify(schema);
};

/**
 * Generates JSON-LD schema for a Category Page.
 * This helps Google understand the collection of tools.
 * 
 * @param {Object} category - The category object.
 * @param {Array} tools - List of tools in this category.
 * @returns {string} JSON-LD structured data.
 */
export const generateCategorySchema = (category, tools = []) => {
    if (!category) return null;

    tools = tools || [];

    // Calculate aggregated ratings from tools
    let totalRating = 0;
    let totalReviews = 0;

    tools.forEach(tool => {
        if (tool.ratings && tool.ratings.count > 0) {
            totalRating += (tool.ratings.average || 0) * tool.ratings.count;
            totalReviews += tool.ratings.count;
        }
    });

    const avgRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "0";

    const schema = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": `${category.name} AI Tools`,
        "description": `Discover the best ${category.name} AI tools. Compare pricing, features, and reviews.`,
        "url": `https://intelligrid.online/category/${category.slug}`,
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": tools.map((tool, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "url": `https://intelligrid.online/tools/${tool.slug}`,
                "name": tool.name
            }))
        }
    };

    // Add aggregate rating if we have reviews
    if (totalReviews > 0) {
        schema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": avgRating,
            "ratingCount": totalReviews,
            "bestRating": "5",
            "worstRating": "1"
        };
    }

    return JSON.stringify(schema);
};

/**
 * Generates JSON-LD schema for Breadcrumbs.
 * @param {Array} items - Array of { name, url } objects in order.
 * @returns {string} JSON-LD structured data.
 */
export const generateBreadcrumbSchema = (items) => {
    if (!items || items.length === 0) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    };

    return JSON.stringify(schema);
};
