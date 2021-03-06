sap.ui.define([
    "demo/startUI/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (Controller,
    JSONModel) {
    "use strict";

    return Controller.extend("demo.startUI.controller.App", {
        onInit: function () {
            this.getStartupParams();
        },

        // getUserInfo: function () {
            // const url = this.getBaseURL() + "/user-api/currentUser";
            // var oModel = new JSONModel();
            // var mock = {
            //     firstname: "Dummy",
            //     lastname: "User",
            //     email: "dummy.user@com",
            //     name: "dummy.user@com",
            //     displayName: "Dummy User (dummy.user@com)"
            // };

            // oModel.loadData(url);
            // oModel.dataLoaded()
            // .then(()=>{
            //     //check if data has been loaded
            //     if (!oModel.getData().hasOwnProperty()) {
            //         oModel.setData(mock);
            //     }
            //     this.getOwnerComponent().setModel(oModel, "userInfo");
            // })
            // .catch(()=>{
            //     oModel.setData(mock);
            //     this.getOwnerComponent().setModel(oModel, "userInfo");
            // });

            // return new Promise((resolve) => {
            //     var xhr = new XMLHttpRequest();
            //     xhr.open("GET", url);
            //     xhr.setRequestHeader("accept", "application/json");
            //     xhr.onload = function () {
            //         if (xhr.status === 200) {
            //             resolve(JSON.parse(xhr.response));
            //         } else {
            //             resolve({
            //                 firstname: "Dummy",
            //                 lastname: "User",
            //                 email: "dummy.user@com",
            //                 name: "dummy.user@com",
            //                 displayName: "Dummy User (dummy.user@com)"
            //             });
            //         }
            //     }
            //     xhr.send();
            // });
        // },

        getStartupParams: function () {
            var compData = this.getOwnerComponent().getComponentData();
            var workflowId;
            if (compData && compData.startupParameters && compData.startupParameters.id) {
                var workflowId = compData.startupParameters.id[0];
            }
            this.getOwnerComponent().setModel(new JSONModel({workflowId: workflowId}), "common");
        }

    });
});
