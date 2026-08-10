// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CessioReceivables, IERC20} from "../src/CessioReceivables.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

interface VmLifecycle {
    function envAddress(string calldata name) external returns (address value);
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @notice Creates one wallet-signed, full Cessio lifecycle on BOT Chain Testnet.
/// @dev The same Testnet wallet assumes every demo role; this script is not for Mainnet.
contract TestnetLifecycle {
    VmLifecycle private constant vm =
        VmLifecycle(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint128 private constant PRINCIPAL = 100e6;
    uint128 private constant REPAYMENT = 105e6;

    function run() external returns (uint256 receivableId) {
        address operator = vm.envAddress("DEMO_WALLET_ADDRESS");
        MockUSDT token = MockUSDT(vm.envAddress("MOCK_USDT_ADDRESS"));
        CessioReceivables receivables =
            CessioReceivables(vm.envAddress("RECEIVABLES_ADDRESS"));

        vm.startBroadcast();
        token.mint(operator, REPAYMENT);
        receivableId = receivables.createReceivable(
            operator,
            operator,
            IERC20(address(token)),
            PRINCIPAL,
            REPAYMENT,
            uint64(block.timestamp + 7 days),
            keccak256("cessio:testnet:invoice-001"),
            keccak256("cessio:testnet:assessment-001")
        );
        token.approve(address(receivables), PRINCIPAL);
        receivables.fund(receivableId, PRINCIPAL);
        token.approve(address(receivables), REPAYMENT);
        receivables.repay(receivableId);
        receivables.claim(receivableId);
        vm.stopBroadcast();
    }
}
