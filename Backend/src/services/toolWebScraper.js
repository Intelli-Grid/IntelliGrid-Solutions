import axios from 'axios';
import * as cheerio from 'cheerio';

export const scrapeToolWebsite = async (officialUrl) => {
  const result = {
    metaDescription: "",
    pageTitle: "",
    heroText: "",
    featuresText: "",
    pricingText: "",
    integrationText: ""
  };
  try {
    const r = await axios.get(officialUrl, {
      timeout: 10000,
      headers: { 'User-Agent': 'IntelliGrid-Enrichment/2.0' },
    });
    const $ = cheerio.load(r.data);
    $('script,style,nav,footer,header,aside').remove();

    // Meta (written by the tool team — highest signal)
    result.metaDescription = $('meta[name="description"]').attr('content') || '';
    result.pageTitle = $('title').text().trim();

    // OG description (often more specific)
    const og = $('meta[property="og:description"]').attr('content') || '';
    if (og.length > result.metaDescription.length) result.metaDescription = og;

    // Hero section (above the fold — highest content value)
    const heroSels = ['[class*="hero"]', '[class*="banner"]', 'h1', '.landing-hero'];
    for (const sel of heroSels) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 30) {
        result.heroText = el.text().replace(/\s+/g, " ").trim().slice(0, 800);
        break;
      }
    }

    // Features, Pricing, Integrations sections
    result.featuresText = extractSection($, ['[class*="feature"]', '[id*="feature"]'], 1200);
    result.pricingText = extractSection($, ['[class*="pric"]', '[id*="pric"]'], 1000);
    result.integrationText = extractSection($, ['[class*="integrat"]'], 600);

  } catch (err) {
    console.warn(`[WebScraper] ${officialUrl}: ${err.message}`);
  }
  return result;
};

const extractSection = ($, selectors, maxLen) => {
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length) return el.text().replace(/\s+/g, " ").trim().slice(0, maxLen);
  }
  return "";
};
