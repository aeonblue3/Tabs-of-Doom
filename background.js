/**
 * This script runs in the background of the browser and listens for new tabs.
 * It checks if the new tab's URL already exists and, if so, activates the
 * existing tab and closes the new one.
 */

// Debug flag - set to false for production
const DEBUG = false;

// Debug logging function
const log = (...args) => {
    if (DEBUG) {
        console.log(...args);
    }
};
// Listen for tab updates (when URL becomes available)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    log('🔍 Tab updated:', tabId, 'changeInfo:', changeInfo, 'URL:', tab.url);

    // Only process when the URL is actually set and the tab is loading or complete
    if (changeInfo.url || (changeInfo.status === 'loading' && tab.url)) {
        log('✅ Processing tab with URL:', tab.url);

        // Only process tabs with a valid URL (not a newtab or settings page)
        if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
            // Function to remove tracking parameters while keeping content parameters
            const getBaseUrl = (url) => {
                try {
                    const urlObj = new URL(url);
                    const params = new URLSearchParams(urlObj.search);

                    // Common tracking parameters to remove
                    const trackingParams = [
                        // Google Analytics & UTM
                        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
                        'utm_id', 'utm_source_platform', 'utm_creative_format', 'utm_marketing_tactic',

                        // Facebook & Social Media
                        'fbclid', 'fbc', 'fbp', 'mc_cid', 'mc_eid',

                        // Google Ads
                        'gclid', 'gclsrc', 'dclid', 'wbraid', 'gbraid',

                        // General tracking
                        'ref', 'source', 'campaign', 'medium', 'referrer',
                        '_ga', '_gl', 'sessionid', 'sid', 'ssid', 'affiliate',

                        // E-commerce tracking
                        'tag', 'affiliate_id', 'partner', 'promo', 'discount',

                        // Misc tracking
                        'hl', 'ie', 'oe', 'gs_l', 'ei', 'ved', 'uact', 'sa', 'source_ve_path'
                    ];

                    // Remove tracking parameters
                    trackingParams.forEach(param => {
                        params.delete(param);
                        // Also remove case variations
                        params.delete(param.toLowerCase());
                        params.delete(param.toUpperCase());
                    });

                    // Reconstruct URL with remaining parameters
                    const cleanUrl = urlObj.origin + urlObj.pathname + (params.toString() ? '?' + params.toString() : '');
                    return cleanUrl;
                } catch (e) {
                    log('⚠️ Could not parse URL:', url);
                    return url; // fallback to original URL if parsing fails
                }
            };

            const currentBaseUrl = getBaseUrl(tab.url);
            if (currentBaseUrl !== tab.url) {
                log('🧹 Cleaned URL:', currentBaseUrl, '(removed tracking from:', tab.url + ')');
            } else {
                log('🔍 Comparing URL:', currentBaseUrl);
            }

            chrome.tabs.query({}, (allTabs) => {
                let existingTab = null;

                // Loop through all open tabs to find a match
                for (const otherTab of allTabs) {
                    // Check for a matching base URL (without GET parameters), but ensure it's not the current tab itself
                    if (otherTab.id !== tab.id && otherTab.url) {
                        const otherBaseUrl = getBaseUrl(otherTab.url);
                        if (currentBaseUrl === otherBaseUrl) {
                            existingTab = otherTab;
                            log('🎯 Found duplicate tab:', existingTab.id, 'base URL:', otherBaseUrl, '(original:', existingTab.url + ')');
                            break;
                        }
                    }
                }

                if (existingTab) {
                    log('🔄 Switching to existing tab and closing duplicate');
                    // If a duplicate is found, activate the existing tab
                    chrome.tabs.update(existingTab.id, { active: true });

                    // And remove the newly created tab
                    chrome.tabs.remove(tab.id);
                } else {
                    log('✨ No duplicate found, keeping tab');
                }
            });
        } else {
            log('⏭️ Skipping chrome:// or extension URL:', tab.url);
        }
    }
});

// Also keep the onCreated listener for debugging
chrome.tabs.onCreated.addListener((newTab) => {
    log('📝 New tab created:', newTab.id, 'URL:', newTab.url || 'NO URL YET');
});
