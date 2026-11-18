// Legacy automatic Instagram retry removed; the original approved publisher owns posts.
// Keep the former URL fail-closed after removing its Netlify schedule.
exports.handler = async () => ({ statusCode: 410, body: 'legacy recipe Instagram retries retired' });
