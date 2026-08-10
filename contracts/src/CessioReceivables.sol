// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @notice Minimal, non-custodial testnet marketplace for AI-approved receivables.
/// @dev The underwriter role represents the backend's signed approval, not an oracle guarantee.
contract CessioReceivables {
    enum Status {
        None,
        Funding,
        Funded,
        Repaid,
        Cancelled
    }

    struct Receivable {
        address originator;
        address obligor;
        IERC20 settlementToken;
        uint128 principal;
        uint128 repaymentAmount;
        uint64 fundingDeadline;
        Status status;
        bytes32 invoiceDigest;
        bytes32 assessmentDigest;
        uint128 totalFunded;
    }

    address public owner;
    address public underwriter;
    uint256 public nextReceivableId = 1;
    bool private locked;

    mapping(uint256 receivableId => Receivable receivable) public receivables;
    mapping(uint256 receivableId => mapping(address funder => uint256 amount)) public fundedBy;
    mapping(uint256 receivableId => mapping(address funder => bool claimed)) public claimed;

    event UnderwriterUpdated(address indexed previousUnderwriter, address indexed newUnderwriter);
    event ReceivableCreated(
        uint256 indexed receivableId,
        address indexed originator,
        address indexed obligor,
        address settlementToken,
        uint256 principal,
        uint256 repaymentAmount,
        uint256 fundingDeadline,
        bytes32 invoiceDigest,
        bytes32 assessmentDigest
    );
    event Funded(
        uint256 indexed receivableId, address indexed funder, uint256 amount, uint256 totalFunded
    );
    event Repaid(uint256 indexed receivableId, address indexed obligor, uint256 amount);
    event Claimed(uint256 indexed receivableId, address indexed funder, uint256 amount);
    event Cancelled(uint256 indexed receivableId);
    event Refunded(uint256 indexed receivableId, address indexed funder, uint256 amount);

    error Unauthorized();
    error ZeroAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidStatus();
    error FundingClosed();
    error FundingNotComplete();
    error FundingExceeded();
    error AlreadyClaimed();
    error NoFundsAvailable();
    error TokenTransferFailed();
    error Reentrancy();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyUnderwriter() {
        if (msg.sender != underwriter) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(address initialUnderwriter) {
        if (initialUnderwriter == address(0)) revert ZeroAddress();
        owner = msg.sender;
        underwriter = initialUnderwriter;
    }

    function setUnderwriter(address newUnderwriter) external onlyOwner {
        if (newUnderwriter == address(0)) revert ZeroAddress();
        emit UnderwriterUpdated(underwriter, newUnderwriter);
        underwriter = newUnderwriter;
    }

    function getReceivable(uint256 receivableId) external view returns (Receivable memory) {
        return receivables[receivableId];
    }

    function createReceivable(
        address originator,
        address obligor,
        IERC20 settlementToken,
        uint128 principal,
        uint128 repaymentAmount,
        uint64 fundingDeadline,
        bytes32 invoiceDigest,
        bytes32 assessmentDigest
    ) external onlyUnderwriter returns (uint256 receivableId) {
        if (
            originator == address(0) || obligor == address(0)
                || address(settlementToken) == address(0)
        ) {
            revert ZeroAddress();
        }
        if (principal == 0 || repaymentAmount < principal) revert InvalidAmount();
        if (fundingDeadline <= block.timestamp) revert InvalidDeadline();

        receivableId = nextReceivableId++;
        receivables[receivableId] = Receivable({
            originator: originator,
            obligor: obligor,
            settlementToken: settlementToken,
            principal: principal,
            repaymentAmount: repaymentAmount,
            fundingDeadline: fundingDeadline,
            status: Status.Funding,
            invoiceDigest: invoiceDigest,
            assessmentDigest: assessmentDigest,
            totalFunded: 0
        });

        emit ReceivableCreated(
            receivableId,
            originator,
            obligor,
            address(settlementToken),
            principal,
            repaymentAmount,
            fundingDeadline,
            invoiceDigest,
            assessmentDigest
        );
    }

    function fund(uint256 receivableId, uint128 amount) external nonReentrant {
        Receivable storage receivable = receivables[receivableId];
        if (receivable.status != Status.Funding) revert InvalidStatus();
        if (block.timestamp > receivable.fundingDeadline) revert FundingClosed();
        if (amount == 0) revert InvalidAmount();
        if (uint256(receivable.totalFunded) + amount > receivable.principal) {
            revert FundingExceeded();
        }

        _pullExact(receivable.settlementToken, msg.sender, amount);
        receivable.totalFunded += amount;
        fundedBy[receivableId][msg.sender] += amount;
        if (receivable.totalFunded == receivable.principal) {
            receivable.status = Status.Funded;
            _push(receivable.settlementToken, receivable.originator, receivable.principal);
        }
        emit Funded(receivableId, msg.sender, amount, receivable.totalFunded);
    }

    function repay(uint256 receivableId) external nonReentrant {
        Receivable storage receivable = receivables[receivableId];
        if (receivable.status != Status.Funded) revert InvalidStatus();
        if (msg.sender != receivable.obligor) revert Unauthorized();

        _pullExact(receivable.settlementToken, msg.sender, receivable.repaymentAmount);
        receivable.status = Status.Repaid;
        emit Repaid(receivableId, msg.sender, receivable.repaymentAmount);
    }

    function claim(uint256 receivableId) external nonReentrant {
        Receivable storage receivable = receivables[receivableId];
        if (receivable.status != Status.Repaid) revert InvalidStatus();
        if (claimed[receivableId][msg.sender]) revert AlreadyClaimed();
        uint256 contribution = fundedBy[receivableId][msg.sender];
        if (contribution == 0) revert NoFundsAvailable();

        claimed[receivableId][msg.sender] = true;
        uint256 payout = (contribution * receivable.repaymentAmount) / receivable.principal;
        _push(receivable.settlementToken, msg.sender, payout);
        emit Claimed(receivableId, msg.sender, payout);
    }

    function cancelUnfunded(uint256 receivableId) external {
        Receivable storage receivable = receivables[receivableId];
        if (receivable.status != Status.Funding) revert InvalidStatus();
        if (block.timestamp <= receivable.fundingDeadline) revert FundingClosed();
        receivable.status = Status.Cancelled;
        emit Cancelled(receivableId);
    }

    function refund(uint256 receivableId) external nonReentrant {
        Receivable storage receivable = receivables[receivableId];
        if (receivable.status != Status.Cancelled) revert InvalidStatus();
        uint256 contribution = fundedBy[receivableId][msg.sender];
        if (contribution == 0) revert NoFundsAvailable();

        fundedBy[receivableId][msg.sender] = 0;
        _push(receivable.settlementToken, msg.sender, contribution);
        emit Refunded(receivableId, msg.sender, contribution);
    }

    function _pullExact(IERC20 token, address from, uint256 amount) private {
        uint256 balanceBefore = token.balanceOf(address(this));
        if (!token.transferFrom(from, address(this), amount)) revert TokenTransferFailed();
        if (token.balanceOf(address(this)) != balanceBefore + amount) revert TokenTransferFailed();
    }

    function _push(IERC20 token, address to, uint256 amount) private {
        if (!token.transfer(to, amount)) revert TokenTransferFailed();
    }
}
