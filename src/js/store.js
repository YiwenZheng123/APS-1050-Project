App = {
  web3Provider: null,
  contracts: {},
  account: null,

  init: async function () {
    await App.loadProducts();

    await App.initWeb3();

    App.bindEvents();
  },

  loadProducts: function () {
    return new Promise((resolve, reject) => {
      $.getJSON('products.json', function (products) {
        const storeRow = $('#storeRow');
        storeRow.empty();

        products.forEach(product => {
          const productHTML = `
            <div class="col-sm-6 col-md-4 product-card">
              <div class="panel panel-default">
                <div class="panel-heading text-center"><strong>${product.name}</strong></div>
                <div class="panel-body text-center">
                  <img src="${product.picture}" class="img-responsive center-block" alt="${product.name}">
                  <p><strong>Price：</strong>${product.price} ETH</p>
                  <button class="btn btn-success buy-product" data-id="${product.id}" data-price="${product.price}">Buy</button>
                </div>
              </div>
            </div>
          `;
          storeRow.append(productHTML);
        });

        resolve();
      }).fail(function (jqxhr, textStatus, error) {
        console.error("load products failed:", textStatus, error);
        reject(error);
      });
    });
  },

  initWeb3: async function () {
  if (window.ethereum) {
    App.web3Provider = window.ethereum;
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      App.account = accounts[0];
    } catch (error) {
      console.error('User refused to connect wallet', error);
      return;
    }
  } else if (window.web3) {
    App.web3Provider = window.web3.currentProvider;
    const accounts = await new Web3(App.web3Provider).eth.getAccounts();
    App.account = accounts[0];
  } else {
    App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    const accounts = await new Web3(App.web3Provider).eth.getAccounts();
    App.account = accounts[0];
  }

  web3 = new Web3(App.web3Provider);

  if (!App.account) {
    console.warn("⚠️The account was not obtained. Check whether MetaMask is connected correctly.");
  } else {
    console.log("🔗Current Account: ", App.account);
  }

  return App.initContract();
},

  initContract: async function () {
    const data = await $.getJSON("Shop.json");
    App.contracts.Shop = TruffleContract(data);
    App.contracts.Shop.setProvider(App.web3Provider);
  },

  bindEvents: function () {
    $(document).on('click', '.buy-product', App.handleBuy);
  },

  handleBuy: async function (event) {
  event.preventDefault();

  const productId = parseInt($(event.target).data('id'));
  const priceEth = $(event.target).data('price');
  const priceWei = (BigInt(Math.floor(priceEth * 1e18))).toString();

  try {
    const account = App.account;
    if (!account) {
      alert("❌No account detected, please make sure the wallet is connected");
      return;
    }

    const instance = await App.contracts.Shop.deployed();

    await instance.buyProduct(productId, {
      from: account,
      value: priceWei
    });

    alert("✅Purchase successful! Product ID: " + productId);
  } catch (error) {
    console.error("Purchase failed: ", error);
    alert("❌Purchase failed " + (error.message || error));
  }
}
};

$(function () {
  $(window).on('load', function () {
    App.init();
  });
});
