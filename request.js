class Request {
    constructor(token, decimals, pairToken, amountIn, isBuy, isV3, pair) {
        this.pair = pair;
        this.token = token;
        this.decimals = decimals;
        this.pairToken = pairToken;
        this.amountIn = amountIn;
        this.isBuy = isBuy;
        this.isV3 = isV3;
    }
}

module.exports = Request;