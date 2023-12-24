const ERC_20_ABI = require('./TokenABI/TokenABI.json');
const ROUTER_V2_ABI = require('./UniswapABI/RouterV2.json');
const ROUTER_V3_ABI = require('./UniswapABI/RouterV3.json');
const WETH_ABI = require('./TokenABI/WETH.json');

const ADDRESS = require('./address.json');

const getPrice = require('./price');
const utils = require('./utils');

async function swapTokens(web3, sender, request) {
    let result = request.isV3 ? await uniswapV3(web3, sender, request) : await uniswapV2(web3, sender, request);

    return result;
}

async function uniswapV2(web3, sender, request) {
    let router = new web3.eth.Contract(ROUTER_V2_ABI, ADDRESS.ROUTER_V2);
    let deadline = Date.now() + 30_000;
    let [amountIn, amountOut] = await getAmounts(web3, request);

    try{
        let data, gas;
        if(request.isBuy) {
            data = await router.methods.swapExactETHForTokens(amountOut, [request.pairToken, request.token], sender.address, deadline).encodeABI();
            gas = await router.methods.swapExactETHForTokens(amountOut, [request.pairToken, request.token], sender.address, deadline).estimateGas({
                from: sender.address,
                value: amountIn
            });
        } else {
            await approveToken(web3, sender, request.token, amountIn, router.options.address);
            data = await router.methods.swapExactTokensForETH(amountIn, amountOut, [request.token, request.pairToken], sender.address, deadline).encodeABI();
            gas = await router.methods.swapExactTokensForETH(amountIn, amountOut, [request.token, request.pairToken], sender.address, deadline).estimateGas({
                from: sender.address,
            });
        }
        let response = await utils.sendTransaction(web3, sender, router.options.address, gas, data, request.isBuy ? amountIn : 0);

        return response;
    } catch(error) {}
}

async function uniswapV3(web3, sender, request) {
    let router = new web3.eth.Contract(ROUTER_V3_ABI, ADDRESS.ROUTER_V3);
    let deadline = Date.now() + 30_000;
    let [amountIn, amountOut] = await getAmounts(web3, request);
    let data, gas;

    let params = {
        tokenIn: request.isBuy ? request.pairToken : request.token,
        tokenOut: request.isBuy ? request.token : request.pairToken,
        fee: 3000,
        recipient: sender.address,
        deadline,
        amountIn,
        amountOutMinimum: amountOut,
        sqrtPriceLimitX96: 0
    }

    try{
        if(request.isBuy) {
            data = await router.methods.exactInputSingle(params).encodeABI();
            gas = await router.methods.exactInputSingle(params).estimateGas({
                from: sender.address,
                value: amountIn
            });
        } else {
            await approveToken(web3, sender, request.token, request.amountIn, request.pair);
            data = await router.methods.exactInputSingle(params).encodeABI();
            gas = await router.methods.exactInputSingle(params).estimateGas({
                from: sender.address
            });
        }
    } catch(error) {}

    let response = await utils.sendTransaction(web3, sender, router.options.address, gas, data, request.isBuy ? amountIn : 0);

    if(!isBuy) {
        let WETHContract = web3.eth.Contract(WETH_ABI, ADDRESS.WETH);

        let balance = await WETHContract.methods.balanceOf(sender.address).call();
        balance = balance.toNumber();
        balance = balance.toLocaleString('fullwide', {useGrouping:false});

        data = await WETHContract.methods.withdraw(balance).encodeABI();
        gas = await WETHContract.methods.withdraw(balance).estimateGas({
            from: sender.address
        });

        response = await utils.sendTransaction(web3, sender, WETHContract.options.address, gas, data, 0);
    }

    return response;
}

async function approveToken(web3, sender, token, amount, router) {
    amount += '0';
    try{
        let tokenContract = new web3.eth.Contract(ERC_20_ABI, token);
        let data = await tokenContract.methods.approve(router, amount).encodeABI();
        let gas = await tokenContract.methods.approve(router, amount).estimateGas({
            from: sender.address
        });
        return await utils.sendTransaction(web3, sender, token, gas, data, 0);
    } catch(error) {}
}

async function getAmounts(web3, request) {
    let decimalsIn = request.isBuy ? 18 : request.decimals;
    let decimalsOut = request.isBuy ? request.decimals : 18;

    let price = await getPrice(web3, request, true);
    let amountOut = request.amountIn * price;

    amountIn = Math.floor(request.amountIn * 10**decimalsIn);
    amountOut = Math.floor(amountOut * 10**decimalsOut);
    amountOut -= amountOut * 0.1;

    amountIn = amountIn.toLocaleString('fullwide', {useGrouping:false});
    amountOut = amountOut.toLocaleString('fullwide', {useGrouping:false});

    return [amountIn, amountOut];
}

module.exports = swapTokens;