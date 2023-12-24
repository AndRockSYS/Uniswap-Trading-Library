const PAIR_V3_ABI = require('./UniswapABI/PairV3.json');
const ROUTER_V2_ABI = require('./UniswapABI/RouterV2.json')

const ADDRESS = require('./address.json');

async function getPrice(web3, request, isRaw = false) {
    let price = 0;
    price = request.isV3 ? await uniswapV3(web3, request) : await uniswapV2(web3, request);

    if(!isRaw) {
        let WETH = await WETHPrice(web3);
        price *= WETH;
        console.log(`${price} Token/USDC`)
    }

    return price;
}

async function uniswapV2(web3, request) {
    let router = new web3.eth.Contract(ROUTER_V2_ABI, ADDRESS.ROUTER_V2)

    let path = request.isBuy ? [request.pairToken, request.token] : [request.token, request.pairToken];

    try{
        let prices = await router.methods.getAmountsOut((10**18).toString(), path).call();
        let price = parseInt(prices[1]) / 10**request.decimals;
        price = 1 / price;
        console.log(request.decimals, `${price} Token/WETH`)

        return price;
    } catch(error) {}
}

async function uniswapV3(web3, request) {
    let pool = new web3.eth.Contract(PAIR_V3_ABI, request.pair);

    try{
        let poolInfo = await pool.methods.slot0().call();
        let token0 = await pool.methods.token0().call();

        let price = (poolInfo.sqrtPriceX96 / (2 ** 96)) ** 2 / 10**(18-request.decimals);
        price = token0 == request.pairToken ? 1 / price : price;
        console.log(`${price} Token/WETH`)

        price = request.isBuy ? price : 1/price;

        return price;
    } catch(error) {}
}

async function WETHPrice(web3) {
    let router = new web3.eth.Contract(ROUTER_V2_ABI, ADDRESS.ROUTER_V2);
    let wei = (10**18).toString();
    let path = [ADDRESS.WETH, ADDRESS.USDC];
    
    try{
        let price = await router.methods.getAmountsOut(wei, path).call();
        return price[1]/10**6;
    } catch(error) {}
}

module.exports = getPrice;