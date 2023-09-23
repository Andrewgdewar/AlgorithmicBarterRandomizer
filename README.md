
# **DewardianDev's AlgorithmicBarterRandomizer**

=== INSTALL STEPS ===

1. Drag and drop this folder into the user/mods folder.
2. Update your mods/order.json so that this is last on the list.
3. Optionally change your configuration (see below configuration options).

4. ???????

5. Profit!!!!

Example order.json with recommended mods:
{
"order": [
"ServerValueModifier",
"zPOOP",
"Lua-CustomSpawnPoints",
"DewardianDev-XXXX",
"DewardianDev-AlgorithmicBarterRandomizer"
]
}



==== Configuration Options ====
{
    "enable": true,

    //Change this to change the randomizer, share seeds and difficulty with friends to get the same outcome!
    "seed": 2023,

    // This is the difficulty setting, lower is easier, higher is harder; around 0.7 is similar to live tarkov.
    "barterCostMultiplier": 0.6,

    // This turns on hardcore, which changes most cash items to barters (excluding ammo/mags)
    "enableHardcore": false,

    // These are the recommended settings for hardcore, feel free to change them if desired.
    "hardcoreSettings": {

        // This allows a few of the cheaper items to be purchasable with cash 
        // Be aware: this isn't a 1:1 rouble value.
        "cashItemCutoff": 10000,

        // Disables the open flee market (you can still use it to look for trader items)
        "disableFlee": true,

        // Traders' loyalty requirement of cash spent is drastically reduced
        // This is to compensate for less cash being used in general
        "reduceTraderLoyaltySpendRequirement": true,

        // Increases minimum buy counts from 1 > 5 for traded items 
        "increaseMinBuyCounts": true,

        // This is to balance the player using fence for everything 
        "reduceTraderBuyPrice": true

        // Excludes mags from the barter algorithm, turn this off to have to barter for them
         "excludeMagBarters": true
    },

    //Turn this on to figure out the correct custom trader name to add to the below "customTradersToInclude"
    "printUnkownTraders": false,

    // This is to add custom traders (Experimental: will be dependent on other modders db changes)
    "customTradersToInclude": [
        "SteveTheExampleGuyThatHasSalewas",
        "BobJustExampleBob"
    ],

    //Will print out the changes for each cash change barter
    "debugCashItems": false,

    //Will print out the changes for each barter
    "debug": false
}