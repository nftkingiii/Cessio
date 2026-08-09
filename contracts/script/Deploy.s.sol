// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CessioReceivables} from "../src/CessioReceivables.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

interface Vm {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Deploy MockUSDT and CessioReceivables to BOT Chain Testnet only.
contract Deploy {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external returns (MockUSDT token, CessioReceivables receivables) {
        address underwriter = vm.envAddress("UNDERWRITER_ADDRESS");
        vm.startBroadcast();
        token = new MockUSDT();
        receivables = new CessioReceivables(underwriter);
        vm.stopBroadcast();
    }
}
