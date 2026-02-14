const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export const initGA = () => {
    if (!GA_MEASUREMENT_ID || window.gtag) return

    // Inject GA script
    const script = document.createElement('script')
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    script.async = true
    document.head.appendChild(script)

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || []
    function gtag() {
        window.dataLayer.push(arguments)
    }
    gtag('js', new Date())
    gtag('config', GA_MEASUREMENT_ID, {
        page_path: window.location.pathname,
    })

    window.gtag = gtag
}

export const logPageView = (path) => {
    if (!window.gtag) return
    window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: path
    })
}

export const logEvent = (eventName, params = {}) => {
    if (!window.gtag) return
    window.gtag('event', eventName, params)
}

export const logException = (description = '', fatal = false) => {
    if (!window.gtag) return
    logEvent('exception', {
        description,
        fatal
    })
}
