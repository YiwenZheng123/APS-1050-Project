pragma solidity ^0.5.0;

contract Shop {
    address[6] public buyers;  

    event Bought(uint productId, address buyer);

    function buyProduct(uint productId) public payable {
        require(productId < buyers.length, "Invalid productId");
        require(buyers[productId] == address(0), "Product already sold");
        require(msg.value > 0, "Must send some ether to buy");

        buyers[productId] = msg.sender;

        emit Bought(productId, msg.sender);
    }

    function getBuyers() public view returns (address[6] memory) {
        return buyers;
    }
}
