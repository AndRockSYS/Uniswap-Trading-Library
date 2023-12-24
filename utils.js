function convertPrice(price) {
    return price <= 1.0e-19 ? (price/1.0e-19).toFixed(4) + '*10⁻¹⁹' :
    price <= 1.0e-16 ? (price/1.0e-16).toFixed(4) + '*10⁻¹⁶' :
    price <= 1.0e-13 ? (price/1.0e-13).toFixed(4) + '*10⁻¹³' :
    price <= 1.0e-11 ? (price/1.0e-11).toFixed(4) + '*10⁻¹¹' :
    price <= 1.0e-9 ? (price/1.0e-9).toFixed(4) + '*10⁻⁹' :
    price <= 1.0e-6 ? (price/1.0e-6).toFixed(4) + '*10⁻⁶' :
    price <= 1.0e-3 ? (price/1.0e-3).toFixed(4) + '*10⁻³' :
    price.toFixed(4);
}

function convertAmount(amount) {
    return amount >= 1.0e+9 ? (amount / 1.0e+9).toFixed(2) + "B" : 
    amount >= 1.0e+6 ? (amount / 1.0e+6).toFixed(2) + "M" : 
    amount >= 1.0e+3 ? (amount / 1.0e+3).toFixed(2) + "K" : amount.toFixed(4);
}

async function sendTransaction(web3, sender, to, gas, data, value) {
    try{
        let gasPrice = await web3.eth.getGasPrice();
        let tx = await web3.eth.accounts.signTransaction({
            from: sender.address,
            to,
            value,
            gas: gas + 10000,
            gasPrice: Math.floor(gasPrice*1.15),
            data,
            //chainId: 5
        }, sender.privateKey);
        return await web3.eth.sendSignedTransaction(tx.rawTransaction);
    } catch(error) {console.log(error.message)}
}

utils = {
    convertAmount,
    convertPrice,
    sendTransaction
}

module.exports = utils;