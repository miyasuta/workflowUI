sap.ui.define([
    "demo/startUI/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (Controller,
    JSONModel) {
    "use strict";

    return Controller.extend("demo.startUI.controller.App", {
        onInit: function () {
            this.getUserInfo()
                .then(userInfo => {
                    this.getOwnerComponent().setModel(new JSONModel(userInfo), "userInfo");
                });
        },

        getUserInfo: function () {
            const url = this.getBaseURL() + "/user-api/currentUser";
            return new Promise((resolve) => {
                var xhr = new XMLHttpRequest();
                xhr.open("GET", url);
                xhr.setRequestHeader("accept", "application/json");
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        resolve({
                            firstname: "Dummy",
                            lastname: "User",
                            email: "dummy.user@com",
                            name: "dummy.user@com",
                            displayName: "Dummy User (dummy.user@com)"
                        });
                    }
                }
                xhr.send();
            });
        }

    });
});
