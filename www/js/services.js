// SERVICES
angular.module('casinocoin.services', [])

.factory('publicAPI', function ($http, $log) {
    var publicApiURL = 'http://api.casinocoin.org/CSCPublicAPI';
    var config = {
        headers: { 'Accept': '"application/json"' },
        timeout: 5000
    };
    return {
        getCoinInfo: function () {
            $log.debug('### getCoinInfo ###');
            return $http.get(publicApiURL + '/CoinInfo', config).then(
                function (response) {
                     return response;
                }, function (error) {
                    return error;
                }
            );
        },
        getActiveExchanges: function () {
            $log.debug('### getActiveExchanges ###');
            return $http.get(publicApiURL + '/ActiveExchanges', config).then(
                function (response) {
                    return response;
                }, function (error) {
                    return error;
                }
            );
        },
        registerUser: function (newUserObject) {
            $log.debug('### registerUser ###');
            return $http.post('https://wallet.casinocoin.org/UserRegistration/RegisterUser', newUserObject, config).then(
                function (response) {
                    return response;
                }, function (error) {
                    return error;
                }
            );
        }
    }
})

.factory('oauth2', function ($http, $rootScope, $log) {
    return {
        getToken: function (username, password) {
            $log.debug('### getToken ###');
            var postData = "grant_type=password&client_id=" + $rootScope.security.clientid +
                           "&client_secret=" + $rootScope.security.clientsecret +
                           "&username=" + username +
                           "&password=" + password;
            return $http.post('https://wallet.casinocoin.org/oauth2/token',
                              postData,
                              { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }).then(
                                    function (response) {
                                        $log.debug("### oauth2 response ###");
                                        return response;
                                    }, function (error) {
                                        $log.debug("### oauth2 error ###");
                                        return error;
                                    }
            );
        },
        refreshToken: function () {
            $log.debug('### refreshToken ###');
            return $http.get('http://api.casinocoin.org/CSCPublicAPI/ActiveExchanges');
        }
    }
})

.factory('insight', function ($http, $q, $cordovaNetwork, $log) {
    var insightURL = 'http://insight.casinocoin.info/api';
    var config = { 
        headers: { 'Accept': '"application/json"' }, 
        timeout: 3000 
    };
    return {
        getBlock: function (blockHash) {
            return $http.get(insightURL + '/block/' + blockHash, config).then(
                function (response) {
                    if (response.status == 200)
                        return response;
                    else
                        reject('Error executing getBlock method');
                }, function (error) {
                    return error;
                }
            );
        },
        getTransaction: function (txID) {
            return $http.get(insightURL + '/tx/' + txID, config).then(
                function (response) {
                    return response;
                }, function (error) {
                    return error;
                }
            );
        },
        getAddress: function (pubAddress) {
            return $q(function (resolve, reject) {
                if ($cordovaNetwork.isOnline()) {
                    $http.get(insightURL + '/addr/' + pubAddress, config).then(
                        function (response) {
                            if (response.status == 200)
                                resolve(response);
                            else
                                reject('Error executing getAddress method');
                        }, function (error) {
                            reject(error);
                        }
                    );
                } else {
                    reject('There is no network connection available');
                }
            });
        },
        getUnspentOutputs: function (pubAddress) {
            return $http.get(insightURL + '/addr/' + pubAddress + '/utxo', config).then(
                function (response) {
                    return response;
                }, function (error) {
                    return error;
                }
            );
        },
        postTransaction: function (rawTransaction) {
            return $http.post(insightURL + '/tx/send', { rawtx: rawTransaction }, config).then(
                function (response) {
                    return response;
                }, function (error) {
                    return error;
                }
            );
        }
    }
})

