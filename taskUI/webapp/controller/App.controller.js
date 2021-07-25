sap.ui.define([
    "demo/taskUI/controller/BaseController",
    "sap/m/MessageToast"
], function (
    Controller,
	MessageToast) {
    "use strict";

    return Controller.extend("demo.taskUI.controller.App", {
        onInit: function () {
            this._addButtons();
        },

        _addButtons: function () {
            var compData = this.getOwnerComponent().getComponentData();
            if (!compData || !compData.startupParameters || !compData.startupParameters.inboxAPI) {
                return;
            }

            //approve
            compData.startupParameters.inboxAPI.addAction({
                action: this.getText("APPROVE"),
                label: this.getText("APPROVE"),
                type: "Accept"
            }, function () {
                this.completeTask("APPROVE");
            }, this);

            //reject
            compData.startupParameters.inboxAPI.addAction({
                action: this.getText("REJECT"),
                label: this.getText("REJECT"),
                type: "Reject"
            }, function () {
                this.completeTask("REJECT");
            }, this);
        },

        completeTask: function (sAction) {
            //collect data

            //send
            switch (sAction){
                case "APPROVE":
                    MessageToast.show("Approved");
                    break;
                case "REJECT":
                    MessageToast.show("Rejected");
                    break;
                default:
                    MessageToast.show("Completed");
            }
        }

    });
});
