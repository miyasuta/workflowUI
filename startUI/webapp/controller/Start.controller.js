sap.ui.define([
    "demo/startUI/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/Constants"
    ], function (Controller,
	JSONModel,
	MessageToast,
	MessageBox,
    constants) {
    "use strict";

    return Controller.extend("demo.startUI.controller.App", {
        onInit: function () {
            //data model
            var oModel = new JSONModel({
                approvalSteps: [],
                requestId: "",
                subject: "",
                input: {
                    enabled: false
                },
                status: constants.status.INITIAL
            });
            this.setModel(oModel, "viewModel");
            //constants model
            var oConstants = new JSONModel(constants);
            this.setModel(oConstants, "constants");

            this.getRouter().getRoute("Start").attachMatched(this._onRouteMatched, this);

            this._oMessageManager = sap.ui.getCore().getMessageManager();
            this._oMessageManager.registerObject(this.getView(), true);

        },

        onAddApprovalStep: function () {
            var step = {
                    id: "",
                    comment: "",
                    taskType: "APPROVAL"
                };

            this._addApprovalStep(step);
        },

        _addApprovalStep: function (oStep) {
            var oApproverSteps = this.getModel("viewModel").getProperty("/approvalSteps");
            oApproverSteps.push(oStep);
            this.getModel("viewModel").setProperty("/approvalSteps", oApproverSteps);
            this.getModel("viewModel").refresh();
        },

        onPressRequestApproval: function () {
            this.getView().setBusy(true);
            if (this._workflowId) {
                //if workflow already exists, cancel it first
                this._exexuteAction("WorkflowService.cancel(...)")
                .then(()=>{
                    this._startInstance();
                })
            } else {
                this._startInstance();
            }
        },

        onPullBack: function () {
            this.getView().setBusy(true);
            this._exexuteAction("WorkflowService.suspend(...)")
            .then(()=>{
                //enable edit
                this.getModel("viewModel").setProperty("/input/enabled", true);
                //handle buttons
                this.getModel("viewModel").setProperty("/status", constants.status.PULLEDBACK);
                this.getView().setBusy(false);
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        onCancelPullBack: function () {
            this._exexuteAction("WorkflowService.resume(...)")
            .then(()=>{
                this._handleDisplay(this._workflowId);
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        onDeleteApprovalStep: function(oEvent) {
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

        _onRouteMatched: function (oEvent) {
            this._workflowId = this.getOwnerComponent().getModel("common").getProperty("/workflowId");

            // if workflowId is supplied, switch to display mode
            if (this._workflowId) {
                this._handleDisplay(this._workflowId);
            } else {
                this._handleCreate();
            }
        },

        _handleCreate: function () {
            var requestId = Math.floor(Date.now() / 1000).toString();
            this.getModel("viewModel").setProperty("/requestId", requestId);
            this._setInitialSteps();
            this.getModel("viewModel").setProperty("/input/enabled", true);
        },

        _setInitialSteps: function () {
            var initialStep = {
                index: 0,
                id: this.getOwnerComponent().getModel("userInfo").getProperty("/email"),
                comment: "",
                taskType: "REQUEST"
            };
            this._addApprovalStep(initialStep);
            var approvalStep = {
                index: 1,
                id: "",
                comment: "",
                taskType: "APPROVAL"
            }
            this._addApprovalStep(approvalStep);
        },

        _handleDisplay: function (workflowId) {
            this.getView().setBusy(true);
            var oModel = this.getModel();
            var oContextBinding = oModel.bindContext(`/WorkflowInstances(${workflowId})`, null, {
                $expand: "Processors"
            });
            oContextBinding.requestObject()
            .then(data=>{
                this.getModel("viewModel").setProperty("/requestId", data.businessKey);
                this.getModel("viewModel").setProperty("/subject", data.subject);
                //temporary: needs to be judged by workflow status
                this.getModel("viewModel").setProperty("/status", this._getStatus(data));
                this.getModel("viewModel").setProperty("/input/enabled", false);
                var processors = data.Processors.map(processor=>{
                    return {
                        id: processor.userId,
                        comment: processor.comment,
                        taskType: processor.taskType,
                        index: processor.index
                    }
                });
                this.getModel("viewModel").setProperty("/approvalSteps", processors);
                this.getView().setBusy(false);
            })
            .catch((err)=>{
                this._handleError(err);
            });
        },

        _handleError: function (err) {
            this.getView().setBusy(false);
            MessageBox.error(err);
        },

        _getStatus: function (oData) {
            //needs further judgement: to be implemented in the backend
            var status;
            switch (oData.status) {
                case constants.wfStatus.RUNNING:
                    status = constants.status.CAN_BE_PULLBACK;
                    break;
                case constants.wfStatus.SUSPENDED:
                    status = constants.status.PULLEDBACK;
                    break;
                default:
                    status = constants.status.DISPLAY_ONLY;
            };
            return status;
        },

        _startInstance: function () {
            var context = this._editContext();
            this._sendRequest(context)
            .then(()=>{
                this.getView().setBusy(false);
                //check if error exists
                if (this.getModel().hasPendingChanges()) {
                    var message = this._oMessageManager.getMessageModel().getData()[0].message;
                    this._handleError(message);
                } else {
                    this.getModel("viewModel").setProperty("/input/enabled", false);
                    MessageToast.show(this.getText("SUCCESS", []));
                }
            })
            .catch((err)=> {
                this._handleError(err);
            });
        },

        _exexuteAction (actionName) {
            var oModel = this.getModel();
            var oContext = oModel.createBindingContext(`/WorkflowInstances(${this._workflowId})`);
            var oAction = oModel.bindContext(actionName, oContext);
            return oAction.execute();
        },

        _sendRequest: function (context) {
            var oModel = this.getModel();
            var oListBinding = oModel.bindList("/WorkflowInstances");
            oListBinding.create(context);
            return oModel.submitBatch("$auto");
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
                    isComplete: approvalSteps[i].taskType === "REQUEST" ? true : false,
                    taskType: approvalSteps[i].taskType,
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

            if (this._workflowId) {
                context.referenceId = this._workflowId;
            }
            return context;
        },

        //formatters
        taskType: function (taskType) {
            return this.getText(taskType, []);
        }
    });
});