.factory('WalletService', function ($q, $log, $filter, $http, Loki, ngToast, insight, $rootScope, $ionicLoading) {
    // load bitcore lib
    var bitcore = require('bitcore');
    // define db
    var walletDB;
    var initComplete = false;
    // define doc collections
    var wallets;
    var receiveAddresses;
    var sendAddresses;
    var privateKeysMap = [];

    return {
        initDB: initDB,
        // Wallet methods
        getWallets: getWallets,
        createWallet: createWallet,
        encryptWalletKeys: encryptWalletKeys,
        decryptWalletKeys: decryptWalletKeys,
        addNewWalletAddress: addNewWalletAddress,
        updateWallet: updateWallet,
        deleteWallet: deleteWallet,
        getWalletBalance: getWalletBalance,
        handleIncommingTX: handleIncommingTX,
        subscribeWalletTX: subscribeWalletTX,
        sendCoins: sendCoins,
        getPrivateKey: getPrivatekey,
        setPrivateKey: setPrivateKey,
        clearPrivateKeys: clearPrivateKeys,
        // Address methods
        validateAddress: validateAddress,
        getReceiveAddresses: getReceiveAddresses,
        addReceiveAddress: addReceiveAddress,
        updateReceiveAddress: updateReceiveAddress,
        deleteReceiveAddress: deleteReceiveAddress,
        getSendAddresses: getSendAddresses,
        addSendAddress: addSendAddress,
        updateSendAddress: updateSendAddress,
        deleteSendAddress: deleteSendAddress
    };

    function initDB() {
        return $q(function (resolve, reject) {
            var fsAdapter = new LokiCordovaFSAdapter({ "prefix": "loki" });
            walletDB = new Loki('walletDB',
                {
                    autoload: true,
                    autoloadCallback: loadHandler,
                    autosave: true,
                    autosaveInterval: 10000, // save wallet every 5 seconds
                    persistenceAdapter: fsAdapter
                });
            // auto load callback
            function loadHandler() {
                $log.debug("### LokiJS Auto Load DB Callback ###");
                // init collections if not existing
                wallets = walletDB.getCollection('wallets');
                if (!wallets) {
                    wallets = walletDB.addCollection('wallets');
                }
                receiveAddresses = walletDB.getCollection('receiveAddresses');
                if (!receiveAddresses) {
                    receiveAddresses = walletDB.addCollection('receiveAddresses');
                }
                sendAddresses = walletDB.getCollection('sendAddresses');
                if (!sendAddresses) {
                    sendAddresses = walletDB.addCollection('sendAddresses');
                }
                initComplete = true;
                resolve();
            }
        });
    };

    function getWallets() {
        return $q(function (resolve, reject) {
            if (initComplete) {
                resolve(wallets);
            } else {
                reject("### Initialisation of WalletDB is not complete! ###")
            }
        });
    };

    function createWallet(passPhrase) {
        return $q(function (resolve, reject) {
            var HierarchicalKey = bitcore.HierarchicalKey;
            var coinUtil = bitcore.util;
            var networks = bitcore.networks;
            var Address = bitcore.Address;
            var seedBytes = coinUtil.sha256(passPhrase);
            var hierarchicalKey = HierarchicalKey.seed(seedBytes);
            $log.debug('### Extended Private base58:' + hierarchicalKey.extendedPrivateKeyString('base58'));
            var derivedM000 = hierarchicalKey.derive('m/0/0/0');
            var privKeyM000 = new bitcore.PrivateKey(networks.livenet.privKeyVersion, derivedM000.eckey.private, derivedM000.eckey.compressed);
            var masterAddress = Address.fromPubKey(hierarchicalKey.eckey.public).toString();
            var M000Address = Address.fromPubKey(derivedM000.eckey.public).toString();
            $log.debug("### m/0/0/0 address: " + M000Address);
            var wallet =
                {
                    "creationDate": $filter('date')(new Date(), "yyyy-MM-dd'T'HH:mm:ss.sss", "UTC"),
                    "defaultAddress": M000Address,
                    "masterPrivateKey": hierarchicalKey.extendedPrivateKeyString('base58'),
                    "masterPublicAddress": masterAddress,
                    "addresses": [{ "address": M000Address, "creationDate": $filter('date')(new Date(), "yyyy-MM-dd'T'HH:mm:ss.sss", "UTC") }]
                };
            // get address object
            insight.getAddress(M000Address).then(function (response) {
                $log.debug("### getAddress Response: " + JSON.stringify(response));
                addReceiveAddress(response.data);
                $log.debug("### Wallet Object: " + JSON.stringify(wallet));
                wallets.insert(wallet);
                resolve(wallet);
            }, function (error) {
                $log.error("### Create Wallet Error: " + JSON.stringify(error));
                reject(error);
            });
        });
    };

    function encryptWalletKeys($scope, pincode) {
        return $q(function (resolve, reject) {
            $rootScope.encryptPercentage = 0;
            var loadingContent = 'Encrypting Keys ..<br><ion-spinner icon="bubbles" class="spinner-assertive"></ion-spinner>';
            $ionicLoading.show({
                template: loadingContent,
                showBackdrop: true,
                delay: 0,
                hideOnStateChange: false
            }).then(function () {
                setTimeout(function () {
                    $log.debug("### Loader showing, do key encryption");
                    $log.debug("### encryptWalletKeys Scope Wallet: " + JSON.stringify($scope.wallet));
                    var secret = pincode + $rootScope.UUID;
                    var walletWorker = new Worker('js/walletworker.js');
                    // handle message from walletWorker
                    walletWorker.onmessage = function (eventMessage) {
                        // $log.debug('### WalletWorker eventMessage: ' + JSON.stringify(eventMessage.data));
                        if (eventMessage.data.messageType == 'status') {
                            var progress = Math.round(eventMessage.data.content.percent);
                            $rootScope.encryptPercentage = progress;
                            $ionicLoading.show({
                                template: loadingContent
                            });
                        } else if (eventMessage.data.messageType == 'result') {
                            $ionicLoading.hide();
                            $log.debug("### Encrypt Result: " + eventMessage.data.content);
                            $scope.wallet.masterPrivateKey = eventMessage.data.content;
                            // save the database
                            walletDB.saveDatabase();
                            // clear cached private keys from memory
                            clearPrivateKeys();
                            resolve();
                        } else if (eventMessage.data.messageType == 'error') {
                            $ionicLoading.hide();
                            $log.debug("### Encrypt Error: " + eventMessage.data.content);
                            reject(eventMessage.data.content);
                        } else if (eventMessage.data.messageType == 'log') {
                            $log.debug("### Encrypt Log: " + eventMessage.data.content);
                        }
                    }
                    // post encryption data to walletWorker
                    $log.debug("### Encrypt with PIN: " + pincode + " UUID: " + $rootScope.UUID);
                    if ($scope.wallet.masterPrivateKey.substr(0, 4) == "xprv") {
                        walletWorker.postMessage({ messageType: 'encrypt', content: { privateWIF: $scope.wallet.masterPrivateKey, secretPIN: pincode, deviceUUID: $rootScope.UUID } });
                    }
                }, 500);
            });
        });
    };

    function decryptWalletKeys($scope, pincode) {
        return $q(function (resolve, reject) {
            $rootScope.decryptPercentage = 0;
            $scope.loaderIsShowing = false;
            var loadingContent = 'Decrypting Keys ..<br><ion-spinner icon="bubbles" class="spinner-assertive"></ion-spinner>';
            $ionicLoading.show({
                template: loadingContent,
                showBackdrop: true,
                delay: 0,
                hideOnStateChange: false
            }).then(function () {
                setTimeout(function () {
                    $log.debug("### Loader showing, do key decryption");
                    $log.debug("### decryptWalletKeys Scope Wallet: " + JSON.stringify($scope.wallet));
                    var secret = pincode + $rootScope.UUID;
                    var walletWorker = new Worker('js/walletworker.js');
                    // handle message from walletWorker
                    walletWorker.onmessage = function (eventMessage) {
                        if (eventMessage.data.messageType == 'status') {
                            var progress = Math.round(eventMessage.data.content.percent);
                            $rootScope.decryptPercentage = progress;
                            $ionicLoading.show({
                                template: loadingContent
                            });
                        } else if (eventMessage.data.messageType == 'result') {
                            $ionicLoading.hide();
                            var decryptedMasterKey = eventMessage.data.content;
                            $log.debug("### Decrypt Result: " + decryptedMasterKey);
                            // check public key against wallet key
                            var bitcore = require('bitcore');
                            var hkey = new bitcore.HierarchicalKey(decryptedMasterKey);
                            var networks = bitcore.networks;
                            var cscMasterAddress = bitcore.Address.fromPubKey(hkey.eckey.public).toString();
                            $log.debug("### Decrypted Master Public Address: " + cscMasterAddress + " - Stored Public Address: " + $scope.wallet.masterPublicAddress);
                            if ($scope.wallet.masterPublicAddress == cscMasterAddress) {
                                // Loop over wallet addresses and get private keys for derived wallet keys
                                var addressIndex = 0;
                                angular.forEach($scope.wallet.addresses, function (addressObject) {
                                    var derivedM000 = hkey.derive('m/0/0/' + addressIndex);
                                    var privKeyM000 = new bitcore.PrivateKey(networks.livenet.privKeyVersion, derivedM000.eckey.private, derivedM000.eckey.compressed);
                                    var wif = privKeyM000.toString();
                                    $log.debug("### WIF[" + addressIndex + "]: " + wif);
                                    setPrivateKey(addressObject.address, wif);
                                    addressIndex++;
                                });
                                $log.debug("### Private Keys Map: " + JSON.stringify(privateKeysMap));
                                resolve();
                            } else {
                                reject("### Error decrypting private keys");
                            }
                        } else if (eventMessage.data.messageType == 'error') {
                            $ionicLoading.hide();
                            $log.debug("### Decrypt Error: " + eventMessage.data.content);
                            reject(eventMessage.data.content);
                        } else if (eventMessage.data.messageType == 'log') {
                            $log.debug("### Decrypt Log: " + eventMessage.data.content);
                        }
                    }
                    // post decryption data to walletWorker
                    $log.debug("### Decrypt with PIN: " + pincode + " UUID: " + $rootScope.UUID + " MasterKey: " + $scope.wallet.masterPrivateKey.substr(0, 4));
                    if ($scope.wallet.masterPrivateKey.substr(0, 4) != "xprv") {
                        $log.debug("### Post WalletWorker Message ###");
                        walletWorker.postMessage({ messageType: 'decrypt', content: { encryptedPrivateKey: $scope.wallet.masterPrivateKey, secretPIN: pincode, deviceUUID: $rootScope.UUID } });
                    }
                }, 500);
            });
        });
    };

    function addNewWalletAddress($scope, pincode) {
        return $q(function (resolve, reject) {
            $rootScope.decryptPercentage = 0;
            $scope.loaderIsShowing = false;
            var loadingContent = 'Creating new Address ..<br><ion-spinner icon="bubbles" class="spinner-assertive"></ion-spinner>';
            $ionicLoading.show({
                template: loadingContent,
                showBackdrop: true,
                delay: 0,
                hideOnStateChange: false
            }).then(function () {
                setTimeout(function () {
                    $log.debug("### addNewWalletAddress Loader showing, do key decryption");
                    var walletWorker = new Worker('js/walletworker.js');
                    // handle message from walletWorker
                    walletWorker.onmessage = function (eventMessage) {
                        if (eventMessage.data.messageType == 'result') {
                            var decryptedMasterKey = eventMessage.data.content;
                            $log.debug("### Decrypt Result: " + decryptedMasterKey);
                            // check public key against wallet key
                            var bitcore = require('bitcore');
                            var hkey = new bitcore.HierarchicalKey(decryptedMasterKey);
                            var networks = bitcore.networks;
                            var cscMasterAddress = bitcore.Address.fromPubKey(hkey.eckey.public).toString();
                            $log.debug("### Decrypted Master Public Address: " + cscMasterAddress + " - Stored Public Address: " + $scope.wallet.masterPublicAddress);
                            if ($scope.wallet.masterPublicAddress == cscMasterAddress) {
                                // count addresses
                                var newAddressIndex = $scope.wallet.addresses.length;
                                // create new derived key
                                var derivedM00X = hkey.derive('m/0/0/' + newAddressIndex);
                                var M00XAddress = bitcore.Address.fromPubKey(derivedM00X.eckey.public).toString();
                                var newAddressObject = { "address": M00XAddress, "creationDate": $filter('date')(new Date(), "yyyy-MM-dd'T'HH:mm:ss.sss", "UTC") }
                                // add new address to wallet
                                $scope.wallet.addresses.push(newAddressObject);
                                // get full address object
                                insight.getAddress(M00XAddress).then(function (response) {
                                    $log.debug("### getAddress Response: " + JSON.stringify(response));
                                    addReceiveAddress(response.data);
                                }, function (error) {
                                    $log.error("### getAddress Error: " + JSON.stringify(error));
                                });
                                $ionicLoading.hide();
                                resolve(newAddressObject);
                            } else {
                                $ionicLoading.hide();
                                reject("### Error decrypting private keys");
                            }
                        } else if (eventMessage.data.messageType == 'error') {
                            $ionicLoading.hide();
                            $log.debug("### Decrypt Error: " + eventMessage.data.content);
                            reject(eventMessage.data.content);
                        }
                    }
                    // post decryption data to walletWorker
                    $log.debug("### Decrypt with PIN: " + pincode + " UUID: " + $rootScope.UUID + " MasterKey: " + $scope.wallet.masterPrivateKey.substr(0, 4));
                    if ($scope.wallet.masterPrivateKey.substr(0, 4) != "xprv") {
                        $log.debug("### Post WalletWorker Message ###");
                        walletWorker.postMessage({ messageType: 'decrypt', content: { encryptedPrivateKey: $scope.wallet.masterPrivateKey, secretPIN: pincode, deviceUUID: $rootScope.UUID } });
                    }
                }, 500);
            });
        });
    };

    function updateWallet(wallet) {
        wallets.update(wallet);
    };

    function deleteWallet(wallet) {
        wallets.remove(wallet);
    };

    function getWalletBalance() {
        // loop over all receive addresses
        getReceiveAddresses().then(function (result) {
            $log.debug("### WalletBalance ReceiveAddresses: " + JSON.stringify(result));
        });
    }

    function validateAddress(address) {
        var Address = bitcore.Address;
        var checkAddress = new Address(address);
        return checkAddress.isValid();
    }

    function getReceiveAddresses() {
        return $q(function (resolve, reject) {
            if (initComplete) {
                resolve(receiveAddresses);
            } else {
                reject("Initialisation of WalletDB is not complete!")
            }
        });
    }

    function addReceiveAddress(receiveAddress) {
        receiveAddresses.insert(receiveAddress);
    };

    function updateReceiveAddress(receiveAddress) {
        receiveAddresses.update(receiveAddress);
    };

    function deleteReceiveAddress(receiveAddress) {
        receiveAddresses.remove(receiveAddress);
    };

    function getSendAddresses() {
        return $q(function (resolve, reject) {
            if (initComplete) {
                resolve(sendAddresses);
            } else {
                reject("Initialisation of WalletDB is not complete!")
            }
        });
    }

    function addSendAddress(sendAddress) {
        sendAddresses.insert(sendAddress);
    };

    function updateSendAddress(sendAddress) {
        sendAddresses.update(sendAddress);
    };

    function deleteSendAddress(sendAddress) {
        sendAddresses.remove(sendAddress);
    };

    function handleIncommingTX(transaction) {
        var transactionValue = 0;
        var transactionAddressSend = "";
        var transactionAddressReceive = "";
        // check if TX involves a send action from me
        angular.forEach(transaction.vin, function (vinValue) {
            // check value against my wallet addresses
            angular.forEach(receiveAddresses.data, function (receiveAddress) {
                if (vinValue.addr === receiveAddress.addrStr) {
                    $log.debug("### Send Address is mine: " + vinValue.addr);
                    transactionValue = transactionValue - Number(vinValue.value);
                    transactionAddressSend = vinValue.addr;
                }
            });
        });
        // check if TX involves a receive action for me
        angular.forEach(transaction.vout, function (voutValue) {
            angular.forEach(voutValue.scriptPubKey.addresses, function (addrValue) {
                // check value against my wallet addresses
                angular.forEach(receiveAddresses.data, function (receiveAddress) {
                    if (addrValue === receiveAddress.addrStr) {
                        $log.debug("### Receive Address is mine: " + addrValue);
                        if (transactionValue >= 0) {
                            transactionValue = transactionValue + voutValue.value;
                            transactionAddressReceive = addrValue;
                        } else {
                            // We are sending coins so receive is change
                            transactionValue = transactionValue + Number(voutValue.value);
                        }
                    }
                });
            });
        });
        if (transactionValue < 0) {
            var myToastMsg = ngToast.info({
                content: '<p>You send ' + transactionValue + ' CSC.</p>'
            });
        } else if (transactionValue > 0) {
            var myToastMsg = ngToast.info({
                content: '<p>You received ' + transactionValue + ' CSC with address ' + transactionAddressReceive + '</p>'
            });
        }
        // emit UpdateWallet signal
        $rootScope.$emit("UpdateWalletValues", {});
    };

    function subscribeWalletTX(address) {
        $log.debug("### subscribeWalletTX: " + address);
        // subscribe to messages for my addresses
        $rootScope.insightSocket.emit('subscribe', address);
        // Handle incomming address messages from insight
        $rootScope.insightSocket.on(address, function (txID) {
            insight.getTransaction(txID).then(function (result) {
                $log.debug("### New Transaction received: " + result.data.txid);
                // Handle incomming transaction
                handleIncommingTX(result.data);
            });
        });
    }

    function sendCoins(wallet, sendRequest) {
        return $q(function (resolve, reject) {
            var txid = "";
            var txBalance = 0;
            var availableUnspentOutputs = [];
            var privateKeys = [];
            // get all confirmed and unspent outputs (utxo) for my addresses until sufficient to send required amount
            getReceiveAddresses().then(function (receiveAddresses) {
                $log.debug("### ReceiveAddresses: " + JSON.stringify(receiveAddresses));
                // create array for all the promises
                var promises = [];

                // loop the receive addresses
                angular.forEach(receiveAddresses.data, function (address) {
                    $log.debug("### Check address for funds: " + JSON.stringify(address));
                    // find address index
                    var addressIndex = 0;
                    var currentIndex = 0;
                    angular.forEach(wallet.addresses, function (value) {
                        if (value.address == address.addrStr) {
                            addressIndex = currentIndex;
                        }
                        currentIndex++;
                    });
                    // create promise and add to array
                    var deferred = $q.defer();
                    promises.push(deferred.promise);
                    // check if balance > 0
                    if (address.balance > 0) {
                        var addressUsed = false;
                        $log.debug("### getUnspendOutputs: " + address.addrStr);
                        insight.getUnspentOutputs(address.addrStr).then(function (unspents) {
                            for (var i = 0; i < unspents.data.length; i++) {
                                $log.debug("### Unspent: " + JSON.stringify(unspents.data[i]));
                                if (Number(unspents.data[i].confirmations) >= $rootScope.requiredConfirmations) {
                                    $log.debug("### confirmed output: " + unspents.data[i].amount);
                                    // output is confirmed so add to balance
                                    txBalance = txBalance + unspents.data[i].amount;
                                    // add unspent output
                                    availableUnspentOutputs.push(unspents.data[i]);
                                    // set address used
                                    addressUsed = true;
                                    $log.debug("New txBalance: " + txBalance + " for send amount: " + sendRequest.amount);
                                    if (txBalance >= sendRequest.amount + +$rootScope.fees) {
                                        // we found sufficient spendible funds
                                        break;
                                    }
                                }
                            }
                            if (addressUsed) {
                                // get derived key for 
                                //var derivedName = 'm/' + addressIndex;
                                //var derivedKey = hierarchicalKey.derive(derivedName);
                                //var privKey = new bitcore.PrivateKey(networks.livenet.privKeyVersion, derivedKey.eckey.private, derivedKey.eckey.compressed);
                                //var wif = privKey.toString();
                                //$log.debug("### WIF "+ derivedName +": " + wif);
                                //var derivedAddress = bitcore.Address.fromPubKey(derivedKey.eckey.public).toString();
                                privateKeys.push(getPrivatekey(address.addrStr));
                                // privateKeys.push("Q8v9zYRxpsVw1nyMSxF463uXyRLsCPMsTZMuidwCVbEJ8P8nso4X");
                            }
                            $log.debug("### Private Keys: " + JSON.stringify(privateKeys));
                            $log.debug("### reset addressUsed ###");
                            addressUsed = false;
                            // resolve current promise
                            deferred.resolve();
                        });
                    }
                });
                $q.all(promises).then(function () {
                    $log.debug("### All resolved -> after forEach receiveAddresses ###");
                    // check if we found sufficient confirmed funds
                    if (txBalance < (sendRequest.amount + $rootScope.fees)) {
                        reject("<p>No sufficient confirmed funds available to execute the transaction.</p><p>Wait until your previous transactions are confirmed and try again!</p>");
                    } else {
                        // we found sufficient unspent outputs, go ahead and create the transaction
                        var outputTo = [{
                            address: sendRequest.toAddress,
                            amount: sendRequest.amount
                        }];
                        var options = {
                            remainderOut: {
                                address: wallets.data[0].defaultAddress
                            },
                            fee: $rootScope.fees,
                            spendUnconfirmed: false
                        };
                        var builder = new bitcore.TransactionBuilder(options);
                        builder.setUnspent(availableUnspentOutputs);
                        builder.setOutputs(outputTo);
                        $log.debug("### Sign ###");
                        if (privateKeys.length > 0) {
                            builder.sign(privateKeys);
                            $log.debug("### Check signed ###");
                            if (builder.isFullySigned()) {
                                var tx = builder.build();
                                // Serialize Transaction
                                $log.debug("### Serialize ###");
                                var txHex = tx.serialize().toString('hex');
                                $log.debug('### TX HEX IS: ', txHex);
                                // broadcast the transacion by posting it to Insight
                                insight.postTransaction(txHex).then(function (broadcastTxResult) {
                                    $log.debug("### broadcastTxResult: " + JSON.stringify(broadcastTxResult));
                                    // resolve with transaction ID
                                    resolve(broadcastTxResult.data.txid);
                                    // emit UpdateWallet signal
                                    $rootScope.$emit("UpdateWalletValues", {});
                                }, function (broadcastError) {
                                    reject(broadcastError);
                                });
                            } else {
                                $log.debug("### Signing not complete ###");
                                reject("Error Signing Transacion, wrong or missing private keys.");
                            }
                        } else {
                            reject("No private keys to sign the transacion");
                        }
                    }
                });
            });
        });
    }

    function setPrivateKey(publicAddress, privateWIF) {
        var keyFound = false;
        angular.forEach(privateKeysMap, function (privateKeyObject) {
            if (publicAddress == privateKeyObject.address) {
                privateKeysMap[privateKeyObject].privateWIF = privateWIF;
                keyFound = true;
            }
        });
        if(keyFound == false){
            privateKeysMap.push({ "address": publicAddress, "privateWIF": privateWIF });
        }
        
    }

    function getPrivatekey(publicAddress) {
        // loop all private keys and get the private key
        var privateKey = "";
        angular.forEach(privateKeysMap, function (privateKeyObject) {
            if (publicAddress == privateKeyObject.address) {
                privateKey = privateKeyObject.privateWIF;
            }
        });
        return privateKey;
    }

    function clearPrivateKeys() {
        privateKeysMap.length = 0;
    }
});