module.exports = {
    norpc: true,
    port: 8555,
    buildDirPath: "/build",
    copyPackages: ['openzeppelin-solidity'],
    skipFiles: [
        'Migrations.sol',
    ],
    providerOptions: {
        default_balance_ether: '10000000000000000000000000',
    },
};

