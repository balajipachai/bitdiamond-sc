// SPDX-License-Identifier: UnLicensed
pragma solidity ^0.8.0;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";

/// @title StakeBitDiamond
contract StakeBitDiamond is Ownable {
    // solhint-disable-next-line var-name-mixedcase
    ERC20 public BTDMDContract =
        ERC20(0x669288ADA63ed65Eb3770f1c9eeB8956deDAaa47); // BTDMD BSC Contract Address

    // List of Stakers, helpful when fetching stakers report
    address[] public stakers;

    mapping(address => bool) public isStakerPresent;
    mapping(address => uint256) public stakeOf;
    mapping(address => uint256) public stakedAt;
    mapping(address => uint256) public stakeAmountForLastOneWeek;
    mapping(address => uint256) public stakeAmountForLastTwoWeeks;
    mapping(address => uint256) public stakeAmountForLastThreeWeeks;

    uint256 public totalBTDMDStaked;
    uint256 public reflectedTokensInContract;

    // Constant Values from BTDMD Contract
    uint256 private constant TAX_FEE = 400;
    uint256 private constant GRANULARITY = 100;

    event Stake(address indexed staker, uint256 amount, uint256 stakedAt);
    event UnStake(address indexed unStaker, uint256 amount, uint256 unStakedAt);

    /**
     * @dev Contract might receive/hold BNB as part of the maintenance process.
     * The receive function is executed on a call to the contract with empty calldata.
     */
    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    /**
     * @dev The fallback function is executed on a call to the contract if
     * none of the other functions match the given function signature.
     */
    fallback() external payable {}

    /**
     * @dev Transfers the Reflected tokens to the specified address
     * Requirements:
     * - Can only be invoked by owner of the contract
     */
    function transferReflectedTokensTo(address recipient) public onlyOwner {
        require(reflectedTokensInContract > 0, "BTDMD balance is 0");
        BTDMDContract.transfer(recipient, reflectedTokensInContract);
    }

    /**
     * @dev To stake BTDMD in the contract
     *
     * Requirements:
     * - Caller cannot be the zero address
     * - stakeAmount must be greater than 0
     * - BTDMD balance of Staker must be greater than or equal to stakeAmount
     */
    function stakeBTDMD(uint256 stakeAmount) public {
        require(msg.sender != address(0), "Caller cannot be zero address");
        require(stakeAmount > 0, "Stake amount must be > 0");
        uint256 stakerBTDMDBalance = BTDMDContract.balanceOf(msg.sender);
        require(
            stakerBTDMDBalance >= stakeAmount,
            "Caller balance < stakeAmount"
        );
        if (!isStakerPresent[msg.sender]) {
            stakers.push(msg.sender);
            //solhint-disable-next-line not-rely-on-time
            stakedAt[msg.sender] = block.timestamp;
            isStakerPresent[msg.sender] = true;
        }

        uint256 contractPreviousBalance =
            BTDMDContract.balanceOf(address(this));
        BTDMDContract.transferFrom(msg.sender, address(this), stakeAmount);
        uint256 actualStakedAmt = stakeAmount - getTransactionFee(stakeAmount);
        uint256 reflectedTokens;

        if (contractPreviousBalance == 0) {
            reflectedTokens =
                BTDMDContract.balanceOf(address(this)) -
                actualStakedAmt;
        } else {
            reflectedTokens =
                BTDMDContract.balanceOf(address(this)) -
                contractPreviousBalance -
                actualStakedAmt;
        }
        reflectedTokensInContract += reflectedTokens;
        stakeOf[msg.sender] += actualStakedAmt;
        totalBTDMDStaked += actualStakedAmt;
        updateStakeBalLastXDays(msg.sender, stakeOf[msg.sender]);
        emit Stake(msg.sender, actualStakedAmt, stakedAt[msg.sender]);
    }

    /**
     * @dev To unstake BTDMD from the contract
     *
     * Requirements:
     * - Caller cannot be the zero address
     * - Caller's staked BTDMD must be greater than 0
     * - Unstake amount must be less than or equal to the staked BTDMD
     * - Contract's BTDMD balance must be greater than staked BTDMD
     */
    function unStakeBTDMD(uint256 unstakeAmount) public {
        require(msg.sender != address(0), "Caller cannot be zero address");
        require(unstakeAmount > 0, "UnStake amount must be > 0");
        uint256 stakedBTDMD = stakeOf[msg.sender];
        require(stakedBTDMD > 0, "No Stakes");
        require(unstakeAmount <= stakedBTDMD, "Unstake amt > staked amt");
        require(
            BTDMDContract.balanceOf(address(this)) >= unstakeAmount,
            "Contract balance < staked BTDMD"
        );
        BTDMDContract.transfer(msg.sender, unstakeAmount);
        uint256 actualUnstakeAmt =
            unstakeAmount - getTransactionFee(unstakeAmount);
        //solhint-disable-next-line reentrancy
        stakeOf[msg.sender] -= actualUnstakeAmt;
        if (stakeOf[msg.sender] == 0) {
            //solhint-disable-next-line reentrancy
            stakedAt[msg.sender] = 0;
        }
        //solhint-disable-next-line reentrancy
        totalBTDMDStaked -= actualUnstakeAmt;
        updateStakeBalLastXDays(msg.sender, stakeOf[msg.sender]);
        //solhint-disable-next-line not-rely-on-time
        emit UnStake(msg.sender, actualUnstakeAmt, block.timestamp);
    }

    /**
     * @dev Returns the caller's staking details
     */
    function myStakes()
        public
        view
        returns (uint256 stakedBTDMD, uint256 daysStakedFor)
    {
        stakedBTDMD = stakeOf[msg.sender];
        daysStakedFor = stakedDays(msg.sender);
    }

    /**
     * @dev Returns all staker details
     */
    function allStakes()
        public
        view
        returns (
            uint256 stakedBTDMD,
            uint256 daysStakedFor,
            uint256 minBalForLastOneWeek,
            uint256 minBalForLastTwoWeeks,
            uint256 minBalForLastThreeWeeks
        )
    {
        stakedBTDMD = stakeOf[msg.sender];
        daysStakedFor = stakedDays(msg.sender);
        minBalForLastOneWeek = stakeAmountForLastOneWeek[msg.sender];
        minBalForLastTwoWeeks = stakeAmountForLastTwoWeeks[msg.sender];
        minBalForLastThreeWeeks = stakeAmountForLastThreeWeeks[msg.sender];
    }

    /**
     * @dev Updates the stake amount for last one week, two weeks & three weeks
     */
    function updateStakeBalLastXDays(address caller, uint256 updatedStakeAmt)
        internal
    {
        uint256 noOfDays = stakedDays(caller);
        if (noOfDays < 7) {
            stakeAmountForLastOneWeek[caller] = updatedStakeAmt;
        } else if (noOfDays >= 7 && noOfDays < 14) {
            stakeAmountForLastTwoWeeks[caller] = updatedStakeAmt;
        } else {
            stakeAmountForLastThreeWeeks[caller] = updatedStakeAmt;
        }
    }

    /**
     * @dev Returns the number of days for which BTDMD was staked
     */
    function stakedDays(address caller) internal view returns (uint256) {
        //solhint-disable-next-line not-rely-on-time
        return (block.timestamp - stakedAt[caller]) / 1 days;
    }

    /**
     * @dev Returns transaction fee
     */
    function getTransactionFee(uint256 tAmount)
        internal
        pure
        returns (uint256)
    {
        return (((tAmount * TAX_FEE) / GRANULARITY) / 100);
    }
}
