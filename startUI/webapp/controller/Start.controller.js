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
            var oModel = new JSONModel({
                approvalSteps: [],
                requestId: "",
                subject: "test",
                input: {
                    enabled: true
                }
            });
            this.setModel(oModel, "viewModel");
            this.getRouter().getRoute("Start").attachMatched(this._onRouteMatched, this);

            this._oMessageManager = sap.ui.getCore().getMessageManager();
            this._oMessageManager.registerObject(this.getView(), true);

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
            var workflowId = this.getOwnerComponent().getModel("common").getProperty("/workflowId");

            // if workflowId is supplied, switch to display mode
            if (workflowId) {
                this._handleDisplay(workflowId);
            } else {
                this._handleCreate();
            }
        },

        _handleCreate: function () {
            var requestId = Math.floor(Date.now() / 1000).toString();
            this.getModel("viewModel").setProperty("/requestId", requestId);
            this.onAddApprovalStep();
        },

        _handleDisplay: function (workflowId) {
            var oModel = this.getModel();
            var oContextBinding = oModel.bindContext(`/WorkflowInstances(${workflowId})`, null, {
                $expand: "Processors"
            });
            oContextBinding.requestObject()
            .then(data=>{
                this.getModel("viewModel").setProperty("/requestId", data.businessKey);
                var processors = data.Processors.map(processor=>{
                    return {
                        id: processor.userId,
                        comment: processor.comment,
                        taskType: processor.taskType,
                        index: processor.index
                    }
                });
                this.getModel("viewModel").setProperty("/approvalSteps", processors);
            });
        },

        _startInstance: function () {
            var context = this._editContext();
            this._sendRequest(context)
            .then(()=>{
                this.getView().setBusy(false);
                //check if error exists
                if (this.getModel().hasPendingChanges()) {
                    var message = this._oMessageManager.getMessageModel().getData()[0].message;
                    MessageBox.error(message);
                } else {
                    this.getModel("viewModel").setProperty("/input/enabled", false);
                    MessageToast.show(this.getText("SUCCESS", []));
                }
            })
            .catch((err)=> {
                this.getView().setBusy(false);
                MessageBox.error(err);
            });
        },

        _sendRequest: function (context) {
            var oModel = this.getModel();
            var oListBinding = oModel.bindList("/WorkflowInstances");
            oListBinding.create(context);
            return oModel.submitBatch("$auto");


            // //connect to workflow destination
            // const url = this.getBaseURL() + "/workflow/instance/multilevelapproval";
            // // eslint-disable-next-line no-console
            // console.log('Workflow URL: ', url);

            // return new Promise((resolve, reject) => {
            //     var xhr = new XMLHttpRequest();
            //     xhr.open("POST", url);
            //     xhr.setRequestHeader("content-type", "application/json");
            //     xhr.onload = function () {
            //         if (xhr.status === 201) {
            //             resolve();
            //         } else {
            //             reject(xhr.response);
            //         }
            //     }
            //     xhr.send(JSON.stringify(context));
            // });
        },

        _editContext: function () {
            var oViewModel = this.getModel("viewModel");
            //approval steps
            var approvalSteps = oViewModel.getProperty("/approvalSteps");
            var aApprovalSteps = [];
            for (var i = 0; i < approvalSteps.length; i++) {
                aApprovalSteps.push({
                    userId: approvalSteps[i].id,
                    comment: approvalSteps[i].comment,
                    isComplete: false,
                    taskType: "APPROVAL",
                    decision: "",
                    index: approvalSteps[i].index
                });
            }
            //requester
            var requester = this.getOwnerComponent().getModel("userInfo").getProperty("/email");

            var context = {
                businessKey: oViewModel.getProperty("/requestId"),
                requester: requester,
                subject: oViewModel.getProperty("/subject"),
                Processors: aApprovalSteps
            };
            return context;
        },

        //formatters
        taskType: function (taskType) {
            return this.getText(taskType, []);
        }
    });
});
