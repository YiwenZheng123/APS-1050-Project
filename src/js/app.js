App = {
  web3Provider: null,
  contracts: {},

  init: async function () {
    $.getJSON('../pets.json', function (data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (let i = 0; i < data.length; i++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);
        petTemplate.find('.btn-return').attr('data-id', data[i].id);
        petTemplate.find('.btn-vote').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error('User denied account access');
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function () {
    $.getJSON('Adoption.json', function (data) {
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);
      App.contracts.Adoption.setProvider(App.web3Provider);

      return App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
    $(document).on('click', '.btn-return', App.handleReturn);
    $(document).on('click', '.btn-vote', App.handleVote);
    $(document).on('click', '.btn-donate', App.handleDonate);


  },

  markAdopted: function () {
    App.contracts.Adoption.deployed().then(function (instance) {
      return instance.getAdopters.call();
    }).then(function (adopters) {
      for (let i = 0; i < adopters.length; i++) {
        const petPanel = $('.panel-pet').eq(i);
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          petPanel.find('.btn-adopt').text('Adopted').attr('disabled', true);
          petPanel.find('.btn-return').attr('disabled', false);
        } else {
          petPanel.find('.btn-adopt').text('Adopt').attr('disabled', false);
          petPanel.find('.btn-return').attr('disabled', true);
        }
      }
      App.updateVoteCounts();
      App.updateDonations();
    }).catch(function (err) {
      console.log(err.message);
    });
  },

  handleAdopt: function (event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        return;
      }
      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function (instance) {
        return instance.adopt(petId, { from: account });
      }).then(function () {
        return App.markAdopted();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },

  handleReturn: function (event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));
    console.log("Returning petId:", petId); ///////

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        return;
      }
      var account = accounts[0];
      console.log("From account:", account);/////

      App.contracts.Adoption.deployed().then(function (instance) {
        return instance.returnPet(petId, { from: account, value: '10000000000000000' }); 
      }).then(function () {
        return App.markAdopted();
      }).catch(function (err) {
        console.error("Return transaction error:", err.message);
        console.error("Return transaction full error:", err);
        alert("Return failed: " + (err.message || JSON.stringify(err)));
      });
    });
  },
  handleVote: function (event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        return;
      }
      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function (instance) {
        return instance.votePet(petId, { from: account });
      }).then(function () {
        return App.updateVoteCounts();
      }).catch(function (err) {
        console.log(err.message);
      });
    });
  },
  updateVoteCounts: function () {
    App.contracts.Adoption.deployed().then(function (instance) {
      for (let i = 0; i < 16; i++) {
        instance.voteCounts(i).then(function (count) {
          $('.panel-pet').eq(i).find('.vote-count').text("Votes: " + count.toString());
        });
      }
    });
  },

  handleDonate: function (event) {
    event.preventDefault();
    var petId = parseInt($(event.target).data('id'));
    var inputSelector = '.donation-amount[data-id="' + petId + '"]';
    var amountEth = parseFloat($(inputSelector).val());

    if (isNaN(amountEth) || amountEth < 0.01) {
      alert("Please enter a valid donation amount in ETH.");
      return;
    }

    var amountWei = web3.toWei(amountEth, 'ether');

    web3.eth.getAccounts(function (error, accounts) {
      if (error) {
        console.log(error);
        return;
      }
      var account = accounts[0];

      App.contracts.Adoption.deployed().then(function (instance) {
        return instance.donateToPet(petId, {
          from: account,
          value: amountWei
        });
      }).then(function () {
        return App.updateDonations();
      }).catch(function (err) {
        console.error("Donation failed:", err.message);
      });
    });
  },

  updateDonations: function () {
    App.contracts.Adoption.deployed().then(function (instance) {
      for (let i = 0; i < 16; i++) {
        instance.donations(i).then(function (amountWei) {
          const amountEth = web3.fromWei(amountWei, 'ether');
          $('.panel-pet').eq(i).find('.donation-total').text("Donated: " + amountEth + " ETH");
        });
      }
    });
  }



};


$(function () {
  $(window).load(function () {
    App.init();
  });
});
