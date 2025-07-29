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
        petTemplate.find('.donation-amount').attr('data-id', data[i].id);
        petTemplate.find('.btn-donate').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }

    });

    await App.initWeb3();
    await App.markAdopted(); 
    await App.loadTopDonatedPet();


    return;

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

  App.web3 = new Web3(App.web3Provider);
  App.web3 = new Web3(App.web3.currentProvider);  
  await App.initContract();
},



    initContract: async function () {
    return new Promise((resolve, reject) => {
      $.getJSON('Adoption.json', function (data) {
        App.contracts.Adoption = TruffleContract(data);
        App.contracts.Adoption.setProvider(App.web3Provider);
        App.bindEvents(); 
        resolve();
      }).fail(reject);
    });
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

  window.ethereum.request({ method: 'eth_accounts' }).then(function (accounts) {
    if (!accounts || accounts.length === 0) {
      alert("No Ethereum accounts available. Please connect MetaMask.");
      return;
    }

    var account = accounts[0];

    App.contracts.Adoption.deployed().then(function (instance) {
      return instance.adoptWithTracking(petId, { from: account });
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

    App.web3.eth.getAccounts(function (error, accounts) {
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

    App.web3.eth.getAccounts(function (error, accounts) {
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

    var amountWei = App.web3.toWei(amountEth.toString(), 'ether');
  



    App.web3.eth.getAccounts(function (error, accounts) {
      if (error || accounts.length === 0) {
        console.error("No accounts found.");
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
        alert("Donation failed: " + err.message);
      });
    });
  },

  updateDonations: function () {
    App.contracts.Adoption.deployed().then(function (instance) {
      for (let i = 0; i < 16; i++) {
        instance.donations(i).then(function (amountWei) {
          if (typeof amountWei === "undefined") {
            console.warn(`Donation for pet ${i} is undefined`);
            return;
          }
         
          const amountEth = App.web3.fromWei(amountWei.toString(), 'ether');


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


// Feature 10: Show current user's adoption history
App.showMyAdoptionHistory = function () {
  App.web3.eth.getAccounts(function (error, accounts) {
    if (error || accounts.length === 0) {
      console.error("Cannot fetch accounts");
      return;
    }
    const account = accounts[0];

    App.contracts.Adoption.deployed().then(function (instance) {
      return instance.getUserAdoptionHistory.call(account);
    }).then(function (petIds) {
      const list = document.getElementById("adoptionHistoryList");
      if (!list) return;
      list.innerHTML = ""; 

      if (petIds.length === 0) {
        list.innerHTML = "<li>No pets adopted yet.</li>";
        return;
      }

      petIds.forEach(function (id) {
        const li = document.createElement("li");
        li.innerText = "Pet ID: " + id;
        list.appendChild(li);
      });
    }).catch(function (err) {
      console.error("Error fetching adoption history:", err);
    });
  });
};

App.loadTopDonatedPet = function () {
  App.contracts.Adoption.deployed().then(function (instance) {
    return instance.getTopDonatedPet.call();
  }).then(function (result) {
    const petId = result[0].toString();           
    const amountWei = result[1].toString();       
    const amountEth = App.web3.fromWei(amountWei, 'ether');  

    const target = document.getElementById("topDonatedPet");
    if (target) {
      target.innerText = `Pet ID: ${petId} — ${amountEth} ETH`;
    }
  }).catch(function (err) {
    console.error("Error loading top donated pet:", err);
  });
};





