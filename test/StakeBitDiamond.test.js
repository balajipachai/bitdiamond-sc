const { expectRevert, balance, constants, expectEvent, send, ether, time } = require('@openzeppelin/test-helpers')
const { assert } = require('chai');
const BigNumber = require('bignumber.js')
const StakeBitDiamond = artifacts.require("StakeBitDiamond")
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"))
const { BITDMDABI, BITDMDADDRESS } = require("../utils/constants")

contract('StakeBitDiamond is [Ownable]', (accounts) => {
    const [owner, nonOwner, recipient, staker1, staker2, staker3, transferAcc] = accounts
    const BTDMD_OWNER = "0xd34355e34f48580155a22557332b031421742d14";

    let stakeBitDiamondConInstance;
    let bitDiamondConInstance;
    let txObject;

    describe('StakeBitDiamond tests', () => {
        before(async () => {
            bitDiamondConInstance = new web3.eth.Contract(BITDMDABI, BITDMDADDRESS)
            stakeBitDiamondConInstance = await StakeBitDiamond.new({ from: owner })
        })
        context('BTDMD basic checks', () => {
            let name, symbol, tokenDecimals, totalSupply;
            it('should have token name to be `BitDiamond`', async () => {
                name = await bitDiamondConInstance.methods.name().call()
                assert.equal(name, 'BitDiamond', "Token name do not match")
            })
            it('should have token symbol to be `BTDMD`', async () => {
                symbol = await bitDiamondConInstance.methods.symbol().call()
                assert.equal(symbol, 'BTDMD', "Token symbol do not match")
            })
            it('should have token tokenDecimals to be 8', async () => {
                tokenDecimals = await bitDiamondConInstance.methods.decimals().call()
                assert.equal(tokenDecimals, 8, "Token decimals do not match")
            })
            it('should verify totalSupply is 21000000', async () => {
                totalSupply = new BigNumber(await bitDiamondConInstance.methods.totalSupply().call());
                assert.equal(totalSupply.toNumber(), 2.1e15, "Total supply do not match")
            })
        })

        context('receive', () => {
            it('contract should receive BNB', async () => {
                txObject = await stakeBitDiamondConInstance.send(new BigNumber(1e18), { from: owner })
                assert.equal(txObject.receipt.status, true, "Ether send failed")
            })
            it('should verify contract balance to be 1 BNB', async () => {
                const bal = await balance.current(stakeBitDiamondConInstance.address, 'ether')
                assert.equal(bal.toNumber(), 1, "Balances do not match")
            })
        })

        describe('transferReflectedTokensTo', () => {
            context('reverts', () => {
                it('when invoked by non-owner', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.transferReflectedTokensTo(recipient, { from: nonOwner }),
                        "Ownable: caller is not the owner"
                    )
                })
                it('when reflected token balance is 0', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.transferReflectedTokensTo(recipient, { from: owner }),
                        "BTDMD balance is 0"
                    )
                })
            })
        })

        describe('stakeBTDMD', () => {
            const STAKE_AMOUNT = 15e8; // 15 BTDMD
            const TRANSFER_BTDMD = 105e8 // 105 BTDMD
            context('reverts', () => {
                it('when stake amount is ZERO', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.stakeBTDMD(0, { from: staker1 }),
                        "Stake amount must be > 0"
                    )
                })
                it('when staker BTDMD balance is less than stake amount', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker1 }),
                        "Caller balance < stakeAmount"
                    )
                })
            })

            context('success', () => {
                before(async () => {
                    await send.ether(transferAcc, BTDMD_OWNER, ether('80'))
                    await bitDiamondConInstance.methods.transfer(staker1, TRANSFER_BTDMD).send({ from: BTDMD_OWNER })
                    await bitDiamondConInstance.methods.transfer(staker2, TRANSFER_BTDMD).send({ from: BTDMD_OWNER })
                    await bitDiamondConInstance.methods.transfer(staker3, TRANSFER_BTDMD).send({ from: BTDMD_OWNER })
                    // Approve StakeBTDMD contract from Staker's
                    await bitDiamondConInstance.methods.approve(stakeBitDiamondConInstance.address, constants.MAX_UINT256).send({ from: staker1 })
                    await bitDiamondConInstance.methods.approve(stakeBitDiamondConInstance.address, constants.MAX_UINT256).send({ from: staker2 })
                    await bitDiamondConInstance.methods.approve(stakeBitDiamondConInstance.address, constants.MAX_UINT256).send({ from: staker3 })
                })

                context('staker1, staker2 & staker3 stakes"s 15 BTDMD in first week', () => {
                    let actualStakeAmt, stakedAt
                    it('staker1 should stake successfully', async () => {
                        txObject = await stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker1 })
                        assert.equal(txObject.receipt.status, true, "Stake BTDMD failed")
                    })
                    it('should check for Stake event for staker1', async () => {
                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker1)
                        stakedAt = await stakeBitDiamondConInstance.stakedAt.call(staker1)
                        await expectEvent(
                            txObject.receipt,
                            'Stake',
                            {
                                staker: staker1,
                                amount: actualStakeAmt,
                                stakedAt
                            }
                        )
                    })
                    it('staker2 should stake successfully', async () => {
                        txObject = await stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker2 })
                        assert.equal(txObject.receipt.status, true, "Stake BTDMD failed")
                    })
                    it('should check for Stake event for staker1', async () => {
                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker2)
                        stakedAt = await stakeBitDiamondConInstance.stakedAt.call(staker2)
                        await expectEvent(
                            txObject.receipt,
                            'Stake',
                            {
                                staker: staker2,
                                amount: actualStakeAmt,
                                stakedAt
                            }
                        )
                    })
                    it('staker3 should stake successfully', async () => {
                        txObject = await stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker3 })
                        assert.equal(txObject.receipt.status, true, "Stake BTDMD failed")
                    })
                    it('should check for Stake event for staker3', async () => {
                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker3)
                        stakedAt = await stakeBitDiamondConInstance.stakedAt.call(staker3)
                        await expectEvent(
                            txObject.receipt,
                            'Stake',
                            {
                                staker: staker3,
                                amount: actualStakeAmt,
                                stakedAt
                            }
                        )
                    })
                })

                context('myStakes', () => {
                    let stakesOfStaker
                    let actualStakesOfStaker = []
                    let actualStakeAmt
                    before(async () => {
                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker1)
                        actualStakesOfStaker.push(actualStakeAmt.toNumber())

                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker2)
                        actualStakesOfStaker.push(actualStakeAmt.toNumber())

                        actualStakeAmt = await stakeBitDiamondConInstance.stakeOf.call(staker3)
                        actualStakesOfStaker.push(actualStakeAmt.toNumber())
                    })
                    it('should check stakes of staker1', async () => {
                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker1 })
                        assert.equal(stakesOfStaker.stakedBTDMD, actualStakesOfStaker[0], "Stakes do not match")
                    })
                    it('should check days staked for to be 0 for staker1', async () => {
                        assert.equal(stakesOfStaker.daysStakedFor, 0, "Staked days do not match")
                    })
                    it('should check stakes of staker2', async () => {
                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker2 })
                        assert.equal(stakesOfStaker.stakedBTDMD, actualStakesOfStaker[1], "Stakes do not match")
                    })
                    it('should check days staked for to be 0 for staker2', async () => {
                        assert.equal(stakesOfStaker.daysStakedFor, 0, "Staked days do not match")
                    })
                    it('should check stakes of staker3', async () => {
                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker3 })
                        assert.equal(stakesOfStaker.stakedBTDMD, actualStakesOfStaker[2], "Stakes do not match")
                    })
                    it('should check days staked for to be 0 for staker3', async () => {
                        assert.equal(stakesOfStaker.daysStakedFor, 0, "Staked days do not match")
                    })
                })

                context('allStakes', () => {
                    let stakeDetails = {
                        stakedBTDMD: 0,
                        daysStakedFor: 0,
                        minBalForLastOneWeek: 0,
                        minBalForLastTwoWeeks: 0,
                        minBalForLastThreeWeeks: 0
                    }
                    let stakesOfStaker
                    // 60 Seconds * 60 Minutes * 24 Hours * 7 Days
                    const SECONDS_IN_WEEK = 60 * 60 * 24 * 7
                    before(async () => {
                        // Get stakedBTDMD & daysStakedFor
                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker1 })
                        stakeDetails.stakedBTDMD = stakesOfStaker.stakedBTDMD.toNumber()
                        stakeDetails.daysStakedFor = stakesOfStaker.daysStakedFor.toNumber()
                        // Get minBalForLastOne/Two/Three Weeks
                        stakeDetails.minBalForLastOneWeek = (await stakeBitDiamondConInstance.stakeAmountForLastOneWeek.call(staker1)).toNumber()

                        // Forward time by 8 days, then again by 8 days 
                        // Perform Stake such that minBalForLastTwoWeeks & minBalForLastThreeWeeks are also populated
                        await time.increase(SECONDS_IN_WEEK)
                        await stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker1 })

                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker1 })
                        stakeDetails.stakedBTDMD = stakesOfStaker.stakedBTDMD.toNumber()
                        stakeDetails.daysStakedFor = stakesOfStaker.daysStakedFor.toNumber()
                        stakeDetails.minBalForLastTwoWeeks = (await stakeBitDiamondConInstance.stakeAmountForLastTwoWeeks.call(staker1)).toNumber()

                        await time.increase(SECONDS_IN_WEEK)
                        await stakeBitDiamondConInstance.stakeBTDMD(STAKE_AMOUNT, { from: staker1 })
                        stakesOfStaker = await stakeBitDiamondConInstance.myStakes.call({ from: staker1 })
                        stakeDetails.stakedBTDMD = stakesOfStaker.stakedBTDMD.toNumber()
                        stakeDetails.daysStakedFor = stakesOfStaker.daysStakedFor.toNumber()
                        stakeDetails.minBalForLastThreeWeeks = (await stakeBitDiamondConInstance.stakeAmountForLastThreeWeeks.call(staker1)).toNumber()
                    })

                    it('should check all stakes are matching for staker1', async () => {
                        const allStakes = await stakeBitDiamondConInstance.allStakes.call({ from: staker1 })
                        const { stakedBTDMD, daysStakedFor, minBalForLastOneWeek, minBalForLastTwoWeeks, minBalForLastThreeWeeks } = allStakes;
                        const stakeDetailsFromContract = {
                            stakedBTDMD: stakedBTDMD.toNumber(),
                            daysStakedFor: daysStakedFor.toNumber(),
                            minBalForLastOneWeek: minBalForLastOneWeek.toNumber(),
                            minBalForLastTwoWeeks: minBalForLastTwoWeeks.toNumber(),
                            minBalForLastThreeWeeks: minBalForLastThreeWeeks.toNumber()
                        }
                        assert.deepEqual(stakeDetails, stakeDetailsFromContract, "All stakes do not match")
                    })
                })
            })
        })

        describe('unStakeBTDMD', () => {
            const UNSTAKE_AMOUNT = 1e8; // 1 BTDMD
            context('reverts', () => {
                it('when un stake amount is ZERO', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.unStakeBTDMD(0, { from: staker1 }),
                        "UnStake amount must be > 0"
                    )
                })
                it('when staker there are no stakes', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.unStakeBTDMD(UNSTAKE_AMOUNT, { from: transferAcc }),
                        "No Stakes"
                    )
                })
                it('when unStake amount is greather than actual staked amount', async () => {
                    await expectRevert(
                        stakeBitDiamondConInstance.unStakeBTDMD(new BigNumber(UNSTAKE_AMOUNT * 20e8), { from: staker1 }),
                        "Unstake amt > staked amt"
                    )
                })
            })

            context('staker1 un stakes 10 BTDMD', () => {
                it('staker1 should unstake successfully', async () => {
                    txObject = await stakeBitDiamondConInstance.unStakeBTDMD(UNSTAKE_AMOUNT, { from: staker1 })
                    assert.equal(txObject.receipt.status, true, "UnStake BTDMD failed")
                })
                it('should check for UnStake event for staker1', async () => {
                    await expectEvent(
                        txObject.receipt,
                        'UnStake',
                        {
                            unStaker: staker1,
                            amount: '6540007269',
                            unStakedAt: await time.latest()
                        }
                    )
                })
            })
        })

        describe('transferReflectedTokensTo', () => {
            context('success', () => {
                let bal
                it('before transfer reflected tokens, should verify contract balance to be > 0', async () => {
                    bal = await stakeBitDiamondConInstance.reflectedTokensInContract.call();
                    assert.equal(bal > 0, true, "Balances do not match")
                })

                it('before transfer reflected tokens, should verify recipient balance to be 0 BTDMD', async () => {
                    bal = await bitDiamondConInstance.methods.balanceOf(recipient).call()
                    assert.equal(bal, 0, "Balances do not match")
                })

                it('should transfer reflected tokens from contract to recipient', async () => {
                    txObject = await stakeBitDiamondConInstance.transferReflectedTokensTo(recipient, { from: owner })
                    assert.equal(txObject.receipt.status, true, "Transfer reflected tokens failed")
                })

                it('after transfer reflected tokens, should verify contract balance to be 0 BTDMD', async () => {
                    bal = await stakeBitDiamondConInstance.reflectedTokensInContract.call();
                    assert.equal(bal, 0, "Balances do not match")
                })

                it('after transfer reflected tokens should verify recipient BTDMD balance > 0', async () => {
                    bal = await bitDiamondConInstance.methods.balanceOf(recipient).call()
                    assert.equal(bal > 0, true, "Balances do not match")
                })
            })
        })

    })
})