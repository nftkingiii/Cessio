// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CessioReceivables} from "../src/CessioReceivables.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploys CessioReceivables to BOT Chain Mainnet without a mock settlement token.
contract DeployMainnet {
    uint256 private constant BOT_CHAIN_MAINNET_ID = 677;
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error UnsupportedChain(uint256 chainId);
    error SettlementTokenHasNoCode(address settlementToken);

    function run() external returns (CessioReceivables receivables) {
        if (block.chainid != BOT_CHAIN_MAINNET_ID) revert UnsupportedChain(block.chainid);

        address underwriter = vm.envAddress("UNDERWRITER_ADDRESS");
        address settlementToken = vm.envAddress("SETTLEMENT_TOKEN_ADDRESS");
        if (settlementToken.code.length == 0) revert SettlementTokenHasNoCode(settlementToken);

        vm.startBroadcast();
        receivables = new CessioReceivables(underwriter);
        vm.stopBroadcast();
    }
}
