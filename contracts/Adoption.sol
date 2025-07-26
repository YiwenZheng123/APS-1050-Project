pragma solidity ^0.5.0;

contract Adoption {
    address[16] public adopters;

    event Adopted(uint petId, address adopter);
    event Returned(uint petId, address returner, uint amount);

    // Adopting a pet
    function adopt(uint petId) public returns (uint) {
        require(petId <= 15, "Invalid petId");
        adopters[petId] = msg.sender;
        emit Adopted(petId, msg.sender);
        return petId;
    }

    // Returning a pet (with fee)
    function returnPet(uint petId) public payable returns (bool) {
        require(petId <= 15, "Invalid petId");
        require(adopters[petId] == msg.sender, "You didn't adopt this pet");
        require(msg.value >= 0.01 ether, "You must pay at least 0.01 ether to return");

        adopters[petId] = address(0);
        emit Returned(petId, msg.sender, msg.value);
        return true;
    }

    // Withdraw funds collected (only contract owner)
    address payable owner;

    constructor() public {
        owner = msg.sender;
    }

    function withdraw() public {
        require(msg.sender == owner, "Only owner can withdraw");
        owner.transfer(address(this).balance);
    }

    // Retrieving the adopters
    function getAdopters() public view returns (address[16] memory) {
        return adopters;
    }
}
