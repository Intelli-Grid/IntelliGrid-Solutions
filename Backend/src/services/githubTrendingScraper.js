// Backend/src/services/githubTrendingScraper.js
// War Room — Scraper Agent source.
// Fetches AI-related repositories from GitHub Trending (daily).
// No API key required — uses public HTML page.
// Returns an array of tool-shaped objects for the scraper agent to process.

import axios from 'axios'

/**
 * Fetch today's trending AI repositories from GitHub.
 * Filters by AI-related keywords to avoid noise.
 * @returns {Promise<Array>} Array of { name, url, source, description } objects
 */
export async function fetchGitHubTrendingAI() {
  try {
    const { data: html } = await axios.get(
      'https://github.com/trending?since=daily&spoken_language_code=en',
      {
        headers: {
          'User-Agent':
            'IntelliGridBot/1.0 (+https://www.intelligrid.online/bot)',
          Accept: 'text/html',
        },
        timeout: 12000,
      }
    )

    // Parse repo entries from GitHub trending HTML
    // Each trending repo follows: /owner/repo structure in h2 > a hrefs
    const repoMatches = []
    const repoPattern =
      /href="\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)"[^>]*>\s*<\/a>\s*<\/h2>/g
    const descPattern =
      /<p class="col-9[^"]*"[^>]*>\s*([\s\S]*?)\s*<\/p>/g

    let match
    while ((match = repoPattern.exec(html)) !== null) {
      const fullPath = match[1]
      const parts = fullPath.split('/')
      if (parts.length === 2) {
        repoMatches.push({
          owner: parts[0],
          repo: parts[1],
        })
      }
    }

    // Extract descriptions
    const descriptions = []
    let descMatch
    while ((descMatch = descPattern.exec(html)) !== null) {
      descriptions.push(
        descMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      )
    }

    // Build tool-shaped objects
    const results = repoMatches.map((r, i) => ({
      name: r.repo
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      url: `https://github.com/${r.owner}/${r.repo}`,
      source: 'github-trending',
      sourceUrl: `https://github.com/${r.owner}/${r.repo}`,
      description: descriptions[i] || `Open-source AI project: ${r.repo}`,
      logoUrl: `https://avatars.githubusercontent.com/${r.owner}`,
    }))

    // Filter for AI-related repos only
    const aiKeywords = [
      'ai', 'llm', 'gpt', 'claude', 'gemini', 'llama', 'diffusion',
      'agent', 'ml', 'neural', 'openai', 'langchain', 'embedding',
      'transformer', 'copilot', 'chatbot', 'rag', 'vector', 'inference',
    ]

    const aiRepos = results.filter((r) => {
      const searchText = (r.name + ' ' + r.description).toLowerCase()
      return aiKeywords.some((kw) => searchText.includes(kw))
    })

    return aiRepos.slice(0, 10) // Top 10 AI repos per day
  } catch (err) {
    console.error('[GitHubTrendingScraper] Fetch error:', err.message)
    return [] // Never throw — caller handles empty array gracefully
  }
}
