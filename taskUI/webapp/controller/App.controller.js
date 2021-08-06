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
                requester: "",
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
            var inboxAPI = this._getInboxAPI();
            if (!inboxAPI) {
                return;
            }

            //approve
            inboxAPI.addAction({
                action: this.getText("APPROVE"),
                label: this.getText("APPROVE"),
                type: "Accept"
            }, function () {
                this._completeTask("approve");
            }, this);

            //reject
            inboxAPI.addAction({
                action: this.getText("REJECT"),
                label: this.getText("REJECT"),
                type: "Reject"
            }, function () {
                this._completeTask("reject");
            }, this);
        },

        _bindData: function () {
            var taskInstanceId = this._getTaskInstanceId();
            this.getView().setBusy(true);
            this._getWorkflowInstanceId(taskInstanceId)
            .then((workflowId)=>{
                this._workflowId = workflowId;
                return this._getWorflowData(workflowId);
            })
            .then((data)=>{
                this._doBind(data);
                this.getView().setBusy(false);
            })
            .catch((err)=>{
                this._handleError(err.message);
            });
        },

        _getTaskInstanceId: function () {
            return this.getOwnerComponent().getModel("task").getProperty("/InstanceID");
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
            //context bining for workflow data
            var oModel = this.getModel();
            this._oContextBinding = oModel.bindContext(`/WorkflowInstances(${workflowId})`);

            return Promise.all([
                this._oContextBinding.requestObject(),
                this._getProcessors()
            ]);
        },

        _getProcessors: function () {
            return new Promise((resolve, reject)=>{
                var oModel = this.getModel();
                var oContext = oModel.createBindingContext(`/WorkflowInstances(${this._workflowId})`);
                var oFunction = oModel.bindContext("WorkflowService.getProcessors(...)", oContext);
                oFunction.execute()
                .then(()=>{
                    resolve(oFunction.getBoundContext().getObject());
                })
                .catch((err)=>{
                    reject(err);
                });
            });
        },

        _doBind: function (data) {
            var workflowData = data[0];
            var processors = data[1].value;
            this.getModel("viewModel").setProperty("/requestId", workflowData.businessKey);
            this.getModel("viewModel").setProperty("/subject", workflowData.subject);
            this.getModel("viewModel").setProperty("/requester", workflowData.requester);
            this.getModel("viewModel").setProperty("/input/enabled", true);
            var processors = processors.map(processor=>{
                return {
                    id: processor.userId,
                    comment: processor.comment,
                    taskType: processor.taskType,
                    index: processor.index,
                    decision: processor.decision,
                    isComplete: processor.isComplete
                };
            });
            this.getModel("viewModel").setProperty("/approvalSteps", processors);
        },

        _handleError: function (err) {
            this.getView().setBusy(false);
            MessageBox.error(err);
        },

        _completeTask: function (decision) {
            var data = this._createRequestData();
            var url = this.getBaseURL() + `/workflow/WorkflowInstances(${this._workflowId})`;
            this.getView().setBusy(true);
            var reworkObj = {};
            if (decision === "reject" )
            {
                reworkObj = {
                    userId: this.getModel("viewModel").getProperty("/requester"), //temp
                    isRequester: true
                }
                        }
            this._sendRequest(url, data, decision, reworkObj)
            .then(()=>{
                this.getView().setBusy(false);
                this._refreshTask();
            })
            .catch((err)=>{
                this._handleError(err);
            });

        },

        _createRequestData: function () {
            var oViewModel = this.getModel("viewModel");
            var approvalSteps = oViewModel.getProperty("/approvalSteps");
            var aApprovalSteps = [];
            for (var i = 0; i < approvalSteps.length; i++) {
                aApprovalSteps.push({
                    userId: approvalSteps[i].id,
                    comment: approvalSteps[i].comment,
                    isComplete: approvalSteps[i].isComplete,
                    taskType: approvalSteps[i].taskType,
                    decision: approvalSteps[i].decision,
                    index: approvalSteps[i].index
                });
            }

            var data = {
                subject: oViewModel.getProperty("/subject"),
                Processors: aApprovalSteps
            };
            return data;
        },

        _sendRequest: function (url, data, decision, reworkObj) {
            return new Promise((resolve, reject)=>{
                var xhr = new XMLHttpRequest();
                xhr.open("PATCH", url);
                xhr.setRequestHeader("content-type", "application/json");
                xhr.setRequestHeader("decision", decision);
                xhr.setRequestHeader("taskInstanceId", this._getTaskInstanceId());
                if (decision === "reject" ){
                    xhr.setRequestHeader("reworkProcessor", JSON.stringify(reworkObj));
                }
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        resolve();
                    } else {
                        reject(xhr.responseText);
                    }
                };
                xhr.send(JSON.stringify(data));
            });
        },

        _getInboxAPI: function () {
            var compData = this.getOwnerComponent().getComponentData();
            if (!compData || !compData.startupParameters || !compData.startupParameters.inboxAPI) {
                return null;
            }
            return compData.startupParameters.inboxAPI;
        },

        _refreshTask: function () {
            var inboxAPI = this._getInboxAPI();
            if (!inboxAPI) {
                return;
            }
            var taskId = this.getOwnerComponent().getModel("task").getProperty("/InstanceID");
            inboxAPI.updateTask("NA", taskId);
        }
    });
});
