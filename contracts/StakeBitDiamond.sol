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
        uint256 reflectedTokenBalance = BTDMDContract.balanceOf(address(this));
        require(reflectedTokenBalance > 0, "BTDMD balance is 0");
        BTDMDContract.transfer(recipient, reflectedTokenBalance);
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
        require(stakeAmount > 0, "Stake amount less than 0");
        uint256 stakerBTDMDBalance = BTDMDContract.balanceOf(msg.sender);
        require(
            stakerBTDMDBalance >= stakeAmount,
            "Caller balance < stakeAmount"
        );
        if (!isStakerPresent[msg.sender]) {
            stakers.push(msg.sender);
            //solhint-disable-next-line not-rely-on-time
            stakedAt[msg.sender] = block.timestamp;
        }
        stakeOf[msg.sender] += stakeAmount;
        totalBTDMDStaked += stakeAmount;
        updateStakeBalLastXDays(msg.sender, stakeOf[msg.sender]);
        BTDMDContract.transferFrom(msg.sender, address(this), stakeAmount);
        emit Stake(msg.sender, stakeAmount, stakedAt[msg.sender]);
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
        uint256 stakedBTDMD = stakeOf[msg.sender];
        require(stakedBTDMD > 0, "No Stakes");
        require(unstakeAmount <= stakedBTDMD, "Unstake amt > staked amt");
        require(
            BTDMDContract.balanceOf(address(this)) >= unstakeAmount,
            "Contract balance < staked BTDMD"
        );
        stakeOf[msg.sender] -= unstakeAmount;
        if (stakeOf[msg.sender] == 0) {
            stakedAt[msg.sender] = 0;
        }
        totalBTDMDStaked -= unstakeAmount;
        updateStakeBalLastXDays(msg.sender, stakeOf[msg.sender]);
        BTDMDContract.transfer(msg.sender, stakedBTDMD);
        //solhint-disable-next-line not-rely-on-time
        emit UnStake(msg.sender, unstakeAmount, block.timestamp);
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
            address[] memory wallets,
            uint256[] memory stakedBTDMD,
            uint256[] memory daysStakedFor,
            uint256[] memory minBalForLastOneWeek,
            uint256[] memory minBalForLastTwoWeeks,
            uint256[] memory minBalForLastThreeWeeks
        )
    {
        address staker;
        for (uint256 i = 0; i < stakers.length; i++) {
            staker = stakers[i];
            stakedBTDMD[i] = stakeOf[staker];
            daysStakedFor[i] = stakedDays(staker);
            wallets[i] = staker;
            minBalForLastOneWeek[i] = stakeAmountForLastOneWeek[staker];
            minBalForLastTwoWeeks[i] = stakeAmountForLastTwoWeeks[staker];
            minBalForLastThreeWeeks[i] = stakeAmountForLastThreeWeeks[staker];
        }
    }

    /**
     * @dev Updates the stake amount for last one week, two weeks & three weeks
     */
    function updateStakeBalLastXDays(address caller, uint256 updatedStakeAmt)
        internal
    {
        uint256 noOfDays = stakedDays(caller);
        if (noOfDays <= 7) {
            stakeAmountForLastOneWeek[caller] = updatedStakeAmt;
        } else if (noOfDays > 7 && noOfDays <= 14) {
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
}
