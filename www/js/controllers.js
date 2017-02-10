// CONTROLLERS
angular.module('casinocoin.controllers', ['ionic','casinocoin.services'])

.controller('AppCtrl', function ($scope, $state, $ionicModal, $ionicPopup, $timeout, oauth2, publicAPI, $translate, ngToast, $log) {

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  // Global CoinInfo object
  $scope.coinInfo = {};
  // Form data for the login modal
  $scope.loginData = {
      "email" : "",
      "password" : ""
  };
  // Form data for the registration modal
  $scope.registrationData = {
      "firstname": "",
      "lastname": "",
      "email": "",
      "password" : ""
  };

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('templates/security/login.html', {
      scope: $scope
  }).then(function (modal) {
      $scope.loginModal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
      $scope.loginModal.hide();
  };

  // Open the login modal
  $scope.login = function () {
      $scope.loginModal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
      $log.debug('### Doing login', JSON.stringify($scope.loginData));
      // call oauth2 service with username and password
      oauth2.getToken($scope.loginData.email, $scope.loginData.password).then(function (oauth2Result) {
          if (oauth2Result.status == 200) {
              $log.debug("### Login Success: " + JSON.stringify(oauth2Result));
              $scope.security.authenticated = true;
              $scope.security.access_token = oauth2Result.data.access_token;
              $scope.security.refresh_token = oauth2Result.data.refresh_token;
              $scope.security.useremail = $scope.loginData.email;
              //$scope.stompClient.connect(null, null, function(frame) {
              //    $log.debug("[STOMP] Connect Success: " + frame);
              //}, function (frame) {
              //    $log.debug("[STOMP] Connect Error: " + frame);
              //});
              $scope.closeLogin();
              $state.go("app.wallet");
          } else {
              $log.debug("### Login Error: " + JSON.stringify(oauth2Result));
              $scope.loginData.password = "";
              if (oauth2Result.data.error_description === "17001") {
                  $scope.loginData.email = "";
                  // Show alert dialog
                  var alertPopup = $ionicPopup.alert({
                        title: $translate.instant('l_error'),
                        template: $translate.instant('l_email_not_exist')
                  });

                  alertPopup.then(function (res) {
                      $log.debug('### alert dismissed');
                  });
              } else {
                  // Show alert dialog
                  var alertPopup = $ionicPopup.alert({
                        title: $translate.instant('l_error'),
                        template: oauth2Result.data.error_description
                  });

                  alertPopup.then(function (res) {
                      $log.debug('### alert dismissed');
                  });
              }
          }
      });
//    $timeout(function() {    
//    }, 1000);
  };

  // Perform the logout action
  $scope.doLogout = function () {
      $log.debug('### Doing logout ###');
      $scope.security.authenticated = false;
      $scope.security.access_token = "";
      $scope.security.refresh_token = "";
      $state.go("app.home");
  };

  // Create the registration modal that we will use later
  $ionicModal.fromTemplateUrl('templates/security/registration.html', {
      scope: $scope
  }).then(function (modal) {
      $scope.registrationModal = modal;
  });

  // Open the registration modal
  $scope.registration = function () {
      $scope.registrationModal.show();
  };

  // Triggered in the registration modal to close it
  $scope.closeRegistration = function () {
      $scope.registrationModal.hide();
      $scope.modal.hide();
      $state.go("app.home");
  };

  // Perform the registration action when the user submits the registration form
  $scope.doRegistration = function () {
      $log.debug('Doing registration: ', JSON.stringify($scope.registrationData));
      publicAPI.registerUser($scope.registrationData).then(function (registerResult) {
          if (registerResult.status == 200) {
              $log.debug("### Registration Success: " + JSON.stringify(registerResult));
              // Show alert dialog
              var alertPopup = $ionicPopup.alert({
                  title: $translate.instant('l_success'),
                  template: $translate.instant('l_reg_success'),
                  buttons: [{
                      text: $translate.instant('l_ok'),
                      type: 'button-assertive'
                  }]
              });

              alertPopup.then(function (res) {
                  $log.debug('### alert dismissed');
                  $scope.closeRegistration();
              });
          } else {
              $log.error("### Registration Error: " + JSON.stringify(registerResult));
          }
      });
  };

})

.controller('HomeCtrl', function ($scope, $rootScope, publicAPI, $log) {
    // set application version
    $log.debug("### App Version: " + $rootScope.appVersion);
    $log.debug("### Security: " + JSON.stringify($rootScope.security));
    // get api info on page show
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        if(toState.name == 'app.home'){            
            // get CoinInfo from API
            publicAPI.getCoinInfo().then(function (apiResult) {
                $log.debug("### CoinInfo: " + JSON.stringify(apiResult));
                if (apiResult.status == 200) {
                    $rootScope.coinInfo = apiResult.data.Result.CoinInfo;
                    $rootScope.blockheight = $scope.coinInfo.Blockheight;
                }
            });
            $log.debug("### Security: " + JSON.stringify($scope.security));
        }
    });
})

