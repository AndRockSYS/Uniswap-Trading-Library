const ERC20_ABI = require('./TokenABI/TokenABI.json');
const SYMBOL_ABI = require('./TokenABI/SymbolABI.json');

const ADDRESS = require('./address.json');

class Token {
    constructor(address, symbol, decimals) {
        this.address = address;
        this.symbol = symbol;
        this.decimals = decimals;
    }
}

async function marketCap(web3, tokenAddress, decimals) {
    let token = new web3.eth.Contract(ERC20_ABI, tokenAddress);

    let totalSupply = await token.methods.totalSupply().call();

    let balance = await token.methods.balanceOf(token.options.address).call();
    let dead = await token.methods.balanceOf(ADDRESS.DEAD).call();
    let burnt = await token.methods.balanceOf(ADDRESS.ZERO).call();
      
    let marketCap = (totalSupply - balance - dead - burnt) / 10**decimals;
    return marketCap;
}

async function tokenInfo(web3, tokenAddress) {
    let tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress);
    let decimals;
    let symbol = "UNDEFINED"

    try {
        decimals = await tokenContract.methods.decimals().call();
        symbol = await tokenContract.methods.symbol().call();
    } catch(error) {}

    if(!symbol)
        try {
            let tokenContract = new web3.eth.Contract(SYMBOL_ABI, tokenAddress);
            symbol = await tokenContract.methods.symbol().call();
            symbol = await web3.utils.hexToString(symbol);
        } catch(error) {}

    return new Token(tokenAddress, symbol, decimals);
}

module.exports = [tokenInfo, marketCap];