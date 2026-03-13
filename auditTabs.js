const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'Frontend', 'src', 'pages', 'AdminPage.jsx');
const txt = fs.readFileSync(file, 'utf8');

const tabs = ['OverviewTab','ToolsTab','ClaimsTab','UsersTab','FeaturedListingsAdminTab','ReviewsTab','PaymentsTab','AnalyticsTab','SettingsTab','SubmissionsTab','BlogAdminTab','CouponsAdminTab','LinkHealthTab','DiscoveryTab','FeatureFlagsTab','AffiliateTab','EnrichmentTab'];

tabs.forEach(t => {
    let idx = txt.indexOf('function ' + t);
    if(idx===-1) return;
    let nextIdx = txt.length;
    for(let other of tabs) {
        if(other===t) continue;
        let oi = txt.indexOf('function ' + other);
        if(oi > idx && oi < nextIdx) nextIdx = oi;
    }
    let body = txt.substring(idx, nextIdx);
    const keywords = ['fetch', 'adminService', 'mock', 'dummy', 'placeholder'];
    const found = keywords.filter(k => new RegExp(k, 'i').test(body));
    console.log(t, '->', found.join(', '));
});
