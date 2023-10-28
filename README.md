
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