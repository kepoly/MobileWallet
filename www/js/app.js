angular.module('casinocoin', ['ionic', 'ngCordova', 'pascalprecht.translate', 'ngToast', 'lokijs', 'casinocoin.controllers', 'pinpad'])

.config(function ($ionicConfigProvider) {
    $ionicConfigProvider.tabs.position('bottom');
})

.config(function($logProvider){
    $logProvider.debugEnabled(true);
})

//configure Toast Messages
.config(['ngToastProvider', function(ngToast) {
    ngToast.configure({
        verticalPosition: 'bottom',
        horizontalPosition: 'center',
        timeout: 10000,
        animation: 'slide',
        maxNumber: 3
    });
}])

.run(function ($ionicPlatform, $state, $rootScope, $ionicHistory, $log, $cordovaAppVersion, $window, ngToast, insight, WalletService, publicAPI) {
    // define app version
    $rootScope.appVersion = "";
    $rootScope.security = {
        authenticated : true,
        clientid : "4E7SLp7CFM6vGcVwBhHxupyM3N0a",
        clientsecret : "5a73X2IDvAPMMe5ZkJrJrsm3tBUa",
        useremail: "",
        access_token: "",
        refresh_token : ""
    };
    $rootScope.blocks = [];
    // Show Block Toast info?
    $rootScope.showBlockToast = true;
    // set wallet variables
    $rootScope.requiredConfirmations = 6;
    $rootScope.fees = 0.01;
    $rootScope.privateKeys = [];
    // Platform Ready
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            cordova.plugins.Keyboard.disableScroll(true);

        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }
        // Disable BACK button on home
        $ionicPlatform.registerBackButtonAction(function () {
            if ($state.current != undefined) {
                $log.debug("### current page: " + $state.current.name);
                if ($state.current.name == "app.home") {
                    navigator.app.exitApp();
                }
                else {
                    $ionicHistory.nextViewOptions({
                        disableBack: true
                    });
                    $state.go("app.home");
                }
            }
        }, 100);
        // get the Device UUID
        $rootScope.UUID = device.uuid;
        // get Application Version number
        $cordovaAppVersion.getVersionNumber().then(function (version) {
            // Defince appVersion parameter
            $rootScope.appVersion = version;
        });
        // Connect to insight server and subscribe to the blocks and tx room
        $rootScope.insightSocket = io('http://insight.casinocoin.info');
        $rootScope.insightSocket.on('connect', function () {
            $log.debug('### Connected to Insight server');
            // Subscribe to Block and Transaction information.
            $rootScope.insightSocket.emit('subscribe', 'inv');
        });
        $rootScope.insightSocket.on('error', function (err) {
            $log.debug("### socket.io error: " + err);
        });
        // handle incomming block messages
        $rootScope.insightSocket.on('block', function (data) {
            insight.getBlock(data).then(function (result) {
                if ($rootScope.showBlockToast) {
                    $log.debug("### New Block received: " + JSON.stringify(result));
                    var myToastMsg = ngToast.success({
                        content: '<p>New block with height ' + result.data.height + ' is found.</p>'
                    });
                }
                $rootScope.blocks.unshift(result.data);
                $rootScope.blockheight = result.data.height;
                // get new coin info data
                publicAPI.getCoinInfo().then(function (apiResult) {
                    $log.debug("### CoinInfo: " + JSON.stringify(apiResult));
                    if (apiResult.status == 200) {
                        $rootScope.coinInfo = apiResult.data.Result.CoinInfo;
                    }
                });
            });
        });
        // Initialize the WalletDB
        WalletService.initDB().then(function () {
            // Get all wallets from the database.
            WalletService.getWallets().then(function (wallets) {
                $log.debug("### getWallets: " + JSON.stringify(wallets));
                $rootScope.wallets = wallets;
                // Subsribe to Transaction information for my public keys
                if (wallets.data.length > 0) {
                    // loop over all my wallet addresses
                    angular.forEach(wallets.data[0].addresses, function (walletAddress) {
                        WalletService.subscribeWalletTX(walletAddress.address);
                    });
                }
            });
        });
        document.addEventListener("pause", function() {
            // encrypt the wallet if necessary if we go on pause
            $log.debug("### onPause ###");
        }, false);
        document.addEventListener("resume", function () {
            $log.debug("### onResume ###");
        }, false);
        
    });
})

.config(function ($stateProvider, $urlRouterProvider, $translateProvider) {
    $stateProvider

    .state('app', {
        url: '/app',
        abstract: true,
        templateUrl: 'templates/menu.html',
        controller: 'AppCtrl'
    })
    .state('app.home', {
        url: '/home',
        views: {
            'menuContent': {
                templateUrl: 'templates/home.html',
                controller: 'HomeCtrl'
            }
        }
    })
    .state('app.wallet', {
        url: '/wallet',
        views: {
            'menuContent': {
                templateUrl: 'templates/wallet.html',
                controller: 'WalletCtrl'
            }
        }
    })
    .state('app.wallet.send', {
        url: '/wallet/send',
        views: {
            'tab-send': {
                templateUrl: 'templates/wallet/tab-send.html'
            }
        }
    })
    .state('app.wallet.send.addressbook', {
        url: '/wallet/send/addressbook',
        views: {
            'tab-send-addressbook': {
                templateUrl: 'templates/wallet/tab-send-addressbook.html'
            }
        }
    })
    .state('app.wallet.home', {
        url: '/wallet/home',
        views: {
            'tab-home': {
                templateUrl: 'templates/wallet/tab-home.html'
            }
        }
    })
    .state('app.wallet.receive', {
        url: '/wallet/receive',
        views: {
            'tab-receive': {
                templateUrl: 'templates/wallet/tab-receive.html',
                abstract: true
            }
        }
    })
    .state('app.coininfo', {
        url: '/coininfo',
        views: {
            'menuContent': {
                templateUrl: 'templates/coininfo.html',
                controller: 'CoinInfoCtrl'
            }
        }
    })
    .state('app.exchanges', {
        url: '/exchanges',
        views: {
            'menuContent': {
                templateUrl: 'templates/exchanges.html',
                controller: 'ExchangesCtrl'
            }
        }
    })
    .state('app.blockchain', {
        url: '/blockchain',
        views: {
            'menuContent': {
                templateUrl: 'templates/blockchain.html',
                controller: 'BlockchainCtrl'
            }
        }
    });
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/home');
    // define and set locale
    $translateProvider
      .useStaticFilesLoader({
          prefix: 'locale-',
          suffix: '.json'
      })
      .registerAvailableLanguageKeys(['en', 'nl'], {
          'en': 'en', 'en_GB': 'en', 'en_US': 'en',
          'nl': 'nl', 'nl_NL': 'nl', 'nl_BE': 'nl'
      })
      .preferredLanguage('en')
      .fallbackLanguage('en')
      .determinePreferredLanguage()
      .useSanitizeValueStrategy('escapeParameters');
});
