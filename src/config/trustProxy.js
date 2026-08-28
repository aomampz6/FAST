function parseTrustProxy(value) {
    return value === '1' ? 1 : false;
}

module.exports = { parseTrustProxy };
