// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {CessioReceivables, IERC20} from "../src/CessioReceivables.sol";
import {MockUSDT} from "../src/MockUSDT.sol";

interface Vm {
    function prank(address) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}

contract CessioReceivablesTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant UNDERWRITER = address(0xA11CE);
    address private constant ORIGINATOR = address(0xB0B);
    address private constant OBLIGOR = address(0xCAFE);
    address private constant FUNDER = address(0xF00D);
    address private constant OTHER = address(0xBAD);
    uint256 private constant PRINCIPAL = 1_000e6;
    uint256 private constant REPAYMENT = 1_100e6;

    MockUSDT private token;
    CessioReceivables private cessio;

    function setUp() public {
        vm.warp(1_800_000_000);
        token = new MockUSDT();
        cessio = new CessioReceivables(UNDERWRITER);
        token.mint(FUNDER, 2_000e6);
        token.mint(OBLIGOR, 2_000e6);
    }

    function testFullLifecycleDistributesYield() public {
        uint256 receivableId = _create();

        vm.prank(FUNDER);
        token.approve(address(cessio), PRINCIPAL);
        vm.prank(FUNDER);
        cessio.fund(receivableId, uint128(PRINCIPAL));
        CessioReceivables.Receivable memory receivable = cessio.getReceivable(receivableId);
        _assert(uint256(receivable.status) == uint256(CessioReceivables.Status.Funded));

        vm.prank(OBLIGOR);
        token.approve(address(cessio), REPAYMENT);
        vm.prank(OBLIGOR);
        cessio.repay(receivableId);

        uint256 balanceBefore = token.balanceOf(FUNDER);
        vm.prank(FUNDER);
        cessio.claim(receivableId);
        _assert(token.balanceOf(FUNDER) == balanceBefore + REPAYMENT);
    }

    function testOnlyUnderwriterCanCreateReceivable() public {
        vm.prank(OTHER);
        vm.expectRevert(CessioReceivables.Unauthorized.selector);
        cessio.createReceivable(
            ORIGINATOR,
            OBLIGOR,
            IERC20(address(token)),
            uint128(PRINCIPAL),
            uint128(REPAYMENT),
            uint64(block.timestamp + 7 days),
            keccak256("invoice"),
            keccak256("assessment")
        );
    }

    function testFundingCannotExceedPrincipal() public {
        uint256 receivableId = _create();
        vm.prank(FUNDER);
        token.approve(address(cessio), PRINCIPAL + 1);
        vm.prank(FUNDER);
        vm.expectRevert(CessioReceivables.FundingExceeded.selector);
        cessio.fund(receivableId, uint128(PRINCIPAL + 1));
    }

    function testOnlyObligorCanRepay() public {
        uint256 receivableId = _fund();
        vm.prank(OTHER);
        vm.expectRevert(CessioReceivables.Unauthorized.selector);
        cessio.repay(receivableId);
    }

    function testPartialFundingCanBeCancelledAndRefundedAfterDeadline() public {
        uint256 receivableId = _create();
        vm.prank(FUNDER);
        token.approve(address(cessio), 400e6);
        vm.prank(FUNDER);
        cessio.fund(receivableId, 400e6);

        vm.warp(block.timestamp + 8 days);
        cessio.cancelUnfunded(receivableId);
        uint256 balanceBefore = token.balanceOf(FUNDER);
        vm.prank(FUNDER);
        cessio.refund(receivableId);
        _assert(token.balanceOf(FUNDER) == balanceBefore + 400e6);
    }

    function _create() private returns (uint256) {
        vm.prank(UNDERWRITER);
        return cessio.createReceivable(
            ORIGINATOR,
            OBLIGOR,
            IERC20(address(token)),
            uint128(PRINCIPAL),
            uint128(REPAYMENT),
            uint64(block.timestamp + 7 days),
            keccak256("invoice"),
            keccak256("assessment")
        );
    }

    function _fund() private returns (uint256 receivableId) {
        receivableId = _create();
        vm.prank(FUNDER);
        token.approve(address(cessio), PRINCIPAL);
        vm.prank(FUNDER);
        cessio.fund(receivableId, uint128(PRINCIPAL));
    }

    function _assert(bool condition) private pure {
        require(condition, "assertion failed");
    }
}
