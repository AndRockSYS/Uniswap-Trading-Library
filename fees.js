require('dotenv').config();
const axios = require('axios');

const BSC = process.env.BSC_TAX;
const ETH = process.env.ETH_TAX;

async function getTax(tokenAddress, isEth) {  
    let url = isEth ? ETH : BSC;

    try{
        let body = await axios.get(url + tokenAddress);
        if(!body.data.Error)
            return body.data;
    } catch(error) {}
}

module.exports = getTax;