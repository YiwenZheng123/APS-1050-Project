pragma solidity ^0.5.0;

contract Adoption {
    uint256 public maxAdoptionCount = 0;
    address[16] public adopters;
    uint public topDonatedPetId;
    uint public maxDonation;


    event Adopted(uint petId, address adopter);
    event Returned(uint petId, address returner, uint amount);
    event Voted(uint petId, uint newVoteCount);
    event Donated(uint petId, address donor, uint amount);

    // Store vote counts
    mapping(uint => uint) public voteCounts;

    // Store donations value
    mapping(uint => uint) public donations;
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

    // Voting for a pet
    function votePet(uint petId) public {
            require(petId <= 15, "Invalid petId");
            voteCounts[petId]++;
            emit Voted(petId, voteCounts[petId]);
        }

    // Donate for a particular pet
    function donateToPet(uint petId) public payable {
        require(petId <= 15, "Invalid petId");
        require(msg.value >= 0.01 ether, "Minimum donation is 0.01 ETH");

        donations[petId] += msg.value;
        emit Donated(petId, msg.sender, msg.value);
        updateTopDonatedPet(petId);
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
     
     
    // Add-on Feature 10: User adoption history 
    mapping(address => uint[]) public userAdoptionHistory; 

    // Modified adopt wrapper to be called by frontend instead of original adopt()
    function adoptWithTracking(uint petId) public returns (uint) {
        require(petId <= 15, "Invalid petId");
        require(adopters[petId] == address(0), "Pet already adopted");

        adopters[petId] = msg.sender;
        emit Adopted(petId, msg.sender);

        // Feature 10: track user history
        userAdoptionHistory[msg.sender].push(petId);

        return petId;
    }

    // Optional: get full adoption history of a user
    function getUserAdoptionHistory(address user) public view returns (uint[] memory) {
        return userAdoptionHistory[user];
    }

    function updateTopDonatedPet(uint petId) internal {
    if (donations[petId] > maxDonation) {
        maxDonation = donations[petId];
        topDonatedPetId = petId;
        }
    }

function getTopDonatedPet() public view returns (uint petId, uint amount) {
    return (topDonatedPetId, maxDonation);
    }


}
