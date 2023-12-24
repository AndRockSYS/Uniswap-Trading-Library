const FACTORY_V2_ABI = require('./UniswapABI/FactoryV2.json');
const FACTORY_V3_ABI = require('./UniswapABI/FactoryV3.json');

const ADDRESS = require('./address.json');

class Pair {
    constructor(pair, token, pairToken, isV3) {
        this.pair = pair;
        this.token = token;
        this.pairToken = pairToken;
        this.isV3 = isV3;
    }
}

async function checkVersion(web3, tokenAddress) {
    let factoryV2 = new web3.eth.Contract(FACTORY_V2_ABI, ADDRESS.FACTORY_V2);
    let factoryV3 = new web3.eth.Contract(FACTORY_V3_ABI, ADDRESS.FACTORY_V3);

    let [pairAddress, pairToken, isV3] = await getPairAddress(factoryV2, factoryV3, tokenAddress)
    
    return pairAddress ? new Pair(pairAddress, tokenAddress, pairToken, isV3) : null;
}

async function getPairAddress(factoryV2, factoryV3, tokenAddress) {
    let v2 = await factoryV2.methods.getPair(tokenAddress, ADDRESS.WETH).call();

    if(v2 != ADDRESS.ZERO)
        return [v2, ADDRESS.WETH, false];

    let v3 = await factoryV3.methods.getPool(tokenAddress, ADDRESS.WETH, 3000).call();

    if(v3 != ADDRESS.ZERO)
        return [v3, ADDRESS.WETH, true];

    return [null, null, null];
}

module.exports = checkVersion;