.controller('WalletCtrl', function ($q, $rootScope, $scope, $ionicModal,
                                    $ionicTabsDelegate, $ionicLoading, 
                                    $http, $timeout, $cordovaClipboard,
                                    $cordovaBarcodeScanner, WalletService,
                                    $ionicPopup, insight, $log) {
    $log.debug("### WalletCtrl ###");
    // Create the wallet creation modal that we will use later
    $ionicModal.fromTemplateUrl('templates/wallet/create-wallet.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $log.debug("### create wallet modal created");
        $scope.createWalletModal = modal;
    });

    // Create the PIN Pad modal that we will use later
    $ionicModal.fromTemplateUrl('templates/wallet/pinpad-dialog.html', {
        scope: $scope,
        animation: 'slide-in-down'
    }).then(function (modal) {
        $log.debug("### pinpad modal created");
        $scope.pinpadModal = modal;
    });

    // disable block toast messages
    $rootScope.showBlockToast = false;
    // init vars
    $scope.walletPassPhrase = {};
    $scope.wallet = null;
    $scope.walletBalance = 0;
    $scope.unconfirmedWalletBalance = 0;
    $scope.walletTransactionCount = 0;
    $scope.sendCoinsRequest = {};
    $scope.PIN = "";
    $scope.PINCompleteCallback = null;
    $scope.walletReceiveAddresses = [];

    // navigate to default tab on page show
    $scope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams) {
        $log.debug("### toState: " + toState.name + " fromState: " + fromState.name);
        if (toState.name == 'app.wallet') {
            // navigate to app.wallet.home
            $timeout(function () {
                $ionicTabsDelegate.$getByHandle('wallet-tabs').select(1);
                if ($scope.wallet) {
                    $scope.updateWalletValues();
                }
            }, 500);
        } else if (toState.name == 'app.wallet.home') {
            if ($scope.wallet) {
                $scope.updateWalletValues();
            }
        } else if (toState.name == 'app.wallet.send') {
            $timeout(function () {
                $ionicTabsDelegate.$getByHandle('wallet-tabs').select(0);
            }, 500);
        }
    });

    $scope.PINCompleteOnCreate = function (pincode) {
        $scope.PIN = pincode;
        $scope.pinpadModal.hide().then(function () {
            $log.debug("### Final PIN: " + $scope.PIN);
            WalletService.createWallet($scope.walletPassPhrase.value).then(function (wallet) {
                $scope.wallet = wallet;
                $scope.createWalletModal.hide();

                // Subscribe to insight api after wallet creation (the same is done on wallet loading in app.js)
                angular.forEach($scope.wallet.addresses, function (walletAddress) {
                    $log.debug("### walletAddress to subscribe to: " + JSON.stringify(walletAddress));
                    WalletService.subscribeWalletTX(walletAddress.address);
                });

                // wallet created and loaded, encrypt keys
                if ($scope.wallet) {
                    WalletService.encryptWalletKeys($scope, $scope.PIN).then(
                        function () {
                            $log.debug("### encryptWalletKeys Finished");
                            $log.debug("### Wallet: " + JSON.stringify($scope.wallet));
                            $scope.updateWalletValues();
                        }, function (error) {
                            $log.debug("### encryptWalletKeys Error: " + JSON.stringify(error));
                        }
                    );
                }
            }, function (error) {
                var alertPopup = $ionicPopup.alert({
                    title: 'Error!',
                    template: '<p>There was an error creating the wallet:</p><p>'+error+'</p>',
                    buttons: [{
                        text: 'Ok',
                        type: 'button-assertive'
                    }]
                });
            });
        });
    }
    
    // If rootScope.wallets was loaded and contains wallet data it will be shown
    // Otherwise scope.wallet will remain null and the create wallet modal will
    // be shown from the wallet/tab-home view
    $log.debug("### rootScope.wallets: " + JSON.stringify($rootScope.wallets.data));
    if ($rootScope.wallets.data.length == 1) {
        $scope.wallet = $rootScope.wallets.data[0];
    } else if ($rootScope.wallets.data.length > 1) {
        // need to handle multiple wallets
        $log.debug('### Multiple Wallets !!!! ###');
        $scope.wallet = $rootScope.wallets.data[0];
    }

    // Triggered to close the createWalletModal
    $scope.closeCreateWalletModal = function () {
        $scope.createWalletModal.hide();
    };

    // Triggered to copy the default address to the clipboard
    $scope.copyWalletAddress = function (address){
        $cordovaClipboard.copy(address);
    }

    // Triggered to create new wallet
    $scope.doCreateWallet = function (passPhrase) {
        $scope.createWalletModal.hide().then(function () {
            $scope.PINCompleteCallback = $scope.PINCompleteOnCreate;
            // show the PIN modal
            $scope.pinpadModal.show();
        });
    }

    $rootScope.$on("UpdateWalletValues", function () {
        $scope.updateWalletValues();
    });

    $scope.updateWalletValues = function () {
        // Load Wallet Address info from Insight API
        WalletService.getReceiveAddresses().then(function (receiveAddresses) {
            var balance = 0;
            var unconfirmedBalance = 0;
            var txCount = 0;
            var promises = [];
            angular.forEach(receiveAddresses.data, function (value) {
                // create promise and add to array
                var deferred = $q.defer();
                promises.push(deferred.promise);
                // get address object
                insight.getAddress(value.addrStr).then(
                    function (response) {
                        // copy service values onto db object
                        angular.extend(value, response.data);
                        // update totals and tx count
                        balance = balance + value.balance;
                        unconfirmedBalance = unconfirmedBalance + value.unconfirmedBalance;
                        txCount = txCount + value.txApperances + value.unconfirmedTxApperances;
                        // update address info in wallet db
                        WalletService.updateReceiveAddress(value);
                        // resolve current promise
                        deferred.resolve();
                    }
                );
            });
            $q.all(promises).then(function () {
                $log.debug("### All resolved -> after forEach receiveAddresses ###");
                // $scope.loadingInProgress = false;
                $scope.walletBalance = balance;
                if (unconfirmedBalance < 0)
                    $scope.walletBalance += unconfirmedBalance;
                $scope.unconfirmedWalletBalance = unconfirmedBalance;
                $scope.walletTransactionCount = txCount;
                WalletService.getReceiveAddresses().then(function (updatedReceiveAddresses) {
                    $log.debug("### Updated ReceiveAddresses: " + JSON.stringify(updatedReceiveAddresses));
                    $scope.walletReceiveAddresses = updatedReceiveAddresses.data;
                });
                // Stop the ion-refresher from spinning
                $scope.$broadcast('scroll.refreshComplete');
            });
        });
        
    }

    $scope.totalBalance = function(value){
        var totalBalance = 0;
        WalletService.getReceiveAddresses().then(function (receiveAddresses) {
            receiveAddresses.data.forEach(function (item) {
                totalBalance = totalBalance + item.balance;
            });
            if (!angular.isDefined(value)) {
                return totalBalance;
            }
        });
    }

    $scope.PINCompleteOnSendCoins = function (pincode) {
        $scope.PIN = pincode;
        $scope.pinpadModal.hide().then(function () {
            $log.debug("### Final PIN: " + $scope.PIN);
            // decrypt wallet keys
            WalletService.decryptWalletKeys($scope, $scope.PIN).then(
                function () {
                    $log.debug("### decryptWalletKeys Finished");
                    $log.debug("### Wallet: " + JSON.stringify($scope.wallet));
                    WalletService.sendCoins($scope.wallet, $scope.sendCoinsRequest).then(function (txid) {
                        $log.debug("### Send Success: " + txid);
                        $scope.sendForm.$setPristine();
                        $scope.sendCoinsRequest = {};
                        $scope.updateWalletValues();
                        var alertPopup = $ionicPopup.alert({
                            title: 'Success!',
                            template: 'The transaction was broadcasted successfully to the network with transaction id: ' + txid,
                            buttons: [{
                                text: 'Ok',
                                type: 'button-assertive'
                            }]
                        });
                    }, function (errorMsg) {
                        $log.debug("## Send Error: " + errorMsg);
                        $scope.sendCoinsRequest = {};
                        var alertPopup = $ionicPopup.alert({
                            title: 'Error Sending Coins',
                            template: '<p>There was an error sending the coins:</p>' + errorMsg,
                            buttons: [{
                                text: 'Ok',
                                type: 'button-assertive'
                            }]
                        });
                    });
                }, function (error) {
                    $log.debug("### decryptWalletKeys Error: " + JSON.stringify(error));
                }
            );
        });
    }

    $scope.doSendCoins = function (sendCoinsRequest, sendForm) {
        $log.debug("### sendRequest: " + JSON.stringify(sendCoinsRequest));
        $scope.PIN = "";
        $scope.sendCoinsRequest = sendCoinsRequest;
        $scope.sendForm = sendForm;
        $scope.PINCompleteCallback = $scope.PINCompleteOnSendCoins;
        // show the PIN modal
        $scope.pinpadModal.show();
    }

    $scope.scanCscQrCode = function () {
        $cordovaBarcodeScanner
          .scan()
          .then(function (barcodeData) {
              // Success! Barcode data is here
              $log.debug("### barcode: " + JSON.stringify(barcodeData));
              if (!barcodeData.cancelled) {
                  // get send to address
                  var addressStart = barcodeData.text.indexOf(":") + 1;
                  var addressEnd = barcodeData.text.indexOf("?");
                  if (addressEnd < 0) {
                      addressEnd = barcodeData.text.length;
                  }
                  var sendAddress = barcodeData.text.substring(addressStart, addressEnd);
                  $log.debug("### Address: " + sendAddress);
                  if(WalletService.validateAddress(sendAddress)){
                      $scope.sendCoinsRequest.toAddress = sendAddress;
                  }
                  // get amount if specified
                  var amountStringStart = barcodeData.text.indexOf("amount=");
                  if (amountStringStart > 0) {
                      var amountString = barcodeData.text.substring(amountStringStart);
                      var amountStart = amountString.indexOf("=") + 1;
                      var amountEnd = amountString.indexOf("&");
                      if (amountEnd < 0) {
                          amountEnd = amountString.length;
                      }
                      $scope.sendCoinsRequest.amount = Number(amountString.substring(amountStart, amountEnd));
                  }
              }
          }, function (error) {
              // An error occurred
              $log.error("### barcode error: " + JSON.stringify(error));
          });
    }

    $scope.sendAllCoins = function () {
        var sendCoinValue = $scope.walletBalance.toFixed(8) - $rootScope.fees;
        if (sendCoinValue > 0) {
            $scope.sendCoinsRequest.amount = sendCoinValue;
        } else {
            $scope.sendCoinsRequest.amount = 0;
        }
    }

    $scope.PINCompleteOnAddNewAddress = function (pincode) {
        $scope.PIN = pincode;
        $scope.pinpadModal.hide().then(function () {
            $log.debug("### Final PIN Add Address: " + $scope.PIN);
            WalletService.addNewWalletAddress($scope, $scope.PIN).then(function (result) {
                $log.debug("### New addres created: " + angular.toJson(result));
                $log.debug("### Wallet: " + angular.toJson($scope.wallet));
                // Subscribe to insight api after wallet creation (the same is done on wallet loading in app.js)
                angular.forEach($scope.wallet.addresses, function (walletAddress) {
                    $log.debug("### walletAddress to subscribe to: " + JSON.stringify(walletAddress));
                    WalletService.subscribeWalletTX(walletAddress.address);
                });
                $scope.updateWalletValues();
            }, function (error) {
                $log.error("### Error creating new addres: " + angular.toJson(error));
            });
        });
    }

    $scope.addNewAddress = function () {
        $log.debug("### addNewAddress ###");
        $scope.PIN = "";
        $scope.PINCompleteCallback = $scope.PINCompleteOnAddNewAddress;
        // show the PIN modal
        $scope.pinpadModal.show();
    }

})

.controller('CoinInfoCtrl', function ($rootScope, $scope, $log, publicAPI) {
    $log.debug("### CoinInfoCtrl ###");
    // refresh coin information
    $scope.updateCoinInfo = function () {
        $log.debug("### updateCoinInfo() ###");
        publicAPI.getCoinInfo().then(function (apiResult) {
            $log.debug("### CoinInfo: " + JSON.stringify(apiResult));
            if (apiResult.status == 200) {
                $rootScope.coinInfo = apiResult.data.Result.CoinInfo;
                $rootScope.blockheight = $scope.coinInfo.Blockheight;
            }
        }).finally(function () {
            // Stop the ion-refresher from spinning
            $scope.$broadcast('scroll.refreshComplete');
        });
    }
})

.controller('ExchangesCtrl', function ($scope) {

})

.controller('BlockchainCtrl', function ($scope, $log) {
    $log.debug("### BlockChainCtrl - blocks: " + JSON.stringify($scope.blocks));
});
