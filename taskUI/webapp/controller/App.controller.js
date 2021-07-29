sap.ui.define([
    "demo/taskUI/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
	MessageToast,
	MessageBox,
	JSONModel) {
    "use strict";

    return Controller.extend("demo.taskUI.controller.App", {
        onInit: function () {
            var oModel = new JSONModel({
                approvalSteps: [],
                requestId: "",
                subject: "",
                input: {
                    enabled: true
                }
            });
            this.setModel(oModel, "viewModel");

            this._addButtons();
            this._bindData();

            this._oMessageManager = sap.ui.getCore().getMessageManager();
            this._oMessageManager.registerObject(this.getView(), true);
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
                this._completeTask("APPROVE");
            }, this);

            //reject
            compData.startupParameters.inboxAPI.addAction({
                action: this.getText("REJECT"),
                label: this.getText("REJECT"),
                type: "Reject"
            }, function () {
                this._completeTask("REJECT");
            }, this);
        },

        _bindData: function () {
            var taskInstanceId = this.getOwnerComponent().getModel("task").getProperty("/InstanceID");
            this.getView().setBusy(true);
            this._getWorkflowInstanceId(taskInstanceId)
            .then((workflowId)=>{
                return this._getWorflowData(workflowId);
            })
            .then((data)=>{
                this._doBind(data);
            })
            .catch((err)=>{
                this._handleError(err.message);
            });
        },

        _getWorkflowInstanceId: function (taskInstanceId) {
            return new Promise((resolve, reject)=>{
                var oModel = this.getModel();
                var oFunction = oModel.bindContext("/getWorkflowInstanceId(...)");
                oFunction.setParameter("taskId", taskInstanceId);
                oFunction.execute()
                .then(()=>{
                    resolve(oFunction.getBoundContext().getProperty("ID"));
                })
                .catch((err)=>{
                    reject(err);
                });
            });
        },

        _getWorflowData: function (workflowId) {
            var oModel = this.getModel();
            var oContextBinding = oModel.bindContext(`/WorkflowInstances(${workflowId})`, null, {
                $expand: "Processors"
            });
            return oContextBinding.requestObject();
        },

        _doBind: function (data) {
            this.getModel("viewModel").setProperty("/requestId", data.businessKey);
            this.getModel("viewModel").setProperty("/subject", data.subject);
            this.getModel("viewModel").setProperty("/input/enabled", true);
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
        },

        _completeTask: function (sAction) {
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
        },

        _handleError: function (err) {
            this.getView().setBusy(false);
            MessageBox.error(err);
        },

    });
});
