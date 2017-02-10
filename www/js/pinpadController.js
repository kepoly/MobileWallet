angular.module('pinpad', ['ionic'])

.controller('PinpadCtrl', function ($scope, $rootScope, publicAPI) {
    console.log("### PinpadCtrl");
    // initialize PIN
    $scope.pinpadPIN = "";
    $scope.PIN1 = "";
    $scope.PIN2 = "";
    $scope.PIN3 = "";
    $scope.PIN4 = "";

    function resetPIN() {
        $scope.pinpadPIN = "";
        $scope.PIN1 = "";
        $scope.PIN2 = "";
        $scope.PIN3 = "";
        $scope.PIN4 = "";
    }

    $scope.addPINNumber = function (addNumber) {
        var pinLength = $scope.pinpadPIN.length;
        if (pinLength < 4) {
            $scope.pinpadPIN = $scope.pinpadPIN + addNumber;
        }
        if (pinLength == 0) {
            $scope.PIN1 = addNumber;
        } else if (pinLength == 1) {
            $scope.PIN2 = addNumber;
        } else if (pinLength == 2) {
            $scope.PIN3 = addNumber;
        } else if (pinLength == 3) {
            $scope.PIN4 = addNumber;
        }
    }

    $scope.removePINNumber = function () {
        var pinLength = $scope.pinpadPIN.length;
        if (pinLength == 1) {
            $scope.PIN1 = "";
        } else if (pinLength == 2) {
            $scope.PIN2 = "";
        } else if (pinLength == 3) {
            $scope.PIN3 = "";
        } else if (pinLength == 4) {
            $scope.PIN4 = "";
        }
        $scope.pinpadPIN = $scope.pinpadPIN.substr(0, $scope.pinpadPIN.length - 1);
    }

    $scope.executePinOk = function () {
        console.log("### PIN Code OK");
        $scope.PINCompleteCallback($scope.pinpadPIN);
        resetPIN();
    }
})