sap.ui.define([
    "demo/startUI/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
    ], function (Controller,
	JSONModel,
	MessageToast,
	MessageBox) {
    "use strict";

    return Controller.extend("demo.startUI.controller.App", {
        onInit: function () {
            this.getRouter().getRoute("Start").attachMatched(this._onRouteMatched, this);
        },

        onAddApprovalStep: function () {
            var oApproverSteps = this.getModel("viewModel").getProperty("/approvalSteps");
            oApproverSteps.push({
                id: "",
                comment: "",
                taskType: "APPROVAL"
            });

            this.getModel("viewModel").setProperty("/approvalSteps", oApproverSteps);
            this.getModel("viewModel").refresh();
        },

        handleDeleteApprovalStep: function(oEvent) {
            var approvalSteps = this.getModel("viewModel").getProperty("/approvalSteps");
            var approvalStep = oEvent.getSource().getBindingContext("viewModel").getObject();

            for (var i = 0; i < approvalSteps.length; i++) {
                if (approvalSteps[i] == approvalStep) {
                    approvalSteps.splice(i, 1);
                    this.getModel("viewModel").refresh();
                    break;
                }
            }
        },

        onPressRequestApproval: function () {
            this.getView().setBusy(true);
            this._startInstance();
        },

        _onRouteMatched: function (oEvent) {
            //var oArgs = oEvent.getParameter("arguments");
            this._initializeModel();
            this.onAddApprovalStep();
        },

        _initializeModel: function () {
            var oModel = new JSONModel({
                approvalSteps: [],
                requestId: Math.floor(Date.now() / 1000),
                input: {
                    enabled: true
                }
            });
            this.setModel(oModel, "viewModel");
        },

        _startInstance: function () {
            var context = this._editContext();
            this._sendRequest(context)
            .then(()=>{
                this.getView().setBusy(false);
                this.getModel("viewModel").setProperty("/input/enabled", false);
                MessageToast.show(this.getText("SUCCESS", []));
            })
            .catch((err)=> {
                this.getView().setBusy(false);
                MessageBox.error(err);
            });
        },

        _sendRequest: function (context) {
            //connect to workflow destination
            const url = this.getBaseURL() + "/workflow/instance/multilevelapproval";
            // eslint-disable-next-line no-console
            console.log('Workflow URL: ', url);

            return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.open("POST", url);
                xhr.setRequestHeader("content-type", "application/json");
                xhr.onload = function () {
                    if (xhr.status === 201) {
                        resolve();
                    } else {
                        reject(xhr.response);
                    }
                }
                xhr.send(JSON.stringify(context));
            });
        },

        _editContext: function () {
            var oViewModel = this.getModel("viewModel");
            //approval steps
            var approvalSteps = oViewModel.getProperty("/approvalSteps");
            var aApprovalSteps = [];
            for (var i = 0; i < approvalSteps.length; i++) {
                aApprovalSteps.push({
                    id: approvalSteps[i].id,
                    comment: approvalSteps[i].comment,
                    isComplete: false,
                    taskType: "APPROVAL",
                    decision: ""
                });
            }
            //requester
            var requester = this.getOwnerComponent().getModel("userInfo").getProperty("/email");

            var context = {
                requestId: oViewModel.getProperty("/requestId"),
                approvalSteps: aApprovalSteps,
                requester: requester
            };
            return context;
        },

        //formatters
        taskType: function (taskType) {
            return this.getText(taskType, []);
        }
    });
});
